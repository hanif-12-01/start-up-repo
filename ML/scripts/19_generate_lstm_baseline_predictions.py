"""Skrip 19: Generate baseline predictions Keras LSTM untuk validasi TypeScript.

Alur:
  1. Load model .keras + metadata + kedua scaler (feature + target).
  2. Reproduce pipeline sequence dari Skrip 16 (sort per business chronologically,
     ambil window 6-timestep, filter yang termasuk split test/validation).
  3. Sample N baris dari split test (diversifikasi antar business_type) sebagai
     "current row"; raw 6-step feature sequence + Keras prediksi kWh disimpan.
  4. Output JSON dikonsumsi Skrip TS test-lstm-ts-inference.ts untuk cek numeric
     parity (target tolerance ≤1% relative error).

Yang disimpan per sample:
  {
    "id": <index>,
    "business_id": ...,
    "business_type": ...,
    "current_year": ...,
    "current_month": ...,
    "raw_sequence": [ { <10 fitur unscaled> }, ...×6 ],
    "keras_predicted_kwh": <float>,
    "actual_kwh": <float optional>
  }
"""

from __future__ import annotations

import json
import pickle
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "ML" / "final_umkm"
OUTPUT_DIR = ROOT / "ML" / "outputs_lstm"

INPUT_MODEL = OUTPUT_DIR / "lstm_model.keras"
INPUT_METADATA = OUTPUT_DIR / "lstm_model_metadata.json"
INPUT_FEATURE_SCALER = OUTPUT_DIR / "feature_scaler.pkl"
INPUT_TARGET_SCALER = OUTPUT_DIR / "target_scaler.pkl"

OUTPUT_JSON = OUTPUT_DIR / "lstm_baseline_predictions.json"

FEATURES = [
    "latest_usage_kwh",
    "previous_usage_kwh",
    "avg_3_month_usage_kwh",
    "avg_6_month_usage_kwh",
    "trend_1_month",
    "trend_3_month",
    "month_sin",
    "month_cos",
    "business_type_encoded",
    "avg_tariff_idr_per_kwh",
]
TARGET = "next_month_usage_kwh"
SEQ_LEN = 6
N_SAMPLES = 20   # ambil 20 sample supaya cakupan business_type memadai
RANDOM_SEED = 42


def load_keras_model(path: Path):
    try:
        from tensorflow import keras as tfk  # type: ignore
        return tfk.models.load_model(str(path), compile=False)
    except Exception:
        import keras  # type: ignore
        return keras.models.load_model(str(path), compile=False)


def load_scaler(path: Path):
    try:
        import joblib  # type: ignore
        return joblib.load(path)
    except Exception:
        with path.open("rb") as f:
            return pickle.load(f)


def main() -> None:
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    print(f"[19] Loading dataset dari {DATA_DIR.relative_to(ROOT)}/")
    df_train = pd.read_csv(DATA_DIR / "train.csv")
    df_val = pd.read_csv(DATA_DIR / "validation.csv")
    df_test = pd.read_csv(DATA_DIR / "test.csv")
    df_train["split"] = "train"
    df_val["split"] = "validation"
    df_test["split"] = "test"
    df_full = pd.concat([df_train, df_val, df_test], ignore_index=True)
    df_full = df_full.sort_values(by=["business_id", "year", "month"]).reset_index(drop=True)
    print(f"[19] Full dataset: {len(df_full)} rows, {df_full['business_id'].nunique()} businesses")

    print(f"[19] Loading model + scalers")
    model = load_keras_model(INPUT_MODEL)
    feature_scaler = load_scaler(INPUT_FEATURE_SCALER)
    target_scaler = load_scaler(INPUT_TARGET_SCALER)

    # Kumpulkan kandidat "current row" (split test/val) yang punya 5 pendahulunya
    # dari business yang sama — reprodusir logika get_split_sequences dari Skrip 16.
    candidates = []  # list of dicts {row_index_in_df_full}
    for bid, group in df_full.groupby("business_id", sort=False):
        group_sorted = group.sort_values(by=["year", "month"]).reset_index(drop=False)
        # Kolom `index` kini = index asli df_full
        for i in range(len(group_sorted)):
            if group_sorted.loc[i, "split"] in ("test", "validation") and i >= SEQ_LEN - 1:
                candidates.append({
                    "df_index": int(group_sorted.loc[i, "index"]),
                    "group": group_sorted,
                    "i_in_group": i,
                })

    print(f"[19] Kandidat sample valid: {len(candidates)}")
    if len(candidates) < N_SAMPLES:
        print(f"[19] WARNING: hanya {len(candidates)} kandidat, kurang dari N_SAMPLES={N_SAMPLES}")

    # Ambil sample acak dengan diversifikasi business_type kalau memungkinkan
    random.shuffle(candidates)
    by_type = {}
    for c in candidates:
        bt = c["group"].loc[c["i_in_group"], "business_type"]
        by_type.setdefault(bt, []).append(c)

    picked = []
    per_type_target = max(1, N_SAMPLES // max(1, len(by_type)))
    for bt, arr in by_type.items():
        for c in arr[:per_type_target]:
            picked.append(c)
        if len(picked) >= N_SAMPLES:
            break
    # Isi sisanya kalau kurang
    if len(picked) < N_SAMPLES:
        for c in candidates:
            if c not in picked:
                picked.append(c)
            if len(picked) >= N_SAMPLES:
                break
    picked = picked[:N_SAMPLES]
    print(f"[19] Sample terpilih: {len(picked)}")

    # Build sequences (SCALED untuk predict, RAW untuk simpan ke JSON)
    X_scaled_batch = []
    samples = []
    for idx, c in enumerate(picked):
        g = c["group"]
        i = c["i_in_group"]
        window = g.loc[i - SEQ_LEN + 1 : i]  # 6 rows

        # RAW unscaled — untuk konsumsi TS (predictLstmUmkm scale internally)
        raw_sequence = []
        for _, row in window.iterrows():
            raw_sequence.append({feat: float(row[feat]) for feat in FEATURES})

        # SCALED — untuk Keras predict
        scaled_features = feature_scaler.transform(window[FEATURES].values)
        X_scaled_batch.append(scaled_features)

        samples.append({
            "id": idx,
            "business_id": str(g.loc[i, "business_id"]),
            "business_type": str(g.loc[i, "business_type"]),
            "current_year": int(g.loc[i, "year"]),
            "current_month": int(g.loc[i, "month"]),
            "raw_sequence": raw_sequence,
            "actual_kwh": float(g.loc[i, TARGET]) if pd.notna(g.loc[i, TARGET]) else None,
        })

    # Batch predict via Keras
    X_scaled_batch = np.array(X_scaled_batch)  # shape (N, 6, 10)
    print(f"[19] Predicting batch shape={X_scaled_batch.shape}")
    y_scaled = model.predict(X_scaled_batch, verbose=0)
    y_scaled = y_scaled.reshape(-1, 1)
    y_pred_kwh = target_scaler.inverse_transform(y_scaled).flatten()

    for s, pred in zip(samples, y_pred_kwh):
        s["keras_predicted_kwh"] = float(pred)

    payload = {
        "model_source": INPUT_MODEL.relative_to(ROOT).as_posix(),
        "sequence_length": SEQ_LEN,
        "feature_order": FEATURES,
        "target_name": TARGET,
        "n_samples": len(samples),
        "samples": samples,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"[19] Saved -> {OUTPUT_JSON.relative_to(ROOT).as_posix()}")
    print(f"[19] N samples: {len(samples)}")
    print(f"[19] Predicted kWh range: min={y_pred_kwh.min():.2f}, "
          f"max={y_pred_kwh.max():.2f}, mean={y_pred_kwh.mean():.2f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[19] ERROR: {e}", file=sys.stderr)
        raise
