# Incident Response Runbook — WattWise AI

## 1. Scope
This runbook governs the detection, triage, escalation, containment, and resolution of production incidents affecting WattWise AI services, databases, authentication, or entitlements.

## 2. Capability & Target Classifications
- **Manual Log Triage via Correlation-ID**: `verified capability` (Verified via `X-Correlation-Id` structured logger)
- **Automated Metric Alerting**: `proposed target` (Requires paid observability subscription) — Product Owner Decision Required
- **Target Incident Response Time**: `proposed target` (< 15 minutes for SEV-1) — Product Owner Decision Required

## 3. Prerequisites
- Access to Vercel deployment logs and runtime function metrics.
- Access to Neon database metrics and query analytics.
- Access to structured application logs filtered by `X-Correlation-Id`.

## 4. Severity Classification Matrix
| Severity | Description | Target Response Time | Escalation Trigger |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Complete service outage, data corruption, or active security breach | < 15 minutes (Proposed Target) | Immediate Product Owner notification |
| **SEV-2 (High)** | Major feature failure (e.g., login down, bill calculations failing) | < 30 minutes (Proposed Target) | Operations Lead notification |
| **SEV-3 (Moderate)** | Non-blocking feature issue or intermittent performance degradation | < 2 hours (Proposed Target) | Next business day triage |
| **SEV-4 (Low)** | Minor cosmetic or documentation defect | < 24 hours (Proposed Target) | Standard backlog item |

## 5. Triage & Diagnostic Commands
```powershell
# 1. Inspect recent Vercel runtime logs for HTTP 5xx errors
npx vercel logs <production-deployment-url> --type error

# 2. Check production health live and ready endpoints
curl -i https://<production-app-url>/api/health/live
curl -i https://<production-app-url>/api/health/ready

# 3. Check database connection pool and readiness via Neon CLI
npx neonctl operations list --project-id <project-id>
```

## 6. Safety Checks
- Verify incident correlation IDs (`req-...`) across Vercel logs and application logs before taking destructive actions.
- Ensure automated recovery actions do not overwrite diagnostic log files.
- Confirm zero user secret or PII exposure in emergency log dumps.

## 7. Evidence Required
- Incident log excerpts containing timestamp, status code, event type, and correlation ID.
- Root Cause Analysis (RCA) document template populated.
- Timeline of events from detection to post-fix verification.

## 8. Stop Conditions
- Inability to isolate failure source within 30 minutes (triggers SEV-1 escalation).
- Unplanned data modification detected during triage (triggers immediate read-only lock).

## 9. Post-Action Verification & Resolution Criteria
- 100% of readiness health checks return `HTTP 200`.
- System error rate drops below 0.01% over a 30-minute window.
- RCA document reviewed and approved by Product Owner.

## 10. Forbidden Actions
- NEVER disable security headers, CSP, or entitlement checks to "work around" an incident.
- NEVER share unredacted production logs containing authorization tokens or user data.
- NEVER perform untested database mutations directly on live production tables.
