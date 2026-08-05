# Production Deployment Runbook — WattWise AI

## 1. Scope
This runbook governs the execution of production application deployments for WattWise AI (Next.js serverless application on Vercel attached to Neon serverless PostgreSQL).

## 2. Capability & Target Classifications
- **Automated Vercel Deployment**: `provider-dependent assumption` (Relies on Vercel CLI / Git integration)
- **Zero-Downtime Application Deployment**: `provider-dependent assumption` (Vercel atomic deployment alias switching)
- **Direct Database Migration Preflight**: `measured rehearsal result` (Rehearsed against Preview Neon database)
- **Target Deployment Time**: `proposed target` (10 minutes) — Product Owner Decision Required

## 3. Prerequisites
- Product Owner explicit go-live authorization (`PRODUCT OWNER GO-LIVE AUTHORIZATION — IT-DIAG-10B`) received.
- Dedicated Production Vercel project provisioned and linked (`wattwise-vercel`).
- Dedicated Production Neon database resource provisioned in `aws-ap-southeast-1`.
- Production environment variables configured and validated via closed pre-flight schema.
- Local quality gates passed cleanly (`npm run test`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run build`).
- Pre-deployment database backup/snapshot created and verified.

## 4. Authorized Operator
- Authorized Release Engineer / Operations Lead with Product Owner approval.

## 5. Commands & UI Workflow
```powershell
# 1. Verify working tree and release commit
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD

# 2. Execute local production build preflight
Set-Location "wattwise-vercel"
npm run build

# 3. Direct database migration step (executed via secure unpooled connection)
node scripts/run-with-postgres.js drizzle-kit migrate

# 4. Trigger production deployment via Vercel CLI
npx vercel --prod
```

## 6. Safety Checks
- Verify database migrations 0000–0007 applied cleanly without schema drift.
- Verify `ssl: true` is enforced on all database connection strings.
- Verify production environment variables contain zero dummy or Preview values.
- Verify health check readiness endpoint `/api/health/ready` returns `HTTP 200` with `database: "ok"`.

## 7. Evidence Required
- Build artifact hash and Turbopack deployment SHA.
- Vercel production deployment inspect log.
- Migration execution log confirming schema version consistency.
- Post-deployment HTTP readiness smoke test results.

## 8. Stop Conditions
- Any migration step failure or schema inconsistency.
- Production environment variable validation failure.
- Next.js build or compilation failure.
- `/api/health/ready` returning non-200 status or database connection failure.

## 9. Rollback & Recovery Path
- Immediate invocation of `docs/runbooks/WATTWISE_AI_PRODUCTION_ROLLBACK_RUNBOOK.md`.
- Vercel deployment alias rollback to previous stable production deployment.
- Database restore from pre-deployment snapshot if schema migration fails.

## 10. Post-Action Verification
- Execute health probes (`/api/health/live`, `/api/health/ready`).
- Verify production security headers (CSP, HSTS, X-Frame-Options).
- Perform synthetic smoke test on login and business dashboard.

## 11. Forbidden Actions
- NEVER deploy to production with uncommitted code or unverified migrations.
- NEVER run `vercel --prod` without explicit Product Owner authorization.
- NEVER expose database connection strings, passwords, or secrets in terminal logs or reports.
- NEVER bypass deployment protection or security controls.
