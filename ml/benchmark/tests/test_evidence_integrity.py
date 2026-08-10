from __future__ import annotations

import json
import re
from pathlib import Path
import pandas as pd
import pytest

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.datasets.cohorts import compute_logical_dataset_sha256
from wattwise_benchmark.datasets.evidence import build_dataset_release_evidence
from wattwise_benchmark.pipeline import normalize_all

HEX64_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def _setup_mock_data_root(root: Path) -> None:
    manifests_dir = root / "manifests"
    raw_dir = root / "raw"
    staging_dir = root / "staging"
    manifests_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    uci_raw = raw_dir / "uci_mock.txt"
    uci_cols = ["Date"] + [f"MT_{i+1:03d}" for i in range(370)]
    uci_header = ";".join(uci_cols) + "\n"
    uci_dates = pd.date_range("2011-01-01", periods=2976, freq="15min").strftime("%Y-%m-%d %H:%M:%S")
    uci_rows = [f"{dt};" + ";".join(["1,0"] * 370) for dt in uci_dates]
    uci_raw.write_text(uci_header + "\n".join(uci_rows) + "\n", encoding="utf-8")

    bdg2_elec = staging_dir / "bdg2" / "electricity.csv"
    bdg2_meta = staging_dir / "bdg2" / "metadata.csv"
    bdg2_elec.parent.mkdir(parents=True, exist_ok=True)
    bldgs = [f"bldg_{i+1}" for i in range(1578)]
    ts = pd.date_range("2016-01-01", periods=744, freq="h")
    elec_df = pd.DataFrame({b: [10.0] * 744 for b in bldgs})
    elec_df.insert(0, "timestamp", ts)
    elec_df.to_csv(bdg2_elec, index=False)
    meta_rows = ["building_id,site_id,primaryspaceusage,sqm,timezone,electricity,industry\n"]
    meta_rows.extend([f"bldg_{i+1},site1,Office,1000,UTC,Yes,Education\n" for i in range(1578)])
    bdg2_meta.write_text("".join(meta_rows), encoding="utf-8")

    london_raw = raw_dir / "london_mock.csv"
    london_df = pd.DataFrame({
        "LCLid": ["MAC000001"] * 1488,
        "timestamp": pd.date_range("2013-01-01", periods=1488, freq="30min"),
        "KWH/hh": [0.5] * 1488,
    })
    london_df.to_csv(london_raw, index=False)

    comstock_raw = raw_dir / "comstock_mock.csv"
    comstock_df = pd.DataFrame({
        "bldg_id": ["bldg_01"] * 744,
        "timestamp": pd.date_range("2023-01-01", periods=744, freq="h"),
        "kwh": [5.0] * 744,
    })
    comstock_df.to_csv(comstock_raw, index=False)

    acq_manifest = {
        "schema_version": "1.0",
        "dataset_gate": "PASSED",
        "datasets": [
            {
                "dataset_key": "uci_eld",
                "publisher": "UCI Repository",
                "doi": "10.24432/C58C86",
                "version": "2011-2014",
                "licence": "CC BY 4.0",
                "validation": {"status": "PASS"},
                "source_files": [{"role": "raw_electricity", "path": str(uci_raw)}],
            },
            {
                "dataset_key": "bdg2",
                "publisher": "buds-lab",
                "doi": "10.5281/zenodo.3887306",
                "version": "v1.0",
                "licence": "CC BY 4.0",
                "validation": {"status": "PASS"},
                "source_files": [
                    {"role": "raw_electricity", "path": str(bdg2_elec)},
                    {"role": "building_metadata", "path": str(bdg2_meta)},
                ],
            },
            {
                "dataset_key": "london_smartmeter",
                "publisher": "UK Power Networks",
                "version": "2011-2014",
                "licence": "OGL v3.0",
                "validation": {"status": "PASS"},
                "source_files": [{"role": "raw_electricity", "path": str(london_raw)}],
            },
            {
                "dataset_key": "nrel_comstock",
                "publisher": "US DOE / NREL",
                "version": "2023.1",
                "licence": "CC BY 4.0",
                "validation": {"status": "PASS"},
                "source_files": [{"role": "raw_electricity", "path": str(comstock_raw)}],
            },
        ],
    }
    (manifests_dir / "dataset-acquisition-manifest.json").write_text(
        json.dumps(acq_manifest, indent=2), encoding="utf-8"
    )

    pkg_root = Path(__file__).resolve().parent.parent / "src" / "wattwise_benchmark"
    normalize_all(root, pkg_root, completeness_threshold=0.01, force=True)


def test_evidence_generation_fails_closed_when_data_root_missing(tmp_path: Path) -> None:
    non_existent = tmp_path / "non_existent_data_root"
    with pytest.raises(FileNotFoundError):
        build_dataset_release_evidence(data_root=non_existent)


def test_evidence_generation_fails_closed_when_london_parquet_missing(tmp_path: Path) -> None:
    _setup_mock_data_root(tmp_path)
    london_parquet = tmp_path / "normalized" / "london_smartmeter" / "1.0" / "monthly.parquet"
    london_parquet.unlink()
    with pytest.raises(FileNotFoundError, match="london_smartmeter"):
        build_dataset_release_evidence(data_root=tmp_path)


def test_evidence_generation_fails_closed_when_raw_file_missing(tmp_path: Path) -> None:
    _setup_mock_data_root(tmp_path)
    london_raw = tmp_path / "raw" / "london_mock.csv"
    london_raw.unlink()
    with pytest.raises(FileNotFoundError, match="london_smartmeter"):
        build_dataset_release_evidence(data_root=tmp_path)


def test_evidence_generation_fails_closed_when_audit_file_missing(tmp_path: Path) -> None:
    _setup_mock_data_root(tmp_path)
    audit_file = tmp_path / "normalized" / "uci_eld" / "1.0" / "quality-audit.json"
    audit_file.unlink()
    with pytest.raises(FileNotFoundError, match="uci_eld"):
        build_dataset_release_evidence(data_root=tmp_path)


def test_artifact_to_manifest_exact_hash_match(tmp_path: Path) -> None:
    _setup_mock_data_root(tmp_path)
    evidence = build_dataset_release_evidence(data_root=tmp_path)

    assert evidence["schema_version"] == "2.0"
    assert HEX64_PATTERN.match(evidence["dataset_release_fingerprint"])

    datasets = evidence["datasets"]
    assert set(datasets.keys()) == {"uci_eld", "bdg2", "london_smartmeter", "nrel_comstock"}

    for ds_id, meta in datasets.items():
        parquet_path = tmp_path / "normalized" / ds_id / "1.0" / "monthly.parquet"
        audit_path = tmp_path / "normalized" / ds_id / "1.0" / "quality-audit.json"

        # Verify exact file SHA-256 matches
        assert sha256_file(parquet_path) == meta["normalized_parquet_sha256"]
        assert sha256_file(audit_path) == meta["quality_audit_sha256"]

        # Verify exact logical dataset SHA-256 match
        df = pd.read_parquet(parquet_path)
        assert compute_logical_dataset_sha256(df) == meta["logical_dataset_sha256"]


def test_rebuild_verification_counts_and_hashes_identical(tmp_path: Path) -> None:
    root1 = tmp_path / "data_root_1"
    root2 = tmp_path / "data_root_2"

    _setup_mock_data_root(root1)
    _setup_mock_data_root(root2)

    ev1 = build_dataset_release_evidence(data_root=root1)
    ev2 = build_dataset_release_evidence(data_root=root2)

    counts_identical = True
    logical_hashes_identical = True

    for ds_id in ["uci_eld", "bdg2", "london_smartmeter", "nrel_comstock"]:
        d1 = ev1["datasets"][ds_id]
        d2 = ev2["datasets"][ds_id]

        if d1["normalized_entity_count"] != d2["normalized_entity_count"]:
            counts_identical = False
        if d1["normalized_entity_month_count"] != d2["normalized_entity_month_count"]:
            counts_identical = False
        if d1["logical_dataset_sha256"] != d2["logical_dataset_sha256"]:
            logical_hashes_identical = False

    assert counts_identical, "COUNTS_IDENTICAL = YES required"
    assert logical_hashes_identical, "LOGICAL_HASHES_IDENTICAL = YES required"
