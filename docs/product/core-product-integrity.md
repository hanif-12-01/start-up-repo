# WattWise Core Product Integrity

## 1. Product Thesis

WattWise adalah produk pendukung keputusan energi untuk UMKM dan pengelola properti kecil. Produk ini membantu usaha mengumpulkan data listrik, memahami perubahan yang terjadi, memperkirakan apa yang mungkin terjadi pada periode berikutnya, menentukan hal yang patut diperiksa, menjalankan tindakan, lalu mengevaluasi hasilnya ketika data lanjutan tersedia.

Nilai utama WattWise bukan sekadar menampilkan angka atau grafik. WattWise menghubungkan data yang dimiliki pengguna dengan langkah keputusan yang jelas. Produk tetap menempatkan pengguna sebagai pengambil keputusan: hasil analisis adalah estimasi atau indikasi berdasarkan data yang dimasukkan, bukan kepastian teknis mengenai kondisi instalasi maupun peralatan.

## 2. Intelligence Loop

Arsitektur produk mengikuti satu siklus yang konsisten:

`DATA → UNDERSTAND → PREDICT → DECIDE → ACT → MEASURE`

### DATA

Tahap ini membangun dasar informasi usaha melalui:

- profil usaha dan konteks kelistrikan;
- tagihan listrik bulanan, termasuk periode, kWh, nilai tagihan, dan sumber nilai kWh;
- inventaris peralatan beserta daya dan pola operasi yang diketahui;
- omzet bulanan dan konteks operasional yang dimasukkan pengguna.

Data tersebut tetap dipisahkan per usaha dan hanya dipakai dalam konteks pemilik yang berwenang.

### UNDERSTAND

WattWise menyusun data menjadi informasi yang lebih mudah ditindaklanjuti melalui:

- tren pemakaian dan biaya dari periode ke periode;
- indikasi anomali ketika perubahan patut diperhatikan;
- konteks efisiensi, seperti hubungan biaya listrik dengan omzet atau estimasi beban peralatan;
- status kesiapan data agar pengguna memahami batas analisis yang tersedia.

Indikasi anomali bukan bukti kerusakan alat. Indikasi tersebut hanya membantu pengguna menentukan kapan pemeriksaan lebih lanjut layak dilakukan.

### PREDICT

Fitur WattWise Prediction memperkirakan pemakaian listrik periode berikutnya. Jalurnya terdiri dari:

- estimasi deterministik ketika histori berurutan belum mencukupi;
- N-BEATS ketika usaha memiliki setidaknya enam bulan kWh valid yang berurutan.

Prediksi selalu disajikan sebagai estimasi dan tetap memiliki jalur aman apabila inferensi model tidak dapat dijalankan.

### DECIDE

WattWise membantu pengguna memilih fokus berikutnya melalui:

- Cek Kenaikan atau diagnostik terpandu;
- rekomendasi berdasarkan konteks data yang tersedia;
- penjelasan risiko dan kesiapan data;
- daftar kandidat yang perlu diperiksa secara manual.

Tahap ini tidak menggantikan pemeriksaan teknis oleh pihak yang kompeten.

### ACT

Temuan yang relevan dapat diteruskan menjadi Rencana Hemat. Rencana ini menyimpan langkah yang dipilih, alasan, status pelaksanaan, dan waktu tindak lanjut. Dengan demikian, rekomendasi tidak berhenti sebagai daftar bacaan.

### MEASURE

Setelah tindakan selesai dan tagihan berikutnya tersedia, WattWise dapat membandingkan kondisi awal dengan tagihan tindak lanjut. Evaluasi mencakup arah perubahan pemakaian, biaya, konteks tarif, dan kualitas data evaluasi. Hasilnya tetap berupa sinyal evaluasi, bukan bukti tunggal bahwa satu tindakan menjadi sebab perubahan.

## 3. WattWise Prediction Architecture

Routing prediksi didasarkan pada histori kWh bulanan valid yang berurutan pada usaha, bukan umur akun atau jumlah total tagihan sepanjang waktu.

- Kurang dari 6 bulan berurutan: estimasi deterministik.
- 6 bulan atau lebih: inferensi N-BEATS di browser.

Secara internal, histori 0, 1–2, dan 3–5 bulan memakai baseline deterministik. Histori 6–12 bulan dan 13 bulan atau lebih memenuhi jalur N-BEATS. Pembagian internal ini tidak perlu ditampilkan sebagai kode teknis kepada pengguna normal.

Model live saat ini adalah `nbeats-ai02-1.0.0`. Input inferensinya tepat enam nilai kWh bulanan valid terbaru yang berurutan, dengan bentuk tensor `[1,6]`. Usaha dapat mempunyai histori tersedia yang lebih panjang, tetapi implementasi N-BEATS saat ini tetap hanya menggunakan enam bulan terbaru sebagai input model.

## 4. Why N-BEATS Is Operational, Not Decorative

N-BEATS benar-benar menghasilkan estimasi kWh periode berikutnya. Nilai kWh tersebut menjadi input operasional bagi pengalaman Forecast WattWise.

Dari prediksi kWh, aplikasi kemudian menurunkan nilai produk lain:

- estimasi tagihan berikutnya menggunakan tarif yang tersedia;
- persentase perubahan terhadap periode terakhir;
- klasifikasi risiko berdasarkan aturan produk;
- titik prediksi pada grafik forecast;
- handoff ke tindakan berikutnya, misalnya Cek Kenaikan ketika perubahan patut diperiksa.

Pemisahan ini penting. N-BEATS secara langsung memprediksi kWh. Estimasi rupiah, persentase perubahan, risiko, visualisasi, dan rekomendasi langkah berikutnya dihitung atau disusun oleh logika aplikasi dari hasil prediksi tersebut. Dokumen maupun UI tidak boleh menyebut semua nilai turunan itu sebagai keluaran langsung model.

## 5. Forecast vs Diagnostics

Forecast menjawab pertanyaan:

> “Apa yang mungkin terjadi pada pemakaian listrik periode berikutnya?”

Diagnostics menjawab pertanyaan:

> “Apa yang sebaiknya diperiksa?”

N-BEATS adalah model peramalan deret waktu. Model ini tidak mengidentifikasi kerusakan alat, tidak membaca kondisi fisik instalasi, dan tidak membuktikan hubungan kausal. Cek Kenaikan menggunakan data serta jawaban pengguna untuk menyusun kandidat pemeriksaan secara terpisah. Pemisahan ini menjaga agar prediksi tidak disalahartikan sebagai diagnosis otomatis.

## 6. Deterministic Fallback

Baseline deterministik adalah jalur estimasi resmi, bukan AI. Jalur ini digunakan ketika:

- histori berurutan belum mencapai enam bulan;
- browser tidak dapat memuat model atau runtime tertanam;
- inferensi gagal, keluarannya tidak valid, atau tidak selesai dengan aman.

Fallback menjaga agar alur produk tetap dapat digunakan tanpa menggantungkan penyimpanan tagihan atau navigasi inti pada keberhasilan model. Label yang ditampilkan harus menerangkan bahwa hasil berasal dari histori yang tersedia, bukan menyebutnya sebagai prediksi AI.

## 7. LightGBM Status

LightGBM merupakan aset R&D yang telah divalidasi secara teknis dan kompatibel dengan ONNX/browser, tetapi bukan model live MVP dan tidak berada dalam routing pengguna nyata.

Kontrak fitur LightGBM saat ini membutuhkan konteks benchmark yang tidak sepenuhnya dikumpulkan secara sah oleh WattWise, termasuk `building_area`, `dataset_source`, `building_primary_use`, `site`, dan `timezone`. Karena kontrak input produk belum lengkap, `REAL_APP_LIGHTGBM_INPUT_FEASIBLE = NO` dan `LIGHTGBM_PRODUCT_ENABLED = NO`.

Field yang hilang tidak boleh diisi dengan nilai buatan atau default yang tidak mempunyai dasar. LightGBM dipertahankan sebagai bukti dan aset penelitian untuk evaluasi masa depan setelah tersedia kontrak input yang sah.

## 8. Embedded AI Runtime

Jalur inferensi N-BEATS saat ini adalah:

`WattWise Vercel → aset aplikasi same-origin → model N-BEATS ONNX + ONNX Runtime Web WASM → inferensi browser`

Model ONNX dikirim bersama aplikasi WattWise. Binary ORT WASM juga dilayani dari origin yang sama melalui `/ort-wasm/`. Inferensi berlangsung di browser pengguna dan tidak memerlukan server inferensi ML eksternal, proses Python serving, laptop ML, tunnel, atau layanan hosting AI terpisah.

Pernyataan tersebut hanya berlaku pada jalur prediksi ML. Sebagai aplikasi web, WattWise tetap menggunakan infrastruktur normal seperti hosting, database, autentikasi, dan akses jaringan.

## 9. Current MVP Limitations

- Prediksi tetap merupakan estimasi; akurasinya tidak dijamin.
- N-BEATS saat ini hanya menerima enam bulan kWh berurutan terbaru.
- Model tidak membuktikan sebab perubahan konsumsi dan tidak menggantikan pemeriksaan manual.
- Akurasi lintas populasi nasional dan seluruh segmen UMKM Indonesia belum terbukti.
- Kualitas hasil bergantung pada kelengkapan, validitas, dan kontinuitas data pengguna.
- Generalisasi dan peningkatan model membutuhkan data dunia nyata yang lebih luas, representatif, beragam secara geografis dan operasional, serta dievaluasi tanpa kebocoran waktu.

## 10. What WattWise Does Not Claim

WattWise MVP tidak mengklaim:

- penghematan yang pasti atau persentase penghematan tertentu;
- akurasi prediksi yang pasti;
- diagnosis kelistrikan otomatis;
- deteksi kerusakan peralatan yang telah terverifikasi;
- generalisasi yang telah terbukti untuk semua usaha di Indonesia;
- bahwa LightGBM digunakan pada produk live;
- bahwa model forecast dapat menjelaskan sebab fisik perubahan;
- bahwa aplikasi web tidak mempunyai ketergantungan infrastruktur normal.

Integritas produk dijaga dengan menyampaikan fungsi model, nilai turunan, fallback, dan keterbatasannya secara terpisah dan konsisten.
