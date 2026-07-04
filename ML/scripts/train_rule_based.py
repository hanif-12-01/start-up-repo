import pandas as pd
import numpy as np
import time
import json
from pathlib import Path

def train_rule_based():
    # Setup path
    base_dir = Path(__file__).resolve().parent.parent
    processed_dir = base_dir / "data" / "processed"
    outputs_dir = base_dir / "outputs"
    outputs_dir.mkdir(parents=True, exist_ok=True)
    
    # Load dataset splits
    train_df = pd.read_csv(processed_dir / "train.csv")
    val_df = pd.read_csv(processed_dir / "validation.csv")
    test_df = pd.read_csv(processed_dir / "test.csv")
    
    # Fungsi prediksi rule-based
    def predict_rule_based(df):
        # Rule-based simple prediction:
        # Gunakan latest_usage_kwh dengan multiplier trend_1_month (clipped)
        latest = df["latest_usage_kwh"]
        prev = df["previous_usage_kwh"]
        
        # Hitung trend ratio t-1 vs t-2
        trend_ratio = (latest - prev) / (prev + 1e-5)
        # Batasi agar aman (tidak membludak jika ada anomali liar)
        trend_ratio_clipped = trend_ratio.clip(-0.15, 0.15)
        
        # Prediksi usage next month
        pred_usage = latest * (1.0 + trend_ratio_clipped)
        
        # Prediksi cost next month = predicted_usage * avg_tariff
        pred_cost = pred_usage * df["avg_tariff_idr_per_kwh"]
        
        return pred_usage, pred_cost

    # Jalankan prediksi pada test set
    start_time = time.time()
    y_pred_usage, y_pred_cost = predict_rule_based(test_df)
    inference_time = (time.time() - start_time) * 1000 / len(test_df) # per sample in ms
    
    # Ground truth
    y_true_usage = test_df["next_month_usage_kwh"]
    y_true_cost = test_df["next_month_cost_idr"]
    
    # Evaluasi metrik
    # Usage
    mae_usage = np.mean(np.abs(y_true_usage - y_pred_usage))
    rmse_usage = np.sqrt(np.mean((y_true_usage - y_pred_usage) ** 2))
    mape_usage = np.mean(np.abs((y_true_usage - y_pred_usage) / (y_true_usage + 1e-5))) * 100
    
    # Cost
    mae_cost = np.mean(np.abs(y_true_cost - y_pred_cost))
    rmse_cost = np.sqrt(np.mean((y_true_cost - y_pred_cost) ** 2))
    mape_cost = np.mean(np.abs((y_true_cost - y_pred_cost) / (y_true_cost + 1e-5))) * 100
    
    # Simpan hasil sementara
    results = {
        "model_name": "Rule-based Prediction",
        "mae_usage_kwh": round(mae_usage, 4),
        "rmse_usage_kwh": round(rmse_usage, 4),
        "mape_usage_percent": round(mape_usage, 4),
        "mae_cost_idr": round(mae_cost, 4),
        "rmse_cost_idr": round(rmse_cost, 4),
        "mape_cost_percent": round(mape_cost, 4),
        "training_time_seconds": 0.0, # Rule-based tidak melatih model
        "inference_time_ms": round(inference_time, 4),
        "notes": "Fallback rule-based menggunakan multiplier trend 1 bulan (clipped -15% s/d 15%)."
    }
    
    with open(outputs_dir / "rule_based_results.json", "w") as f:
        json.dump(results, f, indent=4)
        
    # Simpan hasil prediksi sample untuk dibandingkan nanti
    pred_sample = test_df[["business_id", "business_type", "next_month_usage_kwh", "next_month_cost_idr", "avg_tariff_idr_per_kwh"]].copy()
    pred_sample["predicted_usage_kwh"] = y_pred_usage
    pred_sample["predicted_cost_idr"] = y_pred_cost
    pred_sample.to_csv(outputs_dir / "rule_based_predictions.csv", index=False)
    
    print("Rule-based evaluation:")
    print(f"Usage MAE: {mae_usage:.2f} kWh, RMSE: {rmse_usage:.2f} kWh, MAPE: {mape_usage:.2f}%")
    print(f"Cost MAE: Rp {mae_cost:.2f}, RMSE: Rp {rmse_cost:.2f}, MAPE: {mape_cost:.2f}%")

if __name__ == "__main__":
    train_rule_based()
