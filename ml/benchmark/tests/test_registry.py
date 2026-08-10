from __future__ import annotations

import pytest

from wattwise_benchmark.datasets import get_dataset, list_datasets, validate_dataset_license


def test_list_datasets() -> None:
    all_datasets = list_datasets(selected_only=False)
    assert len(all_datasets) >= 5
    selected_datasets = list_datasets(selected_only=True)
    assert len(selected_datasets) == 4
    selected_ids = {d.id for d in selected_datasets}
    assert {"uci_eld", "bdg2", "london_smartmeter", "nrel_comstock"}.issubset(selected_ids)


def test_get_dataset() -> None:
    entry = get_dataset("bdg2")
    assert entry.name == "Building Data Genome Project 2"
    assert entry.legal_status == "CLEARED"
    assert entry.commercial_use is True


def test_validate_dataset_license() -> None:
    assert validate_dataset_license("uci_eld") is True
    assert validate_dataset_license("bdg2") is True
    with pytest.raises(ValueError, match="legal status is LEGAL_REVIEW_REQUIRED"):
        validate_dataset_license("goiener")
