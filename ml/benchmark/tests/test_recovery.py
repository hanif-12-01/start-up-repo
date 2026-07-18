from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import numpy as np
import pandas as pd
import pytest
import torch
from sklearn.pipeline import Pipeline

from wattwise_benchmark import execution, recovery


def _write_matrix(root: Path, report: Path) -> list[recovery.ArtifactSpec]:
    specs = recovery.expected_artifacts(root)
    rows = []
    for index, spec in enumerate(specs, start=1):
        spec.path.parent.mkdir(parents=True, exist_ok=True)
        content = f"artifact-{index}".encode()
        spec.path.write_bytes(content)
        checksum = hashlib.sha256(content).hexdigest()
        rows.append(
            {
                "RelativePath": spec.relative_path,
                "SourceBytes": len(content),
                "DestinationBytes": len(content),
                "SourceSHA256": checksum,
                "DestinationSHA256": checksum,
                "HashMatches": "True",
            }
        )
    with report.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return specs


def _evaluation_example(
    example_id: str,
    track: str,
    *,
    entity_id: str | None = None,
    product_phase: str = "H13_PLUS",
    history_count: int = 13,
    fold: str = "test",
) -> dict[str, Any]:
    history = [float(index + 1) for index in range(history_count)]
    return {
        "example_id": example_id,
        "dataset_source": "test",
        "entity_id": entity_id or f"entity-{example_id}",
        "target_period": pd.Timestamp("2026-01-01"),
        "target_usage_kwh": 20.0,
        "history_values": history,
        "history_month_count": history_count,
        "product_phase": product_phase,
        "initial_subgroup": None,
        "example_variant": "canonical",
        "track": track,
        "fold": fold,
        "profile_eligible": True,
    }


def _prediction_row(
    model_key: str,
    example_id: str,
    track: str,
    *,
    random_seed: int,
    product_phase: str = "H13_PLUS",
    reporting_phase: str = "H13_PLUS",
    history_count: int = 13,
    status: str = "SUCCESS",
) -> dict[str, Any]:
    row = _evaluation_example(
        example_id,
        track,
        product_phase=product_phase,
        history_count=history_count,
    )
    successful = status == "SUCCESS"
    row.update(
        {
            "reporting_phase": reporting_phase,
            "model_key": model_key,
            "model_version": "test",
            "eligible": successful,
            "ineligibility_reason": None if successful else "MINIMUM_CONTEXT_6_MONTHS",
            "status": status,
            "failure_reason": None,
            "prediction_kwh": 20.0 if successful else np.nan,
            "lower_80": 18.0 if successful and model_key == "deepar" else np.nan,
            "upper_80": 22.0 if successful and model_key == "deepar" else np.nan,
            "lower_95": 16.0 if successful and model_key == "deepar" else np.nan,
            "upper_95": 24.0 if successful and model_key == "deepar" else np.nan,
            "random_seed": random_seed,
            "artifact_checksum": None,
        }
    )
    return row


def test_exact_36_artifact_matrix_validation(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    report = tmp_path / "artifact-checksums.csv"
    _write_matrix(root, report)
    inventory = recovery.validate_artifact_matrix(root, report)
    assert len(inventory) == 36
    assert all(row["size_bytes"] > 0 for row in inventory)
    assert {row["model_key"] for row in inventory} == set(recovery.ARTIFACT_EXTENSIONS)


def test_artifact_checksum_mismatch_is_rejected(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    report = tmp_path / "artifact-checksums.csv"
    specs = _write_matrix(root, report)
    specs[0].path.write_bytes(b"changed")
    with pytest.raises(recovery.RecoveryValidationError, match="checksum mismatch"):
        recovery.validate_artifact_matrix(root, report)


def test_missing_artifact_is_rejected(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    report = tmp_path / "artifact-checksums.csv"
    specs = _write_matrix(root, report)
    specs[0].path.unlink()
    with pytest.raises(recovery.RecoveryValidationError, match="artifact matrix differs"):
        recovery.validate_artifact_matrix(root, report)


def test_zero_length_artifact_is_rejected(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    report = tmp_path / "artifact-checksums.csv"
    specs = _write_matrix(root, report)
    specs[0].path.write_bytes(b"")
    with pytest.raises(recovery.RecoveryValidationError, match="zero-length"):
        recovery.validate_artifact_matrix(root, report)


def test_training_guard_blocks_fit_and_optimizer_step() -> None:
    with pytest.raises(recovery.TrainingOperationBlocked, match="SklearnAdapter.fit"):
        with recovery.prohibit_training():
            recovery.SklearnAdapter("ridge", 17).fit(pd.DataFrame(), pd.DataFrame())
    with pytest.raises(recovery.TrainingOperationBlocked, match="Optimizer.step"):
        with recovery.prohibit_training():
            optimizer = object.__new__(torch.optim.Optimizer)
            optimizer.step()
    with pytest.raises(recovery.TrainingOperationBlocked, match="Pipeline.partial_fit"):
        with recovery.prohibit_training():
            Pipeline([]).partial_fit(pd.DataFrame())


def test_training_guard_allows_no_training_path() -> None:
    with recovery.prohibit_training() as audit:
        assert audit["blocked_attempts"] == []


def test_training_guard_blocks_train_true_and_records_train_false() -> None:
    module = torch.nn.Linear(1, 1)
    with recovery.prohibit_training() as audit:
        module.train(False)
        assert audit["train_false_calls"] >= 1
        assert module.training is False

    with pytest.raises(
        recovery.TrainingOperationBlocked,
        match=r"Module\.train\(True\)",
    ):
        with recovery.prohibit_training():
            module.train(True)


def test_execution_source_is_in_inference_compatibility_gate() -> None:
    package_root = Path(recovery.__file__).resolve().parent
    assert {"contracts.py", "execution.py", "ingestion/common.py"}.issubset(
        recovery.INFERENCE_FILE_CHECKSUMS
    )
    for relative in ("contracts.py", "execution.py", "ingestion/common.py"):
        expected = recovery.INFERENCE_FILE_CHECKSUMS[relative]
        assert recovery.sha256_file(package_root / relative) == expected


def test_valid_original_predictions_are_rejected(tmp_path: Path) -> None:
    original_run = tmp_path / "valid-original"
    original_run.mkdir()
    pd.DataFrame({"value": [1]}).to_parquet(
        original_run / "predictions.parquet",
        index=False,
    )
    with pytest.raises(recovery.RecoveryValidationError, match="footer magic"):
        recovery.inspect_original_predictions(original_run)


def test_truncated_original_predictions_are_inspected_from_bytes(tmp_path: Path) -> None:
    original_run = tmp_path / "truncated-original"
    original_run.mkdir()
    path = original_run / "predictions.parquet"
    path.write_bytes(b"PAR1truncated")

    evidence = recovery.inspect_original_predictions(original_run)

    assert evidence["original_run_id"] == "truncated-original"
    assert evidence["size_bytes"] == path.stat().st_size
    assert evidence["sha256"] == recovery.sha256_file(path)
    assert evidence["header_magic"] == "PAR1"
    assert evidence["footer_magic_valid"] is False
    assert evidence["pyarrow_footer_validation"]["valid"] is False
    assert evidence["diagnosis"] == "TRUNCATED_PARQUET_MISSING_FOOTER_MAGIC"


def test_missing_original_predictions_are_rejected(tmp_path: Path) -> None:
    original_run = tmp_path / "missing-original"
    original_run.mkdir()
    with pytest.raises(recovery.RecoveryValidationError, match="file is missing"):
        recovery.inspect_original_predictions(original_run)


def test_different_original_run_id_uses_its_own_evidence(tmp_path: Path) -> None:
    original_run = tmp_path / "different-original-run-id"
    original_run.mkdir()
    path = original_run / "predictions.parquet"
    path.write_bytes(b"PAR1different-truncated-content")

    evidence = recovery.inspect_original_predictions(original_run)

    assert evidence["original_run_id"] == "different-original-run-id"
    assert evidence["path"] == str(path)
    assert evidence["sha256"] == recovery.sha256_file(path)


def test_reconstruct_evaluation_sets_preserves_counts_and_order(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    combined_path = tmp_path / "combined.parquet"
    bdg2_path = tmp_path / "bdg2.parquet"
    uci_path = tmp_path / "uci.parquet"
    checksums = {
        combined_path: recovery.EXPECTED_DATASET_CHECKSUMS["combined"],
        bdg2_path: recovery.EXPECTED_DATASET_CHECKSUMS["bdg2"],
        uci_path: recovery.EXPECTED_DATASET_CHECKSUMS["uci_eld"],
    }
    manifest = {
        "normalization_fingerprint": recovery.EXPECTED_NORMALIZED_FINGERPRINT,
        "combined": {
            "parquet": str(combined_path),
            "parquet_sha256": checksums[combined_path],
        },
        "datasets": {
            "bdg2": {
                "parquet": str(bdg2_path),
                "parquet_sha256": checksums[bdg2_path],
            },
            "uci_eld": {
                "parquet": str(uci_path),
                "parquet_sha256": checksums[uci_path],
            },
        },
    }
    seen = pd.DataFrame(
        [
            _evaluation_example("seen-train", "seen_entity", fold="train"),
            _evaluation_example("seen-validation", "seen_entity", fold="validation"),
            _evaluation_example("seen-z", "seen_entity", entity_id="entity-z"),
            _evaluation_example("seen-a", "seen_entity", entity_id="entity-a"),
        ]
    )
    unseen = pd.DataFrame(
        [
            _evaluation_example("unseen-train", "unseen_entity", fold="train"),
            _evaluation_example(
                "unseen-validation",
                "unseen_entity",
                fold="validation",
            ),
            _evaluation_example("unseen-z", "unseen_entity", entity_id="entity-z"),
            _evaluation_example("unseen-a", "unseen_entity", entity_id="entity-a"),
        ]
    )
    monkeypatch.setattr(
        recovery,
        "load_normalized",
        lambda data_root: {
            "manifest": manifest,
            "combined_panel": pd.DataFrame(),
            "quality_audit": {"status": "synthetic"},
        },
    )
    monkeypatch.setattr(recovery, "sha256_file", lambda path: checksums[Path(path)])
    monkeypatch.setattr(recovery, "build_examples", lambda panel: pd.DataFrame())
    monkeypatch.setattr(recovery, "make_entity_split", lambda examples, seed: pd.DataFrame())
    monkeypatch.setattr(recovery, "assign_seen_entity_track", lambda examples: seen.copy())
    monkeypatch.setattr(
        recovery,
        "assign_unseen_entity_track",
        lambda examples, split: unseen.copy(),
    )
    monkeypatch.setattr(
        recovery,
        "EXPECTED_SPLIT_COUNTS",
        {
            "seen_train": 1,
            "seen_validation": 1,
            "seen_test": 2,
            "unseen_train": 1,
            "unseen_validation": 1,
            "unseen_test": 2,
        },
    )
    monkeypatch.setattr(recovery, "feature_manifest_fingerprint", lambda: "features")

    first, first_audit = recovery.reconstruct_evaluation_sets(
        tmp_path,
        recovery.BenchmarkConfig(stage="full"),
    )
    second, second_audit = recovery.reconstruct_evaluation_sets(
        tmp_path,
        recovery.BenchmarkConfig(stage="full"),
    )

    assert first_audit["split_counts"] == recovery.EXPECTED_SPLIT_COUNTS
    assert first_audit["example_fingerprint"] == second_audit["example_fingerprint"]
    assert first["seen_entity"]["example_id"].tolist() == [
        "seen-train",
        "seen-validation",
        "seen-z",
        "seen-a",
    ]
    assert second["unseen_entity"]["entity_id"].tolist() == [
        "entity-unseen-train",
        "entity-unseen-validation",
        "entity-z",
        "entity-a",
    ]


def test_deterministic_recovery_uses_original_implementation() -> None:
    examples = pd.DataFrame(
        [
            _evaluation_example("seen-one", "seen_entity", history_count=1),
            _evaluation_example("seen-many", "seen_entity", history_count=13),
        ]
    )
    assert recovery._run_deterministic is execution._run_deterministic

    original = execution._run_deterministic(examples)
    recovered = recovery._run_deterministic(examples)
    stable_columns = [
        column
        for column in original.columns
        if column != "inference_duration_ms"
    ]
    pd.testing.assert_frame_equal(
        original[stable_columns],
        recovered[stable_columns],
    )


def test_validate_predictions_reconciles_synthetic_seven_model_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rows = [
        _prediction_row("deterministic_baseline", "baseline", "seen_entity", random_seed=0),
        _prediction_row("ridge", "ridge", "unseen_entity", random_seed=17),
        _prediction_row("gradient_boosting", "gb", "seen_entity", random_seed=17),
        _prediction_row("catboost", "cat", "unseen_entity", random_seed=17),
        _prediction_row("lightgbm", "lgbm", "seen_entity", random_seed=17),
        _prediction_row("nbeats", "nbeats", "unseen_entity", random_seed=17),
        _prediction_row(
            "deepar",
            "deep-h00",
            "seen_entity",
            random_seed=17,
            product_phase="H00_02",
            reporting_phase="H00",
            history_count=0,
            status="SKIPPED",
        ),
        _prediction_row(
            "deepar",
            "deep-h03",
            "seen_entity",
            random_seed=17,
            product_phase="H03_05",
            reporting_phase="H03_05",
            history_count=3,
            status="SKIPPED",
        ),
        _prediction_row(
            "deepar",
            "deep-h06",
            "seen_entity",
            random_seed=17,
            product_phase="H06_12",
            reporting_phase="H06_12",
            history_count=6,
        ),
        _prediction_row(
            "deepar",
            "deep-h13",
            "unseen_entity",
            random_seed=17,
        ),
    ]
    predictions = pd.DataFrame(rows)
    monkeypatch.setattr(recovery, "EXPECTED_TOTAL_PREDICTIONS", len(predictions))
    monkeypatch.setattr(
        recovery,
        "EXPECTED_MODEL_ROWS",
        predictions.groupby("model_key").size().to_dict(),
    )
    monkeypatch.setattr(
        recovery,
        "EXPECTED_DEEPAR",
        {"total": 4, "eligible": 2, "successful": 2, "skipped": 2, "failed": 0},
    )

    reconciliation = recovery.validate_predictions(predictions)

    assert reconciliation["total"] == len(predictions)
    assert reconciliation["successful"] == 8
    assert reconciliation["skipped"] == 2
    assert reconciliation["failed"] == 0

    invalid = predictions.copy()
    invalid.loc[invalid["model_key"].eq("ridge"), "prediction_kwh"] = -1.0
    with pytest.raises(recovery.RecoveryValidationError, match="negative"):
        recovery.validate_predictions(invalid)


def test_artifact_recovery_writes_reports_and_is_repeatable(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    phase_examples = [
        ("h00", "H00_02", 0),
        ("h03", "H03_05", 3),
        ("h06", "H06_12", 6),
        ("h13", "H13_PLUS", 13),
    ]
    tracks = {
        track: pd.DataFrame(
            [
                _evaluation_example(
                    f"{track}-{suffix}",
                    track,
                    product_phase=phase,
                    history_count=history,
                )
                for suffix, phase, history in phase_examples
            ]
        )
        for track in recovery.TRACKS
    }
    artifact_root = tmp_path / "artifacts"
    inventory = []
    for index, spec in enumerate(recovery.expected_artifacts(artifact_root), start=1):
        inventory.append(
            {
                "track": spec.track,
                "model_key": spec.model_key,
                "random_seed": spec.seed,
                "path": str(spec.path),
                "relative_path": spec.relative_path,
                "size_bytes": index,
                "last_write_time_utc": "2026-07-18T00:00:00Z",
                "sha256": f"{index:064x}",
            }
        )

    def fake_loaded_unit(
        spec: recovery.ArtifactSpec,
        test: pd.DataFrame,
        artifact_inventory: dict[str, dict[str, Any]],
    ) -> tuple[pd.DataFrame, dict[str, Any]]:
        del artifact_inventory
        rows = []
        for _, row in test.iterrows():
            reason = recovery.eligibility_reason(spec.model_key, row)
            successful = reason is None
            deep = spec.model_key == "deepar" and successful
            rows.append(
                recovery._result_record(
                    row,
                    model_key=spec.model_key,
                    model_version="test",
                    seed=spec.seed,
                    status="SUCCESS" if successful else "SKIPPED",
                    ineligibility=reason,
                    failure=None,
                    prediction=20.0 if successful else None,
                    lower_80=18.0 if deep else None,
                    upper_80=22.0 if deep else None,
                    lower_95=16.0 if deep else None,
                    upper_95=24.0 if deep else None,
                    training_duration=0.0,
                    inference_ms=0.1,
                    peak_memory_mb=0.0,
                    artifact_size=1,
                    artifact_fingerprint="synthetic",
                    artifact_checksum="0" * 64,
                )
            )
        return pd.DataFrame(rows), {
            "track": spec.track,
            "model_key": spec.model_key,
            "random_seed": spec.seed,
            "loader": "synthetic-test-loader",
            "training_operation_invoked": False,
        }

    monkeypatch.setattr(recovery, "verify_inference_source", lambda package_root: {})
    monkeypatch.setattr(
        recovery,
        "validate_artifact_matrix",
        lambda root, report: inventory,
    )
    monkeypatch.setattr(
        recovery,
        "inspect_original_predictions",
        lambda original_run: {
            "path": str(original_run / "predictions.parquet"),
            "original_run_id": original_run.name,
            "diagnosis": "TRUNCATED_PARQUET_MISSING_FOOTER_MAGIC",
            "modified": False,
        },
    )
    monkeypatch.setattr(
        recovery,
        "reconstruct_evaluation_sets",
        lambda data_root, config: (
            {key: value.copy() for key, value in tracks.items()},
            {
                "normalized_manifest": {"generated_at_utc": "2026-07-17T00:00:00Z"},
                "quality_audit": {"status": "synthetic"},
                "split_counts": {"synthetic": 8},
                "example_fingerprint": "synthetic-examples",
                "feature_manifest_fingerprint": "synthetic-features",
            },
        ),
    )
    monkeypatch.setattr(recovery, "_run_loaded_unit", fake_loaded_unit)
    monkeypatch.setattr(recovery, "EXPECTED_TOTAL_PREDICTIONS", 152)
    monkeypatch.setattr(
        recovery,
        "EXPECTED_MODEL_ROWS",
        {
            "deterministic_baseline": 8,
            **{model: 24 for model in recovery.ARTIFACT_EXTENSIONS},
        },
    )
    monkeypatch.setattr(
        recovery,
        "EXPECTED_DEEPAR",
        {
            "total": 24,
            "eligible": 12,
            "successful": 12,
            "skipped": 12,
            "failed": 0,
        },
    )

    common = {
        "data_root": tmp_path / "data",
        "repo_root": tmp_path,
        "artifact_root": artifact_root,
        "checksum_report": tmp_path / "artifact-checksums.csv",
        "original_run": tmp_path / "original-run",
        "config": recovery.BenchmarkConfig(stage="full"),
    }
    first = recovery.recover_inference(
        **common,
        output_dir=tmp_path / "recovered-01",
    )
    second = recovery.recover_inference(
        **common,
        output_dir=tmp_path / "recovered-02",
    )

    expected_outputs = {
        "predictions.parquet",
        "metrics.parquet",
        "model-eligibility.csv",
        "model-leaderboard.csv",
        "phase-leaderboard.csv",
        "paired-comparisons.csv",
        "top-four-recommendation.json",
        "run-manifest.json",
    }
    assert expected_outputs == {
        path.name for path in (tmp_path / "recovered-01").iterdir()
    }
    assert first["run_manifest"]["training_operation_invoked"] is False
    assert first["run_manifest"]["fit_or_optimizer_operation_invoked"] is False
    assert first["run_manifest"]["top_four"][0] == "deterministic_baseline"
    assert set(first["run_manifest"]["output_checksums"]) == {
        "predictions",
        "metrics",
        "model_eligibility",
        "model_leaderboard",
        "phase_leaderboard",
        "paired_comparisons",
        "top_four_recommendation",
    }
    stable_columns = [
        column
        for column in first["predictions"].columns
        if column != "inference_duration_ms"
    ]
    first_predictions = first["predictions"].sort_values(
        ["model_key", "track", "random_seed", "example_id"]
    )
    second_predictions = second["predictions"].sort_values(
        ["model_key", "track", "random_seed", "example_id"]
    )
    pd.testing.assert_frame_equal(
        first_predictions[stable_columns].reset_index(drop=True),
        second_predictions[stable_columns].reset_index(drop=True),
    )


class _FakePreprocessor:
    def get_feature_names_out(self) -> np.ndarray:
        return np.asarray(["one", "two"])

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        return np.ones((len(frame), 2))


class _FakeEstimator:
    def predict(self, frame: Any) -> np.ndarray:
        return np.arange(len(frame), dtype=float) - 1.0


def test_joblib_loader_for_sklearn_families(monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline = Pipeline([("preprocess", _FakePreprocessor()), ("model", _FakeEstimator())])
    monkeypatch.setattr(recovery.joblib, "load", lambda path: pipeline)
    for model in ("ridge", "gradient_boosting"):
        loaded, metadata = recovery.load_artifact(model, Path(f"{model}.joblib"))
        assert loaded is pipeline
        assert metadata["loader"] == "joblib.load"
        assert metadata["feature_count"] == 2


def test_lightgbm_loader(monkeypatch: pytest.MonkeyPatch) -> None:
    artifact = {"preprocessor": _FakePreprocessor(), "model": _FakeEstimator()}
    monkeypatch.setattr(recovery.joblib, "load", lambda path: artifact)
    loaded, metadata = recovery.load_artifact("lightgbm", Path("lightgbm.joblib"))
    assert loaded is artifact
    assert metadata["preprocessor_type"] == "_FakePreprocessor"


def test_catboost_loader(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeCatBoost:
        def __init__(self) -> None:
            self.feature_names_ = ["a", "b"]
            self.tree_count_ = 3

        def load_model(self, path: Path) -> None:
            self.path = path

    monkeypatch.setattr(recovery, "CatBoostRegressor", FakeCatBoost)
    loaded, metadata = recovery.load_artifact("catboost", Path("catboost.cbm"))
    assert loaded.path == Path("catboost.cbm")
    assert metadata["loader"] == "CatBoostRegressor.load_model"


@pytest.mark.parametrize(
    ("model_key", "model_attribute", "transformation", "encoder", "loss_name"),
    [
        ("nbeats", "NBeats", "softplus", 6, "MAE"),
        ("deepar", "DeepAR", None, 12, "NormalDistributionLoss"),
    ],
)
def test_checkpoint_loaders(
    monkeypatch: pytest.MonkeyPatch,
    model_key: str,
    model_attribute: str,
    transformation: str | None,
    encoder: int,
    loss_name: str,
) -> None:
    normalizer = SimpleNamespace(transformation=transformation)
    loss = type(loss_name, (), {})()

    class FakeModel:
        def __init__(self) -> None:
            self.dataset_parameters = {
                "target_normalizer": normalizer,
                "max_encoder_length": encoder,
                "min_encoder_length": 6,
            }
            self.loss = loss

        @classmethod
        def load_from_checkpoint(cls, path: Path, map_location: str) -> FakeModel:
            assert map_location == "cpu"
            return cls()

        def eval(self) -> FakeModel:
            return self

    monkeypatch.setattr(recovery, model_attribute, FakeModel)
    _, metadata = recovery.load_artifact(model_key, Path(f"{model_key}.ckpt"))
    assert metadata["normalizer_transformation"] == transformation
    assert metadata["loss_type"] == loss_name


def test_repeatable_deterministic_loaded_prediction(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(recovery, "feature_frame", lambda frame: frame[["value"]])
    examples = pd.DataFrame({"example_id": ["a", "b"], "value": [1.0, 2.0]})
    model = _FakeEstimator()
    first = recovery.predict_loaded_artifact("ridge", model, examples)
    second = recovery.predict_loaded_artifact("ridge", model, examples)
    pd.testing.assert_frame_equal(first, second)
    assert first["prediction_kwh"].tolist() == [0.0, 0.0]


def test_deepar_checkpoint_inference_preserves_zero_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    example = pd.DataFrame(
        {
            "example_id": ["zero"],
            "history_month_count": [6],
            "history_values": [[0.0] * 6],
            "target_usage_kwh": [0.0],
            "target_period": [pd.Timestamp("2025-01-01")],
            "dataset_source": ["source"],
            "building_primary_use": ["use"],
            "business_type": ["business"],
            "site": ["site"],
            "timezone": ["UTC"],
            "profile_eligible": [True],
        }
    )
    captured: dict[str, pd.DataFrame] = {}

    def from_parameters(parameters: dict[str, Any], frame: pd.DataFrame, **kwargs: Any) -> object:
        del parameters, kwargs
        captured["frame"] = frame
        return object()

    monkeypatch.setattr(recovery.TimeSeriesDataSet, "from_parameters", from_parameters)

    class FakeDeepAR:
        def __init__(self) -> None:
            self.dataset_parameters: dict[str, Any] = {}

        def predict(self, **kwargs: Any) -> SimpleNamespace:
            del kwargs
            return SimpleNamespace(
                output=torch.tensor([[[0.0, 0.0, 0.0, 0.1, 0.2]]]),
                index=pd.DataFrame({"series_key": ["zero"]}),
            )

    result = recovery._predict_deep("deepar", FakeDeepAR(), example)
    assert captured["frame"]["y"].eq(0.0).all()
    assert np.isfinite(result[["prediction_kwh", "lower_80", "upper_80"]]).all().all()
    assert result.loc[0, "prediction_kwh"] == 0.0


def test_valid_parquet_reopens_and_promotes_atomically(tmp_path: Path) -> None:
    frame = pd.DataFrame(
        {
            "required": [1, 2, 3],
            "history_values": [[0.0], [1.0, 2.0], []],
        }
    )
    destination = tmp_path / "valid.parquet"
    metadata = recovery.write_parquet_atomic(
        frame,
        destination,
        required_columns={"required", "history_values"},
    )
    assert destination.is_file()
    assert metadata["row_count"] == 3
    assert "history_values" in metadata["columns"]
    assert metadata["sha256"] == metadata["temporary_validation_sha256"]


def test_incomplete_parquet_footer_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "truncated.parquet"
    path.write_bytes(b"PAR1truncated")
    with pytest.raises(recovery.RecoveryValidationError, match="footer magic"):
        recovery.validate_parquet_file(path, expected_rows=1, required_columns=set())


def test_invalid_temporary_parquet_is_not_promoted(tmp_path: Path) -> None:
    destination = tmp_path / "never-promoted.parquet"

    def bad_writer(frame: pd.DataFrame, path: Path) -> None:
        del frame
        path.write_bytes(b"PAR1incomplete")

    with pytest.raises(recovery.RecoveryValidationError, match="footer magic"):
        recovery.write_parquet_atomic(
            pd.DataFrame({"required": [1]}),
            destination,
            required_columns={"required"},
            writer=bad_writer,
        )
    assert not destination.exists()
    assert not list(tmp_path.glob("*.tmp"))
