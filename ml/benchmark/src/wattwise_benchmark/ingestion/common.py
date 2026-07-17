from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import sha256_file

KEY_COLUMNS = ["dataset_source", "entity_id", "period_month"]
REQUIRED_COLUMNS = [*KEY_COLUMNS, "usage_kwh"]


def validate_monthly(panel: pd.DataFrame) -> None:
    missing = set(REQUIRED_COLUMNS) - set(panel.columns)
    if missing:
        raise ValueError(f"monthly contract missing columns: {sorted(missing)}")
    if panel[KEY_COLUMNS].isna().any().any():
        raise ValueError("monthly keys cannot be null")
    if panel.duplicated(KEY_COLUMNS).any():
        raise ValueError("entity-month uniqueness failed")
    values = panel["usage_kwh"].to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("usage_kwh must be finite")
    if (values < 0).any():
        raise ValueError("usage_kwh must be non-negative")
    months = pd.to_datetime(panel["period_month"], errors="coerce")
    if months.isna().any() or (months.dt.day != 1).any():
        raise ValueError("period_month must be a calendar month start")
    completeness = panel["monthly_completeness_ratio"].to_numpy(dtype=float)
    if ((completeness < 0) | (completeness > 1)).any():
        raise ValueError("monthly completeness must be within [0, 1]")


def add_consecutive_month_index(panel: pd.DataFrame) -> pd.DataFrame:
    result = panel.sort_values(KEY_COLUMNS).copy()
    indexes = pd.Series(index=result.index, dtype="int64")
    for _, group in result.groupby(["dataset_source", "entity_id"], sort=False):
        months = pd.to_datetime(group["period_month"])
        breaks = months.diff().dt.days.ne(months.shift().dt.days_in_month).fillna(True)
        run = breaks.cumsum()
        indexes.loc[group.index] = group.groupby(run).cumcount().add(1).to_numpy()
    result["consecutive_month_index"] = indexes.astype("int64")
    return result


def write_normalized(
    panel: pd.DataFrame,
    audit: dict[str, Any],
    destination: Path,
) -> dict[str, Any]:
    validate_monthly(panel)
    destination.mkdir(parents=True, exist_ok=True)
    parquet = destination / "monthly.parquet"
    audit_path = destination / "quality-audit.json"
    panel.to_parquet(parquet, index=False, compression="zstd")
    audit_path.write_text(json.dumps(audit, indent=2, sort_keys=True, default=str) + "\n")
    return {
        "parquet": str(parquet),
        "parquet_sha256": sha256_file(parquet),
        "audit": str(audit_path),
        "audit_sha256": sha256_file(audit_path),
        "rows": len(panel),
        "entities": int(panel["entity_id"].nunique()),
    }
