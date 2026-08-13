# AI-06B Production Infrastructure Decision

## Decision status

This is a Stage B1 recommendation only. No provider resource, registry, bucket, scheduler, secret,
production environment variable, or production deployment was created or changed.

Recommended ML host: **Google Cloud Run, `asia-southeast1` (Singapore)**.

Selected security-boundary classification: **IAM_AUTHENTICATED_SERVER_TO_SERVER**. The default
Cloud Run URL is internet routable; disabling unauthenticated invocation does not make it
network-private. This document uses “private” only for storage/registry access or when describing
the application intent, never as a claim that the selected Cloud Run ingress is network-private.

Recommended initial resource:

- 1 vCPU;
- 4 GiB memory;
- minimum instances 1 and maximum instances 1;
- concurrency 1;
- second-generation execution environment;
- startup probe backed by `/health/ready` and liveness probe backed by `/health/live`;
- authenticated invocation only;
- immutable image digest and read-only model mount.

The 4 GiB choice is deliberately above the minimum. Against the AI-06A planning peak of about
1.53 GiB, it provides about 2.47 GiB (161%) headroom before provider/runtime overhead. This also
leaves room for Cloud Storage FUSE caches and a bounded inference request. Cloud Run documents
that 1 vCPU supports up to 4 GiB and supports startup, liveness, and readiness probes.

## Ranked matrix

| Rank | Provider/service | Suitable starting size | Security/networking | Operations | Estimated monthly cost | Decision |
|---|---|---|---|---|---:|---|
| 1 | Google Cloud Run | 1 vCPU, 4 GiB, min/max 1, concurrency 1 | Require IAM; Vercel OIDC to GCP Workload Identity Federation; application token remains a second layer | Native probes, restart/revision controls, Artifact Registry and private Cloud Storage | Approximately USD 40-55 for one continuously warm instance, excluding tax and unusually high logging/egress | Recommended |
| 2 | Railway service | At least 1 vCPU, 2 GiB; 4 GiB preferred | Railway private networking is not directly reachable from Vercel; a public token-protected endpoint or provider co-location is required | Simple container operations and restart policy | Usage-based; roughly USD 40/month at 1 vCPU + 2 GiB before plan/egress, higher with 4 GiB | Feasible, weaker cross-provider private boundary |
| 3 | Render web/private service | Standard 2 GiB/1 CPU minimum; 4 GiB/2 CPU preferred | Render private services are reachable only by other Render services; Vercel would require a public endpoint or architecture change | Managed probes/restarts | Must be confirmed in the provider calculator at approval time | Feasible, but cross-provider networking blocker |
| 4 | Vercel Services | Not selected | Service bindings are promising, but the product remains private beta and retains function/runtime limits | Platform fit is attractive but maturity/access is uncertain | Cannot be approved without beta access and an exact quote | Not recommended for this rollout |

Official references used for this decision:

- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits)
- [Cloud Run minimum instances](https://docs.cloud.google.com/run/docs/configuring/min-instances)
- [Cloud Run service health checks](https://docs.cloud.google.com/run/docs/configuring/healthchecks)
- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Vercel OIDC with GCP](https://vercel.com/docs/oidc/gcp)
- [Railway pricing](https://docs.railway.com/pricing)
- [Render private services](https://render.com/docs/private-services)
- [Vercel Services](https://vercel.com/docs/services)

## Cost basis

Using the published Cloud Run instance-based Tier 1 rates and approximately 2,628,000 seconds in
a 30.42-day month:

- CPU: `1 * 2,628,000 * USD 0.000011244` = about USD 29.55 gross;
- memory: `4 * 2,628,000 * USD 0.000001235` = about USD 12.98 gross;
- combined compute: about USD 42.53 gross before any applicable free tier;
- budget range: USD 40-55/month for compute, small registry/object storage, and ordinary logs.

This is an estimate, not a purchase authorization. Billing account, tax, committed use, logging,
egress, and current price calculator output must be approved immediately before provisioning.

## Container and registry plan

- Registry: private Artifact Registry Docker repository in Singapore.
- Repository setting: immutable tags.
- Planned tag: `wattwise-ai06b:<approved-ai06b-git-sha>`.
- Production authority: the published `sha256:` image digest, never `latest`.
- Current inherited local rehearsal image ID: `fb890396e38a`; it has no published registry digest.
- Dockerfile: the accepted AI-06A non-root image.
- No dataset, `.env`, checkpoint, production token, or database credential is included in the image.

Artifact Registry supports immutable tags and digest-addressed images; see
[repository and image names](https://docs.cloud.google.com/artifact-registry/docs/docker/names).

## Artifact delivery

Recommended source: a private, versioned Cloud Storage prefix mounted read-only at `/models`.
Only the Cloud Run service identity receives `roles/storage.objectViewer`. The prefix contains the
complete AI-02 package required by the existing inventory loader, including the frozen checkpoint,
manifest, configuration, and feature schema. It must be copied atomically into a new versioned
prefix and never overwritten in place.

Required authority:

- model version `nbeats-ai02-1.0.0`;
- artifact SHA-256 `541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6`;
- feature schema SHA-256 `0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4`.

The service must remain NOT_READY if any identity or checksum differs. Cloud Run supports native
read-only Cloud Storage mounts and documents their cache memory overhead; see
[Cloud Storage volume mounts](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts).

## Authentication and service boundary

The service should reject anonymous Cloud Run invocation. The selected design is two-layer auth:

1. Vercel OIDC is exchanged through GCP Workload Identity Federation for a short-lived Google ID
   token that is placed in `X-Serverless-Authorization` for Cloud Run IAM.
2. The existing application bearer token remains in `Authorization` and is checked by the Python
   inference service.

The current Next.js client sends only the application bearer token. A reviewed, tested WIF/ID-token
adapter is therefore a pre-deployment requirement after the provider is approved. No adapter or
credential was added during B1.

The network-private alternative would set Cloud Run ingress to internal and require a GCP-side
gateway/proxy, VPC connectivity, or application co-location because Vercel is not an accepted
internal source. It adds load-balancer/VPC operations, cost, latency, and failure modes without
removing the need for application authentication. It is not selected for the controlled-shadow MVP.

## Scheduler decision

Recommended scheduler: **Google Cloud Scheduler**, one HTTP job, every 10 minutes, invoking
`POST /api/internal/ai/shadow/run` with the existing server-only bearer contract.

Reasons:

- the Vercel team is currently on Hobby, whose documented minimum cron interval is once per day;
- 10 minutes is inside the requested conservative range without requiring a Vercel plan upgrade;
- one Cloud Scheduler job is inside its three-jobs-per-billing-account free allowance;
- the application already provides bounded 10-job/20-second processing and atomic claims, making
  at-least-once delivery and rare duplicate invocations safe;
- Cloud Scheduler provides attempt status and stable schedule-time/job headers for deduplication.

The job must be disabled initially. Its custom `Authorization` header contains a generated secret
of at least 32 bytes and may be read only by the smallest operator IAM group. The same value is
stored in Vercel only as `WATTWISE_AI_SCHEDULER_SECRET`. Do not use query-string credentials.

Cloud Scheduler allows custom HTTP headers and requires idempotent handlers because duplicate
invocations are possible. See [job management](https://docs.cloud.google.com/scheduler/docs/creating),
[HTTP target contract](https://docs.cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations.jobs),
and [pricing](https://cloud.google.com/scheduler/pricing).

Rejected scheduler default: Vercel Cron at 10 minutes. It is operationally simple and automatically
sends `CRON_SECRET`, but the current Hobby plan cannot deploy more than daily cadence. It remains a
valid alternative only after explicit Pro billing approval; see
[Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) and
[Cron secret management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Environment variable names

Application server only:

- `WATTWISE_AI_MODE`
- `WATTWISE_AI_SERVICE_URL`
- `WATTWISE_AI_SERVICE_TOKEN`
- `WATTWISE_AI_SCHEDULER_SECRET`
- `WATTWISE_AI_ALLOW_PRODUCTION_SHADOW`
- `WATTWISE_AI_PRODUCTION_SHADOW_APPROVED`
- `WATTWISE_AI_REQUEST_TIMEOUT_MS`
- `WATTWISE_AI_NBEATS_VERSION`
- `WATTWISE_AI_NBEATS_SHA256`
- `WATTWISE_AI_FEATURE_SCHEMA_SHA256`

Python ML service only:

- `WATTWISE_MODEL_ROOT`
- `WATTWISE_MODEL_ARTIFACT_SHA256`
- `WATTWISE_AI_SERVICE_TOKEN`
- `WATTWISE_AI_WORKER_TIMEOUT_MS`
- `WATTWISE_AI_WORKER_STARTUP_TIMEOUT_MS`

No value is recorded in Git. Effective mode remains `OFF` until the separately approved B2 window.
