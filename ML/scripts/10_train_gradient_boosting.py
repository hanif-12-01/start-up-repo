"""Skrip 10: Training Gradient Boosting sebagai kandidat model utama MVP."""

import argparse
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[2]
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"

FEATURES = [
    "business_type_encoded", "month", "latest_usage_kwh", "previous_usage_kwh",
    "avg_3_month_usage_kwh", "avg_6_month_usage_kwh", "trend_1_month",
    "trend_3_month", "month_sin", "month_cos", "avg_tariff_idr_per_kwh",
]
TARGET = "next_month_usage_kwh"


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def _safe_mape(y_true, y_pred, threshold=10.0):
    mask = np.abs(y_true) > threshold
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def _smape(y_true, y_pred):
    denom = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    mask = denom > 1e-9
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs(y_true[mask] - y_pred[mask]) / denom[mask]) * 100)


def _wmape(y_true, y_pred):
    denom = np.sum(np.abs(y_true))
    if denom < 1e-9:
        return float("nan")
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100)


def calculate_metrics(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    return mae, rmse, _safe_mape(y_true, y_pred), _smape(y_true, y_pred), _wmape(y_true, y_pred)


def parse_args():
    parser = argparse.ArgumentParser(description="Training Gradient Boosting.")
    parser.add_argument("--data-dir", type=str, default="ML/final")
    parser.add_argument("--output-dir", type=str, default="ML/outputs")
    return parser.parse_args()


def train_gradient_boosting(data_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    train_path = data_dir / "train.csv"
    val_path = data_dir / "validation.csv"
    test_path = data_dir / "test.csv"

    print(f"=== Training Gradient Boosting | data_dir={data_dir} output_dir={output_dir} ===")

    if not (train_path.exists() and val_path.exists() and test_path.exists()):
        msg = f"train/validation/test.csv tidak lengkap di {data_dir}."
        print(msg)
        log_to_pipeline(f"[10_train_gradient_boosting.py] GAGAL: {msg}")
        return

    try:
        df_train = pd.read_csv(train_path)
        df_test = pd.read_csv(test_path)

        X_train, y_train = df_train[FEATURES], df_train[TARGET]
        X_test, y_test = df_test[FEATURES], df_test[TARGET]

        start = time.time()
        model = GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=3, random_state=42
        )
        model.fit(X_train, y_train)
        training_time = time.time() - start

        start = time.time()
        predicted_usage = model.predict(X_test)
        inference_time_ms = (time.time() - start) * 1000
        predicted_usage = np.clip(predicted_usage, 10.0, None)

        predicted_cost = predicted_usage * df_test["avg_tariff_idr_per_kwh"].values
        y_true_cost = df_test["next_month_cost_idr"].values

        mae_u, rmse_u, mape_u, smape_u, wmape_u = calculate_metrics(y_test.values, predicted_usage)
        mae_c, rmse_c, mape_c, smape_c, wmape_c = calculate_metrics(y_true_cost, predicted_cost)

        joblib.dump(model, output_dir / "best_model.pkl")

        df_importance = pd.DataFrame({
            "feature": FEATURES,
            "importance": model.feature_importances_,
        }).sort_values(by="importance", ascending=False)
        df_importance.to_csv(output_dir / "feature_importance.csv", index=False)

        df_predictions = pd.DataFrame({
            "business_id": df_test["business_id"],
            "business_type": df_test["business_type"],
            "source_dataset": df_test.get("source_dataset", pd.Series([None] * len(df_test))),
            "year": df_test["year"],
            "month": df_test["month"],
            "next_month_usage_kwh": y_test.values,
            "predicted_usage_kwh": predicted_usage,
            "next_month_cost_idr": y_true_cost,
            "predicted_cost_idr": predicted_cost,
        })
        df_predictions.to_csv(output_dir / "gradient_boosting_predictions.csv", index=False)

        df_metrics = pd.DataFrame([{
            "model_name": "Gradient Boosting Regression",
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
            "training_time_seconds": round(training_time, 4),
            "inference_time_ms": round(inference_time_ms, 2),
        }])
        df_metrics.to_csv(output_dir / "gradient_boosting_metrics.csv", index=False)

        msg = f"Gradient Boosting selesai. wMAPE usage: {wmape_u:.2f}% (data_dir={data_dir.name})."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[10_train_gradient_boosting.py] SUKSES: {msg}")

    except Exception as e:
        msg = f"Error saat melatih Gradient Boosting: {e}"
        print(msg)
        log_to_pipeline(f"[10_train_gradient_boosting.py] GAGAL: {msg}")


if __name__ == "__main__":
    args = parse_args()
    train_gradient_boosting(Path(args.data_dir).resolve(), Path(args.output_dir).resolve())
