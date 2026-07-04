import pandas as pd
import numpy as np
from pathlib import Path

def build_features():
    # Setup path
    base_dir = Path(__file__).resolve().parent.parent
    raw_dir = base_dir / "data" / "raw"
    processed_dir = base_dir / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    
    # Load raw data
    biz_df = pd.read_csv(raw_dir / "synthetic_businesses.csv")
    elec_df = pd.read_csv(raw_dir / "synthetic_electricity_entries.csv")
    
    # Sort electricity entries to ensure correct temporal order
    elec_df = elec_df.sort_values(by=["business_id", "year", "month"]).reset_index(drop=True)
    
    # Business type mapping
    biz_types = ["LAUNDRY", "FNB", "RETAIL", "MANUFACTURE", "COLD_STORAGE", "OTHER"]
    biz_type_to_encoded = {b_type: idx for idx, b_type in enumerate(biz_types)}
    biz_df["business_type_encoded"] = biz_df["business_type"].map(biz_type_to_encoded)
    
    # Join business metadata with electricity entries
    df = pd.merge(elec_df, biz_df, on="business_id", how="left")
    
    # Add absolute month index (1 to 24) to make calculations easier
    # Let's assume year 2024 is the start. Month index: (year - 2024)*12 + month
    min_year = df["year"].min()
    df["month_idx"] = (df["year"] - min_year) * 12 + df["month"]
    df = df.sort_values(by=["business_id", "month_idx"]).reset_index(drop=True)
    
    # We will build features using window functions per business
    features_list = []
    
    # Group by business
    grouped = df.groupby("business_id")
    
    for biz_id, group in grouped:
        group = group.sort_values("month_idx").reset_index(drop=True)
        
        # We need at least 6 months of lag to compute 6-month average
        # Target month `t` ranges from 7 to 24
        for t in range(7, 25):
            row_t = group[group["month_idx"] == t].iloc[0]
            
            # History
            hist = group[group["month_idx"] < t]
            hist_t1 = hist.iloc[-1]
            hist_t2 = hist.iloc[-2]
            
            latest_usage = hist_t1["usage_kwh"]
            previous_usage = hist_t2["usage_kwh"]
            
            avg_3_month = hist.iloc[-3:]["usage_kwh"].mean()
            avg_6_month = hist.iloc[-6:]["usage_kwh"].mean()
            
            trend_1_month = latest_usage - previous_usage
            trend_3_month = avg_3_month - avg_6_month
            
            latest_cost = hist_t1["cost_idr"]
            
            # Sin/Cos for seasonality of the target month
            target_month = row_t["month"]
            month_sin = np.sin(2 * np.pi * target_month / 12)
            month_cos = np.cos(2 * np.pi * target_month / 12)
            
            # Anomaly count of the target month or previous month?
            # Normally we predict NEXT month, so we only know anomaly count up to t-1
            # But the requirement lists `anomaly_count` as a feature. Let's use anomaly_count at t-1 (latest_anomaly_count)
            anomaly_count_lag = hist_t1["anomaly_count"]
            
            features_list.append({
                "business_id": biz_id,
                "business_type": row_t["business_type"],
                "business_type_encoded": row_t["business_type_encoded"],
                "month": target_month,
                "year": row_t["year"],
                "month_idx": t,
                "power_va": row_t["power_va"],
                "operating_hours": row_t["operating_hours"],
                "latest_usage_kwh": latest_usage,
                "previous_usage_kwh": previous_usage,
                "avg_3_month_usage_kwh": avg_3_month,
                "avg_6_month_usage_kwh": avg_6_month,
                "trend_1_month": trend_1_month,
                "trend_3_month": trend_3_month,
                "latest_cost_idr": latest_cost,
                "avg_tariff_idr_per_kwh": row_t["avg_tariff_idr_per_kwh"],
                "appliance_expected_kwh": hist_t1["appliance_expected_kwh"],
                "appliance_count": row_t["appliance_count"],
                "highest_appliance_watt": row_t["highest_appliance_watt"],
                "month_sin": month_sin,
                "month_cos": month_cos,
                "anomaly_count": anomaly_count_lag,
                # Targets
                "next_month_usage_kwh": row_t["usage_kwh"],
                "next_month_cost_idr": row_t["cost_idr"]
            })
            
    features_df = pd.DataFrame(features_list)
    
    # Save main feature file
    features_df.to_csv(processed_dir / "wattwise_features.csv", index=False)
    print(f"Berhasil membuat wattwise_features.csv di {processed_dir}")
    
    # Split: Train (month_idx 7-18), Validation (19-21), Test (22-24)
    # Target month 7-18 corresponds to the target in months 7 to 18
    train_df = features_df[features_df["month_idx"] <= 18].drop(columns=["month_idx"])
    val_df = features_df[(features_df["month_idx"] >= 19) & (features_df["month_idx"] <= 21)].drop(columns=["month_idx"])
    test_df = features_df[features_df["month_idx"] >= 22].drop(columns=["month_idx"])
    
    # Save splits
    train_df.to_csv(processed_dir / "train.csv", index=False)
    val_df.to_csv(processed_dir / "validation.csv", index=False)
    test_df.to_csv(processed_dir / "test.csv", index=False)
    
    print(f"Train set: {len(train_df)} baris")
    print(f"Validation set: {len(val_df)} baris")
    print(f"Test set: {len(test_df)} baris")
    print("Feature engineering selesai.")

if __name__ == "__main__":
    build_features()
