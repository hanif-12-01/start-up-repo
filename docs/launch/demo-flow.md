# Panduan Alur Demo WattWise AI

Dokumen ini berisi skrip panduan presentasi dan alur demonstrasi WattWise AI (Laravel Rewrite Version) untuk para pemangku kepentingan.

---

## 1. Tujuan Demo

Menunjukkan kapabilitas **WattWise AI** sebagai solusi **SaaS electricity cost intelligence** yang membantu pemilik properti sewa dan UMKM padat energi mengoptimalkan biaya listrik mereka secara aman, transparan, dan realistis tanpa ketergantungan pada perangkat keras (sensor fisik).

---

## 2. Informasi Akun Demo & Akses Aplikasi

* **Lokasi Aplikasi Laravel**: Folder `wattwise-laravel/`.
* **Akses Aplikasi Lokal**: Buka `http://localhost:8000` di browser (dijalankan via `php artisan serve`).
* **Peringatan Port Server**: Jangan gunakan port server pengembangan Vite (biasanya `5173`) untuk mengakses aplikasi. Port tersebut hanya untuk aset HMR. Akses utama selalu melalui port web server utama `8000`.
* **Kredensial Akun Demo**:
  - **Email**: `demo@wattwise.local`
  - **Password**: `password`
* **Perintah Diagnostik & Perbaikan Demo**:
  Jika Anda mengalami masalah login dengan akun demo lokal, jalankan perintah ini di folder `wattwise-laravel/`:
  ```bash
  php artisan wattwise:diagnose-demo-login --fix
  ```
  Perintah ini aman dijalankan secara lokal karena tidak mencetak rahasia atau memodifikasi akun produksi.
* **Status QA Otomatis**: Seluruh **213 pengujian otomatis** lulus dengan sukses sebelum rilis ini.
* **Aplikasi Next.js Lama**: Aplikasi Next.js di folder `src/` / `app/` bersifat **legacy/reference only** dan tidak digunakan dalam demo.

> [!CAUTION]
> Akun ini khusus disediakan untuk kepentingan demo di lingkungan lokal (development) dan staging saja. **Bukan merupakan kredensial produksi**. Jangan pernah mengunggah kredensial atau kunci rahasia asli ke repositori publik.

---

## 3. Latar Belakang & Skenario Demo (Demo Story)

* **Nama Usaha**: Kos Melati Purwokerto
* **Jenis Usaha**: Kos-kosan & Properti Sewa (`KOS_PROPERTY`)
* **Profil**: Kos dengan 20 kamar total, di mana 16 kamar di antaranya sedang terisi aktif. Berlokasi di kota universitas (Purwokerto) dengan daya listrik terpasang sebesar 2.200 VA (Pascabayar, tarif estimasi Rp 1.444,70/kWh).
* **Masalah Pengguna**: Pemilik kos mengalami tekanan biaya operasional akibat tagihan listrik bulanan yang tidak menentu. Pemilik ingin memahami kontribusi biaya listrik terhadap margin pendapatan dan mencari cara efisiensi yang praktis.
* **Posisi Produk**: **SaaS electricity cost intelligence** yang memadukan input data manual dengan **Hybrid AI Decision Support** (sistem aturan cerdas) guna memetakan biaya listrik dan merekomendasikan opsi hemat energi.

---

## 4. Alur Langkah Demi Langkah (Step-by-Step Flow)

### Langkah 1: Login ke Aplikasi
* **Tindakan**: Buka halaman login di browser, isi email `demo@wattwise.local`, password `password`, lalu klik **Login**.
* **Catatan Pembicara**: *"Selamat pagi/siang rekan-rekan. Di sini saya akan mendemonstrasikan WattWise AI, sebuah platform SaaS electricity cost intelligence. Kita masuk menggunakan akun demo lokal kita terlebih dahulu."*

### Langkah 2: Ringkasan Dashboard (Dashboard Overview)
* **Tindakan**: Tunjukkan nama bisnis "Kos Melati Purwokerto" dan metrik utama di dashboard.
* **Catatan Pembicara**: *"Setelah login, kita langsung disambut oleh halaman dashboard utama. Dashboard ini menyajikan profil bisnis aktif kita, 'Kos Melati Purwokerto', yang memiliki 20 kamar dengan 16 kamar terisi. Di sini kita langsung melihat rangkasan biaya energi bulan berjalan secara cepat."*

### Langkah 3: Penjelasan Prediksi Pemakaian & Estimasi Tagihan
* **Tindakan**: Arahkan kursor ke kartu **Prediksi pemakaian listrik** dan **Estimasi tagihan listrik** di dashboard.
* **Catatan Pembicara**: *"Pada dashboard, terdapat metrik penting yaitu Prediksi pemakaian listrik dalam kWh dan Estimasi tagihan listrik dalam Rupiah. Perlu dicatat bahwa nilai ini dihitung secara dinamis dari pola pencatatan kita sebelumnya untuk membantu proyeksi arus kas. Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN."*

### Langkah 4: Halaman Catat Listrik
* **Tindakan**: Klik menu **Catat Listrik** di sidebar. Tunjukkan riwayat data 6 bulan terakhir.
* **Catatan Pembicara**: *"Mari kita buka menu Catat Listrik. Pengguna dapat mencatat stand meter awal, stand meter akhir, tarif per kWh, dan total tagihan listrik bulanan mereka secara mandiri. Di sini kita sudah menginput data historis deterministik selama 6 bulan terakhir untuk melihat fluktuasi pemakaian secara transparan."*

### Langkah 5: Halaman Catat Pendapatan
* **Tindakan**: Klik menu **Catat Pendapatan** di sidebar. Tunjukkan catatan pendapatan bulanan.
* **Catatan Pembicara**: *"Untuk memahami dampak biaya listrik terhadap margin usaha, kita juga mencatat pendapatan kotor bulanan di halaman Catat Pendapatan. Dengan membandingkan pendapatan kotor dan biaya listrik, platform kami dapat mengalkulasi rasio efisiensi cash flow."*

### Langkah 6: Halaman Peralatan (Appliances)
* **Tindakan**: Klik menu **Peralatan** di sidebar. Tunjukkan daftar peralatan kos (10 item).
* **Catatan Pembicara**: *"Selanjutnya, kita masuk ke halaman Peralatan. Di sini terdaftar 10 peralatan utama kos, mulai dari AC kamar, kipas angin, pompa air, hingga dispenser dan kulkas. Kita bisa mengedit watt, jumlah unit, dan estimasi jam pakai harian untuk masing-masing peralatan."*

### Langkah 7: Penjelasan "Kandidat alat yang perlu dicek"
* **Tindakan**: Tunjukkan tabel peringkat alat terboros atau widget **Kandidat alat yang perlu dicek**.
* **Catatan Pembicara**: *"Berdasarkan spesifikasi teknis dan estimasi durasi pemakaian yang dimasukkan, fitur Hybrid AI Decision Support kami secara otomatis menyusun daftar 'Kandidat alat yang perlu dicek'. Fitur ini membantu pemilik memprioritaskan peralatan mana yang kontribusinya paling besar pada tagihan. Ingat, perhitungan peralatan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat secara real-time."*

### Langkah 8: Halaman Rekomendasi
* **Tindakan**: Klik menu **Rekomendasi** di sidebar. Tunjukkan Skor Efisiensi Listrik dan daftar tips hemat.
* **Catatan Pembicara**: *"Di halaman Rekomendasi, platform memberikan Skor Efisiensi Listrik beserta rekomendasi hemat energi berbasis aturan (rule-based). Rekomendasi ini dirancang agar mudah dieksekusi secara manual oleh pemilik bisnis tanpa membutuhkan instalasi sensor fisik yang mahal."*

### Langkah 9: Halaman Laporan (Reports)
* **Tindakan**: Klik menu **Laporan** di sidebar. Pilih bulan berjalan atau bulan sebelumnya dari dropdown.
* **Catatan Pembicara**: *"Laporan bulanan menyajikan analisis mendalam yang menggabungkan seluruh data biaya listrik, pendapatan kotor, sisa pendapatan, peringkat alat, serta skor efisiensi. Pemilik kos dapat melihat tren dari bulan ke bulan untuk memantau apakah program penghematan berjalan efektif."*

### Langkah 10: Halaman Paket (Plans)
* **Tindakan**: Klik menu **Paket** di sidebar. Tunjukkan perbandingan paket Gratis dan Pro.
* **Catatan Pembicara**: *"Di halaman Paket, kita melihat pilihan lisensi. Layanan kami saat ini berada dalam tahap pilot dan validasi pasar. Pengguna dapat melihat batasan kuota untuk paket Gratis (maksimal 3 bulan catatan) dan penawaran paket Pro."*

### Langkah 11: Demo Alur Pro Trial
* **Tindakan**: Klik tombol **Mulai Pro Trial 30 Hari** jika akun demo berada pada status Gratis, tunjukkan pembatalan pembatasan (unlocked state).
* **Catatan Pembicara**: *"Pengguna dapat mengaktifkan Pro Trial 30 Hari secara langsung tanpa kartu kredit. Hal ini membuka fitur template peralatan otomatis dan akses ke seluruh riwayat laporan tanpa batas kuota."*

### Langkah 12: Penutupan dan Penafian (Closing with Disclaimers)
* **Tindakan**: Tunjukkan bagian bawah halaman aplikasi yang memuat disclaimer hukum.
* **Catatan Pembicara**: *"Sebagai penutup, kami menekankan komitmen WattWise AI untuk menyajikan data secara jujur dan transparan melalui disclaimer berikut:*
  1. *Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.*
  2. *WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.*
  3. *Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.*
  4. *Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.*

  *Terima kasih atas perhatian Anda. Silakan jika ada pertanyaan."*

---

## 5. Rencana Cadangan Demo (Demo Fallback)

Jika data demo hilang atau database ter-reset saat presentasi:
1. Buka terminal di folder `wattwise-laravel/`.
2. Jalankan perintah:
   ```bash
   php artisan db:seed --class=WattWiseDemoSeeder
   ```
3. Refresh browser. Data 6 bulan historis, 10 peralatan, profil Kos Melati Purwokerto, dan status Pro Trial akan terisi kembali secara instan dan utuh.

---

## 6. Apa yang TIDAK Boleh Diklaim Selama Demo

Untuk mencegah penyesatan informasi, presenter **dilarang keras** mengklaim hal-hari berikut:
- **Bukan Tagihan Resmi**: Jangan sebut platform ini sebagai penentu tagihan resmi PLN atau pengganti aplikasi PLN Mobile.
- **Bukan Pengukuran Sensor Fisik**: Jangan sebut bahwa aplikasi melakukan pembacaan sensor IoT atau smart plug secara real-time. Perhitungan bersifat estimatif simulatif berdasarkan input durasi pakai.
- **Bukan Deteksi Kerusakan Otomatis**: Jangan sebut AI dapat memprediksi atau memastikan peralatan tertentu rusak atau korsleting secara langsung. AI hanya memberikan indikasi kandidat alat yang perlu diverifikasi fisiknya di lapangan.
- **Bukan Kalkulator Profit Bersih**: Sisa pendapatan setelah listrik hanya memperhitungkan selisih pendapatan dikurangi estimasi tagihan listrik. Ini bukan kalkulasi keuntungan bersih operasional keseluruhan karena belum mencakup biaya lain (seperti sewa, internet, gaji, air, dan bahan baku).
