# AI-06B Production Rollout Preflight

- Candidate Git SHA: fill with accepted AI-06A final SHA during AI-06B.
- Determine production schema read-only; apply dependencies in order: `0011`, `0012`, `0013`, `0014`.
- Required server env names: `WATTWISE_AI_MODE`, `WATTWISE_AI_SERVICE_URL`,
  `WATTWISE_AI_SERVICE_TOKEN`, `WATTWISE_AI_SCHEDULER_SECRET`,
  `WATTWISE_AI_ALLOW_PRODUCTION_SHADOW`, `WATTWISE_AI_PRODUCTION_SHADOW_APPROVED`.
- ML service env names: `WATTWISE_MODEL_ROOT`, `WATTWISE_MODEL_ARTIFACT_SHA256`,
  `WATTWISE_AI_SERVICE_TOKEN`, worker timeout settings.
- Frozen artifact SHA: `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`.
- Confirm approved persistent private hosting target, read-only artifact mount, memory headroom,
  health checks, scheduler target, and container graceful shutdown.
- Start with a small explicitly approved cohort; do not select using sensitive attributes.
- Rehearse global/cohort kill switches and migration rollback before activation.
- Confirm monitoring endpoint returns aggregate data and zero PII.
- Required behavior: user-facing deterministic parity 100%, ML outage user impact 0,
  unhandled ML app errors 0, artifact mismatches accepted 0, failure rate <=1%, contamination 0.

Current AI-06A environment does not establish or approve a production hosting/scheduler target.
That unresolved external infrastructure gate must be closed independently before activation.
