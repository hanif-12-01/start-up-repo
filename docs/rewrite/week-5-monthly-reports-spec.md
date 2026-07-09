# Spesifikasi Implementasi Week 5: Laporan Bulanan & Fondasi Ringkasan

## 1. Objective
Menambahkan fondasi laporan bulanan (monthly report foundation) agar pengguna (pemilik kos, properti sewa, dan UMKM) dapat meninjau biaya listrik, dampak pendapatan, kandidat peralatan listrik, dan rekomendasi hemat dalam satu halaman laporan terstruktur untuk periode tertentu.

---

## 2. Scope
Fokus pengerjaan Week 5 adalah mengimplementasikan:
1. **MonthlyReportService**: Service layer di backend untuk menghimpun, memproses, dan menyusun data laporan bulanan.
2. **Struktur Data Laporan**: Menghasilkan bentuk data (data shape) yang terstandardisasi untuk dikonsumsi frontend.
3. **Halaman Laporan Bulanan**: Halaman UI di frontend menggunakan Inertia + Vue (`resources/js/pages/Reports/Index.vue`).
4. **Selektor Bulan Laporan**: Filter pilihan bulan laporan (format `YYYY-MM`) untuk menampilkan data historis.
5. **Ringkasan Listrik (Electricity Summary)**: Total pemakaian listrik (kWh), nominal tagihan (IDR), tarif per kWh, dan status kelengkapan data listrik.
6. **Ringkasan Pendapatan (Revenue Summary)**: Total pendapatan bulanan (IDR) dan status kelengkapan data pendapatan.
7. **Dampak Finansial (Financial Impact)**: Rasio biaya listrik terhadap pendapatan (%) dan sisa pendapatan setelah dikurangi tagihan listrik.
8. **Kandidat Peralatan (Appliance Candidates)**: Jumlah peralatan terdaftar dan daftar peralatan dengan pemakaian terbesar (top candidates) yang perlu dicek.
9. **Ringkasan Rekomendasi (Recommendation Summary)**: Integrasi dengan `RecommendationService` untuk menyajikan rekomendasi hemat aktif.
10. **Disclaimer Keamanan**: Penyajian statis kotak sanggahan keselamatan dan hukum di bagian bawah laporan.
11. **Testing**: Penyusunan automated tests untuk memvalidasi logika Service, otorisasi data, status kelengkapan data, dan rendering halaman.

---

## 3. Non-Goals
Untuk menjaga fokus penyelesaian Week 5, fitur-fitur berikut **tidak akan diimplementasikan**:
- Pembuatan, rendering, atau ekspor laporan dalam format PDF (PDF generation).
- Pengiriman file PDF laporan secara otomatis via email (automatic PDF email).
- Integrasi atau pengiriman laporan melalui WhatsApp (WhatsApp reports).
- Integrasi dengan payment gateway, fitur tagihan premium, atau sistem langganan.
- Pemasangan iklan (ads) dalam halaman laporan.
- Pemindaian tagihan fisik menggunakan OCR.
- Pembacaan sensor listrik real-time atau integrasi hardware IoT.
- Integrasi model machine learning LSTM untuk peramalan jangka panjang.
- Pemanggilan AI API eksternal (OpenAI, Claude, Gemini, dll.).
- Live scraping data dari portal PLN Mobile atau situs eksternal.

---

## 4. Route & API Definition
Rute ini wajib dilindungi oleh middleware `auth` dan `verified`:

| Method | URI | Controller Action | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/reports` | `ReportController@index` | Menampilkan halaman laporan bulanan untuk bisnis aktif. Menerima query parameter `month` (format `YYYY-MM`) untuk menyaring data bulan tertentu. |

---

## 5. UI Page & Navigation
- **Frontend File**: `resources/js/pages/Reports/Index.vue`
- **Sidebar Label**: **“Laporan”**
- **Sidebar Icon**: Menggunakan ikon Lucide `FileText` atau `ClipboardList`.

---

## 6. Data Sources
Logika penyusunan laporan hanya mengevaluasi data dari bisnis aktif/pertama milik pengguna terautentikasi (`authenticated user's active/first business`):
1. **Business**: Model bisnis aktif milik pengguna.
2. **ElectricityEntry**: Data pemakaian bulanan (kWh) dan tagihan listrik (`bill_amount`) pada bulan terpilih.
3. **RevenueEntry**: Data pendapatan bulanan (`amount`) pada bulan terpilih.
4. **ElectricityProfile**: Untuk mengambil tarif listrik per kWh default (`tariff_per_kwh`) jika tidak tersedia di `ElectricityEntry`.
5. **Appliance**: Daftar peralatan terdaftar pada bisnis aktif untuk menghitung kandidat pemakai energi terbesar.
6. **RecommendationService**: Sumber data rekomendasi aktif.
7. **EfficiencyScoreService**: Sumber data skor efisiensi listrik bulanan.
8. **ApplianceEstimator**: Penghitung estimasi pemakaian kWh dan biaya per alat.
9. **ElectricityCalculator**: Penghitung estimasi tagihan/pemakaian listrik dasar.

---

## 7. Monthly Report Data Shape
`MonthlyReportService` wajib mengembalikan struktur data (data shape) berikut:

```php
[
  'business' => [
    'id' => int,
    'name' => string,
    'business_type' => string,
  ] | null,
  'selected_month' => string, // Format YYYY-MM
  'available_months' => [
    string, // Array of YYYY-MM strings
  ],
  'electricity' => [
    'usage_kwh' => float | null,
    'bill_amount' => float | null,
    'tariff_per_kwh' => float | null,
    'data_status' => string, // COMPLETE, NO_ELECTRICITY, PARTIAL
  ],
  'revenue' => [
    'amount' => float | null,
    'data_status' => string, // COMPLETE, NO_REVENUE
  ],
  'financial_impact' => [
    'electricity_revenue_ratio_percent' => float | null,
    'remaining_revenue_after_electricity' => float | null,
  ],
  'appliances' => [
    'count' => int,
    'top_candidates' => [
      // List of appliances sorted by energy consumption desc
    ],
  ],
  'recommendations' => [
    // List of recommendation items
  ],
  'efficiency_score' => [
    'score' => int | null,
    'label' => string, // BAIK, PERLU DIPANTAU, PERLU DICEK
    'explanation' => string,
    'confidence' => string, // HIGH, MEDIUM, LOW
  ],
  'disclaimers' => [
    string, // List of required disclaimers
  ],
]
```

---

## 8. Report Sections
Halaman `Reports/Index.vue` wajib menampilkan section berikut:
1. **Header Laporan**: Nama bisnis aktif, judul laporan, dan pemilih bulan (`selected_month`).
2. **Ringkasan Listrik (Electricity Summary)**: Menampilkan pemakaian listrik (kWh) dan nominal biaya tagihan.
3. **Ringkasan Pendapatan (Revenue Summary)**: Menampilkan total pendapatan bisnis pada bulan terpilih.
4. **Dampak Finansial (Financial Impact)**:
   - Visualisasi persentase rasio listrik terhadap pendapatan.
   - Angka nominal sisa pendapatan setelah listrik.
5. **Kandidat Peralatan Teratas (Top Appliance Candidates)**: Daftar alat berdaya besar yang paling berkontribusi terhadap beban listrik.
6. **Rekomendasi Hemat (Recommendations)**: Daftar tindakan preventif rule-based untuk menurunkan biaya operasional.
7. **Kotak Disclaimer**: Teks sanggahan hukum mengenai estimasi data dan batasan aplikasi.
8. **Call to Action (CTA)**: Tombol untuk mengarahkan pengguna melengkapi data (misal: "Tambah Data Listrik" atau "Lengkapi Data Pendapatan") jika mendeteksi status data tidak lengkap.

---

## 9. Data Completeness States
Status kelengkapan data dalam laporan diklasifikasikan menjadi:
- **`COMPLETE`**: Data bisnis, entri listrik terpilih, entri pendapatan terpilih, dan peralatan tersedia lengkap.
- **`NO_BUSINESS`**: Bisnis aktif belum dibuat/terpilih.
- **`NO_ELECTRICITY`**: Tidak ada entri data listrik pada bulan terpilih.
- **`NO_REVENUE`**: Tidak ada entri data pendapatan pada bulan terpilih.
- **`NO_APPLIANCES`**: Tidak ada peralatan listrik yang terdaftar di dalam bisnis.
- **`PARTIAL`**: Hanya sebagian data yang terisi (misal: ada data listrik, tetapi data pendapatan kosong).

---

## 10. User-Facing Safe Labels
Untuk menjaga transparansi informasi dan estetika aplikasi, antarmuka wajib memakai label-label bahasa Indonesia berikut:
- **“Ringkasan Bulanan”**
- **“Estimasi Tagihan Listrik”**
- **“Prediksi Pemakaian Listrik”**
- **“Rasio listrik terhadap pendapatan”**
- **“Sisa pendapatan setelah listrik”**
- **“Kandidat alat yang perlu dicek”**
- **“Rekomendasi hemat”**
- **“Estimasi Simulatif”**
- **“Berdasarkan data input”**
- **“Perlu Verifikasi Manual”**

---

## 11. Safe Wording Guidelines
Semua teks narasi, saran, dan status dalam laporan harus mematuhi panduan pemilihan kosakata berikut:

### Kosakata yang DIWAJIBKAN:
- **“estimasi”** (misal: "estimasi biaya bulanan")
- **“indikasi”** (misal: "indikasi konsumsi tinggi")
- **“berdasarkan data input”** (menegaskan ketergantungan pada data pengguna)
- **“kemungkinan”** (misal: "kemungkinan terdapat potensi penghematan")
- **“perlu dicek manual”** (mengajak verifikasi fisik)

### Kosakata yang DILARANG:
- *penyebab pasti*
- *alat rusak* / *alat bocor*
- *konsumsi aktual*
- *sensor membaca*
- *terdeteksi real-time*
- *AI memastikan* / *sistem memastikan*
- *tagihan resmi PLN*

---

## 12. Required Disclaimers
Empat teks disclaimer berikut wajib diposisikan secara jelas pada halaman laporan bulanan:
1. *“Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.”*
2. *“WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.”*
3. *“Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.”*
4. *“Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.”*

---

## 13. Testing Strategy
Skenario pengujian yang wajib diimplementasikan di backend (`tests/Feature/MonthlyReportTest.php` atau sejenis):
1. **Keamanan & Proteksi Akses**:
   - Memastikan rute `/reports` dilindungi middleware autentikasi (`auth`).
   - Memastikan pengguna tidak dapat mengakses data laporan milik pengguna/bisnis lain.
2. **Pemuatan Data Sesuai Periode**:
   - Memastikan `MonthlyReportService` memuat data `ElectricityEntry` & `RevenueEntry` sesuai dengan bulan terpilih (`month=YYYY-MM`).
   - Memastikan penanganan jika bulan yang diminta tidak memiliki entri data (mengembalikan status data tidak lengkap).
3. **Kalkulasi & Logika Laporan**:
   - Memvalidasi kebenaran perhitungan rasio listrik terhadap pendapatan.
   - Memvalidasi perhitungan sisa pendapatan setelah listrik.
   - Memverifikasi bahwa daftar peralatan teratas dimuat dan diurutkan berdasarkan konsumsi energi terbesar.
   - Memastikan skor efisiensi listrik terlampir di data laporan.
4. **Penanganan State Kosong**:
   - Memverifikasi output service ketika bisnis tidak memiliki data peralatan (`NO_APPLIANCES`).
   - Memverifikasi output service ketika tidak ada bisnis aktif (`NO_BUSINESS`).
   - Memverifikasi status data `PARTIAL` ketika data pendapatan kosong namun data listrik terisi.

---

## 14. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Pengguna dapat mengakses halaman `/reports` setelah melakukan login.
- [ ] Pengguna dapat memilih bulan laporan dan melihat ringkasan datanya yang diperbarui secara dinamis.
- [ ] Informasi kelengkapan data ditampilkan dengan jelas jika terdapat data yang kurang (`PARTIAL` atau status lainnya).
- [ ] Data finansial (rasio pengeluaran listrik dan sisa pendapatan) terhitung dan tampil dengan benar.
- [ ] Daftar kandidat peralatan teratas dengan pemakaian kWh tertinggi muncul di halaman laporan.
- [ ] Rekomendasi hemat energi aktif dari `RecommendationService` terintegrasi dengan baik.
- [ ] Seluruh teks disclaimer wajib ditampilkan secara statis di bagian bawah halaman laporan.
- [ ] Narasi laporan bersih dari kata-kata terlarang (*sensor membaca*, *konsumsi aktual*, *tagihan resmi PLN*, dll.).
- [ ] Seluruh test suite backend berhasil dilewati (`php artisan test` sukses).
- [ ] Proses kompilasi frontend berjalan lancar tanpa error (`npm run build` sukses).
