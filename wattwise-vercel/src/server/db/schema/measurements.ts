import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { business } from './journey';

export const measurementSource = pgTable('measurement_source', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(),
  measurementBoundary: text('measurement_boundary').notNull(),
  provenanceKey: text('provenance_key').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('measurement_source_business_id_unique').on(t.businessId, t.id),
  unique('measurement_source_provenance_unique').on(t.businessId, t.provenanceKey),
  index('measurement_source_business_active_idx').on(t.businessId, t.isActive),
  check('measurement_source_name_check', sql`char_length(btrim(${t.name})) BETWEEN 1 AND 120`),
  check('measurement_source_type_check', sql`${t.sourceType} IN ('METER','SENSOR','DOCUMENT','USER_ESTIMATE')`),
  check('measurement_source_boundary_check', sql`${t.measurementBoundary} IN ('WHOLE_SITE','SUBMETER','UNKNOWN')`),
  check('measurement_source_provenance_check', sql`${t.provenanceKey} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'`),
  check('measurement_source_description_check', sql`${t.description} IS NULL OR char_length(${t.description}) <= 1000`),
]);

export const energyMeasurement = pgTable('energy_measurement', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  measurementSourceId: text('measurement_source_id').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  sourceTimezone: text('source_timezone').notNull(),
  energyKwh: numeric('energy_kwh').notNull(),
  unit: text('unit').notNull().default('kWh'),
  measurementKind: text('measurement_kind').notNull().default('INTERVAL_ENERGY'),
  measurementMethod: text('measurement_method').notNull(),
  consumptionBasis: text('consumption_basis').notNull(),
  qualityStatus: text('quality_status').notNull(),
  provenanceReference: text('provenance_reference').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'energy_measurement_source_fk', columns: [t.businessId, t.measurementSourceId], foreignColumns: [measurementSource.businessId, measurementSource.id] }).onDelete('cascade'),
  unique('energy_measurement_period_unique').on(t.businessId, t.measurementSourceId, t.periodStart, t.periodEnd),
  index('energy_measurement_business_period_idx').on(t.businessId, t.periodStart, t.periodEnd, t.id),
  check('energy_measurement_period_check', sql`isfinite(${t.periodStart}) AND isfinite(${t.periodEnd}) AND ${t.periodEnd} > ${t.periodStart} AND ${t.periodStart} >= '0001-01-01T00:00:00Z'::timestamptz AND ${t.periodEnd} < '10000-01-01T00:00:00Z'::timestamptz AND date_trunc('milliseconds', ${t.periodStart}) = ${t.periodStart} AND date_trunc('milliseconds', ${t.periodEnd}) = ${t.periodEnd}`),
  check('energy_measurement_energy_check', sql`${t.energyKwh} >= 0 AND ${t.energyKwh} <= 999999999999.999 AND scale(${t.energyKwh}) <= 3`),
  check('energy_measurement_unit_check', sql`${t.unit} = 'kWh' AND ${t.measurementKind} = 'INTERVAL_ENERGY'`),
  check('energy_measurement_timezone_check', sql`${t.sourceTimezone} IN ('UTC','Asia/Jakarta','Asia/Makassar','Asia/Jayapura')`),
  check('energy_measurement_method_check', sql`${t.measurementMethod} IN ('MANUAL','CSV_IMPORT','SENSOR')`),
  check('energy_measurement_basis_check', sql`${t.consumptionBasis} IN ('MEASURED','ESTIMATED')`),
  check('energy_measurement_quality_check', sql`${t.qualityStatus} IN ('RECORDED','NEEDS_REVIEW') AND (${t.consumptionBasis} <> 'ESTIMATED' OR ${t.qualityStatus} = 'NEEDS_REVIEW')`),
  check('energy_measurement_provenance_check', sql`char_length(btrim(${t.provenanceReference})) BETWEEN 1 AND 240`),
  check('energy_measurement_notes_check', sql`${t.notes} IS NULL OR char_length(${t.notes}) <= 1000`),
  // ponytail: Drizzle 0.45 has no exclusion builder; 0012 SQL owns GiST exclusion. Never regenerate it away.
]);
