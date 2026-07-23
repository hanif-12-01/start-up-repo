-- Rollback IT-DIAG-01A: drop journey and business tables
DROP TABLE IF EXISTS "business" CASCADE;
DROP TABLE IF EXISTS "user_plan" CASCADE;
