# Spesifikasi QA Stabilization & Access-Control Hardening Week 7

## 1. Objective
Menyetabilkan aplikasi hasil migrasi Laravel (Laravel rewrite) dengan melakukan review keamanan komprehensif pada autentikasi (authentication), otorisasi (authorization), isolasi data pengguna (data isolation), pembatasan paket (plan gating), kegagalan penanganan status kosong (empty states), penyeragaman pesan/istilah aman (safe wording), dan perluasan cakupan tes regresi (regression test coverage) sebelum penambahan fitur baru berskala besar dilakukan.

---

## 2. Scope
Fokus kegiatan penjaminan mutu dan pengerasan keamanan di Week 7 mencakup:
1. **Audit Proteksi Rute (Route Protection Audit)**: Memastikan seluruh rute internal terproteksi oleh middleware `auth` dan `verified` (jika diperlukan) secara konsisten.
2. **Audit Isolasi Data Pengguna Terautentikasi (Authenticated User Data Isolation Audit)**: Memverifikasi bahwa setiap pengguna hanya dapat melihat, menambah, mengubah, atau menghapus data milik profil bisnis aktif mereka sendiri.
3. **Audit Perilaku Pembatasan Paket (Plan Gating Behavior Audit)**: Memastikan batasan kuota untuk paket `FREE` bekerja dengan benar di tingkat controller/request validation dan di-render dengan tepat di frontend.
4. **Audit Perilaku Uji Coba (Trial Behavior Audit)**: Memvalidasi alur aktivasi trial, masa berlaku uji coba gratis 30 hari (`PRO_TRIAL`), penanganan kedaluwarsa, dan pencegahan duplikasi aktivasi trial.
5. **Review Konsistensi Tampilan Kosong & CTA (Empty State and CTA Consistency Review)**: Memastikan tersedianya penanganan yang ramah dan instruktif ketika data masih kosong di seluruh halaman utama.
6. **Pemindaian Istilah Aman (Safe Word Scan)**: Memastikan istilah-istilah di UI bersifat estimatif/simulatif dan tidak melanggar batasan hukum atau menjanjikan akurasi absolut (mematuhi PLN rule).
7. **Review Konsistensi Navigasi & Sidebar**: Memverifikasi navigasi antar menu utama berjalan mulus dengan indikator status paket aktif yang konsisten.
8. **Pengembangan Tes Regresi Alur Berisiko Tinggi (Regression Tests for High-Risk Flows)**: Menambahkan skenario uji coba otomatis (automated tests) untuk meminimalkan potensi regresi pada alur autentikasi dan isolasi data.
9. **Perbaikan Bug Kecil (Small Bug Fixes Only)**: Memperbaiki celah keamanan mikro, validasi data yang bolong, atau error handling minor tanpa menambah fitur baru.

---

## 3. Non-Goals
Kegiatan Week 7 berfokus penuh pada stabilisasi sistem yang ada. Fitur-fitur berikut **tidak akan diimplementasikan**:
- Integrasi gerbang pembayaran (payment gateway) aktif seperti Midtrans, Xendit, Stripe, dll.
- Alur checkout riil, invoicing, kwitansi, atau webhook dari pihak ketiga.
- Pemasangan sistem iklan (ads) dalam aplikasi.
- Fitur ekspor laporan ke format PDF/download aktif.
- Integrasi komunikasi luar seperti WhatsApp API, email pengingat bulanan, dll.
- Fitur pemindaian tagihan fisik (OCR).
- Integrasi hardware IoT atau pembacaan sensor listrik real-time.
- Integrasi model machine learning LSTM lokal untuk peramalan jangka panjang.
- Pemanggilan API kecerdasan buatan (external AI API) seperti OpenAI, Gemini, dll.
- Live scraping data dari portal PLN Mobile.
- Redesain antarmuka (major UI redesign) berskala besar.
- Sistem billing atau langganan baru.

---

## 4. Critical Routes to Audit
Berikut adalah rute-rute penting yang harus diperiksa keamanannya terhadap akses tanpa login (Guest Bypass) dan kebocoran data antar-pengguna (Data Leakage):

| Route Path | HTTP Method | Controller Action | Target Middleware | Status/Check |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | `GET` | `DashboardController@index` | `auth`, `verified` | Harus terisolasi per profil bisnis user |
| `/onboarding` | `GET` & `POST` | `OnboardingController@index`/`store` | `auth`, `verified` | Terbatas untuk user tanpa bisnis aktif |
| `/electricity` | `GET` & `POST` | `ElectricityEntryController@index`/`store` | `auth`, `verified` | Isolasi input & read per bisnis aktif |
| `/revenue` | `GET` & `POST` | `RevenueEntryController@index`/`store` | `auth`, `verified` | Isolasi input & read per bisnis aktif |
| `/appliances` | `GET` & `POST` | `ApplianceController@index`/`store` | `auth`, `verified` | Enforce limits dan isolasi per bisnis |
| `/appliances/apply-template` | `POST` | `ApplianceController@applyTemplate` | `auth`, `verified` | Verifikasi kepemilikan bisnis & plan gating |
| `/recommendations` | `GET` | `RecommendationController@index` | `auth`, `verified` | Isolasi data & plan gating (Top 3 blur) |
| `/reports` | `GET` | `ReportController@index` | `auth`, `verified` | Isolasi data & plan gating (Bulan terkini) |
| `/plans` | `GET` | `PlanController@index` | `auth`, `verified` | Render informasi plan & penawaran trial |
| `/plans/trial` | `POST` | `PlanController@startTrial` | `auth`, `verified` | Proteksi agar user hanya bisa coba 1x |
| `/settings/profile` | `GET` & `PATCH` | `ProfileController@edit`/`update` | `auth` | Isolasi update profil user terautentikasi |
| `/settings/security` | `GET` & `PUT` | `SecurityController@edit`/`update` | `auth`, `verified`, `password.confirm` | Proteksi dengan password verifikasi |

---

## 5. Data Isolation Requirements
Setiap fitur harus mematuhi aturan isolasi data multi-tenant (per user-business) yang ketat:
- **Kepemilikan Bisnis**: User hanya boleh melihat dan mengelola profil bisnis di mana `user_id` cocok dengan ID user terautentikasi.
- **Entri Listrik**: Seluruh data entri listrik bulanan harus disaring berdasarkan `business_id` milik user aktif. Percobaan input dengan `business_id` milik orang lain harus ditolak oleh request validator.
- **Entri Pendapatan**: Seluruh data entri pendapatan bulanan harus disaring berdasarkan `business_id` milik user aktif. Input ilegal ditolak.
- **Peralatan Listrik (Appliances)**: Peralatan listrik hanya dapat diakses, diubah, atau dihapus jika terhubung dengan bisnis milik user aktif.
- **Rekomendasi Hemat**: Rekomendasi energi harus digenerasikan secara dinamis hanya dari data peralatan dan data listrik bisnis milik user aktif sendiri.
- **Laporan Bulanan**: Laporan bulanan (Monthly Report) harus dihitung berdasarkan kalkulasi riil dari entri listrik dan pendapatan bisnis milik user aktif.
- **Resolusi Status Berlangganan (Plan & Trial State)**: Hak akses fitur, kuota limit, dan status trial harus diselesaikan langsung dari relasi `subscription` milik user terautentikasi (`$request->user()->subscription`), bukan dari parameter request atau input client.

---

## 6. Plan Gating Requirements
Sistem pembatasan hak akses berbasis paket (Feature & Limit Gating) harus diverifikasi berjalan sesuai aturan berikut:
1. **Default Plan (FREE)**: Pengguna baru tanpa subscription aktif secara otomatis mendapatkan paket `FREE`.
2. **Uji Coba Aktif (PRO_TRIAL)**: Pengguna dengan status `PRO_TRIAL` yang belum kedaluwarsa (`trial_ends_at` di masa depan) mendapat hak akses setingkat paket `PRO`.
3. **Uji Coba Kedaluwarsa (Expired Trial)**: Jika `trial_ends_at` telah berlalu, status efektif harus otomatis diturunkan kembali ke paket `FREE`.
4. **Paket PRO**: Pengguna dengan paket `PRO` aktif dibebaskan dari batas kuota peralatan, entri listrik, dan pendapatan, serta mendapatkan akses rekomendasi penuh dan laporan historis lengkap.
5. **Batas Entri Listrik FREE**: Pengguna paket `FREE` hanya boleh memiliki maksimal **3 entri data listrik** per bisnis. Input ke-4 harus diblokir dengan pesan upgrade.
6. **Batas Entri Pendapatan FREE**: Pengguna paket `FREE` hanya boleh memiliki maksimal **3 entri data pendapatan** per bisnis. Input ke-4 harus diblokir dengan pesan upgrade.
7. **Batas Peralatan FREE**: Pengguna paket `FREE` hanya boleh mendaftarkan maksimal **10 unit peralatan listrik** per bisnis. Upaya mendaftarkan alat ke-11 ditolak.
8. **Batas Rekomendasi FREE**: Halaman rekomendasi untuk pengguna `FREE` hanya menampilkan **top 3** rekomendasi terbaik. Rekomendasi sisanya harus disembunyikan/diblur dengan tawaran upgrade.
9. **Batas Laporan Bulanan FREE**: Pengguna `FREE` hanya dapat membuka laporan untuk **bulan berjalan / bulan terbaru** yang memiliki data. Laporan bulan-bulan sebelumnya (historis) digembok dengan CTA Upgrade.
10. **Kelayakan MVP (Basic Flow)**: Alur pencatatan dasar, grafik perbandingan pengeluaran listrik vs pendapatan, dan simulasi biaya harus tetap dapat digunakan secara optimal oleh pengguna `FREE` tanpa hambatan total.

---

## 7. Trial Requirements
Pengujian alur uji coba gratis (`PRO_TRIAL`) harus memenuhi spesifikasi berikut:
- **Aktivasi Aman**: Hanya pengguna terautentikasi yang dapat mengaktifkan trial (`/plans/trial` via POST).
- **Tanpa Kartu Kredit**: Tombol "Mulai Trial 30 Hari" di halaman `/plans` harus mengaktifkan trial secara instan tanpa meminta nomor kartu kredit atau metode pembayaran lainnya.
- **Penyimpanan Tanggal Uji Coba**:
  - Kolom `trial_ends_at` harus diisi persis 30 hari ke depan (`now()->addDays(30)`).
  - Mengisi `trial_starts_at` dengan waktu saat ini (`now()`) untuk audit pelacakan.
- **Pencegahan Ulang Trial**: Pengguna yang pernah mengaktifkan trial (`subscription` pernah/sedang memiliki plan `PRO_TRIAL`) dilarang keras mengaktifkan kembali uji coba gratis. Upaya POST ulang harus menghasilkan pesan error ("Anda sudah pernah menggunakan masa uji coba gratis").
- **Pemberhentian Hak Akses**: Saat uji coba kedaluwarsa, seluruh limitasi paket `FREE` langsung diterapkan secara real-time tanpa penundaan.

---

## 8. Empty State Requirements
Ketika pengguna pertama kali masuk atau ketika data kosong, halaman-halaman berikut harus menampilkan visualisasi status kosong (Empty State) yang informatif dan seragam:

### A. Dashboard
- **Kondisi**: Belum ada profil bisnis terdaftar atau belum ada entri data bulan berjalan.
- **Komponen**: Ilustrasi grafis minimalis, pesan ramah ("Mulai langkah awal hemat energi dengan mendaftarkan usaha Anda"), dan tombol utama untuk mengarahkan pengguna ke halaman onboarding usaha.

### B. Electricity (Data Listrik)
- **Kondisi**: Belum ada entri data listrik bulanan.
- **Komponen**: Pesan penjelasan ("Belum ada data pemakaian listrik yang dicatat"), petunjuk langkah ("Catat tagihan listrik atau angka meteran bulan ini"), dan tombol "Tambah Pemakaian Listrik" yang membuka form input.

### C. Revenue (Data Pendapatan)
- **Kondisi**: Belum ada entri data pendapatan bulanan.
- **Komponen**: Pesan penjelasan ("Belum ada data pendapatan bulanan"), pentingnya data ("Data ini diperlukan untuk mengukur rasio pengeluaran listrik terhadap pendapatan usaha Anda"), dan tombol "Tambah Pendapatan".

### D. Appliances (Daftar Peralatan)
- **Kondisi**: Belum ada peralatan listrik yang didaftarkan secara manual atau via template.
- **Komponen**: Pesan ("Daftar peralatan listrik usaha Anda masih kosong"), solusi instan ("Gunakan template siap pakai berdasarkan jenis usaha Anda atau tambahkan satu per satu"), serta tombol "Terapkan Template Jenis Usaha" dan tombol "Tambah Alat Manual".

### E. Recommendations (Rekomendasi Hemat)
- **Kondisi**: Peralatan belum diinput, atau data listrik belum mencukupi.
- **Komponen**: Pesan ("Rekomendasi belum tersedia"), syarat aktivasi ("Daftarkan minimal 3 peralatan listrik utama dan catat pemakaian listrik bulan ini agar algoritma kami dapat memberikan rekomendasi yang akurat"), serta tautan cepat ke halaman Peralatan.

### F. Reports (Laporan Bulanan)
- **Kondisi**: Pemakaian listrik atau pendapatan bulan berjalan belum diinput.
- **Komponen**: Pesan ("Laporan bulanan belum siap"), kebutuhan data ("Laporan membutuhkan setidaknya satu entri pemakaian listrik dan pendapatan untuk bulan yang dipilih"), dan petunjuk bulan yang dapat dipilih di dropdown.

### G. Plans (Halaman Paket)
- **Kondisi**: Menampilkan paket aktif saat ini.
- **Komponen**: Penegasan status paket pengguna ("Anda saat ini menggunakan Paket Gratis"), benefit yang didapatkan, sisa hari trial (jika dalam masa trial), dan tombol CTA peningkatan akun ("Hubungi Tim Kami untuk Upgrade Pro" atau "Mulai Pro Trial 30 Hari").

**Panduan Copywriting Empty State**:
1. Menjelaskan secara transparan apa yang belum ada / mengapa data kosong.
2. Memberikan satu aksi konkret berikutnya yang jelas (single primary call-to-action).
3. Menggunakan bahasa yang menyemangati, tidak menyalahkan pengguna (user-friendly).
4. Menghindari istilah teknis backend (misal: "Database empty response code 204").

---

## 9. Safe Wording Requirements
Untuk menghindari risiko tuntutan hukum dan memastikan ekspektasi pengguna tetap realistis, semua konten tekstual, kartu wawasan (insights), rekomendasi, dan kalkulator estimasi wajib mengikuti aturan penulisan berikut:

### Kata-kata yang Diizinkan (Allowed Wording):
- `estimasi` (pengganti kata tagihan riil)
- `indikasi` (untuk menunjukkan tren penghematan)
- `berdasarkan data input` (menjelaskan bahwa akurasi bergantung pada kejujuran input pengguna)
- `kemungkinan` (menyatakan potensi)
- `perlu dicek manual` (mendorong verifikasi mandiri)
- `Estimasi Simulatif` (label resmi pada grafik estimasi biaya peralatan)
- `Perlu Verifikasi Manual` (label rekomendasi tindakan perbaikan)
- `Kandidat alat yang perlu dicek` (istilah klasifikasi peralatan boros)

### Kata-kata yang Dilarang (Forbidden Wording):
- `penyebab pasti` (dilarang karena WattWise hanya memberikan prediksi dari data sekunder)
- `alat rusak` (aplikasi tidak mendeteksi kesehatan fisik alat secara langsung)
- `konsumsi aktual` (semua perhitungan peralatan bersifat estimasi kalkulatif, bukan sensor listrik)
- `sensor membaca` (tidak ada sensor IoT yang dipasang pada instalasi listrik pengguna)
- `terdeteksi real-time` (aplikasi beroperasi pada basis bulanan manual)
- `AI memastikan` (AI hanya memberikan rekomendasi statistik simulatif)

### Aturan Khusus PLN:
Frasa **"tagihan resmi PLN"** hanya boleh ditulis jika didahului oleh kata negasi di dalam disclamer tertulis, contoh:
> `“...bukan merupakan tagihan resmi PLN.”`

---

## 10. Required Disclaimers to Verify
Halaman-halaman strategis di bawah ini wajib memuat catatan kaki (disclaimer) yang jelas dan mudah dibaca:

1. **Dashboard Summary & Charts**:
   > `“Estimasi biaya dihitung secara simulatif berdasarkan input pemakaian kWh dan tarif listrik Anda. Hasil bukan merupakan tagihan resmi PLN.”`
2. **Daftar Peralatan (Appliances)**:
   > `“Konsumsi kWh dan biaya bulanan per alat merupakan estimasi matematis berdasarkan watt, jumlah unit, dan estimasi jam pakai harian. Hasil tidak mewakili pengukuran sensor listrik real-time.”`
3. **Rekomendasi Hemat Energi (Recommendations)**:
   > `“WattWise AI memberikan rekomendasi berdasarkan pola pemakaian yang Anda masukkan. Harap lakukan verifikasi manual dengan teknisi listrik sebelum melakukan penggantian instalasi atau peralatan utama.”`
4. **Laporan Bulanan (Reports)**:
   > `“Sisa pendapatan setelah biaya listrik dihitung dengan mengurangi pendapatan kotor dengan estimasi biaya listrik saja. Perhitungan ini belum mencakup biaya operasional lainnya (seperti sewa tempat, gaji karyawan, air, dan penyusutan alat).”`

---

## 11. Regression Test Plan
Meningkatkan pertahanan kode dengan menambahkan skenario pengujian otomatis di `tests/Feature` jika belum tercakup, khususnya pada area data isolation dan plan gating.

### Skenario Tes yang Diperlukan:
1. **Guest Access Protection**:
   - Memastikan pengguna tanpa login diarahkan ke `/login` saat mengakses `/dashboard`, `/appliances`, `/recommendations`, `/reports`, `/plans`.
2. **Multi-Tenant / Data Isolation**:
   - `test_user_cannot_view_another_users_business`: Memastikan user A tidak dapat melihat dashboard bisnis milik user B melalui manipulasi parameter query `business_id`.
   - `test_user_cannot_update_or_delete_another_users_appliance`: Memastikan pengubahan/penghapusan alat milik user B oleh user A via PUT/DELETE `/appliances/{appliance}` menghasilkan respon `403 Forbidden` atau `404 Not Found`.
   - `test_user_cannot_insert_entries_for_another_users_business`: Memastikan POST `/electricity` dan POST `/revenue` memvalidasi kepemilikan `business_id` dan menolak input ilegal dengan status error validasi.
3. **Plan Gating Enforcement**:
   - Memastikan pengguna dengan paket `FREE` ditolak ketika menginput entri listrik ke-4, entri pendapatan ke-4, atau peralatan ke-11.
   - Memastikan pengguna paket `FREE` hanya menerima top 3 rekomendasi di response payload, sedangkan sisanya bernilai kosong/tersembunyi.
   - Memastikan pengguna paket `FREE` menerima response error atau pembatasan saat mencoba mengambil laporan bulanan historis (selain bulan terkini).
4. **Trial Lifecycles**:
   - `test_user_can_activate_pro_trial_once`: Memastikan aktivasi trial berhasil menyimpan status `PRO_TRIAL` dan tanggal berakhir `trial_ends_at` (+30 hari) secara aman, serta memblokir aktivasi kedua dengan respon error.
   - `test_expired_trial_applies_free_limits`: Memastikan ketika `trial_ends_at` dimanipulasi ke masa lalu, status hak akses user segera kembali ter-gate layaknya pengguna `FREE`.
5. **Robustness & Edge Cases**:
   - `test_invalid_report_month_parameter`: Memastikan input query `month=invalid-format` pada `/reports` tidak memicu crash (Server Error 500), melainkan fallback ke bulan berjalan saat ini secara aman.
   - `test_no_business_state_handled_safely`: Memastikan pengguna yang baru mendaftar dan belum menyelesaikan onboarding usaha dapat membuka dashboard dan halaman laporan dengan status visual "No Business" tanpa error SQL.

---

## 12. Manual QA Checklist
Panduan verifikasi visual dan fungsional di lingkungan lokal sebelum deployment:

- [ ] **Registrasi Pengguna Baru**:
  - Lakukan pendaftaran akun baru di `/register`. Pastikan diarahkan ke dashboard shell dalam kondisi kosong.
- [ ] **Onboarding Profil Usaha**:
  - Isi form onboarding pertama. Pastikan nama usaha dan jenis usaha tersimpan dengan benar di database.
- [ ] **Pencatatan Entri Listrik**:
  - Masukkan data pemakaian listrik bulan ini. Gunakan kalkulator meteran awal-akhir dan tarif listrik per kWh. Pastikan kalkulasi biaya otomatis terisi.
- [ ] **Pencatatan Entri Pendapatan**:
  - Input jumlah pendapatan bulanan usaha. Pastikan nilai tersimpan tanpa bug format angka desimal.
- [ ] **Aktivasi Template Peralatan**:
  - Terapkan template alat sesuai jenis usaha (misal: Laundry). Verifikasi daftar alat langsung terpopulasi otomatis di halaman Peralatan.
- [ ] **Operasi CRUD Peralatan Manual**:
  - Tambah alat baru secara manual, perbarui spesifikasi watt/jam pakai, dan hapus alat. Pastikan modal input tertutup dengan pesan notifikasi sukses (toast) yang tepat.
- [ ] **Halaman Rekomendasi**:
  - Buka halaman rekomendasi. Pastikan grafik prioritas perbaikan dan saran penghematan muncul. Verifikasi teks disclaimer tercetak di bagian bawah halaman.
- [ ] **Halaman Laporan Bulanan**:
  - Ganti bulan laporan menggunakan dropdown filter. Pastikan data ter-update sesuai bulan yang dipilih. Cek keberadaan catatan penjelas sisa pendapatan.
- [ ] **Halaman Paket & Harga**:
  - Buka `/plans`, verifikasi status paket saat ini tertulis "Gratis".
- [ ] **Mulai Trial 30 Hari**:
  - Klik tombol "Mulai Uji Coba Gratis". Pastikan halaman memuat ulang dengan status paket berubah menjadi "Pro Trial 30 Hari" dan tombol trial berubah menjadi tidak aktif/tersembunyi.
- [ ] **Pengujian Batas Paket Gratis (Free Limit Test)**:
  - Coba tambahkan entri listrik ke-4 atau alat ke-11 pada akun berpaket `FREE`. Pastikan toast error muncul ("Batas kuota tercapai. Silakan upgrade ke paket Pro...").
- [ ] **Penanganan Parameter Bulan Laporan Tidak Valid**:
  - Ubah URL laporan secara manual menjadi `/reports?month=2025-99` or `/reports?month=abc`. Pastikan aplikasi menangani parameter dengan aman tanpa menampilkan halaman error bawaan Laravel.
- [ ] **Logout & Login Ulang**:
  - Klik tombol keluar, pastikan sesi terhapus penuh dan pengguna tidak bisa masuk kembali ke `/dashboard` menggunakan tombol back browser.

---

## 13. Acceptance Criteria
Penyelesaian fase stabilisasi Week 7 dinyatakan berhasil apabila memenuhi kriteria berikut:
1. **Dokumen Spesifikasi**: Berkas `docs/rewrite/week-7-qa-stabilization-spec.md` telah dibuat lengkap di repositori lokal.
2. **Rute Berisiko Tinggi**: Seluruh rute sensitif terdaftar dalam spesifikasi audit dengan kontrol middleware yang tepat.
3. **Kepatuhan Isolasi Data**: Memiliki kriteria audit isolasi data untuk mencegah pencurian data antar-penyewa (multi-tenant safety).
4. **Validasi Batas Paket**: Aturan plan gating (Free vs Pro Trial) terpetakan dengan kunci limitasi yang jelas.
5. **Klausa Istilah Aman**: Memiliki checklist khusus safe wording untuk menghindarkan aplikasi dari klaim performa sepihak.
6. **Rencana Tes Regresi**: Memiliki daftar skenario automated test yang akan ditulis/diverifikasi guna memperkuat reliability kode.
7. **Panduan Pengujian Manual**: Memiliki panduan manual QA berurutan (step-by-step checklist) untuk skenario pengguna nyata.
8. **Bebas dari Fitur Baru**: Tidak ada fungsionalitas produk baru berskala besar yang dikodekan (hanya berfokus pada keandalan sistem).
9. **Kesehatan Kode**:
   - Perintah `php artisan test` berjalan sukses dengan status semua tes lulus (PASS).
   - Perintah `npm run build` berhasil menyusun aset frontend tanpa kesalahan (built successfully).
