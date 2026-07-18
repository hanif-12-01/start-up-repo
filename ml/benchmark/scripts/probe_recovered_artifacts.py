"""Validate and load recovered benchmark artifacts without training."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import traceback
from contextlib import ExitStack
from pathlib import Path
from typing import Any
from unittest.mock import patch

import joblib
import lightgbm as lgb
import torch
from catboost import CatBoostRegressor
from lightning.pytorch import Trainer
from pytorch_forecasting import DeepAR, NBeats
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

ARTIFACT_EXTENSIONS = {
    "ridge": ".joblib",
    "gradient_boosting": ".joblib",
    "catboost": ".cbm",
    "lightgbm": ".joblib",
    "nbeats": ".ckpt",
    "deepar": ".ckpt",
}
TRACKS = ("seen_entity", "unseen_entity")
SEEDS = (17, 29, 43)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _expected_paths(root: Path) -> list[Path]:
    return [
        root / track / model / f"{seed}{extension}"
        for track in TRACKS
        for model, extension in ARTIFACT_EXTENSIONS.items()
        for seed in SEEDS
    ]


def _load_report(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def _blocked_training(*args: Any, **kwargs: Any) -> None:
    del args, kwargs
    raise RuntimeError("TRAINING_OPERATION_BLOCKED")


def _metadata(value: Any) -> dict[str, Any]:
    result: dict[str, Any] = {"loaded_type": f"{type(value).__module__}.{type(value).__name__}"}
    if isinstance(value, Pipeline):
        result["pipeline_steps"] = list(value.named_steps)
        result["feature_count"] = int(value.named_steps["preprocess"].get_feature_names_out().size)
    elif isinstance(value, dict) and {"preprocessor", "model"}.issubset(value):
        result["members"] = sorted(value)
        result["preprocessor_type"] = type(value["preprocessor"]).__name__
        result["model_type"] = type(value["model"]).__name__
        result["feature_count"] = int(value["preprocessor"].get_feature_names_out().size)
    elif isinstance(value, CatBoostRegressor):
        result["tree_count"] = int(value.tree_count_)
        result["feature_count"] = len(value.feature_names_)
    elif isinstance(value, NBeats | DeepAR):
        result["state_dict_entries"] = len(value.state_dict())
        result["dataset_parameter_keys"] = sorted(value.dataset_parameters)
        result["loss_type"] = type(value.loss).__name__
    return result


def _load_sample(model: str, path: Path) -> tuple[str, Any]:
    if model in {"ridge", "gradient_boosting", "lightgbm"}:
        return "joblib.load", joblib.load(path)
    if model == "catboost":
        value = CatBoostRegressor()
        value.load_model(path)
        return "CatBoostRegressor.load_model", value
    model_class = NBeats if model == "nbeats" else DeepAR
    return f"{model_class.__name__}.load_from_checkpoint", model_class.load_from_checkpoint(
        path,
        map_location="cpu",
    )


def probe(artifact_root: Path, checksum_report: Path) -> dict[str, Any]:
    expected = _expected_paths(artifact_root)
    report_columns, report_rows = _load_report(checksum_report)
    actual = sorted(path for path in artifact_root.rglob("*") if path.is_file())
    expected_set = {path.resolve() for path in expected}
    actual_set = {path.resolve() for path in actual}
    report_by_path = {
        str(row["RelativePath"]).replace("\\", "/"): row for row in report_rows
    }
    artifact_rows = []
    for path in expected:
        stat = path.stat()
        relative_path = path.relative_to(artifact_root).as_posix()
        checksum = _sha256(path)
        report_row = report_by_path.get(relative_path)
        artifact_rows.append(
            {
                "path": str(path),
                "relative_path": relative_path,
                "size": stat.st_size,
                "last_write_time_ns": stat.st_mtime_ns,
                "sha256": checksum,
                "report_size_matches": bool(
                    report_row
                    and int(report_row["DestinationBytes"]) == stat.st_size
                ),
                "report_sha256_matches": bool(
                    report_row
                    and report_row["DestinationSHA256"].casefold() == checksum
                ),
            }
        )

    hash_column = next(
        (column for column in report_columns if column.casefold() == "hashmatches"),
        None,
    )
    report_hash_matches = (
        sum(str(row[hash_column]).strip().casefold() == "true" for row in report_rows)
        if hash_column
        else None
    )
    matrix_valid = (
        len(expected) == 36
        and expected_set == actual_set
        and all(row["size"] > 0 for row in artifact_rows)
        and all(row["report_size_matches"] for row in artifact_rows)
        and all(row["report_sha256_matches"] for row in artifact_rows)
        and len(report_rows) == 36
        and report_hash_matches == 36
    )

    training_guard_triggered = False
    loaders: list[dict[str, Any]] = []
    with ExitStack() as stack:
        stack.enter_context(patch.object(Pipeline, "fit", _blocked_training))
        stack.enter_context(patch.object(ColumnTransformer, "fit", _blocked_training))
        stack.enter_context(patch.object(CatBoostRegressor, "fit", _blocked_training))
        stack.enter_context(patch.object(lgb.LGBMRegressor, "fit", _blocked_training))
        stack.enter_context(patch.object(Trainer, "fit", _blocked_training))
        stack.enter_context(patch.object(torch.optim.Optimizer, "step", _blocked_training))
        for model, extension in ARTIFACT_EXTENSIONS.items():
            path = artifact_root / "seen_entity" / model / f"17{extension}"
            entry: dict[str, Any] = {
                "model": model,
                "path": str(path),
                "training_invoked": False,
            }
            try:
                loader, value = _load_sample(model, path)
                entry.update({"loader": loader, "status": "OK", **_metadata(value)})
            except RuntimeError as error:
                if str(error) == "TRAINING_OPERATION_BLOCKED":
                    training_guard_triggered = True
                    entry["training_invoked"] = True
                entry.update(
                    {
                        "status": "ERROR",
                        "error": f"{type(error).__name__}: {error}",
                        "traceback": traceback.format_exc(),
                    }
                )
            except Exception as error:
                entry.update(
                    {
                        "status": "ERROR",
                        "error": f"{type(error).__name__}: {error}",
                        "traceback": traceback.format_exc(),
                    }
                )
            loaders.append(entry)

    return {
        "artifact_root": str(artifact_root),
        "checksum_report": str(checksum_report),
        "report_columns": report_columns,
        "report_rows": len(report_rows),
        "report_hash_matches": report_hash_matches,
        "expected_artifacts": len(expected),
        "actual_artifacts": len(actual),
        "unexpected_artifacts": sorted(str(path) for path in actual_set - expected_set),
        "missing_artifacts": sorted(str(path) for path in expected_set - actual_set),
        "matrix_valid": matrix_valid,
        "artifacts": artifact_rows,
        "training_guard_triggered": training_guard_triggered,
        "loaders": loaders,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", type=Path, required=True)
    parser.add_argument("--checksum-report", type=Path, required=True)
    args = parser.parse_args()
    result = probe(args.artifact_root.resolve(), args.checksum_report.resolve())
    print(json.dumps(result, indent=2, sort_keys=True, default=str))
    if not result["matrix_valid"] or any(item["status"] != "OK" for item in result["loaders"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
