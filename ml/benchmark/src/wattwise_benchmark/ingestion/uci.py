from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.ingestion.common import add_consecutive_month_index, validate_monthly


def _connection_starts(values: pd.DataFrame, timestamps: pd.Series) -> dict[str, pd.Timestamp]:
    starts: dict[str, pd.Timestamp] = {}
    positive = values.gt(0)
    for column in values.columns:
        locations = np.flatnonzero(positive[column].to_numpy())
        if locations.size:
            starts[str(column)] = pd.Timestamp(timestamps.iloc[int(locations[0])])
    return starts


def normalize_uci(
    source: Path,
    completeness_threshold: float = 0.90,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    raw = pd.read_csv(source, sep=";", decimal=",", quotechar='"', low_memory=False)
    timestamp_column = raw.columns[0]
    timestamps = pd.to_datetime(raw.pop(timestamp_column), errors="coerce")
    raw_row_count = len(timestamps)
    rejected_timestamp_rows = int(timestamps.isna().sum())
    if rejected_timestamp_rows:
        raw = raw.loc[timestamps.notna()].reset_index(drop=True)
        timestamps = timestamps.loc[timestamps.notna()].reset_index(drop=True)
    if raw.shape[1] != 370:
        raise ValueError(f"UCI expected 370 entity columns, found {raw.shape[1]}")
    if timestamps.duplicated().any():
        raise ValueError("UCI contains duplicate timestamp rows")

    numeric = raw.apply(pd.to_numeric, errors="coerce")
    array = numeric.to_numpy(dtype=float)
    finite = np.isfinite(array)
    negative_cells = int(np.count_nonzero(finite & (array < 0)))
    infinite_cells = int(np.count_nonzero(np.isinf(array)))
    missing_cells = int(np.count_nonzero(np.isnan(array)))
    zero_cells = int(np.count_nonzero(finite & (array == 0)))
    if negative_cells or infinite_cells:
        raise ValueError("UCI has invalid negative or infinite readings")

    starts = _connection_starts(numeric, timestamps)
    never_connected = sorted(set(map(str, numeric.columns)) - set(starts))
    month = timestamps.dt.to_period("M").dt.to_timestamp()
    monthly_sum = numeric.groupby(month, sort=True).sum(min_count=1).div(4.0)
    monthly_observed = numeric.notna().groupby(month, sort=True).sum()
    expected_by_month = month.value_counts().sort_index()

    usage = monthly_sum.rename_axis("period_month").stack(dropna=False).rename("usage_kwh")
    observed = (
        monthly_observed.rename_axis("period_month").stack(dropna=False).rename("observation_count")
    )
    panel = pd.concat([usage, observed], axis=1).reset_index()
    panel = panel.rename(columns={"level_1": "entity_id"})
    panel["dataset_source"] = "uci_eld"
    panel["entity_id"] = panel["entity_id"].astype(str)
    panel["expected_observation_count"] = (
        panel["period_month"].map(expected_by_month).astype("int64")
    )

    first_month = {entity: start.to_period("M").to_timestamp() for entity, start in starts.items()}
    panel["connection_start"] = panel["entity_id"].map(starts)
    panel["connection_month"] = panel["entity_id"].map(first_month)
    pre_connection = panel["period_month"] < panel["connection_month"]
    missing_connection = panel["connection_start"].isna()

    connection_counts: dict[tuple[str, pd.Timestamp], int] = {}
    for entity, start in starts.items():
        target_month = start.to_period("M").to_timestamp()
        connection_counts[(entity, target_month)] = int(
            ((timestamps >= start) & (month == target_month) & numeric[entity].notna()).sum()
        )
    is_connection_month = panel["period_month"].eq(panel["connection_month"])
    keys = zip(panel["entity_id"], panel["period_month"], strict=True)
    active_counts = [
        connection_counts.get(key, int(count))
        for key, count in zip(keys, panel["observation_count"], strict=True)
    ]
    panel.loc[is_connection_month, "observation_count"] = np.asarray(active_counts)[
        is_connection_month.to_numpy()
    ]
    panel["monthly_completeness_ratio"] = (
        panel["observation_count"] / panel["expected_observation_count"]
    ).clip(upper=1.0)
    incomplete = panel["monthly_completeness_ratio"] < completeness_threshold
    invalid_usage = ~np.isfinite(panel["usage_kwh"]) | (panel["usage_kwh"] < 0)
    excluded = pre_connection | missing_connection | incomplete | invalid_usage

    excluded_preconnection = int(pre_connection.sum())
    excluded_incomplete = int((incomplete & ~pre_connection & ~missing_connection).sum())
    panel = panel.loc[~excluded].copy()
    panel["building_primary_use"] = pd.NA
    panel["business_type"] = pd.NA
    panel["building_area"] = np.nan
    panel["site"] = pd.NA
    panel["timezone"] = "Europe/Lisbon"
    panel["source_quality_flags"] = panel["period_month"].dt.month.map(
        lambda value: ["SOURCE_DST_NORMALIZED"] if value in {3, 10} else []
    )
    panel["unit_conversion_method"] = "uci_15_min_average_kw_divide_by_4_then_monthly_sum"
    panel["quality_flag"] = "PASS"
    panel["license_classification"] = "CC BY 4.0"
    panel = panel.drop(columns=["connection_month"])
    panel = add_consecutive_month_index(panel)
    panel = panel.sort_values(["dataset_source", "entity_id", "period_month"]).reset_index(
        drop=True
    )
    validate_monthly(panel)

    audit: dict[str, Any] = {
        "dataset_source": "uci_eld",
        "raw_rows": raw_row_count,
        "successfully_parsed_rows": len(timestamps),
        "rejected_rows": rejected_timestamp_rows,
        "raw_entity_count": int(numeric.shape[1]),
        "normalized_entity_count": int(panel["entity_id"].nunique()),
        "first_timestamp": timestamps.min().isoformat(),
        "last_timestamp": timestamps.max().isoformat(),
        "first_month": panel["period_month"].min().date().isoformat(),
        "last_month": panel["period_month"].max().date().isoformat(),
        "raw_unit": "15-minute average kW",
        "normalized_unit": "monthly kWh",
        "duplicate_timestamps": 0,
        "duplicate_entity_months": int(panel.duplicated(["entity_id", "period_month"]).sum()),
        "negative_values": negative_cells,
        "non_finite_values": infinite_cells,
        "missing_cells": missing_cells,
        "zero_use_rate": zero_cells / array.size,
        "completeness_threshold": completeness_threshold,
        "excluded_pre_connection_months": excluded_preconnection,
        "excluded_incomplete_months": excluded_incomplete,
        "excluded_never_connected_entities": never_connected,
        "normalized_months": len(panel),
        "warnings": [
            "March spring-hour zeros and October repeated-hour aggregation "
            "are publisher-normalized.",
            "No static profile metadata exists; H00 personalized prediction is unavailable.",
        ],
    }
    return panel, audit
