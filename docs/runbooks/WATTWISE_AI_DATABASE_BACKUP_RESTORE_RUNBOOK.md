# Database Backup & Restore Runbook — WattWise AI

## 1. Scope
This runbook establishes backup, snapshotting, rehearsal, and point-in-time recovery (PITR) procedures for the Neon serverless PostgreSQL database backing WattWise AI.

## 2. Capability & Target Classifications
- **Measured Schema & Data Restore Duration**: `measured rehearsal result` (6.34 seconds / 6341 ms observed during rehearsal on isolated disposable target)
- **Recovery Point Objective (RPO)**: `proposed target` (5 minutes) / `provider-dependent assumption` (Neon WAL continuous archiving) — Product Owner Decision Required
- **Recovery Time Objective (RTO)**: `proposed target` (15 minutes) — Product Owner Decision Required
- **Point-in-Time Restore (PITR) Branching**: `provider-dependent assumption` (Relies on Neon Branching API capability)

## 3. Prerequisites
- Authenticated Neon CLI (`neonctl`) or Neon Console access.
- Target project ID and branch classification documented (`main` / production branch).
- RPO Target: 5 minutes (via Neon automated WAL archiving).
- RTO Target: 15 minutes.

## 4. Authorized Operator
- Database Administrator / Lead DevOps Engineer.

## 5. Commands & UI Workflow
```powershell
# 1. Create a manual pre-deployment branch/snapshot in Neon
npx neonctl branches create --project-id <project-id> --name pre-deploy-backup-$(Get-Date -Format "yyyyMMdd-HHmmss")

# 2. List active database branches to verify snapshot creation
npx neonctl branches list --project-id <project-id>

# 3. Restore procedure: Create disposable recovery branch from snapshot
npx neonctl branches create --project-id <project-id> --name pitr-restore-target --parent <snapshot-branch-id>

# 4. Verify table count and application readiness on restored branch
node scripts/verify-db-schema.mjs --connection-string <restored-branch-dsn>

# 5. Point Production pooler endpoint to restored branch DSN if recovery is confirmed
npx vercel env add DATABASE_URL production --value <restored-branch-dsn> --yes --force
```

## 6. Safety Checks
- Verify database engine version matches expected release (PostgreSQL 16.x or approved release).
- Confirm all 14 core application tables exist in restored database.
- Confirm full TLS certificate validation (`ssl: true`).
- Ensure no production traffic is routed to disposable rehearsal target during verification.

## 7. Evidence Required
- Neon branch creation log showing branch ID, timestamp, and parent LSN/snapshot.
- Schema audit log confirming 14 tables and migration integrity.
- Synthetic seed / record count reconciliation report.
- Deletion log of temporary rehearsal branch.

## 8. Stop Conditions
- Neon API rate limit or authentication error.
- Restored schema table count discrepancy (< 14 tables).
- Data loss or corruption detected in point-in-time snapshot.

## 9. Rollback & Recovery Path
- If restored branch fails verification, recreate branch from an earlier parent LSN / snapshot timestamp.
- Re-route connection string back to original production branch if switch was not finalized.

## 10. Post-Action Verification
- Test `/api/health/ready` database connectivity.
- Verify read/write capability on synthetic tenant table.
- Clean up disposable test/rehearsal branches: `npx neonctl branches delete <disposable-branch-id> --confirm`.

## 11. Forbidden Actions
- NEVER delete the primary production database branch (`main`).
- NEVER store plain-text database passwords or connection URLs in version-controlled runbooks.
- NEVER perform restore testing directly on the live production branch.
