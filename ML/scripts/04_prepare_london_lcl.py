import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def prepare_london_lcl():
    input_dir = Path("D:/LOMBA/Startup Proto/ML/RAW/low-carbon-london-data")
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/london_lcl")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = output_dir / "monthly_usage.csv"
    
    print("=== Memproses Low Carbon London Data ===")
    
    # Graceful handling jika folder input tidak ada atau kosong
    if not input_dir.exists() or not any(input_dir.iterdir()):
        msg = f"Direktori input kosong atau tidak ditemukan: {input_dir}. Membuat file placeholder kosong."
        print(msg)
        log_to_pipeline(f"[04_prepare_london_lcl.py] PERINGATAN: {msg}")
        
        # Buat file CSV kosong dengan header yang tepat
        df_empty = pd.DataFrame(columns=['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh'])
        df_empty.to_csv(output_path, index=False)
        print(f"File placeholder dibuat di {output_path}")
        return
        
    try:
        # Jika folder tidak kosong (misal di masa depan ditaruh file)
        csv_files = list(input_dir.glob("*.csv"))
        if not csv_files:
            msg = "Tidak ada file CSV ditemukan meskipun folder tidak kosong. Membuat file placeholder kosong."
            print(msg)
            log_to_pipeline(f"[04_prepare_london_lcl.py] PERINGATAN: {msg}")
            df_empty = pd.DataFrame(columns=['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh'])
            df_empty.to_csv(output_path, index=False)
            return
            
        print(f"Ditemukan {len(csv_files)} file CSV. Memproses sample maksimal 5 file untuk eksperimen...")
        files_to_process = csv_files[:5]
        
        aggregated_list = []
        for file_path in files_to_process:
            print(f"Memproses {file_path.name}...")
            df = pd.read_csv(file_path)
            df.columns = df.columns.str.strip()
            
            # Cek kolom yang umum pada LCL dataset
            # Biasanya kolom: LCLid, DateTime, KWH/hh (per half hour)
            required_cols = ['LCLid', 'DateTime']
            kwh_col = None
            for col in df.columns:
                if 'KWH/hh' in col:
                    kwh_col = col
                    break
                    
            if not all(col in df.columns for col in required_cols) or not kwh_col:
                print(f"Kolom tidak cocok pada file {file_path.name}. Dilewati.")
                continue
                
            df['DateTime'] = pd.to_datetime(df['DateTime'], errors='coerce')
            df = df.dropna(subset=['DateTime'])
            df['year'] = df['DateTime'].dt.year
            df['month'] = df['DateTime'].dt.month
            
            df[kwh_col] = pd.to_numeric(df[kwh_col], errors='coerce')
            df[kwh_col] = df[kwh_col].fillna(0.0)
            
            df_agg = df.groupby(['LCLid', 'year', 'month'])[kwh_col].sum().reset_index()
            df_agg = df_agg.rename(columns={kwh_col: 'usage_kwh'})
            
            aggregated_list.append(df_agg)
            
        if not aggregated_list:
            msg = "Gagal memproses file LCL. Membuat file placeholder kosong."
            print(msg)
            log_to_pipeline(f"[04_prepare_london_lcl.py] PERINGATAN: {msg}")
            df_empty = pd.DataFrame(columns=['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh'])
            df_empty.to_csv(output_path, index=False)
            return
            
        df_combined = pd.concat(aggregated_list, ignore_index=True)
        df_final = df_combined.groupby(['LCLid', 'year', 'month'])['usage_kwh'].sum().reset_index()
        
        df_final['source_dataset'] = 'london_lcl'
        df_final['business_type'] = 'HOUSEHOLD'
        df_final = df_final.rename(columns={'LCLid': 'business_id'})
        
        cols_order = ['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh']
        df_final = df_final[cols_order]
        
        df_final.to_csv(output_path, index=False)
        msg = f"Berhasil memproses Low Carbon London (Sample). Output disimpan di {output_path} dengan total {len(df_final)} baris."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[04_prepare_london_lcl.py] SUKSES: {msg}")
        
    except Exception as e:
        msg = f"Error saat memproses London LCL: {str(e)}"
        print(msg)
        log_to_pipeline(f"[04_prepare_london_lcl.py] GAGAL: {msg}")
        # Buat placeholder kosong agar pipeline tetap aman
        df_empty = pd.DataFrame(columns=['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh'])
        df_empty.to_csv(output_path, index=False)

if __name__ == "__main__":
    prepare_london_lcl()
