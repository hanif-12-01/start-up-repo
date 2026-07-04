"""Skrip 08: Evaluasi model Rule-Based (fallback).

Mendukung argumen CLI --data-dir dan --output-dir agar dapat dijalankan
untuk dataset original (ML/final) maupun dataset UMKM-focused (ML/final_umkm).
"""

import argparse
import time
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def _safe_mape(y_true: np.ndarray, y_pred: np.ndarray, threshold: float = 10.0) -> float:
    """MAPE dengan mengabaikan actual <= threshold agar tidak meledak."""
    mask = np.abs(y_true) > threshold
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def _smape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    mask = denom > 1e-9
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs(y_true[mask] - y_pred[mask]) / denom[mask]) * 100)


def _wmape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = np.sum(np.abs(y_true))
    if denom < 1e-9:
        return float("nan")
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100)


def calculate_metrics(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    mape = _safe_mape(y_true, y_pred)
    smape = _smape(y_true, y_pred)
    wmape = _wmape(y_true, y_pred)
    return mae, rmse, mape, smape, wmape


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluasi Rule-Based fallback.")
    parser.add_argument("--data-dir", type=str, default="ML/final")
    parser.add_argument("--output-dir", type=str, default="ML/outputs")
    return parser.parse_args()


def train_rule_based(data_dir: Path, output_dir: Path) -> None:
    test_path = data_dir / "test.csv"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"=== Evaluasi Rule-Based | data_dir={data_dir} output_dir={output_dir} ===")

    if not test_path.exists():
        msg = f"File test.csv tidak ditemukan di {test_path}"
        print(msg)
        log_to_pipeline(f"[08_train_rule_based.py] GAGAL: {msg}")
        return

    try:
        df_test = pd.read_csv(test_path)

        start_time = time.time()

        trend_1_m = df_test["trend_1_month"].values
        trend = []
        for t in trend_1_m:
            if np.isnan(t) or np.isinf(t):
                trend.append(1.02)
            else:
                clamped = max(-0.2, min(0.2, t))
                trend.append(1.0 + clamped)
        trend = np.array(trend)

        predicted_usage = df_test["latest_usage_kwh"].values * trend
        predicted_cost = predicted_usage * df_test["avg_tariff_idr_per_kwh"].values

        inference_time_ms = (time.time() - start_time) * 1000

        y_true_usage = df_test["next_month_usage_kwh"].values
        y_true_cost = df_test["next_month_cost_idr"].values

        mae_u, rmse_u, mape_u, smape_u, wmape_u = calculate_metrics(y_true_usage, predicted_usage)
        mae_c, rmse_c, mape_c, smape_c, wmape_c = calculate_metrics(y_true_cost, predicted_cost)

        df_predictions = pd.DataFrame({
            "business_id": df_test["business_id"],
            "business_type": df_test["business_type"],
            "source_dataset": df_test.get("source_dataset", pd.Series([None] * len(df_test))),
            "year": df_test["year"],
            "month": df_test["month"],
            "next_month_usage_kwh": y_true_usage,
            "predicted_usage_kwh": predicted_usage,
            "next_month_cost_idr": y_true_cost,
            "predicted_cost_idr": predicted_cost,
        })
        df_predictions.to_csv(output_dir / "rule_based_predictions.csv", index=False)

        df_metrics = pd.DataFrame([{
            "model_name": "Rule-Based Prediction",
            "mae_usage_kwh": round(mae_u, 4),
            "rmse_usage_kwh": round(rmse_u, 4),
            "mape_usage_percent": round(mape_u, 4),
            "smape_usage_percent": round(smape_u, 4),
            "wmape_usage_percent": round(wmape_u, 4),
            "mae_cost_idr": round(mae_c, 4),
            "rmse_cost_idr": round(rmse_c, 4),
            "mape_cost_percent": round(mape_c, 4),
            "smape_cost_percent": round(smape_c, 4),
            "wmape_cost_percent": round(wmape_c, 4),
            "training_time_seconds": 0.0,
            "inference_time_ms": round(inference_time_ms, 2),
        }])
        df_metrics.to_csv(output_dir / "rule_based_metrics.csv", index=False)

        msg = f"Rule-Based selesai. wMAPE usage: {wmape_u:.2f}% (data_dir={data_dir.name})."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[08_train_rule_based.py] SUKSES: {msg}")

    except Exception as e:
        msg = f"Error saat mengevaluasi Rule-Based: {e}"
        print(msg)
        log_to_pipeline(f"[08_train_rule_based.py] GAGAL: {msg}")


if __name__ == "__main__":
    args = parse_args()
    train_rule_based(Path(args.data_dir).resolve(), Path(args.output_dir).resolve())
