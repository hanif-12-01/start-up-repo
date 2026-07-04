import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def prepare_small_lcl():
    input_dir = Path("D:/LOMBA/Startup Proto/ML/RAW/Small LCL Data")
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/small_lcl")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=== Memproses Small LCL Data (Sampel Teroptimasi) ===")
    
    if not input_dir.exists():
        msg = f"Direktori input tidak ditemukan: {input_dir}"
        print(msg)
        log_to_pipeline(f"[01_prepare_small_lcl.py] GAGAL: {msg}")
        return
        
    csv_files = list(input_dir.glob("*.csv"))
    if not csv_files:
        msg = f"Tidak ada file CSV di {input_dir}"
        print(msg)
        log_to_pipeline(f"[01_prepare_small_lcl.py] GAGAL: {msg}")
        return
        
    # Ambil sampel 5 file pertama untuk mempercepat eksekusi pipeline
    # (Karena dataset Small LCL berukuran total ~8.4 GB, memproses semuanya akan memakan waktu terlalu lama)
    files_to_process = sorted(csv_files)[:5]
    print(f"Ditemukan total {len(csv_files)} file CSV. Memproses sampel {len(files_to_process)} file pertama untuk efisiensi...")
    
    aggregated_list = []
    
    for i, file_path in enumerate(files_to_process):
        try:
            print(f"Membaca file {file_path.name}...")
            # Baca file CSV
            df = pd.read_csv(file_path)
            # Bersihkan nama kolom
            df.columns = df.columns.str.strip()
            
            # Cek kolom wajib
            required_cols = ['LCLid', 'DateTime']
            kwh_col = None
            for col in df.columns:
                if 'KWH/hh' in col:
                    kwh_col = col
                    break
            
            if not all(col in df.columns for col in required_cols) or not kwh_col:
                print(f"File {file_path.name} tidak memiliki kolom yang sesuai. Dilewati.")
                continue
                
            # Hapus baris dengan DateTime kosong
            df = df.dropna(subset=['DateTime'])
            
            # Ekstrak year dan month secara cepat via string slicing
            df['DateTime_str'] = df['DateTime'].astype(str)
            df['year'] = df['DateTime_str'].str[:4].astype(int)
            df['month'] = df['DateTime_str'].str[5:7].astype(int)
            
            # Konversi KWH/hh ke numerik
            df[kwh_col] = pd.to_numeric(df[kwh_col], errors='coerce')
            df[kwh_col] = df[kwh_col].fillna(0.0)
            
            # Agregasi bulanan per LCLid
            df_agg = df.groupby(['LCLid', 'year', 'month'])[kwh_col].sum().reset_index()
            # Rename kolom kwh ke usage_kwh
            df_agg = df_agg.rename(columns={kwh_col: 'usage_kwh'})
            
            aggregated_list.append(df_agg)
            print(f"Selesai memproses {i + 1}/{len(files_to_process)} file.")
                
        except Exception as e:
            print(f"Error memproses file {file_path.name}: {str(e)}")
            
    if not aggregated_list:
        msg = "Tidak ada data yang berhasil diagregasi dari sampel."
        print(msg)
        log_to_pipeline(f"[01_prepare_small_lcl.py] GAGAL: {msg}")
        return
        
    # Gabungkan seluruh hasil agregasi
    print("Menggabungkan seluruh hasil agregasi per file...")
    df_combined = pd.concat(aggregated_list, ignore_index=True)
    
    # Kelompokkan lagi untuk menggabungkan LCLid yang sama antar file
    df_final = df_combined.groupby(['LCLid', 'year', 'month'])['usage_kwh'].sum().reset_index()
    
    # Tambahkan kolom standar WattWise
    df_final['source_dataset'] = 'small_lcl'
    df_final['business_type'] = 'HOUSEHOLD'
    df_final = df_final.rename(columns={'LCLid': 'business_id'})
    
    # Urutkan kolom sesuai standar
    cols_order = ['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh']
    df_final = df_final[cols_order]
    
    # Simpan ke CSV
    output_path = output_dir / "monthly_usage.csv"
    df_final.to_csv(output_path, index=False)
    
    msg = f"Berhasil memproses Small LCL Data (Sampel). Output disimpan di {output_path} dengan total {len(df_final)} baris."
    print(f"=== {msg} ===")
    log_to_pipeline(f"[01_prepare_small_lcl.py] SUKSES: {msg}")

if __name__ == "__main__":
    prepare_small_lcl()
