# IT-ML-03 — Five-Case Demo Validation Harness

Status: **IMPLEMENTED ON FEATURE BRANCH — TEST EXECUTION REQUIRED**

Branch: `feature/ml-demo-validation-harness`

## Purpose

This harness creates one guarded demo account with five businesses so the application can
prove, rather than assume, which prediction phase and model are actually available at
runtime.

The harness does not promote a model into the user-facing prediction path. It runs the
existing shadow stack and reports missing portfolio integrations explicitly.

## Safety boundary

The feature is available only when all of the following are true:

- the Laravel environment is `local`, `testing`, or `staging`;
- `DEMO_LOGIN_ENABLED=true`;
- `DEMO_ML_VALIDATION_ENABLED=true`;
- the authenticated user is `demo@wattwise.local`.

The demo seeder still refuses to run in production.

## Five scenarios

| Scenario | History | Expected phase | Research-portfolio route |
|---|---:|---|---|
| ML Demo - Usaha Baru | 0 months | `H00` | LightGBM |
| ML Demo - Warung 2 Bulan | 2 months | `H01_02` | deterministic baseline |
| ML Demo - Laundry 5 Bulan | 5 months | `H03_05` | LightGBM |
| Kos Melati Purwokerto | 6 months | `H06_12` | N-BEATS |
| ML Demo - Kos 18 Bulan | 18 months | `H13_PLUS` | N-BEATS |

Extra businesses are seeded only when `DEMO_ML_VALIDATION_ENABLED=true`. The normal demo
flow remains one account and one primary business when the flag is false.

## Local or staging activation

Set:

```env
APP_ENV=staging
DEMO_LOGIN_ENABLED=true
DEMO_ML_VALIDATION_ENABLED=true
PREDICTION_SHADOW_ENABLED=true
PREDICTION_RIDGE_ENABLED=true
PREDICTION_GRADIENT_BOOSTING_ENABLED=true
PREDICTION_ADAPTIVE_ROUTER_ENABLED=false
```

Then run:

```bash
php artisan db:seed --class=WattWiseDemoSeeder
```

Log in as the demo account and open:

```text
/internal/ml-validation
```

Use **Jalankan Shadow Validation** to create shadow runs for the four scenarios that have
history. The zero-history H00 scenario remains a serving-contract case because the current
orchestrator rejects empty history.

## What the page proves

For each scenario it displays:

- configured and actual history length;
- expected and detected phase;
- research-portfolio model expected for that phase;
- whether that model is registered in Laravel;
- latest shadow run and target period;
- every registered model result;
- prediction, latency, artifact checksum, skip reason, and failure code;
- an overall proof status.

A scenario is marked `SUCCESS` only when the expected portfolio model is registered and
its latest result has status `SUCCESS`.

## Expected result before new serving integration

The current Laravel registry contains deterministic, Ridge, and the older Gradient
Boosting adapter. It does not yet contain the recovered portfolio's LightGBM or N-BEATS
adapters.

Therefore the expected pre-integration evidence is:

- `H01_02`: deterministic baseline can succeed;
- `H00` and `H03_05`: `PORTFOLIO_MODEL_NOT_REGISTERED` for LightGBM;
- `H06_12` and `H13_PLUS`: `PORTFOLIO_MODEL_NOT_REGISTERED` for N-BEATS;
- overall `new_portfolio_fully_integrated=false`.

This is intentional. The harness must expose the integration gap instead of presenting an
old model or deterministic estimate as proof that the new benchmark portfolio is active.

## Promotion gate

Do not expose the new portfolio in the normal predictions UI until all five cases have an
auditable result, the expected model is registered for every route, all emitted forecasts
are finite and nonnegative, artifact checksums match, latency is acceptable, and failure
simulation proves deterministic fallback works.
