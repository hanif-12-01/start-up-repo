"""Phase boundary and subgroup tests."""

import pytest

from wattwise_benchmark.contracts import ProductPhase, initial_subgroup, product_phase


@pytest.mark.parametrize(
    "months,expected",
    [
        (0, ProductPhase.H00_02),
        (1, ProductPhase.H00_02),
        (2, ProductPhase.H00_02),
        (3, ProductPhase.H03_05),
        (5, ProductPhase.H03_05),
        (6, ProductPhase.H06_12),
        (12, ProductPhase.H06_12),
        (13, ProductPhase.H13_PLUS),
        (100, ProductPhase.H13_PLUS),
    ],
)
def test_phase_boundaries(months: int, expected: ProductPhase) -> None:
    assert product_phase(months) == expected


def test_phase_negative_raises() -> None:
    with pytest.raises(ValueError):
        product_phase(-1)


@pytest.mark.parametrize(
    "months,expected",
    [
        (0, "H00"),
        (1, "H01_02"),
        (2, "H01_02"),
        (3, None),
        (13, None),
    ],
)
def test_initial_subgroup(months: int, expected: str | None) -> None:
    assert initial_subgroup(months) == expected
