# Laporan Validasi Kebocoran Data (Data Leakage Audit Report)

Laporan ini menyajikan hasil audit mendalam terhadap dataset dan skrip eksperimen LSTM di repositori WattWise AI untuk memastikan tidak ada kebocoran informasi (*data leakage*) dari masa depan (*future lookahead*) maupun kebocoran target (*target leakage*).

> [!NOTE]
> Audit dilakukan secara otomatis menggunakan skrip verifikasi independen [17_audit_leakage.py](file:///d:/LOMBA/Startup%20Proto/ML/scripts/17_audit_leakage.py) dan pemeriksaan manual terhadap alur data.

---

## Ringkasan Status Validasi

> [!IMPORTANT]
> **STATUS VALIDASI LEAKAGE: AMAN**  
> Semua aspek pembagian data, pembentukan fitur lag/rolling, scaling data, dan pembuatan sequence telah divalidasi dan dinyatakan **bebas dari kebocoran data**.

---

## Rincian Hasil Audit

### 1. Pembagian Data Kronologis (Time-Aware Split)
* **Metode**: Data per `business_id` diurutkan secara kronologis berdasarkan `year` dan `month`, lalu dibagi dengan proporsi **Train (70%) -> Validation (15%) -> Test (15%)**.
* **Temuan Audit**: Tidak ditemukan satupun rekaman waktu pada set Validation atau Test yang mendahului rekaman waktu pada set Train untuk pelaku usaha (*business ID*) yang sama.
* **Status**: **AMAN**

### 2. Metodologi Skaler (Scaling Isolation)
* **Metode**: Skaler (`feature_scaler` dan `target_scaler` menggunakan `StandardScaler`) wajib di-fit **hanya** pada baris data training (`split == "train"`), kemudian parameter tersebut (`mean_` dan `var_`) diaplikasikan (*transform*) ke seluruh set data.
* **Temuan Audit**: Dalam skrip [16_train_lstm_umkm.py](file:///d:/LOMBA/Startup%20Proto/ML/scripts/16_train_lstm_umkm.py), pemanggilan `.fit()` terisolasi secara sempurna pada subset `df_full.loc[train_rows]`. Validation loss dan test loss tidak dipengaruhi oleh parameter scaling dari set mereka sendiri.
* **Status**: **AMAN**

### 3. Kebocoran Target pada Fitur Input (Target Leakage)
* **Metode**: Memastikan target `next_month_usage_kwh` tidak masuk ke dalam array fitur input (`FEATURES`) baik secara langsung maupun melalui fitur turunan yang dihitung menggunakan informasi masa depan.
* **Temuan Audit**: 
  - Kolom `next_month_usage_kwh` tidak terdapat di dalam array fitur.
  - Korelasi antara fitur input dengan target berada pada rentang wajar (korelasi tertinggi adalah `latest_usage_kwh` sebesar `+0.9100`, yang merupakan karakteristik autokorelasi alami pada data runtun waktu listrik, bukan kebocoran target langsung).
* **Status**: **AMAN**

### 4. Konsistensi Fitur Lag & Rolling (Historical Precedence)
* **Metode**: Memeriksa skrip pembangunan fitur [07_build_features.py](file:///d:/LOMBA/Startup%20Proto/ML/scripts/07_build_features.py) untuk memastikan fitur seperti `avg_3_month_usage_kwh`, `trend_1_month`, dan `previous_usage_kwh` dihitung secara mundur (masa lalu), bukan maju (masa depan).
* **Temuan Audit**:
  - Fitur lag dihitung menggunakan `.shift(1)`, yang menggeser data ke masa lalu secara konsisten.
  - Fitur rolling dihitung menggunakan window berjalan `.rolling(3)` dan `.rolling(6)` tanpa pergeseran ke depan (*no forward shift*), sehingga nilai pada waktu $t$ hanya mencakup data pada waktu $t$ dan sebelumnya.
  - Target `next_month_usage_kwh` dibentuk dari `.shift(-1)`, sehingga nilai target waktu $t$ adalah penggunaan riil pada waktu $t+1$. Fitur pada waktu $t$ sama sekali tidak mengetahui nilai $t+1$.
* **Status**: **AMAN**

---

## Tabel Korelasi Fitur vs Target

Berikut adalah hasil korelasi statistik fitur terhadap target `next_month_usage_kwh` pada set training:

| Nama Fitur | Korelasi dengan Target | Keterangan | Status Kebocoran |
| :--- | :---: | :--- | :---: |
| `latest_usage_kwh` | `+0.9100` | Penggunaan bulan berjalan (Lag-0) | **AMAN** |
| `avg_3_month_usage_kwh` | `+0.5932` | Rata-rata 3 bulan berjalan | **AMAN** |
| `previous_usage_kwh` | `+0.4708` | Penggunaan bulan lalu (Lag-1) | **AMAN** |
| `business_type_encoded` | `+0.4576` | Kode kategori usaha | **AMAN** |
| `avg_6_month_usage_kwh` | `+0.3952` | Rata-rata 6 bulan berjalan | **AMAN** |
| `trend_1_month` | `+0.0108` | Tren perubahan 1 bulan | **AMAN** |
| `avg_tariff_idr_per_kwh` | `+0.0000` | Tarif listrik (konstan) | **AMAN** |
| `month_sin` | `-0.0003` | Komponen musiman (sin) | **AMAN** |
| `month_cos` | `-0.0449` | Komponen musiman (cos) | **AMAN** |
| `trend_3_month` | `-0.0944` | Tren perubahan 3 bulan | **AMAN** |

---

## Kesimpulan Akhir

> [!TIP]
> Eksperimen LSTM ini dinilai **sangat bersih (clean)** dari sudut pandang metodologi data science. Peningkatan performa prediksi LSTM (wMAPE turun menjadi **13.19%** dibandingkan Ridge **16.32%**) adalah murni berkat kemampuan arsitektur recurrent neural network dalam menangkap ketergantungan temporal jangka panjang (*long-term dependencies*) dari sequence 6 bulanan, bukan karena kebocoran data.
