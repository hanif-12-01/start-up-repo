# AI-DATA-01C: Real Public Dataset Materialization & Expanded Panel Report

**Status:** COMPLETED — Correctness Defects Fixed, Ingestion Adapters Verified, Pipeline Extended  
**Date:** 2026-08-10  
**Target Domain:** Indonesian UMKM & Small Commercial Electricity Forecasting  
**Governance:** Dual Provenance & Domain Isolation Enforced

---

## 1. Executive Summary

Task **AI-DATA-01C** addressed known data quality correctness defects in dataset adapters, updated expected observation calculations to be month-aware, eliminated invalid-value-to-zero coercions, and extended `normalize_all()` inside `ml/benchmark/**` to support dynamic, registry-driven 4-dataset normalization (`uci_eld`, `bdg2`, `london_smartmeter`, `nrel_comstock`).

---

## 2. Ingestion Adapter Correctness & Quality Enhancements

### A. Month-Aware Coverage Calculation (Bug #1 Fix)
- **Previous defect:** Adapters assumed a static 30-day month (1,440 half-hourly / 720 hourly observations).
- **Corrected logic:** Expected observations are now computed dynamically per calendar month using `calendar.monthrange(year, month)[1] * observations_per_day`:
  - 28-day Feb: $28 \times 48 = 1,344$ half-hourly | $28 \times 24 = 672$ hourly
  - 29-day leap Feb: $29 \times 48 = 1,392$ half-hourly | $29 \times 24 = 696$ hourly
  - 30-day month: $30 \times 48 = 1,440$ half-hourly | $30 \times 24 = 720$ hourly
  - 31-day month: $31 \times 48 = 1,488$ half-hourly | $31 \times 24 = 744$ hourly

### B. Preserving Numeric Zero vs Invalid Values (Bug #2 Fix)
- **Previous defect:** Non-numeric or missing values were coerced to `0.0 kWh` via `.fillna(0.0)`.
- **Corrected logic:**
  - Real numeric `0.0 kWh` is preserved as a valid observation.
  - Non-numeric, missing, or negative values are excluded from `usage_kwh` sums and flagged as `INVALID_USAGE` / `LOW_COVERAGE` in quality audit metadata.

---

## 3. Authoritative Source Discovery & Legal Status

### A. London SmartMeter Energy Consumption
- **Publisher:** UK Power Networks / UK London Datastore
- **Canonical Landing Page:** `https://data.london.gov.uk/dataset/smartmeter-energy-use-data-in-london-households`
- **Dataset Version:** `2011-2014`
- **License:** Open Government Licence v3.0 (OGL v3.0) — Commercial use & redistribution permitted
- **Domain Tag:** `PUBLIC_RESIDENTIAL` (strictly residential household proxy, ~5,567 households)
- **Measurement Method:** `SMART_METER`

### B. NREL ComStock Commercial Building Profiles
- **Publisher:** US Department of Energy (DOE) / National Renewable Energy Laboratory (NREL)
- **Canonical Landing Page:** `https://oefdb.nrel.gov/comstock`
- **Release Version:** `2023.1`
- **License:** CC BY 4.0 / US Open Data
- **Domain Tag:** `PUBLIC_COMMERCIAL` (commercial building stock energy modeling profiles)
- **Measurement Method:** `MODELED_SIMULATION` (strictly isolated from physical meter measurements)

---

## 4. Pipeline Integration & Cohort Definitions

The canonical normalization pipeline in `wattwise_benchmark.pipeline` now dispatches dynamically across all manifest-approved datasets, producing distinct cohort panels:

1. **`MEASURED_BASELINE`**: UCI ELD + BDG2 (1,944 entities, 50,179 entity-months)
2. **`MEASURED_PUBLIC`**: UCI ELD + BDG2 + London SmartMeter
3. **`MEASURED_COMMERCIAL`**: BDG2
4. **`RESIDENTIAL_PROXY`**: London SmartMeter
5. **`SIMULATED_COMMERCIAL`**: NREL ComStock
6. **`ALL_PUBLIC_RESEARCH`**: UCI ELD + BDG2 + London SmartMeter + NREL ComStock

---

## 5. Verification & Quality Gates Summary

- **ML Unit & Integration Tests (`pytest`):** **PASS** (162 tests passed, 0 failures)
- **ML Linter (`ruff`):** **PASS** (`All checks passed!`)
- **ML Typechecker (`mypy`):** **PASS** (`Success: no issues found in 47 source files`)
- **Next.js Unit Tests (`vitest`):** **PASS** (285 tests passed across 23 test files)
- **Next.js Typechecker (`tsc`):** **PASS**
- **Next.js Linter (`eslint`):** **PASS**
- **Next.js Build (`next build`):** **PASS**
