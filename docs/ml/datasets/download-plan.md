# IT-ML-02A safe dataset acquisition plan

No raw dataset was downloaded during IT-ML-02A. This is a metadata-first plan for a later, explicitly approved ingestion task.

## Storage boundary

Use `D:\LOMBA\Startup Proto Data\wattwise-ml-datasets`, outside the Laravel application and Git worktree. The intended structure is:

```text
wattwise-ml-datasets/
  manifests/                 # URLs, licences, checksums, retrieval date
  raw/<dataset>/<version>/   # immutable publisher files
  extracted/<dataset>/       # local-only extraction
  standardized/<dataset>/    # monthly partitions, local-only
  audit/<dataset>/            # quality summaries, no direct identifiers
```

Before any acquisition, add a local ignore/backup exclusion at the cache root. Do not add raw archives, CSV/Parquet panels, training matrices, or model artifacts to this repository. Store only the small metadata summaries defined by this discovery package.

## Approval and integrity gates

1. Re-open the canonical record and licence on retrieval day; save the URL, version, licence text, timestamp, and published checksum in `manifests`. If official licence fields conflict, classify the source `LEGAL_REVIEW_REQUIRED` and stop acquisition.
2. For any dataset whose compressed archive or extracted footprint exceeds 2 GB, stop for explicit approval after metadata inspection. Prefer publisher splits, per-entity files, APIs, or range-limited samples.
3. Download only from the canonical publisher/archive. A Kaggle mirror is not canonical.
4. Verify checksum before extraction. Extract into a new version directory; never overwrite an earlier version.
5. Scan headers and a small, representative sample before bulk parsing. Never upload restricted data to an online service.
6. Produce source-level quality and phase counts locally, then export aggregate audit CSVs only.


## GoiEner legal acquisition gate

The canonical [Zenodo Description](https://zenodo.org/records/7362094) states `License: CC-BY-SA`. The canonical [DataCite DOI metadata](https://api.datacite.org/dois/10.5281/zenodo.7362094) states `data.attributes.rightsList[0] = Creative Commons Attribution 4.0 International`. These official statements conflict. `commercial_use_permission` and `redistribution_permission` are `PENDING_CLARIFICATION`.

Do not retrieve `metadata.csv`, a processed split, the raw archive, or use any GoiEner content for production-intended training until an archive LICENSE, corrected DataCite/Zenodo metadata, or written publisher confirmation establishes the governing licence. Legal clearance precedes the existing greater-than-2-GB approval gate.

## Primary-source sequence

| Order | Dataset | Publisher package | Compressed | Extracted | Safe action |
|---:|---|---|---:|---:|---|
| 1 | UCI ElectricityLoadDiagrams | UCI download, DOI `10.24432/C58C86` | 249.2 MB | 678.1 MB | Download in one file, checksum locally, and validate the wide header. This is the quickest conversion-pipeline pilot. |
| 2 | Building Data Genome 2 | Zenodo v1.0, DOI `10.5281/zenodo.3887306` | 595.3 MB | unknown; expected below a few GB | Retrieve the pinned Zenodo archive. Extract metadata, weather, and electricity only; ignore non-electric meter targets. Stop if actual extracted size exceeds 2 GB. |
| 3 | London Smart Meter | London Datastore 168-file split archive | 758.86 MB | about 10 GB | Extracted size exceeds 2 GB: approval required. Prefer the 168-file package, stream one file at a time, aggregate to monthly immediately, and delete only under an approved cache-retention policy. Also fetch the 239.63 kB tariff file. |
| 4 | HEAPO | Zenodo v1, DOI `10.5281/zenodo.15056919` | 458.3 MB | 5.26 GB | Extracted size exceeds 2 GB: approval required. Inspect archive listing first. Prefer publisher monthly CSVs plus metadata; do not extract 15-minute files unless reconciliation is required. |
| 5 | REFIT cleaned | University of Strathclyde `CLEAN_REFIT_081116.7z` | 490 MB | estimated 8-12 GB | Extracted size likely exceeds 2 GB: approval required. Inspect 7z listing and readme first; process one home at a time with timestamp-delta integration. Do not fetch linked restricted interviews. |
| BLOCKED | GoiEner processed | Zenodo DOI `10.5281/zenodo.7362094` | raw 2.0 GB; split processed files 0.51-0.79 GB | 4.01-15.1 GB per component | **Do not download.** Zenodo Description says `CC-BY-SA` while DataCite `rightsList[0]` says `CC BY 4.0`. Acquisition and production-intended training remain blocked until the archive LICENSE, corrected metadata, or publisher confirms the governing licence; size approval is still required afterward. |

The sequence is operational, not ranking order: it deliberately validates small/manageable converters before the largest source.

## Optional and restricted sources

- IDEAL: more than 30 GB compressed across heavy components. First retrieve only the 995 B readme, 4.39 MB documentation, 360.82 kB metadata/surveys, coding files, and 17.01 kB licence. Propose a home/sample/API query after inspecting documentation; do not bulk download without separate approval.
- Ausgrid: verify the three current annual resource sizes at the official page, then acquire annual ZIPs separately. Preserve `Row Quality` and GC/CL/GG channels.
- I-BLEND: inspect Figshare collection metadata and item-level licence/size first. Stream individual building files if offered.
- UK-DALE: acquire only the 1-second/6-second or HDF5 low-frequency collection. Never acquire the approximately 4 TB 16 kHz waveforms for monthly forecasting.
- CER/ISSDA and Pecan Street: do not download, request an account, or submit an application in an engineering task. They remain restricted backups pending written legal/business approval.
- FIKElectricity and NEED: no acquisition for phase forecasting; they fail duration or monthly-grain gates.

## Post-download audit deliverable

The next ingestion task should generate, for each approved source, a manifest with file checksum/size, verified rows/columns, entity date ranges, missing and duplicate timestamps, negative/zero/outlier counts, DST anomalies, unit checks, monthly coverage, consecutive runs, and exact rolling-origin phase counts. The audit must compare these measurements to the `PUBLISHER_REPORTED`, `ESTIMATED_UPPER_BOUND`, and `UNKNOWN` values in this discovery package and update statuses rather than silently replacing them.
