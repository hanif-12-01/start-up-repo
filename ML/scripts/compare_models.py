import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
from pathlib import Path

def compare_models():
    # Setup path
    base_dir = Path(__file__).resolve().parent.parent
    outputs_dir = base_dir / "outputs"
    charts_dir = outputs_dir / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    
    # Load individual model results
    results_list = []
    
    for filename in ["rule_based_results.json", "ridge_results.json", "gradient_boosting_results.json"]:
        filepath = outputs_dir / filename
        if filepath.exists():
            with open(filepath, "r") as f:
                results_list.append(json.load(f))
        else:
            print(f"Peringatan: File hasil {filename} tidak ditemukan.")
            
    if not results_list:
        print("Error: Tidak ada data hasil model untuk dibandingkan.")
        return
        
    # Buat DataFrame model_comparison.csv
    comparison_df = pd.DataFrame(results_list)
    comparison_path = outputs_dir / "model_comparison.csv"
    comparison_df.to_csv(comparison_path, index=False)
    print(f"Berhasil membuat model_comparison.csv di {comparison_path}")
    
    # Gabungkan file prediksi untuk membuat prediction_examples.csv
    # Kita ambil 15 sample pertama untuk contoh prediksi masing-masing model
    pred_examples = []
    
    rb_pred_path = outputs_dir / "rule_based_predictions.csv"
    ridge_pred_path = outputs_dir / "ridge_predictions.csv"
    gb_pred_path = outputs_dir / "gradient_boosting_predictions.csv"
    
    if rb_pred_path.exists() and ridge_pred_path.exists() and gb_pred_path.exists():
        rb_df = pd.read_csv(rb_pred_path)
        ridge_df = pd.read_csv(ridge_pred_path)
        gb_df = pd.read_csv(gb_pred_path)
        
        # Ambil sample
        num_samples = min(15, len(rb_df))
        
        for i in range(num_samples):
            pred_examples.append({
                "business_id": rb_df.loc[i, "business_id"],
                "business_type": rb_df.loc[i, "business_type"],
                "actual_usage_kwh": rb_df.loc[i, "next_month_usage_kwh"],
                "actual_cost_idr": rb_df.loc[i, "next_month_cost_idr"],
                "rule_based_pred_usage_kwh": rb_df.loc[i, "predicted_usage_kwh"],
                "rule_based_pred_cost_idr": rb_df.loc[i, "predicted_cost_idr"],
                "ridge_pred_usage_kwh": ridge_df.loc[i, "predicted_usage_kwh"],
                "ridge_pred_cost_idr": ridge_df.loc[i, "predicted_cost_idr"],
                "gradient_boosting_pred_usage_kwh": gb_df.loc[i, "predicted_usage_kwh"],
                "gradient_boosting_pred_cost_idr": gb_df.loc[i, "predicted_cost_idr"],
            })
            
        examples_df = pd.DataFrame(pred_examples)
        examples_path = outputs_dir / "prediction_examples.csv"
        examples_df.to_csv(examples_path, index=False)
        print(f"Berhasil membuat prediction_examples.csv di {examples_path}")
        
        # Simpan chart visualisasi perbandingan model
        try:
            # 1. Chart perbandingan MAE
            plt.figure(figsize=(10, 6))
            models = comparison_df["model_name"]
            mae_values = comparison_df["mae_usage_kwh"]
            
            bars = plt.bar(models, mae_values, color=["#E57373", "#64B5F6", "#81C784"])
            plt.title("Perbandingan MAE Prediksi Listrik (kWh) - Test Set")
            plt.ylabel("Mean Absolute Error (kWh)")
            plt.xlabel("Model")
            
            # Tambahkan label di atas bar
            for bar in bars:
                height = bar.get_height()
                plt.text(bar.get_x() + bar.get_width()/2.0, height, f"{height:.2f} kWh", ha="center", va="bottom")
                
            plt.tight_layout()
            plt.savefig(charts_dir / "mae_comparison.png")
            plt.close()
            
            # 2. Chart actual vs predicted untuk subset data
            plt.figure(figsize=(12, 6))
            x_indices = np.arange(num_samples)
            width = 0.2
            
            plt.bar(x_indices - 1.5*width, examples_df["actual_usage_kwh"], width, label="Actual", color="#9E9E9E")
            plt.bar(x_indices - 0.5*width, examples_df["rule_based_pred_usage_kwh"], width, label="Rule-based", color="#E57373")
            plt.bar(x_indices + 0.5*width, examples_df["ridge_pred_usage_kwh"], width, label="Ridge", color="#64B5F6")
            plt.bar(x_indices + 1.5*width, examples_df["gradient_boosting_pred_usage_kwh"], width, label="Gradient Boosting", color="#81C784")
            
            plt.title("Perbandingan Prediksi vs Aktual Usage (kWh) - 15 Bisnis Pertama")
            plt.xlabel("Index Bisnis")
            plt.ylabel("Usage (kWh)")
            plt.xticks(x_indices, examples_df["business_id"], rotation=45)
            plt.legend()
            plt.tight_layout()
            plt.savefig(charts_dir / "actual_vs_predicted.png")
            plt.close()
            
            print(f"Berhasil membuat chart visualisasi di {charts_dir}")
            
        except Exception as e:
            print(f"Gagal membuat visualisasi chart: {e}")
            
    else:
        print("Peringatan: File prediksi individual tidak lengkap. Tidak dapat membuat prediction_examples.csv dan chart.")

if __name__ == "__main__":
    compare_models()
