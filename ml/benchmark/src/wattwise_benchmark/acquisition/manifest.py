from __future__ import annotations

import json
import stat
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from wattwise_benchmark.config import sha256_file

EXPECTED = {
    "uci_eld": {"doi": "10.24432/C58C86", "licence": "CC BY 4.0"},
    "bdg2": {"doi": "10.5281/zenodo.3887306", "licence": "CC BY 4.0"},
}


def unsafe_zip_entries(path: Path) -> list[str]:
    unsafe: list[str] = []
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            name = info.filename
            posix = PurePosixPath(name)
            mode = (info.external_attr >> 16) & 0xFFFF
            if (
                posix.is_absolute()
                or ".." in posix.parts
                or bool(posix.drive)
                or stat.S_ISLNK(mode)
            ):
                unsafe.append(name)
    return unsafe


def validate_manifest(path: Path, verify_files: bool = True) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != "1.0":
        raise ValueError("unsupported acquisition manifest schema")
    if payload.get("dataset_gate") != "PASSED":
        raise ValueError("dataset gate is not passed")
    datasets = payload.get("datasets")
    if not isinstance(datasets, list):
        raise ValueError("datasets must be a list")
    by_key = {item.get("dataset_key"): item for item in datasets}
    if set(by_key) != set(EXPECTED):
        raise ValueError("manifest must contain exactly UCI ELD and BDG2")
    for key, expected in EXPECTED.items():
        item = by_key[key]
        if item.get("doi") != expected["doi"] or item.get("licence") != expected["licence"]:
            raise ValueError(f"canonical identity mismatch for {key}")
        if item.get("validation", {}).get("status") != "PASS":
            raise ValueError(f"validation is not PASS for {key}")
        archive = item.get("archive", {})
        archive_path_str = archive.get("path", "")
        if verify_files and archive_path_str:
            archive_path = Path(archive_path_str)
            if archive_path.is_file() and "sha256" in archive:
                if archive_path.stat().st_size != archive.get("bytes"):
                    raise ValueError(f"archive size mismatch for {key}")
                if sha256_file(archive_path) != str(archive["sha256"]).lower():
                    raise ValueError(f"archive checksum mismatch for {key}")
                if unsafe_zip_entries(archive_path):
                    raise ValueError(f"unsafe archive entries for {key}")
        if verify_files:
            for sf in item.get("source_files", []):
                sf_path = Path(sf.get("path", ""))
                if not sf_path.is_file():
                    raise FileNotFoundError(f"source file missing: {sf_path}")
    return payload
