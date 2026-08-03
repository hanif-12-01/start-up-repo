# WattWise AI — Release Readiness Checklist

## Status

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW
```

- **Phase**: IT-DIAG-09A (Local Release Hardening)
- **Approved Base**: `f1296805808d5cfeacf686a6cfc4fa3a6821c9dc`
- **Target Branch**: `feature/it-diag-09a-release-hardening`

---

## 1. Runtime Requirements

| Component | Minimum / Expected Version | Status |
|---|---|---|
| Node.js Runtime | `v22.17.0` (compatible with `24.x`) | ✅ VERIFIED |
| npm Package Manager | `10.9.2` | ✅ VERIFIED |
| Database Engine | PostgreSQL `16.x` (Neon PostgreSQL compatible) | ✅ VERIFIED |
| Target Host Platform | Vercel Serverless (Node.js 22 runtime) | ✅ VERIFIED |

---

## 2. Environment Variable Contract

| Variable Name | Exposure | Required in Prod | Description / Validation |
|---|---|---|---|
| `DATABASE_URL` | Server-only secret | **YES** | PostgreSQL connection string with SSL mode (`?sslmode=require`). Validated by `validateProductionEnv`. Never exposed to client bundles. |
| `BETTER_AUTH_SECRET` | Server-only secret | **YES** | Minimum 32-character random string for session signing. Validated by `validateProductionEnv`. |
| `FUNNEL_ANALYTICS_VIEWER_USER_IDS` | Server-only sensitive config | **NO** | Comma-separated user IDs allowed to view funnel analytics. Default `""` (access denied). |
| `BETTER_AUTH_URL` | Server/runtime non-secret | **NO** | App base URL for auth callbacks. Default `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_URL` | Browser-exposed public | **NO** | Public origin for client-side routing. Default `http://localhost:3000`. |
| `NODE_ENV` | Server/build environment | **NO** | `development` \| `test` \| `production`. |
| Feature Flags (`*_ENABLED`) | Server-side flags | **NO** | Boolean flags (`"true"` \| `"false"`). Default `false`. |

---

## 3. Database Migration & Rollback Sequence

### Forward Order (Up)
1. `drizzle/migrations/0000_auth_schema.sql` (Auth & user foundation)
2. `drizzle/migrations/0001_journey_business.sql` (Journey state, plans, business)
3. `drizzle/migrations/0002_bill_first.sql` (Electricity bills)
4. `drizzle/migrations/0003_diagnostic_questionnaire.sql` (Diagnostic sessions & answers)
5. `drizzle/migrations/0004_diagnostic_candidates.sql` (Diagnostic candidate evidence)
6. `drizzle/migrations/0005_guided_inspections.sql` (Inspection plans & items)
7. `drizzle/migrations/0006_energy_action_plans.sql` (Energy action plans)
8. `drizzle/migrations/0007_action_outcome_evaluations.sql` (Outcome evaluations)

### Rollback Order (Down)
1. `drizzle/rollbacks/0007_action_outcome_evaluations_rollback.sql`
2. `drizzle/rollbacks/0006_energy_action_plans_rollback.sql`
3. `drizzle/rollbacks/0005_guided_inspections_rollback.sql`
4. `drizzle/rollbacks/0004_diagnostic_candidates_rollback.sql`
5. `drizzle/rollbacks/0003_diagnostic_questionnaire_rollback.sql`
6. `drizzle/rollbacks/0002_bill_first_rollback.sql`
7. `drizzle/rollbacks/0001_journey_business_rollback.sql`
8. `drizzle/rollbacks/0000_auth_schema_rollback.sql`

Rehearsal Status: **UP -> DOWN -> SECOND UP PASS (14 tables, FKs, Unique, Check, Indexes verified)**.

---

## 4. Health Probes & Monitoring

| Endpoint | Probe Type | Behavior | Expected HTTP Status |
|---|---|---|---|
| `/api/health/live` | Liveness | Fast in-memory check without database I/O | `200 OK` |
| `/api/health/ready` | Readiness | Database `SELECT 1` ping with 3000ms timeout | `200 OK` (Healthy) / `503 Service Unavailable` (DB down) |
| `/api/health/database` | Deep DB Diagnostic | Detailed database status without credential leakage | `200 OK` / `503 Service Unavailable` |
| `/api/health/release` | Release Metadata | Name, target, version, region metadata | `200 OK` |

All health routes enforce `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store, max-age=0`.

---

## 5. Security & Privacy Hardening

- **Security Headers (`next.config.ts`)**:
  - `Content-Security-Policy`: Restrictive baseline (`default-src 'self'`).
  - `X-Frame-Options`: `DENY` (frame-ancestors `'none'`).
  - `X-Content-Type-Options`: `nosniff`.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: Disables camera, microphone, geolocation, payment, USB.
  - `Strict-Transport-Security` (HSTS): Enabled in production (`max-age=63072000; includeSubDomains; preload`).
- **Correlation ID Tracing (`src/proxy.ts` & `src/server/logger.ts`)**:
  - `X-Correlation-Id` validated (max 64 chars, alphanumeric/hyphens) and propagated on every request/response.
- **Redacted Logging (`src/server/logger.ts`)**:
  - Recursive auto-redaction of sensitive keys (`password`, `token`, `authorization`, `cookie`, `database_url`, `secret`, `email`, `phone`, PII, SQL params).
- **Client Bundle Leakage**: Verified zero secret values in `.next/static`.

---

## 6. Abuse Surface & Rate-Limiting Gap Analysis

- **Mutation Abuse Surfaces Audited**:
  - Registration, Login, Business creation, Bill input, Questionnaire answers, Inspection answers, Action plans, Outcome evaluations.
  - All endpoints enforce server-side session authentication, tenant ownership authorization, Zod schema validation, string limits, array bounds, and atomic database transactions.
- **Rate-Limiting Infrastructure Gap**:
  - In-memory rate limiting is unsuitable for serverless multi-instance deployments (Vercel).
  - Durable edge rate limiting (Vercel Firewall / Edge Middleware with Upstash Redis KV) is deferred to preview deployment (IT-DIAG-09B).

---

## 7. Database Connection Policy & Driver Timeouts

| Parameter | Configured Value | Location |
|---|---|---|
| `max` (pool size) | `10` (production) / `5` (dev) | `src/server/db/client.ts` |
| `idleTimeoutMillis` | `30000ms` (30 seconds) | `src/server/db/client.ts` |
| `connectionTimeoutMillis` | `5000ms` (5 seconds) | `src/server/db/client.ts` |
| `READINESS_DB_TIMEOUT_MS` | `3000ms` (3 seconds) | `src/server/services/health.service.ts` |

---

## 8. Backup, Recovery & Disaster Assumptions

- **Neon Point-in-Time Recovery (PITR)**: Managed by Neon cloud platform (automatic daily snapshots & WAL archiving).
- **RPO (Recovery Point Objective)**: Pending Product Owner policy decision (target < 1 hour).
- **RTO (Recovery Time Objective)**: Pending Product Owner policy decision (target < 4 hours).
- **Restore-Test Requirement**: Mandatory staging restore drill required prior to production launch.

---

## 9. Pre-Deployment Checklists

### Preview Checklist
- [ ] Deploy branch to Vercel Preview environment.
- [ ] Configure `DATABASE_URL` pointing to Neon Preview branch DB.
- [ ] Configure `BETTER_AUTH_SECRET` (≥32 chars).
- [ ] Verify `/api/health/live` returns 200 OK.
- [ ] Verify `/api/health/ready` returns 200 OK.
- [ ] Execute smoke test suite against preview URL.

### Production Checklist
- [ ] Verify PO acceptance of IT-DIAG-09A & IT-DIAG-09B.
- [ ] Configure Neon Production database with connection pooling enabled.
- [ ] Set production environment variables in Vercel project settings.
- [ ] Run forward migrations `0000`–`0007` on production database.
- [ ] Verify security headers and HTTPS certificate.
- [ ] Conduct final verification check.

---

## 10. Go / No-Go Criteria & Rollback Triggers

- **Go Criteria**: All quality gates PASS, PO approval granted, migration rehearsal clean, zero critical advisories, health probes healthy.
- **No-Go Triggers**:
  1. Failed health readiness probe on deployment.
  2. Database migration error during pre-release execution.
  3. Unhandled 500 error spikes on core product journeys.
  4. Secret leakage detected in production logs or bundles.
- **Rollback Execution**: Perform Git rollback to accepted base `f1296805808d5cfeacf686a6cfc4fa3a6821c9dc` and apply rollback SQL scripts `0007` down to `0000`.

---

## 11. Known Blockers

```text
NONE — READY FOR PO REVIEW
```
