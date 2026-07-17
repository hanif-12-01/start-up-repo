# WattWise UCI + BDG2 benchmark

This package acquires no data implicitly. It validates the operator-provided
canonical acquisition manifest, normalizes UCI ElectricityLoadDiagrams20112014
and pinned Building Data Genome Project 2 v1.0 into a monthly contract, audits
quality, and runs leakage-safe rolling-origin benchmarks.

All raw data, Parquet panels, predictions, checkpoints, models, and logs stay
under `${WATTWISE_ML_DATA_ROOT}`. Repository outputs are aggregate reports only.
GoiEner is intentionally unsupported and remains `LEGAL_REVIEW_REQUIRED`.

PyTorch Forecasting 1.8.0 was selected for N-BEATS and DeepAR because its
maintained official package supports both global models, probabilistic losses,
CPU execution on Windows and Python 3.13 was verified locally.
its unconditional Ray dependency failed normal resolution on Windows/Python
3.13. Deep models require at least six complete usage-history months; no
fabricated padding is permitted.

Typical commands (from this directory):

```powershell
$env:WATTWISE_ML_DATA_ROOT='D:\path\outside-git\wattwise-ml-datasets'
.venv\Scripts\python -m wattwise_benchmark.cli validate-acquisition
.venv\Scripts\python -m wattwise_benchmark.cli normalize
.venv\Scripts\python -m wattwise_benchmark.cli audit
.venv\Scripts\python -m wattwise_benchmark.cli benchmark --stage smoke
.venv\Scripts\python -m wattwise_benchmark.cli benchmark --stage full
```

The benchmark does not expose predictions to Laravel, register models, alter
feature flags, write databases, or provide a model-serving API.
