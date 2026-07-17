"""DeepAR-only smoke test after zero-fix.

Run ID: deepar-zero-fix-smoke-01
Seeds: 17, 29, 43
Tracks: seen_entity, unseen_entity
Phases: H06_12, H13_PLUS (must include zero-valued examples)
"""
from __future__ import annotations

import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from wattwise_benchmark.config import BenchmarkConfig, data_root  # noqa: E402
from wattwise_benchmark.execution import (  # noqa: E402
    MODEL_VERSIONS,
    _artifact_path,
    _make_adapter,
    _result_record,
    _smoke_panel,
    _write_json,
)
from wattwise_benchmark.features import build_examples  # noqa: E402
from wattwise_benchmark.models.base import eligibility_reason, eligible_rows  # noqa: E402
from wattwise_benchmark.pipeline import load_normalized  # noqa: E402
from wattwise_benchmark.splits import (  # noqa: E402
    assign_seen_entity_track,
    assign_unseen_entity_track,
    make_entity_split,
)

RUN_ID = "deepar-zero-fix-smoke-01"
SEEDS = (17, 29, 43)
PHASES = ("H06_12", "H13_PLUS")
MODEL_KEY = "deepar"


def main() -> None:
    root = data_root()
    repo_root = Path(__file__).resolve().parent.parent
    run_dir = repo_root / "results" / RUN_ID
    run_dir.mkdir(parents=True, exist_ok=True)

    config = BenchmarkConfig(stage="smoke", model_seeds=SEEDS)
    config.validate()

    print(f"[deepar-smoke] run_id={RUN_ID}")
    print(f"[deepar-smoke] seeds={SEEDS} phases={PHASES}")
    print("[deepar-smoke] loading normalized data...")

    normalized = load_normalized(root)
    combined = normalized["combined_panel"]
    print(f"[deepar-smoke] panel: {len(combined)} entity-months")

    combined = _smoke_panel(combined, config)
    print(f"[deepar-smoke] smoke subset: {len(combined)} entity-months")

    examples = build_examples(combined)
    print(f"[deepar-smoke] examples: {len(examples)}")

    # Check zero-valued examples
    zero_target = (examples["target_usage_kwh"] == 0.0).sum()
    zero_history = examples["history_values"].apply(lambda h: 0.0 in list(h)).sum()
    print(f"[deepar-smoke] zero targets: {zero_target}, zero-in-history: {zero_history}")

    # Filter to target phases
    examples = examples[examples["product_phase"].isin(PHASES)].copy()
    print(f"[deepar-smoke] after phase filter: {len(examples)} examples")

    if examples.empty:
        print("[deepar-smoke] ERROR: no examples in target phases")
        sys.exit(1)

    entity_split = make_entity_split(examples, config.entity_seed)
    seen = assign_seen_entity_track(examples)
    unseen = assign_unseen_entity_track(examples, entity_split)

    all_predictions: list[pd.DataFrame] = []
    stats = {"attempted": 0, "success": 0, "skipped": 0, "failed": 0}

    for track_name, track_data in [("seen_entity", seen), ("unseen_entity", unseen)]:
        train = track_data.loc[track_data["fold"].eq("train")]
        validation = track_data.loc[track_data["fold"].eq("validation")]
        test = track_data.loc[track_data["fold"].eq("test")]
        print(
            f"[deepar-smoke] track={track_name} "
            f"train={len(train)} val={len(validation)} test={len(test)}"
        )

        if test.empty:
            print(f"[deepar-smoke] no test examples for {track_name}, skipping")
            continue

        for seed in SEEDS:
            print(f"[deepar-smoke] running deepar seed={seed} track={track_name}")
            started = time.perf_counter()
            stats["attempted"] += len(test)

            try:
                adapter = _make_adapter(MODEL_KEY, seed, run_dir, track_name, config)
                summary = adapter.fit(train, validation)
                artifact_path = _artifact_path(run_dir, track_name, MODEL_KEY, seed)
                artifact_checksum = adapter.save(artifact_path)

                eligible = test.loc[eligible_rows(MODEL_KEY, test)]
                predict_start = time.perf_counter()
                predicted = adapter.predict_frame(eligible)
                inference_ms = (
                    (time.perf_counter() - predict_start) * 1000.0 / len(eligible)
                    if len(eligible)
                    else 0.0
                )

                predictions_map = {
                    str(row.example_id): {
                        "prediction_kwh": float(row.prediction_kwh),
                        "lower_80": float(row.lower_80),
                        "upper_80": float(row.upper_80),
                        "lower_95": float(row.lower_95),
                        "upper_95": float(row.upper_95),
                    }
                    for row in predicted.itertuples(index=False)
                }

                rows: list[dict] = []
                for _, row in test.iterrows():
                    reason = eligibility_reason(MODEL_KEY, row)
                    value = predictions_map.get(str(row["example_id"]))
                    status = "SKIPPED" if reason else "FAILED" if value is None else "SUCCESS"
                    if value is None:
                        value = {
                            k: np.nan
                            for k in [
                                "prediction_kwh",
                                "lower_80",
                                "upper_80",
                                "lower_95",
                                "upper_95",
                            ]
                        }
                    clean = {
                        k: None if not np.isfinite(v) else float(v) for k, v in value.items()
                    }
                    rows.append(
                        _result_record(
                            row,
                            model_key=MODEL_KEY,
                            model_version=MODEL_VERSIONS[MODEL_KEY],
                            seed=seed,
                            status=status,
                            ineligibility=reason,
                            failure=None,
                            prediction=clean["prediction_kwh"],
                            lower_80=clean["lower_80"],
                            upper_80=clean["upper_80"],
                            lower_95=clean["lower_95"],
                            upper_95=clean["upper_95"],
                            training_duration=float(summary.training_duration),
                            inference_ms=inference_ms,
                            peak_memory_mb=0.0,
                            artifact_size=artifact_path.stat().st_size
                            if artifact_path.is_file()
                            else 0,
                            artifact_fingerprint=str(summary.artifact_fingerprint),
                            artifact_checksum=artifact_checksum,
                        )
                    )

                result_df = pd.DataFrame(rows)
                result_df["track"] = track_name
                result_df["fold"] = "test"
                all_predictions.append(result_df)

                s = result_df["status"].value_counts()
                n_success = int(s.get("SUCCESS", 0))
                n_skipped = int(s.get("SKIPPED", 0))
                n_failed = int(s.get("FAILED", 0))
                stats["success"] += n_success
                stats["skipped"] += n_skipped
                stats["failed"] += n_failed

                elapsed = time.perf_counter() - started
                print(
                    f"[deepar-smoke]   seed={seed}: "
                    f"{n_success} success, {n_skipped} skipped, {n_failed} failed "
                    f"({elapsed:.1f}s)"
                )

                # Verify finite outputs
                for col in ["prediction_kwh", "lower_80", "upper_80", "lower_95", "upper_95"]:
                    successful = result_df[result_df["status"] == "SUCCESS"]
                    vals = successful[col].dropna()
                    if len(vals) > 0:
                        non_finite = (~np.isfinite(vals.astype(float))).sum()
                        if non_finite > 0:
                            print(
                                f"[deepar-smoke]   WARNING: {col} has "
                                f"{non_finite} non-finite values"
                            )

                # Verify nonneg predictions
                successful = result_df[result_df["status"] == "SUCCESS"]
                if len(successful) > 0:
                    pred_vals = successful["prediction_kwh"].dropna().astype(float)
                    neg = (pred_vals < 0).sum()
                    if neg > 0:
                        print(f"[deepar-smoke]   WARNING: {neg} negative predictions")

            except Exception as error:
                elapsed = time.perf_counter() - started
                stats["failed"] += len(test)
                print(
                    f"[deepar-smoke]   seed={seed} CRASHED ({elapsed:.1f}s): "
                    f"{type(error).__name__}: {error}"
                )

    # Save predictions
    if all_predictions:
        predictions_df = pd.concat(all_predictions, ignore_index=True)
        out_path = run_dir / "deepar-predictions.parquet"
        predictions_df.to_parquet(out_path)
        print(f"[deepar-smoke] saved predictions to {out_path}")

        # Interval ordering check
        successful = predictions_df[predictions_df["status"] == "SUCCESS"].copy()
        if len(successful) > 0:
            for col in ["prediction_kwh", "lower_80", "upper_80", "lower_95", "upper_95"]:
                successful[col] = pd.to_numeric(successful[col], errors="coerce")

            ordering_ok = (
                (successful["lower_95"] <= successful["lower_80"]).all()
                and (successful["lower_80"] <= successful["upper_80"]).all()
                and (successful["upper_80"] <= successful["upper_95"]).all()
            )
            print(f"[deepar-smoke] interval ordering valid: {ordering_ok}")

    print()
    print("=" * 60)
    print(f"[deepar-smoke] SUMMARY for run_id={RUN_ID}")
    print(f"  attempted:  {stats['attempted']}")
    print(f"  success:    {stats['success']}")
    print(f"  skipped:    {stats['skipped']}")
    print(f"  failed:     {stats['failed']}")
    print(f"  output_dir: {run_dir}")
    print("=" * 60)

    _write_json(
        run_dir / "smoke-summary.json",
        {
            "run_id": RUN_ID,
            "model": MODEL_KEY,
            "seeds": list(SEEDS),
            "phases": list(PHASES),
            "tracks": ["seen_entity", "unseen_entity"],
            "stats": stats,
        },
    )

    if stats["failed"] > 0:
        print("[deepar-smoke] WARNING: there were failures!")
        sys.exit(1)


if __name__ == "__main__":
    main()
