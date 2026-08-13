# WATTWISE AI-06B
## Controlled Production Shadow Deployment Report

Stage B1 infrastructure and rollout planning is prepared, but the mandatory production schema
audit could not be completed because the sensitive production database credential is not
available through the authenticated Vercel CLI. The migration state is not guessed. No Stage B2
action was performed.

### A. Git

- Starting SHA: `a70b2296754fa37839635d241003be93d4f9e8e5`
- Branch: `feature/ai-06b-production-shadow`
- Starting working tree: clean
- PR: none
- Merge: none
- Production deployment changed: no
- Observed production deployment SHA: `ce7349b93b2737da165a1f7269abbf3987162df7`

### B. Model Freeze

- N-BEATS version: `nbeats-ai02-1.0.0`
- Artifact SHA: `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`
- Feature schema SHA: `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4`
- Retraining: NO
- Model changed: NO
- Artifact changed: NO
- Feature schema changed: NO
- Routing changed: NO
- Deterministic changed: NO

### C. Infrastructure Decision

- ML hosting provider/service: recommended Google Cloud Run, `asia-southeast1`
- Resource configuration: 1 vCPU, 4 GiB, min/max 1, concurrency 1
- Memory limit: 4 GiB
- Estimated monthly cost: USD 40-55 plus tax/unusual logging or egress
- Container image: accepted AI-06A Dockerfile; planned immutable AI-06B Git-SHA tag
- Image digest: NOT AVAILABLE — publication was not authorized
- Artifact source: private versioned Cloud Storage prefix mounted read-only
- Artifact checksum verified: PASS in inherited local AI-06A rehearsal; NOT YET on cloud host
- Scheduler: recommended Google Cloud Scheduler HTTP job
- Scheduler cadence: every 10 minutes, initially disabled
- Private service: DESIGN PASS; NOT PROVISIONED

The detailed matrix, cost basis, IAM/WIF design, artifact plan, scheduler selection, and official
references are in `production-infrastructure-decision.md`.

### D. Production Preflight

- Production domain: `https://start-up-repo.vercel.app`
- Vercel project: `start-up-repo`, region `sin1`
- Production release: `ce7349b93b2737da165a1f7269abbf3987162df7`
- Homepage: 200
- Login: 200
- Register: 200
- Electricity route: protected redirect to login
- Analysis route: protected redirect to login
- Dashboard route: protected redirect to login
- Health/live: PASS
- Health/ready: PASS; database `ok`, current-release schema compatibility true
- Authentication smoke: PARTIAL PASS — public forms and protected redirects only; no production
  user/session mutation was attempted
- Deterministic authority: PASS by release inspection; the deployed SHA contains no AI service,
  `/v2/forecast`, or AI shadow integration references
- Browser ML calls: 0 expected; current production release has no ML integration
- Production baseline health: PASS for non-mutating routes and health checks
- Production schema audited read-only: FAIL/BLOCKED
- Starting migration state: UNKNOWN
- Required migrations: UNKNOWN until read-only database access
- Backup/recovery available: UNKNOWN
- Rollback plan ready: YES

Vercel production environment variable names were inventoried without values. `DATABASE_URL` is
present but sensitive. No AI-05/AI-06 environment variable name is configured, so effective AI mode
is OFF/unset and pre-activation ML calls remain zero.

### E. Production Migration

- Applied migrations: none
- Forward: NOT RUN
- Schema verification: BLOCKED
- Unexpected data mutation: NO

`production-migration-evidence.md` records the failed-safe audit boundary, exact unblock, catalog
checks, all possible conditional deltas, expected object changes, and rollback order. No branch of
that conditional plan is labeled as the actual production delta.

### F. ML Service Deployment

- health/live: PASS local inherited; NOT DEPLOYED production
- health/ready: PASS local real artifact inherited; NOT DEPLOYED production
- Model version: PASS local inherited
- Artifact checksum: PASS local inherited
- Feature schema: PASS local inherited
- Worker startup: approximately 40,000 ms local
- Steady RSS: approximately 1.321 GiB local
- Highest observed memory: approximately 1.422 GiB local; 1.53 GiB planning peak retained
- Warm p95: 292.202 ms local
- Restart loop: NO local; NOT OBSERVED production
- Graceful stop: PASS local, exit 0 in approximately 5,616 ms

No image was published and no service was provisioned.

### G. Production Application

- Application deployed by AI-06B: NO
- Mode before activation: OFF/unset
- Deterministic parity before activation: PASS by deployed-release inspection and safe route smoke
- Browser ML calls: 0 expected
- Unexpected 5xx: 0 in routes checked

### H. Scheduler

- Configured: NO
- Initially disabled: N/A, no job exists
- Authenticated: DESIGN ONLY
- First bounded run: NOT RUN
- Claimed/succeeded/retryable/fallback: NOT AVAILABLE

The Vercel team plan was verified as Hobby. Vercel documents that Hobby cron jobs can run only
once per day, so it cannot satisfy the recommended 10-minute cadence without a separately approved
upgrade. Google Cloud Scheduler is recommended instead; it supports one conservative 10-minute
HTTP job using the existing bounded and idempotent route.

### I. Controlled Cohort

- Recommended cohort size: 1
- Exact approved cohort: none
- Enrolled: 0
- QA/demo included: NO
- Sensitive-attribute selection: NO
- Cohort IDs committed: NO

After database access and explicit approval, the operator-local candidate must be a real owned
business, not QA/demo, have at least six contiguous completed periods, be prospectively eligible,
and have independently approved REAL_WATTWISE provenance. No ID may enter Git or this report.

### J. Shadow Activation

- `WATTWISE_AI_MODE`: OFF/unset
- Production dual gate: NOT ENABLED
- Scheduler enabled: NO
- User-facing ML: NO
- Application deterministic authority: YES

### K. First Live Observation Window

Not started. All production observation metrics are `NOT AVAILABLE`. No empty or synthetic window
is represented as real production evidence.

### L. Production Monitoring

Not started. ML service, outbox, backlog, production p95, and alert state are `NOT AVAILABLE`.

### M. Real Evidence

- REAL_WATTWISE enrolled businesses: 0 by AI-06B action; actual pre-existing table state UNKNOWN
- Prospective/successful/awaiting/paired counts: NOT QUERIED
- Evidence tier: NOT AVAILABLE
- REAL_WATTWISE production MAE: NOT AVAILABLE

### N. Kill Switches

- Global kill switch: VERIFIED BY CODE/LOCAL TEST EVIDENCE; NOT MUTATED production
- Production dual gate: VERIFIED BY CODE/LOCAL TEST EVIDENCE; NOT MUTATED production
- Cohort kill switch: VERIFIED BY CODE/LOCAL TEST EVIDENCE; NOT MUTATED production

The containment sequence and conditional database rollback are documented in
`production-rollback-evidence.md`.

### O. Security

- ML service private: DESIGN PASS; NOT PROVISIONED
- Scheduler secret private: DESIGN PASS; NOT CREATED
- ML token private: DESIGN PASS; NOT CREATED
- Artifact credential private: DESIGN PASS; NOT CREATED
- PII in monitoring/report: NO
- Secrets committed: NO
- Business IDs committed: NO

### P. Findings

- P0: 0
- P1: 1
- P2: 1

P1-01 — The exact production PostgreSQL schema, migration state, enrollment state, and backup/PITR
status cannot be audited with the credentials currently exposed to this workspace. Migration state
guessing is explicitly forbidden, so Stage B1 cannot be declared complete and no B2 approval can
be actioned.

P2-01 — The recommended Cloud Run IAM boundary requires a reviewed Vercel OIDC/GCP WIF identity
token adapter before deployment. It is deliberately not implemented until the provider/security
design receives explicit approval.

### Q. Final Decision

- MODEL_FROZEN: YES
- PRODUCTION_SCHEMA_READY: NO
- PRIVATE_ML_SERVICE_READY: NO
- PRODUCTION_SCHEDULER_READY: NO
- CONTROLLED_COHORT_READY: NO
- PRODUCTION_SHADOW_ACTIVE: NO
- DETERMINISTIC_USER_EXPERIENCE_PRESERVED: YES
- MONITORING_HEALTHY: NOT STARTED
- REAL_EVIDENCE_COLLECTION_STARTED: NO
- SECURITY_GATE_PASS: NO — production service is not provisioned or verified
- P0_COUNT: 0
- P1_COUNT: 1
- AI_06B_COMPLETE: NO
- CONTROLLED_PRODUCTION_SHADOW_STABLE: NO
- READY_FOR_REAL_EVIDENCE_ACCUMULATION: NO
- READY_FOR_COHORT_EXPANSION: NO
- READY_FOR_PROMOTION_REVIEW: NO
- READY_FOR_USER_FACING_ML: NO
- READY_FOR_PRODUCTION_ML: NO

## Prepared B2 order (not authorized)

1. Approve an activation window, provider/SKU/cost, artifact design, scheduler, exact migration
   delta, and operator-local cohort.
2. Revalidate Git SHA, production release, database schema, and backup/PITR.
3. Apply only the verified missing migrations while effective AI mode remains OFF.
4. Deploy the accepted application revision with AI still OFF and repeat deterministic smoke.
5. Publish the immutable container, record its digest, provision the IAM-protected ML service, mount
   the artifact read-only, and require READY plus all frozen identities.
6. Create the scheduler disabled and verify its server-only authentication.
7. Dry-run and enroll exactly one approved opaque business outside Git.
8. Enable both production approval flags and SHADOW mode, then enable the scheduler.
9. Run one bounded batch, inspect aggregate monitoring, and verify zero user-visible change.
10. Continue the approved observation window or immediately execute the global kill switch.

Explicit operator approval is required before provisioning paid infrastructure, production
migrations, environment changes, production enrollment, or shadow activation.

AI-06B BLOCKED
— GLOBAL SHADOW KILL SWITCH REQUIRED BEFORE ANY FUTURE INCIDENT RESPONSE
— USER-FACING DETERMINISTIC REMAINS AUTHORITATIVE
— DO NOT EXPAND COHORT
— DO NOT ENABLE USER-FACING ML
— P1 BLOCKER: AUTHORIZED READ-ONLY PRODUCTION SCHEMA AND BACKUP/PITR EVIDENCE IS UNAVAILABLE
