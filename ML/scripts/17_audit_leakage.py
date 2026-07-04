"""Skrip 17: Audit data leakage pada dataset dan skrip eksperimen LSTM WattWise AI."""

import os
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "ML" / "final_umkm"

def check_chronological_split():
    print("--- 1. Memeriksa Kebocoran Kronologis (Time-Aware Split) ---")
    df_train = pd.read_csv(DATA_DIR / "train.csv")
    df_val = pd.read_csv(DATA_DIR / "validation.csv")
    df_test = pd.read_csv(DATA_DIR / "test.csv")
    
    # Buat representation nilai waktu absolut: year * 12 + month
    df_train["time_index"] = df_train["year"] * 12 + df_train["month"]
    df_val["time_index"] = df_val["year"] * 12 + df_val["month"]
    df_test["time_index"] = df_test["year"] * 12 + df_test["month"]
    
    all_bids = set(df_train["business_id"]).union(df_val["business_id"]).union(df_test["business_id"])
    
    overlaps = []
    
    for bid in all_bids:
        train_times = df_train[df_train["business_id"] == bid]["time_index"].values
        val_times = df_val[df_val["business_id"] == bid]["time_index"].values
        test_times = df_test[df_test["business_id"] == bid]["time_index"].values
        
        # Cek Train vs Val
        if len(train_times) > 0 and len(val_times) > 0:
            if max(train_times) >= min(val_times):
                overlaps.append((bid, "train-validation-overlap", int(max(train_times)), int(min(val_times))))
        
        # Cek Val vs Test
        if len(val_times) > 0 and len(test_times) > 0:
            if max(val_times) >= min(test_times):
                overlaps.append((bid, "validation-test-overlap", int(max(val_times)), int(min(test_times))))
                
        # Cek Train vs Test
        if len(train_times) > 0 and len(test_times) > 0:
            if max(train_times) >= min(test_times):
                overlaps.append((bid, "train-test-overlap", int(max(train_times)), int(min(test_times))))
                
    if len(overlaps) == 0:
        print("[AMAN] Tidak ada kebocoran waktu. Untuk setiap business_id, urutan waktu adalah Train -> Validation -> Test secara berurutan.")
        return True, []
    else:
        print(f"[BAHAYA] Ditemukan {len(overlaps)} overlap waktu antar split!")
        for overlap in overlaps[:5]:
            print(f"  - Business ID: {overlap[0]} | Tipe: {overlap[1]} | Max Past (time_index): {overlap[2]} | Min Future: {overlap[3]}")
        return False, overlaps

def check_target_leakage_in_features():
    print("\n--- 2. Memeriksa Kebocoran Target di Fitur Input ---")
    df_train = pd.read_csv(DATA_DIR / "train.csv")
    
    features = [
        "latest_usage_kwh", "previous_usage_kwh", "avg_3_month_usage_kwh",
        "avg_6_month_usage_kwh", "trend_1_month", "trend_3_month",
        "month_sin", "month_cos", "business_type_encoded", "avg_tariff_idr_per_kwh"
    ]
    target = "next_month_usage_kwh"
    
    leakage = False
    
    # Hitung korelasi dengan target
    for f in features:
        correlation = df_train[f].corr(df_train[target])
        print(f"  - Korelasi {f:<25} dengan target: {correlation:+.4f}")
        
        # Jika korelasi sempurna 1.0 atau -1.0, kemungkinan kebocoran target langsung
        if abs(correlation) > 0.9999:
            print(f"    [BAHAYA] Fitur {f} berkorelasi sempurna dengan target!")
            leakage = True
            
    # Periksa apakah target 'next_month_usage_kwh' ada di dalam list FEATURES
    if target in features:
        print(f"    [BAHAYA] Kolom target {target} secara langsung masuk ke dalam list FEATURES!")
        leakage = True
        
    if not leakage:
        print("[AMAN] Tidak ada indikasi kebocoran target secara langsung pada fitur input.")
        return True
    return False

def check_scaler_leakage():
    print("\n--- 3. Memeriksa Metodologi Scaling pada Training Script ---")
    script_path = ROOT / "ML" / "scripts" / "16_train_lstm_umkm.py"
    
    if not script_path.exists():
        print("[ERROR] Skrip training LSTM tidak ditemukan untuk diaudit.")
        return False
        
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Cek apakah scaler hanya fit pada train set
    fit_on_train = "feature_scaler.fit(df_full.loc[train_rows" in content or "feature_scaler.fit(df_full.loc[df_full[\"split\"] == \"train\"" in content or "feature_scaler.fit(df_full.loc[train_idx" in content
    fit_on_all = "feature_scaler.fit(df_full[" in content or "feature_scaler.fit(df_full_scaled" in content
    
    if fit_on_train and not fit_on_all:
        print("[AMAN] Scaler hanya di-fit pada set training (train_rows / train_idx).")
        return True
    else:
        print("[PERLU DIPERBAIKI] Peringatan: Logika fit pada scaler mencurigakan. Pastikan tidak melakukan fit pada seluruh dataset.")
        return False

def main():
    print("=================== MEMULAI AUDIT DATA LEAKAGE WATTWISE AI ===================")
    
    c1, _ = check_chronological_split()
    c2 = check_target_leakage_in_features()
    c3 = check_scaler_leakage()
    
    print("\n========================= RINGKASAN AUDIT =========================")
    if c1 and c2 and c3:
        print("STATUS VALIDASI LEAKAGE: [AMAN]")
        print("Tidak ada kebocoran waktu, kebocoran target, maupun kebocoran scaling.")
    else:
        print("STATUS VALIDASI LEAKAGE: [PERLU DIPERBAIKI / TIDAK AMAN]")
        print("Silakan periksa detail log di atas untuk perbaikan.")
    print("====================================================================")

if __name__ == "__main__":
    main()
