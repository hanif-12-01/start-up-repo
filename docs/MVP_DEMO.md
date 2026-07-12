# WattWise AI — MVP Staging Demonstration Guide

Panduan ini berisi skenario demonstrasi mandiri 5–10 menit untuk juri kompetisi, beta tester, kolaborator, dan calon mitra untuk mengevaluasi fungsionalitas WattWise AI MVP pada lingkungan staging.

## Catatan Penting Sebelum Memulai
* **Tautan Staging:** [https://start-up-repo-staging.up.railway.app](https://start-up-repo-staging.up.railway.app)
* **Kredensial Demo:** Kredensial akun uji coba (email & kata sandi) disediakan secara privat demi keamanan lingkungan staging. Silakan hubungi tim pengembang untuk mendapatkannya.
* **Tujuan Demo:** Menunjukkan kemampuan pencatatan, pemindaian OCR lokal, visualisasi tren konsumsi, prediksi berbasis aturan deterministik, ekspor dokumen, dan simulasi paket pembayaran sandbox.

---

## Skenario Demonstrasi Langkah-demi-Langkah

### Langkah 1: Akses Landing & Halaman Masuk (Login)
* **Target Navigasi:** `/login`
* **Tindakan:** 
  1. Buka tautan staging.
  2. Perhatikan banner informasi "Demo lokal" berwarna hijau yang menampilkan status sistem demo siap digunakan.
  3. Masukkan kredensial demo privat yang telah Anda terima.
  4. Klik tombol **"Masuk"**.
* **Tampilan yang Diharapkan:** Form masuk bersih, tombol login dengan animasi pemuatan (*spinner*) saat proses autentikasi berlangsung, lalu redirect sukses ke dashboard.
* **Key Talking Point:** Aplikasi mendukung autentikasi aman standar Laravel Fortify, serta dilengkapi fitur verifikasi modern menggunakan kunci sandi fisik (*Passkey*).

---

### Langkah 2: Mengamati Usaha Aktif & Sistem Switcher
* **Target Navigasi:** `/dashboard` atau `/businesses`
* **Tindakan:**
  1. Amati nama properti aktif yang terpilih pada sidebar bagian atas (misalnya, **"Kos Melati Purwokerto"**).
  2. Klik menu switcher properti tersebut pada sidebar (jika ada lebih dari satu usaha) atau kunjungi halaman manajemen properti melalui link **"Kelola Properti / Usaha"**.
* **Tampilan yang Diharapkan:** Daftar properti aktif dengan rincian daya listrik (VA), tarif per kWh, jumlah kamar (untuk kos), dan status aktif.
* **Key Talking Point:** WattWise mendukung manajemen multi-properti (*multi-business*) di bawah satu akun pengguna tunggal dengan isolasi data yang ketat pada sisi server menggunakan cookie session (`wattwise_active_business_id`).

---

### Langkah 3: Meninjau Riwayat Listrik & Pendapatan
* **Target Navigasi:** `/electricity` dan `/revenue`
* **Tindakan:**
  1. Kunjungi menu **"Catat Listrik"** di sidebar untuk melihat riwayat pencatatan kWh meteran, tarif per kWh, total tagihan bulanan, dan status anomali tiap bulan.
  2. Kunjungi menu **"Catat Pendapatan"** di sidebar untuk meninjau pencatatan omzet kotor properti per bulan.
* **Tampilan yang Diharapkan:** Tabel riwayat data berjalan 6 bulan terakhir yang terurut secara kronologis dengan opsi penambahan data manual baru.
* **Key Talking Point:** Konsumsi energi dan pendapatan bulanan diorganisasikan per periode bulan untuk menghitung dampak biaya listrik terhadap profitabilitas usaha secara transparan.

---

### Langkah 4: Demonstrasi Browser-Local Meter OCR
* **Target Navigasi:** `/electricity`
* **Tindakan:**
  1. Pada halaman **"Catat Listrik"**, klik tombol **"Pindai Angka Meteran (OCR)"** atau gunakan formulir input.
  2. Unggah file gambar/foto angka kWh meteran listrik (Anda dapat menggunakan contoh foto meteran analog/digital standar).
  3. Tunggu pemrosesan pembacaan berjalan.
* **Tampilan yang Diharapkan:** Kotak pemrosesan gambar dengan indikator loading, disusul hasil pembacaan angka meteran digital secara otomatis lengkap dengan tingkat kepercayaan (*Confidence Level*).
* **Key Talking Point:** Mesin OCR menggunakan Tesseract.js yang dieksekusi secara **lokal di peramban pengguna** (browser-local). Foto tidak dikirimkan ke server eksternal, sehingga menghemat kuota internet dan menjaga kerahasiaan data pengguna.

---

### Langkah 5: Analisis Dashboard, Tren, & Prediksi Tagihan
* **Target Navigasi:** `/dashboard`
* **Tindakan:**
  1. Kembali ke halaman **"Dashboard"**.
  2. Tinjau grafik interaktif pemakaian energi (kWh) dan nominal biaya tagihan (Rp) selama 6 bulan terakhir.
  3. Amati bagian **"Prediksi Bulan Depan"** pada panel metrik dashboard.
* **Tampilan yang Diharapkan:** Grafik tren biaya listrik dan konsumsi kWh, rasio persentase biaya listrik terhadap pendapatan, serta kartu prediksi tagihan bulan berikutnya dalam Rupiah.
* **Key Talking Point:** Prediksi tagihan dihitung menggunakan algoritma deterministik yang dapat dijelaskan (*Explainable Forecasting*), yaitu perpaduan *Weighted Moving Average* (rata-rata bergerak berbobot) dan proyeksi tren linier. Model ML lanjutan (LSTM) di direktori `ML/` bertindak sebagai aset riset yang akan diaktifkan setelah data operasional beta terkumpul cukup banyak.

---

### Langkah 6: Evaluasi Sinyal Anomali & Rekomendasi Hemat Energi
* **Target Navigasi:** `/recommendations` atau `/dashboard`
* **Tindakan:**
  1. Tinjau panel peringatan dini (*Anomaly Detection*) di dashboard.
  2. Kunjungi menu **"Rekomendasi"** di sidebar.
* **Tampilan yang Diharapkan:** Daftar saran aksi penghematan daya listrik yang dikelompokkan berdasarkan jenis peralatan elektronik aktif (misalnya rekomendasi perawatan AC/freezer berkala atau penggantian lampu LED).
* **Key Talking Point:** Deteksi anomali membandingkan deviasi konsumsi berjalan terhadap rata-rata historis 3 bulan untuk mendeteksi lonjakan tidak wajar secara dini. Seluruh estimasi dilengkapi dengan pengaman matematis (*Sanity Check Guardrails*) untuk mencegah keluaran nilai negatif atau ekstrim.

---

### Langkah 7: Ekspor CSV & Streaming PDF Reports
* **Target Navigasi:** `/reports`
* **Tindakan:**
  1. Pada halaman **"Laporan"**, klik tombol **"Ekspor CSV"** untuk mengunduh data tabular.
  2. Klik tombol **"Unduh PDF"** pada salah satu baris bulan laporan yang tersedia.
* **Tampilan yang Diharapkan:** Berkas CSV terunduh secara instan ke perangkat lokal, dan dokumen PDF formal terbuat dan mengalir langsung (*streamed*) di tab peramban baru.
* **Key Talking Point:** Pembuatan PDF dilakukan di sisi server secara dinamis dan dialirkan langsung tanpa menyimpannya secara permanen di server, menghemat kapasitas penyimpanan server staging.

---

### Langkah 8: Memeriksa Paket Langganan & Simulasi Sandbox
* **Target Navigasi:** `/plans`
* **Tindakan:**
  1. Kunjungi menu **"Langganan"** atau **"Paket"** di sidebar.
  2. Tinjau pilihan paket (Free, Pro, Enterprise) dan batas limit usaha aktifnya.
  3. Klik tombol untuk memulai simulasi peningkatan paket langganan.
* **Tampilan yang Diharapkan:** Halaman pembayaran sandbox dengan label peringatan **"Simulation Mode Only"** yang jelas.
* **Key Talking Point:** WattWise mengimplementasikan otorisasi fitur dinamis melalui `FeatureGateService`. Seluruh alur penagihan berjalan di dalam modul simulasi sandbox yang aman tanpa memproses kartu kredit atau pembayaran riil.

---

### Langkah 9: Penjelasan WhatsApp Notifikasi Terlog
* **Target Navigasi:** (Penjelasan Konseptual / Audit Log Server)
* **Tindakan:**
  1. Jelaskan mekanisme pengingat pencatatan bulanan otomatis.
* **Tampilan yang Diharapkan:** Konfirmasi dari pengembang bahwa sistem notifikasi WhatsApp berjalan menggunakan driver `log` untuk keamanan pengujian staging.
* **Key Talking Point:** Untuk mencegah biaya pengiriman SMS/WhatsApp yang tidak diperlukan selama fase uji coba, modul WhatsApp dikonfigurasi dalam mode log-only. Seluruh pesan pengingat dapat diaudit dan diperiksa pada berkas `laravel.log` server lokal/staging.

---
*Panduan demonstrasi ini disusun berdasarkan rilis stabil WattWise v0.3-rc2.*
