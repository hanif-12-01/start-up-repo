import os
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_to_pipeline(message):
    log_path = Path("D:/LOMBA/Startup Proto/ML/docs/pipeline_log.md")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")

def inspect_datasets():
    raw_dir = Path("D:/LOMBA/Startup Proto/ML/RAW")
    output_dir = Path("D:/LOMBA/Startup Proto/ML/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    inventory_data = []
    
    print("=== Memulai Inspeksi Dataset Mentah ===")
    
    if not raw_dir.exists():
        msg = f"Direktori RAW tidak ditemukan di {raw_dir}"
        print(msg)
        log_to_pipeline(f"[00_inspect_raw_datasets.py] GAGAL: {msg}")
        return
        
    # Scan all directories in RAW
    for folder in raw_dir.iterdir():
        if folder.is_dir():
            print(f"\nMemeriksa folder: {folder.name}")
            files = list(folder.rglob("*"))
            
            if not files:
                print(f"Folder {folder.name} kosong.")
                inventory_data.append({
                    "dataset_folder": folder.name,
                    "file_name": "",
                    "file_path": str(folder),
                    "file_extension": "",
                    "file_size_mb": 0.0,
                    "can_preview": "No",
                    "columns_preview": "",
                    "notes": "Folder kosong"
                })
                continue
                
            for file in files:
                if file.is_file():
                    file_size_mb = file.stat().st_size / (1024 * 1024)
                    ext = file.suffix.lower()
                    
                    can_preview = "No"
                    columns_preview = ""
                    notes = ""
                    
                    # Deteksi ekstensi file yang valid
                    valid_extensions = ['.csv', '.zip', '.xlsx', '.parquet', '.txt']
                    if ext not in valid_extensions:
                        notes = f"Ekstensi file tidak umum: {ext}"
                    
                    if ext == '.csv':
                        try:
                            # Baca 5 baris pertama untuk preview
                            df_temp = pd.read_csv(file, nrows=5)
                            can_preview = "Yes"
                            columns_preview = ";".join(df_temp.columns.tolist())
                            notes = f"Jumlah kolom: {len(df_temp.columns)}"
                        except Exception as e:
                            notes = f"Gagal preview CSV: {str(e)}"
                    elif ext == '.zip':
                        notes = "File zip terkompresi"
                    elif ext == '.xlsx':
                        notes = "File Excel spreadsheet"
                    elif ext == '.parquet':
                        notes = "File Parquet kolumnar"
                    elif ext == '.txt':
                        notes = "File teks"
                    
                    print(f"- File: {file.name} ({file_size_mb:.2f} MB)")
                    
                    inventory_data.append({
                        "dataset_folder": folder.name,
                        "file_name": file.name,
                        "file_path": str(file),
                        "file_extension": ext,
                        "file_size_mb": round(file_size_mb, 2),
                        "can_preview": can_preview,
                        "columns_preview": columns_preview,
                        "notes": notes
                    })
                    
    df_inventory = pd.DataFrame(inventory_data)
    inventory_csv_path = output_dir / "raw_dataset_inventory.csv"
    df_inventory.to_csv(inventory_csv_path, index=False)
    
    msg = f"Inventaris dataset berhasil dibuat di {inventory_csv_path}"
    print(f"\n=== {msg} ===")
    log_to_pipeline(f"[00_inspect_raw_datasets.py] SUKSES: {msg}. Berhasil mengidentifikasi {len(df_inventory)} entri.")

if __name__ == "__main__":
    inspect_datasets()
