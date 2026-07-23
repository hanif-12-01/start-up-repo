-- Rollback SQL for 0000_auth_schema.sql
-- Drops tables in reverse dependency order cleanly

DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
