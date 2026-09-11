# WattWise AI — Current Application Architecture

## 1. Active Product Application

- **Path**: `wattwise-vercel/`
- **Application Role**: `ACTIVE_PRODUCT`
- **Current Runtime Status**: Production-deployed and actively maintained.
- **Description**: The primary SaaS platform delivering the core loop (`DATA -> UNDERSTAND -> PREDICT -> DECIDE -> ACT -> MEASURE`) to Indonesian small property operators and energy-intensive SMEs.

## 2. Reference Implementation

- **Path**: `wattwise-laravel/`
- **Application Role**: `REFERENCE_IMPLEMENTATION`
- **Current Runtime Status**: Read-only reference; offline / historical staging.
- **Description**: The Laravel implementation is retained as a non-authoritative reference for historical business rules, tenancy behavior, and feature-parity comparison. Current product behavior must be verified against the active Next.js implementation and current PRD.
- **Policy**: Contributors and AI coding agents must **not** add new features to `wattwise-laravel/` unless specifically assigned reference-parity tasks.

## 3. Production Deployment Platform

- **Provider**: Vercel Serverless
- **Canonical URL**: `https://start-up-repo.vercel.app`
- **Region**: Singapore (`sin1`)
- **Node.js Engine**: 24.x (`engines: { "node": "24.x" }`)
- **Health Probes**:
  - `/api/health/live`: In-memory process liveness probe (`200 OK`)
  - `/api/health/ready`: Database connectivity and schema compatibility check (`200 OK`, `database: "ok"`, `schemaCompatible: true`)
  - `/api/health/release`: Safe runtime release identity exposing deployment environment and commit SHA

## 4. Active Database Engine & Schema Governance

- **Provider**: Neon Serverless PostgreSQL
- **Database Resource**: `wattwise-ai-db`
- **PostgreSQL Version**: 17.x (hosted in AWS `aws-ap-southeast-1` Singapore)
- **ORM / Query Layer**: Drizzle ORM (`drizzle-orm: 0.45.2`, `pg: 8.22.0`)
- **Migration Status**: Drizzle SQL migrations `0000` through `0011` applied and verified.
- **Current Application Tables (20 tables)**:
  Current application schema contains 20 application tables (managed by Drizzle migrations through `0011`; tracked under `wattwise-vercel/src/server/db/schema/`):
  - Auth: `user`, `session`, `account`, `verification` (4 tables)
  - Journey & Workspace: `business`, `user_plan`, `user_preference` (3 tables)
  - Metering, Billing & Appliances: `electricity_bill`, `revenue_entry`, `appliance` (3 tables)
  - Diagnostics: `diagnostic_session`, `diagnostic_answer`, `diagnostic_candidate` (3 tables)
  - Action Plans & Inspections: `inspection_plan`, `inspection_item`, `energy_action_plan` (3 tables)
  - Outcomes: `action_outcome_evaluation` (1 table)
  - Commercial & Sandbox: `billing_plan`, `sandbox_invoice`, `sandbox_payment` (3 tables)
  *(Internal Drizzle migration tracking metadata is maintained separately in `__drizzle_migrations`)*

## 5. Authentication & Session Architecture

- **Auth Framework**: Better Auth (`better-auth: 1.6.26`)
- **Session Mechanism**: Secure HttpOnly, SameSite cookies with server-side database session validation
- **Tenant Isolation**: Multi-business ownership strictly checked server-side per active business cookie (`wattwise_active_business_id`) and user ID
- **Jury & Demo Access**: Secure on-demand demo account provisioning via `/login` (`JURY-DEMO-03`) with sandboxed access

## 6. Frontend & Runtime Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 (`react: 19.2.4`, `react-dom: 19.2.4`)
- **Type System**: Strict TypeScript (`typescript: ^5`, `strict: true`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`)
- **Icons**: Lucide React (`lucide-react: ^0.468.0`)
- **Motion System**: GSAP 3.15 (`gsap`, `@gsap/react`), enforcing `prefers-reduced-motion` compliance
- **Input Parsing**: Browser-local OCR using Tesseract.js (`tesseract.js: ^7.0.0`) with local worker processing (meter images are not transferred to external servers)

## 7. AI / Forecasting Boundary

The WattWise forecasting architecture strictly follows PRD Section 6.3 and Section 18:

### Runtime Prediction Rules
1. **Deterministic Baseline Fallback**: When historical contiguous monthly electricity records are fewer than 6 months, the application uses an explainable deterministic baseline combining Weighted Moving Average (WMA) and linear trend extrapolation.
2. **Embedded N-BEATS Inference**: When $\ge$ 6 valid, contiguous monthly kWh records exist, client-side inference is executed directly in the browser using ONNX Runtime Web (`onnxruntime-web: ^1.21.0`) loading the validated champion model (`public/models/nbeats-ai02-1.0.0.onnx`).
3. **Application Logic Separation**: N-BEATS predicts next-period **kWh only**. All Rupiah conversions, percentage variances, anomaly classifications, and recommendation mappings are calculated by transparent, deterministic application business logic.
4. **Research vs Production Boundary**:
   - `ml/benchmark/`: Offline training, historical benchmark experiments (UCI + BDG2 datasets), and model evaluation using PyTorch Forecasting. Offline research models (LSTM, DeepAR, Gradient Boosting) are **not** deployed to the runtime application.
   - `ml/onnx-feasibility/`: Mathematical parity verification scripts and test contracts proving exact numerical equivalence between PyTorch models and ONNX exports.
   - `infra/vercel-ml/`: Isolated preview Python ML serving infrastructure for standalone testing; not part of the primary user-facing production bundle.

## 8. Documentation Authority Hierarchy

1. **LEVEL 1 — CURRENT PRODUCT AUTHORITY**:
   - [`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](../PRD/WattWise_PRD_Current_Validation_Stage.md) (authoritative for product scope, user personas, validation targets, and non-goals)
2. **LEVEL 2 — CURRENT ARCHITECTURE & PRODUCTION TRUTH**:
   - `docs/architecture/CURRENT_APPLICATION_ARCHITECTURE.md` (this document)
   - `docs/architecture/REPOSITORY_ROLE_MAP.md`
   - `docs/reports/WATTWISE_PROD_STAB_01_FINAL_PRODUCTION_STABILITY_REPORT.md` (latest verified production stability report describing current runtime)
3. **LEVEL 3 — IMPLEMENTATION, QA & RELEASE EVIDENCE**:
   - Release readiness checklists (`docs/reports/WATTWISE_AI_RELEASE_READINESS_CHECKLIST.md`)
   - Task verification reports in `docs/reports/` (e.g. IT-DIAG milestone reports)
   - Operational runbooks in `docs/runbooks/`
   - Demonstration guide [`docs/MVP_DEMO.md`](../MVP_DEMO.md)
4. **LEVEL 4 — HISTORICAL / SUPERSEDED RECORDS**:
   - `docs/architecture/IT-ARCH-01_active-root.md` (earlier Railway/Laravel contract)
   - Archived prompts in `docs/archive/`
   - Historical rewrite specifications in `docs/rewrite/`

## 9. Historical Systems & Environments

- **Railway Deployment**: The Laravel implementation was previously deployed to Railway (`https://start-up-repo-staging.up.railway.app`). Railway configuration files (`railway.json`) and runbooks are preserved for reference and do not control active production.
- **Git Preservation**: Historical commits, previous rewrite milestones, and earlier test harnesses are intentionally preserved in Git history and must not be purged or rewritten.

## 10. Scope Guardrails

- **No Premature Architecture Churn**: Framework migrations or database shifts must not be initiated without explicit Product Owner approval.
- **No Overclaiming**: Safe wording must be used everywhere. Diagnostics identify candidates to inspect, not guaranteed root causes.
- **No Unapproved Modules**: Do not introduce IoT hardware requirements, AI chatbots, accounting/POS tools, or enterprise RBAC systems.
