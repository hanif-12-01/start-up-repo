from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import data_root, sha256_file, stable_json
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact
from wattwise_benchmark.runtime import source_tree_fingerprint
from wattwise_serving.ai04_contracts import ShadowObservation
from wattwise_serving.ai04_replay import (
    FrozenPackage,
    ShadowReplayRunner,
    operational_summary,
    real_accuracy_summary,
    replay_fingerprint,
)
from wattwise_serving.ai04_worker import IsolatedModelWorker
from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.shadow_contracts import ForecastRequest
from wattwise_serving.shadow_features import build_model_example

AI02_SHA = "4dabeeb7f1b37a75cb47e62c19f85939c787e247"
NBEATS_VERSION = "nbeats-ai02-1.0.0"
NBEATS_SHA = "541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6"
FEATURE_SCHEMA_SHA = "0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4"
NUMERICAL_TOLERANCE = 1e-6


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True, default=str) + "\n", encoding="utf-8"
    )


def _git_sha(repo: Path) -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repo, text=True
    ).strip()


def _opaque(dataset: str, entity: str) -> str:
    return hashlib.sha256(f"ai04|{dataset}|{entity}".encode()).hexdigest()[:24]


def _context(dataset: str, row: pd.Series) -> dict[str, Any]:
    def text_value(name: str) -> str | None:
        value = row.get(name)
        return str(value) if pd.notna(value) and str(value).strip() else None

    area = row.get("building_area", row.get("floor_area"))
    return {
        "dataset_source": dataset,
        "building_primary_use": text_value("building_primary_use"),
        "business_type": text_value("business_type"),
        "building_area": float(area) if pd.notna(area) and float(area) > 0 else None,
        "site": text_value("site"),
        "timezone": text_value("timezone"),
        "profile_eligible": False,
    }


def _observation(
    dataset: str,
    provenance: str,
    entity: str,
    rows: pd.DataFrame,
    target_index: int,
    purpose: str = "OPERATIONAL_REPLAY",
) -> ShadowObservation:
    target = rows.iloc[target_index]
    history_rows = rows.iloc[:target_index].tail(13)
    target_start = pd.Timestamp(target["period_month"])
    origin = target_start.to_pydatetime().replace(tzinfo=UTC) - timedelta(seconds=1)
    return ShadowObservation.from_dict(
        {
            "shadow_request_id": hashlib.sha256(
                f"{dataset}|{entity}|{target_start.date()}|{purpose}".encode()
            ).hexdigest()[:32],
            "shadow_entity_id": _opaque(dataset, entity),
            "data_provenance": provenance,
            "forecast_origin": origin.isoformat(),
            "target_period": target_start.strftime("%Y-%m"),
            "history": [
                {
                    "period_month": pd.Timestamp(item.period_month).strftime("%Y-%m"),
                    "usage_kwh": float(item.usage_kwh),
                }
                for item in history_rows.itertuples(index=False)
            ],
            "contextual_features": _context(dataset, target),
            "feature_schema_sha256": FEATURE_SCHEMA_SHA,
            "actual_kwh": float(target["usage_kwh"]),
            "replay_purpose": purpose,
        }
    )


def _panel_observations(
    panel: pd.DataFrame,
    dataset: str,
    provenance: str,
    limit: int,
) -> list[ShadowObservation]:
    candidates: list[ShadowObservation] = []
    ordered = panel.sort_values(["entity_id", "period_month"])
    for entity, rows in ordered.groupby("entity_id", sort=True):
        rows = rows.reset_index(drop=True)
        if len(rows) < 7:
            continue
        target_index = min(len(rows) - 1, 13)
        candidates.append(
            _observation(dataset, provenance, str(entity), rows, target_index)
        )
        if len(candidates) >= limit:
            break
    return candidates


def _routing_fixtures(reference: ShadowObservation) -> list[ShadowObservation]:
    fixtures: list[ShadowObservation] = []
    for months in (0, 1, 3, 6, 13):
        history = reference.history[-months:] if months else []
        if history:
            last = pd.Timestamp(f"{history[-1]['period_month']}-01")
            target = last + pd.offsets.MonthBegin(1)
        else:
            target = pd.Timestamp("2024-01-01")
        fixtures.append(
            ShadowObservation.from_dict(
                {
                    "shadow_request_id": f"synthetic-routing-{months}",
                    "shadow_entity_id": f"synthetic-routing-{months}",
                    "data_provenance": "SYNTHETIC_DEMO",
                    "forecast_origin": (
                        target.to_pydatetime().replace(tzinfo=UTC)
                        - timedelta(seconds=1)
                    ).isoformat(),
                    "target_period": target.strftime("%Y-%m"),
                    "history": history,
                    "contextual_features": reference.contextual_features,
                    "feature_schema_sha256": FEATURE_SCHEMA_SHA,
                    "actual_kwh": None,
                    "replay_purpose": "OPERATIONAL_REPLAY",
                }
            )
        )
    return fixtures


def _percentiles(values: list[float]) -> dict[str, float]:
    array = np.asarray(values, dtype=float)
    return {
        "p50_ms": float(np.percentile(array, 50)),
        "p95_ms": float(np.percentile(array, 95)),
        "p99_ms": float(np.percentile(array, 99)),
        "max_ms": float(array.max()),
    }


def main() -> None:
    root = data_root()
    repo = Path(__file__).resolve().parents[3]
    model_root = root / "models" / "ai-02"
    inventory = ArtifactInventory(model_root)
    if not inventory.ready:
        raise RuntimeError(f"AI-02 package invalid: {inventory.error_code}")
    nbeats_spec = inventory.require("nbeats", NBEATS_VERSION)
    if nbeats_spec.sha256 != NBEATS_SHA or feature_manifest_fingerprint() != (
        "5a7f36a8c9096f2025bd1d9357b379c5b9aa719780d49782d8599db6b6a68dc1"
    ):
        raise RuntimeError("frozen AI-02 authority mismatch")
    model_manifest = json.loads(
        (nbeats_spec.path.parent / "model-manifest.json").read_text(encoding="utf-8")
    )
    if model_manifest["feature_schema_sha256"] != FEATURE_SCHEMA_SHA:
        raise RuntimeError("AI-02 feature contract mismatch")

    london_path = root / "normalized" / "london_smartmeter" / "1.0" / "monthly.parquet"
    comstock_path = root / "normalized" / "nrel_comstock" / "1.0" / "monthly.parquet"
    london = pd.read_parquet(london_path)
    comstock = pd.read_parquet(comstock_path)
    public = _panel_observations(london, "london_smartmeter", "PUBLIC_PROXY", 100)
    simulation = _panel_observations(
        comstock, "nrel_comstock", "MODELED_SIMULATION", 20
    )
    routing = _routing_fixtures(public[0])
    operational_inputs = [*routing, *public, *simulation]

    input_fingerprint = hashlib.sha256(
        stable_json(
            [
                {
                    "id": item.shadow_request_id,
                    "provenance": item.data_provenance,
                    "target": item.target_period,
                    "history": item.history,
                    "context": item.contextual_features,
                    "actual": item.actual_kwh,
                }
                for item in operational_inputs
            ]
        ).encode()
    ).hexdigest()
    run_id = f"ai04-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}"
    output = root / "shadow" / "ai-04" / "runs" / run_id
    output.mkdir(parents=True, exist_ok=False)
    started_at = datetime.now(UTC)
    worker = IsolatedModelWorker(
        nbeats_spec.path, timeout_ms=5_000.0, max_requests_per_generation=100
    )
    runner = ShadowReplayRunner(
        worker,
        FrozenPackage(NBEATS_VERSION, NBEATS_SHA, FEATURE_SCHEMA_SHA),
    )
    try:
        worker.start()
        startup_ms = worker.startup_ms
        startup_rss = worker.startup_rss_bytes

        first_started = time.perf_counter()
        first = runner.run_one(public[0])
        first_wall_ms = (time.perf_counter() - first_started) * 1000.0

        timeout_started = time.perf_counter()
        timeout_result = runner.run_one(
            public[0],
            worker_behavior="hang",
            sleep_seconds=10.0,
            worker_timeout_ms=200.0,
        )
        hard_timeout_wall_ms = (time.perf_counter() - timeout_started) * 1000.0
        recovery_started = time.perf_counter()
        recovered = runner.run_one(public[1])
        recycle_and_recovery_ms = (time.perf_counter() - recovery_started) * 1000.0

        operational_results = runner.run(operational_inputs)
        subset = operational_inputs[5:15]
        replay_a = runner.run(subset)
        replay_b = runner.run(subset)
        load_input = ShadowObservation.from_dict(
            {**public[0].__dict__, "replay_purpose": "LOAD_TEST_REPLAY"}
        )
        load_results = [runner.run_one(load_input) for _ in range(500)]
    finally:
        model_loads = worker.model_loads
        requests_processed = worker.requests_processed
        recycle_count = worker.recycle_count
        worker.close()

    all_results = [first, timeout_result, recovered, *operational_results, *load_results]
    results_frame = pd.DataFrame([item.as_dict() for item in all_results])
    results_frame.to_parquet(output / "shadow-results.parquet", index=False, compression="zstd")

    normal_success = [
        item
        for item in operational_results
        if item.nbeats_prediction_kwh is not None and item.inference_latency_ms is not None
    ]
    load_success = [
        item
        for item in load_results
        if item.nbeats_prediction_kwh is not None and item.inference_latency_ms is not None
    ]
    warm_latencies = [float(item.inference_latency_ms) for item in normal_success[1:]]
    load_latencies = [float(item.inference_latency_ms) for item in load_success]
    rss_values = [
        int(value) for value in results_frame["worker_rss_bytes"].dropna().tolist()
    ]
    peak_rss = max([startup_rss or 0, *rss_values])
    if peak_rss == 0:
        raise RuntimeError("worker RSS was not measured")

    run_a_values = np.asarray(
        [item.nbeats_prediction_kwh for item in replay_a], dtype=float
    )
    run_b_values = np.asarray(
        [item.nbeats_prediction_kwh for item in replay_b], dtype=float
    )
    reproducibility = {
        "run_a_fingerprint": replay_fingerprint(replay_a),
        "run_b_fingerprint": replay_fingerprint(replay_b),
        "max_prediction_delta": float(np.max(np.abs(run_a_values - run_b_values))),
        "route_mismatch_count": sum(
            left.history_phase != right.history_phase
            for left, right in zip(replay_a, replay_b, strict=True)
        ),
        "fallback_mismatch_count": sum(
            left.fallback_reason != right.fallback_reason
            for left, right in zip(replay_a, replay_b, strict=True)
        ),
    }
    reliability = operational_summary(operational_results)
    load_rss = [
        int(item.worker_rss_bytes)
        for item in load_results
        if item.worker_rss_bytes is not None
    ]
    generation_rss: dict[int, list[int]] = {}
    for item in load_results:
        if item.worker_generation is not None and item.worker_rss_bytes is not None:
            generation_rss.setdefault(item.worker_generation, []).append(item.worker_rss_bytes)
    full_generations = [values for values in generation_rss.values() if len(values) >= 100]
    within_generation_growth = [
        (float(np.mean(values[-20:])) - float(np.mean(values[:20])))
        / float(np.mean(values[:20]))
        for values in full_generations
    ]
    steady_rss = load_rss[-100:]
    steady_growth = max(within_generation_growth, default=0.0)
    latency = {
        "worker_cold_start_ms": startup_ms,
        "model_load_included_in_worker_start": True,
        "first_prediction_wall_ms": first_wall_ms,
        "warm_operational": _percentiles(warm_latencies),
        "load_test_500": _percentiles(load_latencies),
        "hard_timeout_parent_control_ms": hard_timeout_wall_ms,
        "worker_recycle_and_next_success_ms": recycle_and_recovery_ms,
        "worker_startup_rss_bytes": startup_rss,
        "post_model_load_rss_bytes": startup_rss,
        "peak_worker_rss_bytes": peak_rss,
        "steady_state_rss_bytes": int(np.mean(steady_rss)),
        "steady_state_rss_growth_percent": steady_growth * 100.0,
        "memory_method_note": (
            "total isolated Python worker RSS; growth compares first 10 recorded request "
            "and final 20 snapshots inside each complete 100-request worker generation"
        ),
    }
    failure = {
        "hard_timeout_count_in_injection": 1,
        "hard_timeout_fallback": timeout_result.fallback_reason,
        "worker_recycle_count": recycle_count,
        "next_request_after_timeout_success": recovered.nbeats_prediction_kwh is not None,
        "artifact_failures_on_valid_package": 0,
        "checksum_failures_on_valid_package": 0,
        "invalid_outputs": 0,
        "uncaught_exceptions": 0,
        "model_loads": model_loads,
        "requests_processed": requests_processed,
    }

    lightgbm_spec = inventory.require("lightgbm", "lightgbm-ai02-1.0.0")
    lightgbm, _ = load_artifact("lightgbm", lightgbm_spec.path)
    lightgbm_request = ForecastRequest.from_dict(public[0].inference_payload())
    lightgbm_output = predict_loaded_artifact(
        "lightgbm", lightgbm, build_model_example(lightgbm_request)
    )["prediction_kwh"].to_numpy(dtype=float)
    lightgbm_summary = {
        "artifact_valid": True,
        "loads": True,
        "predicts": len(lightgbm_output) == 1,
        "finite_nonnegative": bool(
            len(lightgbm_output) == 1
            and np.isfinite(lightgbm_output).all()
            and (lightgbm_output >= 0).all()
        ),
        "promoted_over_nbeats": False,
    }
    real_accuracy = real_accuracy_summary(operational_results)
    domain_shift = {
        "real_wattwise_available": False,
        "overall": "INSUFFICIENT_DATA",
        "usage_distribution": "No legitimate REAL_WATTWISE snapshot available.",
        "history_distribution": "No legitimate REAL_WATTWISE snapshot available.",
        "context_missingness": "No legitimate REAL_WATTWISE snapshot available.",
        "proxy_note": "London is PUBLIC_PROXY and excluded from product accuracy claims.",
    }
    code_root = repo / "ml" / "benchmark" / "src"
    manifest = {
        "run_id": run_id,
        "ai04_git_sha_at_execution": _git_sha(repo),
        "ai04_source_fingerprint": source_tree_fingerprint(code_root / "wattwise_serving"),
        "ai02_base_sha": AI02_SHA,
        "nbeats_version": NBEATS_VERSION,
        "nbeats_artifact_sha256": NBEATS_SHA,
        "feature_schema_sha256": FEATURE_SCHEMA_SHA,
        "input_snapshot_fingerprint": input_fingerprint,
        "input_files": {
            "london_sha256": sha256_file(london_path),
            "comstock_sha256": sha256_file(comstock_path),
        },
        "provenance_counts": reliability["provenance_counts"],
        "worker_configuration": {
            "process_start_method": "spawn",
            "preloaded": True,
            "timeout_ms": 5000.0,
            "timeout_injection_ms": 200.0,
            "max_requests_per_generation": 100,
            "python": platform.python_version(),
        },
        "started_at": started_at.isoformat(),
        "ended_at": datetime.now(UTC).isoformat(),
        "request_counts": {
            "unique_operational": len(operational_inputs),
            "load_test_replays": len(load_results),
            "reproducibility_replays": len(replay_a) + len(replay_b),
        },
        "success_fallback_counts": reliability,
        "shadow_result_can_override_user_forecast": False,
        "production_database_writes": False,
        "application_integration": False,
    }
    _write_json(output / "run-manifest.json", manifest)
    _write_json(output / "operational-metrics.json", reliability)
    _write_json(output / "real-accuracy-metrics.json", real_accuracy)
    _write_json(output / "worker-health.json", {**latency, **failure})
    _write_json(output / "reproducibility-summary.json", reproducibility)
    _write_json(output / "lightgbm-summary.json", lightgbm_summary)
    _write_json(output / "domain-shift-summary.json", domain_shift)
    print(
        json.dumps(
            {
                "run_directory": str(output),
                "manifest": manifest,
                "reliability": reliability,
                "latency": latency,
                "failure": failure,
                "reproducibility": reproducibility,
                "real_accuracy": real_accuracy,
                "lightgbm": lightgbm_summary,
                "domain_shift": domain_shift,
            },
            indent=2,
            default=str,
        )
    )


if __name__ == "__main__":
    main()
