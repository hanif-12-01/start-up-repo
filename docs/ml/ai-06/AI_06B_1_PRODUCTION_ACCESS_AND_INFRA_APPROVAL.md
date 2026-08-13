# WATTWISE AI-06B.1 Production Access and Infrastructure Approval

## Approval status

**NOT READY FOR STAGE B2 APPROVAL.** This package closes the reusable audit-tooling and
infrastructure-design work, but two P1 gates remain: an authorized production read-only database
result and current provider-authoritative backup/PITR evidence. No production mutation occurred.

## Authoritative Git and model freeze

- AI-06B.1 starting SHA: `2eb8e8c597965f0a51309b4a18c7d6403a8da312`
- Branch: `feature/ai-06b-1-prod-audit-closeout`
- Model: `nbeats-ai02-1.0.0`
- Artifact SHA-256: `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`
- Feature schema SHA-256: `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4`
- Retraining/model/artifact/schema/routing/deterministic changes: none

## Current production release and baseline

Vercel production target metadata identifies deployment `dpl_FmprgTMxKjJDH8yJDH9UvCQgdvXM`
and source Git SHA `8eca78a173c61251d300098c333198099ca87b26`, created 2026-08-10 and currently READY.

The public `/api/health/release` response reports
`ce7349b93b2737da165a1f7269abbf3987162df7`. Repository inspection proves that the production
source SHA uses this value as a fallback when Vercel Git environment variables are absent. The
deployment metadata SHA is therefore the authoritative deployed-source identity; the health field
is a stale fallback and must not be used alone for the Stage B2 stale-state guard.

Read-only checks on 2026-08-13:

- `/`, `/login`, `/register`: 200;
- `/electricity`, `/analysis`, `/dashboard`: 307 to `/login`;
- `/api/health`, `/api/health/live`, `/api/health/ready`: 200;
- readiness database status: `ok`, current-release compatibility: true;
- no authenticated session or production data mutation was used.

Production baseline health is PASS, with the release-health fallback discrepancy recorded as P2.

## Production read-only audit

The reusable command is `npm run ai:production:audit`. It requires only
`WATTWISE_PROD_READONLY_DATABASE_URL`; it never reads application `DATABASE_URL`. The implementation
uses two explicit `BEGIN READ ONLY` transactions, an eight-second statement timeout, effective
privilege checks, full schema signatures from repository migrations 0011-0014, aggregate-only
evidence/enrollment counts when authorized, safe host hashing, and two-run fingerprint comparison.

Disposable PostgreSQL validation proves:

- dedicated SELECT-only role: PASS;
- transaction read-only: PASS;
- full 0011-0014 signature: PASS;
- reproducible schema fingerprint: PASS;
- database owner/write role rejection: PASS;
- entity-level output: none;
- connection secret output: none.

No authorized production audit credential was supplied. The command correctly failed with
`WATTWISE_PROD_READONLY_DATABASE_URL_REQUIRED`; it did not fall back to Vercel or local credentials.
The operator SQL and access runbook provide the independent execution path.

## Actual production schema and migration delta

- Production schema fingerprint: **NOT AVAILABLE**
- 0011: **AMBIGUOUS / NOT AUDITED**
- 0012: **AMBIGUOUS / NOT AUDITED**
- 0013: **AMBIGUOUS / NOT AUDITED**
- 0014: **AMBIGUOUS / NOT AUDITED**
- Exact missing migrations: **UNKNOWN**
- Exact forward order: **UNKNOWN**
- Exact rollback order: **UNKNOWN**
- `ai_shadow_forecast` state/count: **NOT AUTHORIZED TO QUERY**
- enrollment state/count: **NOT AUTHORIZED TO QUERY**

Current health compatibility checks pre-AI columns only and cannot close this gate. Stage B2 must
not apply any candidate migration until two matching sanitized production audit results exist.

## Backup and recovery

Current application code and historical sanitized evidence identify Neon as the provider candidate.
Historical evidence also records a successful Neon branch recovery rehearsal on 2026-08-05. The
current Vercel variable is manually configured and does not expose a provider resource identity,
so current project PITR/retention cannot be independently proven from Vercel.

- Provider-authoritative verification: FAIL / unavailable
- Current PITR: UNKNOWN
- Current retention: UNKNOWN
- Recovery ready before migration: NO

Required operator evidence is defined in `production-backup-recovery-evidence.md`. This remains P1.

## ML hosting and resource decision

- Provider/service: Google Cloud Run service
- Region: `asia-southeast1` (Singapore)
- CPU: 1 vCPU
- Memory: 4 GiB
- Min/max instances: 1/1
- Concurrency: 1
- Execution environment: second generation
- Probes: `/health/ready` startup; `/health/live` liveness
- Local planning peak: approximately 1.53 GiB
- Memory headroom: approximately 2.47 GiB, or 161% above the planning peak

Current Cloud Run documentation supports this resource combination and health-check design. A
smaller memory limit is not selected to reduce cost.

## Security boundary

Selected classification: **IAM_AUTHENTICATED_SERVER_TO_SERVER**.

- Internet routable: YES
- Unauthenticated Cloud Run invocation: NO
- TLS: required
- Browser invocation: prohibited
- Cloud Run IAM ID token: required
- Application bearer validation: required as a second layer
- Static GCP service-account JSON key: not required

This is not a network-private endpoint. A genuinely network-private design would require internal
ingress plus a GCP-side proxy/gateway, VPC connectivity, or provider co-location because Vercel is
external. That adds cost and operational complexity and is not selected for the controlled MVP.

### Vercel OIDC to GCP WIF design

Caller identity and service identity remain separate:

1. Vercel runtime obtains its short-lived team-mode OIDC token.
2. GCP WIF trusts issuer `https://oidc.vercel.com/clara3` and allowed audience
   `https://vercel.com/clara3`.
3. Attribute mapping uses `google.subject=assertion.sub` and maps immutable owner/project/environment
   claims for the provider condition.
4. Trust is restricted to subject
   `owner:clara3:project:start-up-repo:environment:production`, project ID
   `prj_FqOTbaBJWz36siphkcO2uZ4VeEE2`, owner ID
   `team_znKVthxU4i1W00hhlJuWuRVy`, and environment `production`.
5. That principal may impersonate only a dedicated caller service account.
6. The caller service account receives `roles/run.invoker` only on the one Cloud Run service.
7. The request sends the Google ID token in `X-Serverless-Authorization` and the application token
   in `Authorization` so both boundaries are independently enforced.
8. The Cloud Run service identity—not Vercel—receives read-only access to the model bucket.

No pool, provider, service account, IAM binding, environment variable, or adapter was created.
The exact adapter remains B2 implementation work after provider/security approval, with tests and
safe failure when identity exchange is unavailable.

## Artifact and image supply chain

- Artifact: private versioned Cloud Storage prefix, read-only mount at `/models`;
- service identity: Storage Object Viewer only;
- frozen SHA verified before READY;
- no mutable `latest` artifact authority;
- Artifact Registry: Singapore regional private repository with immutable tags;
- tag: approved final Git SHA;
- production authority: image digest;
- checkpoint/secret/dataset in Git or image: NO.

No registry, bucket, object, or image was provisioned or published.

## Scheduler

- Provider: Google Cloud Scheduler
- Cadence: every 10 minutes
- Target: HTTPS POST `/api/internal/ai/shadow/run`
- Authentication: server-only bearer secret, minimum 32 bytes
- Initial state: disabled
- Batch bounds: default 10 jobs/20 seconds; hard 25 jobs/25 seconds
- Delivery: at least once; atomic claim/idempotent processing required
- Observability: provider attempt status plus aggregate application monitoring

The Vercel project remains Hobby and has no cron definitions. Its supported cron cadence cannot
meet 10 minutes. One Cloud Scheduler job is inside the published three-job free allowance, subject
to the operator's billing account usage.

## Planning cost

Using current Singapore instance-based rates and one continuously warm 1 vCPU/4 GiB instance:

- Cloud Run gross compute: approximately USD 42.53/month before applicable free-tier discount;
- Cloud Run planning low: USD 39/month after the published free-tier allowance if available;
- Artifact Registry: approximately USD 0-1/month for the inherited large container, depending on
  account free allowance and final image size;
- model Cloud Storage: under USD 0.10/month at current artifact size plus negligible operations;
- one Cloud Scheduler job: USD 0 if the account's three-job allowance remains available, otherwise
  USD 0.10/month;
- ordinary logging/egress allowance: USD 0-5/month planning reserve;
- expected total: USD 43-50/month;
- safe monthly approval budget: USD 60/month.

This is not a final invoice or billing approval. Re-run the provider calculator immediately before
provisioning.

## Cohort and rollback

Recommended first cohort remains one explicitly approved REAL_WATTWISE production business with
six or more contiguous completed periods, valid owner relationship, N-BEATS eligibility, and no
QA/demo classification. No business is selected and no ID is committed.

Rollback containment remains: effective AI OFF, scheduler disabled, affected cohort disabled, then
database rollback only if justified and only for migrations actually applied. Because the exact
migration delta is unknown, no exact database rollback list is approved yet.

## Human decisions still required

Do not approve Stage B2 until the operator provides:

1. two matching read-only production audit results and schema fingerprint;
2. exact missing migrations/forward/rollback order;
3. current provider-authoritative backup/PITR/retention evidence;
4. acceptance of Google Cloud Run and USD 60/month budget ceiling;
5. acceptance of IAM-authenticated internet-reachable server-to-server ingress;
6. acceptance of OIDC/WIF claim restrictions and two-layer authentication;
7. acceptance of artifact/registry design and Google Cloud Scheduler;
8. exact operator-local cohort and activation window.

Even after these decisions, a separate explicit Stage B2 authorization is mandatory.
