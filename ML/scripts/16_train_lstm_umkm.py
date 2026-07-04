"""Skrip 16: Melatih model LSTM untuk prediksi pemakaian listrik WattWise AI."""

import os
import json
import time
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import joblib

# Set random seeds for reproducibility
import tensorflow as tf
tf.keras.utils.set_random_seed(42)
tf.config.experimental.enable_op_determinism()

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "ML" / "final_umkm"
OUTPUT_DIR = ROOT / "ML" / "outputs_lstm"
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"

FEATURES = [
    "latest_usage_kwh", "previous_usage_kwh", "avg_3_month_usage_kwh",
    "avg_6_month_usage_kwh", "trend_1_month", "trend_3_month",
    "month_sin", "month_cos", "business_type_encoded", "avg_tariff_idr_per_kwh"
]
TARGET = "next_month_usage_kwh"
SEQ_LEN = 6

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

def get_split_sequences(df_full, split_name, seq_len=6):
    X_seq = []
    y_scaled = []
    y_raw = []
    meta_data = [] 
    
    scaled_features = [f"{col}_scaled" for col in FEATURES]
    
    # Group by business_id and loop chronologically
    for bid, group in df_full.groupby("business_id", sort=False):
        group_sorted = group.sort_values(by=["year", "month"]).reset_index(drop=True)
        for i in range(len(group_sorted)):
            if group_sorted.loc[i, "split"] == split_name:
                if i >= seq_len - 1:
                    seq_feats = group_sorted.loc[i - seq_len + 1 : i, scaled_features].values
                    X_seq.append(seq_feats)
                    y_scaled.append(group_sorted.loc[i, f"{TARGET}_scaled"])
                    y_raw.append(group_sorted.loc[i, TARGET])
                    
                    meta_data.append({
                        "business_id": group_sorted.loc[i, "business_id"],
                        "business_type": group_sorted.loc[i, "business_type"],
                        "source_dataset": group_sorted.loc[i, "source_dataset"],
                        "year": group_sorted.loc[i, "year"],
                        "month": group_sorted.loc[i, "month"],
                        "avg_tariff_idr_per_kwh": group_sorted.loc[i, "avg_tariff_idr_per_kwh"],
                        "next_month_cost_idr": group_sorted.loc[i, "next_month_cost_idr"],
                    })
    return np.array(X_seq), np.array(y_scaled), np.array(y_raw), pd.DataFrame(meta_data)

def main() -> None:
    print("=== [16] Melatih Model LSTM untuk WattWise AI (Offline) ===")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load dataset
    df_train = pd.read_csv(DATA_DIR / "train.csv")
    df_val = pd.read_csv(DATA_DIR / "validation.csv")
    df_test = pd.read_csv(DATA_DIR / "test.csv")
    
    df_train["split"] = "train"
    df_val["split"] = "validation"
    df_test["split"] = "test"
    
    df_full = pd.concat([df_train, df_val, df_test], ignore_index=True)
    
    # Re-sort to restore chronological order per business_id
    df_full = df_full.sort_values(by=["business_id", "year", "month"]).reset_index(drop=True)
    
    # Initialize scalers
    feature_scaler = StandardScaler()
    target_scaler = StandardScaler()
    
    # Fit scalers only on training data
    train_rows = df_full["split"] == "train"
    feature_scaler.fit(df_full.loc[train_rows, FEATURES])
    target_scaler.fit(df_full.loc[train_rows, [TARGET]])
    
    # Transform features and target
    df_full_scaled = df_full.copy()
    df_full_scaled[FEATURES] = feature_scaler.transform(df_full[FEATURES])
    df_full_scaled[TARGET] = target_scaler.transform(df_full[[TARGET]])
    
    # Add scaled columns to df_full
    for col in FEATURES:
        df_full[f"{col}_scaled"] = df_full_scaled[col]
    df_full[f"{TARGET}_scaled"] = df_full_scaled[TARGET]
    
    # Save scalers
    joblib.dump(feature_scaler, OUTPUT_DIR / "feature_scaler.pkl")
    joblib.dump(target_scaler, OUTPUT_DIR / "target_scaler.pkl")
    
    # Build sequences
    X_train, y_train_scaled, y_train_raw, df_meta_train = get_split_sequences(df_full, "train", seq_len=SEQ_LEN)
    X_val, y_val_scaled, y_val_raw, df_meta_val = get_split_sequences(df_full, "validation", seq_len=SEQ_LEN)
    X_test, y_test_scaled, y_test_raw, df_meta_test = get_split_sequences(df_full, "test", seq_len=SEQ_LEN)
    
    print(f"Jumlah sequence train: {len(X_train)} (Shape: {X_train.shape})")
    print(f"Jumlah sequence validation: {len(X_val)} (Shape: {X_val.shape})")
    print(f"Jumlah sequence test: {len(X_test)} (Shape: {X_test.shape})")
    
    # Model architecture
    model = Sequential([
        LSTM(32, input_shape=(SEQ_LEN, len(FEATURES))),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mae')
    
    # Early stopping
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    # Train
    start_train = time.time()
    history = model.fit(
        X_train, y_train_scaled,
        epochs=100,
        batch_size=32,
        validation_data=(X_val, y_val_scaled),
        callbacks=[early_stopping],
        verbose=1
    )
    training_time = time.time() - start_train
    print(f"Training selesai dalam {training_time:.2f} detik.")
    
    # Predict
    start_inf = time.time()
    y_pred_scaled = model.predict(X_test)
    total_inference_time_ms = (time.time() - start_inf) * 1000
    
    # Inverse transform
    y_pred_scaled = y_pred_scaled.reshape(-1, 1)
    y_pred_raw = target_scaler.inverse_transform(y_pred_scaled).flatten()
    y_pred_raw = np.clip(y_pred_raw, 10.0, None)
    
    # Calculate costs
    predicted_cost = y_pred_raw * df_meta_test["avg_tariff_idr_per_kwh"].values
    y_true_cost = df_meta_test["next_month_cost_idr"].values
    
    # Calculate metrics
    mae_u, rmse_u, mape_u, smape_u, wmape_u = calculate_metrics(y_test_raw, y_pred_raw)
    mae_c, rmse_c, mape_c, smape_c, wmape_c = calculate_metrics(y_true_cost, predicted_cost)
    
    # Save outputs
    # 1. Save model
    model.save(OUTPUT_DIR / "lstm_model.keras")
    
    # 2. Save metrics
    df_metrics = pd.DataFrame([{
        "model_name": "LSTM",
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
        "inference_time_ms": round(total_inference_time_ms, 2),
    }])
    df_metrics.to_csv(OUTPUT_DIR / "lstm_metrics.csv", index=False)
    
    # 3. Save predictions
    df_predictions = pd.DataFrame({
        "business_id": df_meta_test["business_id"],
        "business_type": df_meta_test["business_type"],
        "source_dataset": df_meta_test["source_dataset"],
        "year": df_meta_test["year"],
        "month": df_meta_test["month"],
        "next_month_usage_kwh": y_test_raw,
        "predicted_usage_kwh": y_pred_raw,
        "next_month_cost_idr": y_true_cost,
        "predicted_cost_idr": predicted_cost,
    })
    df_predictions.to_csv(OUTPUT_DIR / "lstm_predictions.csv", index=False)
    
    # 4. Save training history
    df_history = pd.DataFrame(history.history)
    df_history.to_csv(OUTPUT_DIR / "lstm_training_history.csv", index_label="epoch")
    
    # Compare with existing models
    comparison_path = ROOT / "ML" / "outputs_umkm" / "model_comparison.csv"
    if comparison_path.exists():
        df_old = pd.read_csv(comparison_path)
    else:
        df_old = pd.DataFrame()
        
    df_metrics_for_comp = df_metrics.copy()
    df_metrics_for_comp["notes"] = "Model sequence LSTM sederhana (seq_len=6)."
    
    df_new_comparison = pd.concat([df_old, df_metrics_for_comp], ignore_index=True)
    df_new_comparison.to_csv(OUTPUT_DIR / "comparison_with_existing_models.csv", index=False)
    
    # Parse evaluation/conclusions
    wmape_ridge = None
    wmape_gb = None
    
    for _, row in df_old.iterrows():
        name = row["model_name"]
        val = row["wmape_usage_percent"]
        if "Ridge" in name:
            wmape_ridge = val
        elif "Gradient Boosting" in name:
            wmape_gb = val
            
    lstm_beats_ridge = wmape_u < wmape_ridge if wmape_ridge is not None else False
    lstm_beats_gb = wmape_u < wmape_gb if wmape_gb is not None else False
    
    layak_runtime = "TIDAK"
    rekomendasi = ""
    
    if lstm_beats_ridge and lstm_beats_gb:
        layak_runtime = "YA"
        rekomendasi = "LSTM memiliki performa terbaik dibandingkan model lainnya. Layak untuk diintegrasikan ke runtime."
    elif lstm_beats_ridge:
        layak_runtime = "TIDAK (Meskipun lebih baik dari Ridge, Gradient Boosting masih lebih unggul)"
        rekomendasi = "Gunakan Gradient Boosting sebagai model utama karena performanya lebih baik dan komputasinya lebih ringan daripada LSTM."
    else:
        layak_runtime = "TIDAK"
        rekomendasi = "LSTM tidak mengalahkan Ridge (baseline). Tetap gunakan Ridge sebagai baseline/fallback."
        
    # 5. Save metadata
    metadata = {
        "model_type": "LSTM",
        "features": FEATURES,
        "target": TARGET,
        "sequence_length": SEQ_LEN,
        "parameters": {
            "lstm_units": 32,
            "dropout": 0.2,
            "dense_units": 16,
            "activation": "relu",
            "loss": "mae",
            "optimizer": "adam"
        },
        "training_epochs_actual": len(df_history),
        "training_time_seconds": training_time,
        "metrics_test": {
            "mae_usage_kwh": mae_u,
            "rmse_usage_kwh": rmse_u,
            "mape_usage_percent": mape_u,
            "smape_usage_percent": smape_u,
            "wmape_usage_percent": wmape_u,
            "mae_cost_idr": mae_c,
            "rmse_cost_idr": rmse_c,
            "mape_cost_percent": mape_c,
            "smape_cost_percent": smape_c,
            "wmape_cost_percent": wmape_c
        },
        "comparison": {
            "lstm_beats_ridge": bool(lstm_beats_ridge),
            "lstm_beats_gradient_boosting": bool(lstm_beats_gb),
            "layak_runtime": layak_runtime,
            "rekomendasi": rekomendasi
        }
    }
    
    with open(OUTPUT_DIR / "lstm_model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=4)
        
    # Print summary output for user
    print("\n=================== EVALUATION RESULTS ===================")
    print(f"Model: LSTM (sequence_length={SEQ_LEN})")
    print(f"MAE:   {mae_u:.4f} kWh")
    print(f"RMSE:  {rmse_u:.4f} kWh")
    print(f"MAPE:  {mape_u:.4f}%")
    print(f"sMAPE: {smape_u:.4f}%")
    print(f"wMAPE: {wmape_u:.4f}%")
    print("----------------------------------------------------------")
    print(f"Ridge Regression baseline wMAPE: {wmape_ridge}%" if wmape_ridge is not None else "Ridge Regression baseline wMAPE: N/A")
    print(f"Gradient Boosting baseline wMAPE: {wmape_gb}%" if wmape_gb is not None else "Gradient Boosting baseline wMAPE: N/A")
    print(f"LSTM beats Ridge? {lstm_beats_ridge}")
    print(f"LSTM beats Gradient Boosting? {lstm_beats_gb}")
    print(f"Layak menggantikan Ridge di runtime? {layak_runtime}")
    print(f"Rekomendasi: {rekomendasi}")
    print("==========================================================")
    
    log_to_pipeline(f"[16_train_lstm_umkm.py] SUKSES: LSTM selesai. wMAPE usage: {wmape_u:.2f}%.")

if __name__ == "__main__":
    main()
