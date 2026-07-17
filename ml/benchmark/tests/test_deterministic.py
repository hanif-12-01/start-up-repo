"""Deterministic baseline parity with Laravel PredictionService."""

import pytest

from wattwise_benchmark.models.deterministic import deterministic_forecast


def test_zero_history_returns_none() -> None:
    assert deterministic_forecast([]) is None


def test_single_month_carry_forward() -> None:
    assert deterministic_forecast([500.0]) == 500.0


def test_two_month_trend() -> None:
    result = deterministic_forecast([400.0, 500.0])
    assert result == 600.0


def test_three_plus_weighted_trend() -> None:
    result = deterministic_forecast([100.0, 200.0, 300.0, 400.0, 500.0, 600.0])
    assert result is not None
    assert result >= 0.0
    assert isinstance(result, float)


def test_clamp_negative_to_zero() -> None:
    result = deterministic_forecast([1000.0, 500.0, 100.0, 50.0, 10.0, 1.0])
    assert result is not None
    assert result >= 0.0


def test_non_finite_raises() -> None:
    with pytest.raises(ValueError):
        deterministic_forecast([float("nan"), 100.0])


def test_three_months_uses_wma_and_trend() -> None:
    result = deterministic_forecast([100.0, 200.0, 300.0])
    assert result is not None
    assert result > 0.0


def test_deterministic_is_reproducible() -> None:
    history = [100.0, 200.0, 300.0, 400.0, 500.0]
    r1 = deterministic_forecast(history)
    r2 = deterministic_forecast(history)
    assert r1 == r2
