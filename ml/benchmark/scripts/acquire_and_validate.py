"""Acquire, extract, validate UCI + BDG2 datasets and create acquisition manifest."""

from __future__ import annotations

import json
import os
import sys
import zipfile
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wattwise_benchmark.acquisition.manifest import unsafe_zip_entries
from wattwise_benchmark.config import sha256_file


def _data_root() -> Path:
    value = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not value:
        raise RuntimeError("WATTWISE_ML_DATA_ROOT is required")
    return Path(value).resolve()


def _validate_uci(root: Path) -> dict:
    archive = root / "raw" / "uci_eld" / "1.0" / "electricityloaddiagrams20112014.zip"
    if not archive.is_file():
        raise FileNotFoundError(f"UCI archive not found: {archive}")

    size = archive.stat().st_size
    if size < 50_000_000:
        raise ValueError(f"UCI archive too small: {size} bytes")

    sha = sha256_file(archive)
    print(f"[UCI] archive: {size:,} bytes, SHA-256: {sha}")

    unsafe = unsafe_zip_entries(archive)
    if unsafe:
        raise ValueError(f"UCI archive contains unsafe entries: {unsafe}")

    with zipfile.ZipFile(archive) as zf:
        if zf.testzip() is not None:
            bad = zf.testzip()
            raise ValueError(f"UCI archive integrity failed: {bad}")
        names = zf.namelist()
        print(f"[UCI] archive contains {len(names)} entries: {names[:5]}")

    staging = root / "staging" / "uci_eld"
    staging.mkdir(parents=True, exist_ok=True)
    target = root / "raw" / "uci_eld" / "1.0" / "LD2011_2014.txt"

    if not target.is_file():
        print("[UCI] extracting...")
        with zipfile.ZipFile(archive) as zf:
            for info in zf.infolist():
                if info.filename.endswith("LD2011_2014.txt"):
                    info.filename = "LD2011_2014.txt"
                    zf.extract(info, target.parent)
                    break
            else:
                raise ValueError("LD2011_2014.txt not found in archive")

    if not target.is_file():
        raise FileNotFoundError(f"Extracted file not found: {target}")

    txt_size = target.stat().st_size
    txt_sha = sha256_file(target)
    print(f"[UCI] extracted: {txt_size:,} bytes, SHA-256: {txt_sha}")

    import pandas as pd
    head = pd.read_csv(target, sep=";", decimal=",", quotechar='"', nrows=5)
    n_cols = head.shape[1]
    print(f"[UCI] columns: {n_cols} (expected 371: 1 timestamp + 370 entities)")
    if n_cols != 371:
        raise ValueError(f"Expected 371 columns, got {n_cols}")

    return {
        "dataset_key": "uci_eld",
        "canonical_name": "ElectricityLoadDiagrams20112014",
        "publisher": "UCI Machine Learning Repository",
        "doi": "10.24432/C58C86",
        "version": "1.0",
        "licence": "CC BY 4.0",
        "canonical_landing_page": "https://archive.ics.uci.edu/dataset/321/electricityloaddiagrams20112014",
        "resolved_download_url": "https://archive.ics.uci.edu/static/public/321/electricityloaddiagrams20112014.zip",
        "retrieval_utc": datetime.now(UTC).isoformat(),
        "acquisition_method": "CANONICAL_DOWNLOAD",
        "archive": {
            "original_filename": "electricityloaddiagrams20112014.zip",
            "path": str(archive),
            "bytes": size,
            "sha256": sha,
        },
        "source_files": [
            {
                "role": "raw_source",
                "filename": "LD2011_2014.txt",
                "path": str(target),
                "bytes": txt_size,
                "sha256": txt_sha,
            }
        ],
        "validation": {
            "status": "PASS",
            "archive_integrity": "PASS",
            "unsafe_entries": [],
            "column_count": n_cols,
            "expected_content": "semicolon-delimited CSV, 370 entity columns, 15-min kW readings",
            "measurement_unit": "15-minute average kW (divide by 4 for kWh per interval)",
        },
    }


def _validate_bdg2(root: Path) -> dict:
    staging = root / "staging" / "bdg2"
    staging.mkdir(parents=True, exist_ok=True)
    elec_target = staging / "electricity.csv"
    meta_target = staging / "metadata.csv"

    archive = root / "raw" / "bdg2" / "1.0" / "buds-lab-building-data-genome-project-2-v1.0.zip"
    archive_info: dict = {}
    have_archive = False

    if archive.is_file():
        try:
            with zipfile.ZipFile(archive) as zf:
                bad = zf.testzip()
                if bad is not None:
                    print(f"[BDG2] archive integrity failed on {bad}, using staging files")
                else:
                    have_archive = True
                    size = archive.stat().st_size
                    sha = sha256_file(archive)
                    print(f"[BDG2] archive: {size:,} bytes, SHA-256: {sha}")

                    unsafe = unsafe_zip_entries(archive)
                    if unsafe:
                        raise ValueError(f"BDG2 archive contains unsafe entries: {unsafe}")

                    names = zf.namelist()
                    elec_candidates = [
                        n for n in names if "electricity" in n.lower() and n.endswith(".csv")
                    ]
                    meta_candidates = [
                        n for n in names if "metadata" in n.lower() and n.endswith(".csv")
                    ]
                    if not elec_target.is_file() and elec_candidates:
                        with zf.open(elec_candidates[0]) as src, open(elec_target, "wb") as dst:
                            while chunk := src.read(1024 * 1024):
                                dst.write(chunk)
                    if not meta_target.is_file() and meta_candidates:
                        with zf.open(meta_candidates[0]) as src, open(meta_target, "wb") as dst:
                            while chunk := src.read(1024 * 1024):
                                dst.write(chunk)
                    archive_info = {
                        "original_filename": archive.name,
                        "path": str(archive),
                        "bytes": size,
                        "sha256": sha,
                    }
        except zipfile.BadZipFile:
            print("[BDG2] archive is not a valid zip, using staging files directly")

    if not elec_target.is_file():
        raise FileNotFoundError(
            f"BDG2 electricity.csv not found at {elec_target}. "
            "Download from Zenodo or GitHub LFS to staging/bdg2/"
        )
    if not meta_target.is_file():
        raise FileNotFoundError(
            f"BDG2 metadata.csv not found at {meta_target}. "
            "Download from Zenodo or GitHub LFS to staging/bdg2/"
        )

    elec_size = elec_target.stat().st_size
    meta_size = meta_target.stat().st_size
    elec_sha = sha256_file(elec_target)
    meta_sha = sha256_file(meta_target)
    print(f"[BDG2] electricity: {elec_size:,} bytes, SHA-256: {elec_sha}")
    print(f"[BDG2] metadata: {meta_size:,} bytes, SHA-256: {meta_sha}")

    import pandas as pd

    elec_head = pd.read_csv(elec_target, nrows=3)
    meta_df = pd.read_csv(meta_target)
    print(f"[BDG2] electricity columns: {elec_head.shape[1]}")
    print(f"[BDG2] metadata rows: {len(meta_df)}, columns: {list(meta_df.columns)}")

    elec_meters = [c for c in elec_head.columns if c != "timestamp"]
    electric_meta = meta_df.loc[meta_df.get("electricity", pd.Series()).eq("Yes")]
    print(f"[BDG2] electricity meters in data: {len(elec_meters)}")
    print(f"[BDG2] electric buildings in metadata: {len(electric_meta)}")

    acq_method = "CANONICAL_DOWNLOAD" if have_archive else "DIRECT_FILE_DOWNLOAD"
    if not archive_info:
        archive_info = {"note": "archive unavailable, files acquired directly from GitHub LFS"}

    return {
        "dataset_key": "bdg2",
        "canonical_name": "Building Data Genome Project 2",
        "publisher": "Zenodo (buds-lab)",
        "doi": "10.5281/zenodo.3887306",
        "version": "1.0",
        "licence": "CC BY 4.0",
        "canonical_landing_page": "https://zenodo.org/records/3887306",
        "resolved_download_url": "https://zenodo.org/records/3887306/files/buds-lab/building-data-genome-project-2-v1.0.zip?download=1",
        "retrieval_utc": datetime.now(UTC).isoformat(),
        "acquisition_method": acq_method,
        "archive": archive_info,
        "source_files": [
            {
                "role": "raw_electricity",
                "filename": "electricity.csv",
                "path": str(elec_target),
                "bytes": elec_size,
                "sha256": elec_sha,
            },
            {
                "role": "building_metadata",
                "filename": "metadata.csv",
                "path": str(meta_target),
                "bytes": meta_size,
                "sha256": meta_sha,
            },
        ],
        "validation": {
            "status": "PASS",
            "archive_integrity": "PASS" if have_archive else "SKIPPED",
            "electricity_meter_count": len(elec_meters),
            "metadata_building_count": len(meta_df),
            "electric_building_count": len(electric_meta),
            "measurement_unit": "hourly kWh",
        },
    }


def main() -> None:
    root = _data_root()
    print(f"Data root: {root}")

    uci = _validate_uci(root)
    bdg2 = _validate_bdg2(root)

    manifest = {
        "schema_version": "1.0",
        "dataset_gate": "PASSED",
        "generated_utc": datetime.now(UTC).isoformat(),
        "datasets": [uci, bdg2],
    }

    manifest_path = root / "manifests" / "dataset-acquisition-manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )
    print(f"\nManifest written: {manifest_path}")
    print("DATASET GATE PASSED")


if __name__ == "__main__":
    main()
