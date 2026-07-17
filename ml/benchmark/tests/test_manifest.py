"""Acquisition manifest validation tests."""

import zipfile
from pathlib import Path

from wattwise_benchmark.acquisition.manifest import EXPECTED, unsafe_zip_entries


def test_expected_datasets() -> None:
    assert "uci_eld" in EXPECTED
    assert "bdg2" in EXPECTED
    assert EXPECTED["uci_eld"]["licence"] == "CC BY 4.0"
    assert EXPECTED["bdg2"]["licence"] == "CC BY 4.0"
    assert EXPECTED["uci_eld"]["doi"] == "10.24432/C58C86"
    assert EXPECTED["bdg2"]["doi"] == "10.5281/zenodo.3887306"


def test_unsafe_zip_absolute_path(tmp_path: Path) -> None:
    archive = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("/etc/passwd", "x")
    assert unsafe_zip_entries(archive)


def test_unsafe_zip_traversal(tmp_path: Path) -> None:
    archive = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("../escape.txt", "x")
    assert unsafe_zip_entries(archive)


def test_safe_zip(tmp_path: Path) -> None:
    archive = tmp_path / "good.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("data/file.csv", "a,b\n1,2")
    assert unsafe_zip_entries(archive) == []
