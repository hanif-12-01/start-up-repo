"""Model eligibility tests."""

import pandas as pd

from wattwise_benchmark.models.base import eligibility_reason


def _row(history: int, profile: bool = False) -> pd.Series:
    return pd.Series({"history_month_count": history, "profile_eligible": profile})


def test_deterministic_zero_history_ineligible() -> None:
    assert eligibility_reason("deterministic_baseline", _row(0)) is not None


def test_deterministic_one_month_eligible() -> None:
    assert eligibility_reason("deterministic_baseline", _row(1)) is None


def test_nbeats_needs_six_months() -> None:
    assert eligibility_reason("nbeats", _row(5)) is not None
    assert eligibility_reason("nbeats", _row(6)) is None


def test_deepar_needs_six_months() -> None:
    assert eligibility_reason("deepar", _row(5)) is not None
    assert eligibility_reason("deepar", _row(6)) is None


def test_ridge_zero_history_no_profile_ineligible() -> None:
    assert eligibility_reason("ridge", _row(0, False)) is not None


def test_ridge_zero_history_with_profile_eligible() -> None:
    assert eligibility_reason("ridge", _row(0, True)) is None


def test_ridge_one_month_eligible() -> None:
    assert eligibility_reason("ridge", _row(1)) is None
