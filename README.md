# WattWise AI

## Product Stage

Ideation–Pre-Seed / Working MVP
Competition & Pilot Validation

WattWise AI is currently in active competition demonstration and pilot customer validation. It is not an enterprise-scale utility management system or a mature commercial SaaS.

## Product Purpose

WattWise AI is an electricity-cost decision-support platform designed for Indonesian small property operators (boarding houses / kos, rental properties, small shophouses / ruko) and energy-intensive small-and-medium enterprises (laundries, food & beverage outlets, frozen food storage, local photocopy shops, and workshops).

WattWise helps users understand historical electricity consumption, identify changes requiring inspection, forecast next-period electricity costs, plan energy-saving actions, and evaluate subsequent outcomes.

Positioning:
> *"Mulai dari tagihan yang pengguna sudah punya. WattWise membantu menemukan apa yang perlu diperiksa lebih dahulu."*

WattWise is strictly decision-support. It is **not** an official utility application, **not** an official PLN Mobile replacement, **not** a smart-meter hardware platform, and **not** a certified energy auditor.

### Core Product Loop

```text
DATA -> UNDERSTAND -> PREDICT -> DECIDE -> ACT -> MEASURE
```

1. **DATA**: The user records billing history, monthly kWh, and basic business profile context (manually or via browser-local meter OCR).
2. **UNDERSTAND**: The platform tracks month-over-month expenditure, consumption trends, and cost-to-revenue ratios.
3. **PREDICT**: The system generates next-period kWh projections using deterministic baselines or client-side embedded N-BEATS forecasting when contiguous data history is sufficient.
4. **DECIDE**: The system guides users through diagnostic questionnaires to prioritize areas to inspect (diagnostics identify candidates, not confirmed root causes).
5. **ACT**: The user creates structured action plans with realistic, low-friction conservation steps.
6. **MEASURE**: The user compares subsequent bills against pre-action baselines using non-causal outcome evaluations.

## Active Application

The active product implementation is located in:

`wattwise-vercel/`

### Current Active Stack
- **Framework**: Next.js 16 (App Router)
- **UI & Runtime**: React 19, strict TypeScript
- **Styling & Design System**: Tailwind CSS v4
- **Database & ORM**: PostgreSQL (Neon Serverless, Singapore `aws-ap-southeast-1`) via Drizzle ORM (schema migrations 0000–0011)
- **Authentication**: Better Auth (secure session cookies, HttpOnly, SameSite, multi-tenant isolation)
- **Validation**: Zod
- **Testing**: Vitest (unit and integration suites)
- **Motion & Interactions**: GSAP
- **Browser-Embedded AI / Forecasting**: ONNX Runtime Web (`onnxruntime-web`) executing the champion N-BEATS model (`nbeats-ai02-1.0.0.onnx`) directly in the client browser
- **Meter Reading**: Tesseract.js (browser-local OCR processing; images remain on the client)

## Reference Implementation

The reference implementation is located in:

`wattwise-laravel/`

The Laravel implementation is retained as a non-authoritative reference for historical business rules, tenancy behavior, and feature-parity comparison. Current product behavior must be verified against the active Next.js implementation and current PRD.

> **Important**: Do **not** implement new product features in `wattwise-laravel/` unless a task specifically requires reference-parity work.

## Repository Map

| Path | Role | Description |
| :--- | :--- | :--- |
| `wattwise-vercel/` | **ACTIVE_PRODUCT** | Active Next.js application, tests, migrations, and browser inference runtime. |
| `wattwise-laravel/` | **REFERENCE_IMPLEMENTATION** | Laravel/Vue reference codebase for domain logic, parity checks, and historical verification. |
| `docs/` | **PRODUCT_DOCUMENTATION** | Active PRD, architecture contracts, launch runbooks, QA checklists, and historical stage reports. |
| `ml/` | **ML_RESEARCH** | Offline benchmarks (UCI + BDG2), dataset normalization, ONNX conversion scripts, and feasibility proofs. |
| `infra/` | **INFRASTRUCTURE** | Infrastructure configurations, preview Python ML serving templates, and deployment automation. |
| `tools/` & `.agents/` | **DEVELOPER_TOOLING** | Design system knowledge (`ux-ui-agent-skills`), accessibility audit rules, and developer tooling. |

## Product Source of Truth

The authoritative product requirements document for the current stage is:

[`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](docs/PRD/WattWise_PRD_Current_Validation_Stage.md)

This PRD governs all product scope, feature boundaries, target audience assumptions, commercial pilot pricing hypotheses, and validation metrics. If any repository documentation conflicts with this PRD on product scope, the PRD takes precedence.

## Current Deployment

- **Production Platform**: Vercel Serverless (`https://start-up-repo.vercel.app`)
- **Production Database**: Neon Serverless PostgreSQL (`wattwise-ai-db`, PostgreSQL 17.x in Singapore `aws-ap-southeast-1`)
- **Health Probes**:
  - Live check: `GET /api/health/live` (HTTP 200)
  - Ready check: `GET /api/health/ready` (HTTP 200, includes database ping & schema compatibility verification)
  - Release check: `GET /api/health/release` (HTTP 200, includes release commit SHA)
- **Historical Environment**: The earlier Laravel application was hosted on Railway (`start-up-repo-staging.up.railway.app`). Railway context is preserved as historical reference only.

## Development Guardrails

All contributors and AI agents must adhere to the following principles:

1. **Validation Over Feature Count**: Do not add speculative features, integrations, or complex architectures. Build only what is needed to validate user value, habit, and willingness to pay.
2. **Bill-First & Progressive Input**: Never require IoT hardware, complex sub-metering, or intrusive configuration before providing basic value.
3. **Safe Decision Support**: Never claim guaranteed monetary savings, official PLN authority, exact device-level causality, or certified audit results. Use safe terms: *estimasi*, *prediksi*, *indikasi*, *kandidat yang perlu diperiksa*.
4. **Deterministic Fallback**: Always maintain deterministic forecasting (Weighted Moving Average + linear trend) when historical usage data is insufficient (< 6 valid contiguous monthly records).
5. **No AI Overclaim**: N-BEATS predicts next-period kWh only; all currency conversions, risk categorizations, and recommendations remain transparent application logic.
6. **Commercial Pilot Scope**: Current commercial tiers are limited to Free, Pro Trial (30 days), Pro (Rp49.000/month), and Business (Rp149.000/month for multi-location). Enterprise tier is future scope and must not be implemented without explicit Product Owner approval.
7. **No Architectural Rewrites**: Do not rewrite frameworks, database engines, or auth mechanisms simply for aesthetics or perceived modernness.
