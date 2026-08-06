# WattWise AI — Production URL Correction Report

## Executive Summary

Per Product Owner Immediate Production URL Correction Directive, the canonical Production URL for WattWise AI has been corrected to:

```text
https://wattwise-ai-hazel.vercel.app
```

The previously referenced domain (`https://wattwise-ai.vercel.app`) was confirmed to be an external domain not owned by the WattWise AI Vercel project (resolving to an unrelated Italian photovoltaic calculator). No runtime application code defects or database failures occurred.

---

## 1. Incident Root Cause Analysis

- **Confirmed Root Cause**: `WRONG PUBLIC URL / DOMAIN ASSUMPTION`
- **Runtime Code Defect**: `NO`
- **Database Failure**: `NO`
- **External Domain Status**: `https://wattwise-ai.vercel.app` -> `UNRELATED EXTERNAL APPLICATION — DO NOT USE`
- **Correct Active Production URL**: `https://wattwise-ai-hazel.vercel.app`

---

## 2. Vercel Environment Configuration Update

The Production environment variables in Vercel project `clara3/wattwise-ai` were updated as follows:

```text
BETTER_AUTH_URL = https://wattwise-ai-hazel.vercel.app
NEXT_PUBLIC_APP_URL = https://wattwise-ai-hazel.vercel.app
```

Secrets (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`) and non-Production scopes (Preview/Development) remained untouched and unexposed.

---

## 3. Production Deployment & Verification

A fresh Production deployment was compiled and promoted via Vercel CLI:
- **Deployment ID**: `dpl_GNCrF7J1v4pDhRSDLryQVzjYY7qJ`
- **Canonical Production Alias**: `https://wattwise-ai-hazel.vercel.app`
- **Build Status**: `READY`

### Health Endpoints
- `GET /api/health/live` -> **HTTP 200** (`status: "live"`)
- `GET /api/health/ready` -> **HTTP 200** (`status: "ready"`, `database: "ok"`)

### Identity & Wording Verification
- **Visible Application**: WattWise AI
- **Language**: Indonesian
- **Product Scope**: UMKM electricity-cost decision support (Kos Knowledge Pack V1)
- **WattWise Italia**: ABSENT

---

## 4. Synthetic Authentication Verification

Using synthetic user `qa-verification-20260806@example.invalid`:
- **Registration**: `PASS`
- **Login**: `PASS`
- **Dashboard Access**: `PASS`
- **Logout**: `PASS`
- **Unauthorized API (401)**: `PASS`
- **Callback/Origin Validation**: `PASS`

---

## 5. Production Database & Data Cleanup

- **Synthetic User Purge**: `qa-verification-20260806@example.invalid` and associated records purged cleanly from production Neon PostgreSQL.
- **Production Customer Record Count**: **0 customer records** (Clean Main DB)
- **Production Table Count**: **14 tables**

---

## 6. Tracked Secret & Documentation Audit

- **Tracked Documentation References**: Active task and reports updated to `https://wattwise-ai-hazel.vercel.app`.
- **Historical Reports**: Marked with warning notices (`SUPERSEDED — DOMAIN NOT OWNED BY WATTWISE AI PROJECT`).
- **Tracked Secret Audit**: `PASS` (0 secrets in tracked repository files).

---

## Final Verdict

```text
WATTWISE AI PRODUCTION URL CORRECTED
— AUTHENTICATION VERIFIED
— PRODUCT OWNER REVIEW REQUIRED
```
