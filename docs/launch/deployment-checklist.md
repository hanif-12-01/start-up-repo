# Panduan Deployment & Kesiapan Lingkungan WattWise AI

Dokumen ini berisi panduan teknis deployment aplikasi WattWise AI (Laravel Rewrite Version) ke lingkungan staging maupun produksi, serta checklist kesiapan variabel lingkungan (.env).

---

## 1. Catatan Struktur Repositori

Repositori WattWise AI memiliki komponen berikut:
* **`wattwise-laravel/`**: Aplikasi utama produksi saat ini yang merupakan penulisan ulang lengkap (Laravel rewrite) menggunakan tumpukan Laravel + Inertia.js + Vue.js. Seluruh deployment baru ditargetkan ke subdirektori ini.
* **`src/` & `app/` (Next.js Lama)**: Aplikasi Next.js versi lama yang bersifat **legacy/reference only**. Jangan mengubah berkas Next.js lama dan jangan hubungkan Next.js ke Laravel.

---

## 1b. Parameter Rilis & Batasan MVP (Release Parameters & MVP Limitations)

Sebelum melakukan deployment, harap pahami batasan dan parameter rilis MVP berikut:
* **Lokasi Aplikasi Laravel**: Folder `wattwise-laravel` di dalam repositori root.
* **URL Aplikasi Lokal**: `http://localhost:8000` (dijalankan via `php artisan serve`).
* **Pemisahan Server Vite**: Peringatan keras bahwa Vite dev server (`npm run dev`, biasanya berjalan di port 5173) **bukanlah aplikasi utama**. Port tersebut hanya digunakan oleh HMR (Hot Module Replacement) untuk aset frontend. Akses utama aplikasi selalu melalui port `http://localhost:8000`.
* **Kredensial Login Demo**: `demo@wattwise.local` dengan kata sandi `password`.
* **Perintah Diagnostik Demo**: Jalankan `php artisan wattwise:diagnose-demo-login` untuk memvalidasi atau memperbaiki (dengan flag `--fix`) fungsionalitas akun demo lokal.
* **Status Pengujian**: Seluruh test suite otomatis saat ini lulus dengan total **213 passed** dan **0 failures**.
* **Persyaratan Build Aset**: Perintah `npm run build` **wajib** dijalankan sebelum deployment ke produksi untuk menghasilkan manifest aset statis.
* **Batasan & Non-Goals MVP**:
  - **Bukan Aplikasi Resmi PLN**: WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan tidak memiliki integrasi API resmi dengan PLN.
  - **Tanpa Payment Gateway**: MVP ini tidak mengintegrasikan sistem pembayaran riil (tidak ada Stripe, Midtrans, Xendit, checkout, tagihan invoice, maupun webhook langganan). Paket Pro diuji coba melalui tombol simulasi uji coba 30 hari secara gratis.
  - **Tanpa Ekspor PDF**: Tombol ekspor/unduh laporan PDF tidak tersedia/terkunci untuk pengembangan fase berikutnya.
  - **Tanpa IoT/Sensor**: Platform ini tidak menggunakan integrasi hardware IoT/sensor fisik untuk mengukur pemakaian listrik secara real-time.
  - **Tanpa Model LSTM/Eksternal AI API**: Analisis efisiensi menggunakan rule-based engine hibrida lokal (tidak ada pemanggilan API OpenAI/Gemini atau inferensi LSTM lokal).

---

## 2. Langkah-Langkah Build & Deployment

Lakukan langkah-langkah berikut secara berurutan di server deployment:

### Langkah A: Persiapan Kode & Repositori
1. Pastikan Anda berada di branch utama (`main`).
2. Tarik kode terbaru dari server origin:
   ```bash
   git pull origin main
   ```

### Langkah B: Instalasi Dependensi & Build Frontend
Pindah ke direktori Laravel dan jalankan proses instalasi serta build aset:
```bash
cd wattwise-laravel

# Instalasi dependensi backend PHP
composer install --no-dev --optimize-autoloader

# Instalasi dependensi frontend Node
npm ci

# Kompilasi aset frontend untuk produksi via Vite
npm run build
```

### Langkah C: Migrasi Database
Jalankan migrasi database di lingkungan produksi menggunakan flag `--force` agar berjalan secara non-interaktif:
```bash
php artisan migrate --force
```

### Langkah D: Optimasi Performa Laravel (Opsional tetapi Direkomendasikan)
Jalankan perintah cache berikut untuk meningkatkan kecepatan pemuatan rute dan konfigurasi:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### Langkah E: Pengaturan Izin Direktori (Permissions)
Pastikan web server memiliki akses tulis ke folder storage dan bootstrap cache:
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## 3. Checklist Variabel Lingkungan (.env)

Verifikasi bahwa file `.env` di server produksi dikonfigurasi dengan nilai-nilai berikut:

| Nama Variabel | Nilai yang Direkomendasikan / Catatan | Status |
| :--- | :--- | :---: |
| `APP_ENV` | `production` | [ ] |
| `APP_DEBUG` | `false` (Wajib diset false demi keamanan) | [ ] |
| `APP_KEY` | Kunci unik, buat menggunakan `php artisan key:generate` | [ ] |
| `APP_URL` | Domain HTTPS resmi (misalnya `https://wattwise.ai`) | [ ] |
| `DATABASE_URL` | String koneksi utama Supabase PostgreSQL | [ ] |
| `DIRECT_URL` | String koneksi langsung (direct connection) jika menggunakan pgBouncer | [ ] |
| `DB_CONNECTION` | `pgsql` | [ ] |
| `DB_SSLMODE` | `require` (Wajib untuk koneksi aman ke Supabase) | [ ] |
| `SESSION_DRIVER` | `database` atau `redis` (jangan gunakan driver `file` di hosting serverless) | [ ] |
| `CACHE_STORE` | `database` atau `redis` | [ ] |
| `QUEUE_CONNECTION` | `database` atau `redis` | [ ] |
| `MAIL_MAILER` | SMTP / Resend / Mailgun (sesuai layanan pengiriman email) | [ ] |
| `VITE_APP_NAME` | `WattWise AI` | [ ] |

---

## 4. Keamanan & Proteksi Rahasia (Security Checklist)

Sebelum melakukan perilisan resmi, pastikan poin keamanan berikut terpenuhi:
- [ ] File `.env` produksi tidak ter-commit ke dalam repositori git (sudah terdaftar di `.gitignore`).
- [ ] Tidak ada token API, password database, atau kunci enkripsi yang tertulis langsung (*hardcoded*) di dalam source code.
- [ ] Akun demo `demo@wattwise.local` dengan password `password` **tidak boleh digunakan sebagai kredensial admin produksi**.
- `WattWiseDemoSeeder` terlindungi: Pastikan data demo tidak di-seed secara tidak sengaja ke database produksi. Seeder utama `DatabaseSeeder` sudah memiliki pengaman lingkungan (`app()->environment('local', 'testing')`), tetapi pastikan Anda tidak menjalankan `php artisan db:seed --class=WattWiseDemoSeeder` di database produksi yang aktif.
- [ ] SSL PostgreSQL diaktifkan dengan benar (`DB_SSLMODE=require`) untuk mencegah sniffing data transaksi.

---

## 5. Uji Asap Pasca-Deploy (Post-Deploy Smoke Test)

Segera setelah server aktif di produksi, buka browser dan lakukan verifikasi manual cepat pada rute-rute produksi:
1. **Pendaftaran & Login**: Buat akun baru, verifikasi email, lalu login.
2. **Dashboard**: Pastikan tidak ada halaman kosong (blank page) atau error database. Kartu prediksi dan estimasi harus muncul dengan label default "Data belum cukup" untuk user baru.
3. **Catat Listrik**: Tambahkan satu entri listrik bulanan secara acak, simpan, lalu verifikasi datanya tersimpan di tabel.
4. **Catat Pendapatan**: Tambahkan entri pendapatan, simpan, dan periksa perubahan rasio keuangan.
5. **Peralatan**: Tambahkan satu alat listrik baru, edit dayanya, dan hapus kembali. Pastikan kalkulasi estimasi watt berjalan.
6. **Rekomendasi**: Periksa apakah skor efisiensi listrik terhitung dan rekomendasi aturan cerdas ditampilkan.
7. **Laporan**: Buka halaman laporan bulanan dan pastikan disclaimer penafian hukum tercantum lengkap di bagian bawah.
8. **Paket**: Buka halaman Paket dan pastikan penawaran paket Gratis/Pro Trial ditampilkan dengan benar.
9. **Pengaturan**: Coba ganti nama profil dan pastikan perubahan tersimpan di database.

---

## 6. Prosedur Rollback Darurat

Jika rilis produksi versi Laravel rewrite mengalami kegagalan fatal:
1. Hubungkan domain web server kembali ke build web server Next.js versi lama (`src/` / `app/`) yang stabil.
2. Hentikan proses web server Laravel sementara.
3. Selidiki log error backend di `storage/logs/laravel.log` untuk menemukan akar masalah.
4. Perbaiki bug di branch lokal, uji kembali melalui test suite, lalu ulangi proses deployment.

---

## 7. Risiko Peluncuran & Mitigasi

| # | Risiko Spesifik | Mitigasi / Solusi |
| - | :--- | :--- |
| 1 | **Stale Assets (Tampilan Berantakan)** | Jalankan `npm run build` di server dan bersihkan cache browser/CDN jika diperlukan. |
| 2 | **Koneksi Supabase Ditolak** | Pastikan string `DATABASE_URL` menggunakan port yang benar dan parameter `DB_SSLMODE=require` sudah aktif. |
| 3 | **APP_DEBUG Terlupa Aktif** | Selalu jalankan audit otomatis pasca-deploy untuk memverifikasi nilai `APP_DEBUG=false` di `.env`. |
| 4 | **Batas Memori PHP Terlampaui** | Jika migrasi atau kompilasi lambat, sesuaikan nilai `memory_limit` di berkas `php.ini` server minimal 512M. |
| 5 | **Regresi Istilah Hukum (PLN Rule)** | Pastikan tidak ada perubahan manual pada file bahasa/UI yang membuang kata-kata disclaimer wajib atau memasukkan kata-kata garansi akurasi. |
