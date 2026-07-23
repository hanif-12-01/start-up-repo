-- IT-DIAG-01A: Journey state (plan/trial/onboarding) and business minimum

CREATE TABLE IF NOT EXISTS "user_plan" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "plan" text NOT NULL,
  "trial_starts_at" timestamp with time zone,
  "trial_ends_at" timestamp with time zone,
  "idempotency_key" text,
  "onboarding_completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "user_plan_user_id_unique" UNIQUE ("user_id"),
  CONSTRAINT "user_plan_idempotency_key_unique" UNIQUE ("idempotency_key"),
  CONSTRAINT "user_plan_plan_check" CHECK ("plan" IN ('FREE', 'PRO_TRIAL')),
  CONSTRAINT "user_plan_user_id_fk" FOREIGN KEY ("user_id")
    REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "business" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "business_type" text NOT NULL,
  "city" text,
  "segment" text NOT NULL,
  "electrical_system" text NOT NULL,
  "room_count" integer,
  "is_active" text DEFAULT 'true' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "business_room_count_check" CHECK ("room_count" IS NULL OR "room_count" >= 0),
  CONSTRAINT "business_type_check" CHECK ("business_type" IN ('KOS_PROPERTY', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')),
  CONSTRAINT "business_segment_check" CHECK ("segment" IN ('KOS', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')),
  CONSTRAINT "business_electrical_system_check" CHECK ("electrical_system" IN ('ALL_IN', 'TOKEN_PER_KAMAR', 'SUB_METER', 'PATUNGAN', 'CAMPURAN')),
  CONSTRAINT "business_user_id_fk" FOREIGN KEY ("user_id")
    REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "business_user_id_idx" ON "business" ("user_id");
