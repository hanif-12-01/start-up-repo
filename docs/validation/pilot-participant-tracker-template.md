# WattWise AI — Pilot Participant Tracker Template

Lembar pelacak (tracker) untuk memetakan daftar penguji (pilot participants) selama program validasi v0.2.

---

> [!IMPORTANT]
> **Kebijakan Privasi Data (GDPR & PDP Compliance):**
> *   Jangan menyimpan informasi pribadi sensitif (seperti nama lengkap asli, nomor telepon pribadi, alamat rumah lengkap, atau kredensial perbankan) di dalam file repositori yang dapat diakses publik.
> *   Gunakan kode penyamaran (Participant ID) untuk mengidentifikasi pengguna.

---

| Participant ID | User Segment | Business Type | City | Business Size | Session Date | Test Status | Recording Consent | Notes |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **P01** | Kos Owner | Kos-kosan | Purwokerto | 20 Kamar | 2026-07-11 | Scheduled | Yes (Audio/Screen) | Pemilik lama dengan pencatatan pembukuan manual. |
| **P02** | Kos Owner | Kontrakan | Cilacap | 8 Pintu | 2026-07-12 | Pending | Waiting | Menggunakan sistem token prabayar terpisah per pintu. |
| **P03** | UMKM Owner | Laundry | Banyumas | 4 Mesin Cuci | 2026-07-12 | Scheduled | Yes (Screen only) | Rata-rata beban daya mesin cuci 400W per unit. |
| **P04** | UMKM Owner | F&B / Cafe | Purwokerto | 3 Refrigerator | 2026-07-13 | Scheduled | No | Mengalami kenaikan biaya listrik drastis 2 bulan terakhir. |
| **P05** | Kos Owner | Kos-kosan | Purwokerto | 15 Kamar | 2026-07-14 | Pending | Waiting | Menggunakan AC di 10 kamar utama. |
| **P06** | UMKM Owner | Workshop / Bengkel| Banyumas | 2 Kompresor | 2026-07-15 | Scheduled | Yes (Audio/Screen) | Operasional siang hari saja, beban mesin tinggi. |
| **[P07]** | `[Kos / UMKM]` | `[Tipe Usaha]` | `[Kota]` | `[Kapasitas/Kamar]`| `[YYYY-MM-DD]`| `[Pending/Done]`| `[Yes / No]` | `[Catatan singkat latar belakang user]` |

---

### Panduan Kode Status Uji (Test Status Coding)
*   **Scheduled:** Sesi sudah disepakati jadwalnya, staging URL dikirimkan ke fasilitator.
*   **Pending:** Sedang dalam proses koordinasi waktu/kontak.
*   **Done:** Wawancara telah selesai dan lembar skor feedback diisi lengkap.
*   **Cancelled:** Partisipan berhalangan atau mengundurkan diri.
