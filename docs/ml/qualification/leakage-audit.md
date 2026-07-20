# Leakage Audit — Pre-Existing Evidence Summary

**Status:** Documents existing evidence from recovered benchmark run `full-final-v2-recovered-01`.
No newly executed full leakage audit was performed during this qualification branch.

**Source run:** `full-final-v2-recovered-01` (2026-07-18)
**Evaluation code:** `ml/benchmark/src/wattwise_benchmark/`
**Quality audit gate:** `quality_audit.status = "PASSED"` in recovered-run-audit.json

---

## 1. Chronological Seen-Entity Split

`splits/rolling.py:validate_split_isolation()` enforces strict temporal ordering:
- `train.max < validation.min < test.min` for every dataset source
- Split counts: train=54,099 / validation=14,169 / test=14,898
- Verified by `test_splits.py::test_seen_entity_temporal_isolation` (PASS)
- Verified by `test_splits.py::test_no_future_data_in_training` (PASS)

## 2. Disjoint Unseen-Entity Split

`splits/rolling.py:make_entity_split()` assigns entities via SHA-256 hash of `(seed, source, entity_id)`:
- 70/15/15 train/validation/test entity assignment
- No entity appears in multiple folds
- Split counts: train=37,727 / validation=2,144 / test=2,250
- Verified by `test_splits.py::test_unseen_entity_isolation` (PASS)

## 3. Training-Only Preprocessing

- Feature engineering in `features/build.py` uses only pre-target history
- sklearn pipelines (Ridge, GB, LightGBM) fit scaler/encoder on training fold only
- CatBoost uses native categorical handling; no global preprocessing
- N-BEATS/DeepAR: `TimeSeriesDataSet` constructed from training fold; validation used only for early stopping
- Recovery run: `prohibit_training()` context manager blocked all `.fit()` calls

## 4. Target and Billing Value Exclusion

`features/build.py:FEATURE_MANIFEST` (version "1.0") explicitly excludes:
- `usage_kwh` (target value)
- `target_usage_kwh` (target column)
- `bill_amount` (billing data)

46 features total: 12 lags, 7 rolling stats, 4 derived, 4 calendar, 12 missing indicators, 1 building_area, 5 categorical, 1 history_month_count.

Lags use only pre-target historical values. `history_month_count` counts months before the target period.

## 5. Duplicate and Entity-Period Checks

Quality audit hard gates (all PASS):
- `entity_month_unique = true`: 0 duplicate entity-months in combined panel
- `duplicate_entity_months = 0` for both UCI (14,698) and BDG2 (35,481)
- UCI: 0 duplicate timestamps; BDG2: 0 duplicate timestamps

## 6. No Invented H00 Lag Values

- H00 examples have `history_month_count = 0` and empty history
- Deterministic baseline is ineligible for H00 (`eligibility_reason()` requires ≥1 history)
- N-BEATS/DeepAR require ≥6 months history; ineligible for H00–H03_05
- Ridge/GB/CatBoost/LightGBM H00 examples use `profile_eligible` variant with building metadata only (BDG2 entities)
- UCI entities have no static metadata → H00 predictions via profile_only are unavailable for UCI
- No synthetic lag values are generated for zero-history entities

## 7. Known Limitations

1. **BDG2 DST handling:** Source uses a common naive hourly grid while metadata provides local DST zones. Monthly aggregation absorbs DST hour differences but sub-monthly analysis would require resolution.

2. **UCI pre-connection zeros:** Excluded by `connection_start` detection (first positive value). 3,385 pre-connection months removed. This heuristic may occasionally exclude valid zero-consumption periods.

3. **BDG2 completeness threshold:** 4 entities fully excluded at 90% threshold. Threshold choice affects which entity-months enter evaluation.

4. **No external validation dataset:** All evaluation uses UCI and BDG2 from same geographic regions (Portugal/Europe/North America). No Indonesian or Southeast Asian validation data available.

5. **Feature manifest is static:** Version "1.0" is fixed at training time. Any feature engineering change requires retraining all models.

6. **Cross-source profile leakage risk is low but not zero:** BDG2 has building metadata (primary_use, area, site); UCI has none. Models trained on combined panel see BDG2 metadata features. This is by design (profile-eligible H00 predictions) but means BDG2-specific features may not generalize to UCI-like entities.
