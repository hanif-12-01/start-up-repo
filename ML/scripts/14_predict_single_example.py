"""Skrip 14: Prediksi single-example memakai model Gradient Boosting terlatih.

Tujuan:
- Memuat artefak model best_model.pkl dan metadata model_metadata.json.
- Memakai satu contoh input UMKM hardcoded untuk demonstrasi MVP offline.
- Menghasilkan prediksi kWh, biaya IDR, confidence heuristik, explanation, dan disclaimer.
- Output JSON top-level agar mudah dibaca atau dipipe ke tooling lain.

Catatan: skrip ini tidak terhubung ke database dan tidak dipanggil saat runtime
dashboard. Ini hanya alat validasi offline agar artefak model dapat di-load ulang
dan memberi prediksi masuk akal sebelum integrasi backend.
"""

import argparse
import json
import math
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def parse_args():
    parser = argparse.ArgumentParser(description="Prediksi single-example.")
    parser.add_argument("--model-dir", type=str, default="ML/outputs_umkm")
    return parser.parse_args()


def build_example_input() -> dict:
    """Contoh UMKM Laundry bulan Agustus dari brief project."""
    return {
        "business_type": "LAUNDRY",
        "month": 8,
        "latest_usage_kwh": 780.0,
        "previous_usage_kwh": 740.0,
        "avg_3_month_usage_kwh": 760.0,
        "avg_6_month_usage_kwh": 735.0,
        "trend_1_month": 0.054,
        "trend_3_month": 0.026,
        "avg_tariff_idr_per_kwh": 1444.70,
    }


def compute_confidence(example: dict) -> tuple[str, str]:
    """Heuristik confidence sederhana untuk validasi single-example."""
    trend_abs = max(abs(example["trend_1_month"]), abs(example["trend_3_month"]))

    if example["business_type"] == "OTHER":
        return "LOW", "Kategori OTHER terlalu luas sehingga confidence diturunkan."

    if trend_abs <= 0.10:
        return "MEDIUM", "Tren pemakaian relatif stabil (perubahan <= 10%)."

    if trend_abs <= 0.25:
        return "MEDIUM", "Ada fluktuasi pemakaian moderat (10-25%)."

    return "LOW", "Fluktuasi pemakaian besar (> 25%), estimasi kurang stabil."


def build_feature_vector(example: dict, feature_order: list[str], encoding: dict) -> pd.DataFrame:
    month = int(example["month"])
    business_type = example["business_type"]

    if business_type not in encoding:
        business_type = "OTHER"

    values = {
        "business_type_encoded": encoding[business_type],
        "month": month,
        "latest_usage_kwh": example["latest_usage_kwh"],
        "previous_usage_kwh": example["previous_usage_kwh"],
        "avg_3_month_usage_kwh": example["avg_3_month_usage_kwh"],
        "avg_6_month_usage_kwh": example["avg_6_month_usage_kwh"],
        "trend_1_month": example["trend_1_month"],
        "trend_3_month": example["trend_3_month"],
        "month_sin": math.sin(2 * math.pi * month / 12.0),
        "month_cos": math.cos(2 * math.pi * month / 12.0),
        "avg_tariff_idr_per_kwh": example["avg_tariff_idr_per_kwh"],
    }

    missing_features = [feature for feature in feature_order if feature not in values]
    if missing_features:
        raise ValueError(f"Fitur tidak tersedia: {missing_features}")

    return pd.DataFrame([[values[feature] for feature in feature_order]], columns=feature_order)


def main() -> None:
    args = parse_args()
    model_dir = Path(args.model_dir).resolve()
    model_path = model_dir / "best_model.pkl"
    meta_path = model_dir / "model_metadata.json"

    if not model_path.exists() or not meta_path.exists():
        msg = f"Artefak tidak lengkap di {model_dir}."
        print(msg)
        log_to_pipeline(f"[14_predict_single_example.py] GAGAL: {msg}")
        return

    try:
        model = joblib.load(model_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        feature_order = meta["features"]
        encoding = meta["business_type_encoding"]
        disclaimer = meta["disclaimer"]

        example = build_example_input()
        x_input = build_feature_vector(example, feature_order, encoding)

        pred_kwh = float(model.predict(x_input)[0])
        pred_kwh = max(pred_kwh, 10.0)
        pred_cost = pred_kwh * example["avg_tariff_idr_per_kwh"]

        confidence_level, confidence_reason = compute_confidence(example)
        avg_6_month = example["avg_6_month_usage_kwh"]
        trend_1_month_percent = example["trend_1_month"] * 100

        explanation = (
            f"Prediksi berbasis pola konsumsi 6 bulan terakhir "
            f"(rata-rata {avg_6_month:.0f} kWh) dan tren 1 bulan "
            f"{trend_1_month_percent:+.1f}%. Model utama: Gradient Boosting."
        )

        output = {
            "predictedUsageKwh": round(pred_kwh, 2),
            "predictedCostIdr": round(pred_cost, 2),
            "method": "GRADIENT_BOOSTING",
            "confidenceLevel": confidence_level,
            "confidenceReason": confidence_reason,
            "explanation": explanation,
            "disclaimer": disclaimer,
            "modelName": meta["model_name"],
            "modelRole": meta["model_role"],
            "modelVersion": "gb_umkm_v1",
        }

        print(json.dumps(output, indent=2, ensure_ascii=False))

        msg = (
            f"Prediksi single-example sukses. "
            f"kWh={pred_kwh:.2f}, IDR={pred_cost:.0f}, "
            f"confidence={confidence_level}."
        )
        log_to_pipeline(f"[14_predict_single_example.py] SUKSES: {msg}")

    except Exception as e:
        msg = f"Error prediksi single-example: {e}"
        print(msg)
        log_to_pipeline(f"[14_predict_single_example.py] GAGAL: {msg}")


if __name__ == "__main__":
    main()