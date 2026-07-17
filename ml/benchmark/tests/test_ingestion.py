"""Ingestion validation and monthly contract tests."""

import pandas as pd
import pytest

from wattwise_benchmark.ingestion.common import (
    add_consecutive_month_index,
    validate_monthly,
)


def _make_panel(
    n_entities: int = 2,
    n_months: int = 6,
    source: str = "test",
) -> pd.DataFrame:
    rows = []
    for entity in range(n_entities):
        for month_offset in range(n_months):
            rows.append(
                {
                    "dataset_source": source,
                    "entity_id": f"E{entity:03d}",
                    "period_month": pd.Timestamp(f"2012-{month_offset + 1:02d}-01"),
                    "usage_kwh": float((entity + 1) * 100 + month_offset * 10),
                    "monthly_completeness_ratio": 0.95,
                }
            )
    return pd.DataFrame(rows)


def test_validate_monthly_passes_valid() -> None:
    panel = _make_panel()
    validate_monthly(panel)


def test_validate_monthly_rejects_duplicate_keys() -> None:
    panel = _make_panel()
    panel = pd.concat([panel, panel.iloc[:1]], ignore_index=True)
    with pytest.raises(ValueError, match="uniqueness"):
        validate_monthly(panel)


def test_validate_monthly_rejects_negative_usage() -> None:
    panel = _make_panel()
    panel.loc[0, "usage_kwh"] = -1.0
    with pytest.raises(ValueError, match="non-negative"):
        validate_monthly(panel)


def test_validate_monthly_rejects_nan_usage() -> None:
    panel = _make_panel()
    panel.loc[0, "usage_kwh"] = float("nan")
    with pytest.raises(ValueError, match="finite"):
        validate_monthly(panel)


def test_validate_monthly_rejects_bad_period() -> None:
    panel = _make_panel()
    panel.loc[0, "period_month"] = pd.Timestamp("2012-01-15")
    with pytest.raises(ValueError, match="calendar month"):
        validate_monthly(panel)


def test_consecutive_month_index_continuous() -> None:
    panel = _make_panel(n_entities=1, n_months=4)
    result = add_consecutive_month_index(panel)
    assert list(result["consecutive_month_index"]) == [1, 2, 3, 4]


def test_consecutive_month_index_gap_resets() -> None:
    rows = [
        {
            "dataset_source": "t",
            "entity_id": "E",
            "period_month": pd.Timestamp("2012-01-01"),
            "usage_kwh": 100.0,
            "monthly_completeness_ratio": 0.95,
        },
        {
            "dataset_source": "t",
            "entity_id": "E",
            "period_month": pd.Timestamp("2012-02-01"),
            "usage_kwh": 110.0,
            "monthly_completeness_ratio": 0.95,
        },
        {
            "dataset_source": "t",
            "entity_id": "E",
            "period_month": pd.Timestamp("2012-05-01"),
            "usage_kwh": 120.0,
            "monthly_completeness_ratio": 0.95,
        },
    ]
    panel = pd.DataFrame(rows)
    result = add_consecutive_month_index(panel)
    assert list(result["consecutive_month_index"]) == [1, 2, 1]
