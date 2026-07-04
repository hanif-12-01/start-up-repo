import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def combine_monthly_usage():
    base_dir = Path("D:/LOMBA/Startup Proto/ML/processed")
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/combined")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    dataset_paths = {
        'small_lcl': base_dir / "small_lcl" / "monthly_usage.csv",
        'bdg2': base_dir / "bdg2" / "monthly_usage.csv",
        'ashrae': base_dir / "ashrae" / "monthly_usage.csv",
        'london_lcl': base_dir / "london_lcl" / "monthly_usage.csv",
        'synthetic_umkm': base_dir / "combined" / "synthetic_umkm_monthly_usage.csv"
    }
    
    print("=== Menggabungkan Dataset Bulanan ===")
    
    dfs_to_combine = []
    summary_parts = []
    
    for name, path in dataset_paths.items():
        if path.exists():
            print(f"Membaca dataset {name} dari {path.name}...")
            try:
                df = pd.read_csv(path)
                if not df.empty:
                    # Pastikan kolom-kolom yang diperlukan ada
                    required_cols = ['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh']
                    # Jika kolom source_dataset belum ada, tambahkan
                    if 'source_dataset' not in df.columns:
                        df['source_dataset'] = name
                    
                    # Cek kesesuaian kolom
                    if all(col in df.columns for col in required_cols):
                        df_filtered = df[required_cols]
                        dfs_to_combine.append(df_filtered)
                        summary_parts.append(f"{name} ({len(df_filtered)} baris)")
                    else:
                        print(f"Kolom pada {name} tidak lengkap. Dilewati.")
                else:
                    print(f"Dataset {name} kosong.")
            except Exception as e:
                print(f"Error membaca {name}: {str(e)}")
        else:
            print(f"Dataset {name} belum siap atau tidak ditemukan di {path}")
            
    if not dfs_to_combine:
        msg = "Tidak ada dataset yang tersedia untuk digabungkan."
        print(msg)
        log_to_pipeline(f"[06_combine_monthly_usage.py] GAGAL: {msg}")
        return
        
    # Gabungkan seluruh DataFrame
    print("Menggabungkan seluruh DataFrame...")
    df_combined = pd.concat(dfs_to_combine, ignore_index=True)
    
    # Hapus baris yang usage_kwh kosong atau <= 0
    initial_len = len(df_combined)
    df_combined['usage_kwh'] = pd.to_numeric(df_combined['usage_kwh'], errors='coerce')
    df_combined = df_combined.dropna(subset=['usage_kwh'])
    df_combined = df_combined[df_combined['usage_kwh'] > 0]
    cleaned_len = len(df_combined)
    
    # Simpan output
    output_path = output_dir / "monthly_usage_combined.csv"
    df_combined.to_csv(output_path, index=False)
    
    datasets_str = ", ".join(summary_parts)
    msg = f"Berhasil menggabungkan dataset. Input: {datasets_str}. Total baris awal: {initial_len}, dibersihkan menjadi {cleaned_len} baris. Output disimpan di {output_path}."
    print(f"=== {msg} ===")
    log_to_pipeline(f"[06_combine_monthly_usage.py] SUKSES: {msg}")

if __name__ == "__main__":
    combine_monthly_usage()
