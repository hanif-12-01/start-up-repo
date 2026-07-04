"""Skrip 13: Analisis error per business_type dan per source_dataset.

Membaca file prediksi dari tiap model dan test.csv, lalu menghitung MAE, RMSE,
dan wMAPE per kelompok. Output ke output_dir.
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"

MODEL_FILES = {
    "Rule-Based Prediction": "rule_based_predictions.csv",
    "Ridge Regression": "ridge_predictions.csv",
    "Gradient Boosting Regression": "gradient_boosting_predictions.csv",
}


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def _wmape(y_true, y_pred):
    denom = float(np.sum(np.abs(y_true)))
    if denom < 1e-9:
        return float("nan")
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100)


def _group_stats(df: pd.DataFrame, group_col: str, model_name: str) -> pd.DataFrame:
    rows = []
    for key, grp in df.groupby(group_col):
        y = grp["next_month_usage_kwh"].values.astype(float)
        yp = grp["predicted_usage_kwh"].values.astype(float)
        mae = float(np.mean(np.abs(y - yp)))
        rmse = float(np.sqrt(np.mean((y - yp) ** 2)))
        rows.append({
            "model_name": model_name,
            group_col: key,
            "row_count": len(grp),
            "mae_usage_kwh": round(mae, 4),
            "rmse_usage_kwh": round(rmse, 4),
            "wmape_usage_percent": round(_wmape(y, yp), 4),
        })
    return pd.DataFrame(rows)


def parse_args():
    parser = argparse.ArgumentParser(description="Analisis error UMKM per grup.")
    parser.add_argument("--data-dir", type=str, default="ML/final_umkm")
    parser.add_argument("--output-dir", type=str, default="ML/outputs_umkm")
    return parser.parse_args()


def analyze(data_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    test_path = data_dir / "test.csv"

    print(f"=== Analisis Error UMKM | data_dir={data_dir} output_dir={output_dir} ===")

    if not test_path.exists():
        msg = f"test.csv tidak ditemukan di {test_path}"
        print(msg)
        log_to_pipeline(f"[13_analyze_umkm_errors.py] GAGAL: {msg}")
        return

    try:
        df_test = pd.read_csv(test_path)
        # kunci gabungan agar match presisi
        key_cols = ["business_id", "year", "month"]

        bt_frames = []
        sd_frames = []

        for model_name, fname in MODEL_FILES.items():
            pred_path = output_dir / fname
            if not pred_path.exists():
                print(f"Lewati {model_name}: {pred_path} tidak ada.")
                continue

            df_pred = pd.read_csv(pred_path)
            # Gabung dengan test agar dapat business_type dan source_dataset yang benar
            merged = df_pred.merge(
                df_test[key_cols + ["business_type", "source_dataset"]],
                on=key_cols,
                how="left",
                suffixes=("", "_test"),
            )
            # Pilih source_dataset dari test bila ada
            if "source_dataset_test" in merged.columns:
                merged["source_dataset"] = merged["source_dataset_test"].fillna(merged.get("source_dataset"))
                merged = merged.drop(columns=[c for c in ["source_dataset_test"] if c in merged.columns])
            if "business_type_test" in merged.columns:
                merged["business_type"] = merged["business_type_test"].fillna(merged.get("business_type"))
                merged = merged.drop(columns=[c for c in ["business_type_test"] if c in merged.columns])

            bt_frames.append(_group_stats(merged, "business_type", model_name))
            sd_frames.append(_group_stats(merged, "source_dataset", model_name))

        if bt_frames:
            df_bt = pd.concat(bt_frames, ignore_index=True)
            df_bt.to_csv(output_dir / "error_by_business_type.csv", index=False)
            print(f"error_by_business_type.csv disimpan ({len(df_bt)} baris).")
            print(df_bt.to_string(index=False))
        if sd_frames:
            df_sd = pd.concat(sd_frames, ignore_index=True)
            df_sd.to_csv(output_dir / "error_by_source_dataset.csv", index=False)
            print(f"\nerror_by_source_dataset.csv disimpan ({len(df_sd)} baris).")
            print(df_sd.to_string(index=False))

        msg = f"Analisis error selesai (output_dir={output_dir.name})."
        print(f"\n=== {msg} ===")
        log_to_pipeline(f"[13_analyze_umkm_errors.py] SUKSES: {msg}")

    except Exception as e:
        msg = f"Error saat analisis error UMKM: {e}"
        print(msg)
        log_to_pipeline(f"[13_analyze_umkm_errors.py] GAGAL: {msg}")


if __name__ == "__main__":
    args = parse_args()
    analyze(Path(args.data_dir).resolve(), Path(args.output_dir).resolve())
