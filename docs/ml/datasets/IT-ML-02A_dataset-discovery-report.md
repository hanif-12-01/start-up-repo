# IT-ML-02A: phase-aware electricity dataset discovery

Date: 2026-07-14
Scope: data discovery and feasibility only
Application baseline: `32969ddaaa216af8b3a0c480594496389715681e`

## 1. Executive summary

Fifteen real-world candidates were discovered and feasibility-reviewed against provenance, licensing, entity stability, units, time coverage, monthly convertibility, privacy, phase support, and WattWise domain relevance. Six are recommended as the primary portfolio:

1. GoiEner smart meters data
2. Building Data Genome Project 2 (BDG2)
3. HEAPO
4. London Smart Meter / Low Carbon London
5. UCI ElectricityLoadDiagrams20112014
6. REFIT Electrical Load Measurements (cleaned)

Together they expose 34,502 source-scoped entities before quality filtering. The publisher-documented GoiEner pre-period subset alone provides at least 12 months for 12,149 entities, or at least 145,788 entity-month targets. The theoretical ceiling across the six source windows is about 2.63 million entity-months, but that number is **not** a clean-row claim: exact month eligibility requires the next local ingestion/audit task. Every non-verified number in the supporting CSVs is labeled `PUBLISHER_REPORTED`, `PUBLISHER_REPORTED_LOWER_BOUND`, `ESTIMATED_UPPER_BOUND`, `UNKNOWN`, or `NOT_APPLICABLE`.

The portfolio meets the discovery targets on paper:

- multi-entity and global deep-learning scale: GoiEner (25,559), London (5,567), HEAPO (1,408), and BDG2 electricity (1,578);
- non-residential: BDG2 and GoiEner CNAE commercial cohorts;
- retail/hospitality relevance: GoiEner includes more than 300 series in each of wholesale/retail and hospitality category groupings;
- tariff sensitivity: London provides explicit flat and dynamic price schedules;
- profile/cold-start: HEAPO provides metadata for 1,408 households; BDG2 provides building use and area; GoiEner provides economic activity, geography, contracted power, and tariff class;
- appliance information: REFIT has aggregate plus nine appliance channels per home;
- long history: UCI spans four years, HEAPO more than five years, and GoiEner up to roughly 7.5 years.

All six primary licenses permit reuse with attribution. No raw or restricted data was downloaded. No model, application behavior, production setting, Railway variable, deployment, or shadow mode was changed.

## 2. Search methodology

The search started with the six required candidates and expanded through official publisher records, university repositories, government catalogs, DOI landing pages, data-descriptor papers, Zenodo, Figshare, UCI, and documented research archives. Kaggle pages were used only to locate originals; no Kaggle copy is canonical here.

The review sequence was:

1. establish the canonical publisher and persistent identifier;
2. read the publisher's licence/access terms and classify commercial use, redistribution, attribution, account, payment, and geographic restrictions;
3. verify entity definition, timestamp range/granularity, measurement semantics, units, timezone, and privacy treatment;
4. determine whether source data can produce `(dataset_source, entity_id, period_month, usage_kwh)` without fabrication;
5. record publisher counts and distinguish them from estimates or unknowns;
6. calculate rolling-origin phase counts only where a documented lower bound or a transparent window ceiling exists;
7. score phase coverage, diversity, duration, WattWise business relevance, metadata, tariff, quality, and legal usability;
8. apply hard eligibility gates and preserve rejection reasons.

Searches specifically targeted Indonesia, Southeast Asia, restaurants, retail, offices, small businesses, mixed-use buildings, appliance data, tariffs, weather, occupancy, and operating hours. No open, traceable Indonesian multi-entity dataset with at least three monthly observations and known units/licence was found. Indonesian results were typically single-home prototypes, papers without released longitudinal data, or aggregate grid statistics. India provides the closest emerging-economy building alternative through I-BLEND, retained as a reserve. National South/Southeast Asian demand datasets were excluded because they lack stable entity-level customer/building series.

## 3. Primary shortlist

All dimensions below are metadata-only. `LB` is a publisher-supported lower bound; `ceiling` assumes every named entity spans the full publication window and will decrease after coverage auditing.

| Rank | Dataset | Canonical publisher and source | ID | Licence / access | Compressed / extracted | Raw dimensions | Entities | Range / grain | Expected monthly rows | Profiles | Tariff | Appliance | Weather | Supported phases | Recommended model families | Main limitations | Decision |
|---:|---|---|---|---|---|---|---:|---|---:|---|---|---|---|---|---|---|---|
| 1 | GoiEner smart meters | GoiEner + University of Deusto, [processed Zenodo archive](https://doi.org/10.5281/zenodo.7362094) | `10.5281/zenodo.7362094` | CC BY 4.0; open; attribution | processed splits 0.51-0.79 GB each; 4.01-6.28 GB extracted each (`raw.tzst` 2.0/15.1 GB) | hourly customer files: 2 raw columns or 3 imputed columns; total row count unknown | 25,559 | late 2014-Jun 2022; hourly kWh | >=145,788 LB from 12,149 pre-period series; 2,325,869 ceiling | CNAE, province/large municipality, contracted power, tariff class | class/period, not verified currency/kWh | no | no | initial, middle, advanced; long exists but exact count needs audit | all baselines, Ridge, boosting, CatBoost, LightGBM, N-BEATS, DeepAR | 81.4% household; COVID break; large extraction; published imputation is not automatically leakage-safe | primary |
| 2 | Building Data Genome 2 | BUDS Lab, [Zenodo v1.0](https://doi.org/10.5281/zenodo.3887306) | `10.5281/zenodo.3887306` | CC BY 4.0 on pinned Zenodo v1.0; open; attribution | 595.3 MB / unknown | 53.6M readings across 3,053 meters; electricity file about 27.7M cells maximum and 1,578 building columns | 1,578 electricity buildings | 2016-2017; hourly `kWh_sum` | 37,872 ceiling | primary use, area, site, timezone; other fields vary | no | no | yes | all | baselines, Ridge, boosting, CatBoost, LightGBM, N-BEATS, DeepAR | two years; institutional/large-building bias; meter gaps; live-repository licence differs from Zenodo metadata | primary |
| 3 | HEAPO | ETH Zurich + EKZ, [Zenodo v1](https://doi.org/10.5281/zenodo.15056919) | `10.5281/zenodo.15056919` | CC BY 4.0; open; attribution | 458.3 MB / 5.26 GB | total rows unknown; publisher validates 437,592 overlapping days from 866 homes; multiple resolution files | 1,408 | 2018-11-03-2024-03-21; 15-minute, cumulative daily, daily, monthly | 91,520 ceiling | residents, building/heat distribution, PV, heat pump; 214 linked interventions | tariff-specific OBIS excluded | heat-pump submeter for some | yes, 8 stations | all | all baselines, Ridge, boosting, CatBoost, LightGBM, N-BEATS, DeepAR | residential heat-pump selection; per-home duration varies; avoid post-visit leakage | primary |
| 4 | London Smart Meter | UK Power Networks + GLA, [London Datastore](https://data.london.gov.uk/dataset/smartmeter-energy-consumption-data-in-london-households-vqm0d/) | `London Datastore vqm0d` | CC Attribution (version unstated); open; Datastore permits any-purpose use; attribution | 758.86 MB split or 764.54 MB monolith / about 10 GB | about 167M rows; core household ID, timestamp, interval kWh plus ancillary files | 5,567 | Nov 2011-Feb 2014; 30-minute kWh | 155,876 ceiling | ACORN and tariff group | yes: dToU 67.20/3.99/11.76 p/kWh; flat 14.228 p/kWh | no | independent join only | all | baselines, Ridge, boosting, CatBoost, LightGBM, N-BEATS, DeepAR | residential-only; enrollment/missingness; DST convention must be confirmed | primary |
| 5 | UCI ElectricityLoadDiagrams20112014 | UCI, [dataset record](https://doi.org/10.24432/C58C86) | `10.24432/C58C86` | CC BY 4.0; open; attribution | 249.2 MB / 678.1 MB | 140,256 timestamps x 370 client columns plus timestamp | 370 | 2011-2014; 15-minute average kW | 17,760 ceiling | none | no | no | no | all | deterministic baseline, Ridge, boosting, CatBoost, LightGBM, N-BEATS, DeepAR | entity type absent; padded pre-connection zeros must be removed | primary |
| 6 | REFIT cleaned | University of Strathclyde, [canonical dataset](https://doi.org/10.15129/9ab14b0e-19ac-4279-938f-27f643078cec) | `10.15129/9ab14b0e-19ac-4279-938f-27f643078cec` | CC BY 4.0; open; attribution | 490 MB archive / estimated 8-12 GB, verify first | 1,194,958,790 readings reported; 12 columns per home | 20 | Oct 2013-Jun 2015; 8-second watts | 420 ceiling | appliance labels/make/model and limited home metadata | no | yes, nine channels/home | no | all, with fewer long examples | deterministic, Ridge, boosting; global deep models only as auxiliary source | small residential cohort; 88% mean uptime; publisher zero-filled long gaps; integrate power, never sum watts | primary |

The shortlist roles are explicit: HEAPO supports cold-start/profile learning; UCI and REFIT exercise short/medium histories; UCI, HEAPO, and GoiEner support long histories; BDG2 is non-residential validation; London is tariff sensitivity; GoiEner and BDG2 provide commercial/business cohorts; REFIT provides appliance information.

## 4. Other discovered candidates and decisions

| Candidate | Decision | Reason |
|---|---|---|
| [IDEAL Household Energy Dataset](https://doi.org/10.7488/ds/2836) | reserve | CC BY 4.0 and the richest profile/survey/appliance/weather candidate, but heavy components total more than 30 GB compressed, mains readings are apparent power for most homes, and mean participation is only 286 days. Retrieve docs/metadata first in a later approved task. |
| [Ausgrid Solar Home Electricity Data](https://data.gov.au/data/dataset/nsw-solar-home-electricty-data) | reserve | CC BY 3.0 Australia; 300 homes for three years and southern-hemisphere seasonality. Solar-only residential selection and domestic tariff categories reduce business fit. |
| [I-BLEND](https://doi.org/10.6084/m9.figshare.c.3893581) | reserve | 52 months, mixed commercial/residential campus buildings, occupancy, schedules, and India climate are valuable; only seven buildings from one organization make it an external cohort, not a primary global source. |
| [UCI Individual Household Electric Power Consumption](https://doi.org/10.24432/C58K54) | rejected primary | CC BY 4.0 and 47 months with submeter groups, but exactly one entity triggers the single-entity penalty and cannot support global/cold-start evaluation. |
| [UK-DALE](https://doi.org/10.5286/ukerc.edc.000004) | reserve | Open and appliance-rich but only five heterogeneous homes. Low-frequency data might augment REFIT; the roughly 4 TB waveform partition is out of scope and must not be downloaded. |
| [CER Irish Smart Metering Trial / ISSDA](https://www.ucd.ie/issda/faqs/) | restricted backup | Excellent homes/SMEs, tariff groups, premises, and survey equipment, but the End User Licence is research/teaching-only, requires institutional approval, and prohibits online data tools. Not commercially approved for WattWise. |
| [Pecan Street Dataport](https://www.pecanstreet.org/access/) | restricted backup | Rich devices/profile data, but free university access prohibits commercial development and a commercial account requires a paid negotiated licence. No account was requested. |
| [FIKElectricity](https://doi.org/10.17605/OSF.IO/K3G8N) | rejected primary | Excellent restaurant relevance and 45 appliance channels, but each kitchen has only three to four weeks, failing the minimum three-month gate. Document separately as future appliance augmentation. |
| [National Energy Efficiency Data-Framework sample](https://www.data.gov.uk/dataset/7390402c-e7ce-4e2f-bb08-d8d65f852f47/) | rejected primary | Four million anonymized properties and profile attributes under OGL, but electricity consumption is annual. Truthful monthly kWh and phase examples cannot be derived. |

The candidate-level dimensions, quality fields, and all explicit unknowns are in [dataset-catalog.csv](dataset-catalog.csv).

## 5. Licence, commercial-use, and privacy analysis

The selected sources are `APPROVED_WITH_ATTRIBUTION`:

- GoiEner, HEAPO, UCI, and REFIT have official CC BY 4.0 records.
- BDG2 is approved only when pinned to the Zenodo v1.0 archive, whose rights field is CC BY 4.0. The live GitHub `master` branch contains an Attribution-ShareAlike licence text; the persistent archive avoids silently changing terms.
- London's official dataset page states Creative Commons Attribution but not a version. Its official Datastore terms separately permit data use for any purpose and software creation. Preserve UK Power Networks/GLA attribution and the requested accuracy disclaimer; re-check the page at acquisition.

Commercial use and redistribution are allowed for the selected open sources subject to attribution. No selected source requires login, payment, university identity, or geographic approval. The full comparison is [dataset-license-matrix.csv](dataset-license-matrix.csv).

Entity IDs remain source-scoped pseudonyms. GoiEner removed names, addresses, telephone numbers, original CUPS identifiers, and small-locality details; HEAPO uses random IDs and removed exact locations/free text; BDG2 and REFIT use anonymous building/house IDs. WattWise must not attempt re-identification or publish raw fine-grained household traces.

## 6. Raw and expected standardized dimensions

The six selected sources expose 34,502 source-scoped entities:

```text
25,559 GoiEner
 5,567 London
 1,578 BDG2 electricity buildings
 1,408 HEAPO
   370 UCI ElectricityLoadDiagrams
    20 REFIT
------
34,502 potential entities
```

Expected standardized volume is a range, not a verified clean count:

- publisher-supported floor: GoiEner's pre-period files alone contain 12,149 series with at least 12 months, so at least 145,788 entity-month target rows exist before applying WattWise's coverage/leakage policy;
- theoretical source-window ceiling: about 2,629,317 entity-months across all six, dominated by assuming all GoiEner entities span all 91 months; this assumption is false for many customers and is provided only for capacity planning;
- exact clean rows, entities with 3+/6+/13+/24+ consecutive months, and combined phase counts remain an ingestion-audit deliverable.

The 1,000-entity, 50,000-month, 500-entity six-month, and 500-profile targets are supported by publisher metadata. The 300 entities with 13+ months and 100 with 24+ months are highly likely from BDG2/UCI/HEAPO/GoiEner but remain `ESTIMATED` until actual consecutive-month coverage is computed. No row counts are fabricated to close this verification gap.

## 7. Unit conversion and monthly construction

The exact source mappings are in [dataset-schema-mapping.csv](dataset-schema-mapping.csv), and the 30-column contract is in [standard-monthly-schema.md](standard-monthly-schema.md).

Key conversions:

- GoiEner and London: interval energy already in kWh; monthly usage is the sum of valid intervals.
- BDG2: hourly `kWh_sum`; sum electricity columns only. Use corrected v1.0, not Kaggle variants with known unit mistakes.
- HEAPO: prefer the publisher monthly difference of cumulative kWh and reconcile it against summed 15-minute interval kWh. Detect register resets and never double-count total plus heat-pump/other submeter streams.
- UCI: 15-minute average kW, so each interval is `kW / 4` kWh.
- REFIT: 8-second average watts, so nominal interval energy is `W * 8 / 3,600,000` kWh; use actual timestamp deltas around gaps.

Coverage, missingness, imputation, structural zeros, and unit method remain row-level audit columns. Missing business type, tariff, occupancy, or weather is `null`, never inferred as observed metadata.

## 8. Phase coverage

For a consecutive run of `m` usable months, one target origin belongs to one phase based on the history available at that origin:

```text
initial  = min(m, 3)              # history 0, 1, 2
middle   = max(min(m-3, 3), 0)    # history 3, 4, 5
advanced = max(min(m-6, 7), 0)    # history 6..12
long     = max(m-13, 0)           # history 13+
```

The history-0 case uses only pre-target profile/calendar/tariff/source priors. It is not a personalized time-series prediction.

| Dataset | Initial | Middle | Advanced | Long | Status |
|---|---:|---:|---:|---:|---|
| GoiEner pre-period cohort | >=36,447 | >=36,447 | >=72,894 | unknown | publisher lower bound from 12,149 series with at least 12 months |
| BDG2 | 4,734 | 4,734 | 11,046 | 17,358 | 24-month ceiling; gaps reduce it |
| London | 16,701 | 16,701 | 38,969 | 83,505 | 28-month ceiling; enrollment/gaps reduce it |
| HEAPO | 4,224 | 4,224 | 9,856 | 73,216 | 65-month ceiling; availability varies |
| UCI | 1,110 | 1,110 | 2,590 | 12,950 | 48-month ceiling; structural pre-connection zeros reduce it |
| REFIT | 60 | 60 | 140 | 160 | 21-month ceiling; gaps reduce it |

These are reproducible bounds, not verified-full counts. Exact per-history columns and candidate rows are in [dataset-phase-coverage.csv](dataset-phase-coverage.csv).

## 9. Data-quality profile and concerns

- GoiEner: 95.3% of 25,559 raw series have less than 1% missing samples and 74.5% have less than 0.1%; 109 exceed 50%. Duplicate conflicts are resolved using validated SIMEL precedence. The released imputation uses linear interpolation and seasonal LOCF, which must be recomputed fold-safely for forecasting.
- BDG2: core IDs, area, and timezone are complete, while other metadata fields have 4-99% missingness. The cleaned data removes anomalies and long electricity zeros; raw/cleaned variants must not be mixed. Local timezones vary by site.
- London: official totals report 167M half-hour rows, but missing, duplicates, zeros, and entity windows need a full scan. Tariff joins must be effective-time joins and DST behavior must be confirmed.
- HEAPO: publisher removes corrupted zero/negative daily blocks and validates 437,592 overlapping days from 866 households. Per-household duration varies. Visit-relative fields are leakage hazards.
- UCI: the source reports no missing cells, but zeros before a client became active are structural missingness. Portuguese DST is artificially zero-filled/aggregated.
- REFIT: average uptime is 88% (76-94%). The publisher merged duplicates, forward-filled gaps under two minutes, and zeroed larger gaps. Those zeros must contribute to `imputed_ratio`, not masquerade as actual inactivity.

Raw row/column/entity counts and every missing quality metric have an adjacent verification status in the catalog. No direct customer identifier is stored in this repository.

## 10. Business-domain mismatch, bias, and geography

WattWise serves Indonesian small businesses, while the primary data are from Spain, Portugal, the UK, Switzerland, North America, and Europe. None directly represents Indonesian tariffs, tropical operating patterns, PLN customer classes, Ramadan/Eid effects, voltage reliability, informal retail, boarding houses, laundries, or mixed home-business premises.

Domain mismatches include:

- residential dominance in London, HEAPO, and REFIT;
- institutional/large-building dominance in BDG2;
- household dominance (81.4%) and Spain/COVID effects in GoiEner, though its commercial cohorts are unusually useful;
- unknown client/business types in UCI;
- heat-pump and cool-climate selection in HEAPO;
- trial recruitment and ACORN/social bias in London.

Models must report performance by `dataset_source`, geography, residential/commercial status, building/business type, tariff group, history phase, and calendar regime. Cross-source training cannot be treated as a representative Indonesian population. A local consented pilot remains the main data gap.

## 11. Download and storage estimates

The recommended staged primary components total roughly 4.4 GB compressed if all GoiEner processed splits are selected, before optional raw variants. Local expansion is expected to exceed 40 GB and can be materially higher. London, HEAPO, REFIT, and each GoiEner processed component exceed 2 GB after extraction, so they require explicit approval even though some archives are individually smaller than 2 GB.

Use the ignored cache at `D:\LOMBA\Startup Proto Data\wattwise-ml-datasets`. Start with UCI (249.2/678.1 MB) to validate conversion code, then BDG2. Inspect archive listings before London/HEAPO/REFIT/GoiEner. The detailed safe sequence is [download-plan.md](download-plan.md). No raw file was downloaded for this task.

## 12. Proposed train/validation/test composition

Do not concatenate sources and randomly split rows. Preserve `dataset_source` and build three complementary evaluations:

1. **Rolling-origin temporal split:** within each entity, reserve the final one to three usable months for test and the preceding one to three for validation; training contains earlier origins only. Refit preprocessing at every origin/fold.
2. **Entire-entity cold-start holdout:** stratify entities by source and available profile cohorts, then hold out entire entities. Evaluate history 0, 1, and 2 separately; no entity aggregate learned from held-out targets may enter features.
3. **Geographic/source holdout:** keep at least I-BLEND or a later Indonesian pilot as an external emerging-economy test; also run leave-one-source-out tests. BDG2 should be the non-residential source holdout in at least one benchmark.
4. **Phase-balanced evaluation:** cap high-volume GoiEner/London contributions so initial/middle cohorts and smaller business/appliance sources are not drowned out. Report both macro-source and entity-weighted metrics.
5. **Business/building cohorts:** GoiEner CNAE commerce/hospitality/industry/public administration; BDG2 primary use; London tariff/ACORN; HEAPO profile/heat-pump; REFIT appliances. Never fabricate mappings from residential categories to Indonesian business types.
6. **No-leakage policy:** no target-month consumption/bill/closing register, post-origin weather, post-intervention status, future tariff outcome, global imputation, future-normalized scaler, or random time split. Calendar and a tariff schedule published before the origin are allowed.

Benchmark deterministic baselines first and retain them as comparators. Ridge, existing Gradient Boosting, CatBoost, LightGBM, N-BEATS, and DeepAR should use identical origins and eligibility masks. Complexity is not a ranking criterion, and a deep model is not assumed to win.

## 13. Remaining gaps

- No approved Indonesian or Southeast Asian entity-level longitudinal panel meeting the minimum gate.
- No open dataset centered on Indonesian retail, restaurant, laundry, boarding-house, or mixed-use SMEs.
- Tariff price variation is concentrated in one old London trial; current PLN tariff schedules are not paired with entity histories.
- Exact verified-full quality, clean monthly rows, and consecutive-phase counts await controlled local ingestion.
- Operating hours and occupancy are sparse outside I-BLEND/IDEAL/HEAPO.
- Monthly cost labels need a separate, time-versioned tariff source; tariff class must not be treated as price.
- COVID and intervention regimes need explicit indicators and source-specific tests.

## 14. Recommended next task

Proceed with **IT-ML-02B: controlled ingestion and verified monthly audit**. Obtain explicit approval for the cache and any component expanding beyond 2 GB. Implement the schema/conversion registry, ingest UCI first, then BDG2, produce verified quality and phase counts, and only then request approval for the larger London/HEAPO/REFIT/GoiEner components. IT-ML-02B should stop at standardized, versioned monthly panels and benchmark split manifests; model training should be a later task.

## 15. Supporting artifacts

- [dataset-catalog.csv](dataset-catalog.csv): candidate dimensions and quality status
- [dataset-license-matrix.csv](dataset-license-matrix.csv): legal/access gate
- [dataset-schema-mapping.csv](dataset-schema-mapping.csv): source-to-monthly mapping and conversions
- [dataset-phase-coverage.csv](dataset-phase-coverage.csv): reproducible rolling-origin bounds
- [dataset-ranking.csv](dataset-ranking.csv): weighted and risk scores
- [download-plan.md](download-plan.md): safe acquisition sequence
- [standard-monthly-schema.md](standard-monthly-schema.md): canonical 30-column contract

## 16. Reproducibility and safety statement

This report uses official metadata and data-descriptor evidence only. It marks unknowns rather than inferring exact raw quality. No raw customer data, archive, Parquet file, training matrix, model artifact, secret, or credential is present. No restricted account was accessed. No file larger than 2 GB was downloaded. No application code or behavior changed.
