-- IT-DIAG-02: diagnostic session and adaptive questionnaire persistence

CREATE TABLE IF NOT EXISTS "diagnostic_session" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "electricity_bill_id" text NOT NULL,
  "comparison_bill_id" text NOT NULL,
  "segment_code" text NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "rule_version" text NOT NULL,
  "questionnaire_completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "diagnostic_session_business_bill_rule_unique"
    UNIQUE ("business_id", "electricity_bill_id", "rule_version"),
  CONSTRAINT "diagnostic_session_status_check"
    CHECK ("status" IN ('DRAFT', 'COLLECTING_CONTEXT', 'ANALYZED', 'INSPECTION_IN_PROGRESS', 'CLOSED')),
  CONSTRAINT "diagnostic_session_segment_check"
    CHECK ("segment_code" IN ('KOS', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')),
  CONSTRAINT "diagnostic_session_rule_version_check"
    CHECK (length(trim("rule_version")) > 0),
  CONSTRAINT "diagnostic_session_distinct_bills_check"
    CHECK ("electricity_bill_id" <> "comparison_bill_id"),
  CONSTRAINT "diagnostic_session_business_id_fk" FOREIGN KEY ("business_id")
    REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "diagnostic_session_electricity_bill_id_fk" FOREIGN KEY ("electricity_bill_id")
    REFERENCES "public"."electricity_bill"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "diagnostic_session_comparison_bill_id_fk" FOREIGN KEY ("comparison_bill_id")
    REFERENCES "public"."electricity_bill"("id") ON DELETE restrict ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "diagnostic_session_business_created_idx"
  ON "diagnostic_session" ("business_id", "created_at");

CREATE TABLE IF NOT EXISTS "diagnostic_answer" (
  "id" text PRIMARY KEY NOT NULL,
  "diagnostic_session_id" text NOT NULL,
  "question_code" text NOT NULL,
  "question_version" integer NOT NULL,
  "answer_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "diagnostic_answer_session_question_unique"
    UNIQUE ("diagnostic_session_id", "question_code", "question_version"),
  CONSTRAINT "diagnostic_answer_question_code_check"
    CHECK (length(trim("question_code")) > 0),
  CONSTRAINT "diagnostic_answer_question_version_check"
    CHECK ("question_version" > 0),
  CONSTRAINT "diagnostic_answer_code_check"
    CHECK ("answer_code" IN ('YES', 'NO', 'UNKNOWN', 'NOT_APPLICABLE')),
  CONSTRAINT "diagnostic_answer_session_id_fk" FOREIGN KEY ("diagnostic_session_id")
    REFERENCES "public"."diagnostic_session"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "diagnostic_answer_session_created_idx"
  ON "diagnostic_answer" ("diagnostic_session_id", "created_at", "id");
