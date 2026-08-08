import { bigint, boolean, check, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const billingPlan = pgTable('billing_plan', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  priceAmount: bigint('price_amount', { mode: 'bigint' }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  interval: text('interval').notNull().default('monthly'),
  active: boolean('active').notNull().default(true),
});

export const sandboxInvoice = pgTable('sandbox_invoice', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  planCode: text('plan_code').notNull().references(() => billingPlan.code),
  invoiceNumber: text('invoice_number').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  status: text('status').notNull().default('OPEN'),
  simulated: boolean('simulated').notNull().default(true),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (table) => [
  unique('sandbox_invoice_user_key_unique').on(table.userId, table.planCode, table.idempotencyKey),
  check('sandbox_invoice_status_check', sql`${table.status} IN ('OPEN', 'PAID', 'FAILED', 'CANCELLED')`),
]);

export const sandboxPayment = pgTable('sandbox_payment', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().unique().references(() => sandboxInvoice.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('PENDING'),
  provider: text('provider').notNull().default('sandbox_simulator'),
  providerReference: text('provider_reference'),
  simulated: boolean('simulated').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('sandbox_payment_status_check', sql`${table.status} IN ('PENDING', 'SIMULATED_PAID', 'FAILED', 'CANCELLED')`),
]);
