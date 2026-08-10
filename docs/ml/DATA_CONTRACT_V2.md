# WattWise Canonical Monthly Electricity Panel Contract (Schema V2)

**Schema Version:** 2.0  
**Status:** ACTIVE — Extended Contract Specification  
**Backward Compatibility:** 100% compatible with Schema V1 (`(dataset_source, entity_id, period_month, usage_kwh)`)

---

## 1. Grain and Keys

Each record represents exactly one source-scoped entity and one local calendar month.  
Primary Key: `(dataset_source, entity_id, period_month)`

---

## 2. Canonical V2 Fields

| # | Field Name | Type | Nullable | Required | Description |
|---:|---|---|:---:|:---:|---|
| 1 | `schema_version` | string | No | Yes | Schema version ("2.0"). |
| 2 | `dataset_source` | string | No | Yes | Stable catalog ID (e.g. `uci_eld`, `bdg2`, `london_smartmeter`, `nrel_comstock`, `indonesia_umkm_synthetic`). |
| 3 | `entity_id` | string | No | Yes | Source-scoped pseudonymous identifier. |
| 4 | `period_month` | date (string) | No | Yes | First day of local calendar month (`YYYY-MM-01`). |
| 5 | `usage_kwh` | float | No | Yes | Total active electricity consumed during the month in kWh. |
| 6 | `dataset_provenance` | enum | No | Yes | `PUBLIC`, `SYNTHETIC`, or `WATTWISE_REAL`. |
| 7 | `measurement_method` | enum | No | Yes | `SMART_METER`, `UTILITY_METER`, `BILLING`, `DERIVED`, `MODELED_SIMULATION`, `UNKNOWN`. |
| 8 | `wattwise_usage_source` | enum | No | Yes | `USER_ENTERED`, `METER_DERIVED`, `LEGACY_UNKNOWN`. |
| 9 | `domain` | enum | No | Yes | Business archetype (`KOS`, `LAUNDRY`, `RETAIL`, `CULINARY`, `SMALL_COMMERCIAL`, `OTHER_UMKM`, `PUBLIC_COMMERCIAL`, `PUBLIC_RESIDENTIAL`, `PUBLIC_OTHER`). |
| 10 | `is_synthetic` | boolean | No | Yes | True for offline synthetic scenario profiles. |
| 11 | `training_eligible` | boolean | No | Yes | Indicates if row may enter training sets. |
| 12 | `validation_eligible` | boolean | No | Yes | Indicates if row may enter validation folds. |
| 13 | `final_evaluation_eligible` | boolean | No | Yes | Must be `false` for synthetic and QA demo rows. |
| 14 | `coverage_ratio` | float | No | Yes | `observation_count / expected_observation_count` (0.0 to 1.0). |
| 15 | `tariff_per_kwh` | float | Yes | No | Electricity rate per kWh. |
| 16 | `floor_area` | float | Yes | No | Floor area in square metres. |
| 17 | `occupancy` | float | Yes | No | Occupancy count or ratio. |
| 18 | `quality_flags` | tuple[string] | No | Yes | Quality flags (`PASS`, `ZERO_USAGE`, `LOW_COVERAGE`, `EXTREME_OUTLIER`). |

---

## 3. Dual Provenance Isolation

To prevent mislabeling external smart meter data as user-entered data, synthetic data as real data, or energy simulations as physical meter readings, strict provenance tracking is enforced:

1. **Dataset Provenance (`dataset_provenance`):**
   - `PUBLIC`: Datasets acquired from public academic or government repositories.
   - `SYNTHETIC`: Deterministic offline generated scenarios.
   - `WATTWISE_REAL`: Future anonymized records from WattWise application users.

2. **Measurement Provenance (`measurement_method`):**
   - `SMART_METER`: Physical interval smart meter.
   - `UTILITY_METER`: Physical utility billing meter reading.
   - `BILLING`: Utility monthly invoice reading.
   - `DERIVED`: Sub-meter or aggregated interval calculation.
   - `MODELED_SIMULATION`: Energy building stock simulation profile (e.g. NREL ComStock).
   - `UNKNOWN`: Default legacy unknown measurement method.
