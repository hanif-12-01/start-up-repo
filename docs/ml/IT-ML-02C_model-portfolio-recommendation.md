# IT-ML-02C — Model Portfolio Recommendation

Audit date: 2026-07-18 (Asia/Jakarta)

Evidence run: `full-final-v2-recovered-01`

Decision status: **RESEARCH PORTFOLIO ONLY — NOT PRODUCTION-READY**

## Recommendation

The recovered four-model research portfolio is:

1. `deterministic_baseline` — mandatory fallback and H01_02 route.
2. `nbeats` — H06_12 and H13_PLUS route.
3. `lightgbm` — H00 and H03_05 route.
4. `ridge` — highest remaining composite-score member after fallback and routing needs.

This is a benchmark recommendation only. No model is approved for Laravel integration or
production use in this task.

## Selection methodology

| Component | Weight | Raw basis |
|---|---:|---|
| accuracy | 0.50 | lower-is-better WMAPE on seen-entity observation keys shared by every gate-passing model/seed unit |
| stability | 0.20 | one minus capped coefficient of variation of common-cohort seed WMAPE |
| coverage | 0.10 | successful reporting phases divided by five; H00 and H01_02 are separate |
| cost | 0.10 | normalized log latency, peak memory, and artifact-size scores |
| readiness | 0.10 | 1.0 for deterministic/ridge/gradient boosting; 0.5 otherwise |

The hard failure-rate gate is 5%; all seven models pass with zero recovered failures.
Micro averages are calculated directly over prediction rows. Macro averages are
unweighted means over dataset/phase/subgroup/track/seed metric cells. Selection-scope,
eligible, common-cohort, and full-run counts are reported separately.

## Full model leaderboard

| Rank | Model | Composite | Micro WMAPE | Macro-cell WMAPE | Coverage | Success / total | Common observations | Gate |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | deterministic baseline | 0.9057 | 0.2202 | 0.1739 | 4/5 | 10,287 / 17,148 | 8,268 | PASS |
| 2 | ridge | 0.8575 | 0.3761 | 0.3620 | 5/5 | 51,438 / 51,444 | 8,268 | PASS |
| 3 | gradient boosting | 0.7858 | 0.4033 | 0.4820 | 5/5 | 51,438 / 51,444 | 8,268 | PASS |
| 4 | N-BEATS | 0.7805 | 0.1773 | 0.1489 | 2/5 | 28,500 / 51,444 | 8,268 | PASS |
| 5 | LightGBM | 0.7357 | 0.3294 | 0.2038 | 5/5 | 51,438 / 51,444 | 8,268 | PASS |
| 6 | DeepAR | 0.7226 | 0.2289 | 0.1781 | 2/5 | 28,500 / 51,444 | 8,268 | PASS |
| 7 | CatBoost | 0.3889 | 0.6393 | 0.9861 | 5/5 | 51,438 / 51,444 | 8,268 | PASS |

Composite rank alone does not define the portfolio. The mandatory deterministic fallback
is selected first, product-routing coverage is then satisfied, and remaining capacity is
filled by composite score. This is why N-BEATS and LightGBM are selected ahead of some
higher composite ranks.

## Phase and routing decisions

| Reporting phase | Phase champion | Common-cohort champion | Product route | Successful prediction rows | Common observations |
|---|---|---|---|---:|---:|
| H00 | LightGBM | LightGBM | LightGBM | 20,577 | 6,859 |
| H01_02 | deterministic baseline | deterministic baseline | deterministic baseline | 373 | 373 |
| H03_05 | LightGBM | LightGBM | LightGBM | 1,242 | 414 |
| H06_12 | N-BEATS | N-BEATS | N-BEATS | 2,091 | 697 |
| H13_PLUS | N-BEATS | N-BEATS | N-BEATS | 26,409 | 8,803 |

These labels are distinct even where the same model wins all three decisions. The H00
cohort contains no deterministic, N-BEATS, or DeepAR predictions; deterministic baseline
is therefore not described as an H00 champion. N-BEATS and DeepAR receive coverage credit
only for H06_12 and H13_PLUS.

## Portfolio inclusions and exclusions

| Model | Selection count | Reason |
|---|---:|---|
| deterministic baseline | 1 | mandatory fallback; H01_02 route; highest composite score |
| N-BEATS | 1 | H06_12 and H13_PLUS routing recommendation |
| LightGBM | 1 | H00 and H03_05 routing recommendation |
| ridge | 1 | highest remaining composite score |
| gradient boosting | 0 | portfolio capacity after fallback, routing coverage, and composite priority |
| DeepAR | 0 | portfolio capacity after fallback, routing coverage, and composite priority |
| CatBoost | 0 | portfolio capacity after fallback, routing coverage, and composite priority |

The selected set and `selection_count` now reconcile exactly in
`model-leaderboard.csv`, the JSON model leaderboard, and the four portfolio records.
Every exclusion has an explicit reason; none is presented as a gate failure.

## Paired comparison evidence

`paired-comparisons.csv` contains 180 rows based on shared stable observation keys:
`example_id`, track, reporting phase, and target period. Each trainable model/seed is
compared with deterministic seed 0 only on examples both evaluated successfully.

- 120 comparisons are `OK` and use paired observation bootstrap mean absolute error
  with 500 resamples and a minimum paired sample of 30.
- 60 are `NO_COMMON_COHORT`, principally H00 where deterministic has no successful
  predictions; each row carries an explicit reason.
- Paired sample sizes range from 0 to 7,652.
- The CI classification counts are 66 `BASELINE_LOWER_MAE`, 17 `MODEL_LOWER_MAE`,
  37 `NO_DETECTED_DIFFERENCE`, and 60 `NOT_TESTED`.

These labels describe the configured bootstrap interval output. This report does not make
an additional statistical-significance claim beyond those recorded comparison results.

## DeepAR result and calibration limitation

DeepAR has 51,444 total rows: 28,500 eligible/successful, 22,944 minimum-context skips,
and zero failures. Both tracks, seeds 17/29/43, H06_12, and H13_PLUS are covered. Every
point and 80%/95% interval is finite, ordered, and nonnegative. The zero-valued target
support failure is resolved without modifying ground truth or history.

DeepAR was excluded from the four-model portfolio by portfolio capacity after the
mandatory fallback, routing coverage, and composite-score priorities were applied.
Separately, empirical coverage is only 54.25% for the nominal 80% interval and 72.70%
for the nominal 95% interval. This undercoverage was not an implemented selection gate,
but it independently blocks any claim that DeepAR is calibrated or production-ready.

## Operational interpretation

- Keep the deterministic baseline mandatory wherever a model route is unavailable or a
  future gate fails.
- Treat H00 separately from H01_02; never substitute an invented lag/history value.
- Do not route N-BEATS or DeepAR to H00, H01_02, or H03_05.
- Revalidate any proposed deployment on a held-out operational cohort, latency envelope,
  monitoring plan, and calibrated uncertainty requirements.
- BDG2 remains **PARTIAL — BDG2 PROVENANCE REVIEW REQUIRED**; GoiEner remains blocked
  pending licence clarification.

No portfolio member was activated in Laravel. No deployment, GitHub write, PR, merge, or
production-readiness approval is part of this recommendation.
