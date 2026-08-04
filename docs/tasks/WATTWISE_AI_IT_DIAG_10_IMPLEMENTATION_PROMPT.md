# Active Task Prompt — IT-DIAG-10

```text
IT-DIAG-10 — Production Readiness, Release Candidate, and Controlled Go-Live
```

Active Authorized Stage:

```text
IT-DIAG-10A — Production Readiness and Go-Live Decision Package ONLY
```

Locked Stage:

```text
IT-DIAG-10B — Controlled Production Go-Live (LOCKED)
```

Target Branch: `feature/it-diag-10-production-readiness`  
Accepted Previous Base: `8756b8c18eeb5c496cc8aecc343797d6e79c6d2e`  

---

## Authorization & Guidelines
- Execute IT-DIAG-10A ONLY.
- Do NOT provision Production Vercel or Neon resources during IT-DIAG-10A.
- Do NOT perform production deployments, DNS changes, or PR merges.
- Create 5 production runbooks in `docs/runbooks/`.
- Create `docs/reports/WATTWISE_AI_IT_DIAG_10_GO_LIVE_DECISION_PACKAGE.md`.
- Create `docs/reports/WATTWISE_AI_IT_DIAG_10A_FINAL_VERIFICATION_REPORT.md`.
- Store sanitized evidence in `docs/evidence/it-diag-10/`.
