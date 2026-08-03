# WattWise AI — Implementation Prompt IT-DIAG-09A

## Local Release Hardening

Keputusan Product Owner:

```text
IT-DIAG-08B — ACCEPTED LOCALLY
IT-DIAG-08B — REMOTE CHECKPOINT VERIFIED
```

Accepted base:

```text
f1296805808d5cfeacf686a6cfc4fa3a6821c9dc
```

Implementasikan tepat satu fase:

```text
IT-DIAG-09A — Local Release Hardening
```

---

## Fokus implementasi

Prioritas:

```text
1. environment-variable contract
2. sanitized .env.example
3. startup configuration validation
4. secret and publication audit
5. production-safe error responses
6. correlation ID dan structured redacted logging
7. security headers
8. /api/health/live
9. /api/health/ready
10. database timeout dan serverless connection review
11. mutation abuse-surface review
12. migration up/down/up rehearsal
13. dependency advisory investigation
14. release-readiness checklist
15. backup dan recovery assumptions
16. full runtime serta browser regression
```

---

## Batas fase

IT-DIAG-09A tetap local-only.

```text
TARGET_BRANCH=feature/it-diag-09a-release-hardening
TARGET_PHASE=IT-DIAG-09A
APPROVED_BASE_COMMIT=f1296805808d5cfeacf686a6cfc4fa3a6821c9dc
```
