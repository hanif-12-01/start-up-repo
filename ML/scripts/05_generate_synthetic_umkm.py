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

def generate_synthetic_umkm():
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/combined")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    np.random.seed(42)  # Supaya hasil konsisten
    
    # Konfigurasi UMKM
    business_types = ['LAUNDRY', 'FNB', 'RETAIL', 'MANUFACTURE', 'COLD_STORAGE', 'OTHER']
    baselines = {
        'LAUNDRY': (650, 900),
        'FNB': (400, 700),
        'RETAIL': (300, 500),
        'MANUFACTURE': (800, 1100),
        'COLD_STORAGE': (1000, 1400),
        'OTHER': (250, 450)
    }
    
    num_businesses = 500
    months_count = 24  # 2 tahun (misal: 2024 dan 2025)
    
    data = []
    
    print("=== Membuat Data Sintetis UMKM WattWise ===")
    
    for b_idx in range(1, num_businesses + 1):
        # Tentukan tipe bisnis secara acak
        b_type = np.random.choice(business_types)
        b_id = f"UMKM_{b_type}_{b_idx:03d}"
        
        # Tentukan baseline spesifik untuk bisnis ini (agar bervariasi antar bisnis)
        low, high = baselines[b_type]
        base_kwh = np.random.uniform(low, high)
        
        # Faktor tren (misal 1% sampai 3% kenaikan per tahun)
        trend_factor = np.random.uniform(0.01, 0.03)
        
        # Faktor seasonality (misalnya konsumsi naik di bulan-bulan panas seperti Juli-September,
        # atau perayaan besar seperti April/Desember)
        # Kita definisikan indeks musiman per bulan (1-12)
        season_indices = {
            1: 0.98, 2: 0.96, 3: 1.00, 4: 1.05, 5: 1.02, 6: 0.99,
            7: 1.03, 8: 1.06, 9: 1.04, 10: 1.01, 11: 0.98, 12: 1.02
        }
        
        # Generate data historis 24 bulan (Tahun 2024 & 2025)
        month_idx = 0
        for year in [2024, 2025]:
            for month in range(1, 13):
                # Hitung tren waktu
                time_trend = 1 + (month_idx / 12) * trend_factor
                
                # Konsumsi dasar dengan tren dan musiman
                val = base_kwh * time_trend * season_indices[month]
                
                # Tambahkan noise gaussian realistis (~5%)
                noise = np.random.normal(0, 0.05 * val)
                val += noise
                
                # Tambahkan anomali kecil secara acak (~2% probabilitas ada lonjakan/penurunan tajam)
                if np.random.rand() < 0.02:
                    anomaly_type = np.random.choice(['spike', 'drop'])
                    if anomaly_type == 'spike':
                        val *= np.random.uniform(1.2, 1.4)  # Lonjakan 20-40%
                    else:
                        val *= np.random.uniform(0.6, 0.8)  # Penurunan 20-40%
                
                # Pastikan tidak ada nilai negatif
                val = max(10.0, val)
                
                data.append({
                    'source_dataset': 'synthetic_umkm',
                    'business_id': b_id,
                    'business_type': b_type,
                    'year': year,
                    'month': month,
                    'usage_kwh': round(val, 2)
                })
                
                month_idx += 1
                
    df_synthetic = pd.DataFrame(data)
    output_path = output_dir / "synthetic_umkm_monthly_usage.csv"
    df_synthetic.to_csv(output_path, index=False)
    
    msg = f"Berhasil men-generate {num_businesses} bisnis sintetis dengan histori 24 bulan. Total {len(df_synthetic)} baris disimpan di {output_path}."
    print(f"=== {msg} ===")
    log_to_pipeline(f"[05_generate_synthetic_umkm.py] SUKSES: {msg}")

if __name__ == "__main__":
    generate_synthetic_umkm()
