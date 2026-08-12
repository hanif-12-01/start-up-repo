# AI-06A Operator Runbook

## Safety boundary

AI-06A prepares operations only. Do not set production shadow approval flags, enroll production
businesses, apply production migrations, merge, or deploy until AI-06B approval.

## Start and verify the private ML service

Mount the external AI-02 model directory read-only at `/models`, supply server-only
`WATTWISE_AI_SERVICE_TOKEN`, set `WATTWISE_MODEL_ROOT=/models`, and set
`WATTWISE_MODEL_ARTIFACT_SHA256` to the frozen SHA. Check `/health/live`, then wait for
`/health/ready`. Readiness failure on checksum or model identity is a stop condition.

## Scheduler and monitoring

Invoke `POST /api/internal/ai/shadow/run` with the server-only scheduler bearer secret. One call
processes at most 10 jobs and at most 20 seconds by default (hard limits: 25 jobs/25 seconds).
Read `GET /api/internal/ai/monitoring` with the same secret. Output is aggregate only.

## Kill switches

- Global: set `WATTWISE_AI_MODE=OFF`; scheduler becomes a no-op and queued work remains intact.
- Production dual gate: remove either production approval flag.
- Cohort: run `npm run ai:shadow:enrollment -- --disable --business-id <opaque-id> --reason <reason>`.
  Pending/retryable cohort work becomes `NOT_ELIGIBLE` and its transient payload is cleared.

Use `--dry-run` before enrollment/disable. Never identify a cohort by email, name, or sensitive
attribute.

## Failures

- ML outage/not-ready: leave jobs queued; investigate private service health and artifact mount.
- Artifact mismatch: do not bypass the checksum; restore the approved immutable artifact.
- Backlog warning/critical: inspect aggregate monitoring, service readiness, and scheduler cadence.
- Verify user impact: deterministic pages and APIs must remain healthy with ML stopped or OFF.

Prediction evidence is retained for governed evaluation; transient raw history is cleared after
terminal processing. Monitoring reports are generated at runtime outside Git and contain no
entity-level rows.
