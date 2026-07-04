import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def prepare_ashrae():
    raw_dir = Path("D:/LOMBA/Startup Proto/ML/RAW/ashrae-energy-prediction")
    metadata_path = raw_dir / "building_metadata.csv"
    train_path = raw_dir / "train.csv"
    
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/ashrae")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=== Memproses ASHRAE Energy Prediction ===")
    
    if not metadata_path.exists() or not train_path.exists():
        msg = f"File metadata atau train tidak ditemukan di {raw_dir}"
        print(msg)
        log_to_pipeline(f"[03_prepare_ashrae.py] GAGAL: {msg}")
        return
        
    try:
        # 1. Baca metadata
        print("Membaca metadata bangunan...")
        df_meta = pd.read_csv(metadata_path)
        
        # 2. Baca data train menggunakan chunking (karena file berukuran ~678 MB)
        print("Membaca dan memfilter data meter listrik (train.csv) secara chunk...")
        chunk_size = 2000000  # 2 juta baris per chunk
        chunks_list = []
        
        chunk_idx = 1
        for chunk in pd.read_csv(train_path, chunksize=chunk_size):
            # Filter meter == 0 (electricity)
            chunk_filtered = chunk[chunk['meter'] == 0].copy()
            
            if not chunk_filtered.empty:
                # Konversi timestamp ke datetime
                chunk_filtered['timestamp'] = pd.to_datetime(chunk_filtered['timestamp'], errors='coerce')
                chunk_filtered = chunk_filtered.dropna(subset=['timestamp'])
                
                # Ekstrak year dan month
                chunk_filtered['year'] = chunk_filtered['timestamp'].dt.year
                chunk_filtered['month'] = chunk_filtered['timestamp'].dt.month
                
                # Konversi meter_reading ke numerik
                chunk_filtered['meter_reading'] = pd.to_numeric(chunk_filtered['meter_reading'], errors='coerce')
                chunk_filtered['meter_reading'] = chunk_filtered['meter_reading'].fillna(0.0)
                
                # Agregasi per chunk
                chunk_agg = chunk_filtered.groupby(['building_id', 'year', 'month'])['meter_reading'].sum().reset_index()
                chunks_list.append(chunk_agg)
                
            print(f"Selesai memproses chunk ke-{chunk_idx}...")
            chunk_idx += 1
            
        if not chunks_list:
            msg = "Tidak ada data meter listrik (meter == 0) yang ditemukan."
            print(msg)
            log_to_pipeline(f"[03_prepare_ashrae.py] GAGAL: {msg}")
            return
            
        # 3. Gabungkan seluruh chunk
        print("Menggabungkan seluruh hasil agregasi chunk...")
        df_combined = pd.concat(chunks_list, ignore_index=True)
        df_agg_final = df_combined.groupby(['building_id', 'year', 'month'])['meter_reading'].sum().reset_index()
        
        # 4. Merge dengan metadata
        print("Menggabungkan data meter dengan metadata...")
        df_merged = pd.merge(df_agg_final, df_meta[['building_id', 'primary_use']], on='building_id', how='left')
        
        # 5. Mapping primary_use ke tipe UMKM WattWise
        print("Memetakan kategori bangunan ke tipe UMKM...")
        mapping = {
            'Retail': 'RETAIL',
            'Food sales': 'FNB',
            'Food service': 'FNB',
            'Warehouse/storage': 'COLD_STORAGE',
            'Manufacturing/industrial': 'MANUFACTURE',
            'Office': 'OTHER',
            'Education': 'OTHER',
            'Lodging': 'OTHER',
            'Healthcare': 'OTHER',
            'Public services': 'OTHER',
            'Other': 'OTHER'
        }
        df_merged['business_type'] = df_merged['primary_use'].map(mapping).fillna('OTHER')
        
        # 6. Standarisasi kolom
        df_merged['source_dataset'] = 'ashrae'
        df_merged = df_merged.rename(columns={'building_id': 'business_id', 'meter_reading': 'usage_kwh'})
        
        cols_order = ['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh']
        df_final = df_merged[cols_order]
        
        # 7. Simpan output ke CSV
        output_path = output_dir / "monthly_usage.csv"
        df_final.to_csv(output_path, index=False)
        
        msg = f"Berhasil memproses ASHRAE. Output disimpan di {output_path} dengan total {len(df_final)} baris."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[03_prepare_ashrae.py] SUKSES: {msg}")
        
    except Exception as e:
        msg = f"Error saat memproses ASHRAE: {str(e)}"
        print(msg)
        log_to_pipeline(f"[03_prepare_ashrae.py] GAGAL: {msg}")

if __name__ == "__main__":
    prepare_ashrae()
