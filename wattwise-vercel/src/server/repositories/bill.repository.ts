import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type { CreateBillInput } from '@/server/validation/bills';
import {
  enqueueShadowForecastInTransaction,
  reconcileActualOutcomeInTransaction,
} from '@/server/repositories/ai-shadow.repository';

export interface BillRecord {
  id: string;
  businessId: string;
  businessName: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: bigint;
  kwh: string | null;
  tariffRupiahPerKwh: string | null;
  meterStart?: string | null;
  meterEnd?: string | null;
  kwhSource?: 'USER_ENTERED' | 'METER_DERIVED' | 'LEGACY_UNKNOWN';
  paymentMethod?: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BillRow {
  id: string;
  business_id: string;
  business_name: string;
  period_start: string | Date;
  period_end: string | Date;
  total_amount_rupiah: string;
  kwh: string | null;
  tariff_rupiah_per_kwh: string | null;
  meter_start: string | null;
  meter_end: string | null;
  kwh_source?: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export class BillBusinessNotFoundError extends Error {
  constructor() {
    super('Usaha aktif tidak ditemukan untuk pengguna ini');
    this.name = 'BillBusinessNotFoundError';
  }
}

export class DuplicateBillPeriodError extends Error {
  constructor() {
    super('Tagihan untuk periode yang sama sudah tersimpan');
    this.name = 'DuplicateBillPeriodError';
  }
}

export class OverlappingBillPeriodError extends Error {
  constructor() {
    super('Periode tagihan bertumpang tindih dengan tagihan yang sudah tersimpan');
    this.name = 'OverlappingBillPeriodError';
  }
}

export class ReferencedBillLockedError extends Error {
  constructor() {
    super(
      'Tagihan ini sudah digunakan dalam riwayat pemeriksaan dan tidak dapat diubah atau dihapus agar hasil pemeriksaan lama tetap konsisten.'
    );
    this.name = 'ReferencedBillLockedError';
  }
}

function mapBill(row: BillRow): BillRecord {
  const dateString = (value: string | Date) => {
    if (typeof value === 'string') return value;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    periodStart: dateString(row.period_start),
    periodEnd: dateString(row.period_end),
    totalAmountRupiah: BigInt(row.total_amount_rupiah),
    kwh: row.kwh,
    tariffRupiahPerKwh: row.tariff_rupiah_per_kwh,
    meterStart: row.meter_start,
    meterEnd: row.meter_end,
    kwhSource: (row.kwh_source as BillRecord['kwhSource']) ?? 'LEGACY_UNKNOWN',
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findBillByIdForUser(
  userId: string,
  billId: string
): Promise<BillRecord | null> {
  const client = await getPool().connect();
  try {
    const result = await client.query<BillRow>(
      `SELECT eb.id, eb.business_id, b.name AS business_name, eb.period_start, eb.period_end,
              eb.total_amount_rupiah, eb.kwh, eb.tariff_rupiah_per_kwh, eb.meter_start, eb.meter_end,
              eb.kwh_source, eb.payment_method, eb.notes, eb.created_at, eb.updated_at
         FROM electricity_bill eb
         JOIN business b ON b.id = eb.business_id
        WHERE eb.id = $1 AND b.user_id = $2
        LIMIT 1`,
      [billId, userId]
    );
    if (!result.rowCount) return null;
    return mapBill(result.rows[0]);
  } finally {
    client.release();
  }
}

async function findPrimaryOwnedBusiness(
  client: PoolClient,
  userId: string,
  requestedBusinessId?: string
) {
  const result = await client.query<{ id: string; name: string }>(
    `SELECT id, name
       FROM business
      WHERE user_id = $1
        AND is_active = true
        AND ($2::text IS NULL OR id = $2)
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    [userId, requestedBusinessId ?? null]
  );
  return result.rows[0] ?? null;
}

export async function createBillForOwnedBusiness(
  userId: string,
  input: CreateBillInput & { kwhSource?: 'USER_ENTERED' | 'METER_DERIVED' | 'LEGACY_UNKNOWN' },
  requestedBusinessId?: string
): Promise<BillRecord> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const ownedBusiness = await findPrimaryOwnedBusiness(client, userId, requestedBusinessId);
    if (!ownedBusiness) throw new BillBusinessNotFoundError();

    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [ownedBusiness.id]);

    const duplicate = await client.query(
      `SELECT 1
         FROM electricity_bill
        WHERE business_id = $1 AND period_start = $2::date AND period_end = $3::date
        LIMIT 1`,
      [ownedBusiness.id, input.periodStart, input.periodEnd]
    );
    if (duplicate.rowCount) throw new DuplicateBillPeriodError();

    const overlap = await client.query(
      `SELECT 1
         FROM electricity_bill
        WHERE business_id = $1
          AND period_start <= $3::date
          AND period_end >= $2::date
        LIMIT 1`,
      [ownedBusiness.id, input.periodStart, input.periodEnd]
    );
    if (overlap.rowCount) throw new OverlappingBillPeriodError();

    const hasKwh = input.kwh !== undefined && input.kwh !== null && String(input.kwh).trim() !== '';
    const hasMeters =
      input.meterStart !== undefined &&
      input.meterStart !== null &&
      String(input.meterStart).trim() !== '' &&
      input.meterEnd !== undefined &&
      input.meterEnd !== null &&
      String(input.meterEnd).trim() !== '';

    const kwhSource =
      input.kwhSource ??
      (hasKwh ? 'USER_ENTERED' : hasMeters ? 'METER_DERIVED' : 'LEGACY_UNKNOWN');

    const result = await client.query<BillRow>(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, meter_start, meter_end, kwh_source, payment_method, notes
       )
       VALUES ($1, $2, $3::date, $4::date, $5, COALESCE($6, CASE WHEN $10::numeric IS NOT NULL AND $11::numeric IS NOT NULL THEN $11::numeric - $10::numeric END), $7, $10, $11, $13, $12, $8)
       RETURNING id, business_id, $9::text AS business_name, period_start, period_end,
         total_amount_rupiah, kwh, tariff_rupiah_per_kwh, meter_start, meter_end, kwh_source, payment_method, notes, created_at, updated_at`,
      [
        crypto.randomUUID(),
        ownedBusiness.id,
        input.periodStart,
        input.periodEnd,
        input.totalAmountRupiah,
        input.kwh ?? null,
        input.tariffRupiahPerKwh ?? null,
        input.notes ?? null,
        ownedBusiness.name,
        input.meterStart ?? null,
        input.meterEnd ?? null,
        input.paymentMethod ?? null,
        kwhSource,
      ]
    );
    const saved = result.rows[0];
    const period = typeof saved.period_end === 'string'
      ? saved.period_end.slice(0, 7)
      : saved.period_end.toISOString().slice(0, 7);
    await reconcileActualOutcomeInTransaction(client, {
      businessId: ownedBusiness.id,
      period,
      actualKwh: saved.kwh === null ? null : Number(saved.kwh),
      actualKwhSource: saved.kwh_source ?? 'LEGACY_UNKNOWN',
      observedAt: saved.created_at,
    });
    await enqueueShadowForecastInTransaction(client, ownedBusiness.id, saved.created_at);
    await client.query('COMMIT');
    return mapBill(saved);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBillForOwnedBusiness(
  userId: string,
  billId: string,
  input: CreateBillInput & { kwhSource?: 'USER_ENTERED' | 'METER_DERIVED' | 'LEGACY_UNKNOWN' }
): Promise<BillRecord> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query<BillRow>(
      `SELECT eb.id, eb.business_id, b.name AS business_name
         FROM electricity_bill eb
         JOIN business b ON b.id = eb.business_id
        WHERE eb.id = $1 AND b.user_id = $2
        LIMIT 1`,
      [billId, userId]
    );
    if (!existingResult.rowCount) throw new BillBusinessNotFoundError();
    const existing = existingResult.rows[0];

    const referenced = await client.query(
      `SELECT 1
         FROM diagnostic_session
        WHERE electricity_bill_id = $1 OR comparison_bill_id = $1
        LIMIT 1`,
      [billId]
    );
    if (referenced.rowCount) throw new ReferencedBillLockedError();

    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [existing.business_id]);

    const duplicate = await client.query(
      `SELECT 1
         FROM electricity_bill
        WHERE business_id = $1 AND period_start = $2::date AND period_end = $3::date AND id <> $4
        LIMIT 1`,
      [existing.business_id, input.periodStart, input.periodEnd, billId]
    );
    if (duplicate.rowCount) throw new DuplicateBillPeriodError();

    const overlap = await client.query(
      `SELECT 1
         FROM electricity_bill
        WHERE business_id = $1
          AND period_start <= $3::date
          AND period_end >= $2::date
          AND id <> $4
        LIMIT 1`,
      [existing.business_id, input.periodStart, input.periodEnd, billId]
    );
    if (overlap.rowCount) throw new OverlappingBillPeriodError();

    const hasKwh = input.kwh !== undefined && input.kwh !== null && String(input.kwh).trim() !== '';
    const hasMeters =
      input.meterStart !== undefined &&
      input.meterStart !== null &&
      String(input.meterStart).trim() !== '' &&
      input.meterEnd !== undefined &&
      input.meterEnd !== null &&
      String(input.meterEnd).trim() !== '';

    const kwhSource =
      input.kwhSource ??
      (hasKwh ? 'USER_ENTERED' : hasMeters ? 'METER_DERIVED' : 'LEGACY_UNKNOWN');

    const result = await client.query<BillRow>(
      `UPDATE electricity_bill
          SET period_start = $1::date,
              period_end = $2::date,
              total_amount_rupiah = $3,
              kwh = COALESCE($4, CASE WHEN $8::numeric IS NOT NULL AND $9::numeric IS NOT NULL THEN $9::numeric - $8::numeric END),
              tariff_rupiah_per_kwh = $5,
              meter_start = $8,
              meter_end = $9,
              kwh_source = $10,
              payment_method = $11,
              notes = $6,
              updated_at = NOW()
        WHERE id = $7
        RETURNING id, business_id, $12::text AS business_name, period_start, period_end,
                  total_amount_rupiah, kwh, tariff_rupiah_per_kwh, meter_start, meter_end, kwh_source, payment_method, notes, created_at, updated_at`,
      [
        input.periodStart,
        input.periodEnd,
        input.totalAmountRupiah,
        input.kwh ?? null,
        input.tariffRupiahPerKwh ?? null,
        input.notes ?? null,
        billId,
        input.meterStart ?? null,
        input.meterEnd ?? null,
        kwhSource,
        input.paymentMethod ?? null,
        existing.business_name,
      ]
    );
    const saved = result.rows[0];
    const period = typeof saved.period_end === 'string'
      ? saved.period_end.slice(0, 7)
      : saved.period_end.toISOString().slice(0, 7);
    await reconcileActualOutcomeInTransaction(client, {
      businessId: existing.business_id,
      period,
      actualKwh: saved.kwh === null ? null : Number(saved.kwh),
      actualKwhSource: saved.kwh_source ?? 'LEGACY_UNKNOWN',
      observedAt: saved.updated_at,
    });
    await enqueueShadowForecastInTransaction(client, existing.business_id, saved.updated_at);
    await client.query('COMMIT');
    return mapBill(saved);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteBillForOwnedBusiness(
  userId: string,
  billId: string
): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query<{ id: string; business_id: string }>(
      `SELECT eb.id, eb.business_id
         FROM electricity_bill eb
         JOIN business b ON b.id = eb.business_id
        WHERE eb.id = $1 AND b.user_id = $2
        LIMIT 1`,
      [billId, userId]
    );
    if (!existingResult.rowCount) throw new BillBusinessNotFoundError();

    const referenced = await client.query(
      `SELECT 1
         FROM diagnostic_session
        WHERE electricity_bill_id = $1 OR comparison_bill_id = $1
        LIMIT 1`,
      [billId]
    );
    if (referenced.rowCount) throw new ReferencedBillLockedError();

    await client.query('DELETE FROM electricity_bill WHERE id = $1', [billId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listBillsForUser(
  userId: string,
  businessId?: string
): Promise<BillRecord[]> {
  if (!userId) return [];
  const result = await getPool().query<BillRow>(
    `SELECT eb.id, eb.business_id, b.name AS business_name, eb.period_start, eb.period_end,
            eb.total_amount_rupiah, eb.kwh, eb.tariff_rupiah_per_kwh, eb.meter_start, eb.meter_end, eb.kwh_source, eb.payment_method, eb.notes,
            eb.created_at, eb.updated_at
       FROM electricity_bill eb
       JOIN business b ON b.id = eb.business_id
      WHERE b.user_id = $1
        AND ($2::text IS NULL OR eb.business_id = $2)
      ORDER BY eb.period_end DESC, eb.period_start DESC, eb.id DESC`,
    [userId, businessId ?? null]
  );
  return result.rows.map(mapBill);
}

export async function findPreviousBillForUser(
  userId: string,
  current: Pick<BillRecord, 'businessId' | 'periodStart'>
): Promise<BillRecord | null> {
  if (!userId) return null;
  const result = await getPool().query<BillRow>(
    `SELECT eb.id, eb.business_id, b.name AS business_name, eb.period_start, eb.period_end,
            eb.total_amount_rupiah, eb.kwh, eb.tariff_rupiah_per_kwh, eb.meter_start, eb.meter_end, eb.kwh_source, eb.payment_method, eb.notes,
            eb.created_at, eb.updated_at
       FROM electricity_bill eb
       JOIN business b ON b.id = eb.business_id
      WHERE b.user_id = $1
        AND eb.business_id = $2
        AND eb.period_end < $3::date
      ORDER BY eb.period_end DESC, eb.period_start DESC, eb.id DESC
      LIMIT 1`,
    [userId, current.businessId, current.periodStart]
  );
  return result.rows[0] ? mapBill(result.rows[0]) : null;
}
