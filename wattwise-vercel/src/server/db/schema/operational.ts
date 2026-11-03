import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { business } from './journey';

export const operationalProcess = pgTable('operational_process', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  outputUnit: text('output_unit').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('operational_process_business_id_unique').on(t.businessId, t.id),
  unique('operational_process_business_name_unique').on(t.businessId, t.name),
  index('operational_process_business_active_idx').on(t.businessId, t.isActive),
  check('operational_process_name_check', sql`char_length(btrim(${t.name})) BETWEEN 1 AND 120`),
  check('operational_process_unit_check', sql`char_length(btrim(${t.outputUnit})) BETWEEN 1 AND 30`),
  check('operational_process_description_check', sql`${t.description} IS NULL OR char_length(${t.description}) <= 1000`),
]);

export const productionRecord = pgTable('production_record', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  operationalProcessId: text('operational_process_id').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  outputQuantity: numeric('output_quantity').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({
    name: 'production_record_process_fk',
    columns: [t.businessId, t.operationalProcessId],
    foreignColumns: [operationalProcess.businessId, operationalProcess.id],
  }).onDelete('cascade'),
  unique('production_record_period_unique').on(t.businessId, t.operationalProcessId, t.periodStart, t.periodEnd),
  index('production_record_business_period_idx').on(t.businessId, t.operationalProcessId, t.periodStart, t.periodEnd, t.id),
  check('production_record_period_check', sql`isfinite(${t.periodStart}) AND isfinite(${t.periodEnd}) AND ${t.periodEnd} > ${t.periodStart} AND ${t.periodStart} >= '0001-01-01T00:00:00Z'::timestamptz AND ${t.periodEnd} < '10000-01-01T00:00:00Z'::timestamptz AND date_trunc('milliseconds', ${t.periodStart}) = ${t.periodStart} AND date_trunc('milliseconds', ${t.periodEnd}) = ${t.periodEnd}`),
  check('production_record_quantity_check', sql`${t.outputQuantity} >= 0 AND ${t.outputQuantity} <= 999999999999.999 AND scale(${t.outputQuantity}) <= 3`),
  check('production_record_notes_check', sql`${t.notes} IS NULL OR char_length(${t.notes}) <= 1000`),
  // ponytail: Drizzle 0.45 has no exclusion builder; 0013 SQL owns GiST exclusion. Never regenerate it away.
]);
