# Product Owner Implementation Directive — IT-DIAG-09B

## Controlled Vercel Preview & Neon Rehearsal

Current Status:
IT-DIAG-09B — Controlled Vercel Preview & Neon Rehearsal

Target local branch:
feature/it-diag-09b-preview-neon-rehearsal

Target Base HEAD:
ad98dbd6e57aae59a5faee3da0426cb0c257c48a

Objectives:
- Read-only CLI tool discovery (Vercel CLI, Neon CLI/APIs).
- Setup dedicated preview Vercel project & Neon preview branch.
- Execute Neon migration rehearsal (0000-0007 FIRST UP -> ROLLBACK 0007-0000 -> SECOND UP).
- Seed synthetic test data.
- Deploy Next.js production build to Vercel Preview (non-production).
- Execute full product browser regression against Vercel Preview HTTPS endpoint.
- Verify security headers (HSTS, CSP, X-Content-Type-Options, etc.).
- Generate evidence in docs/evidence/it-diag-09b/.
- Update docs/reports/WATTWISE_AI_IT_DIAG_09B_FINAL_VERIFICATION_REPORT.md.
