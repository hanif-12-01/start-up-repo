# WattWise AI — Documentation Index & Governance

This document establishes the official authority hierarchy, navigation structure, and interpretive rules for all documentation within the `docs/` tree.

---

## 1. Documentation Authority Hierarchy

When evaluating product requirements, architectural contracts, or operational guidance, apply the following order of precedence:

```text
LEVEL 1: Current Product Authority (PRD)
    ↓
LEVEL 2: Current Architecture & Operational Contracts
    ↓
LEVEL 3: Implementation, QA & Launch Reports
    ↓
LEVEL 4: Historical, Archived & Superseded Records
```

### LEVEL 1 — CURRENT PRODUCT AUTHORITY
*Governs all product scope, target user definitions, pilot commercial boundaries, core intelligence loop steps, safe wording, and non-goals.*

- [`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](PRD/WattWise_PRD_Current_Validation_Stage.md): **The single product source of truth** for the current Ideation–Pre-Seed / Working MVP stage.

### LEVEL 2 — CURRENT ARCHITECTURE & PRODUCTION TRUTH
*Governs system boundaries, active stacks, deployment configurations, database schemas, and release readiness.*

- [`docs/architecture/CURRENT_APPLICATION_ARCHITECTURE.md`](architecture/CURRENT_APPLICATION_ARCHITECTURE.md): Active Next.js runtime, Neon PostgreSQL, Better Auth, and browser-embedded ONNX forecasting contract.
- [`docs/architecture/REPOSITORY_ROLE_MAP.md`](architecture/REPOSITORY_ROLE_MAP.md): Official role classification for all top-level repository directories.
- [`docs/reports/WATTWISE_PROD_STAB_01_FINAL_PRODUCTION_STABILITY_REPORT.md`](reports/WATTWISE_PROD_STAB_01_FINAL_PRODUCTION_STABILITY_REPORT.md): Latest verified production stabilization, database schema verification, and Vercel release status.

### LEVEL 3 — IMPLEMENTATION, QA & RELEASE EVIDENCE
*Specific task verification, testing evidence, runbooks, pre-release checklists, and demonstration scripts.*

- [`docs/reports/WATTWISE_AI_RELEASE_READINESS_CHECKLIST.md`](reports/WATTWISE_AI_RELEASE_READINESS_CHECKLIST.md): Local and pre-release engineering checklist and environment contracts.
- [`docs/MVP_DEMO.md`](MVP_DEMO.md): Self-service demonstration narrative for competition judges and beta testers.
- [`docs/runbooks/`](runbooks/): Operational procedures (incident response, database backup/restore, secret rotation).
- [`docs/launch/`](launch/): Staging deployment plans, smoke test scenarios, and manual QA checklists.
- [`docs/reports/`](reports/): Verified milestone completion reports (IT-DIAG-04 through IT-DIAG-11).

### LEVEL 4 — HISTORICAL, ARCHIVED & SUPERSEDED RECORDS
*Retained strictly as immutable historical evidence of earlier milestones, previous architectures, and retired platforms.*

- [`docs/architecture/IT-ARCH-01_active-root.md`](architecture/IT-ARCH-01_active-root.md): Historical contract from the earlier Laravel/Railway staging era (superseded by `CURRENT_APPLICATION_ARCHITECTURE.md`).
- [`docs/reports/WATTWISE_AI_IT_DIAG_10B_2_PUBLIC_CUTOVER_REPORT.md`](reports/WATTWISE_AI_IT_DIAG_10B_2_PUBLIC_CUTOVER_REPORT.md): Earlier cutover report with legacy URL references.
- [`docs/archive/`](archive/): Completed task implementation prompts and earlier milestone iterations.
- [`docs/rewrite/`](rewrite/): Historical specifications for the previous Laravel rewrite cycle.

---

## 2. Core Rule of Interpretation

> [!IMPORTANT]
> **Historical documents are evidence of what was true at their respective development stages.**
> They provide provenance, forensic context, and rollback history. They do **not** override the current Level 1 PRD or the Level 2 active architecture.
>
> If an older document describes `wattwise-laravel/` as active or references Railway as current production, that statement is historical evidence of an earlier milestone. The active product is `wattwise-vercel/` deployed on Vercel with Neon PostgreSQL.

---

## 3. Directory Guide

| Directory | Content Type | Status |
| :--- | :--- | :--- |
| `docs/PRD/` | Product Requirements Document | **Authoritative (Level 1)** |
| `docs/architecture/` | System architecture, contracts, and role maps | **Authoritative (Level 2) & Historical** |
| `docs/reports/` | Quality gate verification and stabilization reports | **Authoritative (Level 3) & Historical** |
| `docs/runbooks/` | DevOps, backup, and incident response procedures | **Operational (Level 3)** |
| `docs/launch/` | Pre-launch checklists and staging plans | **Operational (Level 3)** |
| `docs/ml/` | Offline ML benchmark reports, dataset catalogs, and qualification gates | **Research (Level 3)** |
| `docs/product/` | Historical product checklists and feature maps | **Reference (Level 3/4)** |
| `docs/validation/` | User interview scripts, scorecards, and pilot templates | **Operational (Level 3)** |
| `docs/archive/` | Retired milestone tasks and implementation prompts | **Historical (Level 4)** |
| `docs/rewrite/` | Earlier Laravel rewrite weekly specifications | **Historical (Level 4)** |
