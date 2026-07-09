# Checklist Manual QA WattWise AI

Dokumen ini digunakan oleh tim QA untuk melakukan verifikasi manual terhadap seluruh fungsionalitas utama aplikasi WattWise AI sebelum demo, program pilot, atau rilis ke produksi.

---

## 1. Pre-Check
- [ ] Database migrasi sudah berjalan lengkap tanpa error (`php artisan migrate:status`).
- [ ] Aset frontend Vite berhasil dikompilasi tanpa error (`npm run build`).
- [ ] Konfigurasi database Supabase PostgreSQL terhubung dengan aman.
- [ ] Tidak ada data kredensial atau rahasia asli di dalam file konfigurasi atau repositori git.

---

## 2. Autentikasi (Auth)
- [ ] Login menggunakan akun demo `demo@wattwise.local` dan password `password` berjalan sukses dan diarahkan ke `/dashboard`.
- [ ] Login dengan email tidak terdaftar atau password salah menampilkan pesan error yang ramah dan aman.
- [ ] Tombol logout membersihkan sesi secara bersih dan mengalihkan pengguna kembali ke `/login`.
- [ ] Pendaftaran akun baru berfungsi dan memicu verifikasi email atau notifikasi yang sesuai.
- [ ] Akses langsung ke halaman internal (seperti `/dashboard`, `/electricity`) saat belum masuk (guest) diarahkan kembali ke `/login`.

---

## 3. Onboarding Profil Bisnis
- [ ] Pengguna baru yang belum memiliki bisnis secara otomatis diarahkan ke halaman `/onboarding`.
- [ ] Form onboarding memvalidasi kolom input wajib (Nama bisnis, jenis bisnis, kota, provinsi, dsb).
- [ ] Memasukkan profil bisnis baru sukses menyimpan data profil, mengaktifkan bisnis, dan mengalihkan pengguna ke `/dashboard`.
- [ ] Pengguna yang sudah menyelesaikan onboarding tidak bisa masuk lagi ke `/onboarding` secara bebas (diarahkan kembali ke `/dashboard`).

---

## 4. Dashboard Utama
- [ ] Dashboard memuat nama bisnis aktif dan jenis usahanya (misalnya "Kos Melati Purwokerto").
- [ ] Nilai **Prediksi pemakaian listrik** (kWh) dan **Estimasi tagihan listrik** (Rupiah) muncul secara benar jika data tersedia.
- [ ] Widget rasio listrik terhadap pendapatan dan sisa keuntungan kas tampil dengan format desimal/IDR yang tepat.
- [ ] Widget **Kandidat alat yang perlu dicek** memuat daftar alat dari peringkat konsumsi tertinggi dengan indikasi yang jelas.
- [ ] Dropdown pemilih bisnis (business switcher) bekerja dengan lancar jika pengguna memiliki lebih dari satu bisnis.
- [ ] Terdapat teks penafian (disclaimer) estimasi resmi di bagian bawah dashboard.

---

## 5. Catat Listrik
- [ ] Menampilkan riwayat pencatatan listrik bulanan secara kronologis.
- [ ] Tombol **Tambah Entri Baru** membuka dialog/form pencatatan dengan benar.
- [ ] Form melakukan validasi jika ada input bernilai negatif atau format tidak sesuai.
- [ ] Pengisian entri baru dengan bulan yang sudah ada menampilkan pesan error duplikat (validasi unik).
- [ ] Pengguna dapat memasukkan stand meter awal dan akhir, di mana pemakaian kWh terhitung otomatis jika didukung.
- [ ] Batasan paket Gratis teruji: jika entri listrik sudah mencapai 3 bulan, form input baru diblokir oleh sistem dengan pesan upgrade yang ramah.
- [ ] Teks disclaimer PLN terlihat jelas di bagian bawah halaman.

---

## 6. Catat Pendapatan
- [ ] Menampilkan riwayat pencatatan pendapatan bulanan secara teratur.
- [ ] Pengisian entri pendapatan bulanan bekerja sukses dan langsung memengaruhi rasio pada dashboard.
- [ ] Batasan paket Gratis teruji: jika entri pendapatan sudah mencapai 3 bulan, form input baru diblokir oleh sistem dengan pesan upgrade yang ramah.
- [ ] Teks disclaimer operasional terlihat jelas di bagian bawah halaman.

---

## 7. Peralatan (Appliances)
- [ ] Daftar peralatan kos terisi dan menampilkan detail watt, jumlah, jam pakai harian, dan estimasi biaya bulanan.
- [ ] Pengguna dapat menambahkan peralatan baru secara manual dengan mengisi nama, watt, kategori, jumlah unit, dan durasi pakai.
- [ ] Pengguna dapat mengedit spesifikasi peralatan (seperti mengubah jam pakai) dan melihat estimasi biaya langsung ter-update.
- [ ] Pengguna dapat menghapus peralatan dari daftar secara aman.
- [ ] Fitur **Terapkan Template** bekerja: template instan berdasarkan segmen bisnis dapat diterapkan dengan sukses (khusus paket Pro/Trial).
- [ ] Batasan paket Gratis teruji: pengguna Gratis dibatasi hanya dapat menambahkan maksimal 10 peralatan. Tombol tambah peralatan dikunci/menampilkan notifikasi upgrade jika batas terlampaui.
- [ ] Disclaimer peralatan ("Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual...") tercetak jelas di halaman ini.

---

## 8. Rekomendasi
- [ ] Skor efisiensi listrik bulanan terhitung dan muncul dengan label status (seperti GOOD, WATCH, atau CHECK).
- [ ] Rekomendasi penghematan energi (rule-based) muncul dengan deskripsi tindakan yang praktis.
- [ ] Batasan paket Gratis teruji: rekomendasi urutan ke-4 dan seterusnya disamarkan (blur) atau terkunci, dan menampilkan ajakan upgrade ke paket Pro secara transparan.
- [ ] Disclaimer wajib tampil lengkap di bagian bawah halaman rekomendasi.

---

## 9. Laporan Bulanan (Reports)
- [ ] Dropdown bulan menampilkan seluruh bulan yang memiliki data historis.
- [ ] Memilih bulan tertentu memuat ringkasan laporan bulanan yang komprehensif.
- [ ] Verifikasi Edge Case: Mengakses URL dengan parameter bulan tidak valid (misalnya `/reports?month=invalid` atau `/reports?month=9999-99`) ditangani secara aman oleh controller/routing, tidak menyebabkan crash/500, dan menampilkan pesan error atau kembali ke halaman default dengan aman.
- [ ] Batasan paket Gratis teruji: Akses ke laporan bulan-bulan sebelumnya (riwayat lama) dikunci dan memicu banner ajakan upgrade ke paket Pro.
- [ ] Keempat disclaimer wajib tercetak dengan lengkap dan jelas di halaman laporan bulanan.

---

## 10. Paket & Uji Coba (Plans & Trial)
- [ ] Halaman Paket menampilkan tabel perbandingan fitur Gratis dan Pro secara informatif.
- [ ] Teks *"semua harga dan paket saat ini dalam tahap pilot dan validasi pasar"* tercetak jelas.
- [ ] Pengguna Gratis dapat menekan tombol **Mulai Pro Trial 30 Hari** untuk mengaktifkan uji coba gratis.
- [ ] Aktivasi Pro Trial memicu perubahan status lisensi menjadi `PRO_TRIAL` secara instan, membuka semua limitasi (template peralatan, riwayat laporan, dan rekomendasi penuh).
- [ ] Verifikasi pembatasan aktivasi ganda: pengguna yang sedang atau sudah pernah mencoba Pro Trial tidak dapat menekan tombol aktivasi trial lagi.
- [ ] Fallback trial kedaluwarsa berfungsi secara aman di level database (status lisensi kembali ke Gratis secara otomatis).

---

## 11. Pengaturan (Settings)
- [ ] Pengguna dapat melihat detail informasi profil (nama dan email) dengan benar.
- [ ] Form update profil berfungsi sukses mengubah nama pengguna.
- [ ] Menu keamanan (security) memproses ganti password dengan verifikasi password lama secara aman.
- [ ] Fitur two-factor authentication (2FA) dapat diaktifkan/dinonaktifkan secara opsional bagi yang membutuhkan.

---

## 12. Audit Safe Wording & Disclaimer
- [ ] Verifikasi ketiadaan istilah terlarang: lakukan pencarian teks di browser / kode untuk memastikan tidak ada kata-kata berikut di luar disclaimer yang sah:
  * `penyebab pasti`
  * `alat rusak`
  * `sensor membaca`
  * `terdeteksi real-time`
  * `AI memastikan`
- [ ] Verifikasi frasa *konsumsi aktual*: pastikan kata ini hanya muncul di dalam kalimat penafian resmi peralatan (disclaimer 3).
- [ ] Verifikasi keterlihatan disclaimers:
  * **Disclaimer 1 (PLN & Perkiraan)**: Terlihat di Dashboard, Laporan, Listrik, dan Rekomendasi.
  * **Disclaimer 2 (Aplikasi Non-Resmi)**: Terlihat di Dashboard, Listrik, Rekomendasi, dan Laporan.
  * **Disclaimer 3 (Alat & Sensor)**: Terlihat di Peralatan, Rekomendasi, dan Laporan.
  * **Disclaimer 4 (Operasional Usaha)**: Terlihat di Pendapatan, Dashboard, Rekomendasi, dan Laporan.

---

## 13. Proteksi Fitur yang Belum Selesai (Feature Isolation)
- [ ] Pastikan tidak ada tombol aktif atau form pembayaran riil (Stripe, Midtrans, dll) yang tidak sengaja terekspos.
- [ ] Pastikan tidak ada tombol ekspor PDF aktif (tombol download PDF harus disembunyikan atau dikunci dengan label *"Segera Hadir di Paket Pro"* tanpa eksekusi fungsi).
- [ ] Pastikan tidak ada widget integrasi WhatsApp, OCR struk listrik, hardware IoT, peramalan LSTM, live scraping PLN Mobile, iklan (ads), atau pemanggilan API AI eksternal yang aktif di antarmuka.

---

## 14. Lembar Persetujuan Rilis (Final Sign-off)

* **Tanggal Pengujian**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Pemeriksa (QA Lead)**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Status Kelayakan**: [ ] SIAP DEMO  /  [ ] PERLU PERBAIKAN
* **Catatan Tambahan**:
