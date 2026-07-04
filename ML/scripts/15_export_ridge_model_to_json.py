"""Skrip 15: Export Ridge UMKM (ML/outputs_umkm/ridge_model.pkl) ke JSON.

Tujuan: menyediakan koefisien Ridge yang benar (varian UMKM) dalam format
JSON portabel supaya bisa dikonsumsi langsung oleh runtime TypeScript aplikasi
WattWise AI tanpa perlu memanggil Python. Menggantikan koefisien lama di
src/services/prediction.ts yang secara keliru berasal dari ML/outputs/
(dataset generik non-UMKM).

Input : ML/outputs_umkm/ridge_model.pkl
Output: ML/outputs_umkm/ridge_model_export.json

Skrip ini TIDAK memodifikasi src/ atau schema Prisma. Setelah dijalankan,
file JSON siap dipakai sebagai sumber tunggal koefisien Ridge UMKM v1.1.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.linear_model import Ridge  # noqa: F401 — dipakai isinstance
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
INPUT_MODEL = ROOT / "ML" / "outputs_umkm" / "ridge_model.pkl"
INPUT_COMPARISON = ROOT / "ML" / "outputs_umkm" / "model_comparison.csv"
OUTPUT_JSON = ROOT / "ML" / "outputs_umkm" / "ridge_model_export.json"

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
MODEL_VERSION = "Ridge UMKM v1.1"
DISCLAIMER = "Hasil ini adalah estimasi, bukan tagihan resmi PLN."


def _to_python_number(value):
    """Konversi numpy scalar ke tipe Python native supaya JSON-serializable."""
    try:
        import numpy as np  # local import agar skrip tetap ringan
        if isinstance(value, np.generic):
            return value.item()
    except ImportError:
        pass
    return value


def extract_ridge_components(model):
    """Bongkar model menjadi (scaler_mean, scaler_scale, intercept, coef).

    Mendukung dua bentuk:
      1. sklearn.pipeline.Pipeline berisi (StandardScaler, Ridge) atau
         (scaler kompatibel, estimator kompatibel).
      2. estimator Ridge langsung tanpa pipeline.
    """
    scaler_mean = None
    scaler_scale = None

    if isinstance(model, Pipeline):
        # Ambil estimator terakhir sebagai kandidat Ridge, dan scaler pertama
        # yang memiliki atribut mean_/scale_ sebagai kandidat StandardScaler.
        estimator = model.steps[-1][1]
        for _name, step in model.steps[:-1]:
            if hasattr(step, "mean_") and hasattr(step, "scale_"):
                scaler_mean = [float(x) for x in step.mean_]
                scaler_scale = [float(x) for x in step.scale_]
                break
    else:
        estimator = model

    if not hasattr(estimator, "coef_") or not hasattr(estimator, "intercept_"):
        raise ValueError(
            f"Objek {type(estimator).__name__} bukan estimator linear terlatih; "
            "tidak menemukan atribut coef_/intercept_."
        )

    intercept = _to_python_number(estimator.intercept_)
    # intercept bisa berupa array 1-elemen untuk multi-output; kita expect skalar
    if isinstance(intercept, (list, tuple)):
        intercept = float(intercept[0])
    else:
        intercept = float(intercept)

    coef_raw = estimator.coef_
    # Handle bentuk (n_features,) atau (1, n_features)
    if hasattr(coef_raw, "ndim") and coef_raw.ndim == 2:
        coef_raw = coef_raw[0]
    coefficients = [float(_to_python_number(c)) for c in coef_raw]

    # Validasi urutan fitur bila metadata tersedia
    if hasattr(estimator, "feature_names_in_"):
        model_features = list(estimator.feature_names_in_)
        if model_features != FEATURE_ORDER:
            raise ValueError(
                "Urutan fitur pada model tidak cocok dengan FEATURE_ORDER.\n"
                f"  Model : {model_features}\n"
                f"  Expect: {FEATURE_ORDER}"
            )

    if len(coefficients) != len(FEATURE_ORDER):
        raise ValueError(
            f"Jumlah koefisien ({len(coefficients)}) tidak cocok dengan "
            f"jumlah fitur ({len(FEATURE_ORDER)})."
        )

    return scaler_mean, scaler_scale, intercept, coefficients


def read_ridge_metrics(comparison_path: Path) -> dict:
    """Ambil baris 'Ridge Regression' dari model_comparison.csv sebagai dict.

    Angka dikonversi ke float supaya konsumen JSON tidak perlu parse lagi.
    """
    if not comparison_path.exists():
        return {}

    with comparison_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("model_name", "").strip().lower() == "ridge regression":
                metrics = {}
                for key, val in row.items():
                    if key == "model_name":
                        continue
                    if key == "notes":
                        metrics[key] = val
                        continue
                    try:
                        metrics[key] = float(val) if val != "" else None
                    except (TypeError, ValueError):
                        metrics[key] = val
                return metrics
    return {}


def main() -> None:
    if not INPUT_MODEL.exists():
        raise FileNotFoundError(f"Model tidak ditemukan: {INPUT_MODEL}")

    print(f"[15] Loading model: {INPUT_MODEL}")
    model = joblib.load(INPUT_MODEL)
    print(f"[15] Model type: {type(model).__name__}")

    scaler_mean, scaler_scale, intercept, coefficients = extract_ridge_components(model)

    metrics = read_ridge_metrics(INPUT_COMPARISON)
    if metrics:
        print(f"[15] Loaded Ridge metrics from {INPUT_COMPARISON.name} "
              f"({len(metrics)} field).")
    else:
        print(f"[15] Warning: tidak menemukan baris Ridge Regression di "
              f"{INPUT_COMPARISON}.")

    payload = {
        "model_name": "Ridge Regression",
        "model_version": MODEL_VERSION,
        "source_model_path": INPUT_MODEL.relative_to(ROOT).as_posix(),
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "target": TARGET,
        "feature_order": FEATURE_ORDER,
        "intercept": intercept,
        "coefficients": coefficients,
        "scaler_mean": scaler_mean,
        "scaler_scale": scaler_scale,
        "metrics": metrics,
        "disclaimer": DISCLAIMER,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    rel_out = OUTPUT_JSON.relative_to(ROOT).as_posix()
    print(f"[15] Exported -> {rel_out}")
    print(f"[15] source_model_path = {payload['source_model_path']}")
    print(f"[15] intercept         = {intercept!r}")
    print(f"[15] coefficients ({len(coefficients)}):")
    for name, val in zip(FEATURE_ORDER, coefficients):
        print(f"       - {name:30s} = {val!r}")
    if scaler_mean is not None:
        print(f"[15] scaler_mean present ({len(scaler_mean)} value)")
    else:
        print("[15] scaler_mean: null (model tidak memakai StandardScaler)")
    if scaler_scale is not None:
        print(f"[15] scaler_scale present ({len(scaler_scale)} value)")
    else:
        print("[15] scaler_scale: null")


if __name__ == "__main__":
    main()
