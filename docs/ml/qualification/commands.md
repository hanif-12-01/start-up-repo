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

### A4. BDG2 Zenodo Archive Verification

**Actually Executed:**
Executed through a temporary local verification script that was intentionally not committed. The reproducible procedure below is equivalent, not the literal local command.
* **Execution Purpose:** Download canonical Zenodo v1.0 archive and verify byte-for-byte equivalence of extracted inputs against local staging files.
* **Execution Result:** Downloaded successfully.
  * Canonical Zenodo Record: `10.5281/zenodo.3887306` (version 1.0)
  * Archive Filename: `building-data-genome-project-2-v1.0.zip` (served as `buds-lab-building-data-genome-project-2-v1.0.zip`)
  * Downloaded Byte Size: `595,266,464` bytes
  * Archive SHA-256: `50ef5178c5d4ce18b0d0480140e83349d1b058f10b4b1e59b9e8698a7b8e417b` (MD5: `44393dc4cf61e84dec105e955368c890`)
  * Extracted File Names & Matching Local Hashes:
    * `electricity.csv` (Size: `174,239,039` bytes, SHA-256: `039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418`) matches local staging `electricity.csv` exactly.
    * `metadata.csv` (Size: `272,024` bytes, SHA-256: `992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02`) matches local staging `metadata.csv` exactly.

**Reproducible Equivalent Procedure:**
This procedure uses Python to download the canonical ZIP from Zenodo, verify its checksum, extract the target files, and verify them.

```python
import urllib.request
import hashlib
import zipfile
from pathlib import Path

# Config
DATA_ROOT = Path("<DATA_ROOT>") # Path to datasets root folder
target_zip = DATA_ROOT / "raw" / "bdg2" / "1.0" / "buds-lab-building-data-genome-project-2-v1.0.zip"
url = "https://zenodo.org/records/3887306/files/buds-lab/building-data-genome-project-2-v1.0.zip?download=1"

# Download canonical archive
target_zip.parent.mkdir(parents=True, exist_ok=True)
print(f"Downloading {url}...")
urllib.request.urlretrieve(url, target_zip)

# Check archive hash
archive_sha = hashlib.sha256(target_zip.read_bytes()).hexdigest()
assert archive_sha == "50ef5178c5d4ce18b0d0480140e83349d1b058f10b4b1e59b9e8698a7b8e417b"
print("Zenodo Archive SHA-256 is verified!")

# Expected hashes
EXPECTED_ELECTRICITY_SHA = "039d909d8981e2d69eaeb366144e6ab7e84fa5e7e216aee42bddd95384a66418"
EXPECTED_METADATA_SHA = "992d0b29f24f96ad4332bc4dbb534b7bdd7dd2689aad093f94e93068ecddca02"

# Extract and verify byte-equivalence
with zipfile.ZipFile(target_zip) as zf:
    # Extract electricity.csv
    elec_entry = "buds-lab-building-data-genome-project-2-3d0cbaf/data/meters/raw/electricity.csv"
    with zf.open(elec_entry) as src:
        elec_bytes = src.read()
    elec_sha = hashlib.sha256(elec_bytes).hexdigest()

    # Extract metadata.csv
    meta_entry = "buds-lab-building-data-genome-project-2-3d0cbaf/data/metadata/metadata.csv"
    with zf.open(meta_entry) as src:
        meta_bytes = src.read()
    meta_sha = hashlib.sha256(meta_bytes).hexdigest()

# Load local staging files
local_elec = DATA_ROOT / "staging" / "bdg2" / "electricity.csv"
local_meta = DATA_ROOT / "staging" / "bdg2" / "metadata.csv"

local_elec_bytes = local_elec.read_bytes()
local_meta_bytes = local_meta.read_bytes()

local_elec_sha = hashlib.sha256(local_elec_bytes).hexdigest()
local_meta_sha = hashlib.sha256(local_meta_bytes).hexdigest()

# Assertions for electricity
assert elec_sha == EXPECTED_ELECTRICITY_SHA
assert local_elec_sha == elec_sha
assert local_elec_bytes == elec_bytes

# Assertions for metadata
assert meta_sha == EXPECTED_METADATA_SHA
assert local_meta_sha == meta_sha
assert local_meta_bytes == meta_bytes

print("Byte-equivalence of extracted inputs verified against local staging files!")
```

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
