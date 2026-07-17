from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd

from wattwise_benchmark.acquisition.manifest import validate_manifest
from wattwise_benchmark.config import sha256_file, stable_json
from wattwise_benchmark.ingestion import normalize_bdg2, normalize_uci
from wattwise_benchmark.ingestion.common import validate_monthly, write_normalized
from wattwise_benchmark.quality.audit import build_combined_audit
from wattwise_benchmark.runtime import source_tree_fingerprint, utc_now_iso

NORMALIZED_VERSION = "1.0"


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def _dataset_item(manifest: dict[str, Any], key: str) -> dict[str, Any]:
    for item in manifest["datasets"]:
        if item["dataset_key"] == key:
            return item
    raise KeyError(key)


def _normalization_fingerprint(
    acquisition: dict[str, Any],
    completeness_threshold: float,
    package_root: Path,
) -> str:
    inputs = {}
    for item in acquisition["datasets"]:
        archive = item.get("archive", {})
        source_hash = archive.get("sha256")
        if not source_hash:
            source_hashes = [sf["sha256"] for sf in item.get("source_files", []) if "sha256" in sf]
            source_hash = hashlib.sha256("|".join(sorted(source_hashes)).encode()).hexdigest()
        inputs[item["dataset_key"]] = source_hash
    payload = {
        "inputs": inputs,
        "completeness_threshold": completeness_threshold,
        "ingestion_code_sha256": source_tree_fingerprint(package_root / "ingestion"),
        "quality_code_sha256": source_tree_fingerprint(package_root / "quality"),
    }
    return hashlib.sha256(stable_json(payload).encode()).hexdigest()


def _cache_valid(path: Path, fingerprint: str) -> bool:
    if not path.is_file():
        return False
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("normalization_fingerprint") != fingerprint:
        return False
    entries = [*payload.get("datasets", {}).values(), payload.get("combined", {})]
    for entry in entries:
        parquet = Path(entry.get("parquet", ""))
        audit = Path(entry.get("audit", ""))
        if not parquet.is_file() or not audit.is_file():
            return False
        if sha256_file(parquet) != entry.get("parquet_sha256"):
            return False
        if sha256_file(audit) != entry.get("audit_sha256"):
            return False
    return True


def load_normalized(data_root: Path) -> dict[str, Any]:
    manifest_path = data_root / "manifests" / "normalized-data-manifest.json"
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    panels: dict[str, pd.DataFrame] = {}
    audits: dict[str, dict[str, Any]] = {}
    for key, entry in payload["datasets"].items():
        panel = pd.read_parquet(entry["parquet"])
        panel["period_month"] = pd.to_datetime(panel["period_month"])
        validate_monthly(panel)
        panels[key] = panel
        audits[key] = json.loads(Path(entry["audit"]).read_text(encoding="utf-8"))
    combined = pd.read_parquet(payload["combined"]["parquet"])
    combined["period_month"] = pd.to_datetime(combined["period_month"])
    validate_monthly(combined)
    quality = json.loads(Path(payload["combined"]["audit"]).read_text(encoding="utf-8"))
    return {
        "manifest": payload,
        "panels": panels,
        "source_audits": audits,
        "combined_panel": combined,
        "quality_audit": quality,
    }


def normalize_all(
    data_root: Path,
    package_root: Path,
    *,
    completeness_threshold: float = 0.90,
    force: bool = False,
) -> dict[str, Any]:
    acquisition_path = data_root / "manifests" / "dataset-acquisition-manifest.json"
    acquisition = validate_manifest(acquisition_path, verify_files=True)
    fingerprint = _normalization_fingerprint(
        acquisition,
        completeness_threshold,
        package_root,
    )
    normalized_manifest_path = data_root / "manifests" / "normalized-data-manifest.json"
    if not force and _cache_valid(normalized_manifest_path, fingerprint):
        return load_normalized(data_root)

    uci = _dataset_item(acquisition, "uci_eld")
    bdg2 = _dataset_item(acquisition, "bdg2")
    uci_source = Path(uci["source_files"][0]["path"])
    bdg2_files = {item["role"]: Path(item["path"]) for item in bdg2["source_files"]}

    uci_panel, uci_audit = normalize_uci(
        uci_source,
        completeness_threshold=completeness_threshold,
    )
    bdg2_panel, bdg2_audit = normalize_bdg2(
        bdg2_files["raw_electricity"],
        bdg2_files["building_metadata"],
        completeness_threshold=completeness_threshold,
    )
    uci_audit["source_sha256"] = sha256_file(uci_source)
    bdg2_audit["electricity_source_sha256"] = sha256_file(bdg2_files["raw_electricity"])
    bdg2_audit["metadata_source_sha256"] = sha256_file(bdg2_files["building_metadata"])
    panels = {"uci_eld": uci_panel, "bdg2": bdg2_panel}
    source_audits = {"uci_eld": uci_audit, "bdg2": bdg2_audit}
    provenance = {
        item["dataset_key"]: {
            "canonical_provenance_verified": True,
            "publisher": item["publisher"],
            "doi": item["doi"],
            "version": item["version"],
            "license": item["licence"],
            "archive_sha256": item.get("archive", {}).get("sha256", "N/A"),
        }
        for item in acquisition["datasets"]
    }
    combined_audit = build_combined_audit(panels, source_audits, provenance)

    dataset_outputs: dict[str, dict[str, Any]] = {}
    for key, panel in panels.items():
        destination = data_root / "normalized" / key / NORMALIZED_VERSION
        dataset_outputs[key] = write_normalized(
            panel,
            source_audits[key],
            destination,
        )
    combined = pd.concat([panels["uci_eld"], panels["bdg2"]], ignore_index=True)
    validate_monthly(combined)
    combined_destination = data_root / "normalized" / "combined" / NORMALIZED_VERSION
    combined_output = write_normalized(
        combined,
        combined_audit,
        combined_destination,
    )
    payload = {
        "schema_version": "1.0",
        "generated_at_utc": utc_now_iso(),
        "normalization_fingerprint": fingerprint,
        "completeness_threshold": completeness_threshold,
        "datasets": dataset_outputs,
        "combined": combined_output,
    }
    _write_json(normalized_manifest_path, payload)
    return load_normalized(data_root)
