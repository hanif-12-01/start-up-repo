import os
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def build_features():
    input_path = Path("D:/LOMBA/Startup Proto/ML/processed/combined/monthly_usage_combined.csv")
    output_dir = Path("D:/LOMBA/Startup Proto/ML/final")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=== Memulai Pembangunan Fitur (Feature Engineering) ===")
    
    if not input_path.exists():
        msg = f"File input gabungan tidak ditemukan di {input_path}"
        print(msg)
        log_to_pipeline(f"[07_build_features.py] GAGAL: {msg}")
        return
        
    try:
        # 1. Baca data
        df = pd.read_csv(input_path)
        
        # 2. Urutkan per bisnis dan waktu secara kronologis
        print("Mengurutkan data kronologis...")
        df = df.sort_values(by=['business_id', 'year', 'month']).reset_index(drop=True)
        
        # 3. Bangun fitur time-series
        print("Membangun fitur-fitur lag dan rolling statistics...")
        
        df['latest_usage_kwh'] = df['usage_kwh']
        
        # previous_usage_kwh (lag 1 bulan)
        df['previous_usage_kwh'] = df.groupby('business_id')['usage_kwh'].shift(1)
        
        # avg_3_month_usage_kwh (rolling 3 bulan berjalan)
        df['avg_3_month_usage_kwh'] = df.groupby('business_id')['usage_kwh'].transform(
            lambda x: x.rolling(3, min_periods=1).mean()
        )
        
        # avg_6_month_usage_kwh (rolling 6 bulan berjalan)
        df['avg_6_month_usage_kwh'] = df.groupby('business_id')['usage_kwh'].transform(
            lambda x: x.rolling(6, min_periods=1).mean()
        )
        
        # trend_1_month
        df['trend_1_month'] = (df['latest_usage_kwh'] - df['previous_usage_kwh']) / (df['previous_usage_kwh'] + 1e-5)
        
        # trend_3_month
        df['trend_3_month'] = (df['latest_usage_kwh'] - df['avg_3_month_usage_kwh']) / (df['avg_3_month_usage_kwh'] + 1e-5)
        
        # month_sin & month_cos
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Mapping business_type ke numerik
        type_mapping = {
            'LAUNDRY': 0,
            'FNB': 1,
            'RETAIL': 2,
            'MANUFACTURE': 3,
            'COLD_STORAGE': 4,
            'HOUSEHOLD': 5,
            'OTHER': 6
        }
        df['business_type_encoded'] = df['business_type'].map(type_mapping).fillna(6).astype(int)
        
        # Tarif konstan PLN
        df['avg_tariff_idr_per_kwh'] = 1444.70
        
        # next_month_usage_kwh (target)
        df['next_month_usage_kwh'] = df.groupby('business_id')['usage_kwh'].shift(-1)
        
        # next_month_cost_idr (target biaya)
        df['next_month_cost_idr'] = df['next_month_usage_kwh'] * df['avg_tariff_idr_per_kwh']
        
        # 4. Bersihkan data
        print("Membersihkan baris data dengan target/lag kosong...")
        # Hapus target kosong (baris terakhir histori)
        df = df.dropna(subset=['next_month_usage_kwh'])
        # Hapus data lag penting yang kosong (baris pertama histori)
        df = df.dropna(subset=['previous_usage_kwh'])
        
        # Atur urutan kolom sesuai kamus data
        cols_order = [
            'source_dataset', 'business_id', 'business_type', 'business_type_encoded',
            'year', 'month', 'latest_usage_kwh', 'previous_usage_kwh',
            'avg_3_month_usage_kwh', 'avg_6_month_usage_kwh',
            'trend_1_month', 'trend_3_month', 'month_sin', 'month_cos',
            'avg_tariff_idr_per_kwh', 'next_month_usage_kwh', 'next_month_cost_idr'
        ]
        df_final = df[cols_order]
        
        # Simpan seluruh fitur ke CSV
        features_csv_path = output_dir / "wattwise_features.csv"
        df_final.to_csv(features_csv_path, index=False)
        print(f"Dataset fitur lengkap disimpan di {features_csv_path}")
        
        # 5. Split data per business_id secara time-aware
        print("Melakukan group-wise time-aware split per business_id...")
        
        train_rows = []
        val_rows = []
        test_rows = []
        
        # Urutkan secara global terlebih dahulu untuk konsistensi, lalu groupby business_id
        for bid, group in df_final.groupby('business_id', sort=False):
            # 1. Urutkan berdasarkan year dan month
            group_sorted = group.sort_values(by=['year', 'month']).copy()
            n_group = len(group_sorted)
            
            if n_group >= 10:
                # 70% train, 15% validation, 15% test
                train_end = int(0.70 * n_group)
                val_end = train_end + int(0.15 * n_group)
                # handle rounding edge cases by assigning remainder to test
                
                train_rows.append(group_sorted.iloc[:train_end])
                val_rows.append(group_sorted.iloc[train_end:val_end])
                test_rows.append(group_sorted.iloc[val_end:])
            elif 5 <= n_group <= 9:
                # mayoritas awal masuk train, minimal 1 baris masuk validation, minimal 1 baris masuk test
                # Misal n_group = 5: train=3, val=1, test=1
                # n_group = 6: train=4, val=1, test=1
                # n_group = 7: train=5, val=1, test=1
                # n_group = 8: train=6, val=1, test=1
                # n_group = 9: train=7, val=1, test=1
                # Jadi val=1, test=1, train = n_group - 2
                train_end = n_group - 2
                train_rows.append(group_sorted.iloc[:train_end])
                val_rows.append(group_sorted.iloc[train_end:train_end+1])
                test_rows.append(group_sorted.iloc[train_end+1:])
            else:
                # Jika jumlah baris terlalu sedikit ( < 5 ), tetap masukkan ke train agar tidak hilang
                train_rows.append(group_sorted)
        
        # Gabungkan split
        df_train = pd.concat(train_rows, ignore_index=True) if train_rows else pd.DataFrame(columns=df_final.columns)
        df_val = pd.concat(val_rows, ignore_index=True) if val_rows else pd.DataFrame(columns=df_final.columns)
        df_test = pd.concat(test_rows, ignore_index=True) if test_rows else pd.DataFrame(columns=df_final.columns)
        
        # Simpan split data
        df_train.to_csv(output_dir / "train.csv", index=False)
        df_val.to_csv(output_dir / "validation.csv", index=False)
        df_test.to_csv(output_dir / "test.csv", index=False)
        
        # Print distribusi
        print("\n=== Distribusi Split ===")
        print(f"Train: {len(df_train)} baris")
        print(f"Validation: {len(df_val)} baris")
        print(f"Test: {len(df_test)} baris")
        
        print("\nValue Counts Business Type Train:")
        print(df_train['business_type'].value_counts())
        print("\nValue Counts Business Type Validation:")
        print(df_val['business_type'].value_counts())
        print("\nValue Counts Business Type Test:")
        print(df_test['business_type'].value_counts())
        
        print("\nMissing Values Train:")
        print(df_train.isnull().sum())
        print("\nMissing Values Validation:")
        print(df_val.isnull().sum())
        print("\nMissing Values Test:")
        print(df_test.isnull().sum())
        
        # Log ke pipeline
        msg = (f"Pembangunan fitur selesai. Total data: {len(df_final)} baris. "
               f"Split hasil: Train={len(df_train)} baris, Val={len(df_val)} baris, Test={len(df_test)} baris.")
        print(f"\n=== {msg} ===")
        
        # Tulis log terperinci ke pipeline_log.md
        log_content = (
            f"[07_build_features.py] SUKSES: {msg}\n"
            f"  - Train: {len(df_train)} baris\n"
            f"  - Validation: {len(df_val)} baris\n"
            f"  - Test: {len(df_test)} baris\n"
            f"  - Business Type Distrib (Train/Val/Test):\n"
            f"    - LAUNDRY: {df_train[df_train['business_type']=='LAUNDRY'].shape[0]} / {df_val[df_val['business_type']=='LAUNDRY'].shape[0]} / {df_test[df_test['business_type']=='LAUNDRY'].shape[0]}\n"
            f"    - FNB: {df_train[df_train['business_type']=='FNB'].shape[0]} / {df_val[df_val['business_type']=='FNB'].shape[0]} / {df_test[df_test['business_type']=='FNB'].shape[0]}\n"
            f"    - RETAIL: {df_train[df_train['business_type']=='RETAIL'].shape[0]} / {df_val[df_val['business_type']=='RETAIL'].shape[0]} / {df_test[df_test['business_type']=='RETAIL'].shape[0]}\n"
            f"    - MANUFACTURE: {df_train[df_train['business_type']=='MANUFACTURE'].shape[0]} / {df_val[df_val['business_type']=='MANUFACTURE'].shape[0]} / {df_test[df_test['business_type']=='MANUFACTURE'].shape[0]}\n"
            f"    - COLD_STORAGE: {df_train[df_train['business_type']=='COLD_STORAGE'].shape[0]} / {df_val[df_val['business_type']=='COLD_STORAGE'].shape[0]} / {df_test[df_test['business_type']=='COLD_STORAGE'].shape[0]}\n"
            f"    - OTHER: {df_train[df_train['business_type']=='OTHER'].shape[0]} / {df_val[df_val['business_type']=='OTHER'].shape[0]} / {df_test[df_test['business_type']=='OTHER'].shape[0]}"
        )
        log_to_pipeline(log_content)
        
    except Exception as e:
        msg = f"Error saat melakukan feature engineering: {str(e)}"
        print(msg)
        log_to_pipeline(f"[07_build_features.py] GAGAL: {msg}")

if __name__ == "__main__":
    build_features()
