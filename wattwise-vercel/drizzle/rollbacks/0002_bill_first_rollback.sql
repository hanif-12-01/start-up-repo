-- Rollback IT-DIAG-01B: remove bill-first persistence only
DROP TABLE IF EXISTS "electricity_bill" CASCADE;

