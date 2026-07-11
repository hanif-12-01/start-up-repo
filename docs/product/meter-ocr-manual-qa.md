# Manual QA Verification Guide: Meter OCR (Beta)

Dokumen ini berisi panduan skenario pengujian fungsional dan verifikasi visual untuk fitur pembacaan stand meter otomatis berbasis browser lokal (**Meter OCR**).

## Petunjuk Gambar Pengujian
Gunakan hanya gambar sintetis (buatan sendiri, tangkapan layar generator teks digital, atau sketsa angka meteran) untuk pengujian. **JANGAN PERNAH mengunggah atau melakukan komit foto asli meteran pelanggan untuk melindungi privasi.**

---

## Tabel Skenario Pengujian Manual (QA Fixtures)

| No | Nama Skenario | Deskripsi Input Gambar Sintetis | Perilaku UI & Hasil Deteksi yang Diharapkan |
| :--- | :--- | :--- | :--- |
| 1 | **Clear Straight Photo** | Gambar horizontal tegak dengan angka digital hitam jelas berlatar belakang putih / abu-abu (misal: "01234.5"). | • Status progress tampil sementara.<br>• Hasil scan berhasil terdeteksi sebagai `1234.5` (dengan atau tanpa leading zero).<br>• Kepercayaan tinggi (>= 75%).<br>• User bisa menekan tombol "Gunakan sebagai meter akhir". |
| 2 | **Rotated Photo** | Gambar meteran yang terputar 90 derajat searah jarum jam. | • Tombol "Putar 90°" dapat ditekan beberapa kali.<br>• Preview gambar ikut berputar di layar.<br>• Setelah posisi tegak dan diproses ulang, deteksi kembali berhasil dengan tingkat kepercayaan optimal. |
| 3 | **Low Contrast** | Gambar buram/redup dengan teks angka abu-abu tipis berlatar belakang abu-abu gelap. | • Preprocessor grayscale meningkatkan kontras.<br>• Jika tingkat kepercayaan di bawah batas minimal (min_confidence), muncul peringatan: "Tingkat keyakinan pembacaan rendah." |
| 4 | **Glare (Pantulan Cahaya)** | Gambar dengan pantulan putih terang di atas sebagian angka (misal menghalangi angka ketiga "12*45"). | • Deteksi gagal, atau menghasilkan angka alternatif.<br>• Menampilkan pesan kesalahan non-destruktif.<br>• Form meter tetap mempertahankan input manual. |
| 5 | **Blurred Image (Kabur)** | Gambar bergoyang atau kabur karena defocus kamera ponsel. | • Sistem gagal membaca atau memberikan keakuratan sangat rendah.<br>• Sistem mendeteksi keyakinan rendah dan menampilkan peringatan.<br>• Angka meter akhir tidak diisi secara otomatis. |
| 6 | **Multiple Numbers Visible** | Gambar yang menampilkan kode ID meteran ("1402348") dan angka stand meter ("05210"). | • Muncul peringatan: "Terdeteksi beberapa kemungkinan angka meteran."<br>• Akurasi diturunkan.<br>• Daftar kandidat alternatif ditampilkan di layar agar user dapat memilih angka yang benar. |
| 7 | **Decimal Reading** | Gambar stand meter dengan digit desimal dipisahkan koma atau titik (misal: "345,67" atau "345.67"). | • Angka dibaca dengan presisi desimal terpelihara (`345.67`).<br>• Penjumlahan/pengurangan meter akhir >= meter awal terhitung tepat. |
| 8 | **No Valid Reading** | Gambar foto pemandangan, wajah, atau kertas kosong tanpa karakter angka. | • Menampilkan alert error: "Tidak menemukan angka meteran yang valid."<br>• Tidak mengganggu form manual saat ini. |
| 9 | **Oversized Image** | File gambar buatan dengan resolusi raksasa (> 8MB) atau dimensi di atas batas. | • Input file langsung mendeteksi ukuran file melebihi limit sebelum proses OCR dimulai.<br>• Menampilkan alert error: "Ukuran file terlalu besar." |
| 10 | **Unsupported File Type** | File berekstensi `.svg`, `.pdf`, atau `.gif`. | • Input file memvalidasi MIME type.<br>• Menampilkan alert error: "Tipe file tidak didukung. Harap pilih gambar JPEG, PNG, atau WebP." |
| 11 | **Processing Timeout** | Simulasi beban CPU tinggi yang melebihi batas waktu proses (timeout). | • Proses dihentikan otomatis.<br>• Menampilkan error: "Waktu proses OCR habis (timeout)" atau pesan timeout setara.<br>• Worker Tesseract dihentikan secara bersih. |
| 12 | **Offline Execution Check** | Menjalankan OCR saat koneksi internet dinonaktifkan (Airplane Mode). | • Asset Tesseract diakses dari `/tesseract/v7` lokal (same-origin).<br>• Proses OCR berjalan sukses tanpa koneksi internet. |
| 13 | **No-Upload & Same-Origin Verification** | Membuka tab Network pada DevTools saat memproses gambar OCR dan memeriksa semua request. | • Memastikan assets di-load dari origin lokal (misal: `/tesseract/v7/worker.min.js`, `/tesseract/v7/tesseract-core.wasm`, `/tesseract/v7/tessdata/eng.traineddata.gz`).<br>• Tidak ada network request payload gambar yang dikirim ke backend Laravel atau server eksternal mana pun.<br>• Tidak ada request ke URL eksternal (CDN/third-party). |
| 14 | **Historical-Period Suggestion** | Mengubah periode bulan input dan mengklik saran stand meter. | • Saran dihitung secara dinamis hanya dari data bulan-bulan sebelumnya.<br>• Muncul dialog konfirmasi saat ingin menimpa nilai yang sudah terisi. |
| 15 | **Lifecycle & Cleanup** | Berpindah halaman setelah memilih gambar atau memicu proses OCR. | • Seluruh Worker di-terminate.<br>• URL objek memori di-revoke sekali secara bersih untuk menghindari memory leak. |

---

## Panduan Kebijakan Privasi
1. **Pemrosesan Lokal**: Semua data piksel gambar diproses di memori browser pengguna melalui WebAssembly. Tidak ada panggilan API ke luar (seperti Google Vision atau OpenAI) yang dilakukan.
2. **Tanpa Penyimpanan Foto**: Gambar diwakili oleh objek lokal URL sementara yang langsung dihapus (*revoked*) dari memori browser setelah proses selesai atau ketika pengguna menutup halaman.
3. **Verifikasi Tab Network (DevTools)**:
   - Buka DevTools (`F12`) lalu pilih tab **Network**.
   - Jalankan pemrosesan OCR gambar stand meter.
   - Verifikasi bahwa file-file berikut di-load hanya dari domain/origin yang sama (same-origin):
     - `worker.min.js` (Worker)
     - `tesseract-core.js` / `tesseract-core-simd.js` (Core Loader)
     - `tesseract-core.wasm` / `tesseract-core-simd.wasm` (WASM)
     - `eng.traineddata.gz` (Trained data)
   - Verifikasi bahwa **tidak ada** upload payload gambar (XHR/Fetch ke route `/upload`, `/store`, atau API eksternal).
   - Verifikasi bahwa **tidak ada** request ke domain eksternal seperti `unpkg.com`, `jsdelivr.net`, atau `tesseract.projectnaptha.com`.
