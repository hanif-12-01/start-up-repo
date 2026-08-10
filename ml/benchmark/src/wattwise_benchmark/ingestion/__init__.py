"""Canonical source ingestion and monthly normalization."""

from wattwise_benchmark.ingestion.bdg2 import normalize_bdg2
from wattwise_benchmark.ingestion.london import (
    normalize_london_smartmeter,
    normalize_london_smartmeter_csv,
)
from wattwise_benchmark.ingestion.nrel_comstock import normalize_nrel_comstock
from wattwise_benchmark.ingestion.uci import normalize_uci

__all__ = [
    "normalize_bdg2",
    "normalize_london_smartmeter",
    "normalize_london_smartmeter_csv",
    "normalize_nrel_comstock",
    "normalize_uci",
]
