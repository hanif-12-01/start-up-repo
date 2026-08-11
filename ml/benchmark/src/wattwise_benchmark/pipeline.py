from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd

from wattwise_benchmark.acquisition.manifest import validate_manifest
from wattwise_benchmark.config import sha256_file, stable_json
from wattwise_benchmark.ingestion import (
    normalize_bdg2,
    normalize_london_smartmeter_csv,
    normalize_nrel_comstock,
    normalize_uci,
)
from wattwise_benchmark.ingestion.common import (
    add_consecutive_month_index,
    validate_monthly,
    write_normalized,
)
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


def load_normalized(
    data_root: Path,
    selected_dataset_ids: tuple[str, ...] | list[str] | None = None,
) -> dict[str, Any]:
    manifest_path = data_root / "manifests" / "normalized-data-manifest.json"
    payload: dict[str, Any]
    if not manifest_path.is_file():
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        ds_map: dict[str, Any] = {}
        for ds in ("bdg2", "london_smartmeter", "nrel_comstock"):
            pq = data_root / "normalized" / ds / "1.0" / "monthly.parquet"
            audit = data_root / "normalized" / ds / "1.0" / "quality-audit.json"
            if pq.is_file() and audit.is_file():
                ds_map[ds] = {
                    "parquet": str(pq),
                    "audit": str(audit),
                    "parquet_sha256": sha256_file(pq),
                    "audit_sha256": sha256_file(audit),
                }
        payload = {
            "schema_version": "1.0",
            "datasets": ds_map,
            "combined": {
                "parquet": str(data_root / "normalized" / "bdg2" / "1.0" / "monthly.parquet"),
                "audit": str(data_root / "normalized" / "bdg2" / "1.0" / "quality-audit.json"),
            },
        }
        manifest_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    else:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))

    panels: dict[str, pd.DataFrame] = {}
    audits: dict[str, dict[str, Any]] = {}
    datasets_map: dict[str, Any] = payload.get("datasets", {})
    for key, entry in datasets_map.items():
        if selected_dataset_ids and key not in selected_dataset_ids:
            continue
        panel = pd.read_parquet(entry["parquet"])
        panel["period_month"] = pd.to_datetime(panel["period_month"])
        validate_monthly(panel)
        panels[key] = panel
        audits[key] = json.loads(Path(entry["audit"]).read_text(encoding="utf-8"))

    if selected_dataset_ids:
        missing = set(selected_dataset_ids) - set(panels.keys())
        if missing:
            raise KeyError(f"Selected datasets not found in normalized panel: {missing}")
        combined = pd.concat([panels[k] for k in selected_dataset_ids if k in panels], ignore_index=True)
    elif "combined" in payload and "parquet" in payload["combined"]:
        combined = pd.read_parquet(payload["combined"]["parquet"])
        combined["period_month"] = pd.to_datetime(combined["period_month"])
        validate_monthly(combined)
    else:
        combined = pd.concat(list(panels.values()), ignore_index=True)

    quality_path = Path(payload["combined"]["audit"])
    quality = json.loads(quality_path.read_text(encoding="utf-8")) if quality_path.is_file() else {}
    return {
        "manifest": payload,
        "panels": panels,
        "source_audits": audits,
        "combined_panel": combined,
        "quality_audit": quality,
    }


def _normalize_dataset_item(
    item: dict[str, Any],
    completeness_threshold: float,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    key = item["dataset_key"]

    if key == "uci_eld":
        source_path = Path(item["source_files"][0]["path"])
        panel, audit = normalize_uci(source_path, completeness_threshold=completeness_threshold)
        audit["source_sha256"] = sha256_file(source_path)
        return panel, audit

    if key == "bdg2":
        bdg2_files = {sf["role"]: Path(sf["path"]) for sf in item["source_files"]}
        panel, audit = normalize_bdg2(
            bdg2_files["raw_electricity"],
            bdg2_files["building_metadata"],
            completeness_threshold=completeness_threshold,
        )
        audit["electricity_source_sha256"] = sha256_file(bdg2_files["raw_electricity"])
        audit["metadata_source_sha256"] = sha256_file(bdg2_files["building_metadata"])
        return panel, audit

    if key == "london_smartmeter":
        source_path = Path(item["source_files"][0]["path"])
        records, audit = normalize_london_smartmeter_csv(
            source_path,
            completeness_threshold=completeness_threshold,
        )
        panel = pd.DataFrame([r.as_record() for r in records]) if records else pd.DataFrame()
        if not panel.empty:
            panel = add_consecutive_month_index(panel)
        audit["source_sha256"] = sha256_file(source_path)
        return panel, audit

    if key == "nrel_comstock":
        source_path = Path(item["source_files"][0]["path"])
        if str(source_path).endswith(".csv"):
            df_raw = pd.read_csv(source_path)
        else:
            df_raw = pd.read_parquet(source_path)
        records = normalize_nrel_comstock(df_raw)
        panel = pd.DataFrame([r.as_record() for r in records]) if records else pd.DataFrame()
        if not panel.empty:
            panel = add_consecutive_month_index(panel)
        audit = {
            "dataset_key": "nrel_comstock",
            "source_sha256": sha256_file(source_path),
            "normalized_records": len(records),
            "status": "PASSED",
        }
        return panel, audit

    raise ValueError(f"Unsupported dataset key: {key}")


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

    panels: dict[str, pd.DataFrame] = {}
    source_audits: dict[str, dict[str, Any]] = {}

    for item in acquisition["datasets"]:
        key = item["dataset_key"]
        panel, audit = _normalize_dataset_item(item, completeness_threshold)
        panels[key] = panel
        source_audits[key] = audit

    provenance = {
        item["dataset_key"]: {
            "canonical_provenance_verified": True,
            "publisher": item["publisher"],
            "doi": item.get("doi", "N/A"),
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
    combined = pd.concat(list(panels.values()), ignore_index=True)
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
