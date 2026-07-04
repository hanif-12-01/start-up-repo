import pandas as pd
import numpy as np
import time
import json
import joblib
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

def train_ridge():
    # Setup path
    base_dir = Path(__file__).resolve().parent.parent
    processed_dir = base_dir / "data" / "processed"
    outputs_dir = base_dir / "outputs"
    outputs_dir.mkdir(parents=True, exist_ok=True)
    
    # Load dataset splits
    train_df = pd.read_csv(processed_dir / "train.csv")
    val_df = pd.read_csv(processed_dir / "validation.csv")
    test_df = pd.read_csv(processed_dir / "test.csv")
    
    # Pilih feature columns
    feature_cols = [
        "business_type_encoded", "month", "year", "power_va", "operating_hours",
        "latest_usage_kwh", "previous_usage_kwh", "avg_3_month_usage_kwh",
        "avg_6_month_usage_kwh", "trend_1_month", "trend_3_month", "latest_cost_idr",
        "avg_tariff_idr_per_kwh", "appliance_expected_kwh", "appliance_count",
        "highest_appliance_watt", "month_sin", "month_cos", "anomaly_count"
    ]
    
    X_train = train_df[feature_cols]
    y_train = train_df["next_month_usage_kwh"]
    
    X_val = val_df[feature_cols]
    y_val = val_df["next_month_usage_kwh"]
    
    X_test = test_df[feature_cols]
    y_test_usage = test_df["next_month_usage_kwh"]
    y_test_cost = test_df["next_month_cost_idr"]
    
    # Setup pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("ridge", Ridge(alpha=1.0))
    ])
    
    # Train
    start_time = time.time()
    pipeline.fit(X_train, y_train)
    training_time = time.time() - start_time
    
    # Predict on test
    start_inference = time.time()
    y_pred_usage = pipeline.predict(X_test)
    inference_time = (time.time() - start_inference) * 1000 / len(test_df) # per sample in ms
    
    # Prediksi cost = predicted_usage * avg_tariff
    y_pred_cost = y_pred_usage * test_df["avg_tariff_idr_per_kwh"]
    
    # Evaluasi metrik
    # Usage
    mae_usage = np.mean(np.abs(y_test_usage - y_pred_usage))
    rmse_usage = np.sqrt(np.mean((y_test_usage - y_pred_usage) ** 2))
    mape_usage = np.mean(np.abs((y_test_usage - y_pred_usage) / (y_test_usage + 1e-5))) * 100
    
    # Cost
    mae_cost = np.mean(np.abs(y_test_cost - y_pred_cost))
    rmse_cost = np.sqrt(np.mean((y_test_cost - y_pred_cost) ** 2))
    mape_cost = np.mean(np.abs((y_test_cost - y_pred_cost) / (y_test_cost + 1e-5))) * 100
    
    # Simpan hasil sementara
    results = {
        "model_name": "Ridge Regression",
        "mae_usage_kwh": round(mae_usage, 4),
        "rmse_usage_kwh": round(rmse_usage, 4),
        "mape_usage_percent": round(mape_usage, 4),
        "mae_cost_idr": round(mae_cost, 4),
        "rmse_cost_idr": round(rmse_cost, 4),
        "mape_cost_percent": round(mape_cost, 4),
        "training_time_seconds": round(training_time, 4),
        "inference_time_ms": round(inference_time, 4),
        "notes": "Baseline ML menggunakan linear Ridge Regression dengan feature scaling (StandardScaler)."
    }
    
    with open(outputs_dir / "ridge_results.json", "w") as f:
        json.dump(results, f, indent=4)
        
    # Simpan model ridge
    joblib.dump(pipeline, outputs_dir / "ridge_model.pkl")
    
    # Simpan hasil prediksi sample
    pred_sample = test_df[["business_id", "business_type", "next_month_usage_kwh", "next_month_cost_idr", "avg_tariff_idr_per_kwh"]].copy()
    pred_sample["predicted_usage_kwh"] = y_pred_usage
    pred_sample["predicted_cost_idr"] = y_pred_cost
    pred_sample.to_csv(outputs_dir / "ridge_predictions.csv", index=False)
    
    print("Ridge Regression evaluation:")
    print(f"Usage MAE: {mae_usage:.2f} kWh, RMSE: {rmse_usage:.2f} kWh, MAPE: {mape_usage:.2f}%")
    print(f"Cost MAE: Rp {mae_cost:.2f}, RMSE: Rp {rmse_cost:.2f}, MAPE: {mape_cost:.2f}%")

if __name__ == "__main__":
    train_ridge()
