# IT-ML-02B — Dataset Ingestion and Benchmark Report

Audit date: 2026-07-18 (Asia/Jakarta)

Benchmark recovery status: **CERTIFIED ARTIFACT-ONLY RECOVERY**

Dataset legal/provenance status: **PARTIAL — BDG2 PROVENANCE REVIEW REQUIRED**

## Executive outcome

The damaged `full-final-v2/predictions.parquet` was preserved unchanged. Its header is
`PAR1`, its footer is invalid, its size is 741,382 bytes, and its SHA-256 is
`4953196c26d4e13a5fa25a946c1efe20c49e42ae1f23c9b6bf09e557ad126fb6`.

All 36 final trainable-model artifacts were independently copied to
`<RECOVERY_ROOT>\full-final-v2\artifacts`, matched their source checksums, and
loaded without training. The dedicated `recover-inference` path reconstructed the exact
immutable examples and splits, ran prediction only, recomputed the deterministic
baseline, and wrote `<RECOVERY_ROOT>\full-final-v2-recovered-01`. The recovered
run contains 325,812 rows: 273,039 successful, 52,773 skipped, and zero failed.

DeepAR produced all 28,500 eligible predictions with zero failures. The previous
zero-target distribution-support error is resolved in the complete recovered inference,
not only in the earlier smoke run. Ground truth and histories were not modified.

## Run identity and reproducibility

| Field | Value |
|---|---|
| Original run | `full-final-v2` (preserved, damaged prediction output) |
| Recovered run | `full-final-v2-recovered-01` |
| Recovery type | `INFERENCE_FROM_EXISTING_ARTIFACTS` |
| Recovery command | `wattwise-benchmark recover-inference --artifact-root <RECOVERY_ROOT>\full-final-v2\artifacts --run-id full-final-v2-recovered-01` |
| Inference start/end UTC | `2026-07-18T05:29:33.062366900Z` / `2026-07-18T05:35:23.406276500Z` |
| Report-only refresh UTC | `2026-07-18T06:42:24.449925300Z` |
| Git HEAD | `6d3a549679bbe359ae6e45420e4aa9e1e3cc4358` |
| `origin/main` | `1a5fe7163ad94e2924b7612ec6ff9a61eb1c4dc9` |
| Training source fingerprint | `004795e2eeac44e5f57d0c6d6fe4d9b1ca97037a39ba6a10699b876f0aff7ec7` |
| Recovery inference fingerprint | `547c3dc5f6ee5069bc1512a39edf2d8c900e920cf83f0b94f9bb3f89c7383702` |
| Final reporting fingerprint | `eaa872400a57a5d91927126b9e8ec38f1a74c1533ce729c26a3e1fdbeaa1c05a` |
| Configuration checksum | `43d58dc5e6a785618cbe86beb63c86010254e338435027d2ef335a8f7485d5a5` |
| Normalized-data fingerprint | `335c79e97a0c649b3d523a7e21efe5539e9fd737c2c7e72148483d33ce12a08e` |
| Evaluation-example fingerprint | `0c1041b0eea53771bba1da772ff76b10a63a0d8aadab23c78ae547e6d6a9078a` |
| Feature-manifest fingerprint | `5a7f36a8c9096f2025bd1d9357b379c5b9aa719780d49782d8599db6b6a68dc1` |
| `requirements.lock` checksum | `2a895a8815132ec532007af35d3da957d90908a3c581717743caf287ca73ebe3` |
| `pyproject.toml` checksum | `7e596a742717b9275a38a6ca7802c1353ed1f9b294e6c86cf84a2dbb61c92593` |
| Seeds / tracks | 17, 29, 43 / seen entity, unseen entity |

The recovery compatibility gate verified checksums for the repository files used to
reconstruct features, splits, deterministic predictions, result records, and artifact
inference, including `execution.py`. The manifest separately records the complete
recovery and reporting source fingerprints. N-BEATS checkpoint parameters retain
`EncoderNormalizer(transformation="softplus")`; DeepAR checkpoints retain
`EncoderNormalizer(transformation=None)` with `NormalDistributionLoss()`.

## Artifact and loader audit

The artifact matrix is exactly 36/36: six trainable models × two tracks × three seeds.
Every file is nonzero, all 36 destination hashes equal the independent checksum report,
and there are no missing or unexpected artifacts.

| Family | Example loader audit | Loaded type | Key metadata |
|---|---|---|---|
| Ridge | `joblib.load` | `sklearn.pipeline.Pipeline` | 91 transformed features |
| Gradient Boosting | `joblib.load` | `sklearn.pipeline.Pipeline` | 91 transformed features |
| CatBoost | `CatBoostRegressor.load_model` | `CatBoostRegressor` | 45 features, 213 trees |
| LightGBM | `joblib.load` | dictionary | `ColumnTransformer` + `LGBMRegressor`, 91 features |
| N-BEATS | `NBeats.load_from_checkpoint` | `NBeats` | MAE loss, six-month encoder, softplus normalizer |
| DeepAR | `DeepAR.load_from_checkpoint` | `DeepAR` | Normal loss, 6–12 month encoder, identity normalizer |

No parameter-updating training operation occurred. Runtime guards blocked `train(True)`,
`fit`, `partial_fit`, CatBoost/LightGBM training APIs, `Trainer.fit`, and optimizer steps.
PyTorch may call `Module.train(False)` internally when `eval()` enters inference mode;
those mode-only calls are counted separately and do not update parameters. The manifest
records both the parameter-update result and the inference-mode call count.

## Recovered output integrity

| Output | Bytes | SHA-256 |
|---|---:|---|
| `predictions.parquet` | 4,376,808 | `9192dbb623b7403ee26c21b297264048faf79986db21b1d88ebbb61b0f3bf116` |
| `metrics.parquet` | 46,470 | `ba348a80e8e4cc2309e03ac6a52b97f86445c81d5d01a1abde15101b35debe9b` |
| `model-eligibility.csv` | 13,150 | `9d3ef78aeca86d959847f0051c10a923d9ab64fd7c81c877c1b1154fec23c4d1` |
| `model-leaderboard.csv` | 4,441 | `2954f91e5cb5b9445a9cc2a01c09059edde52d3079b0cad1aaf3d3c167f5c1e0` |
| `phase-leaderboard.csv` | 17,171 | `7e4af04a990d13a92f2564097ecb1db4afb2cfb00a8961d634ccfe4211e7ef36` |
| `paired-comparisons.csv` | 42,043 | `1f4b47a8c79ef2a4c76234f4f1d436506a4c58be8fd4070a1d4563077651e307` |
| `top-four-recommendation.json` | 31,084 | `0171e0f6429b7a0eded9283833eb5ebfe89cba48dbe61e4b59d8289d0607f3ea` |
| `run-manifest.json` | 60,612 | `ba58e484d49ad5fcc6ea9a930a0cf9e148582086ae585a1adf100ed7a2d5c932` |

Both Parquet files have valid `PAR1` headers and footers and reopen with
`memory_map=False`. Predictions contain one row group and 325,812 rows; metrics contain
one row group and 380 rows. All seven manifest output checksums match independently
recalculated hashes. The manifest itself is separately hashed above.

All successful point predictions are finite and nonnegative. DeepAR is the only model
that emits 80%/95% intervals in this benchmark; all 28,500 interval pairs are finite,
complete, and ordered. Other model interval fields are null by design, not non-finite
emitted intervals. Core metrics are finite for every evaluated metric cell; null metrics
occur only in zero-evaluation cells or non-applicable interval/MASE fields, and no numeric
metric contains infinity.

## Seven-model accounting

| Model | Total | Success | Skipped | Failed |
|---|---:|---:|---:|---:|
| deterministic baseline | 17,148 | 10,287 | 6,861 | 0 |
| ridge | 51,444 | 51,438 | 6 | 0 |
| gradient boosting | 51,444 | 51,438 | 6 | 0 |
| CatBoost | 51,444 | 51,438 | 6 | 0 |
| LightGBM | 51,444 | 51,438 | 6 | 0 |
| N-BEATS | 51,444 | 28,500 | 22,944 | 0 |
| DeepAR | 51,444 | 28,500 | 22,944 | 0 |
| **Total** | **325,812** | **273,039** | **52,773** | **0** |

There are 38/38 inference units: 36 trainable model/track/seed units plus one seed-0
deterministic unit for each track. The six tabular skipped rows represent one unusable
example per seed/track. All skip and eligibility reasons are explicit.

## DeepAR acceptance result

| Track | Product phase | Per-seed rows (17 / 29 / 43) | Status/reason |
|---|---|---:|---|
| seen | H00_02 | 6,275 / 6,275 / 6,275 | skipped — `MINIMUM_CONTEXT_6_MONTHS` |
| seen | H03_05 | 355 / 355 / 355 | skipped — `MINIMUM_CONTEXT_6_MONTHS` |
| seen | H06_12 | 616 / 616 / 616 | success |
| seen | H13_PLUS | 7,652 / 7,652 / 7,652 | success |
| unseen | H00_02 | 959 / 959 / 959 | skipped — `MINIMUM_CONTEXT_6_MONTHS` |
| unseen | H03_05 | 59 / 59 / 59 | skipped — `MINIMUM_CONTEXT_6_MONTHS` |
| unseen | H06_12 | 81 / 81 / 81 | success |
| unseen | H13_PLUS | 1,151 / 1,151 / 1,151 | success |

DeepAR totals: 51,444 rows, 28,500 eligible/successful, 22,944 skipped, zero failed,
and 0% failure rate. Points and both interval levels are finite, ordered, and nonnegative.
The nonnegative policy is `max(0, forecast)` on emitted forecasts and DeepAR quantiles
only; targets and histories remain unchanged.

Micro interval calibration across all successful DeepAR predictions is 54.25% coverage
for the nominal 80% interval (mean width 68,134.48 kWh) and 72.70% coverage for the
nominal 95% interval (mean width 100,165.70 kWh). This material under-coverage is a
limitation and rules out a production-readiness claim.

## Reporting integrity

- `H00` and `H01_02` are separate reporting phases; no lag values are invented.
- Deterministic baseline has no H00 predictions and is not credited as H00 champion.
- N-BEATS and DeepAR coverage is 2/5, only `H06_12` and `H13_PLUS`.
- Phase, common-cohort, and product-routing decisions are separately labelled.
- Paired comparisons use stable observation keys and contain 180 explained rows:
  120 `OK` and 60 `NO_COMMON_COHORT`.
- Paired cohort size ranges from 0 to 7,652. `NO_COMMON_COHORT` rows state a reason;
  there is no unexplained empty file.
- Prediction-level micro, macro metric-cell, eligible, skipped, failed, common-cohort,
  and selection counts have distinct names.
- Selection counts now reconcile across leaderboard CSV, leaderboard JSON, and the
  four portfolio entries.

## Dataset, split, and leakage audit

| Dataset | Raw entities | Normalized entities | Entity-months | Normalized SHA-256 |
|---|---:|---:|---:|---|
| UCI Electricity Load Diagrams | 370 | 370 | 14,698 | `795772fa37a66e76e111daa640cda308b2e4dabcd029b1e733d6a4030f6eab67` |
| BDG2 electricity | 1,578 | 1,574 | 35,481 | `1129fe64ff324e5a217c90f2195e56b67e67d87c294229578d5c99de861ca1cf` |
| Combined | 1,948 | 1,944 | 50,179 | `9c4a13d30f5019780bcbcde2742a75bfbff0fde3e23ff9813c0d36034cd32cae` |

Split counts are seen train/validation/test 54,099/14,169/14,898 and unseen
train/validation/test 37,727/2,144/2,250. Seen folds are chronological. Unseen folds use
disjoint entity sets. Feature preprocessing is reconstructed from training data and loaded
artifact encoders; targets, entity identifiers, and billing values are excluded from model
features.

The four exact BDG2 exclusions are:

| Entity | Deterministic exclusion reason |
|---|---|
| `Bobcat_education_Barbra` | `NO_MONTH_AT_OR_ABOVE_0.900000_COMPLETENESS_THRESHOLD` |
| `Bobcat_education_Seth` | `NO_MONTH_AT_OR_ABOVE_0.900000_COMPLETENESS_THRESHOLD` |
| `Eagle_lodging_Garland` | `NO_MONTH_AT_OR_ABOVE_0.900000_COMPLETENESS_THRESHOLD` |
| `Rat_public_Ulysses` | `NO_MONTH_AT_OR_ABOVE_0.900000_COMPLETENESS_THRESHOLD` |

Thus 1,578 raw = 1,574 normalized + 4 excluded, with no unexplained entity loss.

## BDG2 provenance and licence status

- Source identity: `https://github.com/buds-lab/building-data-genome-project-2`.
- Pinned tag `v1.0`, commit `3d0cbaf7ba281029ce04887503ab56f3c8344575`.
- Electricity Git LFS OID:
  `sha256:039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418`,
  174,239,039 bytes.
- Metadata Git LFS OID:
  `sha256:992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02`,
  272,024 bytes.
- Repository licence blob: `f1b2f17c79567044c1ce14293ff67f9836dad999` (MIT text at
  that commit).
- Zenodo record `10.5281/zenodo.3887306` identifies v1.0 and uses CC BY 4.0, but the
  local Zenodo download was truncated. Byte-for-byte archive-member equivalence with the
  Git LFS objects was not proven, and repository-code versus dataset-licence scope needs
  legal clarification.

Therefore the required status remains **PARTIAL — BDG2 PROVENANCE REVIEW REQUIRED**.
GoiEner remains `LEGAL_REVIEW_REQUIRED` and
`BLOCKED_PENDING_LICENSE_CLARIFICATION`; it was not accessed or used.

## Environment and safety

Execution used Python 3.13.5 on Windows 11, CPU-only Intel64 Family 6 Model 154,
12 logical/10 physical CPUs, and 16,835,284,992 bytes RAM. Model versions are
scikit-learn 1.7.1, CatBoost 1.2.8, LightGBM 4.6.0, and PyTorch Forecasting 1.8.0.

Neither `full-final` nor `full-final-v2` was overwritten, repaired, renamed, or deleted.
No artifact, raw dataset, normalized dataset, target, or history was modified. No model
was activated in Laravel. No commit, push, PR, merge, deployment, PR #18, `bengkel/*`,
or GitHub Actions change occurred.
