# IT-ML-01: Multi-Model Shadow Evaluation

This document defines the Multi-Model Shadow Evaluation system implemented in WattWise AI. The shadow evaluation framework runs and compares machine learning models safely in the background alongside the production predictor, without modifying user-facing predictions.

---

## 1. System Overview & Architecture

### Deterministic Baseline
The production prediction uses a deterministic model based on a Weighted Moving Average (WMA) combined with recent trends. This serves as the `ACTIVE_BASELINE` and is the only prediction value exposed to users.

### Shadow Predictors
Two machine learning models run in `SHADOW` mode to evaluate their prediction performance under realistic production conditions:
1. **Ridge Regression UMKM v1.1** (`ridge_umkm_v1_1`): A linear regression model that predicts monthly electricity consumption using L2 regularization.
2. **Gradient Boosting UMKM v1.0** (`gradient_boosting_umkm_v1`): An ensemble of decision trees (200 trees) performing tree traversal to predict monthly usage.

### Feature Flags & UI Isolation
All ML models are disabled by default. The UI/Inertia props are completely isolated from ML predictions to prevent exposure of unverified predictions to the user.
- `PREDICTION_SHADOW_ENABLED`: Global master flag to enable shadow evaluation.
- `PREDICTION_RIDGE_ENABLED`: Flag to enable the Ridge model.
- `PREDICTION_GRADIENT_BOOSTING_ENABLED`: Flag to enable the Gradient Boosting model.
- `PREDICTION_ADAPTIVE_ROUTER_ENABLED`: Flag to enable the model router.

---

## 2. Model Eligibility Rules

For a business to be eligible for Ridge or Gradient Boosting shadow evaluation, it must satisfy all of the following rules:

1. **Minimum History**: At least 3 months of historical electricity usage observations.
2. **Tariff Requirement**: A valid, positive, finite electricity tariff (IDR/kWh).
3. **Supported Business Type**: The business type must map to a supported category (e.g., `LAUNDRY`, `FNB`, `RETAIL`, `MANUFACTURE`, `COLD_STORAGE`, `KOS_PROPERTY`, `OTHER`).
4. **Consecutive Months Constraint**:
   - For every adjacent chronological pair in the supplied history, `actual_next` must equal `expected_next` (exactly `previous_period + 1 calendar month`).
   - If there is any monthly gap, the sequence is rejected with `HISTORY_HAS_GAPS`.
   - Gaps outside the latest 6-month calculation window (the model's relevant latest window) are still rejected under our data integrity policy because gaps suggest telemetry issues or incomplete billing history.
5. **Duplicate / Out-of-Order Check**:
   - Duplicate periods return `DUPLICATE_PERIOD`.
   - Unordered or reversed histories return `INVALID_INPUT` / `CHRONOLOGICAL_ORDER_FAILURE`.

---

## 3. Artifact Validation & Feature Order

To prevent runtime anomalies and ensure strict correspondence with the Python training pipeline, the model artifacts are validated before execution:

- **Checksum Matching**: Artifact files are checked against hardcoded SHA-256 hashes:
  - Ridge v1.1: `e2416ba03144094df87d94f269eb60fbec92b68f4441e95342c7a47aa3e615a9`
  - Gradient Boosting v1.0: `b864713d9c268f2f177f3905de694934758288e2e0a495cec81080d2dfc9d350`
- **Feature Order**: The ordered array `feature_order` in the artifact must match exactly with the predictor's `requiredFeatureOrder()`:
  1. `business_type_encoded`
  2. `month`
  3. `latest_usage_kwh`
  4. `previous_usage_kwh`
  5. `avg_3_month_usage_kwh`
  6. `avg_6_month_usage_kwh`
  7. `trend_1_month`
  8. `trend_3_month`
  9. `month_sin`
  10. `month_cos`
  11. `avg_tariff_idr_per_kwh`
- **Ridge Parameters**: All coefficients and the intercept must be finite. Coefficients length must equal 11.
- **Gradient Boosting Trees**:
  - Node counts in all tree arrays (`children_left`, `children_right`, `features`, `thresholds`, `values`) must be equal and greater than 0.
  - Feature indexes must be `-2` (leaf) or between `0` and `10` (internal).
  - Child indexes must be `-1` (leaf) or valid node indexes.
  - Cycle Detection: A Depth-First Search (DFS) validation is performed starting at root node 0. Any cycle or multiple references to the same node triggers a validation failure (`ARTIFACT_UNHEALTHY`).
  - Traversal step limit: A maximum step limit based on the tree node count is enforced in the traversal loop.

---

## 4. Parity Methodology

To verify pure PHP inference parity against the Python training prototype:
- A testable inference boundary is exposed via `predictFeatureVector(array $features): float`.
- The test suite evaluates archived parity samples in `resources/ml/gb-parity-samples.json`.
- Parity comparisons use an absolute tolerance of `0.01`.
- Any mismatch prints the exact fixture index.

---

## 5. Persistence & Idempotency

- **Database Entities**:
  - `prediction_runs`: Stores input metadata and inputs fingerprint.
  - `prediction_model_results`: Stores individual model results (SUCCESS, SKIPPED, FAILED).
  - `prediction_evaluations`: Stores computed prediction errors when actual data is recorded.
- **Manifest-Aware Idempotency**:
  - A deterministic manifest fingerprint is generated by hashing the sorted registered model keys, versions, and checksums.
  - This fingerprint is included in the inputs fingerprint.
  - If a run exists but new models are registered or enabled, the orchestrator backfills the missing results while preserving existing completed results.

---

## 6. Evaluation Metrics & Model Routing

### Performance Metrics
The system aggregates performance metrics per model:
- `evaluation_count`: completed evaluations only.
- `distinct_businesses`: distinct businesses represented by completed evaluations only.
- `eligible_execution_count`: count of SUCCESS + FAILED executions (excluding SKIPPED).
- `attempt_count`: SUCCESS + FAILED + SKIPPED.
- `failure_rate`: FAILED / (SUCCESS + FAILED).
- `skip_rate`: SKIPPED / attempt_count.

### Model Router Policy
The `AdaptiveModelRouter` recommends challengers only if:
- `evaluation_count` >= `min_evaluations` (default 12).
- `distinct_businesses` >= `min_businesses` (default 3).
- Challenger `failure_rate` <= `max_failure_rate` (default 0.05).
- Challenger `wMAPE` is strictly better than the baseline's `wMAPE`.

---

## 7. Deferred Models & Limitations

- **LSTM Deferred**: The LSTM neural network model is deferred because it requires a Python runtime or external API execution. Pure PHP inference for deep learning recurrent nets is omitted to preserve performance and avoid external dependencies.
- **Training Reproducibility Limitations**: Minor numerical deviations can occur due to floating-point differences between Python's 64-bit C-based implementations and PHP's runtime floating-point precision. Parity is enforced up to a delta of `0.01`.
