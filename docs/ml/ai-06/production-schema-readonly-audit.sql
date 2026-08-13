SELECT
  current_database()::text AS database_name,
  current_user::text AS current_role,
  current_setting('transaction_read_only')::boolean AS transaction_read_only,
  current_setting('server_version')::text AS server_version;

WITH targets(table_name) AS (
  VALUES ('business'), ('electricity_bill'), ('ai_shadow_forecast'), ('ai_shadow_enrollment')
), resolved AS (
  SELECT table_name, to_regclass(format('%I.%I', 'public', table_name)) AS relation_oid
  FROM targets
)
SELECT
  table_name,
  relation_oid IS NOT NULL AS present,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'SELECT') END AS can_select,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'INSERT') END AS can_insert,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'UPDATE') END AS can_update,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'DELETE') END AS can_delete,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'TRUNCATE') END AS can_truncate
FROM resolved
ORDER BY table_name;

SELECT
  table_name::text,
  column_name::text,
  data_type::text,
  is_nullable::text,
  column_default::text
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY table_name, ordinal_position;

SELECT
  relation.relname::text AS table_name,
  constraint_row.conname::text AS constraint_name,
  constraint_row.contype::text AS constraint_type,
  pg_get_constraintdef(constraint_row.oid, true)::text AS definition
FROM pg_catalog.pg_constraint constraint_row
JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
JOIN pg_catalog.pg_namespace namespace_row ON namespace_row.oid = relation.relnamespace
WHERE namespace_row.nspname = 'public'
  AND relation.relname IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY relation.relname, constraint_row.conname;

SELECT
  tablename::text AS table_name,
  indexname::text AS index_name,
  indexdef::text AS definition
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY tablename, indexname;

WITH signatures(migration, signature, present) AS (
  VALUES
    ('0011', 'business.data_provenance', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business' AND column_name = 'data_provenance'
    )),
    ('0011', 'ai_shadow_forecast', to_regclass('public.ai_shadow_forecast') IS NOT NULL),
    ('0011', 'claim_index', to_regclass('public.ai_shadow_forecast_claim_idx') IS NOT NULL),
    ('0011', 'business_target_index', to_regclass('public.ai_shadow_forecast_business_target_idx') IS NOT NULL),
    ('0011', 'real_evidence_index', to_regclass('public.ai_shadow_forecast_real_evidence_idx') IS NOT NULL),
    ('0012', 'history_latest_period_end', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_shadow_forecast' AND column_name = 'history_latest_period_end'
    )),
    ('0012', 'history_temporal_integrity', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_shadow_forecast' AND column_name = 'history_temporal_integrity'
    )),
    ('0012', 'unclassified_provenance', EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint constraint_row
      JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace namespace_row ON namespace_row.oid = relation.relnamespace
      WHERE namespace_row.nspname = 'public'
        AND relation.relname = 'ai_shadow_forecast'
        AND constraint_row.conname = 'ai_shadow_forecast_provenance_check'
        AND pg_get_constraintdef(constraint_row.oid, true) LIKE '%UNCLASSIFIED%'
    )),
    ('0013', 'target_outcome_unknown_at_forecast', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_shadow_forecast' AND column_name = 'target_outcome_unknown_at_forecast'
    )),
    ('0013', 'forecast_days_into_target', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_shadow_forecast' AND column_name = 'forecast_days_into_target'
    )),
    ('0013', 'timing_constraint', EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint constraint_row
      JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace namespace_row ON namespace_row.oid = relation.relnamespace
      WHERE namespace_row.nspname = 'public'
        AND relation.relname = 'ai_shadow_forecast'
        AND constraint_row.conname = 'ai_shadow_forecast_timing_check'
    )),
    ('0014', 'ai_shadow_enrollment', to_regclass('public.ai_shadow_enrollment') IS NOT NULL),
    ('0014', 'enrollment_index', to_regclass('public.ai_shadow_enrollment_enabled_idx') IS NOT NULL),
    ('0014', 'enrollment_state_constraint', EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint constraint_row
      JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace namespace_row ON namespace_row.oid = relation.relnamespace
      WHERE namespace_row.nspname = 'public'
        AND relation.relname = 'ai_shadow_enrollment'
        AND constraint_row.conname = 'ai_shadow_enrollment_state_check'
    ))
)
SELECT migration, signature, present
FROM signatures
ORDER BY migration, signature;
