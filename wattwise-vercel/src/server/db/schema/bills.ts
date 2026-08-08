import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { business } from './journey';

export const electricityBill = pgTable(
  'electricity_bill',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    totalAmountRupiah: bigint('total_amount_rupiah', { mode: 'bigint' }).notNull(),
    kwh: numeric('kwh', { precision: 15, scale: 3 }),
    tariffRupiahPerKwh: numeric('tariff_rupiah_per_kwh', { precision: 15, scale: 2 }),
    meterStart: numeric('meter_start', { precision: 15, scale: 3 }),
    meterEnd: numeric('meter_end', { precision: 15, scale: 3 }),
    paymentMethod: text('payment_method'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('electricity_bill_business_period_unique').on(t.businessId, t.periodStart, t.periodEnd),
    index('electricity_bill_business_period_idx').on(t.businessId, t.periodEnd, t.periodStart),
    check('electricity_bill_period_check', sql`${t.periodEnd} >= ${t.periodStart}`),
    check('electricity_bill_amount_check', sql`${t.totalAmountRupiah} >= 0`),
    check('electricity_bill_kwh_check', sql`${t.kwh} IS NULL OR ${t.kwh} >= 0`),
    check(
      'electricity_bill_tariff_check',
      sql`${t.tariffRupiahPerKwh} IS NULL OR ${t.tariffRupiahPerKwh} >= 0`
    ),
  ]
);

export type ElectricityBill = typeof electricityBill.$inferSelect;
