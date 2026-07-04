import csv
import random
import math
from pathlib import Path

def generate_data():
    # Setup path
    base_dir = Path(__file__).resolve().parent.parent
    raw_dir = base_dir / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    # Set seed untuk reproducible results
    random.seed(42)
    
    # Business types & baseline ranges
    # baseline range kWh/bulan:
    # LAUNDRY: 650–900
    # FNB: 400–700
    # RETAIL: 300–500
    # MANUFACTURE: 800–1100
    # COLD_STORAGE: 1000–1400
    # OTHER: 250–450
    business_configs = {
        "LAUNDRY": {"min_kwh": 650, "max_kwh": 900, "va_options": [2200, 3500, 4400, 5500, 6600], "appliance_count": (8, 15), "hours": (10, 16)},
        "FNB": {"min_kwh": 400, "max_kwh": 700, "va_options": [1300, 2200, 3500, 4400, 5500], "appliance_count": (5, 12), "hours": (12, 18)},
        "RETAIL": {"min_kwh": 300, "max_kwh": 500, "va_options": [900, 1300, 2200, 3500, 4400], "appliance_count": (4, 10), "hours": (10, 15)},
        "MANUFACTURE": {"min_kwh": 800, "max_kwh": 1100, "va_options": [4400, 5500, 6600, 10600, 13200], "appliance_count": (12, 25), "hours": (8, 24)},
        "COLD_STORAGE": {"min_kwh": 1000, "max_kwh": 1400, "va_options": [5500, 6600, 10600, 13200, 16500], "appliance_count": (6, 12), "hours": (24, 24)},
        "OTHER": {"min_kwh": 250, "max_kwh": 450, "va_options": [900, 1300, 2200, 3500], "appliance_count": (3, 8), "hours": (8, 12)},
    }
    
    # 500 businesses
    num_businesses = 500
    businesses = []
    
    # Output file paths
    biz_path = raw_dir / "synthetic_businesses.csv"
    elec_path = raw_dir / "synthetic_electricity_entries.csv"
    
    # Tariff IDR per kWh (PLN 2026 estimation/realistic)
    # Umumnya Rp 1444.70 atau Rp 1699.53 tergantung golongan daya
    # R1: 900VA (subsidi Rp 605/kwh atau non-subsidi Rp 1352/kwh)
    # R1/B1: 1300VA ke atas Rp 1444.70 s/d Rp 1699.53
    
    with open(biz_path, mode="w", newline="", encoding="utf-8") as f_biz:
        writer_biz = csv.writer(f_biz)
        writer_biz.writerow([
            "business_id", "business_type", "power_va", "operating_hours", 
            "appliance_count", "highest_appliance_watt", "avg_tariff_idr_per_kwh"
        ])
        
        for i in range(1, num_businesses + 1):
            biz_id = f"BIZ_{i:03d}"
            b_type = random.choice(list(business_configs.keys()))
            cfg = business_configs[b_type]
            
            power_va = random.choice(cfg["va_options"])
            op_hours = random.randint(cfg["hours"][0], cfg["hours"][1])
            app_count = random.randint(cfg["appliance_count"][0], cfg["appliance_count"][1])
            
            # Tentukan tarif listrik rupiah/kWh berdasarkan VA
            if power_va <= 900:
                avg_tariff = 1352.0
            elif power_va <= 2200:
                avg_tariff = 1444.70
            else:
                avg_tariff = 1699.53
                
            # Highest appliance watt depends on business type and VA
            if b_type == "COLD_STORAGE" or b_type == "MANUFACTURE":
                highest_watt = random.randint(1200, int(power_va * 0.4))
            elif b_type == "LAUNDRY":
                highest_watt = random.randint(800, int(power_va * 0.4))
            else:
                highest_watt = random.randint(300, min(1500, int(power_va * 0.4)))
                
            writer_biz.writerow([
                biz_id, b_type, power_va, op_hours, app_count, highest_watt, avg_tariff
            ])
            
            businesses.append({
                "id": biz_id,
                "type": b_type,
                "power_va": power_va,
                "op_hours": op_hours,
                "app_count": app_count,
                "highest_watt": highest_watt,
                "avg_tariff": avg_tariff,
                "min_kwh": cfg["min_kwh"],
                "max_kwh": cfg["max_kwh"]
            })

    print(f"Berhasil membuat {num_businesses} data business di {biz_path}")
    
    # Generate 24 bulan electricity entries
    # Month 1 - 24
    with open(elec_path, mode="w", newline="", encoding="utf-8") as f_elec:
        writer_elec = csv.writer(f_elec)
        writer_elec.writerow([
            "business_id", "year", "month", "usage_kwh", "cost_idr", 
            "appliance_expected_kwh", "anomaly_count"
        ])
        
        for biz in businesses:
            # Baseline usage untuk bisnis ini
            base_kwh = random.uniform(biz["min_kwh"], biz["max_kwh"])
            
            # Trend jangka panjang (pertumbuhan bisnis pelan-pelan)
            # Misalnya trend naik/turun -2% s/d +5% per tahun
            trend_slope = random.uniform(-0.002, 0.005)
            
            # Seasonality bulanan (misal akhir tahun naik atau saat musim tertentu di Indonesia: kemarau vs hujan)
            # Bulan 6-8 (kemarau/panas -> AC bekerja lebih keras) -> seasonality +5-10%
            # Bulan 11-12 (liburan/akhir tahun) -> seasonality +3-7%
            
            for m_idx in range(1, 25):
                # Hitung tahun dan bulan
                # Bulan 1 = Jan Year 1, Bulan 24 = Dec Year 2
                year = 2024 + (m_idx - 1) // 12
                month = (m_idx - 1) % 12 + 1
                
                # Seasonality factor
                season_factor = 1.0
                if month in [6, 7, 8]: # Bulan panas
                    season_factor += random.uniform(0.04, 0.08)
                elif month in [11, 12]: # Akhir tahun / tahun baru
                    season_factor += random.uniform(0.03, 0.06)
                elif month in [3, 4]: # Bulan tenang
                    season_factor -= random.uniform(0.02, 0.05)
                    
                # Trend factor
                trend_factor = 1.0 + (trend_slope * m_idx)
                
                # Noise realistis (-5% s/d 5%)
                noise = random.uniform(-0.05, 0.05)
                
                # Hitung usage
                usage_kwh = base_kwh * trend_factor * season_factor * (1.0 + noise)
                
                # Appliance expected kwh (estimasi berdasarkan jumlah alat dan jam kerja)
                # Misal appliance_expected_kwh ~ 0.8 s/d 1.1 dari actual usage
                appliance_expected_kwh = usage_kwh * random.uniform(0.8, 1.1)
                
                # Anomaly count & anomali kwh (misal kebocoran arus, alat rusak, atau event khusus)
                # Peluang anomali 3% per bulan
                anomaly_count = 0
                if random.random() < 0.03:
                    anomaly_count = random.randint(1, 3)
                    # Jika ada anomali, konsumsi naik drastis (misal 15% - 40%)
                    usage_kwh *= random.uniform(1.15, 1.40)
                    
                # Pastikan tidak melebihi kapasitas maksimum listrik (VA * 24 jam * 30 hari / 1000)
                max_possible_kwh = (biz["power_va"] * biz["op_hours"] * 30) / 1000.0
                if usage_kwh > max_possible_kwh * 0.9:
                    usage_kwh = max_possible_kwh * random.uniform(0.8, 0.9)
                
                # Hitung cost_idr
                cost_idr = usage_kwh * biz["avg_tariff"]
                
                writer_elec.writerow([
                    biz["id"], year, month, round(usage_kwh, 2), round(cost_idr, 2),
                    round(appliance_expected_kwh, 2), anomaly_count
                ])
                
    print(f"Berhasil membuat electricity entries di {elec_path}")

if __name__ == "__main__":
    generate_data()
