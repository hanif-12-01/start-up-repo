# AI-06B.1 Production Backup and Recovery Evidence

## Current verification result

- Provider candidate: Neon Serverless PostgreSQL
- Current provider identity independently verified: **NO**
- Provider-authoritative backup/PITR verification: **FAIL / UNAVAILABLE**
- Backup mechanism: **UNKNOWN FOR CURRENT PRODUCTION PROJECT**
- PITR active: **UNKNOWN**
- Retention: **UNKNOWN**
- Recovery ready before migration: **NO**
- Verification timestamp: `2026-08-13T08:40:01Z`

The current production application code declares `neon-postgresql`, and sanitized repository
evidence from 2026-08-05 records a Neon resource named `wattwise-ai-db`, Free plan, PostgreSQL
17.10, Singapore, plus a successful provider-level branch recovery rehearsal. That historical
evidence is useful provenance but is not current provider-authoritative metadata for this audit.
The Vercel `DATABASE_URL` was created manually and has no marketplace configuration ID, so the
current Neon project cannot be safely identified from Vercel metadata alone.

Current official Neon documentation describes instant point-in-time restore/history retention and
snapshot features, but product capability documentation does not prove that the current production
project has an active recovery window. An authorized operator must supply sanitized current Neon
Console/API metadata containing:

- safe project/resource identifier;
- region and production branch identity;
- plan;
- `history_retention_seconds` or equivalent active restore-window field;
- PITR/instant-restore availability;
- snapshot/backup status if used;
- verification timestamp.

No Neon API key, project credential, connection string, branch endpoint, or snapshot URL may be
recorded. Until that evidence exists, `BACKUP_RECOVERY_VERIFIED=NO` remains a P1 and production
migrations are prohibited.

References:

- [Neon project settings and history retention](https://neon.com/docs/manage/projects)
- [Neon Backup & Restore update](https://neon.com/docs/changelog/2025-10-31)
