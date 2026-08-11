from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

from wattwise_benchmark.config import BenchmarkConfig, data_root
from wattwise_benchmark.evaluation.metrics import aggregate_metrics, paired_mae_intervals
from wattwise_benchmark.execution import run_benchmark
from wattwise_benchmark.quality.mega_audit import run_data_mega_audit
from wattwise_benchmark.quality.precheck import run_training_precheck
from wattwise_benchmark.runtime import hardware_summary, utc_now_iso

DATASETS = ["bdg2", "london_smartmeter", "nrel_comstock"]
PHASES = ["H00", "H01_02", "H03_05", "H06_12", "H13_PLUS"]


def run_ai01_pipeline() -> None:
    root = data_root()
    repo_root = Path(__file__).resolve().parents[3]
    out_dir = root / "runs" / "ai-01"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_dir = repo_root / "docs" / "ml" / "ai-01"
    report_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================")
    print("STARTING WATTWISE AI-01 BENCHMARK PIPELINE")
    print("==================================================")

    # 1. Run Prechecks & Audit
    print("\n--- Running Prechecks & Mega Audit ---")
    precheck_res = run_training_precheck(root)
    audit_res = run_data_mega_audit(root)

    if precheck_res["status"] != "PASS" or audit_res["status"] != "PASS":
        print("ERROR: Precheck or Mega Audit failed! Aborting.", file=sys.stderr)
        sys.exit(1)

    # 2. Run Smoke Benchmarks
    print("\n--- Running Smoke Benchmarks ---")
    smoke_results: dict[str, Any] = {}
    for ds in DATASETS:
        print(f"Running smoke benchmark for source: {ds}")
        run_dir_smoke = out_dir / "smoke" / ds
        cfg = BenchmarkConfig(stage="smoke", datasets=(ds,), model_seeds=(17,))
        res = run_benchmark(root, repo_root, run_dir_smoke, cfg)
        smoke_results[ds] = res

    # Check smoke success
    for ds, res in smoke_results.items():
        preds = pd.read_parquet(Path(res["predictions_path"]))
        failed = preds[preds["status"] == "FAILED"]
        if not failed.empty:
            print(f"WARNING: Smoke benchmark for {ds} had {len(failed)} failed predictions.")

    # 3. Run Full Benchmarks
    print("\n--- Running Full Benchmarks ---")
    full_results: dict[str, Any] = {}
    full_predictions_list: list[pd.DataFrame] = []

    for ds in DATASETS:
        print(f"\nRunning FULL benchmark for track: {ds}")
        run_dir_full = out_dir / "full" / ds
        cfg = BenchmarkConfig(stage="full", datasets=(ds,), model_seeds=(17, 29, 43))
        res = run_benchmark(root, repo_root, run_dir_full, cfg)
        full_results[ds] = res
        df_pred = pd.read_parquet(Path(res["predictions_path"]))
        full_predictions_list.append(df_pred)

    combined_full_preds = pd.concat(full_predictions_list, ignore_index=True)
    combined_full_metrics = aggregate_metrics(combined_full_preds)
    combined_paired = paired_mae_intervals(combined_full_preds, samples=1000)

    # 4. Generate Leaderboards & Champion Selection
    print("\n--- Computing Leaderboards & Champion Routing ---")

    # Build model-leaderboard
    leaderboard_rows: list[dict[str, Any]] = []
    for (ds, tr, ph, mk), group in combined_full_preds.groupby(
        ["dataset_source", "track", "reporting_phase", "model_key"]
    ):
        success = group[group["status"] == "SUCCESS"]
        eligible = group[group["status"] != "SKIPPED"]
        fail_cnt = len(group[group["status"] == "FAILED"])
        fail_rate = float(fail_cnt / len(eligible)) if not eligible.empty else 0.0

        seed_maes = []
        seed_rmses = []
        seed_wmapes = []
        seed_smapes = []
        seed_mases = []
        seed_p90s = []

        for seed, sgroup in success.groupby("random_seed"):
            act = sgroup["target_usage_kwh"].to_numpy(dtype=float)
            pred = sgroup["prediction_kwh"].to_numpy(dtype=float)
            err = np.abs(pred - act)
            seed_maes.append(float(np.mean(err)))
            seed_rmses.append(float(np.sqrt(np.mean(np.square(pred - act)))))
            denom = float(np.sum(np.abs(act)))
            seed_wmapes.append(float(np.sum(err) / denom) if denom else np.nan)
            s_denom = np.abs(act) + np.abs(pred)
            seed_smapes.append(float(np.mean(np.where(s_denom > 0, 2.0 * err / s_denom, 0.0))))
            seed_p90s.append(float(np.quantile(err, 0.90)))

        mae_med = float(np.median(seed_maes)) if seed_maes else np.nan
        mae_std = float(np.std(seed_maes)) if len(seed_maes) > 1 else 0.0

        # Match paired bootstrap for this group
        paired_match = combined_paired[
            (combined_paired["dataset_source"] == ds)
            & (combined_paired["track"] == tr)
            & (combined_paired["reporting_phase"] == ph)
            & (combined_paired["model_key"] == mk)
        ]

        rel_imp = paired_match["relative_mae_improvement_pct"].median() if not paired_match.empty else np.nan
        ci_lo = paired_match["ci_95_lower"].median() if not paired_match.empty else np.nan
        ci_up = paired_match["ci_95_upper"].median() if not paired_match.empty else np.nan

        # Baseline comparison
        base_group = combined_full_preds[
            (combined_full_preds["dataset_source"] == ds)
            & (combined_full_preds["track"] == tr)
            & (combined_full_preds["reporting_phase"] == ph)
            & (combined_full_preds["model_key"] == "deterministic_baseline")
            & (combined_full_preds["status"] == "SUCCESS")
        ]
        base_mae = np.nan
        if not base_group.empty:
            base_err = np.abs(base_group["prediction_kwh"].to_numpy(dtype=float) - base_group["target_usage_kwh"].to_numpy(dtype=float))
            base_mae = float(np.mean(base_err))

        # Promotion status evaluation
        promoted = False
        if mk == "deterministic_baseline":
            prom_status = "BASELINE"
        else:
            if (
                ds == "bdg2"
                and tr == "seen_entity"
                and fail_rate <= 0.05
                and not np.isnan(rel_imp)
                and rel_imp >= 5.0
                and not np.isnan(ci_up)
                and ci_up < 0.0
            ):
                prom_status = "QUALIFIED_CHAMPION_CANDIDATE"
                promoted = True
            elif fail_rate > 0.05:
                prom_status = "DISQUALIFIED_HIGH_FAILURE_RATE"
            elif not np.isnan(rel_imp) and rel_imp < 5.0:
                prom_status = "REJECTED_INSUFFICIENT_IMPROVEMENT"
            elif not np.isnan(ci_up) and ci_up >= 0.0:
                prom_status = "REJECTED_NOT_STATISTICALLY_SIGNIFICANT"
            else:
                prom_status = "NOT_PROMOTED"

        leaderboard_rows.append(
            {
                "dataset_source": ds,
                "track": tr,
                "reporting_phase": ph,
                "model_key": mk,
                "seed_count": len(group["random_seed"].unique()),
                "MAE_median": mae_med,
                "MAE_std": mae_std,
                "RMSE_median": float(np.median(seed_rmses)) if seed_rmses else np.nan,
                "WMAPE_median": float(np.median(seed_wmapes)) if seed_wmapes else np.nan,
                "sMAPE_median": float(np.median(seed_smapes)) if seed_smapes else np.nan,
                "p90_error_median": float(np.median(seed_p90s)) if seed_p90s else np.nan,
                "failure_rate": fail_rate,
                "training_duration": float(group["training_duration"].max()),
                "inference_latency": float(group["inference_duration_ms"].mean()),
                "artifact_size": int(group["artifact_size_bytes"].max()),
                "baseline_MAE": base_mae,
                "relative_mae_improvement_vs_baseline": rel_imp,
                "paired_ci_lower": ci_lo,
                "paired_ci_upper": ci_up,
                "promotion_status": prom_status,
            }
        )

    leaderboard_df = pd.DataFrame(leaderboard_rows)
    leaderboard_df.to_csv(report_dir / "model-leaderboard.csv", index=False)

    # Export paired baseline comparison CSV
    combined_paired.to_csv(report_dir / "paired-baseline-comparison.csv", index=False)

    # Build phase-leaderboard (BDG2 Primary Measured, seen_entity track)
    bdg2_lb = leaderboard_df[
        (leaderboard_df["dataset_source"] == "bdg2")
        & (leaderboard_df["track"] == "seen_entity")
    ]

    phase_leaderboard_rows: list[dict[str, Any]] = []
    champions: dict[str, dict[str, str]] = {}

    for ph in PHASES:
        ph_rows = bdg2_lb[bdg2_lb["reporting_phase"] == ph].sort_values("MAE_median")
        if ph_rows.empty:
            continue

        base_row = ph_rows[ph_rows["model_key"] == "deterministic_baseline"]
        base_mae = base_row["MAE_median"].iloc[0] if not base_row.empty else np.nan

        # Find qualified candidate
        qualified = ph_rows[ph_rows["promotion_status"] == "QUALIFIED_CHAMPION_CANDIDATE"]

        if not qualified.empty:
            winner_row = qualified.iloc[0]
            winner = winner_row["model_key"]
            winner_mae = winner_row["MAE_median"]
            rel_imp = winner_row["relative_mae_improvement_vs_baseline"]
            reason = f"Beats baseline by {rel_imp:.2f}% MAE (95% CI upper < 0)"
            conf = "HIGH"
        else:
            winner = "deterministic_baseline"
            winner_mae = base_mae
            reason = "No ML model materially beat baseline by >= 5% with 95% CI upper < 0"
            conf = "HIGH"

        champions[ph] = {"model": winner, "reason": reason, "confidence": conf}

        rank = 1
        for _, row in ph_rows.iterrows():
            phase_leaderboard_rows.append(
                {
                    "reporting_phase": ph,
                    "rank": rank,
                    "model_key": row["model_key"],
                    "MAE_median": row["MAE_median"],
                    "relative_improvement": row["relative_mae_improvement_vs_baseline"],
                    "promotion_status": row["promotion_status"],
                    "is_phase_champion": bool(row["model_key"] == winner),
                }
            )
            rank += 1

    phase_lb_df = pd.DataFrame(phase_leaderboard_rows)
    phase_lb_df.to_csv(report_dir / "phase-leaderboard.csv", index=False)

    # Build Robustness Summary CSV
    rob_rows = leaderboard_df[
        leaderboard_df["dataset_source"].isin(["london_smartmeter", "nrel_comstock"])
    ]
    rob_rows.to_csv(report_dir / "robustness-summary.csv", index=False)

    # Write experiment-manifest.json
    exp_manifest = {
        "experiment_id": "AI-01-REBENCHMARK",
        "timestamp_utc": utc_now_iso(),
        "git_sha": precheck_res.get("release_fingerprint"),
        "data_root": str(root),
        "precheck_fingerprint": precheck_res.get("release_fingerprint"),
        "datasets": precheck_res.get("datasets"),
        "hardware": hardware_summary(),
        "champions": champions,
    }
    (report_dir / "experiment-manifest.json").write_text(
        json.dumps(exp_manifest, indent=2) + "\n", encoding="utf-8"
    )

    print("\n==================================================")
    print("AI-01 BENCHMARK PIPELINE COMPLETE")
    print("==================================================")


if __name__ == "__main__":
    run_ai01_pipeline()
