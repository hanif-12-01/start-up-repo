# WATTWISE AI-04 Shadow Validation & Operational Readiness Report

Date: 2026-08-12 (Asia/Jakarta)  
Starting SHA: `4dabeeb7f1b37a75cb47e62c19f85939c787e247`  
Branch: `feature/ai-04-shadow-validation`

## Decision

The frozen AI-02 N-BEATS package passed operational shadow validation without changing
WattWise application behavior. Process isolation provides a true hard timeout, the
caller receives deterministic fallback within a bounded interval, and a later request
loads a healthy worker generation. Warm latency and total worker memory meet the
reference-machine gates.

Technical integration behind disabled-by-default safeguards may proceed in AI-05.
User-facing ML remains not ready because no legitimate REAL_WATTWISE snapshot or paired
outcome evidence was available. Production ML remains not ready.

## Frozen package integrity

- N-BEATS version: `nbeats-ai02-1.0.0`;
- artifact SHA-256:
  `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`;
- feature-contract SHA-256:
  `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4`;
- artifact, serving manifest, model version, and feature contract: PASS;
- retraining, tuning, artifact replacement, and model routing changes: none.

## Dataset and provenance

The immutable operational input fingerprint is
`26726e58c83f2b24b2a6a32a6e68141ebcd525248ce5dbbae175d5d201211481`.
The replay used 100 London SmartMeter PUBLIC_PROXY records, 20 ComStock
MODELED_SIMULATION records, and five SYNTHETIC_DEMO routing fixtures. No legitimate
REAL_WATTWISE snapshot was present at the approved external input location.

Proxy, simulation, demo, and load-test results are excluded from real WattWise product
accuracy. Actual target usage is attached only after prediction and never crosses the
inference boundary.

## Operational replay

The unique replay contained 125 requests: H00 1, H01_02 1, H03_05 1, H06_12 22,
and H13_PLUS 100. Of 122 valid ML-eligible requests, all 122 produced valid N-BEATS
predictions. System failure rate was 0%, with no uncaught exception, artifact failure,
checksum failure, NaN, infinity, negative output, or shape mismatch.

The same ten-request subset was replayed twice. Both fingerprints were
`da7e395615a68e839572225c3cd8bf0d638ce478c1c4be9994b5df17b75a4061`;
maximum prediction delta was 0, route mismatches 0, and fallback mismatches 0.

## Worker safety and recovery

N-BEATS loads once per worker generation and is reused. A deliberately hanging
prediction was terminated using a separate spawned process, with the parent regaining
control and receiving deterministic fallback in 271.91 ms. A worker crash, missing or
corrupt artifact, checksum mismatch, schema mismatch, and invalid output also fail
closed. The first request after timeout loads a new generation and succeeds.

The runtime recycles a worker after 100 completed requests to bound long-lived
scientific-runtime memory. Across 500 labeled load-test calls, no crash, timeout, or
result failure occurred. These repetitions are excluded from accuracy evidence.

## Performance and memory

Measured on the current Windows CPU machine:

| Measure | Result | Gate |
| --- | ---: | ---: |
| Worker cold start including model load | 17,441.99 ms | reported separately |
| First prediction | 136.59 ms | informational |
| Warm p50 | 147.39 ms | informational |
| Warm p95 | 208.87 ms | <= 500 ms |
| Warm p99 | 241.88 ms | <= 1,000 ms |
| Warm maximum | 258.39 ms | informational |
| Peak total worker RSS | 699,039,744 B | <= 1.25 GB |
| Maximum within-generation RSS growth | 5.27% | <= 20% |

Cold startup and recycle-to-ready time of about 17 seconds are P2 operational costs.
They do not block the caller on inference timeout because fallback is returned before
lazy worker reinitialization on the subsequent request.

## Real WattWise accuracy and domain shift

REAL_WATTWISE records: 0. Paired actual outcomes: 0. Evidence tier:
`NO_REAL_ACCURACY_EVIDENCE`. Bootstrap comparison: `NOT_ENOUGH_DATA`.

No product-specific model advantage is claimed. BDG2 remains AI-01 benchmark evidence;
London is proxy robustness evidence only. REAL_WATTWISE domain shift is
`INSUFFICIENT_DATA` because no legitimate snapshot was available.

## LightGBM backup

The frozen LightGBM backup checksum validated, loaded, predicted, and produced one
finite nonnegative value. It was not promoted over N-BEATS and routing did not change.

## Application invariant

`SHADOW_RESULT_CAN_OVERRIDE_USER_FORECAST = FALSE`. AI-04 added no Next.js route,
database write, migration, fetch integration, UI change, feature flag, deployment, or
production API. Detailed prediction-level evidence remains outside Git under
`D:\WattWiseMLData\shadow\ai-04\runs\ai04-20260812T082742Z`.

## Findings

- P0: 0.
- P1: 0.
- P2: 2.
  1. No REAL_WATTWISE paired outcomes; user-facing accuracy remains unproven.
  2. Spawned-worker cold start and recycle-to-ready are about 17 seconds; AI-05 must
     preload workers and preserve immediate deterministic fallback during recovery.

## Quality gates

- `python -m pytest ml/benchmark`: PASS — 244 tests;
- `python -m ruff check ml/benchmark/src`: PASS;
- `python -m mypy ml/benchmark/src`: PASS — 57 source files;
- application unit tests: PASS — 285 tests;
- application integration tests: PASS — 174 tests against disposable PostgreSQL;
- application typecheck: PASS;
- application lint: PASS;
- application production build: PASS;
- `wattwise-vercel` diff: none.

## Readiness

```text
AI02_PACKAGE_PRESERVED = YES
SHADOW_RUNTIME_VALID = YES
HARD_TIMEOUT_VALID = YES
WORKER_RECOVERY_VALID = YES
DETERMINISTIC_SAFETY_NET_VALID = YES
OPERATIONAL_LATENCY_VALID = YES
MEMORY_STABILITY_VALID = YES
SHADOW_REPLAY_REPRODUCIBLE = YES
REAL_WATTWISE_ACCURACY_EVIDENCE = NONE
P0_COUNT = 0
P1_COUNT = 0
AI_04_COMPLETE = YES
READY_FOR_AI_05_APPLICATION_INTEGRATION = YES
READY_FOR_USER_FACING_ML = NO
READY_FOR_PRODUCTION_ML = NO
```
