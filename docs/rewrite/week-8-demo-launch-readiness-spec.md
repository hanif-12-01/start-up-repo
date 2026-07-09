# Spesifikasi Demo & Launch Readiness Week 8

## 1. Objective

Mempersiapkan WattWise AI Laravel rewrite untuk sesi demo, validasi pilot, dan review kesiapan peluncuran (launch-readiness review). Week 8 berfokus pada penguatan fondasi non-fitur: data demo realistis, dokumentasi akun demo, skrip QA manual, checklist smoke test, checklist deployment, checklist lingkungan produksi, checklist risiko peluncuran, dan alur cerita presentasi demo.

---

## 2. Scope

Deliverables yang akan diimplementasikan di Week 8:

1. **Data Seed Demo Realistis** — Memperluas `WattWiseDemoSeeder` agar menghasilkan data listrik, pendapatan, peralatan, dan laporan yang realistis untuk minimal 4–6 bulan.
2. **Dokumentasi Akun Demo** — Mendokumentasikan kredensial dan batasan akun demo secara jelas.
3. **Skrip QA Manual** — Panduan langkah demi langkah untuk memeriksa setiap halaman dan fitur secara manual.
4. **Checklist Smoke Test** — Perintah-perintah otomatis yang harus dijalankan dan lulus sebelum demo/deployment.
5. **Checklist Deployment** — Panduan deployment umum Laravel + Vite + Supabase PostgreSQL.
6. **Checklist Lingkungan Produksi** — Variabel `.env` dan konfigurasi yang wajib diperiksa.
7. **Checklist Risiko Peluncuran** — Daftar risiko yang harus dimitigasi sebelum go-live.
8. **Alur Cerita Demo / Presentation Flow** — Narasi demo terstruktur untuk presentasi stakeholder.
9. **Polish Fix Kecil** — Perbaikan minor hanya jika ditemukan masalah nyata saat mempersiapkan demo.

---

## 3. Non-Goals

Fitur-fitur berikut **tidak akan diimplementasikan** di Week 8:

- Integrasi payment gateway (Midtrans, Xendit, Stripe, dll.)
- Alur checkout, invoicing, kwitansi, atau webhook pembayaran
- Pemasangan iklan (ads) dalam aplikasi
- Ekspor laporan ke PDF / fitur download
- Integrasi WhatsApp API atau komunikasi luar
- Fitur OCR pemindaian tagihan fisik
- Integrasi hardware IoT atau pembacaan sensor real-time
- Model machine learning LSTM untuk peramalan jangka panjang
- Pemanggilan external AI API (OpenAI, Gemini, dll.)
- Live scraping data dari portal PLN Mobile
- Redesain UI berskala besar (major UI redesign)
- Penambahan fitur produk baru

---

## 4. Demo Account

### Kredensial Demo

| Field    | Value                |
| :------- | :------------------- |
| Email    | `demo@wattwise.local` |
| Password | `password`           |
| Nama     | Demo WattWise        |

### Peringatan Keamanan

> [!CAUTION]
> Akun demo ini **hanya untuk lingkungan local dan staging**. Kredensial ini **bukan** untuk digunakan sebagai akun produksi. Jangan commit password atau secret ke repository. Jangan deploy akun demo ke lingkungan produksi tanpa menghapus atau menonaktifkannya terlebih dahulu.

### Akun Demo Sudah Ada

Seeder `WattWiseDemoSeeder` sudah ada di `database/seeders/WattWiseDemoSeeder.php` dan dipanggil dari `DatabaseSeeder` hanya di environment `local` dan `testing`. Week 8 akan memperluas seeder ini dengan data transaksi realistis tanpa mengubah mekanisme perlindungan environment yang sudah ada.

---

## 5. Demo Scenario

### 5.1 Profil Bisnis Demo

| Field              | Value                       |
| :----------------- | :-------------------------- |
| Nama Bisnis        | Kos Melati Purwokerto       |
| Jenis Bisnis       | `KOS_PROPERTY`              |
| Kota               | Purwokerto                  |
| Provinsi           | Jawa Tengah                 |
| Jumlah Kamar       | 20                          |
| Kamar Terisi       | 16                          |
| Karyawan           | 2                           |
| Hari Operasi/Bulan | 30                          |
| Daya Listrik       | 2.200 VA                    |
| Tarif per kWh      | Rp 1.444,70                 |
| Jenis Pelanggan    | Bisnis/Rumah Tangga         |
| Metode Pembayaran  | Pascabayar                  |

### 5.2 Data Listrik (Electricity Entries)

Minimal 6 bulan data dengan variasi realistis. Tarif per kWh mengikuti profil listrik bisnis (Rp 1.444,70 / kWh).

| Bulan       | usage_kwh | tariff_per_kwh | bill_amount_idr | Catatan                          |
| :---------- | --------: | -------------: | --------------: | :------------------------------- |
| Januari 2026  |       820 |       1.444,70 |      1.184.654  | Musim hujan, AC berkurang        |
| Februari 2026 |       780 |       1.444,70 |      1.126.866  | Bulan pendek                     |
| Maret 2026    |       850 |       1.444,70 |      1.227.995  | Normal                           |
| April 2026    |       910 |       1.444,70 |      1.314.677  | Awal musim kemarau, AC naik      |
| Mei 2026      |       940 |       1.444,70 |      1.358.018  | Puncak panas                     |
| Juni 2026     |       870 |       1.444,70 |      1.256.889  | Libur semester, penghuni turun   |

### 5.3 Data Pendapatan (Revenue Entries)

Pendapatan bulanan terkait jumlah kamar terisi × harga sewa. Asumsi sewa per kamar Rp 750.000–850.000/bulan.

| Bulan       | revenue_amount_idr | occupied_rooms | Catatan                           |
| :---------- | -----------------: | -------------: | :-------------------------------- |
| Januari 2026  |       12.800.000 |             16 | Penghuni stabil                   |
| Februari 2026 |       12.000.000 |             15 | 1 kamar kosong                    |
| Maret 2026    |       13.600.000 |             17 | Penghuni baru masuk               |
| April 2026    |       12.800.000 |             16 | Kembali normal                    |
| Mei 2026      |       12.000.000 |             15 | Libur lebaran, 1 penghuni keluar  |
| Juni 2026     |       10.400.000 |             13 | Libur semester, penghuni turun    |

### 5.4 Peralatan Listrik (Appliances)

Menggunakan template `KOS_PROPERTY` yang sudah ada di `ApplianceTemplates::kosProperty()`. Seeder akan menerapkan template via mekanisme yang sama dengan `ApplianceController@applyTemplate`, menghasilkan peralatan berikut:

| # | Nama Peralatan      | Kategori     | Daya (W) | Qty | Jam/Hari | Hari/Bulan |
| - | :------------------ | :----------- | -------: | --: | -------: | ---------: |
| 1 | AC kamar            | Pendingin    |      450 |   1 |        8 |         30 |
| 2 | Kipas angin         | Pendingin    |       50 |   1 |       10 |         30 |
| 3 | Lampu kamar         | Penerangan   |       12 |   1 |       10 |         30 |
| 4 | Lampu koridor       | Penerangan   |       15 |   2 |       12 |         30 |
| 5 | Pompa air           | Utilitas     |      250 |   1 |        3 |         30 |
| 6 | Dispenser           | Dapur        |      350 |   1 |        8 |         30 |
| 7 | Kulkas              | Dapur        |      100 |   1 |       24 |         30 |
| 8 | Router WiFi         | Utilitas     |       15 |   1 |       24 |         30 |
| 9 | CCTV                | Keamanan     |       15 |   1 |       24 |         30 |
|10 | Mesin cuci bersama  | Laundry      |      400 |   1 |        3 |         15 |

> [!NOTE]
> Jika seeder hanya menerapkan subset dari template untuk menjaga kesederhanaan, minimal 10 peralatan di atas harus disertakan. Nilai daya, jam, dan hari mengikuti default template `ApplianceTemplates::kosProperty()`.

### 5.5 Rekomendasi

Rekomendasi **tidak di-hardcode** di seeder. Rekomendasi dihasilkan secara otomatis oleh `RecommendationService` dan `EfficiencyScoreService` yang sudah ada, berdasarkan data listrik, pendapatan, dan peralatan yang di-seed. Seeder cukup menyediakan data input yang memadai — service layer yang menghasilkan insight.

### 5.6 Laporan (Reports)

Halaman `/reports` harus menampilkan laporan untuk minimal bulan berjalan dan beberapa bulan sebelumnya. `MonthlyReportService` akan menghitung laporan secara dinamis berdasarkan data listrik, pendapatan, dan peralatan yang tersedia. Seeder tidak perlu membuat entitas laporan — cukup pastikan data entry bulan-bulan sebelumnya tersedia agar service dapat meng-generate laporan.

### 5.7 Plans & Trial

Seeder membuat subscription dengan `plan = 'FREE'` secara default. Saat demo:

- **Paket Gratis**: Menunjukkan batasan (maks. 3 entri listrik, 3 entri pendapatan, 10 peralatan, template terkunci).
- **Pro Trial 30 Hari**: Demonstrator dapat mengaktifkan trial dari halaman `/plans` untuk menunjukkan fitur unlock.
- Jika demo memerlukan data >3 bulan di awal (6 bulan), seeder perlu membuat subscription `PRO_TRIAL` aktif agar data tidak terkena gating. Alternatif: seed data tanpa melewati controller validation.

> [!IMPORTANT]
> Untuk demo realistis dengan 6 bulan data, seeder harus meng-insert langsung ke database (bypass controller validation) atau menggunakan subscription `PRO_TRIAL` aktif. Pilihan diputuskan saat implementasi seeder.

---

## 6. Manual Demo Flow

Alur demonstrasi langkah demi langkah untuk presentasi stakeholder:

### Step 1: Login
1. Buka browser, navigasi ke `http://localhost:8000/login`.
2. Masukkan email `demo@wattwise.local` dan password `password`.
3. Klik tombol **Login**.
4. **Expected**: Redirect ke `/dashboard`.

### Step 2: Dashboard Overview
1. Perhatikan kartu sambutan dengan nama "Demo WattWise".
2. Tunjukkan business switcher menampilkan "Kos Melati Purwokerto (Purwokerto)".
3. Tunjukkan ringkasan listrik bulan ini: estimasi tagihan, pemakaian kWh, rasio listrik/pendapatan, sisa pendapatan.
4. Tunjukkan kartu Efficiency Score dan Top Recommendations (jika tersedia).
5. Tunjukkan disclaimer di bagian bawah.
6. **Poin demo**: "Dashboard menampilkan ringkasan biaya listrik vs pendapatan secara real-time berdasarkan data yang Anda input."

### Step 3: Catat Listrik
1. Navigasi ke **Catat Listrik** (`/electricity`) via sidebar.
2. Tunjukkan tabel entri listrik yang sudah terisi 6 bulan.
3. Klik tombol **Tambah Entri Baru**.
4. Isi form dengan bulan yang belum ada (misal Juli 2026) dengan data realistis.
5. Submit dan tunjukkan entri baru muncul di tabel.
6. **Poin demo**: "Pencatatan listrik bulanan cepat, dan estimasi biaya langsung terhitung."

### Step 4: Catat Pendapatan
1. Navigasi ke **Catat Pendapatan** (`/revenue`) via sidebar.
2. Tunjukkan tabel entri pendapatan yang sudah terisi 6 bulan.
3. Tambahkan entri bulan Juli 2026 jika relevan.
4. **Poin demo**: "Hubungan antara pendapatan dan biaya listrik menjadi terlihat jelas."

### Step 5: Peralatan
1. Navigasi ke **Peralatan** (`/appliances`) via sidebar.
2. Tunjukkan daftar 10+ peralatan yang sudah ter-seed dari template.
3. Tunjukkan estimasi kWh dan biaya bulanan per alat.
4. Klik salah satu peralatan (misal AC kamar), edit jam pemakaian dari 8 menjadi 10.
5. Tunjukkan perubahan estimasi biaya.
6. **(Opsional)** Tunjukkan tombol **Terapkan Template** (jika paket Pro Trial aktif).
7. **Poin demo**: "WattWise mengestimasi kontribusi biaya listrik per peralatan berdasarkan daya dan pemakaian yang Anda input."

### Step 6: Rekomendasi
1. Navigasi ke **Rekomendasi** (`/recommendations`) via sidebar.
2. Tunjukkan Efficiency Score dan label (GOOD/WATCH/CHECK).
3. Tunjukkan daftar rekomendasi penghematan yang muncul secara otomatis.
4. Tunjukkan disclaimer di bagian bawah.
5. **Poin demo**: "Rekomendasi dihasilkan secara otomatis berdasarkan pola data Anda, bukan template generik."

### Step 7: Laporan
1. Navigasi ke **Laporan** (`/reports`) via sidebar.
2. Tunjukkan dropdown pemilihan bulan — pilih bulan terbaru.
3. Tunjukkan ringkasan laporan: biaya listrik, pendapatan, rasio, skor efisiensi, trend.
4. Pilih bulan yang lebih lama untuk menunjukkan riwayat.
5. Tunjukkan disclaimer di bagian bawah laporan.
6. **Poin demo**: "Laporan bulanan komprehensif membantu pemantauan tren biaya energi dari waktu ke waktu."

### Step 8: Paket & Trial
1. Navigasi ke **Paket** (`/plans`) via sidebar.
2. Tunjukkan perbandingan paket Gratis vs Pro.
3. Tunjukkan informasi bahwa semua paket dalam "tahap pilot dan validasi pasar".
4. **(Opsional)** Klik tombol **Mulai Pro Trial 30 Hari** untuk mendemonstrasikan aktivasi trial.
5. **Poin demo**: "Pengguna dapat mencoba semua fitur Pro selama 30 hari secara gratis."

### Step 9: Pengaturan
1. Navigasi ke **Pengaturan** (`/settings/profile`) via sidebar.
2. Tunjukkan halaman profil dan security settings.
3. **Poin demo**: "Pengguna dapat mengelola akun, password, dan keamanan two-factor."

### Step 10: Free Limit / Upgrade CTA
1. Jika akun masih di paket Gratis dan sudah ada 3+ entri listrik, navigasi ke `/electricity`.
2. Tunjukkan banner upgrade CTA yang muncul.
3. **Poin demo**: "WattWise memberi tahu pengguna ketika batas paket tercapai dan menawarkan upgrade secara transparan."

---

## 7. Manual QA Checklist

Checklist verifikasi manual sebelum demo atau deployment:

### 7.1 Autentikasi & Akun

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Login dengan email/password valid → redirect dashboard |   ☐    |
| 2 | Login dengan password salah → error message            |   ☐    |
| 3 | Register akun baru → email verification prompt         |   ☐    |
| 4 | Logout → redirect ke halaman login                     |   ☐    |
| 5 | Login kembali setelah logout                           |   ☐    |
| 6 | Akses `/dashboard` tanpa login → redirect ke login     |   ☐    |

### 7.2 Onboarding

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | User tanpa bisnis → diarahkan ke onboarding            |   ☐    |
| 2 | Isi form onboarding lengkap → bisnis dan profil dibuat |   ☐    |
| 3 | Validasi field required berfungsi                      |   ☐    |

### 7.3 Dashboard

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Dashboard menampilkan nama user dan bisnis aktif       |   ☐    |
| 2 | Ringkasan listrik muncul jika data tersedia            |   ☐    |
| 3 | Empty state muncul jika belum ada data                 |   ☐    |
| 4 | Efficiency Score muncul (jika data cukup)              |   ☐    |
| 5 | Disclaimer terlihat di bagian bawah                    |   ☐    |
| 6 | Business switcher berfungsi (jika ada >1 bisnis)       |   ☐    |

### 7.4 Catat Listrik

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Tabel entri listrik menampilkan data yang ada          |   ☐    |
| 2 | Form tambah entri berfungsi (submit + validasi)        |   ☐    |
| 3 | Duplikat bulan dicegah (validasi unik)                 |   ☐    |
| 4 | Estimasi tagihan terhitung otomatis jika kosong        |   ☐    |
| 5 | Disclaimer terlihat                                    |   ☐    |

### 7.5 Catat Pendapatan

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Tabel entri pendapatan menampilkan data yang ada       |   ☐    |
| 2 | Form tambah entri berfungsi (submit + validasi)        |   ☐    |
| 3 | Disclaimer terlihat                                    |   ☐    |

### 7.6 Peralatan

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Daftar peralatan menampilkan semua item                |   ☐    |
| 2 | Estimasi kWh dan biaya per alat terhitung              |   ☐    |
| 3 | Tambah peralatan baru berfungsi                        |   ☐    |
| 4 | Edit peralatan (daya, jam, hari) berfungsi             |   ☐    |
| 5 | Hapus peralatan berfungsi                              |   ☐    |
| 6 | Terapkan Template berfungsi (paket Pro/Trial)          |   ☐    |
| 7 | Disclaimer terlihat                                    |   ☐    |

### 7.7 Rekomendasi

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Efficiency Score muncul dengan label dan penjelasan    |   ☐    |
| 2 | Daftar rekomendasi muncul (bukan hardcoded)            |   ☐    |
| 3 | Paket Gratis menampilkan blur/lock pada item ke-4+     |   ☐    |
| 4 | Disclaimer terlihat                                    |   ☐    |

### 7.8 Laporan

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Dropdown bulan menampilkan bulan yang ada data         |   ☐    |
| 2 | Laporan bulan terbaru menampilkan data lengkap         |   ☐    |
| 3 | Bulan lebih lama accessible (paket Pro) atau locked    |   ☐    |
| 4 | Bulan invalid ditolak dengan pesan error               |   ☐    |
| 5 | Disclaimer terlihat                                    |   ☐    |

### 7.9 Paket & Trial

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Halaman Plans menampilkan perbandingan paket           |   ☐    |
| 2 | Pesan "pilot dan validasi pasar" terlihat              |   ☐    |
| 3 | Tombol Pro Trial muncul untuk user Gratis              |   ☐    |
| 4 | Aktivasi trial berhasil → paket berubah ke PRO_TRIAL   |   ☐    |
| 5 | Trial kedua ditolak (tidak bisa aktifkan dua kali)     |   ☐    |
| 6 | Trial expired → fallback ke paket Gratis               |   ☐    |

### 7.10 Pengaturan & Keamanan

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | Halaman profil menampilkan data user                   |   ☐    |
| 2 | Update nama dan email berfungsi                        |   ☐    |
| 3 | Halaman security accessible                            |   ☐    |
| 4 | Update password berfungsi                              |   ☐    |

### 7.11 Edge Cases

| # | Item                                                  | Status |
| - | :---------------------------------------------------- | :----: |
| 1 | `/reports?month=invalid` → handled gracefully          |   ☐    |
| 2 | Batas entri listrik tercapai (Gratis, 3 bulan) → CTA  |   ☐    |
| 3 | Batas entri pendapatan tercapai → CTA                  |   ☐    |
| 4 | Batas peralatan tercapai (Gratis, 10 alat) → CTA      |   ☐    |
| 5 | Akses data bisnis milik user lain → 403/404            |   ☐    |

---

## 8. Smoke Test Commands

Perintah-perintah yang harus dijalankan dan **harus lulus** sebelum demo atau deployment:

### Dari repo root (`D:\LOMBA\Startup Proto`)

```bash
# Frontend build (root-level jika ada)
npm run build
```

### Dari direktori Laravel (`wattwise-laravel/`)

```bash
# Verifikasi daftar rute
php artisan route:list

# Verifikasi status migrasi
php artisan migrate:status

# Jalankan seluruh test suite
php artisan test

# Build frontend Vite
npm run build

# (Opsional) Jalankan Prisma validate jika masih terkait
# npx prisma validate && npx prisma generate
```

### Kriteria Lulus Smoke Test

| Command               | Expected Result                        |
| :--------------------- | :------------------------------------- |
| `php artisan test`     | Semua tes passed, 0 failures           |
| `npm run build`        | Build sukses, `public/build/` terisi   |
| `php artisan route:list` | Semua rute terdaftar tanpa error     |
| `php artisan migrate:status` | Semua migrasi sudah dijalankan   |

---

## 9. Production Environment Checklist

Variabel lingkungan dan konfigurasi yang **wajib diperiksa** sebelum deployment ke staging/production:

### 9.1 Core Application

| Variable        | Required Value / Notes                               | Checked |
| :-------------- | :--------------------------------------------------- | :-----: |
| `APP_ENV`       | `production` (bukan `local`)                         |    ☐    |
| `APP_DEBUG`     | `false` (WAJIB false di production)                  |    ☐    |
| `APP_KEY`       | Generated via `php artisan key:generate`, unik       |    ☐    |
| `APP_URL`       | URL produksi lengkap (https://...)                   |    ☐    |
| `VITE_APP_NAME` | `WattWise AI`                                        |    ☐    |

### 9.2 Database

| Variable        | Required Value / Notes                               | Checked |
| :-------------- | :--------------------------------------------------- | :-----: |
| `DATABASE_URL`  | Connection string Supabase PostgreSQL                |    ☐    |
| `DIRECT_URL`    | Direct connection string (jika pgBouncer digunakan)  |    ☐    |
| `DB_CONNECTION` | `pgsql`                                              |    ☐    |
| `DB_SSLMODE`    | `require` (Supabase memerlukan SSL)                  |    ☐    |

### 9.3 Supabase PostgreSQL SSL

| Item                                                    | Checked |
| :------------------------------------------------------ | :-----: |
| SSL mode diset ke `require` atau `verify-full`          |    ☐    |
| Sertifikat SSL Supabase tersedia jika `verify-full`     |    ☐    |
| Koneksi berhasil dari server deployment                 |    ☐    |

### 9.4 Session, Cache, Queue

| Variable            | Recommended Value                                 | Checked |
| :------------------ | :------------------------------------------------ | :-----: |
| `SESSION_DRIVER`    | `database` atau `redis` (bukan `file` di cloud)   |    ☐    |
| `CACHE_STORE`       | `database` atau `redis`                           |    ☐    |
| `QUEUE_CONNECTION`  | `database` atau `redis` (jika ada job asinkron)    |    ☐    |

### 9.5 Mail

| Variable     | Notes                                             | Checked |
| :----------- | :------------------------------------------------ | :-----: |
| `MAIL_MAILER`| Konfigurasi SMTP / Resend / Mailgun sesuai kebutuhan |  ☐    |
| `MAIL_FROM_ADDRESS` | Alamat pengirim yang valid                 |    ☐    |

### 9.6 Security & Secrets

| Item                                                    | Checked |
| :------------------------------------------------------ | :-----: |
| Tidak ada secret/token di-commit ke repository          |    ☐    |
| File `.env` tidak ter-commit (ada di `.gitignore`)      |    ☐    |
| `APP_KEY` unik dan berbeda dari development             |    ☐    |
| Password demo tidak digunakan sebagai kredensial produksi |  ☐    |

---

## 10. Deployment Notes

### 10.1 Struktur Direktori

Aplikasi Laravel berada di subdirektori `wattwise-laravel/` dalam repository. Server deployment harus mengarahkan document root ke `wattwise-laravel/public/`.

### 10.2 Build Frontend

```bash
cd wattwise-laravel
npm ci
npm run build
```

Direktori `public/build/` harus terisi setelah build. Jika deployment menggunakan CI/CD, pastikan build step dijalankan sebelum deploy.

### 10.3 Migrasi Database

```bash
cd wattwise-laravel
php artisan migrate --force
```

Flag `--force` diperlukan di production. Pastikan backup database dilakukan sebelum migrasi di lingkungan dengan data nyata.

### 10.4 Seeder

> [!WARNING]
> Seeder demo (`WattWiseDemoSeeder`) **tidak boleh dijalankan secara otomatis di production** kecuali secara eksplisit dimaksudkan untuk staging demo. `DatabaseSeeder` sudah mengecek `app()->environment('local', 'testing')` sebelum memanggil demo seeder.

Jika staging memerlukan data demo:
```bash
php artisan db:seed --class=WattWiseDemoSeeder
```

### 10.5 Storage Link

```bash
php artisan storage:link
```

Diperlukan jika ada file yang di-serve dari `storage/app/public`. Saat ini belum ada fitur upload file, tetapi link ini sebaiknya disiapkan.

### 10.6 Queue Worker

Jika ada job asinkron (saat ini belum digunakan), jalankan queue worker:
```bash
php artisan queue:work --tries=3
```

Gunakan process manager (Supervisor, systemd, dll.) untuk menjaga worker tetap berjalan di production.

### 10.7 Scheduler

Jika ada scheduled jobs (saat ini belum digunakan):
```bash
# Tambahkan ke crontab
* * * * * cd /path/to/wattwise-laravel && php artisan schedule:run >> /dev/null 2>&1
```

### 10.8 Permissions

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 10.9 Optimasi Production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 11. Launch Risk Checklist

Risiko-risiko yang harus dimitigasi sebelum go-live:

| # | Risiko                                               | Mitigasi                                                        | Status |
| - | :--------------------------------------------------- | :-------------------------------------------------------------- | :----: |
| 1 | **Environment variables salah**                       | Gunakan checklist Section 9; verifikasi `APP_ENV=production`     |   ☐    |
| 2 | **Migrasi database belum dijalankan**                 | Jalankan `php artisan migrate:status` sebelum setiap deployment  |   ☐    |
| 3 | **`APP_DEBUG` tetap `true` di production**            | Review `.env` production; tambahkan di CI/CD check               |   ☐    |
| 4 | **Password demo terekspos di production**             | Jangan jalankan `WattWiseDemoSeeder` di production; hapus akun demo jika ada |   ☐    |
| 5 | **Supabase SSL misconfigured**                        | Tes koneksi dari server deployment; pastikan `DB_SSLMODE=require` |   ☐    |
| 6 | **Assets `public/build/` stale atau kosong**          | Jalankan `npm run build` di CI/CD; verifikasi output             |   ☐    |
| 7 | **Route broken setelah deployment**                   | Jalankan `php artisan route:list` post-deploy; smoke test manual |   ☐    |
| 8 | **Plan gating tidak berfungsi**                       | Jalankan `php artisan test --filter=PlanGating`                  |   ☐    |
| 9 | **Disclaimer hilang**                                 | Jalankan `php artisan test --filter=SafeWording`                 |   ☐    |
|10 | **Unsafe wording regression**                         | Jalankan `php artisan test --filter=SafeWording`; review diff    |   ☐    |
|11 | **Data isolation breach**                             | Jalankan `php artisan test --filter=DataIsolation`               |   ☐    |
|12 | **CORS misconfigured**                                | Verifikasi `config/cors.php` sesuai domain production            |   ☐    |
|13 | **Session fixation / cookie misconfigured**           | Pastikan `SESSION_SECURE_COOKIE=true` di HTTPS                   |   ☐    |

---

## 12. Demo Acceptance Criteria

Kriteria penerimaan yang harus dipenuhi sebelum demo dianggap siap:

| # | Kriteria                                              | Met? |
| - | :---------------------------------------------------- | :--: |
| 1 | Akun demo (`demo@wattwise.local`) ada secara lokal    |  ☐   |
| 2 | Data demo terlihat realistis (bukan placeholder)      |  ☐   |
| 3 | Dashboard memiliki data bermakna (bukan kosong)        |  ☐   |
| 4 | Rekomendasi muncul dari service (bukan hardcoded)      |  ☐   |
| 5 | Laporan tersedia untuk beberapa bulan                  |  ☐   |
| 6 | Halaman Plans berfungsi dan menampilkan perbandingan   |  ☐   |
| 7 | Trial dapat didemonstrasikan dengan aman               |  ☐   |
| 8 | Semua smoke test commands lulus                         |  ☐   |
| 9 | Tidak ada secret yang di-commit ke repository          |  ☐   |
|10 | Disclaimer wajib tetap terlihat di semua halaman       |  ☐   |
|11 | Tidak ada fitur terlarang yang ditambahkan             |  ☐   |
|12 | Navigasi sidebar lengkap dan konsisten                 |  ☐   |
|13 | Empty states ditangani dengan ramah di semua halaman   |  ☐   |

---

## 13. Commit Strategy

Week 8 direkomendasikan dipecah menjadi commit-commit kecil berikut:

### Commit 1: Spec Document
```
docs: add Week 8 demo and launch readiness specification
```
File: `docs/rewrite/week-8-demo-launch-readiness-spec.md`

### Commit 2: Demo Seed & Checklist
```
feat: expand demo seeder with realistic transaction data
```
Files:
- `database/seeders/WattWiseDemoSeeder.php` (expanded)
- `docs/rewrite/demo-qa-checklist.md` (opsional, jika dipisah dari spec)

### Commit 3: Optional Tiny Polish
```
fix: minor polish fixes for demo readiness
```
Files: Hanya file yang benar-benar perlu diperbaiki; kosong jika tidak ada masalah.

> [!TIP]
> Jangan mencampur perubahan spec/dokumentasi dengan perubahan kode aplikasi dalam satu commit. Ini memudahkan revert jika diperlukan.

---

## 14. File Reference

### Existing Files (Sudah Ada)

| File                                                    | Deskripsi                         |
| :------------------------------------------------------ | :-------------------------------- |
| `database/seeders/WattWiseDemoSeeder.php`                | Demo seeder (user + bisnis dasar) |
| `database/seeders/DatabaseSeeder.php`                    | Entry point seeder                |
| `app/Support/Appliances/ApplianceTemplates.php`          | Template peralatan per segment    |
| `app/Services/FeatureGateService.php`                    | Plan gating logic                 |
| `app/Services/Recommendations/RecommendationService.php` | Rule-based recommendations        |
| `app/Services/Recommendations/EfficiencyScoreService.php`| Efficiency score calculator       |
| `app/Services/Reports/MonthlyReportService.php`          | Monthly report generator          |

### Files to Create/Modify (Week 8 Implementation)

| File                                                    | Action   | Deskripsi                              |
| :------------------------------------------------------ | :------- | :------------------------------------- |
| `docs/rewrite/week-8-demo-launch-readiness-spec.md`     | CREATE   | Dokumen ini                            |
| `database/seeders/WattWiseDemoSeeder.php`                | MODIFY   | Tambah data listrik, pendapatan, peralatan |

---

## 15. Timeline Estimasi

| Task                                 | Estimasi     |
| :----------------------------------- | :----------- |
| Spec document (dokumen ini)          | ✅ Selesai    |
| Expand demo seeder                   | 1–2 jam      |
| Manual QA walkthrough                | 30–45 menit  |
| Smoke test verification              | 15 menit     |
| Optional polish fixes                | 0–30 menit   |
| **Total Week 8**                     | **2–4 jam**  |
