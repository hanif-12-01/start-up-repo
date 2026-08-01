-- IT-DIAG-05: immutable action and baseline snapshots with a safe lifecycle

CREATE TABLE IF NOT EXISTS "energy_action_plan" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "diagnostic_candidate_id" text NOT NULL,
  "inspection_plan_id" text NOT NULL,
  "action_code" text NOT NULL,
  "action_version" integer NOT NULL,
  "rule_version" text NOT NULL,
  "title_snapshot" text NOT NULL,
  "description_snapshot" text NOT NULL,
  "reason_snapshot" text NOT NULL,
  "steps_snapshot_json" jsonb NOT NULL,
  "inspection_result_snapshot" text NOT NULL,
  "baseline_snapshot_json" jsonb NOT NULL,
  "status" text DEFAULT 'PLANNED' NOT NULL,
  "review_mode" text DEFAULT 'NEXT_ELIGIBLE_BILL' NOT NULL,
  "planned_start_date" date NOT NULL,
  "user_note" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "energy_action_plan_inspection_unique" UNIQUE ("inspection_plan_id"),
  CONSTRAINT "energy_action_plan_code_check" CHECK (length(trim("action_code")) > 0),
  CONSTRAINT "energy_action_plan_version_check" CHECK ("action_version" > 0),
  CONSTRAINT "energy_action_plan_rule_check" CHECK (length(trim("rule_version")) > 0),
  CONSTRAINT "energy_action_plan_title_check" CHECK (length(trim("title_snapshot")) > 0),
  CONSTRAINT "energy_action_plan_description_check" CHECK (length(trim("description_snapshot")) > 0),
  CONSTRAINT "energy_action_plan_reason_check" CHECK (length(trim("reason_snapshot")) > 0),
  CONSTRAINT "energy_action_plan_steps_check"
    CHECK (jsonb_typeof("steps_snapshot_json") = 'array' AND jsonb_array_length("steps_snapshot_json") > 0),
  CONSTRAINT "energy_action_plan_baseline_check"
    CHECK (jsonb_typeof("baseline_snapshot_json") = 'object'),
  CONSTRAINT "energy_action_plan_result_check"
    CHECK ("inspection_result_snapshot" IN ('FOUND', 'UNKNOWN', 'NEEDS_HELP')),
  CONSTRAINT "energy_action_plan_status_check"
    CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT "energy_action_plan_review_mode_check"
    CHECK ("review_mode" = 'NEXT_ELIGIBLE_BILL'),
  CONSTRAINT "energy_action_plan_note_length_check"
    CHECK ("user_note" IS NULL OR char_length("user_note") <= 1000),
  CONSTRAINT "energy_action_plan_lifecycle_check" CHECK (
    ("status" = 'PLANNED' AND "started_at" IS NULL AND "completed_at" IS NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'IN_PROGRESS' AND "started_at" IS NOT NULL AND "completed_at" IS NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'COMPLETED' AND "started_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'CANCELLED' AND "completed_at" IS NULL AND "cancelled_at" IS NOT NULL)
  ),
  CONSTRAINT "energy_action_plan_business_id_fk" FOREIGN KEY ("business_id")
    REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "energy_action_plan_candidate_id_fk" FOREIGN KEY ("diagnostic_candidate_id")
    REFERENCES "public"."diagnostic_candidate"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "energy_action_plan_inspection_id_fk" FOREIGN KEY ("inspection_plan_id")
    REFERENCES "public"."inspection_plan"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "energy_action_plan_business_status_idx"
  ON "energy_action_plan" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "energy_action_plan_candidate_idx"
  ON "energy_action_plan" ("diagnostic_candidate_id");
