# Commands — Qualification Evidence Provenance

## A. Commands Executed During This Branch (2026-07-20)

### A1. Branch creation

```
git checkout -b research/phase-aware-ai-production-qualification origin/main
```

- **Purpose:** Create research branch from baseline SHA `af3f5f0`
- **Executed now:** Yes
- **Result:** Branch created successfully

### A2. Unit tests

```
cd ml/benchmark
.venv/Scripts/python.exe -m pytest tests/test_splits.py tests/test_contracts.py tests/test_deterministic.py tests/test_provenance.py -v --tb=short
```

- **Purpose:** Verify split isolation, contract definitions, deterministic formula, and provenance tests
- **Executed now:** Yes
- **Result:** 41 passed in 4.27s
- **Output:** Console (not persisted to file)

### A3. Qualification deliverable creation

- **Purpose:** Create `docs/ml/qualification/` files summarizing pre-existing evidence
- **Executed now:** Yes (file creation, not benchmark execution)
- **Result:** 16 deliverable files created
- **Note:** No `normalize`, `benchmark`, `recover-inference`, or `refresh-recovery-reports` commands were executed

---

## B. Commands From the Original Recovered Benchmark Run (2026-07-17 to 2026-07-18)

### B1. Artifact probe

```
python scripts/probe_recovered_artifacts.py \
  --artifact-root C:\WattWiseRecovery\full-final-v2\artifacts \
  --checksum-report C:\WattWiseRecovery\full-final-v2\artifact-checksums.csv
```

- **Purpose:** Verify 36 model artifacts exist with matching checksums
- **Executed now:** No (executed ~2026-07-17)
- **Result:** Exit 0; 36/36 artifacts verified
- **Output:** `ml/benchmark/results/native-artifact-probe.json` (18.7 KB)
- **Runner script:** `ml/benchmark/scripts/run_native_artifact_probe.ps1` (not committed; contains local paths)

### B2. Recovery inference

```
python -m wattwise_benchmark.cli recover-inference \
  --artifact-root C:\WattWiseRecovery\full-final-v2\artifacts \
  --run-id full-final-v2-recovered-01
```

- **Purpose:** Rebuild predictions from verified artifacts without training
- **Executed now:** No (executed 2026-07-18 05:29:33–05:35:23 UTC)
- **Result:** Exit 0; 325,812 predictions, 273,039 successful, 0 failed
- **Output:** `C:\WattWiseRecovery\full-final-v2-recovered-01\` (local, not committed)
- **Runner script:** `ml/benchmark/scripts/run_native_recovery.ps1` (not committed)
- **Training blocked:** `prohibit_training()` context manager active; `training_operation_invoked=false`

### B3. Report refresh

```
python -m wattwise_benchmark.cli refresh-recovery-reports \
  --run-dir C:\WattWiseRecovery\full-final-v2-recovered-01
```

- **Purpose:** Regenerate leaderboards and paired comparisons from immutable predictions
- **Executed now:** No (executed 2026-07-18 06:42:24 UTC)
- **Result:** Exit 0; reports refreshed; selection_counts_reconciled=true
- **Output:** Updated CSVs and manifest in recovery directory
- **Runner script:** `ml/benchmark/scripts/run_native_report_refresh.ps1` (not committed)

### B4. Output audit

```
python scripts/audit_recovered_run.py \
  --output-dir C:\WattWiseRecovery\full-final-v2-recovered-01 \
  --audit-json ml/benchmark/results/recovered-run-audit.json
```

- **Purpose:** Generate comprehensive audit JSON from recovered run outputs
- **Executed now:** No (executed ~2026-07-18)
- **Result:** Exit 0; 508 KB audit JSON generated
- **Output:** `ml/benchmark/results/recovered-run-audit.json` (14,801 lines)
- **Runner script:** `ml/benchmark/scripts/run_native_output_audit.ps1` (not committed)

---

## Excluded Local Evidence (Not Committed)

| File | Size | SHA-256 | Purpose | Reason excluded |
|------|------|---------|---------|-----------------|
| `ml/benchmark/results/recovered-run-audit.json` | 508 KB | (see checksums.sha256) | Comprehensive audit of recovered run; aggregate metrics, eligibility, paired comparisons | Large file; aggregate evidence extracted into compact qualification CSVs instead |
| `C:\WattWiseRecovery\full-final-v2-recovered-01\run-manifest.json` | 59 KB | `ba58e484d49ad5fcc6ea9a930a0cf9e148582086ae585a1adf100ed7a2d5c932` | Full run manifest with absolute local paths | Contains machine-specific paths; compact `run-manifest.json` in qualification dir replaces it |
| `C:\WattWiseRecovery\full-final-v2-recovered-01\predictions.parquet` | 4.2 MB | `9192dbb623b7403ee26c21b297264048faf79986db21b1d88ebbb61b0f3bf116` | Per-observation prediction rows (325,812 rows) | Per-observation data; not committed per policy |
| `C:\WattWiseRecovery\full-final-v2-recovered-01\metrics.parquet` | 45 KB | `ba348a80e8e4cc2309e03ac6a52b97f86445c81d5d01a1abde15101b35debe9b` | Metric aggregates | Parquet format; evidence extracted into CSVs |
| `ml/benchmark/scripts/run_native_*.ps1` (4 files) | ~3 KB total | N/A | PowerShell wrappers for benchmark commands | Contain machine-specific absolute paths |
