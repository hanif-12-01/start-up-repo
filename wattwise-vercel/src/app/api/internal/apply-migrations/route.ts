import { NextResponse } from 'next/server';
import { getPool } from '@/server/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql0009 = `
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_occupied_room_count_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_employee_count_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_operating_days_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_power_va_check";
ALTER TABLE "business" DROP CONSTRAINT IF EXISTS "business_tariff_check";

ALTER TABLE "business"
  ADD COLUMN IF NOT EXISTS "province" text,
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "occupied_room_count" integer,
  ADD COLUMN IF NOT EXISTS "employee_count" integer,
  ADD COLUMN IF NOT EXISTS "operating_days_per_month" integer,
  ADD COLUMN IF NOT EXISTS "business_notes" text,
  ADD COLUMN IF NOT EXISTS "customer_type" text,
  ADD COLUMN IF NOT EXISTS "power_va" integer,
  ADD COLUMN IF NOT EXISTS "tariff_rupiah_per_kwh" numeric(15, 2),
  ADD COLUMN IF NOT EXISTS "payment_method" text,
  ADD COLUMN IF NOT EXISTS "meter_type" text,
  ADD COLUMN IF NOT EXISTS "electricity_notes" text,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;

ALTER TABLE "business"
  ADD CONSTRAINT "business_occupied_room_count_check" CHECK ("occupied_room_count" IS NULL OR "occupied_room_count" >= 0),
  ADD CONSTRAINT "business_employee_count_check" CHECK ("employee_count" IS NULL OR "employee_count" >= 0),
  ADD CONSTRAINT "business_operating_days_check" CHECK ("operating_days_per_month" IS NULL OR ("operating_days_per_month" >= 1 AND "operating_days_per_month" <= 31)),
  ADD CONSTRAINT "business_power_va_check" CHECK ("power_va" IS NULL OR "power_va" > 0),
  ADD CONSTRAINT "business_tariff_check" CHECK ("tariff_rupiah_per_kwh" IS NULL OR "tariff_rupiah_per_kwh" >= 0);

ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_start_check";
ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_end_check";
ALTER TABLE "electricity_bill" DROP CONSTRAINT IF EXISTS "electricity_bill_meter_order_check";

ALTER TABLE "electricity_bill"
  ADD COLUMN IF NOT EXISTS "meter_start" numeric(15, 3),
  ADD COLUMN IF NOT EXISTS "meter_end" numeric(15, 3),
  ADD COLUMN IF NOT EXISTS "payment_method" text;

ALTER TABLE "electricity_bill"
  ADD CONSTRAINT "electricity_bill_meter_start_check" CHECK ("meter_start" IS NULL OR "meter_start" >= 0),
  ADD CONSTRAINT "electricity_bill_meter_end_check" CHECK ("meter_end" IS NULL OR "meter_end" >= 0),
  ADD CONSTRAINT "electricity_bill_meter_order_check" CHECK ("meter_start" IS NULL OR "meter_end" IS NULL OR "meter_end" >= "meter_start");

ALTER TABLE "appliance" DROP CONSTRAINT IF EXISTS "appliance_confidence_check";

ALTER TABLE "appliance"
  ADD COLUMN IF NOT EXISTS "confidence" text DEFAULT 'USER_CUSTOM' NOT NULL,
  ADD COLUMN IF NOT EXISTS "notes" text;

ALTER TABLE "appliance"
  ADD CONSTRAINT "appliance_confidence_check" CHECK ("confidence" IN ('USER_CUSTOM', 'LOW', 'MEDIUM', 'HIGH'));

ALTER TABLE "user_plan" DROP CONSTRAINT IF EXISTS "user_plan_plan_check";
ALTER TABLE "user_plan" DROP CONSTRAINT IF EXISTS "user_plan_status_check";
ALTER TABLE "user_plan"
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL,
  ADD COLUMN IF NOT EXISTS "trial_used_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "current_period_starts_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "current_period_ends_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;

ALTER TABLE "user_plan"
  ADD CONSTRAINT "user_plan_plan_check" CHECK ("plan" IN ('FREE', 'PRO_TRIAL', 'PRO', 'BUSINESS')),
  ADD CONSTRAINT "user_plan_status_check" CHECK ("status" IN ('ACTIVE', 'CANCELLED', 'EXPIRED'));

UPDATE "user_plan"
SET "trial_used_at" = COALESCE("trial_used_at", "trial_starts_at")
WHERE "trial_starts_at" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "billing_plan" (
  "code" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "price_amount" bigint NOT NULL,
  "currency" text DEFAULT 'IDR' NOT NULL,
  "interval" text DEFAULT 'monthly' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  CONSTRAINT "billing_plan_price_check" CHECK ("price_amount" >= 0),
  CONSTRAINT "billing_plan_interval_check" CHECK ("interval" IN ('monthly', 'yearly'))
);

INSERT INTO "billing_plan" ("code", "name", "price_amount", "currency", "interval") VALUES
  ('FREE', 'Gratis', 0, 'IDR', 'monthly'),
  ('PRO', 'Pro', 99000, 'IDR', 'monthly'),
  ('BUSINESS', 'Business', 249000, 'IDR', 'monthly')
ON CONFLICT ("code") DO NOTHING;

CREATE TABLE IF NOT EXISTS "sandbox_invoice" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "plan_code" text NOT NULL REFERENCES "billing_plan"("code"),
  "invoice_number" text NOT NULL UNIQUE,
  "idempotency_key" text NOT NULL,
  "amount" bigint NOT NULL,
  "currency" text DEFAULT 'IDR' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "simulated" boolean DEFAULT true NOT NULL,
  "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone,
  CONSTRAINT "sandbox_invoice_user_key_unique" UNIQUE ("user_id", "plan_code", "idempotency_key"),
  CONSTRAINT "sandbox_invoice_status_check" CHECK ("status" IN ('OPEN', 'PAID', 'FAILED', 'CANCELLED')),
  CONSTRAINT "sandbox_invoice_simulation_check" CHECK ("simulated" = true)
);

CREATE TABLE IF NOT EXISTS "sandbox_payment" (
  "id" text PRIMARY KEY NOT NULL,
  "invoice_id" text NOT NULL UNIQUE REFERENCES "sandbox_invoice"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "provider" text DEFAULT 'sandbox_simulator' NOT NULL,
  "provider_reference" text,
  "simulated" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sandbox_payment_status_check" CHECK ("status" IN ('PENDING', 'SIMULATED_PAID', 'FAILED', 'CANCELLED')),
  CONSTRAINT "sandbox_payment_simulation_check" CHECK ("simulated" = true)
);

CREATE INDEX IF NOT EXISTS "sandbox_invoice_user_idx" ON "sandbox_invoice" ("user_id", "issued_at");
CREATE INDEX IF NOT EXISTS "sandbox_payment_user_idx" ON "sandbox_payment" ("user_id", "created_at");
`;

const sql0010 = `
ALTER TABLE electricity_bill
ADD COLUMN IF NOT EXISTS kwh_source text NOT NULL DEFAULT 'LEGACY_UNKNOWN';

ALTER TABLE electricity_bill DROP CONSTRAINT IF EXISTS electricity_bill_kwh_source_check;
ALTER TABLE electricity_bill
ADD CONSTRAINT electricity_bill_kwh_source_check
CHECK (kwh_source IN ('USER_ENTERED', 'METER_DERIVED', 'LEGACY_UNKNOWN'));

UPDATE electricity_bill
SET kwh_source = 'LEGACY_UNKNOWN'
WHERE kwh_source IS NULL OR kwh_source = '';
`;

const sqlDrizzleMigrations = `
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO "__drizzle_migrations" (id, hash, created_at) VALUES
  (0, '0000_auth_schema', 1700000000000),
  (1, '0001_journey_business', 1700000001000),
  (2, '0002_bill_first', 1700000002000),
  (3, '0003_diagnostic_questionnaire', 1700000003000),
  (4, '0004_diagnostic_candidates', 1700000004000),
  (5, '0005_guided_inspections', 1700000005000),
  (6, '0006_energy_action_plans', 1700000006000),
  (7, '0007_action_outcome_evaluations', 1700000007000),
  (8, '0008_workspace_feature_parity', 1700000008000),
  (9, '0009_product_parity', 1700000009000),
  (10, '0010_kwh_provenance', 1700000010000)
ON CONFLICT (id) DO UPDATE SET hash = EXCLUDED.hash;
`;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  // Require token or correlation header for security
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.BETTER_AUTH_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized migration request' }, { status: 401 });
  }

  try {
    const pool = getPool();
    await pool.query(sql0009);
    await pool.query(sql0010);
    await pool.query(sqlDrizzleMigrations);

    return NextResponse.json({
      status: 'success',
      message: 'Migrations 0009, 0010 and __drizzle_migrations table applied and reconciled successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
