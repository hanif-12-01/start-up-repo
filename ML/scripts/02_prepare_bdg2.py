import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def prepare_bdg2():
    raw_dir = Path("D:/LOMBA/Startup Proto/ML/RAW/Building Data Genome Project 2/building-data-genome-project-2/data")
    metadata_path = raw_dir / "metadata" / "metadata.csv"
    electricity_path = raw_dir / "meters" / "cleaned" / "electricity_cleaned.csv"
    
    output_dir = Path("D:/LOMBA/Startup Proto/ML/processed/bdg2")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=== Memproses Building Data Genome Project 2 ===")
    
    if not metadata_path.exists() or not electricity_path.exists():
        msg = f"File metadata atau electricity tidak ditemukan di {raw_dir}"
        print(msg)
        log_to_pipeline(f"[02_prepare_bdg2.py] GAGAL: {msg}")
        return
        
    try:
        # 1. Baca metadata
        print("Membaca metadata bangunan...")
        df_meta = pd.read_csv(metadata_path)
        
        # 2. Baca data meter listrik
        print("Membaca data meter listrik (ini mungkin butuh beberapa detik)...")
        df_elec = pd.read_csv(electricity_path)
        
        # 3. Proses timestamp dan ekstrak year/month
        print("Memproses timestamp...")
        df_elec['timestamp'] = pd.to_datetime(df_elec['timestamp'], errors='coerce')
        df_elec = df_elec.dropna(subset=['timestamp'])
        df_elec['year'] = df_elec['timestamp'].dt.year
        df_elec['month'] = df_elec['timestamp'].dt.month
        df_elec = df_elec.drop(columns=['timestamp'])
        
        # 4. Agregasi bulanan per gedung (Wide data aggregation)
        print("Mengagregasikan data level bulanan (Wide)...")
        df_agg_wide = df_elec.groupby(['year', 'month']).sum()
        
        # 5. Stack wide data ke long format
        print("Mereshape data dari Wide ke Long...")
        df_long = df_agg_wide.stack().reset_index()
        df_long.columns = ['year', 'month', 'building_id', 'usage_kwh']
        
        # 6. Bersihkan data usage_kwh
        df_long['usage_kwh'] = pd.to_numeric(df_long['usage_kwh'], errors='coerce')
        df_long = df_long.dropna(subset=['usage_kwh'])
        
        # 7. Merge dengan metadata untuk mendapatkan tipe bangunan
        print("Menggabungkan data meter dengan metadata...")
        df_merged = pd.merge(df_long, df_meta[['building_id', 'primaryspaceusage']], on='building_id', how='left')
        
        # 8. Mapping tipe bangunan ke tipe UMKM WattWise
        print("Memetakan kategori bangunan ke tipe UMKM...")
        mapping = {
            'Retail': 'RETAIL',
            'Food service': 'FNB',
            'Food sales': 'FNB',
            'Warehouse': 'COLD_STORAGE',
            'Industrial': 'MANUFACTURE',
            'Manufacturing': 'MANUFACTURE',
            'Office': 'OTHER',
            'Education': 'OTHER',
            'Lodging': 'OTHER',
            'Other': 'OTHER'
        }
        
        df_merged['business_type'] = df_merged['primaryspaceusage'].map(mapping).fillna('OTHER')
        
        # 9. Standarisasi kolom
        df_merged['source_dataset'] = 'bdg2'
        df_merged = df_merged.rename(columns={'building_id': 'business_id'})
        
        cols_order = ['source_dataset', 'business_id', 'business_type', 'year', 'month', 'usage_kwh']
        df_final = df_merged[cols_order]
        
        # 10. Simpan output ke CSV
        output_path = output_dir / "monthly_usage.csv"
        df_final.to_csv(output_path, index=False)
        
        msg = f"Berhasil memproses BDG2. Output disimpan di {output_path} dengan total {len(df_final)} baris."
        print(f"=== {msg} ===")
        log_to_pipeline(f"[02_prepare_bdg2.py] SUKSES: {msg}")
        
    except Exception as e:
        msg = f"Error saat memproses BDG2: {str(e)}"
        print(msg)
        log_to_pipeline(f"[02_prepare_bdg2.py] GAGAL: {msg}")

if __name__ == "__main__":
    prepare_bdg2()
