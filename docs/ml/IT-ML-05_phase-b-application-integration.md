# Phase B: Phase-Aware AI Application Integration

> **APPLICATION INTEGRATION ONLY ? NOT APPROVED FOR STAGING OR PRODUCTION DEPLOYMENT**

This document covers local integration and automated testing only. It does not authorize Railway changes, deployment, production shadow traffic, active production routing, or removal of deterministic fallback.

## Architecture and background execution

The electricity-entry request validates and saves the entry, then returns without waiting for Python. When the effective mode requires ML, Laravel dispatches `RunPhaseAwarePredictionJob` after commit to the configured prediction queue.

The job rebuilds the latest continuous monthly history, calculates and retains the deterministic result, classifies the phase, checks model eligibility/version, creates the v1.0 payload, calls `PredictionInferenceGateway`, strictly validates the response, and persists observability plus fallback data. ML failures never roll back or invalidate the electricity entry.

The Python service imports the benchmark's `build_inference_example`, `load_artifact`, and `predict_loaded_artifact` paths. It does not introduce a second preprocessing or model-loading pipeline.

## Routing and eligibility

| Phase | Continuous history | Route | Mandatory fallback |
|---|---:|---|---|
| `H00` | 0 months | `lightgbm` | `deterministic_baseline` |
| `H01_02` | 1?2 months | `deterministic_baseline` | `deterministic_baseline` |
| `H03_05` | 3?5 months | `lightgbm` | `deterministic_baseline` |
| `H06_12` | 6?12 months | `nbeats` | `deterministic_baseline` |
| `H13_PLUS` | 13+ months | `nbeats` | `deterministic_baseline` |

Negative history is rejected. Eligibility reasons include `MODEL_DISABLED`, `MODEL_VERSION_UNCONFIGURED`, `MISSING_VALIDATED_STATIC_PROFILE`, and `MINIMUM_CONTEXT_6_MONTHS`. DeepAR is not a serving route.

## Modes and production guards

- `OFF`: deterministic only; zero ML requests.
- `SHADOW`: background ML is persisted for comparison; deterministic remains user-facing.
- `EXPERIMENTAL`: non-production only; AI output is separately labelled and deterministic fallback remains visible.
- `ACTIVE`: implemented for local tests, disabled by default, and blocked in production without both approvals.

Invalid modes fail closed to `OFF`. `EXPERIMENTAL` always fails closed in production. Other production ML modes require both `PREDICTION_ALLOW_PRODUCTION_ML` and `PREDICTION_PRODUCTION_APPROVED`.

Safe defaults remain:

- `PREDICTION_MODE=off`
- `PREDICTION_LIGHTGBM_ENABLED=false`
- `PREDICTION_NBEATS_ENABLED=false`
- `PREDICTION_RIDGE_SHADOW_ENABLED=false`
- `PREDICTION_ALLOW_PRODUCTION_ML=false`
- `PREDICTION_PRODUCTION_APPROVED=false`

Other variable names are `PREDICTION_ML_ENDPOINT`, `PREDICTION_ML_TIMEOUT_MS`, `PREDICTION_LIGHTGBM_VERSION`, `PREDICTION_NBEATS_VERSION`, `PREDICTION_QUEUE_CONNECTION`, and `PREDICTION_QUEUE`. Never commit real values.

## Laravel?Python contract v1.0

`POST /v1/predictions` accepts exactly: `schema_version`, `request_id`, non-PII `entity_id`, `reporting_phase`, `target_period`, ordered contiguous `consumption_history`, exact benchmark `contextual_features`, `requested_horizon`, `requested_model`, and `model_version`.

The response contains exactly: `schema_version`, `request_id`, `status`, `selected_model`, `model_version`, `reporting_phase`, `prediction_kwh`, `eligibility_status`, `fallback_reason`, `inference_latency_ms`, `artifact_identifier`, `artifact_sha256`, `warnings`, and `error_code`.

Laravel rejects unknown schemas, request-ID mismatches, missing/extra fields, unsupported status or eligibility, blank required/nullable strings, malformed warnings, unsafe artifact identifiers, invalid checksums/latency, non-numeric values, NaN, infinity, and negative predictions. Every rejection preserves deterministic fallback.

## Idempotency and persistence

The request ID hashes business, source entry, target period, selected model, version, mode, and history fingerprint. It is also used as the legacy `input_fingerprint`, preventing the pre-existing composite uniqueness constraint from colliding when version or mode changes. Terminal retries do not duplicate prediction runs/results; an interrupted `PENDING` run can resume.

No credentials, raw external rows, unnecessary PII, absolute paths, or model binaries are persisted.

## Service, diagnostics, and artifacts

Python endpoints are `GET /health`, `GET /v1/models`, and `POST /v1/predictions`. Laravel exposes safe diagnostics at `GET /up/prediction`; output includes only mode/block state, production permission, queue readiness, service readiness/reachability, inventory state, and safe codes. It excludes URLs, environment values, local paths, secrets, and database details.

Set `WATTWISE_MODEL_ROOT` to an external, access-controlled artifact root:

```text
<WATTWISE_MODEL_ROOT>/
  serving-manifest.json
  <relative-lightgbm-artifact>.joblib
  <relative-nbeats-artifact>.ckpt
```

The v1.0 manifest must contain exactly `lightgbm` and `nbeats`, each with a promoted version, relative identifier, and lowercase SHA-256. Laravel versions must match. Missing roots/manifests/artifacts, invalid checksums, and version mismatches produce a safe not-ready/error state.

Phase A validated multiple fold/seed artifacts but did not promote one immutable serving manifest. Exact artifact selection and external provisioning remain a separate gate; Phase B does not silently select a seed or commit binaries.

## Local validation

```powershell
cd wattwise-laravel
composer install
php artisan migrate
php artisan queue:work database --queue=predictions
php artisan test tests/Unit/PhaseAware tests/Feature/PhaseAware
```

```powershell
cd ml/benchmark
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"
$env:WATTWISE_MODEL_ROOT = "<external-model-root>"
.venv/Scripts/python -m wattwise_serving --host 127.0.0.1 --port 8090
.venv/Scripts/python -m pytest tests/test_serving_*.py
```

Tests use compact fake loaders/artifacts and make no external network calls.

## Rollback and remaining gates

Rollback by setting the effective mode to `OFF`, retaining false model/production flags, and stopping local prediction workers/service. Existing entries and deterministic predictions remain valid; keep prediction history for audit.

Staging/production still require separate approvals for immutable artifact promotion, security/privacy review, queue/service capacity and observability, staging acceptance, rollback rehearsal, and explicit production ML authorization. Deterministic fallback remains mandatory.

> **APPLICATION INTEGRATION ONLY ? NOT APPROVED FOR STAGING OR PRODUCTION DEPLOYMENT**

