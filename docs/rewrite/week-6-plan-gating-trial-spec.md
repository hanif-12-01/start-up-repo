# Spesifikasi Implementasi Week 6: SaaS Plan Gating & Trial Foundation

## 1. Objective
Menambahkan fondasi paket berlangganan (SaaS plan foundation), status uji coba (trial state), pembatasan fitur (feature gating), dan petunjuk peningkatan akun (upgrade prompts) pada aplikasi WattWise AI tanpa integrasi gerbang pembayaran (payment gateway) aktif. Tujuannya adalah memvalidasi kesediaan membayar pengguna (willingness to pay) secara aman dan transparan selama masa pilot.

---

## 2. Scope
Fokus pengerjaan Week 6 adalah mengimplementasikan:
1. **Plan Definitions**: Definisi paket SaaS terstandardisasi di backend (ID paket, limit, fitur aktif).
2. **Subscription Model Review & Migration**: Penyesuaian skema tabel `subscriptions` untuk mendukung detail periode trial dan status pembatalan.
3. **FeatureGateService**: Service layer untuk memeriksa hak akses pengguna/bisnis terhadap fitur tertentu, mendeteksi limitasi kuota, dan mengambil pesan upgrade yang relevan.
4. **Halaman Paket & Harga (Pricing Page)**: Halaman UI Inertia + Vue (`resources/js/pages/Plans/Index.vue`) yang menampilkan matriks paket, detail paket aktif, tombol untuk mengaktifkan uji coba gratis (tanpa kartu kredit), dan info pilot program.
5. **Komponen Upgrade CTA**: Komponen UI yang dapat digunakan kembali untuk mengarahkan pengguna non-premium melakukan upgrade atau mengaktifkan trial.
6. **Penerapan Pembatasan (Feature Gating Target)**:
   - Pembatasan entri historis listrik dan pendapatan (maksimal 3 entri untuk paket Gratis).
   - Pembatasan jumlah peralatan listrik terdaftar (maksimal 10 unit untuk paket Gratis).
   - Pembatasan rekomendasi hemat energi (hanya menampilkan top 3 untuk paket Gratis, sisanya diblur/di-gate).
   - Pembatasan laporan bulanan (hanya bisa melihat bulan terbaru/berjalan untuk paket Gratis, bulan historis sebelumnya di-gate).
   - Penonaktifan fitur pembuatan banyak bisnis/properti (maksimal 1 bisnis untuk paket Gratis).
   - Tampilan statis "Segera Hadir" pada fitur ekspor PDF.
7. **Sidebar Menu**: Penambahan menu "Paket" di `AppSidebar.vue`.
8. **Testing**: Automated tests untuk memvalidasi logika penentuan paket efektif, enforcement limitasi, fallback masa uji coba kedaluwarsa, dan rendering halaman plans.

---

## 3. Non-Goals
Untuk menjaga fokus penyelesaian Week 6, fitur-fitur berikut **tidak akan diimplementasikan**:
- Integrasi payment gateway (Midtrans, Xendit, Stripe, dll.).
- Integrasi sistem invoice otomatis atau kwitansi digital.
- Alur checkout dengan pembayaran nyata (paid checkout flow).
- Sinkronisasi webhook subscription pihak ketiga.
- Pemasangan iklan (ads) di dalam aplikasi.
- Pembuatan/ekspor file PDF (PDF generation) aktif.
- Integrasi dengan WhatsApp API untuk notifikasi tagihan/paket.
- Pemindaian tagihan fisik menggunakan OCR.
- Pembacaan sensor listrik real-time atau integrasi hardware IoT.
- Integrasi model machine learning LSTM untuk peramalan jangka panjang.
- Pemanggilan AI API eksternal.
- Live scraping data dari portal PLN Mobile.

---

## 4. User-Facing Plans & Trial
WattWise AI SaaS menawarkan paket-paket berikut untuk memvalidasi segmen pasar:
1. **Gratis (Free)**: Paket dasar untuk pencatatan manual dan pemahaman awal biaya listrik vs pendapatan.
2. **Pro**: Paket direkomendasikan untuk analisis mendalam, pengelolaan peralatan lebih banyak, rekomendasi penuh, dan laporan lengkap.
3. **Business**: Paket untuk pengelolaan multi-properti/bisnis dan laporan tingkat lanjut (direncanakan untuk masa depan).
4. **Enterprise / Custom**: Paket untuk integrasi multi-lokasi dan kebutuhan khusus.

### Trial Khusus:
- **Pro Trial 30 Hari**: Memberikan akses penuh setingkat fitur Pro selama 30 hari untuk pengguna baru agar dapat mencoba nilai tambah WattWise AI secara instan.

---

## 5. Plan Positioning & Feature Matrix

| Fitur / Dimensi | Gratis (FREE) | Pro (PRO) | Business (BUSINESS) | Enterprise (ENTERPRISE) |
| :--- | :--- | :--- | :--- | :--- |
| **Pencatatan Listrik** | Terbatas (3 Bulan Terakhir) | Tanpa Batas | Tanpa Batas | Tanpa Batas |
| **Pencatatan Pendapatan** | Terbatas (3 Bulan Terakhir) | Tanpa Batas | Tanpa Batas | Tanpa Batas |
| **Batas Peralatan Listrik** | Maksimal 10 Unit | Tanpa Batas | Tanpa Batas | Tanpa Batas |
| **Rekomendasi Hemat** | Hanya Top 3 | Akses Penuh (Semua) | Akses Penuh (Semua) | Akses Penuh (Semua) |
| **Akses Laporan Bulanan** | Bulan Terkini / Berjalan saja | Semua Laporan Historis | Semua Laporan Historis | Semua Laporan Historis |
| **Template Peralatan** | Tidak Ada (Manual) | Ada (Satu Klik) | Ada (Satu Klik) | Ada (Satu Klik) |
| **Jumlah Usaha/Properti** | Maksimal 1 Bisnis | Maksimal 1 Bisnis | Multi Bisnis (Nanti) | Multi Bisnis / Lokasi |
| **Kolaborasi Tim** | Tidak Ada | Tidak Ada | Fitur Tim (Nanti) | Kustom |
| **Ekspor PDF** | Tidak Ada | Nanti (Akan Datang) | Nanti (Akan Datang) | Kustom |
| **Iklan Aplikasi** | Ada (Nanti jika rilis) | Bebas Iklan | Bebas Iklan | Bebas Iklan |

---

## 6. Feature & Limit Keys
Aplikasi menggunakan kunci string (keys) berikut untuk memetakan aturan akses di kode program:

### Feature Keys (Boolean Access)
- `dashboard.view`: Mengizinkan akses ke beranda (dashboard).
- `onboarding.use`: Mengizinkan pengisian onboarding profil bisnis.
- `appliances.templates`: Mengizinkan penerapan template peralatan listrik instan.
- `recommendations.view`: Mengizinkan halaman rekomendasi hemat dibuka.
- `reports.view`: Mengizinkan halaman laporan bulanan dibuka.
- `reports.full`: Mengizinkan akses penuh ke isi laporan (non-gate).
- `export.pdf`: Fitur ekspor laporan ke PDF (akan selalu bernilai `false` untuk sementara / dinonaktifkan).
- `ads.hidden`: Mengizinkan aplikasi menyembunyikan iklan (secara logika selalu `true` untuk premium, namun tidak ada iklan diimplementasikan).

### Limit Keys (Numeric Quota)
- `electricity.entries`: Jumlah entri data listrik historis maksimal yang boleh diinput/dilihat.
- `revenue.entries`: Jumlah entri data pendapatan historis maksimal yang boleh diinput/dilihat.
- `appliances.manage`: Jumlah maksimum unit peralatan listrik yang bisa ditambahkan.
- `businesses.multiple`: Jumlah maksimum bisnis/properti aktif yang bisa dikelola.
- `team.members`: Jumlah anggota tim tambahan yang bisa diundang.

---

## 7. Suggested Free Plan Limits
Untuk memastikan paket Gratis tetap berguna bagi validasi MVP namun tetap mendorong konversi ke uji coba Pro, batas berikut diterapkan secara konservatif:
- **`electricity.entries`**: Limit **3**. Pengguna Gratis hanya bisa memasukkan/menyimpan hingga 3 entri data bulanan listrik.
- **`revenue.entries`**: Limit **3**. Pengguna Gratis hanya bisa memasukkan/menyimpan hingga 3 entri data bulanan pendapatan.
- **`appliances.manage`**: Limit **10**. Pengguna Gratis hanya dapat menambahkan maksimal 10 peralatan listrik per bisnis.
- **`recommendations.view`**: Terbuka, namun hanya menampilkan **top 3** rekomendasi terbaik. Rekomendasi selebihnya disembunyikan/diblur dengan CTA Upgrade.
- **`reports.view`**: Terbuka, namun hanya untuk **bulan berjalan / bulan terbaru** dengan entri data lengkap. Laporan bulan-bulan sebelumnya diblokir dengan CTA Upgrade.
- **`businesses.multiple`**: Limit **1**. Pengguna Gratis hanya boleh memiliki 1 profil bisnis terdaftar.

> [!IMPORTANT]
> Jangan pernah memblokir total input pendapatan atau cashflow. Pengguna paket Gratis harus tetap bisa melihat visualisasi grafik dasar perbandingan biaya listrik terhadap pendapatan agar memahami nilai utama WattWise AI.

---

## 8. Trial Behavior
Untuk memfasilitasi masa percobaan gratis paket berbayar, sistem menerapkan aturan trial berikut:
- **Nama Trial**: `"Pro Trial 30 Hari"` (Disimpan secara internal sebagai paket `PRO_TRIAL`).
- **Pemberian Trial**: Pengguna baru atau pengguna Gratis yang belum pernah mencoba trial dapat mengaktifkannya langsung dari halaman Paket & Harga tanpa membutuhkan metode pembayaran (no credit card required).
- **Masa Aktif**: Ditentukan oleh kolom `trial_ends_at`. Saat trial diaktifkan, `trial_ends_at` diisi dengan `now()->addDays(30)`.
- **Status Paket Efektif**:
  - Jika pengguna memiliki status trial yang masih aktif (`trial_ends_at` di masa depan), maka `getEffectivePlan()` mengembalikan paket `PRO_TRIAL` dengan tingkat hak akses setara paket `PRO`.
  - Jika masa trial telah habis (`trial_ends_at` di masa lalu) dan tidak ada paket berbayar aktif yang dibeli, maka status paket otomatis diturunkan (fallback) kembali ke paket `FREE` (Gratis).

---

## 9. Plan IDs & User-Facing Labels
Untuk standardisasi data di database dan komponen Vue, gunakan pemetaan ID dan label berikut secara konsisten:

| Plan ID (Database) | User-Facing Label (UI) |
| :--- | :--- |
| **`FREE`** | Gratis |
| **`PRO`** | Pro |
| **`BUSINESS`** | Business |
| **`ENTERPRISE`** | Enterprise / Custom |
| **`PRO_TRIAL`** | Pro Trial 30 Hari |

---

## 10. Subscription Model Review & Proposed Migration
Setelah meninjau migrasi `2026_07_09_000004_create_subscriptions_table.php` dan model `Subscription.php`, struktur tabel saat ini memiliki kolom:
- `id`
- `user_id` (foreign key)
- `plan` (string, default 'FREE')
- `status` (string, default 'ACTIVE')
- `trial_ends_at` (timestamp, nullable)
- `current_period_ends_at` (timestamp, nullable)

### Rencana Migrasi Tambahan (Week 6)
Untuk mendukung pencatatan status uji coba dan pembatalan langganan secara lengkap, kita akan membuat file migrasi tambahan untuk menambahkan kolom berikut pada tabel `subscriptions`:
- `trial_starts_at` (timestamp, nullable): Menyimpan waktu awal trial dimulai.
- `current_period_starts_at` (timestamp, nullable): Menyimpan waktu awal periode aktif berlangganan saat ini.
- `canceled_at` (timestamp, nullable): Menyimpan waktu ketika pengguna membatalkan perpanjangan otomatis paket.
- `metadata` (json, nullable): Menyimpan informasi konfigurasi tambahan.

*Catatan: Tidak ada pembuatan migrasi baru di langkah awal ini. Langkah ini akan didokumentasikan dan diimplementasikan pada fase pengerjaan kode.*

---

## 11. Feature Gate Service Design
Service layer `FeatureGateService` diimplementasikan di `app/Services/FeatureGateService.php` dengan metode berikut:

```php
namespace App\Services;

use App\Models\User;
use App\Models\Business;

class FeatureGateService
{
    /**
     * Mengambil detail paket yang efektif aktif untuk pengguna saat ini.
     * Evaluasi mencakup status trial (apakah masih aktif atau sudah kedaluwarsa).
     */
    public function getEffectivePlan(User $user, ?Business $business = null): array;

    /**
     * Memeriksa apakah pengguna diizinkan mengakses fitur berbasis boolean.
     */
    public function can(User $user, string $featureKey, ?Business $business = null): bool;

    /**
     * Mengambil batas kuota numerik untuk suatu fitur/limit key.
     * Mengembalikan integer batas, atau null jika tidak ada batasan (unlimited).
     */
    public function limit(User $user, string $limitKey, ?Business $business = null): ?int;

    /**
     * Menghitung pemakaian kuota saat ini oleh pengguna untuk limit key tersebut.
     */
    public function usage(User $user, string $limitKey, ?Business $business = null): int;

    /**
     * Mengambil pesan saran upgrade yang ramah untuk fitur yang terkunci.
     */
    public function getUpgradeMessage(string $featureKey): string;
}
```

---

## 12. Upgrade CTA & Copy Guidelines
Penyajian pesan penawaran upgrade wajib bernada persuasif, edukatif, dan menghindari manipulasi psikologis (no dark patterns). 

### Ketentuan Wording & Copy yang Disetujui:
- **Judul Banner / Modal**: `“Upgrade untuk membuka fitur ini”` atau `“Mulai Pro Trial 30 Hari”`.
- **Informasi Paket Gratis**: `“Paket Gratis tetap bisa dipakai untuk input dasar dan ringkasan utama.”`
- **Disclaimer Status Harga**: `“Paket dan harga masih dalam tahap pilot/validasi.”` (wajib tertera di halaman Plans & Harga).
- **Nada Ajakan**: Edukatif, menjelaskan manfaat premium secara ringkas (misalnya: "Lihat perbandingan lengkap pemakaian alat listrik Anda untuk menekan pemborosan tagihan bulanan").

---

## 13. Route & Page Definitions

Semua rute SaaS di bawah ini dilindungi oleh middleware `auth` dan `verified`:

### Rute Baru:
| Method | URI | Controller Action | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/plans` | `PlanController@index` | Menampilkan halaman manajemen paket, status langganan, dan daftar harga/paket. |
| **POST** | `/plans/trial` | `PlanController@startTrial` | Mengaktifkan paket `"Pro Trial 30 Hari"` secara instan jika pengguna memenuhi syarat. |

### Halaman UI Baru:
- **File Frontend**: `resources/js/pages/Plans/Index.vue`
- **Sidebar Menu**: Ditambahkan ke item menu utama pada `AppSidebar.vue`:
  - **Label**: `"Paket"`
  - **Ikon**: `CreditCard` (dari `@lucide/vue`)
  - **URL**: `/plans`

---

## 14. Gating Targets & Implementation Areas

Penerapan gating pada Week 6 dilakukan secara minimal dan aman di area berikut:

### A. Pembatasan Input Entri Listrik & Pendapatan
- Di `ElectricityEntryController` dan `RevenueEntryController`, sebelum menyimpan entri baru:
  - Cek jumlah entri historis yang ada.
  - Jika paket aktif adalah `FREE` dan jumlah entri sudah mencapai 3, tampilkan respon redirect/peringatan untuk upgrade atau coba trial.
  - Di UI halaman pencatatan, tampilkan banner informatif jika kuota limit bulanan telah tercapai.

### B. Pembatasan Pengelolaan Peralatan (Appliances)
- Di `ApplianceController@store`, lakukan pengecekan jumlah peralatan aktif.
  - Jika paket aktif adalah `FREE` dan jumlah peralatan terdaftar sudah mencapai 10 unit, kembalikan response error/warning redirect.
  - Di UI `Appliances/Index.vue`, tombol "Tambah Peralatan" atau "Terapkan Template" dinonaktifkan atau memunculkan modal dialog upgrade jika limit 10 alat sudah terpenuhi.

### C. Pembatasan Rekomendasi (Recommendations)
- Di `RecommendationController@index`, kirimkan daftar rekomendasi dari service.
  - Jika pengguna adalah paket `FREE`, hanya kirimkan 3 rekomendasi teratas secara lengkap ke frontend. Rekomendasi selebihnya dikirim dengan data disamarkan/diblur atau disertai flag `is_locked => true`.
  - Di UI `Recommendations/Index.vue`, render visualisasi blur dengan overlay card upgrade CTA untuk rekomendasi di bawah peringkat 3.

### D. Pembatasan Detail Laporan Bulanan (Reports)
- Di `ReportController@index`, lakukan pengecekan parameter `month`.
  - Jika paket aktif adalah `FREE` dan bulan yang diminta bukanlah bulan berjalan / bulan terbaru yang memiliki entri data, tampilkan layar upgrade CTA secara penuh pada halaman laporan dengan penjelasan bahwa akses riwayat laporan bulanan memerlukan paket Pro.

---

## 15. UX Principles (Prinsip Desain Antarmuka)
1. **Tidak Ada Dark Pattern**: Pengguna bebas menggunakan paket Gratis tanpa paksaan. Penurunan dari Trial ke Gratis tidak akan menghapus data yang telah diinput pengguna sebelumnya, melainkan hanya membatasi akses edit atau input baru jika melebihi batas kuota.
2. **Tanpa Kartu Kredit**: Aktivasi trial sama sekali tidak meminta input nomor kartu kredit, akun e-wallet, atau metode pembayaran lainnya.
3. **Bermanfaat Sejak Awal**: Paket gratis tetap menyediakan analisis dasar biaya listrik terhadap pendapatan, grafik sederhana, dan 3 rekomendasi hemat terbaik agar aplikasi tetap bernilai tinggi bagi bisnis skala mikro.

---

## 16. Testing Strategy
Skenario pengujian automated test yang wajib ditulis di backend (`tests/Feature/PlanGatingTest.php` atau sejenis):
1. **Resolusi Paket Default**:
   - Memastikan pengguna baru tanpa subscription eksplisit atau dengan record default `FREE` dikenali sebagai paket `FREE`.
2. **Masa Uji Coba (Active Trial)**:
   - Memastikan pengguna dengan status `PRO_TRIAL` dan `trial_ends_at` di masa depan mendapatkan level akses setara `PRO`.
3. **Masa Uji Coba Kedaluwarsa (Expired Trial)**:
   - Memastikan pengguna dengan status `PRO_TRIAL` namun `trial_ends_at` di masa lalu secara otomatis diturunkan statusnya ke `FREE`.
4. **Pembatasan Kuota Peralatan**:
   - Memastikan pengguna Gratis tidak bisa menambahkan peralatan ke-11 dan menerima error/redirect validasi.
5. **Pembatasan Entri Listrik & Pendapatan**:
   - Memastikan pengguna Gratis dibatasi hanya hingga 3 entri bulanan.
6. **Sensor & Blur Rekomendasi**:
   - Memvalidasi bahwa hanya 3 rekomendasi pertama yang terkirim/terbuka untuk paket Gratis, sedangkan sisanya terkunci.
7. **Otorisasi Rute Plans**:
   - Memastikan rute `/plans` hanya bisa diakses oleh pengguna terautentikasi (`auth`).
8. **Validasi Ketiadaan Kode Pembayaran**:
   - Memverifikasi tidak ada penyebutan dependensi Stripe/Midtrans/Xendit di dalam file controller baru.

---

## 17. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Dokumen spesifikasi implementasi Week 6 (`docs/rewrite/week-6-plan-gating-trial-spec.md`) berhasil dibuat di repositori.
- [ ] Rencana migrasi database dan struktur service `FeatureGateService` terdokumentasi dengan jelas.
- [ ] Pemetaan feature keys, limit keys, dan limit paket Gratis terdokumentasi lengkap.
- [ ] Alur trial 30 hari tanpa metode pembayaran terdefinisi dengan aman.
- [ ] Copywriting penawaran upgrade mematuhi pedoman kejujuran informasi (no dark patterns) dan menyertakan disclaimer program pilot.
- [ ] Rencana routing `/plans` dan integrasi menu "Paket" di sidebar telah dispesifikasikan.
- [ ] Seluruh pengujian backend yang ada tetap berjalan normal (`php artisan test` sukses).
- [ ] Proses build frontend tetap berjalan tanpa kendala (`npm run build` sukses).
