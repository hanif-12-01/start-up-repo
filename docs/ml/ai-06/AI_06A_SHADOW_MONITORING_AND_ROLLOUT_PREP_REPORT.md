# WATTWISE AI-06A Shadow Monitoring and Rollout Preparation

AI-06A adds operator-controlled enrollment, bounded outbox batching, authenticated internal
scheduler/monitoring endpoints, aggregate evidence metrics, timing/phase/source segmentation,
deterministic alert evaluation, migration `0014`, and a non-root persistent Python container
package. No production environment, database, enrollment, deployment, or customer UI was changed.

## Operational decisions

- Production REAL shadow requires business provenance plus an enabled operator enrollment.
- Default batch bounds are 10 jobs/20 seconds; hard limits are 25 jobs/25 seconds.
- OFF mode performs no service health call and no job processing.
- Disabled cohorts stop new production enqueue and pending/retryable payloads are invalidated.
- Monitoring is read-only and aggregate; it contains no entity identifiers or individual values.
- Promotion review remains false; metrics never alter model, routing, or customer behavior.

## Deployment and artifact integrity

The Docker image contains source/dependencies only. The AI-02 model directory is mounted
read-only and its manifest plus frozen SHA are verified before worker construction. Service
identity remains `nbeats-ai02-1.0.0`; LightGBM remains backup validation only.

The repository contains a deployable persistent-service package, but no approved persistent
production hosting or scheduler target is available in this phase. Therefore activation remains
blocked even when local quality gates pass.

## Local verification evidence

- Disposable PostgreSQL integration: 16 files, 192 tests passed, including real-artifact E2E.
- Container identity: frozen N-BEATS model, artifact SHA, and feature schema all matched.
- Synthetic real-artifact response: success, H06_12, worker generation 1.
- Warm HTTP p95: 292.202 ms over 20 requests; highest observed memory: 1.422 GiB.
- Graceful shutdown: exit code 0 in 5,615.837 ms.
- Docker Desktop BuildKit later stalled while materializing the final one-line runtime ENV layer;
  the exact runtime setting was verified against the already-built image. Rebuild on a clean CI
  runner remains an explicit P2 preflight action before any registry publication.

## Scope freeze

NO RETRAINING. NO MODEL/ARTIFACT/FEATURE-SCHEMA/ROUTING/DETERMINISTIC CHANGE. NO USER-FACING ML.
NO PRODUCTION DATABASE ACCESS. NO PRODUCTION ENV CHANGE. NO DEPLOYMENT. NO MERGE.

## Closeout findings

- P0: 0.
- P1: 0.
- P2: persistent private ML hosting target has not been selected or approved.
- P2: production scheduler target has not been selected or approved.
- P2: rebuild the final image on a clean CI/BuildKit runner before registry publication; local
  Docker Desktop stalled after the functionally verified runtime correction.
- Production REAL_WATTWISE paired count was not queried because production DB access is forbidden;
  test/disposable observations are intentionally excluded from that number.

AI-06A implementation/package preparation is complete for independent AI-06B QC. Controlled
production shadow activation remains **NO** until the external hosting, scheduler, production
schema, artifact source, and independent-QC gates are closed.
