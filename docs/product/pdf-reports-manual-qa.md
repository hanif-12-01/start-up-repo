# Manual QA - Server-generated PDF Reports

Gunakan hanya akun demo/staging dan data sintetis. Jangan memakai data pelanggan nyata, foto meter pelanggan, atau database produksi.

## Prasyarat

- Aplikasi Laravel aktif dengan `PDF_REPORTS_ENABLED=true` pada lingkungan lokal/test atau staging.
- Akun memiliki trial aktif atau paket Pro/Business/Enterprise.
- Usaha berstatus aktif dan dimiliki akun yang sedang login.
- Sedikitnya satu periode memiliki data listrik atau pendapatan sintetis.

## Fixture sintetis yang disarankan

- Nama usaha: `Kos Melati Sintetis`.
- Periode: `2026-06`.
- Pemakaian: `846,75 kWh`.
- Tagihan: `Rp 1.298.500`.
- Stand meter: `10.234,25` sampai `11.081,00`.
- Pendapatan kotor: `Rp 18.500.000`.
- Peralatan: AC, pompa air, kulkas, dispenser, dan lampu koridor dengan angka simulatif.

## Skenario fungsional

1. Login sebagai pemilik usaha demo yang eligible.
2. Buka halaman **Laporan**, pilih usaha aktif dan periode fixture.
3. Pastikan tombol **Unduh PDF** terlihat dan dapat dioperasikan dengan keyboard.
4. Unduh PDF dan verifikasi respons `200`, `Content-Type: application/pdf`, serta nama file yang hanya berisi komponen aman.
5. Buka PDF dan cocokkan nama usaha, periode, kWh, tagihan, pendapatan, rasio, stand meter, skor, kandidat peralatan, dan rekomendasi dengan halaman laporan.
6. Pastikan PDF memuat timestamp, catatan kualitas data, pernyataan hasil berupa estimasi berdasarkan input pengguna, dan pernyataan WattWise bukan aplikasi resmi PLN.
7. Pastikan tidak ada istilah kepastian seperti `penyebab pasti`, `alat rusak`, `AI memastikan`, atau `sistem menjamin`.
8. Pastikan layout A4 terbaca, glyph Indonesia tidak rusak, tabel tidak terpotong, dan page break tidak memisahkan satu rekomendasi.
9. Unduh CSV periode yang sama dan pastikan regresi ekspor CSV tidak terjadi.

## Skenario keamanan

- Logout lalu akses URL PDF: harus diarahkan ke login.
- Ubah ID usaha pada URL ke usaha milik akun lain: harus `403` tanpa data tenant lain.
- Arsipkan usaha demo lalu akses URL PDF: harus `403`.
- Gunakan periode invalid seperti `2026-99`: harus ditolak validasi.
- Gunakan periode valid yang tidak tersedia: harus `404`.
- Gunakan akun paket Gratis: harus `403`.
- Set `PDF_REPORTS_ENABLED=false`: endpoint harus fail-closed dengan `404`.
- Gunakan nama usaha dengan karakter path seperti `Kos / Cabang`: filename harus tetap aman dan tidak membuat path arbitrer.
- Pastikan tidak ada request ke URL eksternal saat PDF dibuat dan tidak ada file PDF persisten di storage aplikasi.

## Hasil visual lokal terakhir

Fixture sintetis dirender dengan Dompdf ke A4 dua halaman dan diperiksa melalui Poppler. Typography, glyph, tabel, rekomendasi, disclaimer, dan page break tampil terbaca tanpa overlap atau clipping.
