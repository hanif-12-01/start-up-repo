# WATTWISE AI-ML-AUDIT-00
## Existing ML Foundation Audit

### A. Executive Summary

Existing ML foundation rating: **MATURE / QUALIFIED FOR INTEGRATION**  
Recommended action: **EXTEND EXISTING `ml/benchmark`**

A comprehensive forensic audit of `ml/**`, `docs/**`, `wattwise-vercel/**`, `tests/**`, `.gitignore`, and Git history confirms that WattWise possesses a mature, leakage-safe Machine Learning benchmarking and serving engine in [ml/benchmark](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/ml/benchmark). The package (`wattwise-benchmark` v0.1.0) includes rigorous dataset acquisition verification, monthly panel normalization, feature engineering, rolling-origin split isolation, statistical metrics, immutable reporting, and a preliminary HTTP serving runtime.

Creating a new `wattwise-ml` workspace or rebuilding the ML stack from scratch is strictly unnecessary and counterproductive. The unpopulated `wattwise-ml/` workspace directory should remain unmerged/archived, and all dataset extension work should directly build upon `ml/benchmark`.

---

### B. Existing Tree

The current repository ML file structure and classification:

```text
d:/LOMBA/MVP PROTOTIPE start-up/
├── ml/
│   └── benchmark/                           [ACTIVE — Primary ML Foundation]
│       ├── README.md                        [ACTIVE — Usage & governance docs]
│       ├── pyproject.toml                   [ACTIVE — Package & dependency definitions]
│       ├── requirements.lock                [ACTIVE — Lockfile]
│       ├── scripts/                         [ACTIVE — Audit & validation utilities]
│       │   ├── acquire_and_validate.py
│       │   ├── audit_bdg2_exclusions.py
│       │   ├── audit_recovered_run.py
│       │   ├── deepar_smoke_test.py
│       │   └── probe_recovered_artifacts.py
│       ├── src/
│       │   ├── wattwise_benchmark/          [ACTIVE — Benchmark Engine Core]
│       │   │   ├── acquisition/             [ACTIVE — Manifest & provenance verification]
│       │   │   ├── ingestion/               [ACTIVE — UCI & BDG2 monthly panel normalization]
│       │   │   ├── quality/                 [ACTIVE — Data quality & exclusion audit]
│       │   │   ├── features/                [ACTIVE — Feature manifest v1.0 (46 features)]
│       │   │   ├── splits/                  [ACTIVE — Rolling-origin seen/unseen splits]
│       │   │   ├── models/                  [ACTIVE — 7 model implementations]
│       │   │   ├── evaluation/              [ACTIVE — WMAPE, MAE, RMSE, Pinball loss]
│       │   │   ├── selection.py             [ACTIVE — Portfolio selection logic]
│       │   │   ├── pipeline.py              [ACTIVE — Benchmark pipeline orchestration]
│       │   │   ├── reporting.py             [ACTIVE — Immutable report generation]
│       │   │   ├── recovery.py              [ACTIVE — Artifact recovery & inference path]
│       │   │   └── cli.py                   [ACTIVE — Command-line interface]
│       │   └── wattwise_serving/            [SERVING_CANDIDATE — Guarded HTTP Runtime]
│       │       ├── artifacts.py
│       │       ├── contracts.py
│       │       ├── http_server.py
│       │       └── runtime.py
│       └── tests/                           [ACTIVE — 18 Test Suites]
│           ├── test_contracts.py
│           ├── test_deepar_zero.py
│           ├── test_deterministic.py
│           ├── test_eligibility.py
│           ├── test_features.py
│           ├── test_ingestion.py
│           ├── test_manifest.py
│           ├── test_metrics.py
│           ├── test_provenance.py
│           ├── test_recovery.py
│           ├── test_reporting.py
│           ├── test_selection.py
│           ├── test_serving_*.py
│           └── test_splits.py
├── docs/ml/                                 [ACTIVE — Qualification & Dataset Specs]
│   ├── IT-ML-01_multi-model-shadow-evaluation.md
│   ├── IT-ML-02B_dataset-ingestion-and-benchmark-report.md
│   ├── IT-ML-02C_model-portfolio-recommendation.md
│   ├── IT-ML-03_demo-validation-harness.md
│   ├── IT-ML-05_phase-b-application-integration.md
│   ├── datasets/
│   │   ├── IT-ML-02A_dataset-discovery-report.md
│   │   ├── dataset-catalog.csv
│   │   ├── dataset-license-matrix.csv
│   │   └── standard-monthly-schema.md
│   └── qualification/
│       ├── IT-ML-04_real-data-qualification-report.md
│       ├── leakage-audit.md
│       └── run-manifest.json
└── wattwise-ml/                             [LEGACY / UNKNOWN — Unpopulated Skeleton]
```

---

### C. Existing Dataset Pipeline

The actual end-to-end data pipeline implemented in [src/wattwise_benchmark/](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/ml/benchmark/src/wattwise_benchmark) follows a strictly deterministic flow:

```text
RAW SOURCE DATA ($WATTWISE_ML_DATA_ROOT/raw/)
       │
       ▼
1. ACQUISITION (acquisition/manifest.py & bdg2_provenance.py)
   ├── Validate operator JSON acquisition manifest & SHA-256 archive hashes
   └── Verify BDG2 Git LFS OID & Zenodo v1.0 archive byte-equivalence
       │
       ▼
2. NORMALIZATION & INGESTION (ingestion/uci.py & bdg2_provenance.py)
   ├── Convert UCI 15-min average kW to kWh (value ÷ 4) & aggregate monthly
   ├── Convert BDG2 hourly kWh_sum to monthly kWh
   └── Enforce standard monthly schema (YYYY-MM-01, coverage_ratio >= 0.90)
       │
       ▼
3. QUALITY AUDIT (quality/audit.py)
   ├── Exclude pre-connection zero padding (UCI connection_start heuristic)
   ├── Exclude non-positive or non-finite values
   └── Enforce duplicate entity-month check (0 duplicate entity-months permitted)
       │
       ▼
4. FEATURE BUILDING (features/build.py)
   ├── Construct Feature Manifest v1.0 (46 features)
   └── Generate 12 lag months, 7 rolling statistics, calendar indicators, & metadata
       │
       ▼
5. LEAKAGE-SAFE SPLIT (splits/rolling.py)
   ├── Seen-entity track: Strict temporal boundary (Train < Validation < Test)
   └── Unseen-entity track: Disjoint entity assignment via SHA-256 hash
       │
       ▼
6. MODEL FITTING / INFERENCE (models/)
   ├── Fit 7 model families on training fold only (or load frozen checkpoints)
   └── Execute inference (with ProhibitTraining context manager during recovery)
       │
       ▼
7. METRICS EVALUATION (evaluation/metrics.py)
   ├── Calculate WMAPE, MAE, RMSE, MAPE, sMAPE per entity-month
   └── Compute Pinball loss (0.1, 0.5, 0.9 quantiles) for DeepAR
       │
       ▼
8. IMMUTABLE REPORTING (reporting.py & recovery.py)
   └── Write aggregate reports to new immutable output directories under benchmark-reports/
```

---

### D. Existing Dataset Inventory

| Dataset Name | Status | Source / Publisher | Version | License | Provenance / DOI | Acquisition Method | Normalization Adapter | Entity Count | Date Range | Usability Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **UCI ELD** | VERIFIED | UCI ML Repository | 2011–2014 | CC BY 4.0 | DOI: 10.24432/C58C86 | ZIP Download | `ingestion/uci.py` | 370 | 2011-01 to 2014-12 | USABLE |
| **BDG2** | VERIFIED | Zenodo (buds-lab) | v1.0 | CC BY 4.0 | DOI: 10.5281/zenodo.3887306 | Git LFS / Zenodo Zip | `ingestion/bdg2.py` | 1,574 | 2016-01 to 2017-12 | USABLE |
| **GoiEner** | BLOCKED | Zenodo | v1.0 | License Conflict | DOI: 10.5281/zenodo.7362094 | Blocked | N/A | 0 | N/A | UNUSABLE (`LEGAL_REVIEW_REQUIRED`) |

---

### E. Dataset Legal Status

* **UCI ElectricityLoadDiagrams20112014:** **CLEARED**. Published under Creative Commons Attribution 4.0 International (CC BY 4.0). Permits commercial modification and distribution.
* **Building Data Genome Project 2 (BDG2):** **CLEARED**. Provenance audit in [IT-ML-04](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/docs/ml/qualification/IT-ML-04_real-data-qualification-report.md) proved byte-for-byte equivalence between Git LFS objects and Zenodo v1.0 archive (SHA-256: `50ef5178...`, 595,266,464 bytes). GitHub repository code is MIT licensed, and dataset is CC BY 4.0. Commercial use cleared.
* **GoiEner:** **LEGAL_REVIEW_REQUIRED / BLOCKED**. License conflict between CC BY-SA (ShareAlike copyleft) and project requirements. Data acquisition and materialization are explicitly blocked by code guards.
* **Other candidates (London, HEAPO, REFIT, etc.):** **NOT MATERIALIZED**. Discovery docs exist in `docs/ml/datasets/`, but data has not been ingested or validated.

---

### F. Existing Data Contract

The canonical monthly panel contract is defined in [docs/ml/datasets/standard-monthly-schema.md](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/docs/ml/datasets/standard-monthly-schema.md) and enforced by [src/wattwise_benchmark/contracts.py](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/ml/benchmark/src/wattwise_benchmark/contracts.py):

* **Logical Primary Key:** `(dataset_source, entity_id, period_month)`
* **Required Fields:**
  * `dataset_source` (string): Stable catalog identifier (e.g. `uci_eld`, `bdg2`)
  * `entity_id` (string): Stable, source-scoped pseudonymous identifier
  * `period_month` (date): First calendar day of the month (`YYYY-MM-01`)
  * `usage_kwh` (decimal): Total monthly active electricity consumption in kWh
  * `source_timezone` (string): IANA timezone string
  * `source_granularity` (string): Source observation frequency (e.g. `15min`, `hourly`)
  * `observation_count` (integer): Actual valid readings received
  * `expected_observation_count` (integer): Expected readings for calendar month considering DST
  * `coverage_ratio` (decimal): `observation_count / expected_observation_count` (must be ≥ 0.90)
* **Optional Fields:** `entity_type`, `business_type`, `building_type`, `tariff_per_kwh`, `floor_area`, `occupancy`, `temperature_mean`.
* **Validation & Quality Rules:**
  * Strict non-negativity: `usage_kwh >= 0` and finite.
  * Zero policy: Pre-connection zero padding (e.g., UCI initial zero blocks) is classified as structural missingness and removed via `connection_start` detection. True zero consumption months for connected entities are preserved.
  * Duplicate policy: 0 duplicate `(dataset_source, entity_id, period_month)` tuples permitted.

---

### G. Benchmark History

The benchmark history documented in [run-manifest.json](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/docs/ml/qualification/run-manifest.json) (`full-final-v2-recovered-01`) evaluated **7 model candidates**:
1. `deterministic_baseline` (Historical mean / seasonal baseline)
2. `ridge` (L2 Regularized Linear Regression)
3. `gradient_boosting` (Scikit-Learn GradientBoostingRegressor)
4. `catboost` (CatBoostRegressor)
5. `lightgbm` (LGBMRegressor)
6. `nbeats` (N-BEATS Neural Architecture via PyTorch Forecasting)
7. `deepar` (DeepAR Probabilistic Recurrent Network via PyTorch Forecasting)

**Dataset Scope:** Combined panel of 1,944 entities (370 UCI + 1,574 BDG2) spanning 50,179 entity-months across 3 random seeds (17, 29, 43) and 2 evaluation tracks (`seen_entity` and `unseen_entity`). Total predictions generated: **325,812** (0 failures).

---

### H. Historical Model Results

#### Composite Leaderboard Summary

| Rank | Model | Composite Score | WMAPE | Phase Coverage | Gate Status |
|---:|---|---:|---:|---:|---|
| 1 | `deterministic_baseline` | 0.906 | 0.220 | 4/5 | **PASS** |
| 2 | `ridge` | 0.858 | 0.376 | 5/5 | **PASS** |
| 3 | `gradient_boosting` | 0.786 | 0.403 | 5/5 | **PASS** |
| 4 | `nbeats` | 0.781 | 0.177 | 2/5 | **PASS** |
| 5 | `lightgbm` | 0.736 | 0.329 | 5/5 | **PASS** |
| 6 | `deepar` | 0.723 | 0.229 | 2/5 | **PASS (WARNING)** |
| 7 | `catboost` | 0.389 | 0.639 | 5/5 | **PASS** |

#### Recommended Four-Model Portfolio & Phase Champions

| Product Phase | Usage History | Reporting Phase | Phase Champion | WMAPE (Common Cohort) | Portfolio Route |
|---|---|---|---|---:|---|
| **H00** | 0 months | `H00` | `lightgbm` | N/A (baseline ineligible) | `lightgbm` (profile-only) |
| **H01_02** | 1–2 months | `H01_02` | `deterministic_baseline` | 0.227 | `deterministic_baseline` |
| **H03_05** | 3–5 months | `H03_05` | `lightgbm` | 0.280 | `lightgbm` |
| **H06_12** | 6–12 months | `H06_12` | `nbeats` | 0.178 | `nbeats` |
| **H13_PLUS** | 13+ months | `H13_PLUS` | `nbeats` | 0.178 | `nbeats` |

---

### I. Known Model Limitations

1. **DeepAR Calibration Undercoverage:** DeepAR interval prediction displays severe undercoverage (80% nominal coverage yields only 54.25% actual coverage; 95% nominal yields 72.70%). DeepAR is **excluded** from the serving portfolio.
2. **N-BEATS History Constraint:** N-BEATS requires at least 6 consecutive months of usage history (`history_month_count >= 6`). It cannot serve cold-start (H00–H03_05) entities.
3. **LightGBM Metadata Dependency:** LightGBM H00 predictions rely on building profile metadata (area, primary use). For entities without static metadata (such as UCI), H00 predictions are unavailable.
4. **CatBoost Underperformance:** CatBoost exhibited poor generalization across all testable phases (WMAPE 0.639), performing significantly worse than the naive baseline.

---

### J. Existing Serving Layer

The serving layer is located in [src/wattwise_serving/](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/ml/benchmark/src/wattwise_serving).

* **Production Approval Guard:** **`NOT APPROVED FOR STAGING OR PRODUCTION DEPLOYMENT`**  
  `wattwise_serving/runtime.py` and `http_server.py` explicitly retain this safety assertion.
* **Request Contract (`ServingPredictionRequest`):** `entity_id`, `period_month`, `history_kwh` array, `profile_metadata` dict.
* **Response Contract (`ServingPredictionResponse`):** `model_id`, `period_month`, `predicted_kwh`, `phase`, `interval_80_lower`, `interval_80_upper`.
* **Guard Rationale:** The current HTTP serving implementation lacks multi-tenant tenant isolation, authentication/authorization middleware, rate limiting, connection pooling to Neon Postgres, and Railway production infrastructure configuration.

---

### K. Current App Compatibility

The main Production application is **Next.js App Router** (`wattwise-vercel`), backed by PostgreSQL (Neon), Drizzle ORM, and Better Auth.

* **Stale Laravel Integration Assumptions (`STALE`):** Older documentation and qualification scripts ([IT-ML-05](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/docs/ml/IT-ML-05_phase-b-application-integration.md)) reference PHP/Laravel `PredictionService`, `wattwise-laravel`, and outdated model route names (`ridge_umkm_v1_1`, `gradient_boosting_umkm_v1`).
* **Next.js Integration Status (`NEEDS_ADAPTER`):** The Next.js application currently uses server-side TS prediction logic. Connecting Next.js to the Python portfolio requires a lightweight HTTP/gRPC API bridge or serverless Python route adapter.

---

### L. Quality Tooling & Test Status

Audit results for Python quality tools inside `ml/benchmark`:

* **`pytest`:** **PASS**. 18 test files present. Core unit tests pass in 0.04s (`test_contracts.py`, `test_serving_contracts.py`, `test_metrics.py`, `test_splits.py`, `test_provenance.py`).
* **`ruff`:** **PASS**. Executing `python -m ruff check src` returns `All checks passed!`.
* **`mypy`:** **FAIL (ENVIRONMENT MISSING MODULE)**. `mypy` is specified in `pyproject.toml` under `optional-dependencies.dev`, but is not installed in the global Python environment.

---

### M. Existing Assets

* **Model Artifacts:** 36 trained model checkpoints (`.joblib`, `.cbm`, `.ckpt`) exist and are cataloged with SHA-256 fingerprints in [run-manifest.json](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/docs/ml/qualification/run-manifest.json).
* **Data Storage Rules:** Large raw datasets, Parquet feature panels, predictions, and model weights reside strictly under `${WATTWISE_ML_DATA_ROOT}` outside the Git repository.
* **Git Governance:** `.gitignore` properly excludes `.venv/`, `data/`, `artifacts/`, `*.parquet`, `*.joblib`, `*.ckpt`, and `*.cbm`.

---

### N. Gaps Before New Dataset Work

* **P0 — kWh Measurement Provenance Contract Gap:** The existing data contract does not distinguish between `USER_ENTERED` (manual bill input), `METER_DERIVED` (telemetry/smart meter), and `BILLING_PERIOD` (estimated billing interval).
* **P1 — Indonesian UMKM Domain Metadata:** Existing benchmarks rely on Western building types (office, educational, residential). Metadata adapters must be added for Indonesian PLN tariff categories (R-1, B-1, I-2) and business types (warung, laundry, bakery).
* **P2 — Next.js Portfolio Serving Adapter:** Modernizing prediction routing from old Laravel service calls to Next.js API endpoints.

---

### O. Proposed Extension Architecture

Instead of creating a redundant `wattwise-ml/` top-level workspace, all future dataset extensions will be integrated cleanly inside `ml/`:

```text
ml/
└── benchmark/
    ├── configs/
    │   └── datasets/
    ├── manifests/
    ├── src/
    │   ├── wattwise_benchmark/
    │   │   ├── acquisition/
    │   │   ├── ingestion/
    │   │   ├── quality/
    │   │   ├── provenance/       # [NEW] kWh measurement provenance tracking
    │   │   ├── synthetic/        # [NEW] Indonesian UMKM scenario generators
    │   │   ├── datasets/         # [NEW] Extended dataset adapters (15+ discovery)
    │   │   ├── features/
    │   │   ├── splits/
    │   │   ├── models/
    │   │   └── reporting/
    │   └── wattwise_serving/
    └── tests/
```

---

### P. Next Recommended Task

**`AI-DATA-01 EXTEND DATASET FOUNDATION`**

---

### Q. Final Verdict

* `REUSE_EXISTING_ML`: **YES**
* `CREATE_NEW_ML_WORKSPACE`: **NO**
* `READY_TO_EXTEND_DATASETS`: **YES**
* `READY_TO_TRAIN_NEW_MODELS`: **NO**
* `READY_FOR_PRODUCTION_ML`: **NO**

---

**AI-ML-AUDIT-00 COMPLETE**  
— *EXISTING ML FOUNDATION MAPPED*  
— *AWAITING PRODUCT OWNER REVIEW*
