from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.contracts import ReportingPhase
from wattwise_benchmark.evaluation.metrics import paired_mae_intervals, with_reporting_phase
from wattwise_benchmark.runtime import source_tree_fingerprint, utc_now_iso
from wattwise_benchmark.selection import build_selection_outputs, score_models


def _wmape(rows: pd.DataFrame) -> float:
    successful = rows.loc[rows["status"].eq("SUCCESS")]
    if successful.empty:
        return float("nan")
    actual = successful["target_usage_kwh"].to_numpy(dtype=float)
    predicted = successful["prediction_kwh"].to_numpy(dtype=float)
    denominator = float(np.abs(actual).sum())
    return float(np.abs(predicted - actual).sum() / denominator) if denominator else float("nan")


def _mae(rows: pd.DataFrame) -> float:
    successful = rows.loc[rows["status"].eq("SUCCESS")]
    if successful.empty:
        return float("nan")
    actual = successful["target_usage_kwh"].to_numpy(dtype=float)
    predicted = successful["prediction_kwh"].to_numpy(dtype=float)
    return float(np.abs(predicted - actual).mean())


def _json_counts(series: pd.Series) -> str:
    counts = {
        str(key): int(value)
        for key, value in series.fillna("<NONE>").value_counts(dropna=False).sort_index().items()
    }
    return json.dumps(counts, sort_keys=True, separators=(",", ":"))


def build_eligibility_matrix(predictions: pd.DataFrame) -> pd.DataFrame:
    frame = with_reporting_phase(predictions)
    columns = [
        "model_key",
        "track",
        "reporting_phase",
        "random_seed",
        "status",
        "failure_reason",
        "ineligibility_reason",
    ]
    result = (
        frame.groupby(columns, dropna=False, sort=True)
        .size()
        .rename("prediction_micro_count")
        .reset_index()
    )
    result["eligible"] = result["ineligibility_reason"].isna()
    return result


def build_model_leaderboard(
    metrics: pd.DataFrame,
    predictions: pd.DataFrame,
    selection: dict[str, Any] | None = None,
) -> pd.DataFrame:
    leaderboard = score_models(metrics, predictions).copy()
    if selection is not None:
        selected_keys = {
            str(item["model_key"]) for item in selection["top_four_portfolio"]
        }
        leaderboard["selection_count"] = (
            leaderboard["model_key"].astype(str).isin(selected_keys).astype(int)
        )
    leaderboard["gate_reasons"] = leaderboard["gate_reasons"].map(
        lambda value: json.dumps(value, separators=(",", ":"))
    )
    leaderboard["eligible_phases"] = leaderboard["eligible_phases"].map(
        lambda value: json.dumps(value, separators=(",", ":"))
    )
    leaderboard["evaluated_phases"] = leaderboard["evaluated_phases"].map(
        lambda value: json.dumps(value, separators=(",", ":"))
    )
    leaderboard["phases"] = leaderboard["phases"].map(
        lambda value: json.dumps(value, separators=(",", ":"))
    )
    return leaderboard


def build_phase_leaderboard(
    predictions: pd.DataFrame,
    selection: dict[str, Any],
) -> pd.DataFrame:
    frame = with_reporting_phase(predictions)
    phase_decisions = selection["phase_decisions"]
    rows: list[dict[str, Any]] = []
    for phase in ReportingPhase:
        phase_frame = frame.loc[frame["reporting_phase"].eq(phase.value)]
        decision = phase_decisions[phase.value]
        for model_key in sorted(frame["model_key"].unique()):
            model_phase = phase_frame.loc[phase_frame["model_key"].eq(model_key)]
            for track in ["seen_entity", "unseen_entity", "all_tracks"]:
                scope = (
                    model_phase
                    if track == "all_tracks"
                    else model_phase.loc[model_phase["track"].eq(track)]
                )
                eligible = scope.loc[~scope["status"].eq("SKIPPED")]
                success = scope.loc[scope["status"].eq("SUCCESS")]
                rows.append(
                    {
                        "reporting_phase": phase.value,
                        "track": track,
                        "model_key": str(model_key),
                        "prediction_micro_count": len(scope),
                        "eligible_prediction_micro_count": len(eligible),
                        "successful_prediction_micro_count": len(success),
                        "skipped_prediction_micro_count": int(
                            scope["status"].eq("SKIPPED").sum()
                        ),
                        "failed_prediction_micro_count": int(scope["status"].eq("FAILED").sum()),
                        "micro_wmape": _wmape(scope),
                        "micro_mae": _mae(scope),
                        "failure_reason_counts": _json_counts(scope["failure_reason"]),
                        "ineligibility_reason_counts": _json_counts(
                            scope["ineligibility_reason"]
                        ),
                        "common_cohort_observation_count": (
                            int(decision["common_cohort_observation_count"])
                            if track == "all_tracks"
                            else pd.NA
                        ),
                        "common_cohort_wmape": (
                            decision["common_cohort_wmape"].get(str(model_key))
                            if track == "all_tracks"
                            else np.nan
                        ),
                        "is_phase_champion": bool(
                            track == "all_tracks" and decision["phase_champion"] == model_key
                        ),
                        "is_common_cohort_champion": bool(
                            track == "all_tracks"
                            and decision["common_cohort_champion"] == model_key
                        ),
                        "is_product_routing_recommendation": bool(
                            track == "all_tracks"
                            and decision["product_routing_recommendation"] == model_key
                        ),
                    }
                )
    result = pd.DataFrame(rows)
    result["available_cohort_rank"] = result.groupby(
        ["reporting_phase", "track"], dropna=False
    )["micro_wmape"].rank(method="min", ascending=True)
    result["common_cohort_rank"] = result.groupby(
        ["reporting_phase", "track"], dropna=False
    )["common_cohort_wmape"].rank(method="min", ascending=True)
    return result.sort_values(
        ["reporting_phase", "track", "available_cohort_rank", "model_key"],
        na_position="last",
    ).reset_index(drop=True)


def write_reporting_outputs(
    metrics: pd.DataFrame,
    predictions: pd.DataFrame,
    output_dir: Path,
) -> tuple[dict[str, str], dict[str, Any]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, str] = {}

    paired = paired_mae_intervals(predictions)
    paired_path = output_dir / "paired-comparisons.csv"
    paired.to_csv(paired_path, index=False)
    outputs["paired_comparisons"] = str(paired_path)

    eligibility = build_eligibility_matrix(predictions)
    eligibility_path = output_dir / "model-eligibility.csv"
    eligibility.to_csv(eligibility_path, index=False)
    outputs["model_eligibility"] = str(eligibility_path)

    selection = build_selection_outputs(metrics, predictions, output_dir)
    selection_path = output_dir / "top-four-recommendation.json"
    outputs["top_four_recommendation"] = str(selection_path)

    model_leaderboard = build_model_leaderboard(metrics, predictions, selection)
    model_path = output_dir / "model-leaderboard.csv"
    model_leaderboard.to_csv(model_path, index=False)
    outputs["model_leaderboard"] = str(model_path)

    phase_leaderboard = build_phase_leaderboard(predictions, selection)
    phase_path = output_dir / "phase-leaderboard.csv"
    phase_leaderboard.to_csv(phase_path, index=False)
    outputs["phase_leaderboard"] = str(phase_path)
    return outputs, selection


def _reporting_files_fingerprint() -> str:
    package_root = Path(__file__).resolve().parent
    paths = [
        package_root / "contracts.py",
        package_root / "evaluation" / "metrics.py",
        package_root / "reporting.py",
        package_root / "selection.py",
    ]
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.relative_to(package_root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def refresh_recovered_reports(run_dir: Path) -> dict[str, Any]:
    """Refresh reports with per-file atomic replacement.

    The report set is not transactionally atomic if a later replacement fails.
    """
    run_dir = run_dir.resolve()
    manifest_path = run_dir / "run-manifest.json"
    predictions_path = run_dir / "predictions.parquet"
    metrics_path = run_dir / "metrics.parquet"
    required = [manifest_path, predictions_path, metrics_path]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"recovered run is incomplete; missing: {missing}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("recovery_type") != "INFERENCE_FROM_EXISTING_ARTIFACTS":
        raise ValueError("report refresh is restricted to artifact-only recovered runs")
    predictions_checksum = sha256_file(predictions_path)
    metrics_checksum = sha256_file(metrics_path)
    expected = manifest.get("output_checksums", {})
    if expected.get("predictions") != predictions_checksum:
        raise ValueError("predictions checksum does not match recovered manifest")
    if expected.get("metrics") != metrics_checksum:
        raise ValueError("metrics checksum does not match recovered manifest")

    predictions = pd.read_parquet(predictions_path)
    metrics = pd.read_parquet(metrics_path)
    temporary = run_dir / f".report-refresh.{uuid.uuid4().hex}.tmp"
    temporary.mkdir(parents=False, exist_ok=False)
    try:
        outputs, selection = write_reporting_outputs(metrics, predictions, temporary)
        selected_keys = {
            str(item["model_key"]) for item in selection["top_four_portfolio"]
        }
        csv_leaderboard = pd.read_csv(outputs["model_leaderboard"])
        csv_selected = set(
            csv_leaderboard.loc[csv_leaderboard["selection_count"].eq(1), "model_key"]
            .astype(str)
            .tolist()
        )
        json_selected = {
            str(item["model_key"])
            for item in selection["model_leaderboard"]
            if int(item["selection_count"]) == 1
        }
        if csv_selected != selected_keys or json_selected != selected_keys:
            raise ValueError("selection counts do not reconcile across CSV and JSON")

        for key, generated_path in sorted(outputs.items()):
            destination = run_dir / Path(generated_path).name
            os.replace(generated_path, destination)
            expected[key] = sha256_file(destination)

        manifest["reporting_source_fingerprint"] = _reporting_files_fingerprint()
        manifest["output_checksums"] = expected
        manifest["phase_champions"] = selection["phase_champions"]
        manifest["common_cohort_champions"] = selection["common_cohort_champions"]
        manifest["product_routing_recommendations"] = selection[
            "product_routing_recommendations"
        ]
        manifest["top_four"] = [
            item["model_key"] for item in selection["top_four_portfolio"]
        ]
        manifest["report_refresh"] = {
            "type": "REPORTING_ONLY_FROM_IMMUTABLE_PREDICTIONS",
            "atomicity": "PER_FILE_ATOMIC_NOT_TRANSACTIONAL",
            "generated_at_utc": utc_now_iso(),
            "predictions_checksum": predictions_checksum,
            "metrics_checksum": metrics_checksum,
            "parameter_updating_training_operation_invoked": False,
            "fit_or_optimizer_operation_invoked": False,
            "training_operation_invoked": False,
            "inference_mode_note": (
                "report-only refresh performs no model inference; no train mode, fit, "
                "or optimizer operation is invoked"
            ),
            "selection_counts_reconciled": True,
        }
        manifest_temporary = run_dir / f".run-manifest.{uuid.uuid4().hex}.tmp"
        try:
            manifest_temporary.write_text(
                json.dumps(manifest, indent=2, sort_keys=True, allow_nan=False) + "\n",
                encoding="utf-8",
            )
            os.replace(manifest_temporary, manifest_path)
        finally:
            if manifest_temporary.exists():
                manifest_temporary.unlink()
        return manifest
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


def regenerate_reports(source_run_dir: Path, output_dir: Path) -> dict[str, Any]:
    source_run_dir = source_run_dir.resolve()
    output_dir = output_dir.resolve()
    if source_run_dir == output_dir:
        raise ValueError("report output must not overwrite the source benchmark run")
    if output_dir.exists():
        raise FileExistsError(f"report output already exists: {output_dir}")

    required = ["predictions.parquet", "metrics.parquet", "run-manifest.json"]
    missing = [name for name in required if not (source_run_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(f"source benchmark run is incomplete; missing: {missing}")

    source_manifest_path = source_run_dir / "run-manifest.json"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    predictions_path = source_run_dir / "predictions.parquet"
    metrics_path = source_run_dir / "metrics.parquet"
    predictions_checksum = sha256_file(predictions_path)
    metrics_checksum = sha256_file(metrics_path)
    expected_checksums = source_manifest.get("output_checksums", {})
    if expected_checksums.get("predictions") not in {None, predictions_checksum}:
        raise ValueError("source predictions checksum does not match source run manifest")
    if expected_checksums.get("metrics") not in {None, metrics_checksum}:
        raise ValueError("source metrics checksum does not match source run manifest")

    predictions = pd.read_parquet(predictions_path)
    metrics = pd.read_parquet(metrics_path)
    outputs, selection = write_reporting_outputs(metrics, predictions, output_dir)
    counts = predictions["status"].value_counts().to_dict()
    output_checksums = {
        key: sha256_file(Path(path)) for key, path in sorted(outputs.items())
    }
    report_manifest: dict[str, Any] = {
        "schema_version": "2.0",
        "report_id": output_dir.name,
        "source_run_id": source_manifest.get("run_id", source_run_dir.name),
        "source_run_path": str(source_run_dir),
        "generated_at_utc": utc_now_iso(),
        "reporting_source_fingerprint": source_tree_fingerprint(Path(__file__).resolve().parent),
        "source_run_manifest_checksum": sha256_file(source_manifest_path),
        "source_predictions_checksum": predictions_checksum,
        "source_metrics_checksum": metrics_checksum,
        "source_checksums_verified": True,
        "total_predictions": len(predictions),
        "total_successful": int(counts.get("SUCCESS", 0)),
        "total_skipped": int(counts.get("SKIPPED", 0)),
        "total_failed": int(counts.get("FAILED", 0)),
        "models": sorted(predictions["model_key"].astype(str).unique()),
        "tracks": sorted(predictions["track"].astype(str).unique()),
        "random_seeds": sorted(int(value) for value in predictions["random_seed"].unique()),
        "reporting_phases": [phase.value for phase in ReportingPhase],
        "output_checksums": output_checksums,
        "phase_champions": selection["phase_champions"],
        "common_cohort_champions": selection["common_cohort_champions"],
        "product_routing_recommendations": selection["product_routing_recommendations"],
        "top_four": [item["model_key"] for item in selection["top_four_portfolio"]],
    }
    manifest_path = output_dir / "report-manifest.json"
    manifest_path.write_text(
        json.dumps(report_manifest, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    return report_manifest
