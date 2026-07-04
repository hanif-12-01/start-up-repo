"""Skrip 12: Bangun dataset UMKM-focused.

Filter dataset gabungan agar fokus ke skala UMKM Indonesia:
- Buang HOUSEHOLD.
- Simpan hanya business_type UMKM.
- Batasi latest_usage_kwh dan next_month_usage_kwh pada rentang 100 - 5000 kWh.
- Balancing ringan: batasi OTHER maksimal 2500 baris (reproducible, seed=42).
- Split group-wise time-aware per business_id (70/15/15).

Output disimpan ke ML/final_umkm/.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = ROOT / "ML" / "final" / "wattwise_features.csv"
OUTPUT_DIR = ROOT / "ML" / "final_umkm"
LOG_PATH = ROOT / "ML" / "docs" / "pipeline_log.md"

UMKM_TYPES = ["LAUNDRY", "FNB", "RETAIL", "MANUFACTURE", "COLD_STORAGE", "OTHER"]
USAGE_MIN = 100.0
USAGE_MAX = 5000.0
OTHER_CAP = 2500
SEED = 42


def log_to_pipeline(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n- **{timestamp}**: {message}")


def filter_umkm(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["business_type"] != "HOUSEHOLD"].copy()
    df = df[df["business_type"].isin(UMKM_TYPES)].copy()

    # Pastikan numeric
    df["latest_usage_kwh"] = pd.to_numeric(df["latest_usage_kwh"], errors="coerce")
    df["next_month_usage_kwh"] = pd.to_numeric(df["next_month_usage_kwh"], errors="coerce")

    # Rentang skala UMKM
    df = df[
        (df["latest_usage_kwh"] >= USAGE_MIN)
        & (df["latest_usage_kwh"] <= USAGE_MAX)
        & (df["next_month_usage_kwh"] >= USAGE_MIN)
        & (df["next_month_usage_kwh"] <= USAGE_MAX)
    ].copy()

    # Buang missing dan target <= 0
    df = df.dropna()
    df = df[df["next_month_usage_kwh"] > 0].copy()
    return df


def balance_other(df: pd.DataFrame) -> pd.DataFrame:
    other = df[df["business_type"] == "OTHER"]
    if len(other) > OTHER_CAP:
        other_sampled = other.sample(n=OTHER_CAP, random_state=SEED)
        rest = df[df["business_type"] != "OTHER"]
        df = pd.concat([rest, other_sampled], ignore_index=True)
    return df


def split_group(group: pd.DataFrame) -> pd.DataFrame:
    """Split satu business_id secara time-aware. Tambah kolom 'split'."""
    g = group.sort_values(["year", "month"]).copy()
    n = len(g)
    splits = np.array(["train"] * n, dtype=object)

    if n == 1:
        splits[:] = "train"
    elif n == 2:
        splits[0] = "train"
        splits[1] = "test"
    elif n in (3, 4):
        # mayoritas train, 1 test, sisakan 1 validation jika bisa (n=4)
        if n == 3:
            splits[0] = "train"
            splits[1] = "train"
            splits[2] = "test"
        else:  # n == 4
            splits[0] = "train"
            splits[1] = "train"
            splits[2] = "validation"
            splits[3] = "test"
    else:
        n_train = int(np.floor(n * 0.70))
        n_val = int(np.floor(n * 0.15))
        # Pastikan minimal 1 test dan 1 val
        n_test = n - n_train - n_val
        if n_test < 1:
            n_test = 1
            n_val = max(1, n - n_train - n_test)
            n_train = n - n_val - n_test
        if n_val < 1:
            n_val = 1
            n_train = n - n_val - n_test
        splits[:n_train] = "train"
        splits[n_train:n_train + n_val] = "validation"
        splits[n_train + n_val:] = "test"

    g["split"] = splits
    return g


def time_aware_split(df: pd.DataFrame):
    # apply() dengan groupby dapat menghilangkan kolom key. Simpan business_id secara eksplisit.
    parts = []
    for bid, grp in df.groupby("business_id", sort=False):
        tagged = split_group(grp)
        tagged["business_id"] = bid
        parts.append(tagged)
    tagged_all = pd.concat(parts, ignore_index=True)
    train = tagged_all[tagged_all["split"] == "train"].drop(columns=["split"]).reset_index(drop=True)
    val = tagged_all[tagged_all["split"] == "validation"].drop(columns=["split"]).reset_index(drop=True)
    test = tagged_all[tagged_all["split"] == "test"].drop(columns=["split"]).reset_index(drop=True)
    return train, val, test


def main() -> None:
    print("=== [12] Bangun Dataset UMKM-Focused ===")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not INPUT_PATH.exists():
        msg = f"Input tidak ditemukan: {INPUT_PATH}"
        print(msg)
        log_to_pipeline(f"[12_build_umkm_focused_dataset.py] GAGAL: {msg}")
        return

    df = pd.read_csv(INPUT_PATH)
    n_before = len(df)
    print(f"Jumlah baris sebelum filter: {n_before}")

    df_filtered = filter_umkm(df)
    n_after_filter = len(df_filtered)
    print(f"Jumlah baris setelah filter: {n_after_filter}")

    df_balanced = balance_other(df_filtered)
    n_after_balance = len(df_balanced)
    print(f"Jumlah baris setelah balancing: {n_after_balance}")

    print("\nDistribusi source_dataset:")
    print(df_balanced["source_dataset"].value_counts())

    print("\nDistribusi business_type:")
    print(df_balanced["business_type"].value_counts())

    print("\nRingkasan target next_month_usage_kwh setelah filter:")
    print(df_balanced["next_month_usage_kwh"].describe())

    # Simpan dataset UMKM-focused
    umkm_path = OUTPUT_DIR / "wattwise_features_umkm.csv"
    df_balanced.to_csv(umkm_path, index=False)
    print(f"\nDataset UMKM disimpan: {umkm_path}")

    # Split
    train, val, test = time_aware_split(df_balanced)
    train.to_csv(OUTPUT_DIR / "train.csv", index=False)
    val.to_csv(OUTPUT_DIR / "validation.csv", index=False)
    test.to_csv(OUTPUT_DIR / "test.csv", index=False)

    print(f"\nShape train: {train.shape}")
    print(f"Shape validation: {val.shape}")
    print(f"Shape test: {test.shape}")

    print("\nvalue_counts business_type - train:")
    print(train["business_type"].value_counts())
    print("\nvalue_counts business_type - validation:")
    print(val["business_type"].value_counts())
    print("\nvalue_counts business_type - test:")
    print(test["business_type"].value_counts())

    print("\nMissing values train:", int(train.isna().sum().sum()))
    print("Missing values validation:", int(val.isna().sum().sum()))
    print("Missing values test:", int(test.isna().sum().sum()))

    msg = (
        f"Dataset UMKM-focused dibangun. "
        f"before={n_before}, after_filter={n_after_filter}, "
        f"after_balance={n_after_balance}, "
        f"train={len(train)}, val={len(val)}, test={len(test)}."
    )
    print(f"\n=== {msg} ===")
    log_to_pipeline(f"[12_build_umkm_focused_dataset.py] SUKSES: {msg}")


if __name__ == "__main__":
    main()
