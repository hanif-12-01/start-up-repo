from __future__ import annotations

import gc
import hashlib
import importlib.metadata
import json
import os
import platform
import shutil
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import data_root, sha256_file, stable_json
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_benchmark.models.deterministic import deterministic_forecast
from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact
from wattwise_benchmark.runtime import PeakMemoryMonitor, source_tree_fingerprint
from wattwise_serving.shadow_contracts import (
    DEFERRED_OUTCOME_FIELDS,
    HISTORY_ROUTES,
    OBSERVABILITY_FIELDS,
    ForecastRequest,
)
from wattwise_serving.shadow_features import build_model_example, feature_contract

AI01_SHA = "61969c089fc407ba24aaa88bb85da16a0e091d30"
MODEL_VERSION = "ai02-1.0.0"
RUN_ID = "ai02-hardened-ai01-seen-seed17"
SEED = 17
PREDICTION_TOLERANCE = 1e-6


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def _percentile(values: list[float], percentile: float) -> float:
    return float(np.percentile(np.asarray(values, dtype=float), percentile))


def _next_period(value: Any) -> str:
    return (pd.Timestamp(value) + pd.offsets.MonthBegin(1)).strftime("%Y-%m")


def _context(group: pd.DataFrame) -> dict[str, Any]:
    row = group.iloc[-1]
    return {
        "dataset_source": "bdg2",
        "building_primary_use": str(row["building_primary_use"]),
        "business_type": str(row["business_type"]),
        "building_area": float(row["building_area"]),
        "site": str(row["site"]),
        "timezone": str(row["timezone"]),
        "profile_eligible": True,
    }


def _request(group: pd.DataFrame, request_id: str) -> ForecastRequest:
    ordered = group.sort_values("period_month").tail(13)
    history = [
        {
            "period_month": pd.Timestamp(row.period_month).strftime("%Y-%m"),
            "usage_kwh": float(row.usage_kwh),
        }
        for row in ordered.itertuples(index=False)
    ]
    return ForecastRequest.from_dict(
        {
            "schema_version": "2.0",
            "request_id": request_id,
            "forecast_timestamp": "2026-08-12T00:00:00Z",
            "target_period": _next_period(ordered.iloc[-1]["period_month"]),
            "history": history,
            "contextual_features": _context(ordered),
            "feature_schema_sha256": feature_manifest_fingerprint(),
        }
    )


def _predict(model_key: str, model: Any, requests: list[ForecastRequest]) -> np.ndarray:
    examples = pd.concat([build_model_example(request) for request in requests], ignore_index=True)
    output = predict_loaded_artifact(model_key, model, examples)
    values = output["prediction_kwh"].to_numpy(dtype=float)
    if len(values) != len(requests) or not np.isfinite(values).all() or (values < 0).any():
        raise RuntimeError(f"invalid {model_key} output")
    return values


def _load_benchmark(
    model_key: str,
    artifact: Path,
    requests: list[ForecastRequest],
) -> dict[str, Any]:
    request = requests[0]
    gc.collect()
    with PeakMemoryMonitor(interval_seconds=0.01) as memory:
        started = time.perf_counter()
        model, loader_metadata = load_artifact(model_key, artifact)
        cold_load_ms = (time.perf_counter() - started) * 1000.0
    _predict(model_key, model, [request])
    latencies = []
    for _ in range(30):
        started = time.perf_counter()
        _predict(model_key, model, [request])
        latencies.append((time.perf_counter() - started) * 1000.0)
    batch = requests[:8]
    batch_latencies = []
    for _ in range(10):
        started = time.perf_counter()
        _predict(model_key, model, batch)
        batch_latencies.append((time.perf_counter() - started) * 1000.0)
    return {
        "model": model,
        "loader_metadata": loader_metadata,
        "cold_load_ms": cold_load_ms,
        "single_prediction": {
            "iterations": len(latencies),
            "p50_ms": _percentile(latencies, 50),
            "p95_ms": _percentile(latencies, 95),
            "p99_ms": _percentile(latencies, 99),
        },
        "batch_8": {
            "iterations": len(batch_latencies),
            "p50_ms": _percentile(batch_latencies, 50),
            "p95_ms": _percentile(batch_latencies, 95),
            "p99_ms": _percentile(batch_latencies, 99),
        },
        "peak_rss_bytes": memory.peak_bytes,
        "artifact_size_bytes": artifact.stat().st_size,
    }


def main() -> None:
    root = data_root()
    source_run = root / "runs" / "ai-01" / "full" / "bdg2"
    frozen_predictions = source_run / "predictions.parquet"
    frozen_manifest = source_run / "run-manifest.json"
    ai01_doc = (
        Path(__file__).resolve().parents[3]
        / "docs"
        / "ml"
        / "ai-01"
        / "experiment-manifest.json"
    )
    sources = {
        "nbeats": source_run / "artifacts" / "seen_entity" / "nbeats" / "17.ckpt",
        "lightgbm": source_run / "artifacts" / "seen_entity" / "lightgbm" / "17.joblib",
    }
    for path in [frozen_predictions, frozen_manifest, ai01_doc, *sources.values()]:
        if not path.is_file():
            raise FileNotFoundError(path)

    frozen = pd.read_parquet(
        frozen_predictions,
        columns=[
            "example_id",
            "dataset_source",
            "entity_id",
            "target_period",
            "track",
            "fold",
            "feature_manifest_fingerprint",
        ],
    )
    test_ids = sorted(frozen.loc[frozen["fold"].eq("test"), "example_id"].astype(str).unique())
    entity_split_rows = (
        frozen[["dataset_source", "entity_id", "track", "fold"]]
        .drop_duplicates()
        .sort_values(["dataset_source", "track", "fold", "entity_id"])
        .to_dict(orient="records")
    )
    ai01_test_sha = hashlib.sha256(stable_json(test_ids).encode()).hexdigest()
    ai01_split_sha = hashlib.sha256(stable_json(entity_split_rows).encode()).hexdigest()
    ai01_feature_sha = str(frozen["feature_manifest_fingerprint"].drop_duplicates().item())
    if ai01_feature_sha != feature_manifest_fingerprint():
        raise RuntimeError("AI-01 feature schema fingerprint changed")

    output_root = root / "models" / "ai-02"
    packages = {
        "nbeats": output_root / "nbeats" / MODEL_VERSION,
        "lightgbm": output_root / "lightgbm" / MODEL_VERSION,
    }
    output_root.mkdir(parents=True, exist_ok=True)
    copied: dict[str, Path] = {}
    for key, source in sources.items():
        destination = packages[key] / ("model.ckpt" if key == "nbeats" else "model.joblib")
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.is_file() and sha256_file(destination) != sha256_file(source):
            raise RuntimeError(f"refusing to overwrite immutable {key} model version")
        if not destination.is_file():
            shutil.copy2(source, destination)
        if sha256_file(source) != sha256_file(destination):
            raise RuntimeError(f"{key} artifact copy checksum mismatch")
        copied[key] = destination

    panel = pd.read_parquet(root / "normalized" / "bdg2" / "1.0" / "monthly.parquet")
    groups = [group for _, group in panel.groupby("entity_id") if len(group) >= 13]
    groups.sort(key=lambda value: str(value.iloc[0]["entity_id"]))
    requests = [_request(group, f"ai02-fixture-{index}") for index, group in enumerate(groups[:8])]

    nbeats_source_model, nbeats_loader = load_artifact("nbeats", sources["nbeats"])
    source_predictions = _predict("nbeats", nbeats_source_model, requests)
    del nbeats_source_model
    gc.collect()
    reloaded_model, reload_metadata = load_artifact("nbeats", copied["nbeats"])
    roundtrip_predictions = _predict("nbeats", reloaded_model, requests)
    max_roundtrip_delta = float(np.max(np.abs(source_predictions - roundtrip_predictions)))
    if max_roundtrip_delta > PREDICTION_TOLERANCE:
        raise RuntimeError("N-BEATS roundtrip prediction mismatch")
    del reloaded_model
    gc.collect()

    run_a_model, _ = load_artifact("nbeats", copied["nbeats"])
    run_a = _predict("nbeats", run_a_model, requests)
    del run_a_model
    gc.collect()
    run_b_model, _ = load_artifact("nbeats", copied["nbeats"])
    run_b = _predict("nbeats", run_b_model, requests)
    del run_b_model
    gc.collect()
    prediction_delta = np.abs(run_a - run_b)
    deterministic_targets = np.asarray(
        [
            deterministic_forecast([point.usage_kwh for point in request.history])
            for request in requests
        ],
        dtype=float,
    )
    mae_a = float(np.mean(np.abs(run_a - deterministic_targets)))
    mae_b = float(np.mean(np.abs(run_b - deterministic_targets)))
    rmse_a = float(np.sqrt(np.mean(np.square(run_a - deterministic_targets))))
    rmse_b = float(np.sqrt(np.mean(np.square(run_b - deterministic_targets))))

    latency: dict[str, Any] = {}
    for key in ("nbeats", "lightgbm"):
        benchmark = _load_benchmark(key, copied[key], requests)
        benchmark.pop("model")
        latency[key] = benchmark

    code_root = Path(__file__).resolve().parents[1] / "src"
    model_code_fingerprint = source_tree_fingerprint(
        code_root / "wattwise_benchmark" / "models"
    )
    serving_code_fingerprint = source_tree_fingerprint(code_root / "wattwise_serving")
    contract = feature_contract()
    contract_sha = hashlib.sha256(stable_json(contract).encode()).hexdigest()
    common_config = {
        "training_run_id": RUN_ID,
        "source_ai01_run": "runs/ai-01/full/bdg2",
        "source_track": "seen_entity",
        "model_seed": SEED,
        "training_protocol": (
            "AI-01 selected train+validation protocol; no AI-01 test labels consumed"
        ),
        "prediction_tolerance": PREDICTION_TOLERANCE,
    }
    lightgbm_loaded, _ = load_artifact("lightgbm", copied["lightgbm"])
    model_configs = {
        "nbeats": {
            **common_config,
            "model_family": "nbeats",
            "model_version": f"nbeats-{MODEL_VERSION}",
            "max_encoder_length": 6,
            "min_encoder_length": 6,
            "prediction_length": 1,
            "normalizer": "EncoderNormalizer(softplus)",
            "loss": "MAE",
        },
        "lightgbm": {
            **common_config,
            "model_family": "lightgbm",
            "model_version": f"lightgbm-{MODEL_VERSION}",
            "preprocessor": type(lightgbm_loaded["preprocessor"]).__name__,
            "model_parameters": lightgbm_loaded["model"].get_params(),
            "best_iteration": int(lightgbm_loaded["model"].best_iteration_),
        },
    }
    config_hashes = {
        key: hashlib.sha256(stable_json(value).encode()).hexdigest()
        for key, value in model_configs.items()
    }
    del lightgbm_loaded
    dataset_fingerprints = {
        "bdg2": "d21b6d66b96bb30f792226e6ae8f38c182c92918e3558e42ccadd6785e2d7e4b",
        "london_smartmeter": "874906049530284eb4f27cdd68051c9fb4ff81111645d536c1b37f515486275b",
        "nrel_comstock": "335a11d761649fbed41be1eb85d26b7ea198e642d74e95b27e59138f37e85920",
    }
    artifacts: dict[str, Any] = {}
    for key, artifact in copied.items():
        artifact_sha = sha256_file(artifact)
        version = f"{key}-{MODEL_VERSION}"
        manifest = {
            "model_family": key,
            "model_version": version,
            "training_run_id": RUN_ID,
            "artifact_sha256": artifact_sha,
            "config_sha256": config_hashes[key],
            "feature_schema_sha256": contract_sha,
            "ai01_feature_schema_sha256": ai01_feature_sha,
            "training_data_fingerprint": dataset_fingerprints["bdg2"],
            "model_code_fingerprint": model_code_fingerprint,
            "serving_code_fingerprint": serving_code_fingerprint,
            "code_sha": AI01_SHA,
            "created_at": datetime.now(UTC).isoformat(),
            "model_seed": SEED,
            "artifact_file": artifact.name,
            "artifact_size_bytes": artifact.stat().st_size,
            "package_versions": {
                "python": platform.python_version(),
                "pytorch_forecasting": importlib.metadata.version("pytorch-forecasting"),
                "lightgbm": importlib.metadata.version("lightgbm"),
                "torch": importlib.metadata.version("torch"),
                "pandas": importlib.metadata.version("pandas"),
                "numpy": importlib.metadata.version("numpy"),
            },
        }
        _write_json(packages[key] / "model-manifest.json", manifest)
        _write_json(packages[key] / "model-config.json", model_configs[key])
        _write_json(packages[key] / "feature-contract.json", contract)
        artifacts[key] = manifest

    serving_manifest = {
        "schema_version": "1.0",
        "models": {
            key: {
                "version": artifacts[key]["model_version"],
                "artifact": copied[key].relative_to(output_root).as_posix(),
                "sha256": artifacts[key]["artifact_sha256"],
            }
            for key in sorted(copied)
        },
    }
    _write_json(output_root / "serving-manifest.json", serving_manifest)
    _write_json(
        output_root / "frozen-ai01-evidence.json",
        {
            "ai01_closing_sha": AI01_SHA,
            "ai01_test_observation_ids_sha": ai01_test_sha,
            "ai01_entity_split_sha": ai01_split_sha,
            "ai01_feature_schema_sha": ai01_feature_sha,
            "frozen_predictions_sha256": sha256_file(frozen_predictions),
            "frozen_run_manifest_sha256": sha256_file(frozen_manifest),
            "frozen_repo_experiment_manifest_sha256": sha256_file(ai01_doc),
            "test_labels_used_for_ai02_training_or_selection": False,
        },
    )
    reproducibility = {
        "run_a": hashlib.sha256(run_a.tobytes()).hexdigest(),
        "run_b": hashlib.sha256(run_b.tobytes()).hexdigest(),
        "max_abs_prediction_delta": float(prediction_delta.max()),
        "mae_delta": abs(mae_a - mae_b),
        "rmse_delta": abs(rmse_a - rmse_b),
        "numerical_tolerance": PREDICTION_TOLERANCE,
        "acceptable": bool(float(prediction_delta.max()) <= PREDICTION_TOLERANCE),
        "comparison_fixture_count": len(requests),
        "comparison_target": "deterministic reference only; no AI-01 test labels",
    }
    roundtrip = {
        "artifact_sha256": artifacts["nbeats"]["artifact_sha256"],
        "model_config_sha256": config_hashes["nbeats"],
        "source_loader": nbeats_loader,
        "reloaded_loader": reload_metadata,
        "max_abs_prediction_delta": max_roundtrip_delta,
        "numerical_tolerance": PREDICTION_TOLERANCE,
        "status": "PASS",
    }
    _write_json(output_root / "reproducibility-summary.json", reproducibility)
    _write_json(output_root / "artifact-roundtrip-summary.json", roundtrip)
    _write_json(output_root / "latency-summary.json", latency)
    _write_json(output_root / "inference-contract.json", contract)
    _write_json(
        output_root / "observability-contract.json",
        {
            "schema_version": "1.0",
            "required_shadow_fields": OBSERVABILITY_FIELDS,
            "deferred_outcome_fields": DEFERRED_OUTCOME_FIELDS,
            "pii_required": False,
            "database_writes": False,
        },
    )
    champion_manifest = {
        "package_version": MODEL_VERSION,
        "training_run_id": RUN_ID,
        "created_at": datetime.now(UTC).isoformat(),
        "ai01_closing_sha": AI01_SHA,
        "routing": [
            {"minimum": low, "maximum": high, "phase": phase, "model": model}
            for low, high, phase, model in HISTORY_ROUTES
        ],
        "h13_plus_backup": "lightgbm",
        "artifacts": artifacts,
        "dataset_fingerprints": dataset_fingerprints,
        "feature_contract_sha256": contract_sha,
        "config_sha256": config_hashes,
        "model_code_fingerprint": model_code_fingerprint,
        "serving_code_fingerprint": serving_code_fingerprint,
        "roundtrip": roundtrip,
        "reproducibility": reproducibility,
        "latency": latency,
        "ready_for_shadow_validation": True,
        "ready_for_application_integration": False,
        "ready_for_production_ml": False,
    }
    champion_manifest["manifest_fingerprint"] = hashlib.sha256(
        stable_json(champion_manifest).encode()
    ).hexdigest()
    _write_json(output_root / "champion-manifest.json", champion_manifest)
    print(json.dumps(champion_manifest, indent=2, sort_keys=True, default=str))


if __name__ == "__main__":
    os.environ.setdefault("PYTHONHASHSEED", str(SEED))
    main()
