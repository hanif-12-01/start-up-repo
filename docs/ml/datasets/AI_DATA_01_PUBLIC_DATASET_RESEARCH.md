# AI-DATA-01: Public Electricity Dataset Discovery & Evaluation Report

**Status:** COMPLETED — 15 Candidates Audited & Ranked  
**Date:** 2026-08-10  
**Target Domain:** Indonesian UMKM & Small Commercial Electricity Forecasting (Kos, Laundry, Retail, Culinary, Small Property Operators)  
**Governance:** Hard License Gate, Domain Shift Rules, & Provenance Isolation Enforced

---

## 1. Executive Summary

To support future phase-aware electricity demand benchmarking without violating data licenses or compromising model domain transfer, 15 public electricity consumption datasets were evaluated against an 8-criteria, 100-point scoring rubric tailored to WattWise AI's target domain.

Four datasets have been **SELECTED** for canonical ingestion:
1. **Building Data Genome Project 2 (BDG2):** Commercial/institutional buildings (1,574 entities, CC BY 4.0, `PUBLIC_COMMERCIAL`, `SMART_METER`).
2. **UCI ElectricityLoadDiagrams20112014 (UCI ELD):** High-continuity grid/client meters (370 entities, CC BY 4.0, `PUBLIC_OTHER`, `UTILITY_METER`).
3. **London SmartMeter Energy Consumption:** High-density household interval data (5,567 London households, OGL v3.0 / CC BY 4.0, `PUBLIC_RESIDENTIAL`, `SMART_METER`).
4. **NREL ComStock:** Commercial building energy simulation profiles (US DOE/NREL, CC BY 4.0, `PUBLIC_COMMERCIAL`, `MODELED_SIMULATION`).

---

## 2. Dataset Scoring Rubric (100 Points)

Every candidate dataset is evaluated across 8 weighted dimensions:

| Dimension | Max Points | Evaluation Criteria |
|---|---:|---|
| **WattWise Domain Similarity** | 20 | Relevance to small commercial, retail, hospitality, kos, laundry, or light service businesses. |
| **Temporal Coverage** | 15 | Length of time-series history (≥ 12–24 consecutive months preferred). |
| **Entity Continuity** | 15 | Completeness of time series per entity with minimal gaps or missing windows. |
| **Monthly Aggregatability** | 15 | Ease and validity of aggregating sub-hourly/hourly intervals into `YYYY-MM-01` kWh totals. |
| **Contextual Features** | 10 | Presence of static metadata (area, primary use, schedule, occupancy, tariff class). |
| **Climate / Geo Relevance** | 10 | Similarity of climate zone, outdoor temperature, or regional energy usage behavior. |
| **License Clarity** | 10 | Unambiguous open-source/open-data license permitting commercial modification and distribution. |
| **Quality & Documentation** | 5 | Cleanliness, published DOIs, clear unit documentation, and community validation. |

---

## 3. Evaluation & Ranking Table (15 Candidate Datasets)

| Rank | Dataset Name | Publisher / Source | License Classification | Score (100) | Domain Tag | Measurement Method | Selection Outcome |
|---:|---|---|---|---:|---|---|---|
| **1** | **BDG2** | Zenodo (buds-lab) | CC BY 4.0 | **88** | `PUBLIC_COMMERCIAL` | `SMART_METER` | **SELECTED (`CLEARED`)** |
| **2** | **UCI ELD** | UCI ML Repository | CC BY 4.0 | **84** | `PUBLIC_OTHER` | `UTILITY_METER` | **SELECTED (`CLEARED`)** |
| **3** | **London SmartMeter** | UK Power Networks / Kaggle | OGL v3.0 / CC BY 4.0 | **81** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | **SELECTED (`CLEARED`)** |
| **4** | **NREL ComStock** | US DOE / NREL | CC BY 4.0 / Open Data | **79** | `PUBLIC_COMMERCIAL` | `MODELED_SIMULATION` | **SELECTED (`CLEARED`)** |
| 5 | **HEAPO** | Energy Data Centre / UKRI | CC BY 4.0 | **72** | `PUBLIC_RESIDENTIAL` | `DERIVED` | SECONDARY (`CLEARED`) |
| 6 | **SustData / SustDataED** | University of Madeira | CC BY 4.0 | **69** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | SECONDARY (`CLEARED`) |
| 7 | **IDEAL Household Energy** | University of Edinburgh | CC BY 4.0 | **65** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | SECONDARY (`CLEARED`) |
| 8 | **REFIT Smart Home** | Loughborough Univ / OGL | Open Government Licence | **61** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | RESEARCH_ONLY (`CLEARED`) |
| 9 | **DRED** | TU Delft | Non-Commercial | **54** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | RESEARCH_ONLY |
| 10 | **AMPds / AMPds2** | Simon Fraser Univ | Non-Commercial | **51** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | RESEARCH_ONLY |
| 11 | **Tracebase** | TU Darmstadt | CC BY-NC 3.0 | **48** | `PUBLIC_OTHER` | `DERIVED` | RESEARCH_ONLY |
| 12 | **Smart\* Project** | UMass Amherst | CC BY 4.0 (Academic) | **46** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | RESEARCH_ONLY (`CLEARED`) |
| 13 | **GoiEner** | Zenodo | CC BY-SA (Copyleft) | **42** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | **REJECTED (`BLOCKED`)** |
| 14 | **Pecan Street Dataport** | Pecan Street Inc. | Proprietary / Restricted | **38** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | **REJECTED (`RESTRICTED`)** |
| 15 | **REDD** | MIT | Proprietary EULA | **30** | `PUBLIC_RESIDENTIAL` | `SMART_METER` | **REJECTED (`RESTRICTED`)** |

---

## 4. Domain & Provenance Rules

### A. London SmartMeter Household Domain
London SmartMeter is strictly a **RESIDENTIAL** household dataset containing ~5,567 London residential households. It is classified as `domain = PUBLIC_RESIDENTIAL` and `measurement_method = SMART_METER`. It serves as a residential proxy for energy usage seasonality, but carries a high domain shift relative to commercial Indonesian UMKM businesses (Kos, Laundry, Retail, Culinary).

### B. NREL ComStock Simulation Provenance
NREL ComStock consists of simulated commercial building stock profiles (retail, quick service restaurant, food service, office). To prevent synthetic building models from being confused with actual physical meter measurements, ComStock is strictly classified as `dataset_provenance = PUBLIC` and `measurement_method = MODELED_SIMULATION`.
