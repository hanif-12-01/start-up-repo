# AI-DATA-01D: Dataset Evidence Freeze & London Source Semantics Reconciliation Report

**Status:** COMPLETED — Evidence Frozen, London Semantics Reconciled, Cohort Contract Established  
**Date:** 2026-08-10  
**Release Identifier:** `wattwise-public-monthly-v1.0.0`  
**Governance:** Dual Provenance & Domain Isolation Verified

---

## 1. Executive Summary

Task **AI-DATA-01D** serves as the final micro-gate closing the WattWise ML public dataset foundation prior to AI-01 model re-benchmarking.

Key accomplishments:
1. **London Source Authority & License Reconciliation:** Verified against official UK London Datastore metadata (`data.london.gov.uk`). License confirmed as Open Government Licence v3.0 (OGL v3.0), permitting commercial reuse and redistribution with mandatory attribution.
2. **London Timestamp Semantics & DST Stability:** Empirical audit confirms pre-normalized 48 half-hourly interval timestamps per day (`UTC_STABLE_48` / `PRENORMALIZED_48`). Coverage calculations using `calendar.monthrange(year, month)[1] * 48` were verified as `CORRECT_UNCHANGED`.
3. **Machine-Readable Cohort Definitions & Assertions:** Built `src/wattwise_benchmark/datasets/cohorts.py` establishing 6 machine-readable cohorts (`MEASURED_BASELINE`, `MEASURED_PUBLIC`, `MEASURED_COMMERCIAL`, `RESIDENTIAL_PROXY`, `SIMULATED_COMMERCIAL`, `ALL_PUBLIC_RESEARCH`).
4. **Dataset Release Evidence Freeze:** Created machine-readable manifest `docs/ml/datasets/AI_DATA_01D_DATASET_RELEASE_MANIFEST.json` locking all source hashes, normalized Parquet digests, logical dataset hashes, exact entity/month counts, and ComStock sampling parameters.

---

## 2. London SmartMeter Source & Timestamp Reconciliation

### A. Publisher & License Authority
- **Publisher:** UK Power Networks / Greater London Authority (London Datastore)
- **Canonical Source:** `https://data.london.gov.uk/dataset/smartmeter-energy-use-data-in-london-households`
- **Official License:** Open Government Licence v3.0 (OGL v3.0)
- **License Evidence:** UK London Datastore statement (`https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/`)
- **Attribution Clause:** *"Contains London Datastore / UK Power Networks data licensed under the Open Government Licence v3.0"*

### B. Empirical Timestamp Audit & DST Stability
- **Timestamp Field Format:** `YYYY-MM-DD HH:MM:SS` (30-minute intervals)
- **Timezone Encoding:** UTC / GMT pre-normalized grid (`UTC_STABLE_48`).
- **DST Transition Audit:** March (Spring forward) and October (Autumn fallback) transition months present a uniform 48 half-hour intervals for every calendar day ($31 \times 48 = 1,488$ observations).
- **Coverage Status:** `CORRECT_UNCHANGED` (`expected_half_hourly_observations(year, month)`).

---

## 3. Machine-Readable Cohort Definitions

| Cohort ID | Included Datasets | Entity Count | Entity-Month Count | Measurement Method | Domain Classification |
|---|---|---:|---:|---|---|
| `MEASURED_BASELINE` | UCI ELD, BDG2 | 1,944 | 50,179 | `UTILITY_METER`, `SMART_METER` | Commercial & Other |
| `MEASURED_PUBLIC` | UCI ELD, BDG2, London | 7,511 | 183,787 | `UTILITY_METER`, `SMART_METER` | Residential & Commercial |
| `MEASURED_COMMERCIAL` | BDG2 | 1,574 | 35,481 | `SMART_METER` | `PUBLIC_COMMERCIAL` |
| `RESIDENTIAL_PROXY` | London SmartMeter | 5,567 | 133,608 | `SMART_METER` | `PUBLIC_RESIDENTIAL` |
| `SIMULATED_COMMERCIAL` | NREL ComStock | 2,500 | 30,000 | `MODELED_SIMULATION` | `PUBLIC_COMMERCIAL` |
| `ALL_PUBLIC_RESEARCH` | All 4 Datasets | 10,011 | 213,787 | All Public Methods | All Public Domains |

---

## 4. Frozen Quality & Reproducibility Evidence

- **Logical Dataset Hash Algorithm:** Deterministic SHA-256 computed on sorted canonical keys `(dataset_source, entity_id, period_month)` with 4-decimal rounded kWh values.
- **NREL ComStock Sampling Contract:** 2,500 commercial entities selected via stratified sampling (building sub-types $\times$ climate zones) using stable SHA-256 seed `wattwise-2026-comstock-v1`.
- **Quality Gates Execution:**
  - `pytest`: **PASS** (164 passed, 0 failed)
  - `ruff`: **PASS** (`All checks passed!`)
  - `mypy`: **PASS** (`Success: no issues found in 48 source files`)
  - Next.js `vitest`: **PASS** (285 passed)
  - Next.js `tsc`: **PASS**
  - Next.js `eslint`: **PASS**
  - Next.js `build`: **PASS**
