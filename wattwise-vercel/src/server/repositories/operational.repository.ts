import 'server-only';
import type { QueryResultRow } from 'pg';
import { getPool } from '@/server/db/client';
import {
  createOperationalProcessSchema,
  createProductionRecordSchema,
  listProductionRecordsSchema,
  operationalIdSchema,
  type CreateOperationalProcessInput,
  type CreateProductionRecordInput,
  type ListProductionRecordsInput,
} from '@/server/validation/operational';

export class OperationalError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'DUPLICATE_PROCESS' | 'DUPLICATE_RECORD' | 'OVERLAPPING_PERIOD') {
    super({
      NOT_FOUND: 'Usaha atau aktivitas operasional tidak tersedia',
      DUPLICATE_PROCESS: 'Nama aktivitas operasional sudah terdaftar',
      DUPLICATE_RECORD: 'Catatan produksi untuk periode ini sudah tersimpan',
      OVERLAPPING_PERIOD: 'Periode catatan produksi bertumpang tindih',
    }[code]);
    this.name = 'OperationalError';
  }
}

const processFields = `p.id, p.business_id AS "businessId", p.name, p.output_unit AS "outputUnit",
  p.description, p.is_active AS "isActive", p.created_at AS "createdAt", p.updated_at AS "updatedAt"`;

const recordFields = `r.id, r.business_id AS "businessId", r.operational_process_id AS "operationalProcessId",
  r.period_start AS "periodStart", r.period_end AS "periodEnd", r.output_quantity::text AS "outputQuantity",
  r.notes, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  p.name AS "processName", p.output_unit AS "outputUnit"`;

export interface OperationalProcessRecord extends QueryResultRow, Omit<CreateOperationalProcessInput, 'description'> {
  id: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionRecordItem extends QueryResultRow {
  id: string;
  businessId: string;
  operationalProcessId: string;
  periodStart: Date;
  periodEnd: Date;
  outputQuantity: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  processName: string;
  outputUnit: string;
}

function translateError(error: unknown): never {
  const dbError = error as { code?: string; constraint?: string };
  if (dbError.code === '23505' && dbError.constraint === 'operational_process_business_name_unique') {
    throw new OperationalError('DUPLICATE_PROCESS');
  }
  if (dbError.code === '23505' && dbError.constraint === 'production_record_period_unique') {
    throw new OperationalError('DUPLICATE_RECORD');
  }
  if (dbError.code === '23P01') {
    throw new OperationalError('OVERLAPPING_PERIOD');
  }
  throw error;
}

export async function createOperationalProcessForUser(
  userId: string,
  raw: CreateOperationalProcessInput
): Promise<OperationalProcessRecord> {
  operationalIdSchema.parse(userId);
  const input = createOperationalProcessSchema.parse(raw);
  try {
    const result = await getPool().query<OperationalProcessRecord>(`
      WITH inserted AS (
        INSERT INTO operational_process (id, business_id, name, output_unit, description)
        SELECT $1, b.id, $3, $4, $5
        FROM business b
        WHERE b.id = $2 AND b.user_id = $6 AND b.is_active
        RETURNING *
      )
      SELECT ${processFields} FROM inserted p`,
      [crypto.randomUUID(), input.businessId, input.name, input.outputUnit, input.description ?? null, userId]
    );
    if (!result.rowCount) throw new OperationalError('NOT_FOUND');
    return result.rows[0];
  } catch (error) {
    return translateError(error);
  }
}

export async function listOperationalProcessesForUser(
  userId: string,
  businessId: string
): Promise<OperationalProcessRecord[]> {
  operationalIdSchema.parse(userId);
  operationalIdSchema.parse(businessId);
  const result = await getPool().query<OperationalProcessRecord>(`
    SELECT ${processFields}
    FROM operational_process p
    JOIN business b ON b.id = p.business_id
    WHERE b.user_id = $1 AND b.id = $2 AND b.is_active
    ORDER BY p.created_at, p.id`,
    [userId, businessId]
  );
  return result.rows;
}

export async function createProductionRecordForUser(
  userId: string,
  raw: CreateProductionRecordInput
): Promise<ProductionRecordItem> {
  operationalIdSchema.parse(userId);
  const input = createProductionRecordSchema.parse(raw);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const process = await client.query<{ id: string }>(`
      SELECT p.id FROM operational_process p
      JOIN business b ON b.id = p.business_id
      WHERE p.id = $1 AND p.business_id = $2 AND b.user_id = $3
      AND b.is_active AND p.is_active FOR SHARE OF b, p`,
      [input.operationalProcessId, input.businessId, userId]
    );
    if (!process.rowCount) throw new OperationalError('NOT_FOUND');

    // Stable process lock for deterministic duplicate vs overlap errors
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 13))', [input.operationalProcessId]);

    const conflicts = await client.query<{ exact: boolean }>(`
      SELECT period_start = $3::timestamptz AND period_end = $4::timestamptz AS exact
      FROM production_record
      WHERE business_id = $1 AND operational_process_id = $2
      AND period_start < $4::timestamptz AND period_end > $3::timestamptz
      ORDER BY exact DESC LIMIT 1`,
      [input.businessId, input.operationalProcessId, input.periodStart, input.periodEnd]
    );
    if (conflicts.rowCount) {
      throw new OperationalError(conflicts.rows[0].exact ? 'DUPLICATE_RECORD' : 'OVERLAPPING_PERIOD');
    }

    const result = await client.query<ProductionRecordItem>(`
      WITH inserted AS (
        INSERT INTO production_record (
          id, business_id, operational_process_id, period_start, period_end, output_quantity, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      )
      SELECT ${recordFields}
      FROM inserted r
      JOIN operational_process p ON p.id = r.operational_process_id AND p.business_id = r.business_id`,
      [
        crypto.randomUUID(),
        input.businessId,
        input.operationalProcessId,
        input.periodStart,
        input.periodEnd,
        input.outputQuantity,
        input.notes ?? null,
      ]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    return translateError(error);
  } finally {
    client.release();
  }
}

export async function listProductionRecordsForUser(
  userId: string,
  raw: ListProductionRecordsInput
): Promise<ProductionRecordItem[]> {
  operationalIdSchema.parse(userId);
  const input = listProductionRecordsSchema.parse(raw);
  const result = await getPool().query<ProductionRecordItem>(`
    SELECT ${recordFields}
    FROM production_record r
    JOIN operational_process p ON p.id = r.operational_process_id AND p.business_id = r.business_id
    JOIN business b ON b.id = r.business_id
    WHERE b.user_id = $1 AND b.id = $2 AND b.is_active
    AND ($3::text IS NULL OR r.operational_process_id = $3)
    AND ($4::timestamptz IS NULL OR r.period_end > $4::timestamptz)
    AND ($5::timestamptz IS NULL OR r.period_start < $5::timestamptz)
    ORDER BY r.period_start DESC, r.id DESC
    LIMIT $6 OFFSET $7`,
    [
      userId,
      input.businessId,
      input.operationalProcessId ?? null,
      input.periodStart ?? null,
      input.periodEnd ?? null,
      input.limit,
      input.offset,
    ]
  );
  return result.rows;
}

export async function findProductionRecordForUser(
  userId: string,
  recordId: string
): Promise<ProductionRecordItem | null> {
  operationalIdSchema.parse(userId);
  operationalIdSchema.parse(recordId);
  const result = await getPool().query<ProductionRecordItem>(`
    SELECT ${recordFields}
    FROM production_record r
    JOIN operational_process p ON p.id = r.operational_process_id AND p.business_id = r.business_id
    JOIN business b ON b.id = r.business_id
    WHERE r.id = $1 AND b.user_id = $2 AND b.is_active`,
    [recordId, userId]
  );
  return result.rows[0] ?? null;
}
