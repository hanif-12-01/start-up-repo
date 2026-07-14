# WattWise standard monthly electricity panel

Status: IT-ML-02A discovery specification. No production pipeline implements this schema yet.

## Grain and keys

One row represents one source-scoped entity and one calendar month. The logical key is `(dataset_source, entity_id, period_month)`. `entity_id` must be a stable source identifier or a one-way project-local surrogate; it must never contain a customer name, address, meter serial number, or other direct identifier. `period_month` is the first calendar day in `YYYY-MM-01` form after timestamps have been interpreted in `source_timezone`.

`usage_kwh` is electricity imported or consumed during the month. Export, on-site generation, reactive energy, gas, water, heat, and non-electric meter streams must remain separate and must not be silently added to it.

## Canonical columns

| # | Column | Type | Required | Definition |
|---:|---|---|---|---|
| 1 | `dataset_source` | string | yes | Stable catalog ID, for example `goiener` or `bdg2`. |
| 2 | `entity_id` | string | yes | Stable, source-scoped pseudonymous entity. |
| 3 | `period_month` | date | yes | Month start in local calendar time. |
| 4 | `usage_kwh` | decimal | yes | Audited monthly electricity energy. |
| 5 | `entity_type` | string/null | preferred | Household, building, supply point, meter, or business. |
| 6 | `business_type` | string/null | preferred | Source-provided business category; never inferred into ground truth. |
| 7 | `building_type` | string/null | preferred | Source-provided building or primary-use category. |
| 8 | `tariff_per_kwh` | decimal/null | preferred | Currency-unit price per kWh for the row, only when directly available. |
| 9 | `country` | string/null | preferred | ISO country name/code at the source-supported precision. |
| 10 | `region` | string/null | preferred | Coarsened region; no precise household address. |
| 11 | `floor_area` | decimal/null | preferred | Area with a separately documented unit, normalized to square metres downstream. |
| 12 | `occupancy` | decimal/null | preferred | Source-provided resident/design occupancy count. |
| 13 | `appliance_category` | string/null | preferred | Category when the row represents or is joined to an appliance stream. |
| 14 | `operating_hours` | string/null | preferred | Source-provided schedule or derived schedule with method recorded. |
| 15 | `temperature_mean` | decimal/null | preferred | Monthly mean outdoor temperature in degrees Celsius. |
| 16 | `temperature_min` | decimal/null | preferred | Monthly minimum outdoor temperature in degrees Celsius. |
| 17 | `temperature_max` | decimal/null | preferred | Monthly maximum outdoor temperature in degrees Celsius. |
| 18 | `humidity_mean` | decimal/null | preferred | Monthly mean relative humidity in percent. |
| 19 | `source_timezone` | string | yes | IANA zone, fixed offset, UTC, or source-documented local-time convention. |
| 20 | `source_granularity` | string | yes | Billing month, day, hour, 30-minute, 15-minute, minute, or seconds. |
| 21 | `observation_count` | integer | yes | Source observations used in the monthly value. |
| 22 | `expected_observation_count` | integer | yes | Expected observations for that local month after DST rules. |
| 23 | `coverage_ratio` | decimal | yes | `observation_count / expected_observation_count`, capped only after duplicate audit. |
| 24 | `missing_ratio` | decimal | yes | Missing expected intervals divided by expected intervals before imputation. |
| 25 | `imputed_ratio` | decimal | yes | Imputed intervals divided by expected intervals. |
| 26 | `has_gap` | boolean | yes | True when one or more missing runs occur before imputation. |
| 27 | `consecutive_month_index` | integer | yes | One-based index within the current consecutive usable-month run. |
| 28 | `unit_conversion_method` | string | yes | Named conversion rule and source field. |
| 29 | `quality_flag` | string | yes | `PASS`, `PARTIAL`, `IMPUTED`, `STRUCTURAL_ZERO`, `OUTLIER`, or `EXCLUDE`. |
| 30 | `license_classification` | string | yes | Catalog legal gate copied into every materialized source partition. |

Unavailable metadata is `null`. Values must not be filled from stereotypes, category averages, or another source and represented as observed truth.

## Unit conversion registry

| Source semantics | Monthly conversion | Required audit |
|---|---|---|
| Interval energy in kWh | Sum valid interval kWh. | Confirm interval represents energy, remove duplicate timestamps, and retain coverage. |
| Interval-average kW | `interval_kwh = power_kw * interval_hours`; then sum. | Use actual elapsed interval; do not assume nominal duration across gaps. |
| Interval-average W | `interval_kwh = watts * elapsed_seconds / 3,600,000`; then sum. | Confirm readings are interval averages rather than instantaneous samples. |
| Cumulative kWh register | Difference consecutive valid registers; aggregate positive deltas. | Detect resets, rollovers, meter replacement, and negative deltas. |
| Billing-period kWh | Allocate only when billing period equals a calendar month, or retain separately. | Do not prorate across months without an explicit, labeled method. |

Source-specific rules selected in IT-ML-02A:

- GoiEner: hourly interval energy is already kWh; sum non-imputed valid hours. Preserve the published `imputed` flag and fixed-local-time/DST convention.
- Building Data Genome 2: hourly energy columns are `kWh_sum`; sum electricity only. Use the v1.0 corrected raw/cleaned files, not the Kaggle unit variants.
- London: each half-hour value is interval kWh; sum it directly. Join the tariff schedule by effective timestamp before monthly aggregation.
- HEAPO: prefer the publisher-provided monthly difference of cumulative kWh. Independently reconcile against summed 15-minute kWh where coverage permits; meter streams for heat pump and other load must be summed once, not double-counted with total.
- UCI ElectricityLoadDiagrams: values are 15-minute average kW; `interval_kwh = value / 4`. Treat pre-connection padded zeros as structural missing history, not true zero consumption.
- REFIT: cleaned values are 8-second average watts; integrate using actual timestamp deltas, nominally `watts * 8 / 3,600,000`. Do not sum watt readings directly.

## Timezone and daylight-saving policy

Parse in the documented source timezone first, then derive the local calendar month. UTC storage may be added, but it must not change local month membership. Expected counts must reflect 23-hour and 25-hour days where the source preserves DST. Source-specific anomalies are retained in audit fields rather than normalized silently.

- UCI documents Portuguese DST padding/aggregation: spring missing-hour values are zero and autumn repeated-hour values are aggregated.
- London timestamps require validation against the source convention; do not infer GMT/BST behavior from machine locale.
- BDG2 timestamps and weather are local to each site; use its metadata timezone.
- HEAPO is UTC.
- GoiEner's processed release intentionally uses local time without DST and fills/averages transition anomalies; preserve its `imputed` audit flag.
- REFIT timezone is UK local time unless a file-level readme establishes UTC for the chosen archive.

## Monthly eligibility and gap policy

A provisional month is usable when timestamps and units are valid, no unresolved meter reset exists, and `coverage_ratio >= 0.90`. Months from cumulative billing-quality registers may pass when endpoint reconciliation proves the monthly delta even if interval profiles are incomplete. Never impute a target month used for scoring. Training-time imputation is allowed only when the method uses information available at the forecast origin and `imputed_ratio` is retained.

Consecutive history breaks on an excluded month. Structural pre-connection zeros, unresolved negative deltas, and duplicate-conflict months are excluded. Extreme values are flagged using source/entity-aware robust rules and are not deleted automatically.

## Phase and rolling-origin reproduction

For a consecutive run containing `m` usable monthly values, each target month is assigned the number of earlier months available at that origin. It contributes once to exactly one phase:

```text
PHASE_INITIAL  = min(m, 3)                       # histories 0, 1, 2
PHASE_MIDDLE   = max(min(m - 3, 3), 0)          # histories 3, 4, 5
PHASE_ADVANCED = max(min(m - 6, 7), 0)          # histories 6..12
PHASE_LONG     = max(m - 13, 0)                 # histories 13+
```

The history-0 example is eligible for a cold-start evaluation only when features available before the target month exist. It is never a personalized time-series forecast. The target month and any later observation are excluded from inputs. Splits are temporal rolling-origin splits; random row splitting is prohibited.

## Leakage controls

- Fit scalers, imputers, encoders, outlier thresholds, and entity aggregates on the training fold only.
- Do not expose a target month's bill, cumulative closing register, post-visit label, future weather observation, or future tariff outcome at forecast time.
- For HEAPO, `AffectsTimePoint`, visit outcomes, and post-intervention protocol fields are analysis labels, not pre-origin features.
- For GoiEner, imputation that copies a future or post-origin value is not allowed in benchmark input windows; prefer raw series or recompute fold-safe imputations.
- Preserve `dataset_source`; report source-specific metrics and never assume cross-source units or populations are exchangeable.
