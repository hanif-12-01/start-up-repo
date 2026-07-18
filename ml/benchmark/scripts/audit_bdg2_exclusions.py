"""Read-only reconciliation of raw and normalized BDG2 electricity entities."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from wattwise_benchmark.config import data_root
from wattwise_benchmark.ingestion.bdg2 import (
    _expected_local_hours,
    excluded_entity_accounting,
)


def main() -> None:
    root = data_root()
    acquisition = json.loads(
        (root / "manifests" / "dataset-acquisition-manifest.json").read_text(encoding="utf-8")
    )
    normalized = json.loads(
        (root / "manifests" / "normalized-data-manifest.json").read_text(encoding="utf-8")
    )
    bdg2 = next(item for item in acquisition["datasets"] if item["dataset_key"] == "bdg2")
    sources = {item["role"]: Path(item["path"]) for item in bdg2["source_files"]}
    electricity_path = sources["raw_electricity"]
    metadata_path = sources["building_metadata"]

    raw_entities = list(pd.read_csv(electricity_path, nrows=0).columns[1:].astype(str))
    normalized_path = Path(normalized["datasets"]["bdg2"]["parquet"])
    normalized_entities = set(
        pd.read_parquet(normalized_path, columns=["entity_id"])["entity_id"].astype(str)
    )
    excluded_ids = sorted(set(raw_entities) - normalized_entities)

    selected = pd.read_csv(electricity_path, usecols=["timestamp", *excluded_ids])
    timestamps = pd.to_datetime(selected.pop("timestamp"), errors="raise")
    numeric = selected.apply(pd.to_numeric, errors="coerce")
    month = timestamps.dt.to_period("M").dt.to_timestamp()
    monthly_sum = numeric.groupby(month, sort=True).sum(min_count=1)
    monthly_observed = numeric.notna().groupby(month, sort=True).sum()
    monthly_negative = numeric.lt(0).groupby(month, sort=True).sum()

    metadata = pd.read_csv(metadata_path, low_memory=False).set_index("building_id")
    records: list[dict[str, object]] = []
    for period in monthly_sum.index:
        for entity_id in excluded_ids:
            timezone = str(metadata.loc[entity_id, "timezone"])
            observed = int(monthly_observed.loc[period, entity_id])
            expected = _expected_local_hours(pd.Timestamp(period), timezone)
            usage = float(monthly_sum.loc[period, entity_id])
            records.append(
                {
                    "entity_id": entity_id,
                    "period_month": pd.Timestamp(period),
                    "usage_kwh": usage,
                    "observation_count": observed,
                    "expected_observation_count": expected,
                    "monthly_completeness_ratio": min(observed / expected, 1.0),
                    "negative_observation_count": int(monthly_negative.loc[period, entity_id]),
                }
            )
    panel = pd.DataFrame(records)
    incomplete = panel["monthly_completeness_ratio"] < 0.90
    negative = panel["negative_observation_count"] > 0
    invalid = ~np.isfinite(panel["usage_kwh"]) | panel["usage_kwh"].lt(0)
    excluded = incomplete | negative | invalid
    details = excluded_entity_accounting(
        panel,
        excluded,
        incomplete,
        negative,
        invalid,
        completeness_threshold=0.90,
    )

    raw_count = len(raw_entities)
    normalized_count = len(normalized_entities)
    result = {
        "raw_entity_count": raw_count,
        "normalized_entity_count": normalized_count,
        "excluded_entity_count": len(excluded_ids),
        "excluded_entities": details,
        "raw_minus_normalized_ids": excluded_ids,
        "no_unexplained_entity_loss": (
            raw_count == normalized_count + len(excluded_ids)
            and {item["entity_id"] for item in details} == set(excluded_ids)
        ),
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
