import 'server-only';
import type { QueryResultRow } from 'pg';
import { getPool } from '@/server/db/client';
import {
  createEnergyMeasurementSchema, createMeasurementSourceSchema, listMeasurementsSchema, measurementIdSchema,
  type CreateEnergyMeasurementInput, type CreateMeasurementSourceInput, type ListMeasurementsInput,
} from '@/server/validation/measurements';

export class MeasurementError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'DUPLICATE_SOURCE' | 'DUPLICATE_INTERVAL' | 'OVERLAPPING_INTERVAL' | 'SOURCE_BASIS_MISMATCH') {
    super({ NOT_FOUND: 'Usaha atau sumber tidak tersedia', DUPLICATE_SOURCE: 'Identitas sumber sudah terdaftar',
      DUPLICATE_INTERVAL: 'Interval sumber sudah tersimpan', OVERLAPPING_INTERVAL: 'Interval sumber bertumpang tindih',
      SOURCE_BASIS_MISMATCH: 'Sumber estimasi tidak boleh diklaim sebagai pengukuran' }[code]);
    this.name = 'MeasurementError';
  }
}

// SQL returns camelCase JSON fields, numeric serialized explicitly, never JS floats.
const sourceFields = `s.id, s.business_id AS "businessId", s.name, s.source_type AS "sourceType",
  s.measurement_boundary AS "measurementBoundary", s.provenance_key AS "provenanceKey", s.description,
  s.is_active AS "isActive", s.created_at AS "createdAt", s.updated_at AS "updatedAt"`;
const measurementFields = `m.id, m.business_id AS "businessId", m.measurement_source_id AS "measurementSourceId",
  m.period_start AS "periodStart", m.period_end AS "periodEnd", m.source_timezone AS "sourceTimezone",
  m.energy_kwh::text AS "energyKwh", m.unit, m.measurement_kind AS "measurementKind",
  m.measurement_method AS "measurementMethod", m.consumption_basis AS "consumptionBasis",
  m.quality_status AS "qualityStatus", m.provenance_reference AS "provenanceReference", m.notes,
  m.created_at AS "createdAt", m.updated_at AS "updatedAt", s.measurement_boundary AS "measurementBoundary",
  s.provenance_key AS "provenanceKey", s.source_type AS "sourceType", false AS "aggregationVerified"`;

export interface MeasurementSourceRecord extends QueryResultRow, Omit<CreateMeasurementSourceInput, 'description'> {
  id: string; description: string | null; isActive: boolean; createdAt: Date; updatedAt: Date;
}
export interface EnergyMeasurementRecord extends QueryResultRow, Omit<CreateEnergyMeasurementInput, 'periodStart' | 'periodEnd' | 'notes'> {
  id: string; notes: string | null; periodStart: Date; periodEnd: Date; createdAt: Date; updatedAt: Date;
  measurementBoundary: string; provenanceKey: string; sourceType: string; aggregationVerified: false;
}

function translateError(error: unknown): never {
  const dbError = error as { code?: string; constraint?: string };
  if (dbError.code === '23505' && dbError.constraint === 'measurement_source_provenance_unique') throw new MeasurementError('DUPLICATE_SOURCE');
  if (dbError.code === '23505' && dbError.constraint === 'energy_measurement_period_unique') throw new MeasurementError('DUPLICATE_INTERVAL');
  if (dbError.code === '23P01') throw new MeasurementError('OVERLAPPING_INTERVAL');
  throw error;
}

export async function createMeasurementSourceForUser(userId: string, raw: CreateMeasurementSourceInput): Promise<MeasurementSourceRecord> {
  measurementIdSchema.parse(userId);
  const input = createMeasurementSourceSchema.parse(raw);
  try {
    const result = await getPool().query<MeasurementSourceRecord>(`
      WITH inserted AS (
        INSERT INTO measurement_source(id,business_id,name,source_type,measurement_boundary,provenance_key,description)
        SELECT $1,b.id,$3,$4,$5,$6,$7 FROM business b WHERE b.id=$2 AND b.user_id=$8 AND b.is_active
        RETURNING *) SELECT ${sourceFields} FROM inserted s`,
    [crypto.randomUUID(),input.businessId,input.name,input.sourceType,input.measurementBoundary,input.provenanceKey,input.description ?? null,userId]);
    if (!result.rowCount) throw new MeasurementError('NOT_FOUND');
    return result.rows[0];
  } catch (error) { return translateError(error); }
}

export async function listMeasurementSourcesForUser(userId: string, businessId: string): Promise<MeasurementSourceRecord[]> {
  measurementIdSchema.parse(userId); measurementIdSchema.parse(businessId);
  const result = await getPool().query<MeasurementSourceRecord>(`SELECT ${sourceFields} FROM measurement_source s
    JOIN business b ON b.id=s.business_id WHERE b.user_id=$1 AND b.id=$2 AND b.is_active ORDER BY s.created_at,s.id`, [userId,businessId]);
  return result.rows;
}

export async function createEnergyMeasurementForUser(userId: string, raw: CreateEnergyMeasurementInput): Promise<EnergyMeasurementRecord> {
  measurementIdSchema.parse(userId);
  const input = createEnergyMeasurementSchema.parse(raw);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const source = await client.query<{ source_type: string }>(`SELECT s.source_type FROM measurement_source s
      JOIN business b ON b.id=s.business_id WHERE s.id=$1 AND s.business_id=$2 AND b.user_id=$3
      AND b.is_active AND s.is_active FOR SHARE OF b,s`, [input.measurementSourceId,input.businessId,userId]);
    if (!source.rowCount) throw new MeasurementError('NOT_FOUND');
    if (source.rows[0].source_type === 'USER_ESTIMATE' && input.consumptionBasis !== 'ESTIMATED') throw new MeasurementError('SOURCE_BASIS_MISMATCH');
    // Stable source lock gives deterministic duplicate vs overlap errors. DB exclusion also protects direct/concurrent SQL.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 12))', [input.measurementSourceId]);
    const conflicts = await client.query<{ exact: boolean }>(`SELECT period_start=$3::timestamptz AND period_end=$4::timestamptz AS exact
      FROM energy_measurement WHERE business_id=$1 AND measurement_source_id=$2
      AND period_start < $4::timestamptz AND period_end > $3::timestamptz ORDER BY exact DESC LIMIT 1`,
    [input.businessId,input.measurementSourceId,input.periodStart,input.periodEnd]);
    if (conflicts.rowCount) throw new MeasurementError(conflicts.rows[0].exact ? 'DUPLICATE_INTERVAL' : 'OVERLAPPING_INTERVAL');
    const result = await client.query<EnergyMeasurementRecord>(`WITH inserted AS (
      INSERT INTO energy_measurement(id,business_id,measurement_source_id,period_start,period_end,source_timezone,energy_kwh,
        unit,measurement_kind,measurement_method,consumption_basis,quality_status,provenance_reference,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *)
      SELECT ${measurementFields} FROM inserted m JOIN measurement_source s ON s.id=m.measurement_source_id AND s.business_id=m.business_id`,
    [crypto.randomUUID(),input.businessId,input.measurementSourceId,input.periodStart,input.periodEnd,input.sourceTimezone,input.energyKwh,
      input.unit,input.measurementKind,input.measurementMethod,input.consumptionBasis,input.qualityStatus,input.provenanceReference,input.notes ?? null]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    return translateError(error);
  } finally { client.release(); }
}

export async function findEnergyMeasurementForUser(userId: string, measurementId: string): Promise<EnergyMeasurementRecord | null> {
  measurementIdSchema.parse(userId); measurementIdSchema.parse(measurementId);
  const result = await getPool().query<EnergyMeasurementRecord>(`SELECT ${measurementFields} FROM energy_measurement m
    JOIN measurement_source s ON s.id=m.measurement_source_id AND s.business_id=m.business_id
    JOIN business b ON b.id=m.business_id WHERE m.id=$1 AND b.user_id=$2 AND b.is_active`, [measurementId,userId]);
  return result.rows[0] ?? null;
}

export async function listEnergyMeasurementsForUser(userId: string, raw: ListMeasurementsInput): Promise<EnergyMeasurementRecord[]> {
  measurementIdSchema.parse(userId);
  const input = listMeasurementsSchema.parse(raw);
  const result = await getPool().query<EnergyMeasurementRecord>(`SELECT ${measurementFields} FROM energy_measurement m
    JOIN measurement_source s ON s.id=m.measurement_source_id AND s.business_id=m.business_id
    JOIN business b ON b.id=m.business_id WHERE b.user_id=$1 AND b.id=$2 AND b.is_active
    AND ($3::text IS NULL OR m.measurement_source_id=$3)
    AND ($4::timestamptz IS NULL OR m.period_end > $4::timestamptz)
    AND ($5::timestamptz IS NULL OR m.period_start < $5::timestamptz)
    ORDER BY m.period_start,m.id LIMIT $6 OFFSET $7`,
  [userId,input.businessId,input.measurementSourceId ?? null,input.periodStart ?? null,input.periodEnd ?? null,input.limit,input.offset]);
  return result.rows;
}
