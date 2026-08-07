import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { business } from './journey';

export const REVENUE_INPUT_MODES = ['EXACT', 'ESTIMATE'] as const;
export type RevenueInputMode = (typeof REVENUE_INPUT_MODES)[number];

export const revenueEntry = pgTable(
  'revenue_entry',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    periodMonth: date('period_month').notNull(),
    amountRupiah: bigint('amount_rupiah', { mode: 'bigint' }).notNull(),
    inputMode: text('input_mode').notNull().default('EXACT'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('revenue_entry_business_month_unique').on(table.businessId, table.periodMonth),
    index('revenue_entry_business_month_idx').on(table.businessId, table.periodMonth),
    check('revenue_entry_amount_check', sql`${table.amountRupiah} >= 0`),
    check('revenue_entry_mode_check', sql`${table.inputMode} IN ('EXACT', 'ESTIMATE')`),
  ]
);

export const APPLIANCE_SOURCES = ['MANUAL', 'TEMPLATE'] as const;
export type ApplianceSource = (typeof APPLIANCE_SOURCES)[number];

export const appliance = pgTable(
  'appliance',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    powerWatts: integer('power_watts'),
    dailyHours: numeric('daily_hours', { precision: 5, scale: 2 }),
    quantity: integer('quantity').notNull().default(1),
    operatingDays: integer('operating_days').notNull().default(30),
    dataSource: text('data_source').notNull().default('MANUAL'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('appliance_business_active_idx').on(table.businessId, table.isActive),
    check('appliance_power_check', sql`${table.powerWatts} IS NULL OR ${table.powerWatts} >= 0`),
    check('appliance_hours_check', sql`${table.dailyHours} IS NULL OR (${table.dailyHours} >= 0 AND ${table.dailyHours} <= 24)`),
    check('appliance_quantity_check', sql`${table.quantity} > 0`),
    check('appliance_days_check', sql`${table.operatingDays} > 0 AND ${table.operatingDays} <= 31`),
    check('appliance_source_check', sql`${table.dataSource} IN ('MANUAL', 'TEMPLATE')`),
  ]
);

export const APPEARANCE_MODES = ['SYSTEM', 'LIGHT', 'DARK'] as const;
export type AppearanceMode = (typeof APPEARANCE_MODES)[number];

export const userPreference = pgTable(
  'user_preference',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    billAlerts: boolean('bill_alerts').notNull().default(true),
    monthlyDigest: boolean('monthly_digest').notNull().default(true),
    actionReminders: boolean('action_reminders').notNull().default(true),
    appearance: text('appearance').notNull().default('SYSTEM'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('user_preference_appearance_check', sql`${table.appearance} IN ('SYSTEM', 'LIGHT', 'DARK')`),
  ]
);

export type RevenueEntry = typeof revenueEntry.$inferSelect;
export type Appliance = typeof appliance.$inferSelect;
export type UserPreference = typeof userPreference.$inferSelect;
