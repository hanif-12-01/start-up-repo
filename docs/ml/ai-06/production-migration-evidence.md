# AI-06B Production Migration Evidence

## Stage B1 read-only audit

Status: **BLOCKED — production schema was not guessed and no migration was executed**.

The production Vercel project exposes the name `DATABASE_URL`, but marks its value sensitive. The
authenticated Vercel CLI returned no usable production database credential. `vercel env pull`
returned the protected placeholder, while `vercel env run` did not inject the sensitive value.
The local `wattwise-vercel/.env.local` points at `127.0.0.1:5439` and was explicitly rejected as
production evidence.

The public production readiness endpoint reported database status `ok` and
`schemaCompatible: true` for deployed release `ce7349b93b2737da165a1f7269abbf3987162df7`. This proves
only that the currently deployed application can use its current schema. That release predates the
AI integration, so it does not prove whether migrations 0011-0014 exist.

Consequently:

- `PRODUCTION_SCHEMA_AUDITED_READ_ONLY = NO`;
- `CURRENT_PRODUCTION_SCHEMA_STATE = UNKNOWN`;
- `MISSING_MIGRATIONS = UNKNOWN`;
- `PRODUCTION_SHADOW_ENROLLMENT_STATE = UNKNOWN`;
- `BACKUP_RECOVERY_AVAILABLE = UNKNOWN`;
- `PRODUCTION_MIGRATION_EXECUTED = NO`.

The exact unblock is operator-provided read-only PostgreSQL access (or an operator-run sanitized
schema query result) plus provider backup/PITR status. No password, URL, business row, or secret
may be copied into Git or chat output.

## Required read-only checks after access is authorized

Inspect catalog metadata and the migration journal for:

- `business.data_provenance` and `business_data_provenance_check`;
- `ai_shadow_forecast`, all indexes, constraints, and foreign key;
- `history_latest_period_end`;
- `history_temporal_integrity`;
- `target_outcome_unknown_at_forecast`;
- `forecast_days_into_target` and timing check;
- `ai_shadow_enrollment`, its constraints/index, and aggregate enabled count only.

The evidence must report booleans/counts only. It must not return business IDs, payloads, usage,
predictions, owner data, or individual rows.

## Conditional migration delta

This table is a plan, not a statement about the production state.

| Last verified production state | Exact forward order | Exact reverse order on migration failure |
|---|---|---|
| Before 0011 | 0011, 0012, 0013, 0014 | 0014, 0013, 0012, 0011 |
| Through 0011 | 0012, 0013, 0014 | 0014, 0013, 0012 |
| Through 0012 | 0013, 0014 | 0014, 0013 |
| Through 0013 | 0014 | 0014 |
| Through 0014 | none | none |
| Partial/inconsistent objects | stop and obtain Product Owner/database-owner decision | no automatic rollback |

Only the row matching the future read-only audit may be executed in B2.

## Expected changes by migration

### 0011_ai_shadow_integration

- Adds `business.data_provenance`, default `UNCLASSIFIED`, plus allowed-value check.
- Creates `ai_shadow_forecast` with request uniqueness, tenant foreign key with cascade delete,
  status/mode/phase/provenance/source constraints, and three operational/evidence indexes.

### 0012_ai_shadow_evidence_integrity

- Extends forecast provenance to include `UNCLASSIFIED`.
- Adds nullable `history_latest_period_end`.
- Adds `history_temporal_integrity`, conservatively defaulting existing rows to false.

### 0013_ai_shadow_prospective_reachability

- Adds `target_outcome_unknown_at_forecast`, conservatively false for existing rows.
- Adds nullable non-negative `forecast_days_into_target` and its check constraint.

### 0014_ai_shadow_enrollment

- Creates one-row-per-business `ai_shadow_enrollment` with REAL_WATTWISE-only approval, bounded
  reason, valid enabled/disabled state, tenant foreign key, and enabled/provenance index.
- Does not enroll or reclassify any business.

## B2 migration procedure after approval

1. Re-run the read-only catalog audit and confirm it has not changed since approval.
2. Confirm provider-supported backup/PITR and record only `YES` or `NO`.
3. Keep application effective mode `OFF` and scheduler disabled.
4. Apply only the exact missing migration, one file at a time, in ascending order.
5. After each file, verify the expected objects, constraints, indexes, current app health, and no
   unexpected row rewrite.
6. Stop immediately on a mismatch; do not attempt the next migration.
7. Roll back only the files applied in that window, newest first, if the database owner determines
   rollback is safer than forward repair.
