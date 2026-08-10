# AI-DATA-MEGA-AUDIT-01 — Final P0 Remediation Report

Date: 2026-08-10 (Asia/Jakarta)  
Branch: `feature/ai-data-01-dataset-foundation`  
Data root: `D:\WattWiseMLData`  
Decision: `READY_FOR_AI_01 = YES`

No model was trained. No fixture, mock, or synthetic data was created or used. No
deployment or merge to `main` was performed.

## Final status

| Gate | Result |
| --- | --- |
| `UCI_STATUS` | `UNAVAILABLE_TRANSPORT` |
| `UCI_TRAINING_ELIGIBLE` | `NO` |
| `LONDON_ADAPTER` | `PASS` |
| `LONDON_REAL_NORMALIZATION` | `PASS` |
| `BDG2_REAL` | `YES` |
| `LONDON_REAL` | `YES` |
| `COMSTOCK_REAL_SUBSET` | `YES` — `MODELED_SIMULATION` |
| Fixture rows | `0` |
| Mock rows | `0` |
| Synthetic rows | `0` |
| P0 open | `0` |
| P1 open | `0` |
| Training precheck | `PASS` |
| Mega Audit | `PASS` |

Mega Audit release fingerprint:
`451873c1c29c85a8ace7fb5b14ec3f7115e5234fd6d9411753dbaa2a0540e9ab`.

Training-precheck release fingerprint:
`2557ef625c3f270f2ca1759a553e9c8ac5d2603283e7b85e2447528e8f00ed8d`.

Machine-readable evidence is stored outside Git under:

- `D:\WattWiseMLData\manifests\ai-data-mega-audit-01.json`
- `D:\WattWiseMLData\manifests\ai-data-mega-audit-01-precheck.json`
- `D:\WattWiseMLData\manifests\london-real-normalization-evidence.json`
- `D:\WattWiseMLData\manifests\bdg2-real-normalization-evidence.json`
- `D:\WattWiseMLData\manifests\nrel-comstock-2023.1-approved-subset.json`

## UCI final official attempt

The official `ucimlrepo` package was upgraded to version `0.0.7` and
`fetch_ucirepo(id=321)` returned `DatasetNotFoundError`: the dataset exists in the
repository but is not available for import. The official UCI archive URL was then
attempted through stable browser/network transports. BITS could not proceed because
the server omitted `Content-Length`; repeated official transfers stalled; the final
browser download stalled at 57,299,132 bytes as a `.crdownload` file and was removed.

No mirror, Kaggle copy, fixture, or partial archive was accepted. UCI is explicitly
excluded from the selected AI-01 tracks and classified
`DEFERRED_DATASET_AVAILABILITY`, not replaced.

## London adapter, licence, and real normalization

The adapter now resolves only these documented aliases:

- entity: exactly `LCLid`;
- timestamp: exactly one of `timestamp` or `DateTime`;
- usage: exactly one of `KWH/hh` or `KWH/hh (per half hour)`.

Leading/trailing header whitespace is normalized at the boundary because the actual
official CSV header contains `KWH/hh (per half hour) `. Missing semantic columns and
multiple aliases for one semantic field fail closed. Arbitrary columns are never
guessed. Invalid usage is excluded from the kWh sum and observation count; valid zero
usage remains a real zero.

The current official London Datastore page was checked on 2026-08-10. It labels the
dataset licence `Creative Commons Attribution` without a stated version. Canonical
metadata therefore uses that exact label and `VERIFIED_CC_ATTRIBUTION`; historical OGL
metadata is no longer inherited.

Actual source and output evidence:

| Field | Value |
| --- | --- |
| Raw path | `raw/london_smartmeter/1.0/CC_LCL-FullData.csv` |
| Raw bytes | 8,542,818,238 |
| Raw rows | 167,932,474 |
| Raw entities | 5,566 |
| Raw month range | 2011-11 through 2014-02 |
| Invalid usage rows | 5,560 |
| Pre-coverage entity-months | 118,478 |
| Eligible entities | 5,556 |
| Eligible entity-months | 112,525 |
| Eligible month range | 2011-12 through 2014-02 |
| Usage standard deviation | 254.5740 kWh |
| Usage maximum | 6,391.361 kWh |
| Raw SHA-256 | `1df23797368237f41831434b9add6540df8a68001dabf36242d52ca41807511f` |
| Parquet SHA-256 | `ad430f001330a377b025e996bfaa0561562817c292f5c734497a4f8f9db2758d` |
| Logical SHA-256 | `874906049530284eb4f27cdd68051c9fb4ff81111645d536c1b37f515486275b` |
| Quality-audit SHA-256 | `728da415330461a2ab73d537fd0bfd10f91bc731147a42b261711215d4ab1326` |

The official page describes 5,567 households; the monolithic CSV actually contains
5,566 distinct `LCLid` values. This report preserves the measured file count rather
than forcing the publisher-reported figure. The 5,556 count is the subset that passes
the 90% calendar-aware monthly coverage gate.

## BDG2 real verification

The raw files are official `buds-lab` v1.0 Git LFS objects. Actual SHA-256 values match
their Git LFS object IDs exactly:

- `electricity.csv`:
  `039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418`
- `metadata.csv`:
  `992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02`

The canonical output contains 1,574 entities and 35,481 entity-months from 2016-01
through 2017-12. Four of 1,578 raw electricity entities have no month at or above the
90% quality threshold and are explicitly accounted for. The corrected output carries
`measurement_method=SMART_METER`, `domain=PUBLIC_COMMERCIAL`, and
`is_synthetic=false`.

- Parquet SHA-256:
  `58e45e73ab25f736262a031637534e85d0bbf6f3910ce7d81752244a82edcc42`
- Logical SHA-256:
  `d21b6d66b96bb30f792226e6ae8f38c182c92918e3558e42ccadd6785e2d7e4b`
- Quality-audit SHA-256:
  `463f658f7c2f3811eac88a6a3b1f6affcb7e93d9cb8ae2ea79168672a9a5568c`

## NREL ComStock verification and isolation

The approved subset is from NREL/OEDI ComStock release 2023.1: baseline upgrade 0,
alphabetically first state `AK`, and the first 20 S3 keys/building IDs in ascending
listing order. All 20 raw-file hashes match the subset manifest. The deterministic
hourly staging file has 175,200 rows, 20 entities, and the SHA-256
`79ba0ee30d564bdcd9bcb577ccee629dedb0d3b1d9a02902b479f9a5c2d21862`.

The normalized output has 240 entity-months, exactly 12 months per entity, from
2018-01 through 2018-12.

- Parquet SHA-256:
  `308215b93afbdac50994179125d2f76d33be946bef8ea5aad3afd66bf7f047df`
- Logical SHA-256:
  `335a11d761649fbed41be1eb85d26b7ea198e642d74e95b27e59138f37e85920`

ComStock remains `MODELED_SIMULATION`. It is not included in a measured cohort and its
metrics must never be combined with measured sources into one production-accuracy
number.

## Quality, temporal, leakage, and contamination audit

Across the selected datasets:

- normalized usage has no missing, non-finite, or negative values;
- combined `(dataset_source, entity_id, period_month)` duplicates are zero;
- minimum accepted coverage is 0.90 for BDG2 and London, 1.00 for ComStock;
- all sources have at least six months of history and real within-source variation;
- forbidden future-target columns are absent;
- data source is part of the entity-month key, preventing cross-source ID collision;
- no target-derived feature or future outcome is present in the canonical panel;
- raw, normalized, audit, and logical hashes are machine-verified;
- fixture, mock, and synthetic rows are all zero.

Outliers and constant entities are retained as audited real observations, not silently
deleted: BDG2 has 8 constant entities and a 3-IQR outlier rate of 5.0393%; London has 2
constant entities and a 1.8405% rate; ComStock has no constant entity and a 2.5% rate.
These descriptive flags do not mix the measured and simulation tracks.

## Available cohort and next-experiment policy

The historical `MEASURED_BASELINE` remains UCI + BDG2 and is reported
`INCOMPLETE_IF_UCI_MISSING`. Available cohorts are explicit:

- `MEASURED_COMMERCIAL_AVAILABLE`: BDG2;
- `RESIDENTIAL_PROXY_AVAILABLE`: London SmartMeter;
- `SIMULATED_COMMERCIAL_AVAILABLE`: NREL ComStock;
- `ALL_AVAILABLE_PUBLIC_RESEARCH`: BDG2 + London + ComStock, with source-level
  reporting and simulation isolation.

For the next AI-01 experiment, BDG2 is the primary measured benchmark, London is the
secondary residential proxy, and ComStock is the auxiliary simulation benchmark. No
single combined production-accuracy score is permitted.

## Verification gates

Final local gates:

- `python -m pytest`: `184 passed`;
- `python -m ruff check src`: pass;
- `python -m mypy src`: pass, 51 source files;
- WattWise Vercel unit tests: 23 files / 285 tests passed;
- WattWise Vercel lint and TypeScript typecheck: pass;
- WattWise Vercel production build: pass (Next.js 16.2.11);
- Mega Audit raw-integrity, schema, quality, temporal, leakage, reproducibility,
  licence, contamination, and simulation-isolation gates: all pass.

Final classification:

```text
UCI_STATUS = UNAVAILABLE_TRANSPORT
UCI_TRAINING_ELIGIBLE = NO
UCI_CLASSIFICATION = DEFERRED_DATASET_AVAILABILITY
AUTHORITATIVE_DATA_AVAILABLE = YES
TRAINING_PRECHECK = PASS
P0 = 0
P1 = 0
READY_FOR_AI_01 = YES
```

This is data readiness only. It is not Product Owner acceptance and does not authorize
model training, deployment, or merge to `main`.
