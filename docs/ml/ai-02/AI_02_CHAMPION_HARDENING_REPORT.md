# WATTWISE AI-02 Champion Hardening & Shadow Preparation Report

Date: 2026-08-12 (Asia/Jakarta)  
Starting SHA: `61969c089fc407ba24aaa88bb85da16a0e091d30`  
Branch: `feature/ai-02-champion-hardening`  
Status: `AI-02 COMPLETE`

## Executive decision

N-BEATS is hardened as the H06+ champion, LightGBM is packaged only as the H13_PLUS
backup, and deterministic forecasting remains the mandatory fail-safe. The package is
ready for AI-04 shadow validation. It is not connected to Next.js, not deployed, and
not approved for application integration or production ML.

P0: 0. P1: 0. P2: 1 — preload N-BEATS shadow workers because cold load is about
5.42 seconds and the total scientific-process RSS peaked at about 751.6 MB.

## Frozen AI-01 evidence

AI-01 remained frozen. AI-02 reused the approved seed-17 `seen_entity` artifacts
without retraining, tuning, or test-label use. The following fingerprints were created
from the untouched AI-01 evidence:

- `AI01_TEST_OBSERVATION_IDS_SHA`:
  `efc507ae9fdaba9f53dd8b91ba5082110b5fc49f3644fe1ef8b84ba116a63845`;
- `AI01_ENTITY_SPLIT_SHA`:
  `0f64b1006ae9db7db82cf5c46fe615a0ff319c8b855a0062bda68c14e6371ae5`;
- `AI01_FEATURE_SCHEMA_SHA`:
  `5a7f36a8c9096f2025bd1d9357b379c5b9aa719780d49782d8599db6b6a68dc1`;
- frozen predictions SHA-256:
  `e51fb229964f0269aca605f6987deb88ddded6479da69f9b658f1072ddade2a8`.

## Routing and contracts

The pure routing contract is H00/H01_02/H03_05 to deterministic baseline and
H06_12/H13_PLUS to N-BEATS. LightGBM remains an H13_PLUS operational backup only.

The framework-independent `ForecastRequest` accepts only a request identifier,
forecast timestamp, target calendar month, contiguous monthly history, contextual
features, and exact feature-schema checksum. `ForecastResult` reports prediction,
selected model/version, phase, fallback status/reason, latency, artifact version, and
deterministic reference. No database or raw training data is involved.

Target usage and future history are structurally excluded. Missing/duplicate/out-of-
order months, invalid types, NaN/infinity, negative history, and schema mismatches fail
closed. Offline and serving feature builders are executable equivalents for 1, 3, 6,
12, and 13+ months.

## Artifact packages

Binary artifacts remain outside Git under `D:\WattWiseMLData\models\ai-02`.

N-BEATS:

- version `nbeats-ai02-1.0.0`;
- artifact SHA-256
  `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`;
- config SHA-256
  `a7291d66cdc397a61f1dcd8505696b778bafe6d1f2dd87e2d42d2e3c0adb1e32`;
- artifact size 4,447,799 bytes.

LightGBM backup:

- version `lightgbm-ai02-1.0.0`;
- artifact SHA-256
  `85f325153810e2611f6d364c81e7ca6f13948b68feee6f491a3015df3f3cf1c0`;
- config SHA-256
  `df21e650e99314ac2512ce69fc5743e23dffd0e237d5a92319bf1462d74bd0c7`;
- artifact size 1,330,972 bytes.

The external champion manifest fingerprint is
`dce838224c46d2bb93495f0b9999add22481d493fec41a921ee9849ff75c98b8`.
Model identity never relies on the word `latest`.

## Round-trip, reproducibility, and performance

Real N-BEATS checkpoint round-trip: PASS. Source and copied artifact predictions are
identical within `1e-6`; maximum absolute delta is `0.0`. Two controlled reload runs
over eight fixture histories also have prediction delta `0.0`, MAE delta `0.0`, and
RMSE delta `0.0`.

Measured current-machine performance:

| Model | Cold load | Warm p50 | Warm p95 | Warm p99 | Artifact | Peak total RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| N-BEATS | 5,424.42 ms | 88.43 ms | 139.69 ms | 158.15 ms | 4,447,799 B | 751,607,808 B |
| LightGBM | 20.51 ms | 28.14 ms | 30.27 ms | 31.61 ms | 1,330,972 B | 725,999,616 B |

Batch-eight p50 is 106.38 ms for N-BEATS and 64.02 ms for LightGBM. Total RSS includes
the complete Python/scientific runtime. N-BEATS must be preloaded for shadow workers;
the warm path is suitable for offline shadow evaluation.

## Failure injection and safety

Executable tests pass for missing artifact, corrupt checkpoint, wrong checksum, missing
feature/schema mismatch, invalid type, NaN/negative usage, too-short history,
inference exception, timeout-equivalent failure, invalid prediction shape, NaN/infinite
output, and negative output. None escape the inference boundary; each returns an
explicit safe outcome and deterministic fallback where a valid history exists.

## Shadow package

The repository contains small aggregate manifests for routing, artifacts, inference,
observability, latency, reproducibility, and failure injection. The external package
contains the actual artifacts, configs, feature contracts, checksums, and machine-
readable serving manifest. Future shadow logs need no PII and perform no database
writes in AI-02.

## Quality gates and application regression

- `python -m pytest ml/benchmark`: PASS — 226 tests passed;
- `python -m ruff check ml/benchmark/src`: PASS;
- `python -m mypy ml/benchmark/src`: PASS — 54 source files checked;
- `npm run test`: PASS — 285 unit tests passed;
- `npm run test:integration`: PASS — 174 integration tests passed against a
  disposable PostgreSQL container, which was removed after the run;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS.

The application tree has no AI-02 diff. No production route, database, Vercel
configuration, user-facing forecast behavior, or production environment was changed.

Final readiness:

```text
NBEATS_HARDENED = YES
DETERMINISTIC_FALLBACK_READY = YES
LIGHTGBM_BACKUP_READY = YES
INFERENCE_CONTRACT_READY = YES
ARTIFACT_INTEGRITY_READY = YES
REPRODUCIBILITY_READY = YES
SHADOW_PACKAGE_READY = YES
P0_COUNT = 0
P1_COUNT = 0
AI_02_COMPLETE = YES
READY_FOR_AI_03 = NOT_REQUIRED
READY_FOR_AI_04_SHADOW_VALIDATION = YES
READY_FOR_AI_05_APPLICATION_INTEGRATION = NO
READY_FOR_PRODUCTION_ML = NO
```
