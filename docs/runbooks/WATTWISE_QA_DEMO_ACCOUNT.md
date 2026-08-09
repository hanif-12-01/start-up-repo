# WattWise AI — QA Demo Account Provisioning Runbook

## 1. Overview & Purpose

This runbook documents the **WattWise QA Demo Account Provisioning System** (`IT-QC-DEMO-01B`).

The QA Demo Account provides a deterministic, safe, pre-populated synthetic dataset designed to make manual UI/UX acceptance testing, product demonstrations, and regression testing fast and repeatable.

---

## 2. Strict Environment Safety Rules

- **Local Development** (`NODE_ENV=development`): **ALLOWED**
- **Test Environment** (`NODE_ENV=test`): **ALLOWED**
- **Vercel Preview** (`VERCEL_ENV=preview`): **ALLOWED ONLY WHEN `QA_DEMO_ENABLED=true`** is explicitly configured. Without this flag, provisioning is DENIED.
- **Vercel Production** (`VERCEL_ENV=production`): **ALWAYS DENIED UNCONDITIONALLY**. There are NO flags or overrides capable of bypassing this refusal.
- **Non-Vercel Production** (`NODE_ENV=production`): **DENIED BY DEFAULT**. Refuses execution if a recognized Preview context is not present.

> [!CAUTION]
> No override flag exists or is supported to allow demo seeding or resetting in Production. The environment guard fails closed by default.

---

## 3. Required Environment Variables

To provision, check, or reset the QA Demo Account, configure the following environment variables:

| Variable | Requirement | Description |
| :--- | :--- | :--- |
| `QA_DEMO_EMAIL` | Optional | Email address for the QA Demo account. Defaults to `qa-demo@wattwise.test` if omitted. |
| `QA_DEMO_PASSWORD` | Required when seeding | Strong test password (minimum 8 characters). **DO NOT COMMIT TO GIT OR LOG TO CONSOLE.** |
| `QA_DEMO_ENABLED` | Required for Preview | Explicit opt-in flag required when provisioning in Vercel Preview environments (`QA_DEMO_ENABLED=true`). |

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
- Restores `Kos Melati Demo` to its initial deterministic baseline state.
- **Reset Identity Safety**: Verifies that the configured `QA_DEMO_EMAIL` user has strong QA Demo identity (`name === 'WattWise QA Demo'` and ID prefix `user-qa-demo-`). Refuses reset if configured email belongs to a normal user.
- **Business-Scoped Isolation**: Destructive reset deletes and replaces **ONLY** records belonging to `Kos Melati Demo`. Unrelated businesses owned by the same user or other database users remain completely untouched.

### C. Check Demo Readiness
```bash
npm run qa:demo:check
```
- Inspects database readiness without mutating state.
- Verifies account existence, Better Auth credentials, business status, 18-month bill/revenue history, appliance profile, referenced vs unreferenced bill availability, historical monthly report service resolution, and authoritative anomaly state (`Boros`).

---

## 5. Better Auth Login Integration Verification

- **Better Auth Compatibility**: Better Auth native credential hash (`hashPassword` from `better-auth/crypto`) is generated during seeding.
- **Live Auth Integration**: Verified via `auth.api.signInEmail({ body: { email, password }, headers: new Headers() })`.
- **Authentication Guarantee**: Real email/password sign-in succeeds at `/login` and returns a valid user session. Invalid passwords are rejected.

---

## 6. Synthetic Dataset Composition

The provisioned demo business (**Kos Melati Demo**, segment `KOS`, 20 rooms, 16 occupied) contains:

1. **18 Consecutive Months Electricity Bills**:
   - **Months 1–12**: Baseline usage (~460–500 kWh/month).
   - **Months 13–16**: Modest growth (~520–570 kWh/month).
   - **Month 17**: Return to baseline (~480 kWh).
   - **Month 18 (Latest)**: Intentional spike (~680 kWh) naturally triggering **Boros** anomaly classification in `getProductAnalysisReadModel()`.
2. **kWh Provenance Mix**:
   - `USER_ENTERED` (direct kWh)
   - `METER_DERIVED` (with valid `meterStart` and `meterEnd`)
   - `LEGACY_UNKNOWN` (stored null-kWh fixture)
   - `BILL_TARIFF_DERIVED` (bill with `kwh = null` and valid tariff, resolving to `isEstimated = true` in read model)
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

## 7. Prohibited Uses

> [!CAUTION]
> **QA Demo synthetic data must NOT be used for:**
> 1. AI/ML model training or fine-tuning datasets
> 2. AI/ML validation or benchmark scoring
> 3. Production business analytics or financial reporting
> 4. Accuracy or savings claims
>
> This dataset exists **exclusively** for UI functional testing, manual acceptance, and product demonstration.

---

## 8. Manual QA Acceptance Flow

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
