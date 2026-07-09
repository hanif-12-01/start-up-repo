# Spesifikasi Implementasi Week 4: Simple Insight & Recommendation Engine

## 1. Objective
Menambahkan mesin rekomendasi dan wawasan (Insight & Recommendation Engine) berbasis aturan (rule-based) yang praktis guna membantu pemilik bisnis (kos, laundry, F&B, retail, cold storage, dll.) menghemat konsumsi listrik. Wawasan ini didasarkan pada entri bulanan listrik, pendapatan, dan data peralatan listrik yang terdaftar pada bisnis aktif.

---

## 2. Scope
Fokus pengerjaan Week 4 adalah mengimplementasikan:
1. **RecommendationService**: Service layer di backend untuk mengevaluasi data bisnis dan menghasilkan daftar rekomendasi.
2. **Skor Efisiensi Listrik**: Fitur perhitungan skor efisiensi (skala 0-100) beserta indikasi label status, penjelasan, dan tingkat kepercayaan.
3. **RecommendationController & Routing**: Endpoint `/recommendations` untuk menyajikan data rekomendasi ke frontend.
4. **Halaman Rekomendasi**: Halaman detail rekomendasi (`resources/js/pages/Recommendations/Index.vue`) lengkap dengan pembagian prioritas, skenario penghematan, dan disclaimer wajib.
5. **Pembaruan Dashboard**: Widget wawasan ringkas ("Insight Utama") pada halaman Dashboard utama, menampilkan skor efisiensi, 3 rekomendasi teratas, dan tombol CTA ke halaman detail.
6. **Data Completeness Warning & Safe Wording**: Sistem peringatan jika data kurang lengkap serta penegakan aturan penggunaan kata-kata aman (safe wording).
7. **Testing Strategy**: Pengujian backend dan integrasi untuk memastikan logika perhitungan, otorisasi data, dan respons API berjalan dengan benar.

---

## 3. Non-Goals
Untuk menjaga fokus dan batas waktu Week 4, fitur-fitur berikut **tidak akan diimplementasikan**:
- Integrasi model LSTM atau algoritma machine learning tingkat lanjut untuk peramalan beban.
- Deteksi penyebab anomali listrik secara eksak atau otomatis.
- Deteksi sensor real-time atau integrasi dengan hardware IoT.
- Ekspor laporan dalam format PDF atau pengiriman via email.
- Integrasi iklan, gerbang pembayaran (payment gateway), atau WhatsApp API.
- Scraping data secara dinamis dari portal PLN Mobile atau sistem eksternal.
- Integrasi dengan AI API eksternal (seperti OpenAI, Claude, atau Gemini).

---

## 4. Data Sources
Logika rekomendasi akan mengevaluasi data dari entitas-entitas berikut:
1. **Bisnis Aktif (`Business`)**: Profil bisnis yang sedang dipilih oleh pengguna (termasuk tipe bisnis).
2. **Profil Listrik (`ElectricityProfile`)**: Data daya (VA) dan tarif listrik per kWh (`tariff_per_kwh`).
3. **Entri Listrik Terbaru (`ElectricityEntry`)**: Data tagihan listrik bulanan terakhir untuk mendapatkan nilai kWh, biaya listrik aktual, dan tarif listrik per kWh alternatif.
4. **Entri Pendapatan Terbaru (`RevenueEntry`)**: Data pendapatan bulanan terakhir untuk menghitung rasio biaya listrik terhadap pendapatan.
5. **Daftar Peralatan (`Appliance`)**: Seluruh peralatan listrik yang terdaftar di bisnis tersebut beserta estimasi konsumsi kWh bulanan dan biaya bulanan masing-masing (yang dihitung via `ApplianceEstimator`).

---

## 5. Recommendation Types
Sistem akan mendukung tipe rekomendasi berbasis aturan berikut:

| Kode Tipe | Kategori | Kondisi Pemicu | Deskripsi & Saran Tindakan |
| :--- | :--- | :--- | :--- |
| `HIGH_ELECTRICITY_REVENUE_RATIO` | Finansial | Rasio biaya listrik terhadap pendapatan bulanan terbaru > 10%. | Biaya listrik memakan porsi signifikan dari pendapatan. Disarankan melakukan tinjauan operasional peralatan berdaya besar. |
| `MISSING_REVENUE_DATA` | Kelengkapan Data | Tidak ada data `RevenueEntry` pada bulan/periode terbaru. | Data pendapatan terbaru belum diisi. Input pendapatan untuk menganalisis rasio efisiensi finansial Anda. |
| `MISSING_ELECTRICITY_DATA` | Kelengkapan Data | Tidak ada data `ElectricityEntry` pada bulan/periode terbaru. | Data tagihan listrik terbaru belum dicatat. Input tagihan untuk memulai analisis biaya. |
| `MISSING_TARIFF_DATA` | Kelengkapan Data | Tarif per kWh bernilai null di `ElectricityProfile` dan `ElectricityEntry` terbaru. | Tarif listrik belum diatur. Atur tarif per kWh di profil listrik atau entri bulanan agar estimasi biaya dapat dihitung. |
| `MISSING_APPLIANCE_DATA` | Kelengkapan Data | Jumlah peralatan listrik terdaftar (`appliances`) adalah 0. | Daftar peralatan kosong. Terapkan templat bawaan bisnis Anda atau input peralatan secara manual. |
| `HIGH_CONTRIBUTION_APPLIANCE` | Analisis Alat | Terdapat alat yang estimasi konsumsi kWh-nya berkontribusi > 30% dari total estimasi kWh semua peralatan. | Peralatan [Nama Alat] menyerap [X]% dari total estimasi konsumsi alat. Pertimbangkan pembatasan jam pakai. |
| `LONG_RUNTIME_APPLIANCE` | Analisis Alat | Peralatan memiliki rata-rata jam penggunaan per hari (`hours_per_day`) >= 12 jam. | [Nama Alat] aktif selama [X] jam per hari. Kurangi durasi pemakaian yang tidak perlu. |
| `MANY_UNITS_APPLIANCE` | Analisis Alat | Jumlah unit alat sejenis (`quantity`) >= 5 unit. | Memiliki [X] unit [Nama Alat]. Matikan unit yang sedang tidak digunakan untuk menghindari akumulasi beban. |
| `SAVING_SCENARIO_REDUCE_USAGE` | Simulasi Hemat | Peralatan terdaftar memiliki data Watt, Jumlah, dan Tarif. Dihitung untuk 1-3 alat teratas. | Skenario hemat: Mengurangi pemakaian [Nama Alat] 1 jam/hari berpotensi menghemat sekitar [IDR]/bulan. |
| `DATA_COMPLETENESS_REMINDER` | Kelengkapan Data | Sebagian data masih kosong (kombinasi data listrik/pendapatan/peralatan). | WattWise membutuhkan data lengkap (listrik, pendapatan, peralatan) untuk memberikan rekomendasi dengan akurasi maksimal. |

---

## 6. Priority Levels
Setiap rekomendasi yang dihasilkan memiliki salah satu tingkat prioritas berikut:
- **`HIGH`** (Prioritas Tinggi): Isu kritis yang berdampak langsung pada biaya operasional tinggi atau menghalangi analisis dasar (misal: Rasio listrik/pendapatan > 20%, data listrik bulanan kosong).
- **`MEDIUM`** (Prioritas Sedang): Peluang penghematan potensial atau data kurang lengkap yang membatasi analisis biaya (misal: Rasio listrik/pendapatan 15%-20%, ada alat berdaya tinggi, data pendapatan/peralatan kosong).
- **`LOW`** (Prioritas Ringan): Peningkatan efisiensi kecil atau pengingat umum (misal: Rasio listrik/pendapatan 10%-15%, jumlah unit alat banyak, pengingat kelengkapan data).

---

## 7. User-Facing Labels & Narration (Indonesian)
Antarmuka pengguna wajib menggunakan label bahasa Indonesia berikut:
- **Prioritas**:
  - `HIGH` $\rightarrow$ **“Prioritas Tinggi”**
  - `MEDIUM` $\rightarrow$ **“Prioritas Sedang”**
  - `LOW` $\rightarrow$ **“Prioritas Ringan”**
- **Metode Estimasi**:
  - **“Estimasi Simulatif”**
  - **“Perlu Verifikasi Manual”**
  - **“Berdasarkan data input”**

---

## 8. Safe Wording Guidelines
Guna menghindari klaim yang berlebihan atau janji keakuratan yang menyesatkan tanpa sensor fisik, seluruh teks rekomendasi **harus mematuhi aturan kosakata berikut**:

### Kosakata yang DIWAJIBKAN (Wajib Digunakan):
- **“kemungkinan”** (contoh: "kemungkinan terdapat potensi pemborosan")
- **“indikasi”** (contoh: "indikasi beban tinggi pada sektor pendingin")
- **“kandidat alat yang perlu dicek”** (bukan alat yang pasti boros atau rusak)
- **“berdasarkan data yang Anda input”** (menegaskan ketergantungan pada input user)
- **“estimasi simulatif”** (menandakan angka dihitung secara matematis, bukan diukur)

### Kosakata yang DILARANG (Tidak Boleh Digunakan):
- *penyebab pasti*
- *alat rusak* / *alat bocor*
- *konsumsi aktual*
- *sensor membaca*
- *terdeteksi real-time*
- *AI memastikan* / *sistem memastikan*

---

## 9. Required Disclaimers
Pesan sanggahan (disclaimer) berikut harus ditampilkan secara jelas pada UI (misal dalam info box atau di bawah hasil perhitungan):

1. **Disclaimer Tagihan**:
   > *“Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.”*
2. **Disclaimer Peralatan**:
   > *“Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.”*
3. **Disclaimer Sisa Pendapatan**:
   > *“Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.”*
4. **Disclaimer Hubungan Resmi**:
   > *“WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.”*

---

## 10. Skor Efisiensi Listrik
Sistem akan mempublikasikan metrik kepemilikan bernama **“Skor Efisiensi Listrik”** untuk bisnis aktif.

### Aturan Perhitungan Skor:
1. **Prasyarat**: Skor hanya dihitung jika data tagihan listrik (`bill_amount_idr` atau estimasinya) dan data pendapatan bulanan terbaru (`revenue_amount_idr`) **tersedia**.
2. **Penanganan Data Tidak Lengkap**: Jika salah satu atau kedua data di atas tidak tersedia, skor tidak boleh dipaksakan (kembalikan nilai `null`), dan UI harus menampilkan label **“Data belum cukup”**.
3. **Logika Pengurangan Skor (Deduction Rules)**:
   Skor dimulai dari **100** poin, kemudian dikurangi berdasarkan aturan berikut (tidak bersifat akumulatif secara ganda pada satu jenis kategori):
   - **Rasio Biaya Listrik terhadap Pendapatan**:
     - Jika rasio $> 20\%$, kurangi **25** poin.
     - Jika rasio $> 15\%$ dan $\le 20\%$, kurangi **15** poin.
     - Jika rasio $> 10\%$ dan $\le 15\%$, kurangi **8** poin.
   - **Ketiadaan Data Pendukung**:
     - Jika tidak ada data peralatan (`appliances` kosong), kurangi **10** poin.
     - Jika tarif listrik per kWh kosong di profil listrik, kurangi **10** poin.
   - **Konsumsi Alat Terpusat**:
     - Jika terdapat minimal satu peralatan yang berkontribusi $> 30\%$ dari total estimasi kWh semua peralatan, kurangi **10** poin.
   - *Batas Minimum*: Skor dikunci (clamp) pada rentang **0 – 100**.

### Output Metrik:
Service akan mengembalikan struktur data berikut:
- **`score`**: `int|null` (nilai skor 0-100 atau null)
- **`label`**: `BAIK` (skor $\ge 80$), `PERLU DIPANTAU` (skor $60-79$), atau `PERLU DICEK` (skor $< 60$)
- **`explanation`**: Deskripsi singkat mengenai kondisi efisiensi bisnis saat ini.
- **`confidence`**: Tingkat kepercayaan data:
  - `HIGH`: Data listrik, pendapatan, tarif, dan minimal satu peralatan terisi lengkap.
  - `MEDIUM`: Data listrik dan pendapatan terisi, namun ada data pendukung yang kosong (peralatan atau tarif).
  - `LOW`: Data listrik atau pendapatan tidak lengkap (skor = null).

---

## 11. API & Route Definitions
Fungsionalitas ini akan menggunakan rute berikut (wajib dilindungi oleh middleware `auth` dan `verified`):

| Method | URI | Controller Action | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/recommendations` | `RecommendationController@index` | Mengambil skor efisiensi, daftar rekomendasi terurut prioritas, dan wawasan data bisnis aktif |

---

## 12. UI Components & Layouts

### 1. Halaman Rekomendasi (`Recommendations/Index.vue`)
- **Akses**: Melalui menu sidebar **“Rekomendasi”** (menggunakan ikon Lucide `Lightbulb` atau `Sparkles`).
- **Layout**: Menggunakan `AppSidebarLayout` bawaan aplikasi.
- **Fitur Utama**:
  - Tampilan visual **Skor Efisiensi Listrik** (radial progress atau gauge meter) lengkap dengan badge status (`BAIK`, `PERLU DIPANTAU`, `PERLU DICEK`) dan label confidence.
  - Daftar rekomendasi yang dikelompokkan atau diurutkan berdasarkan tingkat prioritas (`Prioritas Tinggi` di bagian atas dengan warna penanda merah/amber, disusul `Prioritas Sedang` warna kuning, dan `Prioritas Ringan` warna biru/abu-abu).
  - Kotak simulasi penghematan peralatan (jika ada data alat) yang menampilkan visualisasi skenario pemotongan jam pakai (1 jam/hari).
  - Penempatan **Disclaimers Box** yang memuat seluruh teks sanggahan hukum secara statis di bagian bawah halaman.

### 2. Widget Dashboard Utama (`Dashboard.vue`)
- Menambahkan section baru bernama **“Insight Utama”** di samping atau di bawah rangkuman biaya bulanan.
- **Isi Widget**:
  - Ringkasan **Skor Efisiensi Listrik** (angka besar beserta indikator warna status).
  - Daftar singkat **3 rekomendasi dengan prioritas tertinggi** yang saat ini aktif.
  - Tombol CTA: **“Lihat Rekomendasi Lengkap”** yang mengarah ke `/recommendations`.

---

## 13. Testing Strategy
Untuk menjaga kualitas kode dan mencegah regresi, seluruh logika ini harus dicakup dalam pengujian otomatis (`tests/Feature/RecommendationTest.php`):

### Skenario Uji Wajib:
1. **Keamanan & Otorisasi**:
   - Guest (pengguna tidak login) tidak dapat mengakses `/recommendations` (diarahkan ke login).
   - Pengguna tidak dapat melihat rekomendasi atau data bisnis milik pengguna lain.
2. **Logika RecommendationService**:
   - Menghasilkan rekomendasi kelengkapan data (`MISSING_ELECTRICITY_DATA`, `MISSING_REVENUE_DATA`, `MISSING_TARIFF_DATA`) jika data-data tersebut memang belum diinput.
   - Menghasilkan rekomendasi prioritas tinggi (`HIGH`) jika rasio biaya listrik terhadap pendapatan melebihi $20\%$.
   - Menghasilkan rekomendasi analisis alat (`HIGH_CONTRIBUTION_APPLIANCE`) jika ada satu alat yang mendominasi konsumsi energi bisnis tersebut.
   - Menghasilkan rekomendasi penghematan alat (`SAVING_SCENARIO_REDUCE_USAGE`) jika tarif dan peralatan memadai.
3. **Logika Skor Efisiensi Listrik**:
   - Mengembalikan `null` (atau penanda "data belum cukup") jika salah satu dari tagihan listrik atau pendapatan bernilai kosong.
   - Menghitung skor dengan pemotongan poin yang tepat sesuai aturan jika semua data tersedia.
   - Memastikan skor selalu berada dalam rentang 0-100 (clamp).
4. **Integrasi Dashboard & API**:
   - Memastikan Dashboard Controller mengirimkan properti insight terbaru ke halaman `Dashboard.vue`.
   - Memastikan respons halaman `/recommendations` tidak mengandung kata-kata terlarang (seperti "konsumsi aktual", "sensor membaca", dll.) guna mematuhi safe wording guidelines.

---

## 14. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Berkas `RecommendationService.php` dan `RecommendationController.php` terimplementasi dengan logika rule-based yang lengkap.
- [ ] Rute `/recommendations` terdaftar dan terlindungi oleh middleware autentikasi.
- [ ] Halaman `resources/js/pages/Recommendations/Index.vue` terbuat dengan visualisasi Skor Efisiensi, daftar rekomendasi prioritas, dan disclaimer lengkap.
- [ ] Menu **“Rekomendasi”** terpasang di sidebar utama aplikasi dengan benar.
- [ ] Widget **“Insight Utama”** di Dashboard menampilkan skor efisiensi dan top 3 rekomendasi.
- [ ] Narasi dalam aplikasi sepenuhnya mematuhi pedoman *Safe Wording* (tidak ada kata terlarang seperti "konsumsi aktual" atau "sensor membaca").
- [ ] Semua pengujian otomatis dalam berkas `RecommendationTest.php` berhasil dilewati (`php artisan test` sukses).
- [ ] Build aset frontend (`npm run build`) berjalan lancar tanpa kesalahan kompilasi.
