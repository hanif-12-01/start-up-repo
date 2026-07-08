# Spesifikasi Implementasi Week 3: Appliance Templates & Appliance Tracking

## 1. Objective
Menambahkan pelacakan peralatan listrik (appliance tracking) dan templat peralatan (appliance templates) agar pengguna (pemilik kos, properti sewa, dan UMKM) dapat mengestimasi kontribusi konsumsi listrik (kWh) dan biaya listrik per peralatan yang digunakan di bisnis mereka secara mudah dan cepat.

---

## 2. Scope
Fokus pengerjaan Week 3 adalah mengimplementasikan:
1. **Database Table**: Migrasi tabel `appliances` dengan skema yang telah ditentukan.
2. **Eloquent Model & Relationships**: Model `Appliance` beserta relasinya ke model `Business`.
3. **Static Appliance Templates**: Kumpulan templat peralatan statis berdasarkan segmen/tipe bisnis.
4. **Appliance CRUD Page**: Halaman pengelolaan peralatan di frontend menggunakan Inertia + Vue (`resources/js/pages/Appliances/Index.vue`).
5. **Apply Template Action**: Fitur untuk menerapkan templat peralatan ke bisnis aktif tanpa menduplikasi data yang mirip.
6. **Kalkulasi kWh & Biaya Bulanan**: Estimasi konsumsi listrik bulanan per peralatan beserta estimasi biayanya jika tarif listrik tersedia.
7. **Ranking Kandidat**: Menampilkan "Kandidat Alat yang Perlu Dicek" (peralatan dengan konsumsi energi terbesar).
8. **Disclaimers & Safe Wording**: Penyematan disclaimer keamanan guna mencegah misinterpretasi data sebagai pembacaan sensor aktual.

---

## 3. Non-Goals
Untuk menjaga fokus penyelesaian Week 3, hal-hal berikut **tidak akan diimplementasikan**:
- Integrasi sensor IoT atau pembacaan daya secara real-time.
- Scraping katalog merk/tipe peralatan eksternal secara dinamis.
- Pengukuran tingkat perangkat (device-level measurement) secara fisik.
- Deteksi anomali konsumsi listrik atau prediksi berbasis AI/LSTM.
- Pembuatan laporan PDF, integrasi iklan, gerbang pembayaran (payment gateway), integrasi WhatsApp, atau live scraping data eksternal.

---

## 4. Database Schema
Tabel `appliances` akan menyimpan data peralatan yang dimiliki oleh suatu bisnis.

### Tabel: `appliances`
| Column Name | Data Type | Modifiers / Index | Description |
| :--- | :--- | :--- | :--- |
| `id` | BigInteger (Primary Key) | Auto-increment | ID unik peralatan |
| `business_id` | BigInteger (Foreign Key) | Foreign Key -> `businesses.id`, ON DELETE CASCADE | Relasi ke bisnis pemilik alat |
| `name` | String | Not Null | Nama peralatan (contoh: AC Kamar, Kulkas) |
| `category` | String | Nullable | Kategori alat (contoh: Pendingin, Penerangan) |
| `watt` | Decimal (12, 2) | Nullable | Konsumsi daya dalam Watt |
| `quantity` | Integer | Default: 1 | Jumlah unit alat sejenis |
| `hours_per_day` | Decimal (5, 2) | Nullable | Rata-rata jam penggunaan per hari |
| `days_per_month` | Integer | Nullable | Rata-rata hari penggunaan per bulan |
| `source` | String | Default: `MANUAL` | Sumber data alat (`MANUAL`, `TEMPLATE`, `CATALOG_ESTIMATE`) |
| `confidence` | String | Default: `USER_CUSTOM` | Level keyakinan data (`USER_CUSTOM`, `GENERAL_ESTIMATE`, `COMMON_MARKET_RANGE`) |
| `notes` | Text | Nullable | Catatan tambahan |
| `created_at` / `updated_at` | Timestamps | Nullable | Waktu pembuatan & modifikasi |

#### Unique Constraint & Duplicate Prevention:
- Tidak ada unique constraint global pada kolom `name`.
- Pencegahan duplikasi nama alat yang mirip dalam satu bisnis dilakukan pada level aplikasi (Action/Service) saat proses `apply-template` dipicu.

---

## 5. Enum & Value Standards

### Source Values (`source`):
- `MANUAL`: Diinput secara manual oleh user.
- `TEMPLATE`: Dibuat secara otomatis melalui apply template bisnis.
- `CATALOG_ESTIMATE`: Menggunakan nilai estimasi dari katalog referensi WattWise.

### Confidence Values (`confidence`):
- `USER_CUSTOM`: Diinput sendiri oleh user (tingkat kepercayaan tinggi karena spesifik).
- `GENERAL_ESTIMATE`: Estimasi kasar berdasarkan rata-rata industri.
- `COMMON_MARKET_RANGE`: Rentang daya umum yang beredar di pasar.

---

## 6. Template Segments & Examples
WattWise menyediakan templat peralatan bawaan berdasarkan segmen bisnis berikut:

### 1. KOS_PROPERTY (Kos-kosan & Properti Sewa)
- AC kamar
- Kipas angin
- Lampu kamar
- Lampu koridor
- Pompa air
- Rice cooker / magic com
- Setrika
- Dispenser
- Kulkas
- Router WiFi
- CCTV
- Mesin cuci bersama
- Water heater

### 2. LAUNDRY (Jasa Cuci/Laundry)
- Mesin cuci
- Mesin pengering
- Setrika uap
- Setrika listrik
- Boiler
- Pompa air
- Kipas exhaust
- Lampu area kerja
- Timbangan digital

### 3. FNB (Restoran, Kafe, Warung Makan)
- Rice cooker / magic com
- Chest freezer
- Showcase cooler
- Kulkas
- Blender
- Dispenser
- Lampu
- Kipas angin
- Kompor listrik
- Mesin kasir
- Grinder kopi

### 4. COLD_STORAGE (Penyimpanan Dingin / Frozen Food)
- Chest freezer
- Showcase freezer
- Kulkas display
- AC ruangan
- Lampu
- Seal machine
- Timbangan digital

### 5. RETAIL (Toko Kelontong & Minimarket)
- Lampu toko
- Kipas angin
- Showcase cooler
- Kulkas display
- Mesin kasir
- Router WiFi
- CCTV
- Printer struk

### 6. OTHER (Usaha Lainnya)
- Lampu
- Kipas angin
- Pompa air
- Router WiFi
- Peralatan custom

---

## 7. Business Logic & Calculations

### Rumus Konsumsi Listrik & Biaya Bulanan:

1. **Konsumsi Bulanan (kWh)**:
   $$monthly\_kwh = \frac{watt}{1000} \times quantity \times hours\_per\_day \times days\_per\_month$$

2. **Estimasi Biaya Bulanan (IDR)**:
   $$estimated\_cost = monthly\_kwh \times tariff\_per\_kwh$$

### Aturan Pencarian Tarif Listrik (`tariff_per_kwh`):
Sistem mencari tarif per kWh dengan urutan prioritas sebagai berikut:
1. Kolom `tariff_per_kwh` di profil listrik aktif bisnis saat ini (`electricity_profile`).
2. Kolom `tariff_per_kwh` dari entri riwayat bulanan listrik terbaru (`electricity_entries`).
3. Jika tidak ada tarif yang ditemukan di kedua sumber tersebut:
   - Tampilkan informasi konsumsi dalam satuan **kWh saja**.
   - Sembunyikan estimasi biaya dan tampilkan pesan informatif bahwa estimasi biaya memerlukan pengisian data profil listrik/tarif terlebih dahulu.

---

## 8. Safe Wording & Disclaimers

### Kosakata Wajib (Safe Wording):
- Selalu gunakan frasa: **“Estimasi Simulatif”**, **“Kandidat alat yang perlu dicek”**, **“Perlu verifikasi manual”**, **“Berdasarkan data input”**.
- Gunakan catatan penjelasan daya: **“Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian.”**

### Klausul Disclaimer Wajib (Required Disclaimer):
> **“Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.”**

### Kosakata Terlarang (Never Use):
Untuk menghindari klaim berlebihan dan risiko hukum/operasional, dilarang keras menggunakan kata/frasa berikut:
- *penyebab pasti* (gunakan: "kandidat potensial")
- *alat rusak* (gunakan: "alat dengan konsumsi daya tinggi")
- *konsumsi aktual* (gunakan: "estimasi/simulasi konsumsi")
- *sensor membaca* / *terdeteksi real-time*

---

## 9. API & Route Definitions
Semua endpoint dilindungi oleh middleware autentikasi (`auth`) dan memastikan kepemilikan bisnis yang valid.

| Method | URI | Controller Action | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/appliances` | `ApplianceController@index` | Menampilkan daftar peralatan bisnis aktif & ranking kandidat |
| **POST** | `/appliances` | `ApplianceController@store` | Menyimpan peralatan baru secara manual |
| **PUT** | `/appliances/{appliance}` | `ApplianceController@update` | Memperbarui detail peralatan tertentu |
| **DELETE** | `/appliances/{appliance}` | `ApplianceController@destroy` | Menghapus peralatan tertentu |
| **POST** | `/appliances/apply-template` | `ApplianceController@applyTemplate` | Menerapkan templat peralatan berdasarkan tipe bisnis |

---

## 10. Frontend UI Page Layout (`Appliances/Index.vue`)
Halaman dikembangkan menggunakan Vue 3 dengan Inertia.js dan dibungkus dalam Dashboard Layout yang sudah ada.

### Komponen Halaman:
1. **Header & Sidebar**:
   - Label menu sidebar: **“Peralatan”**
   - Menampilkan nama bisnis aktif.
2. **Widget Empty State & Quick Setup**:
   - Jika belum ada peralatan, tampilkan tombol: **"Terapkan Templat Bisnis [Nama Segmen]"**.
3. **Peralatan CRUD Table/List**:
   - Daftar peralatan lengkap dengan kolom: Nama Alat, Watt, Jumlah, Jam/Hari, Hari/Bulan, Estimasi kWh Bulanan, Estimasi Biaya Bulanan.
   - Aksi edit (modal form) dan hapus (konfirmasi modal).
   - Form input manual untuk menambah peralatan baru.
4. **Section "Kandidat Alat yang Perlu Dicek"**:
   - Menampilkan 3-5 peralatan dengan estimasi konsumsi kWh bulanan tertinggi.
   - Diberi penanda visual (misal warna amber/kuning redup) sebagai pengingat untuk verifikasi lapangan.
5. **Disclaimer Alert Box**:
   - Kotak informasi statis di bagian bawah halaman yang berisi teks disclaimer wajib.

---

## 11. Testing Strategy

Setiap fungsionalitas harus diuji melalui unit/feature test di Laravel (`tests/Feature/ApplianceTest.php`):

### Skenario Pengujian:
1. **Keamanan & Autentikasi**:
   - Guest tidak dapat mengakses halaman `/appliances` atau memicu API terkait (diarahkan ke login).
   - Pengguna terautentikasi hanya bisa mengelola peralatan miliknya sendiri.
   - Pengguna tidak dapat membaca, membuat, mengedit, atau menghapus peralatan milik bisnis pengguna lain.
2. **Fungsionalitas CRUD**:
   - Pengguna dapat membuat peralatan baru secara manual pada bisnis miliknya.
   - Pengguna dapat memperbarui data peralatan miliknya.
   - Pengguna dapat menghapus peralatan miliknya.
3. **Fitur Templat**:
   - Memicu apply template berhasil membuat daftar peralatan awal sesuai segmen bisnis.
   - Apply template tidak akan membuat duplikat peralatan jika alat dengan nama sejenis sudah ada di bisnis tersebut.
4. **Logika Perhitungan**:
   - Pengujian akurasi rumus matematika konsumsi bulanan (kWh).
   - Pengujian akurasi estimasi biaya ketika tarif listrik tersedia di profil bisnis maupun entri listrik bulanan terbaru.
   - Pengujian penanganan ketika tarif listrik kosong (hanya mengembalikan kWh dan menyembunyikan estimasi biaya).
5. **Kepatuhan Narasi (Safe Wording)**:
   - Memastikan respons halaman/dashboard tidak mengandung kata terlarang (seperti "konsumsi aktual", "sensor membaca", dll.) dan menampilkan disclaimer wajib.

---

## 12. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Migrasi tabel `appliances` berhasil dijalankan dan skema sesuai spesifikasi database.
- [ ] Controller dan Routing terpasang dengan proteksi autentikasi & otorisasi kepemilikan bisnis.
- [ ] Pengguna dapat mengelola peralatan (Tambah, Edit, Hapus) secara langsung dari antarmuka web.
- [ ] Pengguna dapat menerapkan templat awal peralatan sekali klik berdasarkan segmen bisnis.
- [ ] Halaman menghitung dan menampilkan estimasi kWh serta biaya bulanan dengan benar berdasarkan ketersediaan tarif.
- [ ] Bagian "Kandidat Alat yang Perlu Dicek" terurut berdasarkan konsumsi tertinggi.
- [ ] Disclaimer keselamatan terpasang secara permanen pada UI.
- [ ] Perintah `php artisan test` berjalan sukses (seluruh tes hijau).
- [ ] Perintah `npm run build` berhasil dijalankan untuk kompilasi aset frontend tanpa error.
