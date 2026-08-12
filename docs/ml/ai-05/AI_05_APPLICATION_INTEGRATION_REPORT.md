# WATTWISE AI-05 Application Integration

## Safety boundary

AI-05 integrates the frozen `nbeats-ai02-1.0.0` package behind a private, authenticated
`/v2/forecast` service. The customer-facing application remains fully deterministic. ML is
never called from React or the browser and never supplies the application's fallback.

The selected background strategy is a durable PostgreSQL outbox. Saving an accepted bill
calculates the application deterministic forecast and writes an idempotent shadow job in the
same transaction. A separate processor claims work with `FOR UPDATE SKIP LOCKED`; it retries
temporary failures, reclaims stale leases, and clears raw transient history after a terminal
result. This avoids unreliable serverless fire-and-forget work and cold model load on the user
request path.

## Context mapping audit

| AI field | Application source | Status | Justification |
| --- | --- | --- | --- |
| `dataset_source` | accepted WattWise bill history | DERIVED_SAFE | Fixed to `wattwise_real` for application-origin records; evidence provenance remains separately enforced. |
| `business_type` | `business.business_type` | DIRECT | Same categorical business concept. |
| `timezone` | none | UNAVAILABLE_NULL | No accepted canonical business timezone field. |
| `building_area` | none | UNAVAILABLE_NULL | No accepted semantically equivalent area field. |
| `building_primary_use` | none | FORBIDDEN_TO_FABRICATE | Laravel/benchmark labels are not equivalent application data. |
| `site` | none | FORBIDDEN_TO_FABRICATE | BDG2/London site identity must never be invented. |
| `profile_eligible` | none | UNAVAILABLE_NULL | Sent as false; no application eligibility classifier exists. |

## Evidence boundary

Only forecasts labeled `REAL_WATTWISE`, created before the target month, paired with an actual
`USER_ENTERED` or `METER_DERIVED` observation, and containing both ML and WattWise deterministic
predictions may enter future product-accuracy aggregation. QA/demo provisioning is explicitly
`SYNTHETIC_DEMO`; unclassified businesses fail closed to synthetic evidence.

## Readiness semantics

- Technical application integration: eligible after all AI-05 gates pass.
- Controlled production shadow: requires independent QC and separate configuration approval.
- User-facing ML: not approved.
- Production ML: not approved.

No model training, tuning, routing change, production deployment, production database access,
or production environment activation was performed in AI-05.
