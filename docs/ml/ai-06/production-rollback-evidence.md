# AI-06B Production Rollback Evidence

## Status

`ROLLBACK_PLAN_PREPARED = YES`

This is a rehearsal document only. No production kill switch, scheduler, cohort, database,
deployment, environment, or model was changed in Stage B1.

## First-response invariant

Restore user safety before attempting infrastructure or data repair:

1. Set effective `WATTWISE_AI_MODE=OFF` **or** remove either production approval flag.
2. Disable the production shadow scheduler.
3. Confirm the deterministic application and core health routes remain healthy.
4. Preserve queued and completed evidence; do not delete rows during incident containment.
5. Disable the affected cohort if the issue is cohort-specific.
6. Investigate using aggregate, non-PII monitoring only.

No rollback may make N-BEATS user-facing. Deterministic output remains authoritative throughout.

## Rollback triggers

- any user-visible deterministic change;
- ML-induced application error or unexpected browser ML call;
- schema migration failure or unverified schema state;
- model/artifact/feature-schema mismatch;
- worker cannot remain READY, restart loop, OOM, or unsafe memory pressure;
- service/scheduler authentication failure;
- PII or tenant-boundary exposure;
- unapproved or contaminated cohort/evidence;
- duplicate/runaway scheduler behavior;
- system failure rate above 1%;
- any unknown critical condition.

## Layered rollback

### Global shadow

- Change the production server configuration so the effective mode is `OFF`.
- Redeploy/configure only through the approved Vercel workflow.
- Confirm scheduler calls are disabled or produce a safe no-op.
- Confirm ML service request count falls to zero.

### Scheduler

- Pause/disable the single Google Cloud Scheduler job.
- Do not delete it during immediate containment; preserve configuration for audit.
- Check that no execution remains in flight and that later retries cannot run.

### Cohort

- Dry-run the existing operator command for the affected opaque ID.
- Disable enrollment with an operator reason kept outside Git.
- Verify pending/retryable transient payloads become ineligible and are cleared by the accepted
  repository behavior.
- Never put the opaque business ID in this document, commit, CI log, or issue.

### ML service

- Route no traffic to the unhealthy revision or scale the service to zero after the global switch.
- If infrastructure rollback is required, restore the last approved image by immutable digest and
  the frozen read-only artifact prefix.
- Do not bypass readiness or checksum verification.

### Application deployment

- Restore the previously known-good deterministic release through the normal Vercel rollback or
  Git release process only after the global switch is already safe.
- Stage B1 observed production release
  `ce7349b93b2737da165a1f7269abbf3987162df7` as healthy; its continued availability must be
  rechecked immediately before any B2 window.

### Database migrations

Run rollback SQL only for migrations actually applied in the failed B2 window, newest first:

1. `0014_ai_shadow_enrollment_rollback.sql`
2. `0013_ai_shadow_prospective_reachability_rollback.sql`
3. `0012_ai_shadow_evidence_integrity_rollback.sql`
4. `0011_ai_shadow_integration_rollback.sql`

The 0012 rollback is intentionally conservative: it will not narrow the provenance constraint if
truthful `UNCLASSIFIED` evidence exists. Database-owner approval and a verified backup/PITR path are
required before any rollback SQL. Never drop evidence merely to make rollback succeed.

## Recovery acceptance

- effective AI mode `OFF`;
- scheduler disabled;
- deterministic application healthy;
- zero ML-induced user errors;
- no new shadow claims after the stop boundary;
- evidence preserved and tenant isolation intact;
- incident findings documented before any reactivation request.
