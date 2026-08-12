# WATTWISE AI-05.2 Prospective Evidence Reachability Closeout

## Corrected evidence lifecycle

The former rule required a forecast before the target month began while completed monthly
history required the prior inclusive `period_end` to have passed. For adjacent full-calendar
months, no valid forecast date could satisfy both constraints.

AI-05.2 retains the safe history rule and corrects only prospective classification. WattWise
uses the `Asia/Jakarta` application calendar. A new forecast is prospective when all conditions
hold:

```text
history_temporal_integrity = true
target_outcome_unknown_at_forecast = true
target_start <= forecast_origin local date <= target_end
```

The application proves target outcome absence using a same-business bill-overlap query. Target
and future records remain excluded from ML history, fingerprint, payload, request identity, and
the frozen application-deterministic evidence snapshot.

## Audit and scoring integrity

Migration `0013_ai_shadow_prospective_reachability.sql` adds conservative audit fields:

- `target_outcome_unknown_at_forecast`, default `false` for existing records;
- `forecast_days_into_target`, `NULL` for existing/out-of-window records.

Timing is aggregatable as `DAY_0_1`, `DAY_2_7`, or `DAY_8_PLUS` without changing model routing.
Promotion-grade evidence additionally requires an accepted actual observed strictly after the
forecast origin. Later corrections re-score against immutable original ML and deterministic
predictions.

The integration acceptance test exercises completed February–July history, August day-zero
enqueue, a valid mocked N-BEATS v2 response, later August actual reconciliation, promotion
query inclusion, and corrected-actual re-scoring. Migration `0013` is rehearsed forward,
rollback, and reapply on disposable PostgreSQL.

## Remaining limitations and scope freeze

- Controlled `REAL_WATTWISE` classification governance remains a later rollout responsibility.
- Timing buckets are evidence segments only; no accuracy superiority is claimed.
- NO RETRAINING
- NO MODEL CHANGE
- NO FEATURE SCHEMA CHANGE
- NO ROUTING CHANGE
- NO DETERMINISTIC ALGORITHM CHANGE
- NO USER-FACING ML
- NO DEPLOYMENT
- NO PRODUCTION DATABASE ACCESS
