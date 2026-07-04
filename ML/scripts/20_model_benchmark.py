#!/usr/bin/env python3
"""
WattWise AI — Model Benchmark & Stress Test

Tujuan:
1. Menguji model Ridge Regression UMKM sebagai baseline.
2. Membandingkannya dengan model regresi lain:
   - Random Forest
   - Extra Trees
   - Gradient Boosting
   - HistGradientBoosting
   - XGBoost, jika package `xgboost` tersedia
3. Menghasilkan metrik evaluasi yang mudah dibaca:
   MAE, RMSE, MAPE, sMAPE, WMAPE, R2, waktu training, dan waktu inferensi.
4. Menjalankan stress test sederhana agar output model tetap masuk akal.

Mode input:
- Dataset engineered:
  harus punya semua kolom FEATURE_ORDER + target `next_month_usage_kwh`.
- Dataset raw bulanan:
  minimal punya business_id, business_type, year, month, usage_kwh, cost_idr.
  Nama camelCase seperti usageKwh/costIdr juga otomatis dinormalisasi.

Contoh:
  python ML/scripts/20_model_benchmark.py --data ML/data/umkm_monthly.csv
  python ML/scripts/20_model_benchmark.py --demo
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    import joblib
except ImportError:  # pragma: no cover
    joblib = None

XGBRegressor = None


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = ROOT / "ML" / "outputs_umkm"

FEATURE_ORDER = [
    "business_type_encoded",
    "month",
    "latest_usage_kwh",
    "previous_usage_kwh",
    "avg_3_month_usage_kwh",
    "avg_6_month_usage_kwh",
    "trend_1_month",
    "trend_3_month",
    "month_sin",
    "month_cos",
    "avg_tariff_idr_per_kwh",
]

TARGET = "next_month_usage_kwh"
TYPE_MAPPING = {
    "LAUNDRY": 0,
    "FNB": 1,
    "RETAIL": 2,
    "MANUFACTURE": 3,
    "COLD_STORAGE": 4,
    "OTHER": 6,
}


@dataclass
class BenchmarkResult:
    model_name: str
    mae_usage_kwh: float
    rmse_usage_kwh: float
    mape_usage_percent: float
    smape_usage_percent: float
    wmape_usage_percent: float
    mae_cost_idr: float
    rmse_cost_idr: float
    mape_cost_percent: float
    smape_cost_percent: float
    wmape_cost_percent: float
    r2_usage: float
    training_time_seconds: float
    inference_time_ms: float
    notes: str


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Samakan beberapa variasi nama kolom dari app/Prisma/dataset ML."""
    mapping = {
        "businessId": "business_id",
        "businessID": "business_id",
        "businessType": "business_type",
        "usageKwh": "usage_kwh",
        "costIdr": "cost_idr",
        "costIDR": "cost_idr",
        "powerVA": "power_va",
    }
    return df.rename(columns={c: mapping.get(c, c) for c in df.columns})


def encode_business_type(value) -> int:
    if pd.isna(value):
        return TYPE_MAPPING["OTHER"]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value)
    key = str(value).strip().upper()
    return TYPE_MAPPING.get(key, TYPE_MAPPING["OTHER"])


def safe_div(numerator: float, denominator: float) -> float:
    return numerator / (denominator + 1e-5)


def add_time_index(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["time_index"] = out["year"].astype(int) * 12 + out["month"].astype(int)
    return out


def make_feature_row(history: pd.DataFrame) -> Dict[str, float]:
    """Buat fitur dari riwayat sampai bulan berjalan."""
    current = history.iloc[-1]
    previous = history.iloc[-2] if len(history) >= 2 else current

    latest_usage = float(current["usage_kwh"])
    previous_usage = float(previous["usage_kwh"])
    recent3 = history.tail(3)["usage_kwh"].astype(float)
    recent6 = history.tail(6)["usage_kwh"].astype(float)
    avg3 = float(recent3.mean())
    avg6 = float(recent6.mean())
    month = int(current["month"])

    return {
        "business_type_encoded": float(encode_business_type(current["business_type"])),
        "month": float(month),
        "latest_usage_kwh": latest_usage,
        "previous_usage_kwh": previous_usage,
        "avg_3_month_usage_kwh": avg3,
        "avg_6_month_usage_kwh": avg6,
        "trend_1_month": safe_div(latest_usage - previous_usage, previous_usage),
        "trend_3_month": safe_div(latest_usage - avg3, avg3),
        "month_sin": math.sin((2 * math.pi * month) / 12),
        "month_cos": math.cos((2 * math.pi * month) / 12),
        "avg_tariff_idr_per_kwh": float(current["cost_idr"]) / max(latest_usage, 1e-5),
    }


def build_from_raw_monthly(df: pd.DataFrame) -> pd.DataFrame:
    required = {"business_id", "business_type", "year", "month", "usage_kwh", "cost_idr"}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(
            "Dataset raw kurang kolom: "
            + ", ".join(missing)
            + ". Minimal: business_id, business_type, year, month, usage_kwh, cost_idr."
        )

    df = add_time_index(df)
    df = df.sort_values(["business_id", "time_index"]).reset_index(drop=True)

    rows: List[Dict[str, float]] = []
    for business_id, grp in df.groupby("business_id", sort=False):
        grp = grp.sort_values("time_index").reset_index(drop=True)
        if len(grp) < 3:
            continue

        # Baris i memprediksi usage bulan i+1.
        for i in range(1, len(grp) - 1):
            history = grp.iloc[: i + 1]
            next_row = grp.iloc[i + 1]
            row = make_feature_row(history)
            row["business_id"] = business_id
            row["feature_year"] = int(history.iloc[-1]["year"])
            row["feature_month"] = int(history.iloc[-1]["month"])
            row["target_year"] = int(next_row["year"])
            row["target_month"] = int(next_row["month"])
            row["time_index"] = int(history.iloc[-1]["time_index"])
            row["target_cost_idr"] = float(next_row["cost_idr"])
            row[TARGET] = float(next_row["usage_kwh"])
            rows.append(row)

    if not rows:
        raise ValueError(
            "Dataset belum cukup untuk benchmark. Butuh minimal 3 bulan per business: "
            "2 bulan sebagai fitur awal + 1 bulan sebagai target."
        )

    return pd.DataFrame(rows)


def load_dataset(path: Path | None, demo: bool) -> Tuple[pd.DataFrame, bool]:
    if demo:
        raw = generate_demo_monthly_data()
        return build_from_raw_monthly(raw), True

    if path is None:
        raise ValueError("Pakai --data PATH atau --demo.")

    df = normalize_columns(pd.read_csv(path))
    has_engineered = set(FEATURE_ORDER + [TARGET]).issubset(df.columns)
    if has_engineered:
        df = df.copy()
        if "feature_year" in df.columns and "feature_month" in df.columns:
            df["time_index"] = df["feature_year"].astype(int) * 12 + df["feature_month"].astype(int)
        elif "year" in df.columns and "month" in df.columns:
            df["time_index"] = df["year"].astype(int) * 12 + df["month"].astype(int)
        else:
            df["time_index"] = np.arange(len(df))
        return df, False

    return build_from_raw_monthly(df), False


def generate_demo_monthly_data(
    n_business_per_type: int = 8,
    n_months: int = 24,
    seed: int = 42,
) -> pd.DataFrame:
    """Dataset sintetis untuk mencoba pipeline. Jangan dianggap evaluasi final."""
    rng = np.random.default_rng(seed)
    types = {
        "LAUNDRY": (550, 75),
        "FNB": (900, 120),
        "RETAIL": (700, 90),
        "MANUFACTURE": (2600, 350),
        "COLD_STORAGE": (4300, 480),
        "OTHER": (1000, 300),
    }

    rows = []
    start_year = 2024
    start_month = 7

    for business_type, (base_usage, spread) in types.items():
        for business_no in range(n_business_per_type):
            business_factor = rng.normal(1.0, 0.12)
            tariff = rng.normal(1450, 45)
            trend = rng.normal(0.006, 0.012)
            anomaly_month = rng.integers(8, n_months) if rng.random() < 0.35 else None

            previous = base_usage * business_factor
            for t in range(n_months):
                month_index = start_month - 1 + t
                year = start_year + month_index // 12
                month = month_index % 12 + 1

                seasonality = 1 + 0.06 * math.sin((2 * math.pi * month) / 12)
                noise = rng.normal(0, spread)
                usage = max(30, previous * (1 + trend) * seasonality + noise)

                if anomaly_month is not None and t == anomaly_month:
                    usage *= rng.uniform(1.22, 1.55)

                # Efek pemulihan setelah anomali.
                if anomaly_month is not None and t == anomaly_month + 1:
                    usage *= rng.uniform(0.86, 0.94)

                rows.append(
                    {
                        "business_id": f"{business_type.lower()}-{business_no:02d}",
                        "business_type": business_type,
                        "year": year,
                        "month": month,
                        "usage_kwh": round(float(usage), 2),
                        "cost_idr": round(float(usage * tariff)),
                    }
                )
                previous = usage

    return pd.DataFrame(rows)


def chronological_split(df: pd.DataFrame, test_size: float) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if not 0 < test_size < 1:
        raise ValueError("--test-size harus di antara 0 dan 1.")

    sorted_df = df.sort_values("time_index").reset_index(drop=True)
    split_idx = int(len(sorted_df) * (1 - test_size))
    split_idx = max(1, min(split_idx, len(sorted_df) - 1))
    return sorted_df.iloc[:split_idx].copy(), sorted_df.iloc[split_idx:].copy()


def build_models(random_state: int, include_xgboost: bool, include_slow_models: bool) -> Dict[str, object]:
    models: Dict[str, object] = {
        "Ridge Regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("model", Ridge(alpha=1.0, random_state=random_state)),
            ]
        ),
        "Random Forest": RandomForestRegressor(
            n_estimators=80,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=1,
        ),
        "Extra Trees": ExtraTreesRegressor(
            n_estimators=80,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=1,
        ),
        "Gradient Boosting": GradientBoostingRegressor(random_state=random_state),
    }

    if include_slow_models:
        models["HistGradientBoosting"] = HistGradientBoostingRegressor(
            random_state=random_state,
            max_iter=80,
            learning_rate=0.05,
            l2_regularization=0.05,
        )

    if include_xgboost:
        try:
            from xgboost import XGBRegressor as _XGBRegressor  # type: ignore
        except Exception:
            _XGBRegressor = None
        if _XGBRegressor is not None:
            models["XGBoost"] = _XGBRegressor(
                n_estimators=120,
                max_depth=4,
                learning_rate=0.04,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=random_state,
                n_jobs=1,
            )

    return models


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    err = y_pred - y_true

    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(np.mean(err**2)))
    mape = float(np.mean(np.abs(err) / np.maximum(np.abs(y_true), 1e-5)) * 100)
    smape = float(
        np.mean(2 * np.abs(err) / np.maximum(np.abs(y_true) + np.abs(y_pred), 1e-5)) * 100
    )
    wmape = float(np.sum(np.abs(err)) / np.maximum(np.sum(np.abs(y_true)), 1e-5) * 100)
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else float("nan")

    return {
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
        "smape": smape,
        "wmape": wmape,
        "r2": r2,
    }


def evaluate_model(
    model_name: str,
    model,
    x_train: pd.DataFrame,
    y_train: pd.Series,
    x_test: pd.DataFrame,
    y_test: pd.Series,
    tariff_test: pd.Series,
) -> Tuple[BenchmarkResult, np.ndarray]:
    start = time.perf_counter()
    model.fit(x_train, y_train)
    train_seconds = time.perf_counter() - start

    start = time.perf_counter()
    pred = np.maximum(0, model.predict(x_test))
    infer_ms = (time.perf_counter() - start) * 1000 / max(len(x_test), 1)

    usage = regression_metrics(y_test.to_numpy(), pred)

    actual_cost = y_test.to_numpy() * tariff_test.to_numpy()
    pred_cost = pred * tariff_test.to_numpy()
    cost = regression_metrics(actual_cost, pred_cost)

    result = BenchmarkResult(
        model_name=model_name,
        mae_usage_kwh=usage["mae"],
        rmse_usage_kwh=usage["rmse"],
        mape_usage_percent=usage["mape"],
        smape_usage_percent=usage["smape"],
        wmape_usage_percent=usage["wmape"],
        mae_cost_idr=cost["mae"],
        rmse_cost_idr=cost["rmse"],
        mape_cost_percent=cost["mape"],
        smape_cost_percent=cost["smape"],
        wmape_cost_percent=cost["wmape"],
        r2_usage=usage["r2"],
        training_time_seconds=train_seconds,
        inference_time_ms=infer_ms,
        notes="Baseline ML linier." if model_name == "Ridge Regression" else "Kandidat pembanding.",
    )
    return result, pred


def result_to_dict(result: BenchmarkResult) -> Dict[str, object]:
    return {
        "model_name": result.model_name,
        "mae_usage_kwh": round(result.mae_usage_kwh, 4),
        "rmse_usage_kwh": round(result.rmse_usage_kwh, 4),
        "mape_usage_percent": round(result.mape_usage_percent, 4),
        "smape_usage_percent": round(result.smape_usage_percent, 4),
        "wmape_usage_percent": round(result.wmape_usage_percent, 4),
        "mae_cost_idr": round(result.mae_cost_idr, 4),
        "rmse_cost_idr": round(result.rmse_cost_idr, 4),
        "mape_cost_percent": round(result.mape_cost_percent, 4),
        "smape_cost_percent": round(result.smape_cost_percent, 4),
        "wmape_cost_percent": round(result.wmape_cost_percent, 4),
        "r2_usage": round(result.r2_usage, 4) if math.isfinite(result.r2_usage) else None,
        "training_time_seconds": round(result.training_time_seconds, 4),
        "inference_time_ms": round(result.inference_time_ms, 4),
        "notes": result.notes,
    }


def run_stress_tests(best_model, base_row: pd.Series, output_dir: Path) -> List[Dict[str, object]]:
    scenarios = []

    def scenario(name: str, mutate) -> None:
        features = base_row[FEATURE_ORDER].astype(float).copy()
        mutate(features)
        latest = max(float(features["latest_usage_kwh"]), 1e-5)
        pred = float(np.maximum(0, best_model.predict(pd.DataFrame([features]))[0]))
        scenarios.append(
            {
                "scenario": name,
                "prediction_kwh": round(pred, 4),
                "latest_usage_kwh": round(latest, 4),
                "finite": math.isfinite(pred),
                "non_negative": pred >= 0,
                "within_3x_latest": (latest / 3) <= pred <= (latest * 3),
            }
        )

    def recompute_trends(features: pd.Series) -> None:
        latest = float(features["latest_usage_kwh"])
        previous = float(features["previous_usage_kwh"])
        avg3 = float(features["avg_3_month_usage_kwh"])
        features["trend_1_month"] = safe_div(latest - previous, previous)
        features["trend_3_month"] = safe_div(latest - avg3, avg3)

    scenario("normal_reference", lambda f: None)

    scenario(
        "anomaly_spike_latest_plus_50pct",
        lambda f: (f.__setitem__("latest_usage_kwh", float(f["latest_usage_kwh"]) * 1.5), recompute_trends(f)),
    )

    scenario(
        "anomaly_drop_latest_minus_50pct",
        lambda f: (f.__setitem__("latest_usage_kwh", float(f["latest_usage_kwh"]) * 0.5), recompute_trends(f)),
    )

    scenario(
        "tariff_plus_20pct",
        lambda f: f.__setitem__("avg_tariff_idr_per_kwh", float(f["avg_tariff_idr_per_kwh"]) * 1.2),
    )

    scenario(
        "unknown_business_type_other",
        lambda f: f.__setitem__("business_type_encoded", float(TYPE_MAPPING["OTHER"])),
    )

    path = output_dir / "stress_test_predictions.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(scenarios[0].keys()))
        writer.writeheader()
        writer.writerows(scenarios)

    return scenarios


def save_csv(rows: Iterable[Dict[str, object]], path: Path) -> None:
    rows = list(rows)
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, help="Path CSV dataset raw/engineered.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument(
        "--wmape-threshold",
        type=float,
        default=15.0,
        help="Batas WMAPE (%) untuk status GO. Sesuaikan dengan toleransi bisnis.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Gunakan dataset sintetis untuk mencoba pipeline. Bukan evaluasi final.",
    )
    parser.add_argument(
        "--include-xgboost",
        action="store_true",
        help="Ikutkan XGBoost jika package xgboost tersedia. Dinonaktifkan default agar benchmark cepat di laptop.",
    )
    parser.add_argument(
        "--include-slow-models",
        action="store_true",
        help="Ikutkan model tambahan yang kadang lebih lambat, misalnya HistGradientBoosting.",
    )
    parser.add_argument(
        "--export-best-model",
        action="store_true",
        help="Simpan pickle model terbaik ke output-dir/best_model.pkl.",
    )
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    dataset, synthetic_demo = load_dataset(args.data, args.demo)
    dataset = dataset.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURE_ORDER + [TARGET])

    if len(dataset) < 20:
        print(
            "[WARN] Dataset evaluasi sangat kecil. Hasil benchmark bisa tidak stabil. "
            "Gunakan minimal puluhan/ratusan baris lintas beberapa business dan bulan."
        )

    train_df, test_df = chronological_split(dataset, args.test_size)
    x_train = train_df[FEATURE_ORDER].astype(float)
    y_train = train_df[TARGET].astype(float)
    x_test = test_df[FEATURE_ORDER].astype(float)
    y_test = test_df[TARGET].astype(float)
    tariff_test = test_df["avg_tariff_idr_per_kwh"].astype(float)

    models = build_models(args.random_state, args.include_xgboost, args.include_slow_models)

    results: List[BenchmarkResult] = []
    fitted_models: Dict[str, object] = {}
    predictions_rows: List[Dict[str, object]] = []

    for name, model in models.items():
        print(f"[benchmark] Training/evaluating {name}...")
        result, pred = evaluate_model(name, model, x_train, y_train, x_test, y_test, tariff_test)
        results.append(result)
        fitted_models[name] = model

        for idx, actual, predicted in zip(test_df.index, y_test, pred):
            predictions_rows.append(
                {
                    "model_name": name,
                    "row_index": int(idx),
                    "actual_usage_kwh": round(float(actual), 4),
                    "predicted_usage_kwh": round(float(predicted), 4),
                    "absolute_error_kwh": round(abs(float(predicted) - float(actual)), 4),
                }
            )

    sorted_results = sorted(results, key=lambda r: r.wmape_usage_percent)
    best = sorted_results[0]
    ridge = next((r for r in results if r.model_name == "Ridge Regression"), None)

    comparison_rows = [result_to_dict(r) for r in sorted_results]
    save_csv(comparison_rows, args.output_dir / "model_benchmark.csv")
    save_csv(predictions_rows, args.output_dir / "test_predictions.csv")

    base_row = test_df.iloc[len(test_df) // 2]
    stress_rows = run_stress_tests(fitted_models[best.model_name], base_row, args.output_dir)

    stress_pass = all(
        row["finite"] and row["non_negative"] and row["within_3x_latest"]
        for row in stress_rows
    )

    improvement_vs_ridge = None
    if ridge:
        improvement_vs_ridge = (
            (ridge.wmape_usage_percent - best.wmape_usage_percent)
            / max(ridge.wmape_usage_percent, 1e-5)
            * 100
        )

    status = "GO"
    reasons = []
    if best.wmape_usage_percent > args.wmape_threshold:
        status = "NEEDS_REVIEW"
        reasons.append(
            f"WMAPE model terbaik {best.wmape_usage_percent:.2f}% masih di atas threshold "
            f"{args.wmape_threshold:.2f}%."
        )
    if not stress_pass:
        status = "NEEDS_REVIEW"
        reasons.append("Ada stress test yang menghasilkan output tidak wajar.")
    if synthetic_demo:
        status = "DEMO_ONLY"
        reasons.append("Benchmark memakai dataset sintetis; ulangi dengan dataset real sebelum keputusan produksi.")

    summary = {
        "status": status,
        "best_model": result_to_dict(best),
        "ridge_baseline": result_to_dict(ridge) if ridge else None,
        "improvement_vs_ridge_wmape_percent": round(improvement_vs_ridge, 4)
        if improvement_vs_ridge is not None
        else None,
        "stress_test_pass": stress_pass,
        "stress_tests": stress_rows,
        "rows_total": int(len(dataset)),
        "rows_train": int(len(train_df)),
        "rows_test": int(len(test_df)),
        "feature_order": FEATURE_ORDER,
        "target": TARGET,
        "synthetic_demo": synthetic_demo,
        "reasons": reasons,
        "outputs": {
            "model_benchmark_csv": str(args.output_dir / "model_benchmark.csv"),
            "test_predictions_csv": str(args.output_dir / "test_predictions.csv"),
            "stress_test_predictions_csv": str(args.output_dir / "stress_test_predictions.csv"),
            "summary_json": str(args.output_dir / "best_model_summary.json"),
        },
    }

    if args.export_best_model:
        if joblib is None:
            print("[WARN] joblib tidak tersedia, model terbaik tidak diekspor.")
        else:
            best_model_path = args.output_dir / "best_model.pkl"
            joblib.dump(fitted_models[best.model_name], best_model_path)
            summary["outputs"]["best_model_pickle"] = str(best_model_path)

    with (args.output_dir / "best_model_summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("\n=== WattWise AI Model Benchmark ===")
    print(f"Rows: total={len(dataset)} train={len(train_df)} test={len(test_df)}")
    print(f"Best model: {best.model_name}")
    print(f"Best WMAPE: {best.wmape_usage_percent:.2f}%")
    if ridge:
        print(f"Ridge WMAPE: {ridge.wmape_usage_percent:.2f}%")
        print(f"Improvement vs Ridge: {improvement_vs_ridge:.2f}%")
    print(f"Stress test pass: {stress_pass}")
    print(f"Status: {status}")
    if reasons:
        print("Reasons:")
        for reason in reasons:
            print(f"- {reason}")
    print(f"\nSaved outputs to: {args.output_dir}")


if __name__ == "__main__":
    main()
