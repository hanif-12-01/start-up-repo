-- IT-DIAG-04: tenant-owned, versioned guided-inspection snapshots

CREATE TABLE IF NOT EXISTS "inspection_plan" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "diagnostic_candidate_id" text NOT NULL,
  "inspection_code" text NOT NULL,
  "inspection_version" integer NOT NULL,
  "rule_version" text NOT NULL,
  "title" text NOT NULL,
  "status" text DEFAULT 'IN_PROGRESS' NOT NULL,
  "result_code" text,
  "user_note" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "inspection_plan_candidate_code_version_rule_unique"
    UNIQUE ("diagnostic_candidate_id", "inspection_code", "inspection_version", "rule_version"),
  CONSTRAINT "inspection_plan_code_check"
    CHECK (length(trim("inspection_code")) > 0),
  CONSTRAINT "inspection_plan_version_check"
    CHECK ("inspection_version" > 0),
  CONSTRAINT "inspection_plan_rule_version_check"
    CHECK (length(trim("rule_version")) > 0),
  CONSTRAINT "inspection_plan_title_check"
    CHECK (length(trim("title")) > 0),
  CONSTRAINT "inspection_plan_status_check"
    CHECK ("status" IN ('IN_PROGRESS', 'COMPLETED')),
  CONSTRAINT "inspection_plan_result_check"
    CHECK ("result_code" IS NULL OR "result_code" IN ('FOUND', 'NOT_FOUND', 'UNKNOWN', 'NEEDS_HELP')),
  CONSTRAINT "inspection_plan_note_length_check"
    CHECK ("user_note" IS NULL OR char_length("user_note") <= 1000),
  CONSTRAINT "inspection_plan_completion_check"
    CHECK (
      ("status" = 'IN_PROGRESS' AND "result_code" IS NULL AND "completed_at" IS NULL)
      OR
      ("status" = 'COMPLETED' AND "result_code" IS NOT NULL AND "completed_at" IS NOT NULL)
    ),
  CONSTRAINT "inspection_plan_business_id_fk" FOREIGN KEY ("business_id")
    REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inspection_plan_candidate_id_fk" FOREIGN KEY ("diagnostic_candidate_id")
    REFERENCES "public"."diagnostic_candidate"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "inspection_plan_business_status_idx"
  ON "inspection_plan" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "inspection_plan_candidate_idx"
  ON "inspection_plan" ("diagnostic_candidate_id");

CREATE TABLE IF NOT EXISTS "inspection_item" (
  "id" text PRIMARY KEY NOT NULL,
  "plan_id" text NOT NULL,
  "item_code" text NOT NULL,
  "item_version" integer NOT NULL,
  "instruction_snapshot" text NOT NULL,
  "safety_level" text NOT NULL,
  "result_options_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sort_order" integer NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "answer_code" text,
  "note" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "inspection_item_plan_code_version_unique"
    UNIQUE ("plan_id", "item_code", "item_version"),
  CONSTRAINT "inspection_item_plan_sort_unique"
    UNIQUE ("plan_id", "sort_order"),
  CONSTRAINT "inspection_item_code_check"
    CHECK (length(trim("item_code")) > 0),
  CONSTRAINT "inspection_item_version_check"
    CHECK ("item_version" > 0),
  CONSTRAINT "inspection_item_instruction_check"
    CHECK (length(trim("instruction_snapshot")) > 0),
  CONSTRAINT "inspection_item_safety_check"
    CHECK ("safety_level" IN ('SAFE_OBSERVATION', 'PROFESSIONAL_REQUIRED')),
  CONSTRAINT "inspection_item_result_options_check"
    CHECK (jsonb_typeof("result_options_json") = 'array' AND jsonb_array_length("result_options_json") > 0),
  CONSTRAINT "inspection_item_sort_order_check"
    CHECK ("sort_order" > 0),
  CONSTRAINT "inspection_item_status_check"
    CHECK ("status" IN ('PENDING', 'ANSWERED')),
  CONSTRAINT "inspection_item_answer_check"
    CHECK ("answer_code" IS NULL OR "answer_code" IN ('FOUND', 'NOT_FOUND', 'UNKNOWN', 'NEEDS_HELP')),
  CONSTRAINT "inspection_item_note_length_check"
    CHECK ("note" IS NULL OR char_length("note") <= 1000),
  CONSTRAINT "inspection_item_completion_check"
    CHECK (
      ("status" = 'PENDING' AND "answer_code" IS NULL AND "completed_at" IS NULL)
      OR
      ("status" = 'ANSWERED' AND "answer_code" IS NOT NULL AND "completed_at" IS NOT NULL)
    ),
  CONSTRAINT "inspection_item_plan_id_fk" FOREIGN KEY ("plan_id")
    REFERENCES "public"."inspection_plan"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "inspection_item_plan_order_idx"
  ON "inspection_item" ("plan_id", "sort_order");
