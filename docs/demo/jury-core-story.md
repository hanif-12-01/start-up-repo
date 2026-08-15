# WattWise Jury Core Story

Skrip utama berikut ditargetkan sekitar 2 menit 40 detik. Gunakan akun demo dengan sedikitnya enam bulan kWh valid yang berurutan. Angka yang disebut saat presentasi harus mengikuti nilai yang benar-benar terlihat pada layar; jangan menghafalkan hasil contoh.

## 1. Opening — 15–20 seconds

**Tampilkan:** Dashboard WattWise.

**Narasi:**

> “Pemilik usaha biasanya tahu ketika tagihan listrik berubah, tetapi belum tentu memahami arti trennya, apa yang mungkin terjadi bulan depan, bagian mana yang patut diperiksa, atau tindakan apa yang harus dimulai. WattWise menghubungkan seluruh pertanyaan itu dalam satu alur keputusan energi.”

## 2. Data — 20–30 seconds

**Tampilkan:** Profil usaha, daftar tagihan, dan histori bulanan berurutan.

**Narasi:**

> “WattWise dimulai dari data yang sudah dimiliki pengguna: profil usaha dan tagihan listrik bulanan. Periode, nilai kWh, biaya, serta konteks usaha disusun per bisnis. Histori yang berurutan penting karena prediksi tidak didasarkan pada umur akun atau sekadar jumlah tagihan yang pernah dibuat.”

## 3. Understand — 20–30 seconds

**Tampilkan:** Tab tren, indikasi anomali, dan kesiapan data.

**Narasi:**

> “Dari data ini, WattWise membantu pengguna melihat arah pemakaian dan biaya, menandai perubahan yang perlu diperhatikan, dan menjelaskan apakah histori sudah cukup untuk prediksi. Indikasi anomali bukan bukti bahwa suatu alat rusak; ini adalah sinyal agar pengguna tahu kapan perlu memeriksa lebih lanjut.”

## 4. Predict — 30–45 seconds

**Tampilkan:** `/analysis?tab=forecast` pada bisnis dengan setidaknya enam bulan histori valid berurutan. Pastikan label **Prediksi AI Aktif** terlihat.

**Narasi:**

> “Pada usaha ini, WattWise menggunakan model N-BEATS yang berjalan langsung di browser. Enam bulan konsumsi kWh terbaru yang berurutan diproses untuk menghasilkan prediksi pemakaian periode berikutnya. Di sini kita melihat prediksi kWh, estimasi tagihan berdasarkan tarif yang tersedia, perubahan dan tingkat risiko, serta titik forecast pada grafik. Nilai kWh berasal dari model; WattWise kemudian menghitung dan menyusun nilai produk lainnya dari prediksi tersebut.”

Jika akun mempunyai histori lebih panjang, tetap katakan bahwa model memproses enam bulan terbaru.

## 5. Decide — 20–30 seconds

**Tampilkan:** Handoff langkah berikutnya. Jika risiko menengah atau tinggi, pilih **Cek Kenaikan**.

**Narasi:**

> “Prediksi menjawab apa yang mungkin terjadi berikutnya. Jika perubahannya patut diperhatikan, WattWise meneruskan pengguna ke Cek Kenaikan. Diagnostik membantu menyusun kandidat yang layak diperiksa; fitur ini terpisah karena N-BEATS tidak menentukan alat atau sebab teknis tertentu.”

## 6. Act / Measure — 20–30 seconds

**Tampilkan:** Rencana Hemat dan, bila tersedia pada akun demo, halaman Evaluasi Hasil.

**Narasi:**

> “Kandidat yang relevan dapat diteruskan menjadi Rencana Hemat dengan langkah dan status yang jelas. Setelah tindakan selesai dan tagihan berikutnya tersedia, WattWise membandingkan kondisi awal dengan data tindak lanjut untuk melihat arah perubahan pemakaian dan biaya.”

Jika akun demo belum memiliki visual outcome lengkap, jelaskan alur produk tersebut tanpa menyebut angka atau hasil yang tidak terlihat.

## 7. Technical Differentiator — maximum 20 seconds

**Narasi:**

> “N-BEATS sudah menjadi bagian dari aplikasi WattWise. Model ONNX dan runtime WASM dikirim bersama aplikasi, lalu inferensi dijalankan di browser pengguna. Jadi jalur prediksi ini tidak membutuhkan server ML eksternal, tunnel, atau laptop khusus. WattWise tetap menggunakan infrastruktur web normal seperti hosting, database, dan autentikasi.”

## 8. Limitations — 10–15 seconds

**Narasi:**

> “Prediksi saat ini tetap merupakan estimasi. N-BEATS tidak mengidentifikasi sebab yang tepat, dan data dunia nyata yang lebih luas masih diperlukan untuk menguji serta meningkatkan generalisasi pada lebih banyak segmen usaha.”

## 9. Likely Jury Questions

**Q: Apakah AI ini nyata atau hanya label?**

**A:** Nyata. WattWise menjalankan inferensi N-BEATS ONNX di browser dan memakai hasil kWh-nya dalam Forecast.

**Q: Berapa banyak data yang dibutuhkan?**

**A:** Jalur AI saat ini aktif setelah tersedia sedikitnya enam catatan kWh bulanan valid yang berurutan. Model memproses enam bulan terbaru.

**Q: Mengapa pengguna dengan sedikit data tidak langsung memakai AI?**

**A:** WattWise memakai estimasi deterministik yang lebih aman sampai histori berurutan mencukupi. Estimasi tersebut tidak dilabeli sebagai AI.

**Q: Apa yang terjadi jika model gagal dimuat?**

**A:** Forecast tetap memakai baseline deterministik sehingga alur inti produk tetap dapat digunakan.

**Q: Apakah AI menentukan peralatan yang menyebabkan kenaikan?**

**A:** Tidak. Forecast dan diagnostics sengaja dipisahkan. N-BEATS memperkirakan pemakaian berikutnya, sedangkan diagnostics membantu menyusun kandidat pemeriksaan manual.

**Q: Mengapa LightGBM tidak aktif?**

**A:** Model riset LightGBM yang tervalidasi membutuhkan field konteks benchmark yang belum tersedia secara sah dari pengguna WattWise. WattWise tidak mengisi field tersebut dengan nilai buatan.

**Q: Apakah inferensi membutuhkan server AI terpisah?**

**A:** Tidak untuk jalur N-BEATS saat ini. Model dan ORT WASM disajikan dari origin aplikasi yang sama, lalu dijalankan di browser.

**Q: Apakah solusi ini dapat diperluas?**

**A:** Arsitekturnya mendukung pengembangan lebih lanjut, tetapi klaim akurasi yang lebih luas membutuhkan data representatif dan validasi model tambahan.
