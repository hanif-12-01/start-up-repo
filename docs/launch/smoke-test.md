# Panduan Uji Asap (Smoke Test) Cepat WattWise AI

Dokumen ini berisi daftar perintah otomatis dan langkah pengujian cepat (smoke test) di lingkungan browser untuk memastikan aplikasi WattWise AI (Laravel Rewrite Version) berfungsi normal dan siap dirilis.

---

## 1. Perintah Uji Asap Otomatis

Jalankan perintah-perintah berikut di terminal untuk memastikan tidak ada kesalahan konfigurasi atau bug sintaksis yang merusak aplikasi.

### Bagian A: Perintah dari Root Repositori (`D:\LOMBA\Startup Proto`)

```bash
# Periksa status repositori git dan pastikan tidak ada konflik git
git status -sb

# (Opsional) Jalankan build root jika ada penyesuaian aset lawas
npm run build
```

### Bagian B: Perintah dari Folder Laravel (`D:\LOMBA\Startup Proto\wattwise-laravel`)

Pindah ke folder aplikasi Laravel, lalu jalankan serangkaian validasi berikut:

```bash
cd wattwise-laravel

# 1. Validasi struktur file composer.json
composer validate

# 2. Verifikasi seluruh rute internal terdaftar tanpa error sintaksis
# Pastikan tidak ada rute pembayaran/checkout (Stripe, Midtrans, dsb) atau rute Next.js lama
php artisan route:list

# 3. Verifikasi status migrasi database (harus berstatus "Ran")
php artisan migrate:status

# 4. Jalankan seluruh test suite otomatis (harus 100% Passed - 213 tests)
php artisan test

# 5. Jalankan build aset Vite (wajib dilakukan sebelum deploy)
npm run build

# 6. Jalankan uji diagnostik demo lokal
php artisan wattwise:diagnose-demo-login
```

> [!WARNING]
> **Pemisahan Port Server**: Vite dev server (`npm run dev`) biasanya berjalan pada port `5173`. Ini **bukan** port aplikasi utama, melainkan hanya untuk hot reloading aset. Anda harus selalu mengakses aplikasi utama melalui web server Laravel di `http://localhost:8000`.

---

## 2. Perintah Pengisian Data Demo Lokal (Opsional)

Jika Anda ingin mengisi ulang database lokal dengan data simulasi 6 bulan Kos Melati Purwokerto untuk kepentingan demonstrasi, jalankan perintah seeder berikut:
```bash
php artisan db:seed --class=WattWiseDemoSeeder
```

---

## 3. Pengujian Cepat di Lingkungan Browser (Browser Smoke Test)

Lakukan verifikasi cepat di browser lokal (`http://localhost:8000`) setelah menjalankan perintah di atas:

1. **Login**: Buka halaman `/login`, gunakan email `demo@wattwise.local` dan password `password`. Pastikan login berhasil tanpa kendala.
2. **Dashboard**: Buka halaman `/dashboard`. Verifikasi bahwa grafik ringkasan listrik, data pemakaian, dan kartu efisiensi terisi dengan data riil dari seeder.
3. **Peralatan**: Buka halaman `/appliances`. Verifikasi ada minimal 10 peralatan kos yang tampil dengan estimasi biaya per alat.
4. **Rekomendasi**: Buka halaman `/recommendations`. Pastikan tips hemat energi rule-based termuat secara lengkap.
5. **Laporan**: Buka halaman `/reports`. Pastikan laporan bulan berjalan dan riwayat bulan lalu dapat dibuka dari dropdown.
6. **Paket**: Buka halaman `/plans`. Verifikasi bahwa status paket aktif pengguna saat ini terdeteksi sebagai `PRO_TRIAL` atau `Gratis`.

---

## 4. Kriteria Kelayakan Lulus Uji Asap (Pass Criteria)

Aplikasi dianggap lulus uji asap jika memenuhi kriteria berikut:
* **Perintah Terminal**: Seluruh perintah di bagian 1 dan 2 selesai dijalankan dengan status sukses (exit code `0`).
* **Test Suite**: Output dari `php artisan test` menunjukkan **213 passed** dengan **0 failures**.
* **Diagnostik Akun Demo**: Output dari `php artisan wattwise:diagnose-demo-login` selesai dengan status sukses dan mengonfirmasi kesiapan fungsional login serta data seeder demo.
* **Frontend Compilation**: Hasil build dari `npm run build` sukses memproduksi manifest aset di folder `public/build/`.
* **Keterlihatan Halaman**: Tidak ada halaman blank (putih polos), error 500, atau kendala pemuatan aset CSS/JS di browser.

---

## 5. Panduan Pemecahan Masalah (Troubleshooting)

| Masalah | Kemungkinan Penyebab | Tindakan Solusi |
| :--- | :--- | :--- |
| **Blank Page / Halaman Putih Polos** | Aset Vite belum dikompilasi atau file manifest tidak terbaca. | Jalankan ulang perintah `npm run build` di direktori `wattwise-laravel`. Pastikan folder `public/build` terisi. |
| **Migration Error (Database Locked / Missing Table)** | Perubahan skema di database Supabase belum diselaraskan dengan migrasi Laravel terbaru. | Jalankan perintah `php artisan migrate` untuk memperbarui skema database. |
| **Demo Data Missing (Data Kosong)** | Seeder demo belum dijalankan di database lokal. | Jalankan `php artisan db:seed --class=WattWiseDemoSeeder` untuk mengembalikan data demo. |
| **Supabase SSL Connection Error** | Driver PostgreSQL memerlukan koneksi SSL aman tetapi parameter tidak diset. | Buka berkas `.env`, pastikan terdapat baris `DB_SSLMODE=require` di bawah konfigurasi database. |
| **Auth / Session Issue (Gagal Login / Sesi Cepat Berakhir)** | Driver sesi salah dikonfigurasi atau permission folder storage diblokir. | Pastikan folder `storage/framework/sessions` dapat ditulis, atau alihkan driver sesi ke database (`SESSION_DRIVER=database` di berkas `.env`). |
| **Error 500 Terkait Route Not Found** | Cache rute Laravel usang setelah pembaruan kode. | Jalankan `php artisan route:clear` lalu `php artisan route:cache` untuk menyegarkan daftar rute. |
