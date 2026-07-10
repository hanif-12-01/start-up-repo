# WattWise AI — Validation Results Template (v0.2)

Laporan kompilasi hasil uji coba pengguna (user validation testing) untuk rilis WattWise AI v0.2. Gunakan template ini setelah mengompilasi seluruh lembar evaluasi (feedback scorecards).

---

## 1. Ringkasan Eksekutif (Executive Summary)

*   **Periode Pengujian:** `[Tanggal Mulai] s/d [Tanggal Selesai]`
*   **Total Partisipan:** `[Jumlah Partisipan, target minimal 5]`
*   **Rasio Keberhasilan Tugas (Task Completion Rate):** `[TCR %]`
*   **Rata-rata Skor Kegunaan (Usability Score / SUS):** `[SUS Score]`
*   **Skor Kemanfaatan (Average Perceived Usefulness):** `[Nilai rata-rata dari skala 1–5]`
*   **Rekomendasi Go / No-Go:** `[GO / NO-GO dengan alasan singkat]`

---

## 2. Profil Partisipan (Participant Profiles)

*   **Jumlah Kos/Kontrakan Owner:** `[Jumlah]`
*   **Jumlah Pelaku Usaha/UMKM:** `[Jumlah]`
*   **Sebaran Kota Operasional:** `[Kota-kota sebaran]`

---

## 3. Metrik & Hasil Uji Keberhasilan (Success Metrics Evaluation)

Evaluasi pencapaian target berdasarkan Kriteria Kelayakan Rilis (Success Criteria):

| Parameter Evaluasi | Target Minimum Rilis | Capaian Aktual Sesi | Status (Lulus / Gagal) |
| :--- | :---: | :---: | :---: |
| **Jumlah Wawancara** | Minimal 5 Sesi Selesai | `[Jumlah Sesi]` | |
| **Task Completion Rate (TCR)**| $\ge 80\%$ | `[TCR %]` | |
| **Median Waktu Tugas** | $< 4$ Menit (tugas utama) | `[Detik/Menit]` | |
| **Masalah Keamanan (P0)** | 0 Temuan | `[Jumlah Temuan P0]` | |
| **Rata-rata Kemanfaatan** | $\ge 4.0$ / $5.0$ | `[Rata-rata Skor]` | |
| **Retensi Penggunaan** | Minimal 3 partisipan bersedia menggunakan kembali | `[Jumlah Partisipan]` | |
| **Minat Membayar (Willingness to Pay)**| Minimal 2 partisipan bersedia membayar Rp49.000/bln| `[Jumlah Partisipan]` | |

---

## 4. Temuan Analitis (Analytical Insights)

### Masalah Paling Sering Terjadi (Most Common Problems)
1.  `[Masalah 1 - contoh: Partisipan kesulitan menginput rata-rata jam pakai dispenser di halaman peralatan]`
2.  `[Masalah 2 - contoh: Loading halaman laporan terasa lambat saat berpindah bulan]`

### Sinyal Nilai Produk Terkuat (Strongest Value Signals)
*   `[Tuliskan fitur atau visualisasi yang mendapat pujian terbanyak dari partisipan]`

### Keraguan Terhadap Estimasi (Trust Concerns)
*   `[Tuliskan bagian mana yang dinilai paling kurang akurat oleh user, misal pembagian tagihan kos AC vs Non-AC]`

### Hasil WTP (Willingness-to-Pay Results)
*   `[Berapa banyak partisipan yang menyatakan bersedia membayar Rp49.000/bulan? Apa argumen keberatan dari yang menolak?]`

---

## 5. Klasifikasi Temuan Validasi

Klasifikasikan temuan baru yang ditemukan selama sesi uji coba nyata:

### Temuan P0 — Memblokir Demo / Kerusakan Data (Must Fix immediately)
*   *None / [Detail jika ada]*

### Temuan P1 — Masalah UX Utama (Prioritas Perbaikan Cepat)
*   `[Contoh: Pesan validasi error stand meter terpotong di layar HP kecil]`

### Temuan P2 — Polesan Visual (Visual Polish)
*   `[Contoh: Jarak padding antar kartu dashboard terlalu besar di tablet]`

### Temuan P3 — Kebutuhan Fitur Masa Depan (Backlog v0.3+)
*   `[Contoh: Keinginan mengunduh laporan bulanan dalam format Excel/PDF]`

---

## 6. Tindakan Tindak Lanjut Rilis (Action Plan)

### Rekomendasi Perbaikan Cepat v0.2 (Safe UX Fixes)
1.  `[Tindakan 1]`
2.  `[Tindakan 2]`

### Rekomendasi Fitur Rilis v0.3 (Candidate Backlog)
1.  `[Tindakan 1 - misal: Tenant billing calculator]`
2.  `[Tindakan 2 - misal: PDF report downloader]`

### Permintaan Fitur yang Ditolak (Rejected Feature Requests)
*   *Tuliskan permintaan fitur yang tidak sesuai dengan fokus core cost-intelligence atau melanggar batasan MVP:*
    *   `[Contoh: Pembayaran tagihan PLN langsung via aplikasi (Ditolak karena di luar lingkup SaaS cost-intelligence)]`

---

## 7. Rekomendasi Keputusan Rilis (Go / No-Go Recommendation)

`[Pernyataan resmi tim validasi apakah produk WattWise AI v0.2 siap dirilis ke publik berdasarkan pencapaian kriteria sukses di atas.]`
