-- IT-DIAG-03: deterministic diagnostic candidate persistence

CREATE TABLE IF NOT EXISTS "diagnostic_candidate" (
  "id" text PRIMARY KEY NOT NULL,
  "diagnostic_session_id" text NOT NULL,
  "candidate_code" text NOT NULL,
  "candidate_version" integer NOT NULL,
  "candidate_type" text NOT NULL,
  "rule_version" text NOT NULL,
  "title" text NOT NULL,
  "rank" integer NOT NULL,
  "internal_score" integer NOT NULL,
  "evidence_level" text NOT NULL,
  "explanation" text NOT NULL,
  "supporting_factors_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "contradicting_factors_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "diagnostic_candidate_session_code_version_rule_unique"
    UNIQUE ("diagnostic_session_id", "candidate_code", "candidate_version", "rule_version"),
  CONSTRAINT "diagnostic_candidate_session_rule_rank_unique"
    UNIQUE ("diagnostic_session_id", "rule_version", "rank"),
  CONSTRAINT "diagnostic_candidate_code_check"
    CHECK (length(trim("candidate_code")) > 0),
  CONSTRAINT "diagnostic_candidate_version_check"
    CHECK ("candidate_version" > 0),
  CONSTRAINT "diagnostic_candidate_rule_version_check"
    CHECK (length(trim("rule_version")) > 0),
  CONSTRAINT "diagnostic_candidate_type_check"
    CHECK ("candidate_type" IN (
      'ADMINISTRATIVE', 'OCCUPANCY', 'OPERATIONAL', 'APPLIANCE',
      'WATER_SYSTEM', 'DATA_QUALITY', 'OTHER'
    )),
  CONSTRAINT "diagnostic_candidate_title_check"
    CHECK (length(trim("title")) > 0),
  CONSTRAINT "diagnostic_candidate_rank_check"
    CHECK ("rank" BETWEEN 1 AND 3),
  CONSTRAINT "diagnostic_candidate_score_check"
    CHECK ("internal_score" BETWEEN 0 AND 100),
  CONSTRAINT "diagnostic_candidate_evidence_check"
    CHECK ("evidence_level" IN ('STRONG', 'MODERATE', 'LIMITED')),
  CONSTRAINT "diagnostic_candidate_explanation_check"
    CHECK (length(trim("explanation")) > 0),
  CONSTRAINT "diagnostic_candidate_supporting_factors_check"
    CHECK (jsonb_typeof("supporting_factors_json") = 'array'),
  CONSTRAINT "diagnostic_candidate_contradicting_factors_check"
    CHECK (jsonb_typeof("contradicting_factors_json") = 'array'),
  CONSTRAINT "diagnostic_candidate_session_id_fk" FOREIGN KEY ("diagnostic_session_id")
    REFERENCES "public"."diagnostic_session"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "diagnostic_candidate_session_rank_idx"
  ON "diagnostic_candidate" ("diagnostic_session_id", "rule_version", "rank");
