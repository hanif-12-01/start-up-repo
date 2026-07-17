"""Canonical source ingestion and monthly normalization."""

from wattwise_benchmark.ingestion.bdg2 import normalize_bdg2
from wattwise_benchmark.ingestion.uci import normalize_uci

__all__ = ["normalize_bdg2", "normalize_uci"]
