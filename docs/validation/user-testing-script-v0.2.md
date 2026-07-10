# WattWise AI — User Testing Script (v0.2)

Panduan wawancara dan pengujian pengguna (user testing) untuk mengevaluasi kegunaan (usability) dan nilai produk (perceived value) WattWise AI versi v0.2.

---

## 1. Profil Sesi & Target Partisipan

*   **Durasi Sesi:** 20–30 Menit.
*   **Format:** Tatap muka langsung (in-person) atau online share-screen (Google Meet / Zoom).
*   **Target Partisipan:**
    *   **3–5 Pemilik Properti/Kos/Kontrakan:** Mengelola 10–30 unit sewa dengan beban listrik pascabayar/prabayar.
    *   **2–3 Pelaku Usaha Kecil/UMKM:** Bisnis padat energi (laundry, kafe/warung, percetakan, atau bengkel kecil dengan peralatan berdaya tinggi).

---

## 2. Aturan Emas Fasilitator (Testing Rules)

1.  **Jangan Menjelaskan Terlalu Cepat:** Biarkan partisipan menjelajahi antarmuka secara mandiri. Jangan tunjukkan ke mana harus mengeklik.
2.  **Amati Hambatan (Friction Points):** Catat setiap kali partisipan ragu-ragu (hesitation), salah mengeklik (error), atau mengajukan pertanyaan bingung.
3.  **Gunakan Metode "Think Aloud":** Dorong partisipan untuk menceritakan apa yang mereka pikirkan saat melihat antarmuka (misalnya: *"Saya mengklik ini karena saya pikir..."*).
4.  **Bantuan Minimal:** Hanya bantu jika partisipan benar-benar buntu (blocked) dan tidak bisa melanjutkan skenario tugas selama lebih dari 1 menit.

---

## 3. Skenario & Daftar Tugas Partisipan (User Tasks)

Mintalah partisipan untuk melakukan 13 tugas berikut secara berurutan:

| No | Tugas Partisipan | Apa yang Harus Diamati / Catatan Fasilitator |
| :--- | :--- | :--- |
| **1** | Buka halaman awal (landing page) WattWise AI. | Apakah landing page termuat cepat? Perhatikan kesan visual awal. |
| **2** | Jelaskan dengan bahasa sendiri apa fungsi aplikasi ini berdasarkan info di landing page. | Apakah mereka paham nilai produk dalam < 10 detik? |
| **3** | Masuk ke aplikasi menggunakan akun demo yang disediakan. | Penggunaan email `demo@wattwise.local` dan password `password`. |
| **4** | Pilih atau periksa profil usaha demo yang aktif di dashboard. | Verifikasi penemuan nama usaha "Kos Melati Purwokerto" dan tipenya. |
| **5** | Periksa informasi pencatatan listrik bulanan (pada menu/halaman Catat Listrik). | Apakah grafik tren dan tabel riwayat dipahami dengan mudah? |
| **6** | Periksa informasi pencatatan pendapatan bulanan (pada menu/halaman Catat Pendapatan). | Apakah mereka menyadari hubungan pendapatan dengan beban listrik? |
| **7** | Tambahkan atau periksa satu peralatan listrik baru (pada menu Peralatan). | Apakah input manual durasi (jam/hari) dan watt dirasa membingungkan? |
| **8** | Temukan dan jelaskan arti bagian *"Kandidat alat yang perlu dicek"* pada dashboard/peralatan. | Apakah mereka paham bahwa ini estimasi simulasi, bukan sensor aktual? |
| **9** | Buka menu/halaman Rekomendasi Hemat. | Apakah mereka membaca prioritas saran hemat (Tinggi/Sedang/Rendah)? |
| **10** | Buka menu/halaman Laporan Bulanan (Reports). | Apakah mereka mencoba mengubah filter bulan untuk melihat laporan? |
| **11** | Jelaskan apa yang dimaksud dengan *"Sisa pendapatan setelah listrik"* pada widget laporan/dashboard. | Apakah konsep sisa uang sebelum operasional lain dipahami dengan benar? |
| **12** | Cari halaman info Paket & Langganan (Plans/Trial). | Apakah mereka menemukan tombol simulasi "Mulai Pro Trial"? |
| **13** | Keluar (Logout) dari aplikasi untuk mengakhiri sesi. | Apakah tombol logout di sidebar/header mudah ditemukan? |

---

## 4. Wawancara Evaluasi & Debriefing

Setelah semua tugas selesai, ajukan pertanyaan terbuka berikut:

1.  **Pemahaman Produk:** *"Menurut Anda, apa kegunaan utama WattWise AI bagi bisnis Anda?"*
2.  **Manfaat Terbesar:** *"Informasi atau halaman mana yang menurut Anda paling berguna untuk memotong biaya?"*
3.  **Kebingungan Istilah:** *"Adakah kata-kata, kalimat, atau angka di aplikasi yang membingungkan atau sulit dimengerti?"*
4.  **Kepercayaan Estimasi:** *"Apakah Anda cukup mempercayai hasil estimasi/prediksi tagihan di dashboard untuk dijadikan panduan menghemat daya?"*
5.  **Verifikasi Manual:** *"Dari semua peralatan listrik yang terdaftar, alat mana yang akan Anda periksa secara nyata setelah melihat dashboard ini?"*
6.  **Kegunaan Manajerial:** *"Apakah aplikasi seperti ini benar-benar membantu mengelola keuangan kos atau usaha Anda?"*
7.  **Frekuensi Penggunaan:** *"Seberapa sering Anda akan membuka aplikasi ini? (Setiap hari, seminggu sekali, atau sebulan sekali saat tagihan keluar?)"*
8.  **Sensitivitas Harga:** *"Jika aplikasi ini berbayar seharga Rp49.000 per bulan untuk membuka seluruh laporan historis dan template alat instan, apakah Anda berselle untuk membayar?"*
9.  **Penghambat (Friction):** *"Apa hal utama yang membuat Anda ragu-ragu atau enggan menggunakan aplikasi ini secara rutin?"*

---

> [!WARNING]
> **Pemberitahuan Kepatuhan:**
> Jangan pernah menjanjikan fitur di luar ruang lingkup MVP saat ini (seperti auto-payment ke PLN, sensor otomatis IoT, pembacaan OCR struk secara otomatis, atau ekspor laporan PDF). WattWise AI dirancang sebagai alat bantu kalkulasi simulatif berbasis data input manual pengguna.
