# WattWise AI — Repository Source-of-Truth & Structure Audit Report

- **Audit Date**: 2026-09-11
- **Branch**: `docs/repository-source-of-truth-alignment`
- **Base Commit SHA**: `16f043ed8a25e8fe6c6f800d12ea1c35ab31edf4`
- **Audit Target**: Repository Structure, Documentation Hierarchy, and Application Role Alignment

---

## 1. Actual Main Commit SHA

The exact `main` branch commit prior to this alignment task is:

```text
16f043ed8a25e8fe6c6f800d12ea1c35ab31edf4
```

Verification command: `git rev-parse HEAD` & `git rev-parse origin/main`.
Status: Clean working tree, perfectly synchronized with remote `origin/main`.

---

## 2. PRD Path & Status

- **Path**: [`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](../PRD/WattWise_PRD_Current_Validation_Stage.md)
- **Status**: **Active — Competition & Pilot Validation**
- **Authority**: The single authoritative Level 1 source of truth for current product scope, core intelligence loops, target personas, validation targets, and non-goals.

---

## 3. Current Product Stage

- **Product Stage**: **Ideation–Pre-Seed / Working MVP**
- **Validation Focus**: **Competition & Pilot Validation** (specifically prepared for jury demonstrations and pilot cohort validation with small property operators and energy-intensive SMEs).
- **Non-Goals**: Not a mature commercial SaaS, not an enterprise utility management platform, and not an automated energy auditor.

---

## 4. Verified Active Application

- **Path**: `wattwise-vercel/`
- **Role**: `ACTIVE_PRODUCT`
- **Runtime Evidence**:
  - Full Next.js 16 App Router application with React 19 and strict TypeScript.
  - Active PostgreSQL database schema with 20 application tables managed via Drizzle ORM (migrations `0000`–`0011`).
  - Active Better Auth implementation with HttpOnly cookie sessions and multi-tenant security.
  - Client-side embedded ONNX Runtime Web (`onnxruntime-web: ^1.21.0`) running the champion N-BEATS forecasting model (`public/models/nbeats-ai02-1.0.0.onnx`).
  - Browser-local OCR meter reading with Tesseract.js (`tesseract.js: ^7.0.0`).
  - Active test suite with 285 passing unit tests and comprehensive integration tests.

---

## 5. Verified Reference Implementation

- **Path**: `wattwise-laravel/`
- **Role**: `REFERENCE_IMPLEMENTATION`
- **Status**: Read-only reference; offline / historical staging.
- **Evidence**: The Laravel implementation is retained as a non-authoritative reference for historical business rules, tenancy behavior, and feature-parity comparison. Current product behavior must be verified against the active Next.js implementation and current PRD.
- **Policy**: No new features are to be developed in `wattwise-laravel/`.

---

## 6. Current Production Platform

- **Platform**: Vercel Serverless
- **Canonical URL**: `https://start-up-repo.vercel.app`
- **Deployment Status**: Active production deployment (`dpl_Cs1hd9oLQPDjiAC2yz833QddLCZV`) with passing health probes (`/api/health/live`, `/api/health/ready`, `/api/health/release`).

---

## 7. Current Database Technology

- **Database Engine**: Neon Serverless PostgreSQL 17.x (AWS `aws-ap-southeast-1` Singapore region).
- **ORM / Migrations**: Drizzle ORM (`drizzle-orm: 0.45.2`), with migration tracking table `__drizzle_migrations` and 20 application tables across 7 domain modules (tracked under `wattwise-vercel/src/server/db/schema/`).
- **Historical Table-Count Note**: Earlier milestone reports (IT-DIAG-00 through IT-DIAG-11) cited 14 tables as of migration `0007`. Migrations `0008` and `0009` subsequently added 6 tables (`revenue_entry`, `appliance`, `user_preference`, `billing_plan`, `sandbox_invoice`, `sandbox_payment`), bringing the verified active count to exactly 20 application tables.

---

## 8. Current Authentication Technology

- **Auth Framework**: Better Auth (`better-auth: 1.6.26`).
- **Security Posture**: Server-side session tokens in HttpOnly, SameSite cookies. Exact trusted origin validation on canonical Vercel deployment URLs.
- **Special Flow**: Jury demo auto-provisioning card on `/login` (`JURY-DEMO-03`) providing instant, sandboxed evaluation accounts for competition reviewers.

---

## 9. Role of ML Directories

- **`ml/benchmark/`** (`ML_RESEARCH`): Offline benchmark suite normalizing UCI ElectricityLoadDiagrams and Building Data Genome Project 2 (BDG2) datasets. Evaluates PyTorch Forecasting models (N-BEATS, DeepAR). Operates strictly offline.
- **`ml/onnx-feasibility/`** (`ML_RESEARCH`): Conversion scripts, numerical parity validators, and test contracts proving mathematical equivalence between PyTorch models and exported ONNX binaries.
- **`wattwise-ml/`** (`ML_RESEARCH`): Experimental data schema packages and offline research helpers.
- **Runtime Inference Boundary**: Production inference is embedded inside `wattwise-vercel/` via ONNX Runtime Web (N-BEATS for $\ge 6$ contiguous months) with deterministic fallback (Weighted Moving Average) for $< 6$ months.

---

## 10. Role of Infrastructure & Tooling Directories

- **`infra/vercel-ml/`** (`INFRASTRUCTURE`): Python serving scripts and Vercel function configuration for preview ML deployment testing (`wattwise-ml-preview`).
- **`tools/ux-ui-agent-skills/`** (`DEVELOPER_TOOLING`): Advisory design systems, WCAG accessibility rules, and token guidance.
- **`.agents/`** (`DEVELOPER_TOOLING`): Repo-local agent skills and configuration rules.

---

## 11. Conflicting Stale Documentation Found

The following conflicting claims were identified during this audit:

| Location | Stale Claim | Verified Actual State | Resolution |
| :--- | :--- | :--- | :--- |
| `README.md` (root) | Claimed `wattwise-laravel/` is the active product and Railway is the active deployment. | `wattwise-vercel/` is the active production product on Vercel; Laravel is a reference implementation. | Root `README.md` completely rewritten to establish `wattwise-vercel/` as the single active product. |
| `docs/architecture/IT-ARCH-01_active-root.md` | Claimed the active branch contains only one deployable product: `wattwise-laravel/` and root files are retired. | `wattwise-laravel/` was active during IT-ARCH-01, but was later succeeded by `wattwise-vercel/` (IT-DIAG-00 through IT-DIAG-11). | Prepend prominent historical warning notice indicating that IT-ARCH-01 is superseded by `CURRENT_APPLICATION_ARCHITECTURE.md`. |
| `docs/MVP_DEMO.md` | References Railway staging URL (`start-up-repo-staging.up.railway.app`) and Laravel Fortify. | Represents the earlier Laravel staging demo flow. | Classified as Level 3/4 historical staging demo guide; Vercel production is documented in `CURRENT_APPLICATION_ARCHITECTURE.md`. |
| `docs/reports/WATTWISE_AI_IT_DIAG_10B_2_PUBLIC_CUTOVER_REPORT.md` | References legacy domain `wattwise-ai.vercel.app` (which was superseded by `start-up-repo.vercel.app` in later URL correction). | Superseded by `WATTWISE_PROD_STAB_01_FINAL_PRODUCTION_STABILITY_REPORT.md` and `PRODUCTION_URL_CORRECTION_REPORT.md`. | Classified as historical Level 4 milestone report. |

---

## 12. Files Corrected & Created

1. **`README.md`** (*Modified*): Rewritten as the authoritative entry point specifying active stack, reference role, repository map, PRD authority, and development guardrails.
2. **`docs/architecture/IT-ARCH-01_active-root.md`** (*Modified*): Added historical superseded notice pointing to `CURRENT_APPLICATION_ARCHITECTURE.md`.
3. **`docs/architecture/CURRENT_APPLICATION_ARCHITECTURE.md`** (*Created*): Authoritative architectural contract for the active Next.js/Neon/Vercel stack and ML boundary.
4. **`docs/architecture/REPOSITORY_ROLE_MAP.md`** (*Created*): Official classification table for all top-level repository directories.
5. **`docs/README.md`** (*Created*): Documentation index and 4-level authority hierarchy.
6. **`docs/reports/WATTWISE_REPOSITORY_SOURCE_OF_TRUTH_AUDIT.md`** (*Created*): This comprehensive audit document.

---

## 13. PRD / Runtime Consistency Analysis

### CONFIRMED ALIGNMENT
- **Pro Pilot Price**: Rp49.000/month (matches PRD Section 8.4; migration `0011_pilot_pricing_consistency.sql`).
- **Business Pilot Price**: Rp149.000/month (matches PRD Section 8.5; migration `0011_pilot_pricing_consistency.sql`).
- **Trial Duration**: 30 days (matches PRD Section 8.3; `plan.service.ts`).
- **Forecasting Eligibility & Bounds**: Deterministic baseline fallback for historical records < 6 contiguous months; embedded N-BEATS active only when $\ge 6$ contiguous months of valid kWh data exist (matches PRD Section 6.3).
- **Application Logic Separation**: Prediction engine yields next-period kWh only; currency translation, anomaly checks, and recommendations are handled by application logic (matches PRD Section 6.3).

### CONFIRMED MISMATCH
- **Business Location Entitlement (`PRD_RUNTIME_MISMATCH`)**:
  - *Current Runtime*: `entitlement.service.ts` allows 50 businesses (`maxBusinesses: 50`).
  - *Current PRD*: Section 8.5 specifies an initial pilot validation hypothesis focused around approximately maximum 5 included locations (+Rp25.000/location/month additional location hypothesis).
  - *Status*: Material difference between validation hypothesis packaging (~5 locations) and runtime capacity (50 locations). Requires Product Owner review.

### PRODUCT OWNER DECISION REQUIRED
- **Pro Location Entitlement (`PRD_RUNTIME_REVIEW_REQUIRED`)**:
  - *Current Runtime*: `entitlement.service.ts` allows 10 businesses (`maxBusinesses: 10`).
  - *Current PRD*: Section 8.4 defines pilot pricing (Rp49.000/month) and commercial validation goals (willingness to pay, recurring value), but does **not** explicitly define a numeric included-location limit.
  - *Status*: Runtime 10 locations cannot be classified as "aligned" or "misaligned" against an explicit numeric PRD limit because none exists in the PRD. Requires Product Owner clarification.

---

## 14. Items Intentionally NOT Changed

To maintain product integrity and comply with strict task guardrails:
- Zero runtime application code was modified in `wattwise-vercel/src/`.
- Zero database schemas, migrations, or database records were modified.
- Zero pricing or entitlement service files were modified.
- Zero ML models were retrained, re-exported, or altered.
- Zero historical reports or archived documentation were deleted.
- Zero Git history was rewritten or rebased.
- Production hosting configuration on Vercel was untouched.

---

## 15. Final Repository Authority Hierarchy

```text
LEVEL 1: docs/PRD/WattWise_PRD_Current_Validation_Stage.md
    ↓
LEVEL 2: docs/architecture/CURRENT_APPLICATION_ARCHITECTURE.md
         docs/architecture/REPOSITORY_ROLE_MAP.md
         docs/reports/WATTWISE_PROD_STAB_01_FINAL_PRODUCTION_STABILITY_REPORT.md
    ↓
LEVEL 3: docs/reports/WATTWISE_AI_RELEASE_READINESS_CHECKLIST.md
         docs/reports/* (Task verification reports)
         docs/runbooks/* (Operational runbooks)
         docs/launch/* (Launch checklists)
         docs/MVP_DEMO.md (Jury demo guide)
    ↓
LEVEL 4: docs/architecture/IT-ARCH-01_active-root.md (Historical contract)
         docs/archive/* (Retired task prompts)
         docs/rewrite/* (Past Laravel specifications)
```

---

## 16. PRD / Runtime Mismatches Requiring Product Owner Decision

The following verified items require Product Owner review and explicit decision:

1. **Location Entitlement Options (Pro & Business)**:
   - *Pro Situation*: The PRD does not define an explicit numeric location cap for Pro. Runtime allows 10 businesses.
   - *Business Situation*: PRD validation hypothesis is approximately maximum 5 included locations. Runtime allows 50 businesses.
   - *Product Owner Decision Required*:
     - **Option A**: Explicitly define the intended Pro location entitlement for the validation stage (e.g., whether 1 location was intended, or if multi-property testing is permitted on Pro).
     - **Option B**: Decide whether Business runtime should remain 50 for technical capacity while commercial packaging exposes approximately 5 included locations.
     - **Option C**: Align runtime entitlements with pilot packaging in a separate, explicitly approved task.
   *(Note: No entitlement code was altered in this documentation task).*

2. **Standalone ML Function (`infra/vercel-ml`) vs Browser-Embedded ONNX**:
   - *Current Runtime*: The primary user-facing forecasting path in `wattwise-vercel` uses browser-embedded ONNX (`onnxruntime-web`).
   - *Infrastructure*: `infra/vercel-ml/` provides a Python-based serverless preview function.
   - *Recommendation*: Retain `infra/vercel-ml/` as preview/benchmarking support; formalize browser-embedded ONNX as the sole production forecasting runtime.
