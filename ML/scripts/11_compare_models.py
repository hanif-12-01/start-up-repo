"""Skrip 11: Bandingkan metrik model dan buat contoh prediksi."""

import argparse
import pandas as pd
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"

NOTES = {
    "Rule-Based Prediction": "Fallback ringan berbasis tren 1 bulan (clamp plus/minus 20%).",
    "Ridge Regression": "Baseline ML linier.",
    "Gradient Boosting Regression": "Kandidat model utama MVP (ensemble pohon).",
}


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def parse_args():
    parser = argparse.ArgumentParser(description="Bandingkan metrik model.")
    parser.add_argument("--data-dir", type=str, default="ML/final",
                        help="Direktori data (untuk membaca test.csv sbg basis metadata).")
    parser.add_argument("--output-dir", type=str, default="ML/outputs")
    return parser.parse_args()


def compare_models(output_dir: Path, data_dir: Path) -> None:
    rb_metrics_path = output_dir / "rule_based_metrics.csv"
    ridge_metrics_path = output_dir / "ridge_metrics.csv"
    gb_metrics_path = output_dir / "gradient_boosting_metrics.csv"

    rb_preds_path = output_dir / "rule_based_predictions.csv"
    ridge_preds_path = output_dir / "ridge_predictions.csv"
    gb_preds_path = output_dir / "gradient_boosting_predictions.csv"

    print(f"=== Membandingkan Metrik Model | output_dir={output_dir} ===")

    if not (rb_metrics_path.exists() and ridge_metrics_path.exists() and gb_metrics_path.exists()):
        msg = "Salah satu file metrik model tidak ditemukan."
        print(msg)
        log_to_pipeline(f"[11_compare_models.py] GAGAL: {msg}")
        return

    try:
        df_rb = pd.read_csv(rb_metrics_path)
        df_ridge = pd.read_csv(ridge_metrics_path)
        df_gb = pd.read_csv(gb_metrics_path)

        df_compare = pd.concat([df_rb, df_ridge, df_gb], ignore_index=True)
        df_compare["notes"] = df_compare["model_name"].map(NOTES).fillna("")

        # Urutan kolom sesuai spesifikasi
        columns_order = [
            "model_name",
            "mae_usage_kwh", "rmse_usage_kwh",
            "mape_usage_percent", "smape_usage_percent", "wmape_usage_percent",
            "mae_cost_idr", "rmse_cost_idr",
            "mape_cost_percent", "smape_cost_percent", "wmape_cost_percent",
            "training_time_seconds", "inference_time_ms", "notes",
        ]
        df_compare = df_compare[[c for c in columns_order if c in df_compare.columns]]

        compare_path = output_dir / "model_comparison.csv"
        df_compare.to_csv(compare_path, index=False)
        print(f"Perbandingan model disimpan di {compare_path}")
        print(df_compare.to_string(index=False))

        # Contoh prediksi: basis = test.csv, merge by (source_dataset, business_id, year, month)..
        test_path = data_dir / "test.csv"
        if (rb_preds_path.exists() and ridge_preds_path.exists()
                and gb_preds_path.exists() and test_path.exists()):
            df_test = pd.read_csv(test_path)
            key_cols = ["source_dataset", "business_id", "year", "month"]

            # Dedupe test set berdasarkan key gabungan (jaga urutan pertama muncul)
            df_test = df_test.drop_duplicates(subset=key_cols, keep="first").reset_index(drop=True)

            df_rb_pred = pd.read_csv(rb_preds_path).drop_duplicates(subset=key_cols, keep="first")
            df_ridge_pred = pd.read_csv(ridge_preds_path).drop_duplicates(subset=key_cols, keep="first")
            df_gb_pred = pd.read_csv(gb_preds_path).drop_duplicates(subset=key_cols, keep="first")

            base = df_test[key_cols + ["business_type",
                                       "next_month_usage_kwh",
                                       "next_month_cost_idr"]].copy()
            base = base.rename(columns={
                "next_month_usage_kwh": "actual_usage_kwh",
                "next_month_cost_idr": "actual_cost_idr",
            })

            def _pick(df, prefix):
                return df[key_cols + ["predicted_usage_kwh", "predicted_cost_idr"]].rename(columns={
                    "predicted_usage_kwh": f"{prefix}_pred_kwh",
                    "predicted_cost_idr": f"{prefix}_pred_cost_idr",
                })

            merged = (base
                      .merge(_pick(df_rb_pred, "rule_based"), on=key_cols, how="left")
                      .merge(_pick(df_ridge_pred, "ridge"), on=key_cols, how="left")
                      .merge(_pick(df_gb_pred, "gradient_boosting"), on=key_cols, how="left"))

            # Ambil 10 contoh pertama sesuai urutan test.csv (setelah dedupe)
            df_examples = merged.head(10)[[
                "source_dataset", "business_id", "business_type",
                "year", "month",
                "actual_usage_kwh", "actual_cost_idr",
                "rule_based_pred_kwh", "rule_based_pred_cost_idr",
                "ridge_pred_kwh", "ridge_pred_cost_idr",
                "gradient_boosting_pred_kwh", "gradient_boosting_pred_cost_idr",
            ]]
            df_examples.to_csv(output_dir / "prediction_examples.csv", index=False)
            print(f"Contoh prediksi disimpan di {output_dir / 'prediction_examples.csv'}")

        msg = f"Perbandingan model selesai (output_dir={output_dir.name})."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[11_compare_models.py] SUKSES: {msg}")

    except Exception as e:
        msg = f"Error saat membandingkan model: {e}"
        print(msg)
        log_to_pipeline(f"[11_compare_models.py] GAGAL: {msg}")


if __name__ == "__main__":
    args = parse_args()
    data_dir = Path(args.data_dir)
    if not data_dir.is_absolute():
        data_dir = (ROOT / "ML" / args.data_dir).resolve() if not str(data_dir).startswith("ML") else (ROOT / args.data_dir).resolve()
    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = (ROOT / "ML" / args.output_dir).resolve() if not str(output_dir).startswith("ML") else (ROOT / args.output_dir).resolve()
    compare_models(output_dir, data_dir)
