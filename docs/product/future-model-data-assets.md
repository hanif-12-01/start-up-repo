# WattWise Future Model Data Assets

## 1. Current ML Boundary

Model ML live WattWise saat ini hanya N-BEATS. Model tersebut menggunakan tepat enam nilai kWh bulanan valid terbaru yang berurutan, dengan tensor `[1,6]`, untuk memperkirakan pemakaian periode berikutnya.

Data profil usaha, tarif, peralatan, omzet, tindakan, dan outcome yang dijelaskan di bawah adalah aset data untuk pengembangan masa depan. Data tersebut bukan input N-BEATS saat ini. Keberadaan field dalam schema juga tidak berarti setiap pengguna sudah mengisinya atau bahwa field itu telah memenuhi syarat untuk pelatihan model.

Klasifikasi dalam dokumen ini berarti:

- `AVAILABLE_NOW`: field tersedia dan diwajibkan oleh alur produk saat ini.
- `PARTIAL`: field tersedia, tetapi opsional, tergantung segmen, atau mungkin belum tersedia pada setiap catatan.
- `NOT_AVAILABLE`: belum ada field produk yang sah untuk informasi tersebut.

## 2. Business Context Data

| Data | Status | Catatan |
|---|---|---|
| Jenis usaha (`businessType`) | `AVAILABLE_NOW` | Dikumpulkan sebagai klasifikasi usaha pada profil. |
| Segmen (`segment`) | `AVAILABLE_NOW` | Digunakan untuk konteks pengalaman produk dan template. |
| Kota (`city`) | `PARTIAL` | Field tersedia tetapi opsional. |
| Provinsi (`province`) | `PARTIAL` | Field tersedia tetapi opsional. |
| Sistem kelistrikan (`electricalSystem`) | `AVAILABLE_NOW` | Dikumpulkan pada profil; menggambarkan konfigurasi operasional yang dipilih pengguna. |
| Daya terpasang VA (`powerVa`) | `PARTIAL` | Field tersedia tetapi tidak wajib pada semua usaha. |
| Tarif (`tariffRupiahPerKwh`) | `PARTIAL` | Dapat disimpan pada profil, tetapi dapat kosong atau berbeda per tagihan. |
| Jumlah kamar (`roomCount`) | `PARTIAL` | Relevan terutama untuk segmen properti tertentu dan bersifat opsional. |
| Jumlah kamar terisi (`occupiedRoomCount`) | `PARTIAL` | Field opsional; bukan deret tingkat okupansi bulanan. |
| Jumlah karyawan (`employeeCount`) | `PARTIAL` | Field opsional dan tidak selalu relevan pada setiap segmen. |
| Hari operasi per bulan (`operatingDaysPerMonth`) | `PARTIAL` | Field opsional; bukan hari operasi per minggu. |

WattWise saat ini tidak memiliki field sah untuk `building_area`, `dataset_source`, `building_primary_use`, `site`, atau `timezone` sebagaimana dibutuhkan kontrak benchmark LightGBM. Field tersebut berstatus `NOT_AVAILABLE` untuk kontrak produk nyata saat ini.

## 3. Electricity Bill Data

Data tagihan merupakan sumber deret waktu utama dan mempunyai karakter ketersediaan berikut:

| Data | Status | Catatan |
|---|---|---|
| Periode awal dan akhir tagihan | `AVAILABLE_NOW` | Wajib dan unik per usaha/periode. |
| kWh | `PARTIAL` | Field tersedia, tetapi dapat kosong pada catatan yang hanya memiliki nilai biaya. |
| Nilai tagihan | `AVAILABLE_NOW` | Wajib dan tidak boleh negatif. |
| Tarif per kWh | `PARTIAL` | Dapat dicatat per periode, tetapi opsional. |
| Pembacaan meter awal/akhir | `PARTIAL` | Keduanya tersedia sebagai field opsional. |
| Sumber kWh | `AVAILABLE_NOW` | Menandai `USER_ENTERED`, `METER_DERIVED`, atau `LEGACY_UNKNOWN`; label legacy tetap memerlukan kehati-hatian kualitas. |

Periode dan kWh dapat menjadi sinyal pelatihan masa depan hanya setelah kontinuitas, duplikasi, nilai hilang, dan asal nilai diperiksa. Nilai tagihan tidak boleh dipakai sebagai pengganti kWh tanpa aturan transformasi yang sah dan terdokumentasi.

## 4. Appliance Data

Inventaris peralatan menyimpan:

| Data | Status | Catatan |
|---|---|---|
| Kategori peralatan | `AVAILABLE_NOW` | Wajib untuk setiap item. |
| Daya dalam watt | `PARTIAL` | Field tersedia tetapi dapat kosong. |
| Jam operasi harian | `PARTIAL` | Field tersedia tetapi dapat kosong. |
| Jumlah unit | `AVAILABLE_NOW` | Wajib dan minimal satu. |
| Hari operasi per bulan | `AVAILABLE_NOW` | Wajib pada item, dengan default produk yang tetap perlu dibedakan dari pengukuran aktual. |

Data peralatan merupakan profil atau estimasi operasional, bukan pengukuran submeter. Karena itu, model masa depan harus membedakan input manual, template, dan pengukuran nyata serta tidak menganggap estimasi peralatan sebagai ground truth konsumsi per alat.

## 5. Revenue Data

WattWise dapat menyimpan omzet bulanan dan sumber kepastiannya:

- nilai omzet bulanan (`amountRupiah`) berstatus `AVAILABLE_NOW` pada setiap catatan omzet;
- mode input (`EXACT` atau `ESTIMATE`) berstatus `AVAILABLE_NOW` dan penting untuk menilai kualitas konteks;
- catatan tambahan tersedia secara opsional.

Omzet adalah konteks finansial usaha dan bukan input N-BEATS saat ini. Pemakaian masa depan harus mempertimbangkan sensitivitas data, isolasi tenant, dan perbedaan antara nilai pasti serta estimasi.

## 6. Action and Outcome Data

WattWise telah mempunyai data sah untuk siklus tindakan dan evaluasi:

| Data | Status | Catatan |
|---|---|---|
| Status Rencana Hemat | `AVAILABLE_NOW` | `PLANNED`, `IN_PROGRESS`, `COMPLETED`, atau `CANCELLED`. |
| Kondisi baseline | `AVAILABLE_NOW` | Disimpan sebagai snapshot ketika rencana dibuat/evaluasi dilakukan. |
| Tagihan tindak lanjut | `AVAILABLE_NOW` saat evaluasi terbentuk | Harus berbeda dari tagihan baseline. |
| Arah pemakaian | `AVAILABLE_NOW` saat evaluasi terbentuk | `LOWER`, `SIMILAR`, `HIGHER`, atau `UNAVAILABLE`. |
| Arah biaya | `AVAILABLE_NOW` saat evaluasi terbentuk | `LOWER`, `SIMILAR`, atau `HIGHER`. |
| Arah tarif | `AVAILABLE_NOW` saat evaluasi terbentuk | Dapat pula `UNAVAILABLE`. |
| Kualitas data outcome | `AVAILABLE_NOW` saat evaluasi terbentuk | `USAGE_COMPLETE`, `TARIFF_CONTEXT_ONLY`, atau `COST_ONLY`. |

Outcome dapat menjadi sinyal pembelajaran masa depan, tetapi tidak otomatis membuktikan efek kausal suatu tindakan. Perubahan cuaca, operasi, okupansi, tarif, atau kondisi lain dapat terjadi pada periode yang sama. Pelatihan yang bertanggung jawab memerlukan definisi target dan kontrol kualitas yang lebih ketat.

## 7. Why More Data Alone Is Not Enough

Peningkatan model membutuhkan:

- data yang valid, bukan sekadar banyak baris;
- histori yang berurutan dan definisi periode yang konsisten;
- segmen usaha yang representatif;
- keragaman geografis dan operasional;
- jumlah contoh yang memadai pada setiap segmen penting;
- ground truth yang dapat dipercaya;
- pencegahan kebocoran target dan informasi masa depan;
- pembagian data serta validasi yang mengikuti waktu;
- pembanding baseline yang adil.

Seratus ribu catatan berkualitas rendah atau tidak representatif tidak otomatis lebih baik daripada dataset yang lebih kecil tetapi berkualitas tinggi dan mewakili populasi sasaran. Volume hanya berguna ketika provenance, kualitas, cakupan, dan metode evaluasinya dapat dipertanggungjawabkan.

## 8. Future Model Evaluation Requirements

Setiap kandidat model masa depan wajib dibandingkan dengan baseline deterministik dan, bila fase historinya relevan, N-BEATS saat ini. Evaluasi minimal mencakup:

- MAE;
- RMSE;
- sMAPE;
- WMAPE ketika penyebutnya valid;
- histori stabil, tumbuh, menurun, dan berisik;
- bulan yang hilang atau tidak berurutan;
- usaha yang tidak terlihat selama pelatihan;
- performa per segmen, bukan hanya agregat keseluruhan.

Evaluasi harus time-aware, memisahkan keputusan model dari final test, mencegah target masa depan masuk ke fitur, serta melaporkan ketika model tidak lebih baik daripada baseline. Model yang lebih kompleks tidak otomatis lebih layak digunakan.

## 9. LightGBM R&D Status

LightGBM saat ini adalah aset R&D yang tervalidasi secara teknis, tetapi tidak dapat diaktifkan untuk pengguna WattWise nyata. Kontrak fiturnya mencakup konteks benchmark yang tidak tersedia secara sah dari produk, yaitu `building_area`, `dataset_source`, `building_primary_use`, `site`, dan `timezone`.

Kekosongan tersebut tidak boleh diisi dengan nilai palsu, tebakan, atau default massal. Aktivasi hanya layak dipertimbangkan setelah ada kontrak fitur yang benar-benar dapat dipenuhi oleh data produk serta bukti evaluasi baru yang relevan.

## 10. Future Opportunity

Peluang arsitektur masa depan dapat dipahami sebagai pembagian peran:

- N-BEATS sebagai spesialis pola deret waktu kWh;
- model kontekstual masa depan untuk konteks usaha dan operasi yang benar-benar tersedia;
- lapisan diagnostik dan keputusan untuk menerjemahkan sinyal menjadi rekomendasi yang dapat ditindaklanjuti;
- data outcome sebagai kandidat sinyal pembelajaran setelah kualitas dan batas kausalnya dinilai.

Ini adalah arah konseptual, bukan komitmen implementasi. Setiap perubahan model tetap membutuhkan kontrak data yang sah, validasi independen, pembandingan baseline, dan keputusan produk terpisah.
