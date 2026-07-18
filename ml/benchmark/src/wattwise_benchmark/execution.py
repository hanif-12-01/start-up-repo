from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import BenchmarkConfig, sha256_file
from wattwise_benchmark.contracts import reporting_phase
from wattwise_benchmark.evaluation.metrics import aggregate_metrics
from wattwise_benchmark.features import build_examples, feature_manifest_fingerprint
from wattwise_benchmark.models.base import (
    eligibility_reason,
    eligible_rows,
    model_fingerprint,
)
from wattwise_benchmark.models.catboost_model import CatBoostAdapter
from wattwise_benchmark.models.deep_models import DeepForecastAdapter
from wattwise_benchmark.models.deterministic import deterministic_forecast
from wattwise_benchmark.models.lightgbm_model import LightGBMAdapter
from wattwise_benchmark.models.sklearn_models import SklearnAdapter
from wattwise_benchmark.pipeline import load_normalized
from wattwise_benchmark.reporting import write_reporting_outputs
from wattwise_benchmark.runtime import (
    PeakMemoryMonitor,
    hardware_summary,
    source_tree_fingerprint,
    utc_now_iso,
)
from wattwise_benchmark.splits import (
    assign_seen_entity_track,
    assign_unseen_entity_track,
    make_entity_split,
)

MODEL_KEYS = (
    "deterministic_baseline",
    "ridge",
    "gradient_boosting",
    "catboost",
    "lightgbm",
    "nbeats",
    "deepar",
)
DEEP_KEYS = {"nbeats", "deepar"}
MODEL_VERSIONS = {
    "deterministic_baseline": "laravel-prediction-service-v1",
    "ridge": "scikit-learn-1.7.1",
    "gradient_boosting": "scikit-learn-1.7.1",
    "catboost": "catboost-1.2.8",
    "lightgbm": "lightgbm-4.6.0",
    "nbeats": "pytorch-forecasting-1.8.0",
    "deepar": "pytorch-forecasting-1.8.0",
}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def _git_sha(repo_root: Path, revision: str) -> str:
    completed = subprocess.run(
        ["git", "rev-parse", revision],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def _smoke_panel(panel: pd.DataFrame, config: BenchmarkConfig) -> pd.DataFrame:
    pieces: list[pd.DataFrame] = []
    for source, group in panel.groupby("dataset_source", sort=True):
        eligible = (
            group.groupby("entity_id")["consecutive_month_index"]
            .max()
            .loc[lambda value: value >= 13]
            .index.astype(str)
            .tolist()
        )
        ordered = sorted(
            eligible,
            key=lambda entity: hashlib.sha256(
                f"{config.entity_seed}|{source}|{entity}".encode()
            ).hexdigest(),
        )
        selected = ordered[: config.smoke_entities_per_source]
        if len(selected) < 7:
            raise ValueError(f"source {source} lacks seven smoke entities")
        pieces.append(group.loc[group["entity_id"].astype(str).isin(selected)])
    return pd.concat(pieces, ignore_index=True)


def _artifact_path(run_dir: Path, track: str, model_key: str, seed: int) -> Path:
    suffix = {
        "ridge": ".joblib",
        "gradient_boosting": ".joblib",
        "catboost": ".cbm",
        "lightgbm": ".joblib",
        "nbeats": ".ckpt",
        "deepar": ".ckpt",
    }[model_key]
    return run_dir / "artifacts" / track / model_key / f"{seed}{suffix}"


def _make_adapter(
    model_key: str,
    seed: int,
    run_dir: Path,
    track: str,
    config: BenchmarkConfig,
) -> Any:
    smoke = config.stage == "smoke"
    if model_key in {"ridge", "gradient_boosting"}:
        return SklearnAdapter(model_key, seed)
    if model_key == "catboost":
        return CatBoostAdapter(seed, smoke=smoke)
    if model_key == "lightgbm":
        return LightGBMAdapter(seed, smoke=smoke)
    if model_key in DEEP_KEYS:
        steps = config.neural_max_steps_smoke if smoke else config.neural_max_steps_full
        return DeepForecastAdapter(
            model_key,
            seed,
            run_dir / "training" / track,
            smoke=smoke,
            max_steps=steps,
        )
    raise ValueError(model_key)


def _result_record(
    row: pd.Series,
    *,
    model_key: str,
    model_version: str,
    seed: int,
    status: str,
    ineligibility: str | None,
    failure: str | None,
    prediction: float | None,
    lower_80: float | None,
    upper_80: float | None,
    lower_95: float | None,
    upper_95: float | None,
    training_duration: float,
    inference_ms: float,
    peak_memory_mb: float,
    artifact_size: int,
    artifact_fingerprint: str | None,
    artifact_checksum: str | None,
) -> dict[str, Any]:
    return {
        "example_id": row["example_id"],
        "dataset_source": row["dataset_source"],
        "entity_id": row["entity_id"],
        "target_period": row["target_period"],
        "target_usage_kwh": float(row["target_usage_kwh"]),
        "history_values": row["history_values"],
        "history_month_count": int(row["history_month_count"]),
        "product_phase": row["product_phase"],
        "reporting_phase": reporting_phase(int(row["history_month_count"])).value,
        "initial_subgroup": row["initial_subgroup"],
        "example_variant": row["example_variant"],
        "track": row["track"],
        "fold": row["fold"],
        "model_key": model_key,
        "model_version": model_version,
        "eligible": ineligibility is None,
        "ineligibility_reason": ineligibility,
        "status": status,
        "failure_reason": failure,
        "prediction_kwh": prediction,
        "lower_interval": lower_80,
        "upper_interval": upper_80,
        "lower_80": lower_80,
        "upper_80": upper_80,
        "lower_95": lower_95,
        "upper_95": upper_95,
        "training_duration": training_duration,
        "inference_duration_ms": inference_ms,
        "random_seed": seed,
        "peak_memory_mb": peak_memory_mb,
        "artifact_size_bytes": artifact_size,
        "artifact_fingerprint": artifact_fingerprint,
        "artifact_checksum": artifact_checksum,
        "feature_manifest_fingerprint": feature_manifest_fingerprint(),
    }


def _run_deterministic(test: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    fingerprint = model_fingerprint(
        "deterministic_baseline",
        MODEL_VERSIONS["deterministic_baseline"],
        0,
        {"parity": "Laravel PredictionService"},
    )
    for _, row in test.iterrows():
        reason = eligibility_reason("deterministic_baseline", row)
        started = time.perf_counter()
        prediction: float | None = None
        failure: str | None = None
        status = "SKIPPED" if reason else "SUCCESS"
        if reason is None:
            try:
                prediction = deterministic_forecast(row["history_values"])
            except Exception as error:
                status = "FAILED"
                failure = f"{type(error).__name__}: {error}"[:500]
        inference_ms = (time.perf_counter() - started) * 1000.0
        rows.append(
            _result_record(
                row,
                model_key="deterministic_baseline",
                model_version=MODEL_VERSIONS["deterministic_baseline"],
                seed=0,
                status=status,
                ineligibility=reason,
                failure=failure,
                prediction=prediction,
                lower_80=None,
                upper_80=None,
                lower_95=None,
                upper_95=None,
                training_duration=0.0,
                inference_ms=inference_ms,
                peak_memory_mb=0.0,
                artifact_size=0,
                artifact_fingerprint=fingerprint,
                artifact_checksum=None,
            )
        )
    return pd.DataFrame(rows)


def _run_adapter(
    model_key: str,
    seed: int,
    train: pd.DataFrame,
    validation: pd.DataFrame,
    test: pd.DataFrame,
    run_dir: Path,
    track: str,
    config: BenchmarkConfig,
) -> pd.DataFrame:
    adapter = _make_adapter(model_key, seed, run_dir, track, config)
    model_version = MODEL_VERSIONS[model_key]
    monitor = PeakMemoryMonitor()
    summary: Any = None
    artifact = _artifact_path(run_dir, track, model_key, seed)
    artifact_checksum: str | None = None
    inference_ms = 0.0
    predictions: dict[str, dict[str, float]] = {}
    failure: str | None = None
    try:
        with monitor:
            summary = adapter.fit(train, validation)
            artifact_checksum = adapter.save(artifact)
            eligible = test.loc[eligible_rows(model_key, test)]
            started = time.perf_counter()
            if model_key in DEEP_KEYS:
                predicted = adapter.predict_frame(eligible)
                predictions = {
                    str(row.example_id): {
                        "prediction_kwh": float(row.prediction_kwh),
                        "lower_80": float(row.lower_80),
                        "upper_80": float(row.upper_80),
                        "lower_95": float(row.lower_95),
                        "upper_95": float(row.upper_95),
                    }
                    for row in predicted.itertuples(index=False)
                }
            else:
                values = adapter.predict(eligible)
                predictions = {
                    str(example_id): {
                        "prediction_kwh": float(value),
                        "lower_80": np.nan,
                        "upper_80": np.nan,
                        "lower_95": np.nan,
                        "upper_95": np.nan,
                    }
                    for example_id, value in zip(eligible["example_id"], values, strict=True)
                }
            elapsed = time.perf_counter() - started
            inference_ms = elapsed * 1000.0 / len(eligible) if len(eligible) else 0.0
    except Exception as error:
        failure = f"{type(error).__name__}: {error}"[:500]

    rows: list[dict[str, Any]] = []
    for _, row in test.iterrows():
        reason = eligibility_reason(model_key, row)
        value = predictions.get(str(row["example_id"]))
        row_failure = failure
        status = "SKIPPED" if reason else "FAILED" if value is None else "SUCCESS"
        if reason:
            row_failure = None
        if value is None:
            value = {
                "prediction_kwh": np.nan,
                "lower_80": np.nan,
                "upper_80": np.nan,
                "lower_95": np.nan,
                "upper_95": np.nan,
            }
        clean = {
            key: None if not np.isfinite(number) else float(number) for key, number in value.items()
        }
        rows.append(
            _result_record(
                row,
                model_key=model_key,
                model_version=model_version,
                seed=seed,
                status=status,
                ineligibility=reason,
                failure=row_failure,
                prediction=clean["prediction_kwh"],
                lower_80=clean["lower_80"],
                upper_80=clean["upper_80"],
                lower_95=clean["lower_95"],
                upper_95=clean["upper_95"],
                training_duration=(
                    float(summary.training_duration) if summary is not None else 0.0
                ),
                inference_ms=inference_ms,
                peak_memory_mb=monitor.peak_bytes / (1024.0 * 1024.0),
                artifact_size=artifact.stat().st_size if artifact.is_file() else 0,
                artifact_fingerprint=(
                    str(summary.artifact_fingerprint) if summary is not None else None
                ),
                artifact_checksum=artifact_checksum,
            )
        )
    return pd.DataFrame(rows)


def run_benchmark(
    data_root: Path,
    repo_root: Path,
    run_dir: Path,
    config: BenchmarkConfig,
) -> dict[str, Any]:
    config.validate()
    run_dir.mkdir(parents=True, exist_ok=True)
    started = utc_now_iso()
    base_sha = _git_sha(repo_root, "origin/main")
    head_sha = _git_sha(repo_root, "HEAD")
    hw = hardware_summary()
    package_root = Path(__file__).resolve().parent

    print(f"[benchmark] stage={config.stage} run_dir={run_dir}")
    print(f"[benchmark] base_sha={base_sha} head_sha={head_sha}")

    normalized = load_normalized(data_root)
    combined = normalized["combined_panel"]
    quality = normalized["quality_audit"]
    print(
        f"[benchmark] combined panel: {len(combined)} entity-months, "
        f"{combined['entity_id'].nunique()} entities"
    )

    if config.stage == "smoke":
        combined = _smoke_panel(combined, config)
        print(f"[benchmark] smoke subset: {len(combined)} entity-months")

    examples = build_examples(combined)
    print(f"[benchmark] examples: {len(examples)}")

    entity_split = make_entity_split(examples, config.entity_seed)
    seen = assign_seen_entity_track(examples)
    unseen = assign_unseen_entity_track(examples, entity_split)

    all_predictions: list[pd.DataFrame] = []

    for track_name, track_data in [("seen_entity", seen), ("unseen_entity", unseen)]:
        train = track_data.loc[track_data["fold"].eq("train")]
        validation = track_data.loc[track_data["fold"].eq("validation")]
        test = track_data.loc[track_data["fold"].eq("test")]
        print(
            f"[benchmark] track={track_name} "
            f"train={len(train)} val={len(validation)} test={len(test)}"
        )

        det_results = _run_deterministic(test)
        det_results["track"] = track_name
        det_results["fold"] = "test"
        all_predictions.append(det_results)

        for model_key in MODEL_KEYS:
            if model_key == "deterministic_baseline":
                continue
            for seed in config.model_seeds:
                print(f"[benchmark] running {model_key} seed={seed} track={track_name}")
                try:
                    results = _run_adapter(
                        model_key,
                        seed,
                        train,
                        validation,
                        test,
                        run_dir,
                        track_name,
                        config,
                    )
                    results["track"] = track_name
                    results["fold"] = "test"
                    all_predictions.append(results)
                    successes = results["status"].eq("SUCCESS").sum()
                    failures = results["status"].eq("FAILED").sum()
                    print(
                        f"[benchmark]   {model_key}/{seed}: {successes} success, {failures} failed"
                    )
                except Exception as error:
                    print(f"[benchmark]   {model_key}/{seed} CRASHED: {error}")
                    crash_rows: list[dict[str, Any]] = []
                    for _, row in test.iterrows():
                        reason = eligibility_reason(model_key, row)
                        crash_rows.append(
                            _result_record(
                                row,
                                model_key=model_key,
                                model_version=MODEL_VERSIONS[model_key],
                                seed=seed,
                                status="SKIPPED" if reason else "FAILED",
                                ineligibility=reason,
                                failure=f"ADAPTER_CRASH: {type(error).__name__}: {error}"[:500]
                                if not reason
                                else None,
                                prediction=None,
                                lower_80=None,
                                upper_80=None,
                                lower_95=None,
                                upper_95=None,
                                training_duration=0.0,
                                inference_ms=0.0,
                                peak_memory_mb=0.0,
                                artifact_size=0,
                                artifact_fingerprint=None,
                                artifact_checksum=None,
                            )
                        )
                    crash_df = pd.DataFrame(crash_rows)
                    crash_df["track"] = track_name
                    crash_df["fold"] = "test"
                    all_predictions.append(crash_df)

    predictions = pd.concat(all_predictions, ignore_index=True)
    predictions_path = run_dir / "predictions.parquet"
    predictions.to_parquet(predictions_path, index=False, compression="zstd")

    metrics = aggregate_metrics(predictions)
    metrics_path = run_dir / "metrics.parquet"
    metrics.to_parquet(metrics_path, index=False, compression="zstd")

    report_outputs, selection = write_reporting_outputs(metrics, predictions, run_dir)
    paired = pd.read_csv(report_outputs["paired_comparisons"])
    eligibility = pd.read_csv(report_outputs["model_eligibility"])
    leaderboards = {
        "model_leaderboard": report_outputs["model_leaderboard"],
        "phase_leaderboard": report_outputs["phase_leaderboard"],
    }

    package_directory = package_root.parent.parent
    dep_lock = sha256_file(package_directory / "requirements.lock")
    pyproject_checksum = sha256_file(package_directory / "pyproject.toml")
    config_checksum = config.fingerprint()
    norm_manifest = normalized["manifest"]
    source_sha = source_tree_fingerprint(package_root)

    run_manifest: dict[str, Any] = {
        "schema_version": "1.0",
        "run_id": run_dir.name,
        "stage": config.stage,
        "origin_main_sha": base_sha,
        "benchmark_code_sha": head_sha,
        "utc_start": started,
        "utc_end": utc_now_iso(),
        "python_version": sys.version,
        "dependency_lock_checksum": dep_lock,
        "pyproject_checksum": pyproject_checksum,
        "hardware": hw,
        "random_seeds": list(config.model_seeds),
        "dataset_checksums": {
            key: entry.get("parquet_sha256")
            for key, entry in norm_manifest.get("datasets", {}).items()
        },
        "normalized_data_checksum": norm_manifest.get("normalization_fingerprint"),
        "configuration_checksum": config_checksum,
        "source_code_fingerprint": source_sha,
        "source_entity_month_counts": {
            str(source): int(count)
            for source, count in combined.groupby("dataset_source").size().items()
        },
        "split_counts": {
            "seen_train": int(seen["fold"].eq("train").sum()),
            "seen_validation": int(seen["fold"].eq("validation").sum()),
            "seen_test": int(seen["fold"].eq("test").sum()),
            "unseen_train": int(unseen["fold"].eq("train").sum()),
            "unseen_validation": int(unseen["fold"].eq("validation").sum()),
            "unseen_test": int(unseen["fold"].eq("test").sum()),
        },
        "model_versions": MODEL_VERSIONS,
        "total_predictions": len(predictions),
        "total_successful": int(predictions["status"].eq("SUCCESS").sum()),
        "total_failed": int(predictions["status"].eq("FAILED").sum()),
        "total_skipped": int(predictions["status"].eq("SKIPPED").sum()),
        "output_checksums": {
            "predictions": sha256_file(predictions_path),
            "metrics": sha256_file(metrics_path),
            **{
                key: sha256_file(Path(path)) for key, path in sorted(report_outputs.items())
            },
        },
        "phase_champions": selection.get("phase_champions", {}),
        "common_cohort_champions": selection.get("common_cohort_champions", {}),
        "product_routing_recommendations": selection.get(
            "product_routing_recommendations", {}
        ),
        "top_four": [item["model_key"] for item in selection.get("top_four_portfolio", [])],
    }

    manifest_path = run_dir / "run-manifest.json"
    _write_json(manifest_path, run_manifest)

    print(
        f"[benchmark] complete: {len(predictions)} predictions, "
        f"{predictions['status'].eq('SUCCESS').sum()} successful"
    )

    return {
        "run_dir": str(run_dir),
        "run_manifest": run_manifest,
        "metrics": metrics,
        "predictions_path": str(predictions_path),
        "selection": selection,
        "quality_audit": quality,
        "leaderboards": leaderboards,
        "eligibility": eligibility,
        "paired_comparisons": paired,
    }
