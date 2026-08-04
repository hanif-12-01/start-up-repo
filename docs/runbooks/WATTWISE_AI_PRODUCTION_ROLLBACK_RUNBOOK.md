# Production Rollback Runbook — WattWise AI

## 1. Scope
This runbook defines emergency rollback procedures for WattWise AI in the event of critical production failures, application regressions, database corruption, or security incidents post-deployment.

## 2. Prerequisites
- Identified production anomaly (HTTP 5xx spikes, database connectivity failure, data corruption, or security breach).
- Access to Vercel CLI / Vercel Dashboard and Neon CLI / Neon Console.
- Previous stable production deployment SHA and database snapshot identifier documented.

## 3. Authorized Operator
- Authorized Incident Manager / Release Engineer / Product Owner.

## 4. Commands & UI Workflow
```powershell
# 1. Promote previous stable Vercel deployment to Production (Instant Rollback)
npx vercel rollback <previous-deployment-id-or-url>

# 2. Verify Vercel alias pointing to rolled-back deployment
npx vercel alias ls

# 3. If database schema rollback is required (and migration is down-reversible):
Set-Location "wattwise-vercel"
node scripts/run-with-postgres.js drizzle-kit drop

# 4. If database data recovery is required from snapshot:
npx neonctl branches create --project-id <project-id> --name rollback-recovery --parent <snapshot-branch-id>
```

## 5. Safety Checks
- Confirm previous Vercel deployment target status is `Ready`.
- Verify database down-migrations do not cause irreversible data loss for existing customer records.
- If data loss risk exists, halt down-migration and initiate Neon point-in-time restore (PITR) / snapshot branch switch.

## 6. Evidence Required
- Incident ticket ID and root-cause summary.
- Vercel rollback command output log.
- Post-rollback health readiness verification output (`/api/health/ready`).
- Database schema and record count reconciliation report.

## 7. Stop Conditions
- Vercel rollback failure or alias target mismatch.
- Database restore inconsistency or tenant data mismatch.
- Rollback duration exceeding Maximum Acceptable Outage boundary (15 minutes).

## 8. Rollback & Recovery Path
- If instant deployment rollback fails, switch production domain alias via Vercel CLI directly to the known good deployment SHA.
- If database restore fails, activate point-in-time restore to pre-incident timestamp.

## 9. Post-Action Verification
- Run readiness health checks: `/api/health/live` and `/api/health/ready`.
- Verify synthetic authentication flow and business dashboard loading.
- Verify log stream shows zero recurring 5xx errors or unhandled database exceptions.

## 10. Forbidden Actions
- NEVER perform uncoordinated database rollbacks without checking schema down-migration compatibility.
- NEVER delete production database branches during an active incident.
- NEVER expose customer data or connection credentials in incident logs or communications.
