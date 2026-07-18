"""Corrected reporting and immutable regeneration safety tests."""

import json
from pathlib import Path

import pandas as pd
import pytest

from scripts.audit_recovered_run import successful_numeric_checks
from wattwise_benchmark import cli, reporting
from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.reporting import (
    build_eligibility_matrix,
    regenerate_reports,
)


def test_eligibility_matrix_reports_h00_and_h01_02_separately() -> None:
    predictions = pd.DataFrame(
        [
            {
                "model_key": "deterministic_baseline",
                "track": "seen_entity",
                "history_month_count": 0,
                "random_seed": 0,
                "status": "SKIPPED",
                "failure_reason": None,
                "ineligibility_reason": "ZERO_HISTORY_NO_DETERMINISTIC_PATH",
            },
            {
                "model_key": "deterministic_baseline",
                "track": "seen_entity",
                "history_month_count": 1,
                "random_seed": 0,
                "status": "SUCCESS",
                "failure_reason": None,
                "ineligibility_reason": None,
            },
        ]
    )
    result = build_eligibility_matrix(predictions)
    assert set(result["reporting_phase"]) == {"H00", "H01_02"}
    h00 = result.loc[result["reporting_phase"].eq("H00")].iloc[0]
    assert h00["status"] == "SKIPPED"
    assert h00["ineligibility_reason"] == "ZERO_HISTORY_NO_DETERMINISTIC_PATH"


def test_regenerate_reports_refuses_existing_output(tmp_path: Path) -> None:
    source = tmp_path / "source-run"
    output = tmp_path / "existing-report"
    output.mkdir()
    with pytest.raises(FileExistsError, match="already exists"):
        regenerate_reports(source, output)


def test_optional_intervals_ignore_non_applicable_nulls() -> None:
    successful = pd.DataFrame(
        {
            "prediction_kwh": [10.0, 20.0],
            "lower_80": [None, 18.0],
            "upper_80": [None, 22.0],
            "lower_95": [None, 16.0],
            "upper_95": [None, 24.0],
        }
    )
    assert successful_numeric_checks(successful) == {
        "successful_numeric_finite": True,
        "successful_intervals_ordered": True,
    }

    partial = successful.copy()
    partial.loc[0, "lower_80"] = 8.0
    assert successful_numeric_checks(partial) == {
        "successful_numeric_finite": False,
        "successful_intervals_ordered": False,
    }


def test_refresh_cli_does_not_require_data_root(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.delenv("WATTWISE_ML_DATA_ROOT", raising=False)
    monkeypatch.setattr(
        cli,
        "refresh_recovered_reports",
        lambda run_dir: {
            "run_id": run_dir.name,
            "total_predictions": 1,
            "top_four": ["deterministic_baseline"],
        },
    )
    monkeypatch.setattr(
        cli.sys,
        "argv",
        [
            "wattwise-benchmark",
            "refresh-recovery-reports",
            "--run-dir",
            "portable-recovered-run",
        ],
    )

    with pytest.raises(SystemExit) as error:
        cli.main()

    assert error.value.code == 0
    assert "Run ID: portable-recovered-run" in capsys.readouterr().out


def test_refresh_is_per_file_atomic_not_transactional(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run_dir = tmp_path / "recovered-run"
    run_dir.mkdir()
    predictions_path = run_dir / "predictions.parquet"
    metrics_path = run_dir / "metrics.parquet"
    pd.DataFrame({"value": [1]}).to_parquet(predictions_path, index=False)
    pd.DataFrame({"value": [2]}).to_parquet(metrics_path, index=False)
    predictions_checksum = sha256_file(predictions_path)
    metrics_checksum = sha256_file(metrics_path)

    manifest_path = run_dir / "run-manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "run_id": "recovered-run",
                "recovery_type": "INFERENCE_FROM_EXISTING_ARTIFACTS",
                "output_checksums": {
                    "predictions": predictions_checksum,
                    "metrics": metrics_checksum,
                },
            }
        ),
        encoding="utf-8",
    )
    original_manifest = manifest_path.read_bytes()
    (run_dir / "model-leaderboard.csv").write_text(
        "old-model\n",
        encoding="utf-8",
    )
    (run_dir / "phase-leaderboard.csv").write_text(
        "old-phase\n",
        encoding="utf-8",
    )

    def fake_reporting_outputs(
        metrics: pd.DataFrame,
        predictions: pd.DataFrame,
        output_dir: Path,
    ) -> tuple[dict[str, str], dict[str, object]]:
        del metrics, predictions
        model_path = output_dir / "model-leaderboard.csv"
        phase_path = output_dir / "phase-leaderboard.csv"
        pd.DataFrame(
            {
                "model_key": ["deterministic_baseline"],
                "selection_count": [1],
            }
        ).to_csv(model_path, index=False)
        phase_path.write_text("new-phase\n", encoding="utf-8")
        return (
            {
                "model_leaderboard": str(model_path),
                "phase_leaderboard": str(phase_path),
            },
            {
                "top_four_portfolio": [
                    {"model_key": "deterministic_baseline"}
                ],
                "model_leaderboard": [
                    {
                        "model_key": "deterministic_baseline",
                        "selection_count": 1,
                    }
                ],
            },
        )

    monkeypatch.setattr(
        reporting,
        "write_reporting_outputs",
        fake_reporting_outputs,
    )
    original_replace = reporting.os.replace
    replaced: list[str] = []

    def fail_second_replace(
        source: str | Path,
        destination: str | Path,
    ) -> None:
        if Path(source).name == "phase-leaderboard.csv":
            raise OSError("injected report replacement failure")
        original_replace(source, destination)
        replaced.append(Path(destination).name)

    monkeypatch.setattr(reporting.os, "replace", fail_second_replace)

    with pytest.raises(OSError, match="injected report replacement failure"):
        reporting.refresh_recovered_reports(run_dir)

    assert replaced == ["model-leaderboard.csv"]
    assert (run_dir / "model-leaderboard.csv").read_text(
        encoding="utf-8"
    ).startswith("model_key,selection_count")
    assert (run_dir / "phase-leaderboard.csv").read_text(
        encoding="utf-8"
    ) == "old-phase\n"
    assert manifest_path.read_bytes() == original_manifest
    assert sha256_file(predictions_path) == predictions_checksum
    assert sha256_file(metrics_path) == metrics_checksum
