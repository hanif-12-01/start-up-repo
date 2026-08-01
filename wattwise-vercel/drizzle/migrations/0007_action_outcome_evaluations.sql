-- IT-DIAG-06: immutable outcome evaluations and explicit diagnostic closure

ALTER TABLE "diagnostic_session"
  ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "action_outcome_evaluation" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL,
  "diagnostic_session_id" text NOT NULL,
  "action_plan_id" text NOT NULL,
  "baseline_bill_id" text NOT NULL,
  "follow_up_bill_id" text NOT NULL,
  "rule_version" text NOT NULL,
  "similarity_band_bps" integer NOT NULL,
  "evaluation_eligible_after_date" date NOT NULL,
  "baseline_snapshot_json" jsonb NOT NULL,
  "follow_up_snapshot_json" jsonb NOT NULL,
  "comparison_snapshot_json" jsonb NOT NULL,
  "cost_direction" text NOT NULL,
  "usage_direction" text NOT NULL,
  "tariff_direction" text NOT NULL,
  "data_quality_code" text NOT NULL,
  "overall_outcome_code" text NOT NULL,
  "explanation_snapshot_json" jsonb NOT NULL,
  "evaluated_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "action_outcome_evaluation_action_unique" UNIQUE ("action_plan_id"),
  CONSTRAINT "action_outcome_rule_check" CHECK (length(trim("rule_version")) > 0),
  CONSTRAINT "action_outcome_band_check" CHECK ("similarity_band_bps" > 0),
  CONSTRAINT "action_outcome_distinct_bills_check" CHECK ("follow_up_bill_id" <> "baseline_bill_id"),
  CONSTRAINT "action_outcome_baseline_snapshot_check"
    CHECK (jsonb_typeof("baseline_snapshot_json") = 'object' AND "baseline_snapshot_json" <> '{}'::jsonb),
  CONSTRAINT "action_outcome_follow_up_snapshot_check"
    CHECK (jsonb_typeof("follow_up_snapshot_json") = 'object' AND "follow_up_snapshot_json" <> '{}'::jsonb),
  CONSTRAINT "action_outcome_comparison_snapshot_check"
    CHECK (jsonb_typeof("comparison_snapshot_json") = 'object' AND "comparison_snapshot_json" <> '{}'::jsonb),
  CONSTRAINT "action_outcome_explanation_snapshot_check"
    CHECK (jsonb_typeof("explanation_snapshot_json") = 'object' AND "explanation_snapshot_json" <> '{}'::jsonb),
  CONSTRAINT "action_outcome_cost_direction_check"
    CHECK ("cost_direction" IN ('LOWER', 'SIMILAR', 'HIGHER')),
  CONSTRAINT "action_outcome_usage_direction_check"
    CHECK ("usage_direction" IN ('LOWER', 'SIMILAR', 'HIGHER', 'UNAVAILABLE')),
  CONSTRAINT "action_outcome_tariff_direction_check"
    CHECK ("tariff_direction" IN ('LOWER', 'SIMILAR', 'HIGHER', 'UNAVAILABLE')),
  CONSTRAINT "action_outcome_data_quality_check"
    CHECK ("data_quality_code" IN ('USAGE_COMPLETE', 'TARIFF_CONTEXT_ONLY', 'COST_ONLY')),
  CONSTRAINT "action_outcome_overall_check"
    CHECK ("overall_outcome_code" IN ('POSITIVE_SIGNAL', 'NO_CLEAR_CHANGE', 'NEGATIVE_SIGNAL', 'MIXED_SIGNAL', 'INCONCLUSIVE')),
  CONSTRAINT "action_outcome_business_id_fk" FOREIGN KEY ("business_id")
    REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "action_outcome_session_id_fk" FOREIGN KEY ("diagnostic_session_id")
    REFERENCES "public"."diagnostic_session"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "action_outcome_action_plan_id_fk" FOREIGN KEY ("action_plan_id")
    REFERENCES "public"."energy_action_plan"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "action_outcome_baseline_bill_id_fk" FOREIGN KEY ("baseline_bill_id")
    REFERENCES "public"."electricity_bill"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "action_outcome_follow_up_bill_id_fk" FOREIGN KEY ("follow_up_bill_id")
    REFERENCES "public"."electricity_bill"("id") ON DELETE restrict ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "action_outcome_evaluation_session_idx"
  ON "action_outcome_evaluation" ("diagnostic_session_id", "created_at");
CREATE INDEX IF NOT EXISTS "action_outcome_evaluation_business_idx"
  ON "action_outcome_evaluation" ("business_id", "created_at");
