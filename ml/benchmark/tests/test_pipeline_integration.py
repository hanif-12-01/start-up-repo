from __future__ import annotations

import json
from pathlib import Path
import pandas as pd
import pytest

from wattwise_benchmark.pipeline import normalize_all


def test_four_dataset_pipeline_integration_fixture(tmp_path: Path) -> None:
    data_root = tmp_path / "data_root"
    manifests_dir = data_root / "manifests"
    raw_dir = data_root / "raw"
    manifests_dir.mkdir(parents=True)
    raw_dir.mkdir(parents=True)

    # 1. Create mock UCI raw file (370 entity columns, 2976 15-min intervals for Jan 2011)
    uci_cols = ["Date"] + [f"MT_{i+1:03d}" for i in range(370)]
    uci_header = ";".join(uci_cols) + "\n"
    uci_dates = pd.date_range("2011-01-01", periods=2976, freq="15min").strftime("%Y-%m-%d %H:%M:%S")
    uci_rows = [f"{dt};" + ";".join(["1,0"] * 370) for dt in uci_dates]
    uci_file = raw_dir / "uci_mock.txt"
    uci_file.write_text(uci_header + "\n".join(uci_rows) + "\n", encoding="utf-8")

    # 2. Create mock BDG2 raw files (1578 building columns, 744 hours for Jan 2016)
    bdg2_bldgs = [f"bldg_{i+1}" for i in range(1578)]
    bdg2_ts = pd.date_range("2016-01-01", periods=744, freq="h")
    bdg2_elec_df = pd.DataFrame({bldg: [10.0] * 744 for bldg in bdg2_bldgs})
    bdg2_elec_df.insert(0, "timestamp", bdg2_ts)
    bdg2_elec = raw_dir / "bdg2_elec.csv"
    bdg2_elec_df.to_csv(bdg2_elec, index=False)

    bdg2_meta_header = "building_id,site_id,primaryspaceusage,sqm,timezone,electricity,industry\n"
    bdg2_meta_rows = "\n".join([f"bldg_{i+1},site1,Office,1000,UTC,Yes,Education" for i in range(1578)]) + "\n"
    bdg2_meta = raw_dir / "bdg2_meta.csv"
    bdg2_meta.write_text(bdg2_meta_header + bdg2_meta_rows, encoding="utf-8")

    # 3. Create mock London raw file (1488 30-min intervals for Jan 2013)
    london_file = raw_dir / "london_mock.csv"
    london_df = pd.DataFrame({
        "LCLid": ["MAC000001"] * 1488,
        "timestamp": pd.date_range("2013-01-01", periods=1488, freq="30min"),
        "KWH/hh": [0.5] * 1488,
    })
    london_df.to_csv(london_file, index=False)

    # 4. Create mock ComStock raw file (744 hours for Jan 2023)
    comstock_file = raw_dir / "comstock_mock.csv"
    comstock_df = pd.DataFrame({
        "bldg_id": ["bldg_01"] * 744,
        "timestamp": pd.date_range("2023-01-01", periods=744, freq="h"),
        "kwh": [5.0] * 744,
    })
    comstock_df.to_csv(comstock_file, index=False)

    # 5. Create acquisition manifest
    acquisition_manifest = {
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
                "source_files": [{"role": "raw_electricity", "path": str(uci_file)}],
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
                "source_files": [{"role": "raw_electricity", "path": str(london_file)}],
            },
            {
                "dataset_key": "nrel_comstock",
                "publisher": "US DOE / NREL",
                "version": "2023.1",
                "licence": "CC BY 4.0",
                "validation": {"status": "PASS"},
                "source_files": [{"role": "raw_electricity", "path": str(comstock_file)}],
            },
        ]
    }
    manifest_path = manifests_dir / "dataset-acquisition-manifest.json"
    manifest_path.write_text(json.dumps(acquisition_manifest, indent=2), encoding="utf-8")

    package_root = Path(__file__).resolve().parent.parent / "src" / "wattwise_benchmark"

    # Execute normalize_all with completeness_threshold=0.01 for tiny mock data
    res = normalize_all(data_root, package_root, completeness_threshold=0.01, force=True)

    assert "panels" in res
    assert "uci_eld" in res["panels"]
    assert "bdg2" in res["panels"]
    assert "london_smartmeter" in res["panels"]
    assert "nrel_comstock" in res["panels"]

    london_panel = res["panels"]["london_smartmeter"]
    assert len(london_panel) == 1
    assert london_panel.iloc[0]["domain"] == "PUBLIC_RESIDENTIAL"
    assert london_panel.iloc[0]["measurement_method"] == "SMART_METER"

    comstock_panel = res["panels"]["nrel_comstock"]
    assert len(comstock_panel) == 1
    assert comstock_panel.iloc[0]["domain"] == "PUBLIC_COMMERCIAL"
    assert comstock_panel.iloc[0]["measurement_method"] == "MODELED_SIMULATION"
