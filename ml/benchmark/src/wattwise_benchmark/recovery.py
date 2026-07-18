from __future__ import annotations

import csv
import hashlib
import json
import os
import subprocess
import sys
import time
import uuid
from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
import torch
from catboost import CatBoostRegressor
from lightning.pytorch import Trainer
from pytorch_forecasting import DeepAR, NBeats, TimeSeriesDataSet
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from wattwise_benchmark.config import BenchmarkConfig, sha256_file, stable_json
from wattwise_benchmark.evaluation.metrics import aggregate_metrics
from wattwise_benchmark.execution import (
    MODEL_KEYS,
    MODEL_VERSIONS,
    _result_record,
    _run_deterministic,
)
from wattwise_benchmark.features import build_examples, feature_manifest_fingerprint
from wattwise_benchmark.models.base import eligibility_reason, eligible_rows, feature_frame
from wattwise_benchmark.models.catboost_model import CatBoostAdapter
from wattwise_benchmark.models.deep_data import sequence_frame
from wattwise_benchmark.models.deep_models import DeepForecastAdapter
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

RECOVERY_TYPE = "INFERENCE_FROM_EXISTING_ARTIFACTS"
TRAINING_SOURCE_FINGERPRINT = (
    "004795e2eeac44e5f57d0c6d6fe4d9b1ca97037a39ba6a10699b876f0aff7ec7"
)
EXPECTED_CONFIGURATION_CHECKSUM = (
    "43d58dc5e6a785618cbe86beb63c86010254e338435027d2ef335a8f7485d5a5"
)
EXPECTED_NORMALIZED_FINGERPRINT = (
    "335c79e97a0c649b3d523a7e21efe5539e9fd737c2c7e72148483d33ce12a08e"
)
EXPECTED_DATASET_CHECKSUMS = {
    "combined": "9c4a13d30f5019780bcbcde2742a75bfbff0fde3e23ff9813c0d36034cd32cae",
    "bdg2": "1129fe64ff324e5a217c90f2195e56b67e67d87c294229578d5c99de861ca1cf",
    "uci_eld": "795772fa37a66e76e111daa640cda308b2e4dabcd029b1e733d6a4030f6eab67",
}
EXPECTED_SPLIT_COUNTS = {
    "seen_train": 54_099,
    "seen_validation": 14_169,
    "seen_test": 14_898,
    "unseen_train": 37_727,
    "unseen_validation": 2_144,
    "unseen_test": 2_250,
}
EXPECTED_TOTAL_PREDICTIONS = 325_812
EXPECTED_DEEPAR = {
    "total": 51_444,
    "eligible": 28_500,
    "successful": 28_500,
    "skipped": 22_944,
    "failed": 0,
}
TRACKS = ("seen_entity", "unseen_entity")
SEEDS = (17, 29, 43)
ARTIFACT_EXTENSIONS = {
    "ridge": ".joblib",
    "gradient_boosting": ".joblib",
    "catboost": ".cbm",
    "lightgbm": ".joblib",
    "nbeats": ".ckpt",
    "deepar": ".ckpt",
}
EXPECTED_MODEL_ROWS = {
    "deterministic_baseline": 17_148,
    **{model: 51_444 for model in ARTIFACT_EXTENSIONS},
}
REQUIRED_PREDICTION_COLUMNS = {
    "example_id",
    "dataset_source",
    "entity_id",
    "target_period",
    "target_usage_kwh",
    "history_values",
    "history_month_count",
    "product_phase",
    "reporting_phase",
    "initial_subgroup",
    "example_variant",
    "track",
    "fold",
    "model_key",
    "model_version",
    "eligible",
    "ineligibility_reason",
    "status",
    "failure_reason",
    "prediction_kwh",
    "lower_80",
    "upper_80",
    "lower_95",
    "upper_95",
    "random_seed",
    "artifact_checksum",
}
INFERENCE_FILE_CHECKSUMS = {
    "contracts.py": "88a2416ade4147ddb067bf84bebb0e788b3cae9d91ed75ab08095d8e8727b2af",
    "execution.py": "df3c375afa4ec0a49f522027361436952dd715af5d83d654b8c13e1bb1e23274",
    "ingestion/common.py": (
        "d7929b77bc4829760c79a1c7adb64d3434691af6145128acb7864a8afd9fcb07"
    ),
    "models/base.py": "d425857a612261b1614604184114b2a4fb69abb362f2712136a7092e3168849c",
    "models/sklearn_models.py": (
        "3d9c133b1835a15d06fba42f816f60ae783772e2c1b36cdcb7f5d41375e68b96"
    ),
    "models/catboost_model.py": (
        "adf2aa0ff00d27687bf911d93de429cf81c2e7cffd1a120cbfbbdafa7b1eb994"
    ),
    "models/lightgbm_model.py": (
        "97f4e7763213a12bc5ba31b10a8ca7dc5d439cd186bf428c3add30d71ed64a4e"
    ),
    "models/deep_data.py": (
        "c7872dad99eecad6f9e390ec047c31c25ecb17db33dc1fa2493df4cbc43649cf"
    ),
    "models/deep_models.py": (
        "4715a8babe2ec2441ddabaed80ae95c874b7558ea5e7b9024d9a25c3bb2e7252"
    ),
    "models/deterministic.py": (
        "3f77fd5e307ec3bb83c65dde71068078e71d5112969a2f0e3a5a5697956d801f"
    ),
    "models/__init__.py": (
        "87b4c61b69e1b61853ea6de901712a2d58d4d095ee38777f756d303a06f81df3"
    ),
    "features/build.py": (
        "679a5bf3611935ad503095d179525350ee09a2ec32777a40d9981f009d56ae59"
    ),
    "features/__init__.py": (
        "6b2402ee9a406c39f1b83f40f34d776c32c780012e94067071492a117742433b"
    ),
    "splits/rolling.py": (
        "0c2b608d9776c8ec4abecc79cd63b97f1d1a4fe8f50a864b69486b4a9afa60d6"
    ),
    "splits/__init__.py": (
        "186beb4c251782385d0ab9ff953d2dd66017d1e2f6e920eae764670f9cf7014c"
    ),
    "pipeline.py": "4dd1fbd870314c9188e65a4cd9834b4dc3a04cc0150beb783efdd48632731f41",
    "config.py": "380ebf60f27ffc6f0df445ed3946e9b8271d3194b29f0ae9abc42ceff23dd74d",
}


class RecoveryValidationError(RuntimeError):
    pass


class TrainingOperationBlocked(RuntimeError):
    pass


@dataclass(frozen=True)
class ArtifactSpec:
    track: str
    model_key: str
    seed: int
    path: Path

    @property
    def relative_path(self) -> str:
        return f"{self.track}/{self.model_key}/{self.path.name}"


def expected_artifacts(artifact_root: Path) -> list[ArtifactSpec]:
    return [
        ArtifactSpec(
            track=track,
            model_key=model_key,
            seed=seed,
            path=artifact_root / track / model_key / f"{seed}{extension}",
        )
        for track in TRACKS
        for model_key, extension in ARTIFACT_EXTENSIONS.items()
        for seed in SEEDS
    ]


def _utc_from_timestamp(value: float) -> str:
    return datetime.fromtimestamp(value, tz=UTC).isoformat().replace("+00:00", "Z")


def _read_checksum_report(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        expected_columns = {
            "RelativePath",
            "SourceBytes",
            "DestinationBytes",
            "SourceSHA256",
            "DestinationSHA256",
            "HashMatches",
        }
        if set(reader.fieldnames or []) != expected_columns:
            raise RecoveryValidationError(
                f"artifact checksum report columns differ: {reader.fieldnames}"
            )
        return list(reader)


def validate_artifact_matrix(
    artifact_root: Path,
    checksum_report: Path,
) -> list[dict[str, Any]]:
    specs = expected_artifacts(artifact_root)
    rows = _read_checksum_report(checksum_report)
    if len(rows) != 36:
        raise RecoveryValidationError(f"expected 36 checksum rows, found {len(rows)}")
    report = {str(row["RelativePath"]).replace("\\", "/"): row for row in rows}
    if len(report) != 36:
        raise RecoveryValidationError("artifact checksum report has duplicate relative paths")
    actual = {path.resolve() for path in artifact_root.rglob("*") if path.is_file()}
    expected = {spec.path.resolve() for spec in specs}
    missing = sorted(str(path) for path in expected - actual)
    unexpected = sorted(str(path) for path in actual - expected)
    if missing or unexpected:
        raise RecoveryValidationError(
            f"artifact matrix differs; missing={missing}; unexpected={unexpected}"
        )

    inventory: list[dict[str, Any]] = []
    for spec in specs:
        row = report.get(spec.relative_path)
        if row is None:
            raise RecoveryValidationError(f"checksum row missing for {spec.relative_path}")
        stat = spec.path.stat()
        if stat.st_size <= 0:
            raise RecoveryValidationError(f"zero-length artifact: {spec.path}")
        checksum = sha256_file(spec.path)
        source_hash = row["SourceSHA256"].casefold()
        destination_hash = row["DestinationSHA256"].casefold()
        source_size = int(row["SourceBytes"])
        destination_size = int(row["DestinationBytes"])
        hash_matches = row["HashMatches"].strip().casefold() == "true"
        if not (
            hash_matches
            and source_hash == destination_hash == checksum
            and source_size == destination_size == stat.st_size
        ):
            raise RecoveryValidationError(f"artifact checksum mismatch: {spec.path}")
        inventory.append(
            {
                "track": spec.track,
                "model_key": spec.model_key,
                "random_seed": spec.seed,
                "path": str(spec.path),
                "relative_path": spec.relative_path,
                "size_bytes": stat.st_size,
                "last_write_time_utc": _utc_from_timestamp(stat.st_mtime),
                "sha256": checksum,
            }
        )
    return inventory


def verify_inference_source(package_root: Path) -> dict[str, str]:
    actual: dict[str, str] = {}
    conflicts: list[str] = []
    for relative, expected in INFERENCE_FILE_CHECKSUMS.items():
        checksum = sha256_file(package_root / relative)
        actual[relative] = checksum
        if checksum != expected:
            conflicts.append(f"{relative}: expected {expected}, found {checksum}")
    if conflicts:
        raise RecoveryValidationError(
            "artifact-compatible inference source conflict: " + "; ".join(conflicts)
        )
    return actual


def _files_fingerprint(paths: list[Path], root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _training_blocker(audit: dict[str, Any], name: str) -> Callable[..., None]:
    def blocked(*args: Any, **kwargs: Any) -> None:
        del args, kwargs
        audit["blocked_attempts"].append(name)
        raise TrainingOperationBlocked(f"training operation blocked: {name}")

    return blocked


def _guarded_module_train(
    audit: dict[str, Any],
    original: Callable[..., Any],
) -> Callable[..., Any]:
    def guarded(module: torch.nn.Module, mode: bool = True) -> Any:
        if mode:
            audit["blocked_attempts"].append("torch.nn.Module.train(True)")
            raise TrainingOperationBlocked(
                "training operation blocked: torch.nn.Module.train(True)"
            )
        audit["train_false_calls"] += 1
        return original(module, False)

    return guarded


@contextmanager
def prohibit_training() -> Iterator[dict[str, Any]]:
    audit: dict[str, Any] = {"blocked_attempts": [], "train_false_calls": 0}
    targets = [
        (SklearnAdapter, "fit", "SklearnAdapter.fit"),
        (CatBoostAdapter, "fit", "CatBoostAdapter.fit"),
        (LightGBMAdapter, "fit", "LightGBMAdapter.fit"),
        (DeepForecastAdapter, "fit", "DeepForecastAdapter.fit"),
        (Pipeline, "fit", "Pipeline.fit"),
        (ColumnTransformer, "fit", "ColumnTransformer.fit"),
        (CatBoostRegressor, "fit", "CatBoostRegressor.fit"),
        (lgb.LGBMRegressor, "fit", "LGBMRegressor.fit"),
        (lgb, "train", "lightgbm.train"),
        (Trainer, "fit", "Trainer.fit"),
        (torch.optim.Optimizer, "step", "Optimizer.step"),
    ]
    partial_fit_targets = [
        (Pipeline, "partial_fit", "Pipeline.partial_fit"),
        (ColumnTransformer, "partial_fit", "ColumnTransformer.partial_fit"),
    ]
    original_module_train = torch.nn.Module.train
    with ExitStack() as stack:
        for owner, attribute, name in targets:
            stack.enter_context(patch.object(owner, attribute, _training_blocker(audit, name)))
        for owner, attribute, name in partial_fit_targets:
            stack.enter_context(
                patch.object(
                    owner,
                    attribute,
                    _training_blocker(audit, name),
                    create=True,
                )
            )
        stack.enter_context(
            patch.object(
                torch.nn.Module,
                "train",
                _guarded_module_train(audit, original_module_train),
            )
        )
        yield audit
    if audit["blocked_attempts"]:
        raise TrainingOperationBlocked(
            f"training attempts occurred: {audit['blocked_attempts']}"
        )


def _deep_compatibility(model_key: str, model: NBeats | DeepAR) -> dict[str, Any]:
    parameters = model.dataset_parameters
    normalizer = parameters["target_normalizer"]
    transformation = getattr(normalizer, "transformation", None)
    expected_transformation = "softplus" if model_key == "nbeats" else None
    expected_encoder = 6 if model_key == "nbeats" else 12
    loss_type = type(model.loss).__name__
    expected_loss = "MAE" if model_key == "nbeats" else "NormalDistributionLoss"
    if transformation != expected_transformation:
        raise RecoveryValidationError(
            f"{model_key} checkpoint normalizer mismatch: {transformation!r}"
        )
    if int(parameters["max_encoder_length"]) != expected_encoder:
        raise RecoveryValidationError(f"{model_key} checkpoint encoder length mismatch")
    if loss_type != expected_loss:
        raise RecoveryValidationError(f"{model_key} checkpoint loss mismatch: {loss_type}")
    return {
        "loaded_type": f"{type(model).__module__}.{type(model).__name__}",
        "normalizer_type": type(normalizer).__name__,
        "normalizer_transformation": transformation,
        "max_encoder_length": int(parameters["max_encoder_length"]),
        "min_encoder_length": int(parameters["min_encoder_length"]),
        "loss_type": loss_type,
        "dataset_parameter_keys": sorted(parameters),
    }


def load_artifact(model_key: str, path: Path) -> tuple[Any, dict[str, Any]]:
    if model_key in {"ridge", "gradient_boosting"}:
        value = joblib.load(path)
        if not isinstance(value, Pipeline):
            raise RecoveryValidationError(f"unexpected {model_key} artifact type: {type(value)}")
        return value, {
            "loader": "joblib.load",
            "loaded_type": f"{type(value).__module__}.{type(value).__name__}",
            "pipeline_steps": list(value.named_steps),
            "feature_count": int(value.named_steps["preprocess"].get_feature_names_out().size),
        }
    if model_key == "lightgbm":
        value = joblib.load(path)
        if not isinstance(value, dict) or set(value) != {"preprocessor", "model"}:
            raise RecoveryValidationError("unexpected LightGBM artifact structure")
        return value, {
            "loader": "joblib.load",
            "loaded_type": "builtins.dict",
            "preprocessor_type": type(value["preprocessor"]).__name__,
            "model_type": type(value["model"]).__name__,
            "feature_count": int(value["preprocessor"].get_feature_names_out().size),
        }
    if model_key == "catboost":
        value = CatBoostRegressor()
        value.load_model(path)
        return value, {
            "loader": "CatBoostRegressor.load_model",
            "loaded_type": f"{type(value).__module__}.{type(value).__name__}",
            "feature_count": len(value.feature_names_),
            "tree_count": int(value.tree_count_),
        }
    model_class = NBeats if model_key == "nbeats" else DeepAR
    value = model_class.load_from_checkpoint(path, map_location="cpu")
    value.eval()
    metadata = _deep_compatibility(model_key, value)
    metadata["loader"] = f"{model_class.__name__}.load_from_checkpoint"
    return value, metadata


def _predict_deep(
    model_key: str,
    model: NBeats | DeepAR,
    examples: pd.DataFrame,
) -> pd.DataFrame:
    frame = sequence_frame(examples, model_key)
    dataset = TimeSeriesDataSet.from_parameters(
        model.dataset_parameters,
        frame,
        predict=True,
        stop_randomization=True,
    )
    kwargs = {
        "data": dataset,
        "return_index": True,
        "batch_size": 128,
        "num_workers": 0,
        "trainer_kwargs": {
            "accelerator": "cpu",
            "devices": 1,
            "logger": False,
            "enable_progress_bar": False,
        },
    }
    with torch.inference_mode():
        if model_key == "deepar":
            prediction = model.predict(
                mode="quantiles",
                mode_kwargs={"quantiles": [0.025, 0.10, 0.50, 0.90, 0.975]},
                **kwargs,
            )
            values = prediction.output.detach().cpu().numpy()[:, 0, :]
            return pd.DataFrame(
                {
                    "example_id": prediction.index["series_key"].astype(str),
                    "prediction_kwh": np.maximum(0.0, values[:, 2]),
                    "lower_80": np.maximum(0.0, values[:, 1]),
                    "upper_80": np.maximum(0.0, values[:, 3]),
                    "lower_95": np.maximum(0.0, values[:, 0]),
                    "upper_95": np.maximum(0.0, values[:, 4]),
                }
            )
        prediction = model.predict(mode="prediction", **kwargs)
        values = prediction.output.detach().cpu().numpy().reshape(-1)
        return pd.DataFrame(
            {
                "example_id": prediction.index["series_key"].astype(str),
                "prediction_kwh": np.maximum(0.0, values),
                "lower_80": np.nan,
                "upper_80": np.nan,
                "lower_95": np.nan,
                "upper_95": np.nan,
            }
        )


def predict_loaded_artifact(
    model_key: str,
    value: Any,
    examples: pd.DataFrame,
) -> pd.DataFrame:
    if model_key in {"ridge", "gradient_boosting"}:
        predictions = np.maximum(0.0, value.predict(feature_frame(examples)))
    elif model_key == "catboost":
        predictions = np.maximum(0.0, value.predict(feature_frame(examples)))
    elif model_key == "lightgbm":
        transformed = value["preprocessor"].transform(feature_frame(examples))
        predictions = np.maximum(0.0, value["model"].predict(transformed))
    else:
        return _predict_deep(model_key, value, examples)
    return pd.DataFrame(
        {
            "example_id": examples["example_id"].astype(str).to_numpy(),
            "prediction_kwh": predictions,
            "lower_80": np.nan,
            "upper_80": np.nan,
            "lower_95": np.nan,
            "upper_95": np.nan,
        }
    )


def _run_loaded_unit(
    spec: ArtifactSpec,
    test: pd.DataFrame,
    inventory: dict[str, dict[str, Any]],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    artifact = inventory[spec.relative_path]
    monitor = PeakMemoryMonitor()
    with monitor:
        loaded, loader_metadata = load_artifact(spec.model_key, spec.path)
        eligible = test.loc[eligible_rows(spec.model_key, test)].copy()
        started = time.perf_counter()
        predicted = predict_loaded_artifact(spec.model_key, loaded, eligible)
        elapsed = time.perf_counter() - started
    if predicted["example_id"].duplicated().any():
        raise RecoveryValidationError(f"duplicate recovered predictions: {spec.relative_path}")
    expected_ids = set(eligible["example_id"].astype(str))
    actual_ids = set(predicted["example_id"].astype(str))
    if expected_ids != actual_ids:
        raise RecoveryValidationError(
            f"prediction identity mismatch for {spec.relative_path}: "
            f"missing={len(expected_ids - actual_ids)}, unexpected={len(actual_ids - expected_ids)}"
        )
    prediction_map = predicted.set_index("example_id").to_dict(orient="index")
    inference_ms = elapsed * 1000.0 / len(eligible) if len(eligible) else 0.0
    rows: list[dict[str, Any]] = []
    for _, row in test.iterrows():
        reason = eligibility_reason(spec.model_key, row)
        recovered = prediction_map.get(str(row["example_id"]))
        if reason is None and recovered is None:
            raise RecoveryValidationError(
                f"eligible prediction missing for {spec.relative_path}: {row['example_id']}"
            )
        if reason is not None and recovered is not None:
            raise RecoveryValidationError(
                f"ineligible prediction emitted for {spec.relative_path}: {row['example_id']}"
            )
        values = recovered or {
            "prediction_kwh": np.nan,
            "lower_80": np.nan,
            "upper_80": np.nan,
            "lower_95": np.nan,
            "upper_95": np.nan,
        }
        clean = {
            key: None if not np.isfinite(float(number)) else float(number)
            for key, number in values.items()
        }
        rows.append(
            _result_record(
                row,
                model_key=spec.model_key,
                model_version=MODEL_VERSIONS[spec.model_key],
                seed=spec.seed,
                status="SKIPPED" if reason else "SUCCESS",
                ineligibility=reason,
                failure=None,
                prediction=clean["prediction_kwh"],
                lower_80=clean["lower_80"],
                upper_80=clean["upper_80"],
                lower_95=clean["lower_95"],
                upper_95=clean["upper_95"],
                training_duration=0.0,
                inference_ms=inference_ms,
                peak_memory_mb=monitor.peak_bytes / (1024.0 * 1024.0),
                artifact_size=int(artifact["size_bytes"]),
                artifact_fingerprint=f"sha256:{artifact['sha256']}",
                artifact_checksum=str(artifact["sha256"]),
            )
        )
    loader_metadata.update(
        {
            "track": spec.track,
            "model_key": spec.model_key,
            "random_seed": spec.seed,
            "path": str(spec.path),
            "eligible_predictions": len(eligible),
            "training_operation_invoked": False,
        }
    )
    return pd.DataFrame(rows), loader_metadata


def _example_fingerprint(seen: pd.DataFrame, unseen: pd.DataFrame) -> str:
    rows: list[dict[str, Any]] = []
    columns = [
        "example_id",
        "dataset_source",
        "entity_id",
        "target_period",
        "target_usage_kwh",
        "history_values",
        "history_month_count",
        "product_phase",
        "initial_subgroup",
        "example_variant",
        "fold",
        "track",
    ]
    for frame in (seen, unseen):
        test = frame.loc[frame["fold"].eq("test"), columns]
        for row in test.sort_values(["track", "example_id"]).to_dict(orient="records"):
            row["target_period"] = pd.Timestamp(row["target_period"]).isoformat()
            rows.append(row)
    return hashlib.sha256(stable_json(rows).encode()).hexdigest()


def reconstruct_evaluation_sets(
    data_root: Path,
    config: BenchmarkConfig,
) -> tuple[dict[str, pd.DataFrame], dict[str, Any]]:
    normalized = load_normalized(data_root)
    manifest = normalized["manifest"]
    if manifest.get("normalization_fingerprint") != EXPECTED_NORMALIZED_FINGERPRINT:
        raise RecoveryValidationError("normalized-data fingerprint mismatch")
    combined_entry = manifest["combined"]
    if combined_entry["parquet_sha256"] != EXPECTED_DATASET_CHECKSUMS["combined"]:
        raise RecoveryValidationError("combined normalized checksum manifest mismatch")
    if sha256_file(Path(combined_entry["parquet"])) != EXPECTED_DATASET_CHECKSUMS["combined"]:
        raise RecoveryValidationError("combined normalized Parquet checksum mismatch")
    for key in ("bdg2", "uci_eld"):
        entry = manifest["datasets"][key]
        if entry["parquet_sha256"] != EXPECTED_DATASET_CHECKSUMS[key]:
            raise RecoveryValidationError(f"{key} normalized checksum manifest mismatch")
        if sha256_file(Path(entry["parquet"])) != EXPECTED_DATASET_CHECKSUMS[key]:
            raise RecoveryValidationError(f"{key} normalized Parquet checksum mismatch")

    examples = build_examples(normalized["combined_panel"])
    entity_split = make_entity_split(examples, config.entity_seed)
    seen = assign_seen_entity_track(examples)
    unseen = assign_unseen_entity_track(examples, entity_split)
    counts = {
        "seen_train": int(seen["fold"].eq("train").sum()),
        "seen_validation": int(seen["fold"].eq("validation").sum()),
        "seen_test": int(seen["fold"].eq("test").sum()),
        "unseen_train": int(unseen["fold"].eq("train").sum()),
        "unseen_validation": int(unseen["fold"].eq("validation").sum()),
        "unseen_test": int(unseen["fold"].eq("test").sum()),
    }
    if counts != EXPECTED_SPLIT_COUNTS:
        raise RecoveryValidationError(f"reconstructed split counts differ: {counts}")
    return {"seen_entity": seen, "unseen_entity": unseen}, {
        "normalized_manifest": manifest,
        "quality_audit": normalized["quality_audit"],
        "split_counts": counts,
        "example_fingerprint": _example_fingerprint(seen, unseen),
        "feature_manifest_fingerprint": feature_manifest_fingerprint(),
    }


def validate_predictions(predictions: pd.DataFrame) -> dict[str, Any]:
    missing_columns = sorted(REQUIRED_PREDICTION_COLUMNS - set(predictions.columns))
    if missing_columns:
        raise RecoveryValidationError(f"prediction columns missing: {missing_columns}")
    if len(predictions) != EXPECTED_TOTAL_PREDICTIONS:
        raise RecoveryValidationError(
            f"prediction row count differs: {len(predictions)} != {EXPECTED_TOTAL_PREDICTIONS}"
        )
    statuses = predictions["status"].value_counts().to_dict()
    if int(statuses.get("FAILED", 0)) != 0:
        raise RecoveryValidationError(f"recovered predictions contain failures: {statuses}")
    if int(sum(statuses.values())) != len(predictions):
        raise RecoveryValidationError("prediction statuses do not reconcile")
    successful = predictions.loc[predictions["status"].eq("SUCCESS")]
    if not np.isfinite(successful["prediction_kwh"].to_numpy(dtype=float)).all():
        raise RecoveryValidationError("successful point predictions are non-finite")
    if (successful["prediction_kwh"] < 0).any():
        raise RecoveryValidationError("successful point predictions are negative")
    if not np.isfinite(predictions["target_usage_kwh"].to_numpy(dtype=float)).all():
        raise RecoveryValidationError("ground truth is non-finite")

    model_rows = predictions.groupby("model_key").size().to_dict()
    if model_rows != EXPECTED_MODEL_ROWS:
        raise RecoveryValidationError(f"model row reconciliation differs: {model_rows}")
    if set(predictions["model_key"].unique()) != set(MODEL_KEYS):
        raise RecoveryValidationError("seven-model key set differs")
    if set(predictions["track"].unique()) != set(TRACKS):
        raise RecoveryValidationError("track set differs")

    deepar = predictions.loc[predictions["model_key"].eq("deepar")]
    deepar_counts = {
        "total": len(deepar),
        "eligible": int(deepar["eligible"].sum()),
        "successful": int(deepar["status"].eq("SUCCESS").sum()),
        "skipped": int(deepar["status"].eq("SKIPPED").sum()),
        "failed": int(deepar["status"].eq("FAILED").sum()),
    }
    if deepar_counts != EXPECTED_DEEPAR:
        raise RecoveryValidationError(f"DeepAR accounting differs: {deepar_counts}")
    deep_success = deepar.loc[deepar["status"].eq("SUCCESS")]
    interval_columns = ["lower_80", "upper_80", "lower_95", "upper_95"]
    if not np.isfinite(deep_success[interval_columns].to_numpy(dtype=float)).all():
        raise RecoveryValidationError("DeepAR intervals are non-finite")
    if (deep_success["lower_80"] > deep_success["upper_80"]).any():
        raise RecoveryValidationError("DeepAR 80% intervals are inverted")
    if (deep_success["lower_95"] > deep_success["upper_95"]).any():
        raise RecoveryValidationError("DeepAR 95% intervals are inverted")
    success_phases = set(deep_success["product_phase"].unique())
    if success_phases != {"H06_12", "H13_PLUS"}:
        raise RecoveryValidationError(f"DeepAR successful phase set differs: {success_phases}")
    skipped_phases = set(deepar.loc[deepar["status"].eq("SKIPPED"), "product_phase"].unique())
    if skipped_phases != {"H00_02", "H03_05"}:
        raise RecoveryValidationError(f"DeepAR skipped phase set differs: {skipped_phases}")

    duplicate_key = ["example_id", "track", "model_key", "random_seed"]
    if predictions.duplicated(duplicate_key).any():
        raise RecoveryValidationError("prediction unit keys are duplicated")
    reconciliation = {
        "total": len(predictions),
        "successful": int(predictions["status"].eq("SUCCESS").sum()),
        "skipped": int(predictions["status"].eq("SKIPPED").sum()),
        "failed": int(predictions["status"].eq("FAILED").sum()),
        "model_rows": model_rows,
        "deepar": deepar_counts,
    }
    if reconciliation["total"] != (
        reconciliation["successful"] + reconciliation["skipped"] + reconciliation["failed"]
    ):
        raise RecoveryValidationError("overall accounting does not reconcile")
    return reconciliation


def validate_parquet_file(
    path: Path,
    *,
    expected_rows: int,
    required_columns: set[str],
) -> dict[str, Any]:
    stat = path.stat()
    if stat.st_size < 8:
        raise RecoveryValidationError(f"Parquet file is too short: {path}")
    with path.open("rb") as handle:
        header = handle.read(4)
        handle.seek(-4, os.SEEK_END)
        footer = handle.read(4)
    if header != b"PAR1":
        raise RecoveryValidationError(f"Parquet header magic is invalid: {path}")
    if footer != b"PAR1":
        raise RecoveryValidationError(f"Parquet footer magic is invalid: {path}")
    parquet = pq.ParquetFile(path, memory_map=False)
    try:
        # ``ParquetSchema.names`` contains leaf names, so list-valued fields
        # such as ``history_values`` appear only as ``element``. Validate the
        # logical, top-level Arrow schema that callers write and consume.
        columns = set(parquet.schema_arrow.names)
        row_count = parquet.metadata.num_rows
        row_group_count = parquet.metadata.num_row_groups
        if row_count != expected_rows:
            raise RecoveryValidationError(
                f"Parquet row count differs: {row_count} != {expected_rows}"
            )
        missing = sorted(required_columns - columns)
        if missing:
            raise RecoveryValidationError(f"Parquet schema columns missing: {missing}")
    finally:
        parquet.close()
    return {
        "path": str(path),
        "size_bytes": stat.st_size,
        "row_count": row_count,
        "row_group_count": row_group_count,
        "columns": sorted(columns),
        "sha256": sha256_file(path),
    }


def _bounded_parquet_footer_validation(
    path: Path,
    timeout_seconds: float = 15.0,
) -> dict[str, Any]:
    probe = """
import json
import sys

import pyarrow.parquet as pq

path = sys.argv[1]
try:
    parquet = pq.ParquetFile(path, memory_map=False)
    try:
        result = {
            "valid": True,
            "row_count": parquet.metadata.num_rows,
            "row_group_count": parquet.metadata.num_row_groups,
            "columns": list(parquet.schema_arrow.names),
        }
    finally:
        parquet.close()
except Exception as error:
    result = {
        "valid": False,
        "error_type": type(error).__name__,
        "error": str(error),
    }
print(json.dumps(result, sort_keys=True))
"""
    try:
        completed = subprocess.run(
            [sys.executable, "-c", probe, str(path)],
            capture_output=True,
            check=False,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        return {
            "valid": False,
            "timed_out": True,
            "timeout_seconds": timeout_seconds,
            "error_type": type(error).__name__,
            "error": f"PyArrow footer validation exceeded {timeout_seconds:.1f} seconds",
        }
    stdout = completed.stdout.strip().splitlines()
    if completed.returncode != 0 or not stdout:
        return {
            "valid": False,
            "timed_out": False,
            "return_code": completed.returncode,
            "error_type": "FooterProbeProcessError",
            "error": completed.stderr.strip() or "footer probe produced no result",
        }
    try:
        result = json.loads(stdout[-1])
    except json.JSONDecodeError as error:
        return {
            "valid": False,
            "timed_out": False,
            "return_code": completed.returncode,
            "error_type": type(error).__name__,
            "error": f"invalid footer probe output: {error}",
        }
    result["timed_out"] = False
    result["return_code"] = completed.returncode
    return result


def inspect_original_predictions(
    original_run: Path,
    *,
    timeout_seconds: float = 15.0,
) -> dict[str, Any]:
    path = original_run / "predictions.parquet"
    if not path.is_file():
        raise RecoveryValidationError(f"original predictions file is missing: {path}")
    stat = path.stat()
    if stat.st_size < 8:
        raise RecoveryValidationError(
            f"original predictions file is too short to be Parquet: {path}"
        )
    with path.open("rb") as handle:
        header = handle.read(4)
        handle.seek(-4, os.SEEK_END)
        footer = handle.read(4)
    footer_validation = _bounded_parquet_footer_validation(
        path,
        timeout_seconds=timeout_seconds,
    )
    if footer_validation.get("timed_out"):
        raise RecoveryValidationError(
            "original predictions footer validation timed out; refusing recovery: "
            f"{path}"
        )
    if footer_validation.get("return_code") != 0:
        raise RecoveryValidationError(
            "original predictions footer probe did not complete successfully; "
            f"refusing recovery: {path}; {footer_validation.get('error')}"
        )
    if header != b"PAR1":
        raise RecoveryValidationError(
            "original predictions do not have a valid Parquet header; "
            f"expected a truncated Parquet recovery source: {path}"
        )
    if footer == b"PAR1":
        raise RecoveryValidationError(
            "original predictions contain Parquet footer magic; expected the supplied "
            f"recovery source to have a missing footer: {path}"
        )
    if footer_validation.get("valid"):
        raise RecoveryValidationError(
            "original predictions are valid Parquet; artifact recovery is only allowed "
            f"for a truncated file with missing footer magic: {path}"
        )
    diagnosis = "TRUNCATED_PARQUET_MISSING_FOOTER_MAGIC"
    return {
        "path": str(path),
        "original_run_id": original_run.name,
        "exists": True,
        "size_bytes": stat.st_size,
        "sha256": sha256_file(path),
        "header_magic": header.decode("ascii", errors="replace"),
        "header_magic_hex": header.hex(),
        "header_magic_valid": True,
        "footer_magic": footer.decode("ascii", errors="replace"),
        "footer_magic_hex": footer.hex(),
        "footer_magic_valid": False,
        "pyarrow_footer_validation": footer_validation,
        "diagnosis": diagnosis,
        "modified": False,
    }


def write_parquet_atomic(
    frame: pd.DataFrame,
    destination: Path,
    *,
    required_columns: set[str],
    writer: Callable[[pd.DataFrame, Path], None] | None = None,
) -> dict[str, Any]:
    if destination.exists():
        raise RecoveryValidationError(f"refusing to overwrite {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{uuid.uuid4().hex}.tmp")
    try:
        if writer is None:
            frame.to_parquet(temporary, index=False, compression="zstd")
        else:
            writer(frame, temporary)
        metadata = validate_parquet_file(
            temporary,
            expected_rows=len(frame),
            required_columns=required_columns,
        )
        os.replace(temporary, destination)
        promoted = validate_parquet_file(
            destination,
            expected_rows=len(frame),
            required_columns=required_columns,
        )
        promoted["temporary_validation_sha256"] = metadata["sha256"]
        return promoted
    finally:
        if temporary.exists():
            temporary.unlink()


def _write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(
            json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
            encoding="utf-8",
        )
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def recover_inference(
    *,
    data_root: Path,
    repo_root: Path,
    artifact_root: Path,
    checksum_report: Path,
    output_dir: Path,
    original_run: Path,
    config: BenchmarkConfig,
) -> dict[str, Any]:
    started = utc_now_iso()
    if output_dir.exists():
        raise RecoveryValidationError(f"recovery output already exists: {output_dir}")
    if output_dir.resolve() in {artifact_root.resolve(), original_run.resolve()}:
        raise RecoveryValidationError("recovery output overlaps an immutable input")
    config.validate()
    if config.stage != "full" or config.fingerprint() != EXPECTED_CONFIGURATION_CHECKSUM:
        raise RecoveryValidationError("full benchmark configuration checksum mismatch")
    original_predictions_evidence = inspect_original_predictions(original_run)
    package_root = Path(__file__).resolve().parent
    inference_compatibility = verify_inference_source(package_root)
    artifact_inventory = validate_artifact_matrix(artifact_root, checksum_report)
    inventory = {row["relative_path"]: row for row in artifact_inventory}
    tracks, reconstruction = reconstruct_evaluation_sets(data_root, config)

    prediction_frames: list[pd.DataFrame] = []
    loader_audit: list[dict[str, Any]] = []
    with prohibit_training() as training_audit:
        for track in TRACKS:
            test = tracks[track].loc[tracks[track]["fold"].eq("test")].copy()
            deterministic = _run_deterministic(test)
            deterministic["track"] = track
            deterministic["fold"] = "test"
            prediction_frames.append(deterministic)
            for model_key, extension in ARTIFACT_EXTENSIONS.items():
                for seed in SEEDS:
                    spec = ArtifactSpec(
                        track=track,
                        model_key=model_key,
                        seed=seed,
                        path=artifact_root / track / model_key / f"{seed}{extension}",
                    )
                    print(f"[recovery] inference {spec.relative_path}", flush=True)
                    recovered, metadata = _run_loaded_unit(spec, test, inventory)
                    recovered["track"] = track
                    recovered["fold"] = "test"
                    prediction_frames.append(recovered)
                    loader_audit.append(metadata)
        if training_audit["blocked_attempts"]:
            raise TrainingOperationBlocked(
                f"training attempts occurred: {training_audit['blocked_attempts']}"
            )

    predictions = pd.concat(prediction_frames, ignore_index=True)
    reconciliation = validate_predictions(predictions)
    output_dir.mkdir(parents=True, exist_ok=False)
    predictions_path = output_dir / "predictions.parquet"
    prediction_file = write_parquet_atomic(
        predictions,
        predictions_path,
        required_columns=REQUIRED_PREDICTION_COLUMNS,
    )

    metrics = aggregate_metrics(predictions)
    valid_metric_rows = metrics.loc[metrics["evaluation_count"].gt(0)]
    metric_columns = ["mae", "rmse", "wmape", "smape", "median_absolute_error"]
    if not np.isfinite(valid_metric_rows[metric_columns].to_numpy(dtype=float)).all():
        raise RecoveryValidationError("valid metric rows contain NaN or infinity")
    metrics_path = output_dir / "metrics.parquet"
    metrics_file = write_parquet_atomic(
        metrics,
        metrics_path,
        required_columns=set(metrics.columns),
    )

    report_outputs, selection = write_reporting_outputs(metrics, predictions, output_dir)
    output_paths = {
        "predictions": predictions_path,
        "metrics": metrics_path,
        **{key: Path(path) for key, path in report_outputs.items()},
    }
    output_checksums = {key: sha256_file(path) for key, path in sorted(output_paths.items())}

    normalized_manifest = reconstruction["normalized_manifest"]
    reporting_paths = [
        package_root / "contracts.py",
        package_root / "evaluation" / "metrics.py",
        package_root / "reporting.py",
        package_root / "selection.py",
    ]
    manifest: dict[str, Any] = {
        "schema_version": "2.0",
        "run_id": output_dir.name,
        "stage": "full",
        "recovery_type": RECOVERY_TYPE,
        "original_run_path": str(original_run),
        "recovered_artifact_path": str(artifact_root),
        "artifact_checksum_report_path": str(checksum_report),
        "artifacts": artifact_inventory,
        "artifact_count": len(artifact_inventory),
        "damaged_predictions": original_predictions_evidence,
        "training_source_fingerprint": TRAINING_SOURCE_FINGERPRINT,
        "recovery_inference_source_fingerprint": source_tree_fingerprint(package_root),
        "reporting_source_fingerprint": _files_fingerprint(reporting_paths, package_root),
        "inference_compatibility_file_checksums": inference_compatibility,
        "configuration_checksum": config.fingerprint(),
        "normalized_data_fingerprint": EXPECTED_NORMALIZED_FINGERPRINT,
        "normalized_data_checksums": EXPECTED_DATASET_CHECKSUMS,
        "dependency_lock_checksum": sha256_file(package_root.parent.parent / "requirements.lock"),
        "pyproject_checksum": sha256_file(package_root.parent.parent / "pyproject.toml"),
        "python_version": sys.version,
        "hardware": hardware_summary(),
        "models": list(MODEL_KEYS),
        "model_versions": MODEL_VERSIONS,
        "tracks": list(TRACKS),
        "random_seeds": list(SEEDS),
        "recovery_utc_start": started,
        "recovery_utc_end": utc_now_iso(),
        "split_counts": reconstruction["split_counts"],
        "evaluation_example_fingerprint": reconstruction["example_fingerprint"],
        "feature_manifest_fingerprint": reconstruction["feature_manifest_fingerprint"],
        "total_predictions": reconciliation["total"],
        "total_successful": reconciliation["successful"],
        "total_skipped": reconciliation["skipped"],
        "total_failed": reconciliation["failed"],
        "reconciliation": reconciliation,
        "loader_audit": loader_audit,
        "parameter_updating_training_operation_invoked": False,
        "fit_or_optimizer_operation_invoked": False,
        "training_operation_invoked": False,
        "training_operation_blocked_attempts": list(training_audit["blocked_attempts"]),
        "inference_mode_train_false_calls": int(training_audit["train_false_calls"]),
        "inference_mode_note": (
            "torch.nn.Module.train(False) may be invoked by eval() to enter inference "
            "mode; train(True), fit, partial_fit, Trainer.fit, and optimizer.step are blocked"
        ),
        "ground_truth_modified": False,
        "prediction_nonnegative_postprocessing": (
            "max(0, forecast) applied only to emitted forecasts and DeepAR quantiles"
        ),
        "prediction_parquet_validation": prediction_file,
        "metrics_parquet_validation": metrics_file,
        "output_checksums": output_checksums,
        "phase_champions": selection.get("phase_champions", {}),
        "common_cohort_champions": selection.get("common_cohort_champions", {}),
        "product_routing_recommendations": selection.get(
            "product_routing_recommendations", {}
        ),
        "top_four": [item["model_key"] for item in selection["top_four_portfolio"]],
        "quality_audit": reconstruction["quality_audit"],
        "normalized_manifest_generated_at": normalized_manifest.get("generated_at_utc"),
    }
    manifest_path = output_dir / "run-manifest.json"
    _write_json_atomic(manifest_path, manifest)
    return {
        "run_manifest": manifest,
        "run_manifest_path": manifest_path,
        "predictions": predictions,
        "metrics": metrics,
        "selection": selection,
    }
