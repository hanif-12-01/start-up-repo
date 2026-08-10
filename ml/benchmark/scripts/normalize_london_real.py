from __future__ import annotations

import json

import pandas as pd

from wattwise_benchmark.config import data_root, sha256_file
from wattwise_benchmark.datasets.cohorts import compute_logical_dataset_sha256
from wattwise_benchmark.ingestion.common import add_consecutive_month_index, write_normalized
from wattwise_benchmark.ingestion.london import normalize_london_smartmeter_csv


def main() -> None:
    root = data_root()
    source = root / "raw" / "london_smartmeter" / "1.0" / "CC_LCL-FullData.csv"
    if not source.is_file():
        raise FileNotFoundError(f"Authoritative London source is missing: {source}")
    if any(token in str(source).lower() for token in ("fixture", "mock", "synthetic")):
        raise ValueError(f"Refusing non-authoritative London source path: {source}")

    records, audit = normalize_london_smartmeter_csv(source)
    if not records:
        raise ValueError("London normalization produced no eligible entity-months")

    panel = pd.DataFrame([record.as_record() for record in records])
    panel = add_consecutive_month_index(panel)
    usage = panel["usage_kwh"].astype(float)
    audit.update(
        {
            "source_path": str(source),
            "source_bytes": source.stat().st_size,
            "source_sha256": sha256_file(source),
            "normalized_entities": int(panel["entity_id"].nunique()),
            "normalized_entity_months": len(panel),
            "date_start": pd.to_datetime(panel["period_month"]).min().strftime("%Y-%m-%d"),
            "date_end": pd.to_datetime(panel["period_month"]).max().strftime("%Y-%m-%d"),
            "usage_min_kwh": float(usage.min()),
            "usage_max_kwh": float(usage.max()),
            "usage_stddev_kwh": float(usage.std()),
            "logical_dataset_sha256": compute_logical_dataset_sha256(panel),
            "fixture_rows": 0,
            "mock_rows": 0,
            "synthetic_rows": 0,
        }
    )

    output = write_normalized(
        panel,
        audit,
        root / "normalized" / "london_smartmeter" / "1.0",
    )
    evidence = {**audit, **output}
    evidence_path = root / "manifests" / "london-real-normalization-evidence.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(evidence, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
