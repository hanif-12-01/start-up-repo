-- IT-DIAG-06 rollback

DROP TABLE IF EXISTS "action_outcome_evaluation";

ALTER TABLE "diagnostic_session"
  DROP COLUMN IF EXISTS "closed_at";
