# IT-ML-04: Phase-Aware AI Model Real-Data Qualification Report

**Status:** PARTIAL QUALIFICATION — BDG2 PROVENANCE REVIEW REQUIRED  
**Date:** 2026-07-20  
**Baseline SHA:** `af3f5f043a912c71fb7bf14f95ef278465954e64`  
**Branch:** `research/phase-aware-ai-production-qualification`  
**Run ID:** `full-final-v2-recovered-01`  
**Recovery type:** INFERENCE_FROM_EXISTING_ARTIFACTS (no training performed)

---

## 1. Executive Summary

Seven model candidates were evaluated across five reporting phases (H00, H01_02, H03_05, H06_12, H13_PLUS) using two real-world electricity datasets (UCI ELD, BDG2) totaling 1,944 entities and 50,179 entity-months. The recovered benchmark produced 325,812 predictions with **zero failures**.

**Recommended four-model portfolio:**

| Phase | Route | Common-Cohort WMAPE |
|-------|-------|---:|
| H00 (0 months) | LightGBM | N/A (baseline ineligible) |
| H01_02 (1–2 months) | deterministic_baseline | 0.227 |
| H03_05 (3–5 months) | LightGBM | 0.280 |
| H06_12 (6–12 months) | N-BEATS | 0.178 |
| H13_PLUS (13+ months) | N-BEATS | 0.178 |

**Qualification outcome: B. PARTIAL** — 13 PASS, 1 PASS WITH WARNING (G01 BDG2 provenance/licensing), 1 informational WARNING (G15 DeepAR calibration). Final decision: PARTIAL — NOT PRODUCTION-READY.

---

## 2. Dataset Provenance (A1)

See: `dataset-provenance.csv`

| Dataset | License | DOI | Status |
|---------|---------|-----|--------|
| UCI ELD | CC BY 4.0 | 10.24432/C58C86 | VERIFIED |
| BDG2 | CC BY 4.0 (Zenodo v1.0) | 10.5281/zenodo.3887306 | PARTIAL |
| GoiEner | CONFLICTING | 10.5281/zenodo.7362094 | BLOCKED |

**BDG2 provenance warning:** Zenodo v1.0 archive byte-for-byte equivalence with local data NOT proven. GitHub repository licence blob at pinned commit `3d0cbaf7` is MIT; Zenodo record is CC BY 4.0. The scope distinction (code vs. dataset) requires legal clarification. This does NOT block research use but MUST be resolved before production deployment.

**GoiEner:** NOT downloaded, NOT trained on, existing legal gate NOT weakened.

---

## 3. Reproducibility Audit (A2)

See: `reproducibility-audit.csv`

All fingerprints verified:
- Configuration: `43d58dc5...`
- Normalized data: `335c79e9...`
- Predictions SHA-256: `9192dbb6...` (325,812 rows, 4,376,808 bytes)
- 36/36 model artifacts verified against manifest checksums
- No training occurred during recovery (all `.fit()` calls blocked)
- Report refresh: REPORTING_ONLY_FROM_IMMUTABLE_PREDICTIONS

---

## 4. Data Quality & Leakage Audit (A3)

See: `data-quality-audit.csv`

All hard gates PASS:
- 0 duplicate entity-months
- Unit conversions documented (UCI: kW÷4→kWh; BDG2: hourly kWh sum)
- 0 negative or non-finite normalized values
- Feature manifest v1.0 excludes all target columns
- Chronological split isolation verified
- Entity disjointness enforced on unseen track

Combined panel: 1,944 entities, 50,179 entity-months (2011-01 through 2017-12).

---

## 5. Model Evaluation (A4–A6)

See: `model-leaderboard.csv`, `model-cards.csv`, `phase-routing.csv`

### 5.1 Composite Leaderboard

| Rank | Model | Composite | WMAPE | Coverage | Gate |
|---:|-------|---:|---:|---:|---:|
| 1 | deterministic_baseline | 0.906 | 0.220 | 4/5 | PASS |
| 2 | ridge | 0.858 | 0.376 | 5/5 | PASS |
| 3 | gradient_boosting | 0.786 | 0.403 | 5/5 | PASS |
| 4 | nbeats | 0.781 | 0.177 | 2/5 | PASS |
| 5 | lightgbm | 0.736 | 0.329 | 5/5 | PASS |
| 6 | deepar | 0.723 | 0.229 | 2/5 | PASS |
| 7 | catboost | 0.389 | 0.639 | 5/5 | PASS |

Composite = 0.50×accuracy + 0.20×stability + 0.10×coverage + 0.10×cost + 0.10×readiness.

### 5.2 Phase Champions

- **H00:** LightGBM (only ML model with H00 eligibility via profile features; baseline ineligible)
- **H01_02:** deterministic_baseline (lowest WMAPE on 373-observation common cohort)
- **H03_05:** LightGBM (lowest common-cohort WMAPE among eligible models)
- **H06_12:** N-BEATS (lowest common-cohort WMAPE; 697 observations)
- **H13_PLUS:** N-BEATS (lowest common-cohort WMAPE; 8,803 observations)

### 5.3 Statistical Comparisons

180 paired bootstrap comparisons (500 samples, minimum 30 paired observations, 95% CI):
- 66 BASELINE_LOWER_MAE (baseline significantly better)
- 17 MODEL_LOWER_MAE (challenger significantly better)
- 37 NO_DETECTED_DIFFERENCE
- 60 NO_COMMON_COHORT (H00 comparisons where baseline is ineligible)

CatBoost is significantly worse than baseline across ALL testable phases.

### 5.4 DeepAR Calibration Warning

DeepAR interval calibration is materially insufficient:
- 80% nominal → 54.25% actual coverage (26pp gap)
- 95% nominal → 72.70% actual coverage (22pp gap)

DeepAR excluded from production portfolio.

---

## 6. Qualification Gates (A7)

See: `qualification-gates.csv`

| # | Gate | Status |
|---|------|--------|
| G01 | Provenance & license verified | PASS WITH WARNING |
| G02 | No target leakage | PASS |
| G03 | Chronological splits | PASS |
| G04 | Entity disjointness (unseen) | PASS |
| G05 | All predictions finite | PASS |
| G06 | Nonnegative policy | PASS |
| G07 | Failure rate < 5% | PASS (0.0%) |
| G08 | Minimum three seeds | PASS |
| G09 | Both evaluation tracks | PASS |
| G10 | All five reporting phases | PASS |
| G11 | Paired bootstrap comparisons | PASS |
| G12 | Deterministic baseline included | PASS |
| G13 | Artifact checksums verified | PASS |
| G14 | No training during recovery | PASS |
| G15 | DeepAR interval calibration | WARNING (informational) |

**13 PASS. 1 PASS WITH WARNING (G01 BDG2 provenance/licensing). 1 informational WARNING (G15 DeepAR calibration).** Final decision: PARTIAL — NOT PRODUCTION-READY.

---

## 7. Laravel Integration Gap Analysis

Current Laravel prediction code registers:
- `deterministic` — production baseline (ACTIVE)
- `ridge_umkm_v1_1` — shadow mode (DISABLED)
- `gradient_boosting_umkm_v1` — shadow mode (DISABLED)

**Missing for portfolio integration:**
- LightGBM adapter (H00, H03_05 routing)
- N-BEATS adapter (H06_12, H13_PLUS routing)
- Phase routing logic (no `ReportingPhase` concept in Laravel)
- Shadow execution uses synchronous path (no queue)

**Pre-integration evidence from demo validation harness (IT-ML-03):**
- H01_02: deterministic baseline CAN succeed
- H00, H03_05: `PORTFOLIO_MODEL_NOT_REGISTERED` for LightGBM
- H06_12, H13_PLUS: `PORTFOLIO_MODEL_NOT_REGISTERED` for N-BEATS
- Overall: `new_portfolio_fully_integrated=false`

---

## 8. Deliverables Index

| File | Description |
|------|-------------|
| `dataset-provenance.csv` | A1: Dataset provenance and licensing |
| `reproducibility-audit.csv` | A2: Reproducibility fingerprints and checksums |
| `data-quality-audit.csv` | A3: Data quality gates and leakage audit |
| `model-leaderboard.csv` | A4: Seven-model composite leaderboard |
| `model-cards.csv` | A4: Detailed model cards with metrics |
| `phase-routing.csv` | A5: Per-phase champion and routing decisions |
| `qualification-gates.csv` | A7: 15 mandatory qualification gates |
| `IT-ML-04_real-data-qualification-report.md` | A8: This report |

Source evidence: `ml/benchmark/results/recovered-run-audit.json` (325,812 predictions, 0 failures, all checksums verified).

---

## 9. Decision

**B. PARTIAL QUALIFICATION — BDG2 provenance review required before production deployment.**

All models pass failure-rate gates. The four-model portfolio (deterministic_baseline, nbeats, lightgbm, ridge) is validated on real-world data. Integration into Laravel requires PHASE B approval with the exact phrase: `APPROVE AI INTEGRATION AFTER REAL-DATA REVIEW`.

### Remaining actions before PHASE B:
1. Resolve BDG2 Zenodo byte equivalence (download canonical v1.0 archive, verify against local data)
2. Legal review of BDG2 MIT (code) vs CC BY 4.0 (dataset) licence scope
3. Register LightGBM and N-BEATS adapters in Laravel
4. Implement phase routing in PredictionService
5. Validate all five demo scenarios with registered portfolio models
