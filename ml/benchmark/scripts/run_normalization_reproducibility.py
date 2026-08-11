from __future__ import annotations

import json
import os
import sys
import time
import uuid
from pathlib import Path

import pandas as pd

from wattwise_benchmark.config import data_root
from wattwise_benchmark.datasets.cohorts import compute_logical_dataset_sha256
from wattwise_benchmark.ingestion.bdg2 import normalize_bdg2
from wattwise_benchmark.ingestion.common import add_consecutive_month_index
from wattwise_benchmark.ingestion.london import normalize_london_smartmeter_csv
from wattwise_benchmark.ingestion.nrel_comstock import normalize_nrel_comstock


def run_normalization_reproducibility() -> dict[str, bool]:
    root = data_root()
    run_id = time.strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
    repro_dir = root / "repro-check" / "ai-01" / run_id
    repro_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, bool] = {}
    summary: dict[str, dict[str, str | int | bool]] = {}

    # 1. BDG2
    print("Checking BDG2 reproducibility...")
    bdg2_elec = root / "raw" / "bdg2" / "1.0" / "electricity.csv"
    bdg2_meta = root / "raw" / "bdg2" / "1.0" / "metadata.csv"
    panel_bdg2, _ = normalize_bdg2(bdg2_elec, bdg2_meta)
    hash_fresh_bdg2 = compute_logical_dataset_sha256(panel_bdg2)

    canon_bdg2 = pd.read_parquet(root / "normalized" / "bdg2" / "1.0" / "monthly.parquet")
    hash_canon_bdg2 = compute_logical_dataset_sha256(canon_bdg2)

    bdg2_repro = (
        hash_fresh_bdg2 == hash_canon_bdg2
        and len(panel_bdg2) == len(canon_bdg2)
        and panel_bdg2["entity_id"].nunique() == canon_bdg2["entity_id"].nunique()
    )
    results["bdg2"] = bdg2_repro
    summary["bdg2"] = {
        "fresh_hash": hash_fresh_bdg2,
        "canon_hash": hash_canon_bdg2,
        "fresh_rows": len(panel_bdg2),
        "canon_rows": len(canon_bdg2),
        "fresh_entities": int(panel_bdg2["entity_id"].nunique()),
        "canon_entities": int(canon_bdg2["entity_id"].nunique()),
        "reproducible": bdg2_repro,
    }

    # 2. London SmartMeter
    print("Checking London SmartMeter reproducibility...")
    lon_src = root / "raw" / "london_smartmeter" / "1.0" / "CC_LCL-FullData.csv"
    records_lon, _ = normalize_london_smartmeter_csv(lon_src)
    panel_lon = pd.DataFrame([r.as_record() for r in records_lon])
    panel_lon = add_consecutive_month_index(panel_lon)
    hash_fresh_lon = compute_logical_dataset_sha256(panel_lon)

    canon_lon = pd.read_parquet(
        root / "normalized" / "london_smartmeter" / "1.0" / "monthly.parquet"
    )
    hash_canon_lon = compute_logical_dataset_sha256(canon_lon)

    lon_repro = (
        hash_fresh_lon == hash_canon_lon
        and len(panel_lon) == len(canon_lon)
        and panel_lon["entity_id"].nunique() == canon_lon["entity_id"].nunique()
    )
    results["london_smartmeter"] = lon_repro
    summary["london_smartmeter"] = {
        "fresh_hash": hash_fresh_lon,
        "canon_hash": hash_canon_lon,
        "fresh_rows": len(panel_lon),
        "canon_rows": len(canon_lon),
        "fresh_entities": int(panel_lon["entity_id"].nunique()),
        "canon_entities": int(canon_lon["entity_id"].nunique()),
        "reproducible": lon_repro,
    }

    # 3. NREL ComStock
    print("Checking NREL ComStock reproducibility...")
    com_src = (
        root
        / "staging"
        / "nrel_comstock"
        / "2023.1"
        / "comstock_ak_upgrade0_first20_hourly.parquet"
    )
    df_com = pd.read_parquet(com_src)
    records_com = normalize_nrel_comstock(df_com)
    panel_com = pd.DataFrame([r.as_record() for r in records_com])
    panel_com = add_consecutive_month_index(panel_com)
    hash_fresh_com = compute_logical_dataset_sha256(panel_com)

    canon_com = pd.read_parquet(root / "normalized" / "nrel_comstock" / "1.0" / "monthly.parquet")
    hash_canon_com = compute_logical_dataset_sha256(canon_com)

    com_repro = (
        hash_fresh_com == hash_canon_com
        and len(panel_com) == len(canon_com)
        and panel_com["entity_id"].nunique() == canon_com["entity_id"].nunique()
    )
    results["nrel_comstock"] = com_repro
    summary["nrel_comstock"] = {
        "fresh_hash": hash_fresh_com,
        "canon_hash": hash_canon_com,
        "fresh_rows": len(panel_com),
        "canon_rows": len(canon_com),
        "fresh_entities": int(panel_com["entity_id"].nunique()),
        "canon_entities": int(canon_com["entity_id"].nunique()),
        "reproducible": com_repro,
    }

    manifest_path = repro_dir / "reproducibility-summary.json"
    manifest_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print("\n--- AI-01 Normalization Reproducibility Check ---")
    print(json.dumps(summary, indent=2))

    all_pass = all(results.values())
    if not all_pass:
        print("ERROR: Logical dataset reproduciblity failed!", file=sys.stderr)
        sys.exit(1)

    print("ALL LOGICAL NORMALIZATION CHECKS PASSED.")
    return results


if __name__ == "__main__":
    run_normalization_reproducibility()
