# WattWise AI — QA Demo Account Provisioning Runbook

## 1. Overview & Purpose

This runbook documents the **WattWise QA Demo Account Provisioning System** (`IT-QC-DEMO-01`).

The QA Demo Account provides a deterministic, safe, pre-populated synthetic dataset designed to make manual UI/UX acceptance testing, product demonstrations, and regression testing fast and repeatable.

---

## 2. Strict Environment Safety Rules

- **Production Refusal**: The demo provisioning system **refuses to run** in actual Production (`VERCEL_ENV=production` or `NODE_ENV=production`).
- **No Unconditional Overrides**: Setting override flags while target is a Production database will be unconditionally rejected.
- **Supported Environments**: `development`, `test`, `preview`, `staging`.
- **No Public API / Build Triggers**: Provisioning is NOT exposed as an unauthenticated HTTP API and NEVER executes automatically during `next build` or server startup.

---

## 3. Required Environment Variables

To provision or reset the QA Demo Account, configure the following environment variables:

| Variable | Requirement | Description |
| :--- | :--- | :--- |
| `QA_DEMO_EMAIL` | Optional | Email address for the QA Demo account. Defaults to `qa-demo@wattwise.test` if omitted. |
| `QA_DEMO_PASSWORD` | Required when seeding | Strong test password (minimum 8 characters). **DO NOT COMMIT TO GIT.** |
| `QA_DEMO_ENABLED` | Optional | Explicit opt-in flag required when provisioning in Vercel Preview environments. |

---

## 4. CLI Commands

### A. Provision / Repair Demo Account
```bash
npm run qa:demo:seed
```
- Creates or repairs the QA Demo account, subscription plan (`PRO_TRIAL`), primary business (`Kos Melati Demo`), 18 consecutive months of electricity bills and revenue history, realistic appliances, and diagnostic fixtures.
- **Idempotent**: Safe to execute repeatedly. Concurrency-safe via PostgreSQL transaction advisory lock (`pg_advisory_xact_lock`).

### B. Reset Demo Account
```bash
npm run qa:demo:reset
```
- Restores the QA Demo account to its initial deterministic baseline state.
- Operates **strictly** on the matched `QA_DEMO_EMAIL` user domain records. Other database users remain untouched.

### C. Check Demo Readiness
```bash
npm run qa:demo:check
```
- Inspects database readiness without mutating state.
- Verifies account existence, Better Auth credentials, business status, 18-month bill/revenue history, appliance profile, referenced vs unreferenced bill availability, and authoritative anomaly state.

---

## 5. Synthetic Dataset Composition

The provisioned demo business (**Kos Melati Demo**, segment `KOS`, 20 rooms, 16 occupied) contains:

1. **18 Consecutive Months Electricity Bills**:
   - **Months 1–12**: Baseline usage (~460–500 kWh/month).
   - **Months 13–16**: Modest growth (~520–570 kWh/month).
   - **Month 17**: Return to baseline (~480 kWh).
   - **Month 18 (Latest)**: Intentional spike (~680 kWh) naturally triggering **Boros** anomaly classification in `getProductAnalysisReadModel()`.
2. **kWh Provenance Mix**:
   - `USER_ENTERED` (direct kWh)
   - `METER_DERIVED` (with valid `meterStart` and `meterEnd`)
   - `LEGACY_UNKNOWN` (stored kWh fixture)
   - `BILL_TARIFF_DERIVED` (bill without stored kWh but with tariff)
   - Zero-usage period (valid `0.000` kWh period)
3. **18 Months Revenue Entries**:
   - Matching monthly revenue (~15,000,000 to 18,000,000 IDR) enabling non-zero electricity/revenue ratio, cash-flow context, and historical report verification.
4. **Appliance Profile**:
   - 6 `TEMPLATE` appliances (AC, Pompa Air, Lampu Koridor, Kulkas, WiFi, CCTV).
   - 1 `MANUAL` (`USER_ENTERED`) appliance (Mesin Cuci Tambahan) verifying template/manual isolation.
5. **Bill Correction & Diagnostic Lock Fixture**:
   - 1 completed `diagnostic_session` referencing Month 14 bill (`ReferencedBillLockedError` testing).
   - 16 unreferenced bills (Month 18 and others) open for manual edit, delete, and starting new Cek Kenaikan diagnostic sessions.

---

## 6. Prohibited Uses

> [!CAUTION]
> **QA Demo synthetic data must NOT be used for:**
> 1. AI/ML model training or fine-tuning datasets
> 2. AI/ML validation or benchmark scoring
> 3. Production business analytics or financial reporting
> 4. Accuracy or savings claims
>
> This dataset exists **exclusively** for UI functional testing, manual acceptance, and product demonstration.

---

## 7. Manual QA Acceptance Flow

1. Set `QA_DEMO_EMAIL` and `QA_DEMO_PASSWORD` in your local environment.
2. Run `npm run qa:demo:seed`.
3. Open `http://localhost:3000/login`.
4. Log in using `QA_DEMO_EMAIL` and `QA_DEMO_PASSWORD`.
5. Verify:
   - **Dashboard**: High-priority warning banner ("Indikasi pemakaian boros") linking to `/analysis?tab=anomaly`.
   - **Analysis**: 18-month trend chart, anomaly breakdown, prediction, recommendations, simulator.
   - **Bills**: 18 bills present. Month 14 bill shows locked badge (referenced by diagnostic). Month 18 bill allows edit/delete.
   - **Revenue**: 18 revenue records. Delete modal confirmation supported.
   - **Appliances**: 7 items listed. Clicking "Gunakan Template" preserves idempotency.
   - **Historical Report**: Select month 14–16, verify revenue ratio and cash-flow context, download CSV.
