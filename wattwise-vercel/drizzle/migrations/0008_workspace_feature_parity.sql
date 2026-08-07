CREATE TABLE IF NOT EXISTS "revenue_entry" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "period_month" date NOT NULL,
  "amount_rupiah" bigint NOT NULL,
  "input_mode" text DEFAULT 'EXACT' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "revenue_entry_business_month_unique" UNIQUE("business_id", "period_month"),
  CONSTRAINT "revenue_entry_amount_check" CHECK ("amount_rupiah" >= 0),
  CONSTRAINT "revenue_entry_mode_check" CHECK ("input_mode" IN ('EXACT', 'ESTIMATE'))
);

CREATE INDEX IF NOT EXISTS "revenue_entry_business_month_idx"
  ON "revenue_entry" ("business_id", "period_month");

CREATE TABLE IF NOT EXISTS "appliance" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "business"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "power_watts" integer,
  "daily_hours" numeric(5, 2),
  "quantity" integer DEFAULT 1 NOT NULL,
  "operating_days" integer DEFAULT 30 NOT NULL,
  "data_source" text DEFAULT 'MANUAL' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "appliance_power_check" CHECK ("power_watts" IS NULL OR "power_watts" >= 0),
  CONSTRAINT "appliance_hours_check" CHECK ("daily_hours" IS NULL OR ("daily_hours" >= 0 AND "daily_hours" <= 24)),
  CONSTRAINT "appliance_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "appliance_days_check" CHECK ("operating_days" > 0 AND "operating_days" <= 31),
  CONSTRAINT "appliance_source_check" CHECK ("data_source" IN ('MANUAL', 'TEMPLATE'))
);

CREATE INDEX IF NOT EXISTS "appliance_business_active_idx"
  ON "appliance" ("business_id", "is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "appliance_business_name_unique"
  ON "appliance" ("business_id", lower("name"));

CREATE TABLE IF NOT EXISTS "user_preference" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "bill_alerts" boolean DEFAULT true NOT NULL,
  "monthly_digest" boolean DEFAULT true NOT NULL,
  "action_reminders" boolean DEFAULT true NOT NULL,
  "appearance" text DEFAULT 'SYSTEM' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preference_appearance_check" CHECK ("appearance" IN ('SYSTEM', 'LIGHT', 'DARK'))
);
