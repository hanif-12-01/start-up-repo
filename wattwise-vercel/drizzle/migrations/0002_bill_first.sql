-- IT-DIAG-01B: bill-first manual electricity input

CREATE TABLE IF NOT EXISTS "electricity_bill" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "total_amount_rupiah" bigint NOT NULL,
  "kwh" numeric(15, 3),
  "tariff_rupiah_per_kwh" numeric(15, 2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "electricity_bill_business_period_unique"
    UNIQUE ("business_id", "period_start", "period_end"),
  CONSTRAINT "electricity_bill_period_check"
    CHECK ("period_end" >= "period_start"),
  CONSTRAINT "electricity_bill_amount_check"
    CHECK ("total_amount_rupiah" >= 0),
  CONSTRAINT "electricity_bill_kwh_check"
    CHECK ("kwh" IS NULL OR "kwh" >= 0),
  CONSTRAINT "electricity_bill_tariff_check"
    CHECK ("tariff_rupiah_per_kwh" IS NULL OR "tariff_rupiah_per_kwh" >= 0),
  CONSTRAINT "electricity_bill_business_id_fk" FOREIGN KEY ("business_id")
    REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "electricity_bill_business_period_idx"
  ON "electricity_bill" ("business_id", "period_end", "period_start");

