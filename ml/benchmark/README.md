# WattWise UCI + BDG2 benchmark

This package acquires no data implicitly. It validates the operator-provided
canonical acquisition manifest, normalizes UCI ElectricityLoadDiagrams20112014
and Building Data Genome Project 2 into a monthly contract, audits quality, and
runs leakage-safe rolling-origin benchmarks. The BDG2 files are pinned to Git
LFS object IDs from repository tag `v1.0`; equivalence to the Zenodo archive and
the applicable licence scope still require review and must not be inferred.

All raw data, Parquet panels, predictions, checkpoints, models, and logs stay
under `${WATTWISE_ML_DATA_ROOT}`. Repository outputs are aggregate reports only.
GoiEner is intentionally unsupported and remains `LEGAL_REVIEW_REQUIRED`.

PyTorch Forecasting 1.8.0 provides the N-BEATS and DeepAR implementations used
by this benchmark, including probabilistic DeepAR output. CPU execution was
verified locally on Windows with Python 3.13. Deep models require at least six
complete usage-history months; no fabricated padding is permitted.

Typical commands (from this directory):

```powershell
$env:WATTWISE_ML_DATA_ROOT='D:\path\outside-git\wattwise-ml-datasets'
.venv\Scripts\python -m wattwise_benchmark.cli normalize
.venv\Scripts\python -m wattwise_benchmark.cli benchmark --stage smoke
.venv\Scripts\python -m wattwise_benchmark.cli benchmark --stage full
.venv\Scripts\python -m wattwise_benchmark.cli report `
    --source-run-id immutable-run-id `
    --report-id immutable-run-id-reporting-v1
$artifactRoot = '<RECOVERY_ROOT>\full-final-v2\artifacts'
.venv\Scripts\python -m wattwise_benchmark.cli recover-inference `
    --artifact-root $artifactRoot `
    --run-id full-final-v2-recovered-01
.venv\Scripts\python -m wattwise_benchmark.cli refresh-recovery-reports `
    --run-dir '<RECOVERY_ROOT>\full-final-v2-recovered-01'
```

The report command reads and checksum-verifies immutable prediction and metric
outputs, then writes corrected reports to a new, non-existing directory under
`benchmark-reports`. It never overwrites the source run. Reporting separates
`H00` from `H01_02`, measures coverage only where successful eligible
predictions exist, and emits an explicit reason when a paired cohort is empty
or too small.

`recover-inference` is an artifact-only corrective path. It validates the
artifact matrix, inference-compatible source, normalized inputs, and the
supplied truncated original prediction file before prediction. Parameter-
updating training calls are blocked. PyTorch may call `train(False)` while
entering evaluation mode; `train(True)`, fit APIs, and optimizer steps remain
blocked. `refresh-recovery-reports` replaces each report file atomically, but
the complete report set is not a transactional unit if a later replacement
fails.

BDG2 remains `PARTIAL — BDG2 PROVENANCE REVIEW REQUIRED`; the repository and
Zenodo licence scopes and byte equivalence are not treated as resolved. All
portfolio output is research-only and is not a production-readiness decision.

The benchmark does not expose predictions to Laravel, register models, alter
feature flags, write databases, or provide a model-serving API.
