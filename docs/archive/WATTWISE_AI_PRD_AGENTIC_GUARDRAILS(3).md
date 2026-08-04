---
title: "WattWise AI — Product Requirements Document"
version: "1.0"
status: "Baseline Pengembangan"
owner: "Hanif — CEO / Product Owner / IT Lead"
business_reviewers:
  - "Tata — CMO / Administration & Narrative Lead"
  - "Stellung — CFO / Business & Pitch Lead"
target_release: "31 Agustus 2026"
document_type: "Canonical PRD and Agentic AI Guardrails"
---

# WattWise AI — Product Requirements Document

## 0. Status Dokumen

Dokumen ini adalah **sumber kebenaran utama** untuk pengembangan WattWise AI.

Semua manusia, developer, Codex, coding agent, autonomous agent, AI reviewer, dan agentic workflow wajib mengikuti dokumen ini sebelum:

- membuat fitur;
- mengubah arsitektur;
- membuat migration;
- mengubah UI;
- mengubah copy produk;
- menambah dependency;
- mengaktifkan model AI/ML;
- membuat integrasi eksternal;
- mengubah harga, paket, atau entitlement;
- melakukan deployment;
- membuka atau menggabungkan pull request.

Ketika implementasi, ide agent, atau instruksi lain bertentangan dengan PRD ini, maka:

> **PRD ini yang berlaku sampai Product Owner menyetujui perubahan secara tertulis.**

Agent tidak boleh menyimpulkan sendiri bahwa perubahan scope “lebih baik”, “lebih modern”, atau “lebih scalable” tanpa persetujuan.

---

# 1. Ringkasan Produk

## 1.1 Nama Produk

**WattWise AI**

## 1.2 Tagline

**Listrik Lebih Cerdas, Cash Flow Lebih Terkendali.**

## 1.3 Kalimat Produk Sederhana

> **Mulai dari tagihan yang Anda punya. WattWise membantu menemukan apa yang perlu diperiksa lebih dahulu.**

## 1.4 Definisi Produk

WattWise AI adalah aplikasi berbasis SaaS untuk membantu pemilik kos, pengelola properti kecil, dan UMKM padat energi:

1. mencatat biaya listrik;
2. memahami perubahan tagihan;
3. memeriksa apakah kenaikan masih wajar;
4. mempersempit bagian yang perlu diperiksa;
5. menjalankan tindakan hemat;
6. mengevaluasi hasil tindakan pada periode berikutnya.

WattWise tidak hanya menampilkan grafik atau prediksi. Produk harus mengarahkan pengguna dari:

```text
Tagihan naik
→ memahami perubahan
→ mencari kandidat yang perlu diperiksa
→ melakukan pemeriksaan
→ membuat tindakan
→ melihat hasil berikutnya
```

## 1.5 Posisi Produk

WattWise bukan:

- aplikasi resmi PLN;
- pengganti PLN Mobile;
- alat ukur listrik resmi;
- alat audit energi profesional;
- alat diagnosis kerusakan;
- sistem akuntansi;
- property management system;
- sistem IoT wajib;
- platform real-time tanpa sensor;
- aplikasi kontrol peralatan listrik;
- aplikasi yang menjamin penghematan.

WattWise adalah:

> **Sistem diagnosis awal dan pengendalian biaya listrik berbasis data pengguna.**

---

# 2. Latar Belakang Perubahan Produk

Versi awal WattWise berfokus pada:

- pencatatan pemakaian;
- estimasi tagihan;
- tren listrik;
- dampak biaya terhadap pendapatan;
- rekomendasi hemat.

Masalahnya, alur tersebut berhenti setelah pengguna melihat analisis.

Alur lama:

```text
Input
→ Analisis
→ Rekomendasi
→ Selesai
```

Alur tersebut belum menjawab:

- apa yang harus diperiksa lebih dahulu;
- mengapa satu kandidat diprioritaskan;
- apakah pengguna menjalankan tindakan;
- apakah tindakan memberi perubahan;
- apa yang harus dilakukan bulan berikutnya.

Karena itu, WattWise ditingkatkan menjadi sistem yang berorientasi tindakan.

Alur baru:

```text
Input tagihan
→ Deteksi perubahan
→ Kumpulkan konteks
→ Susun kandidat penyebab
→ Pemeriksaan terpandu
→ Rencana Hemat
→ Evaluasi hasil
```

---

# 3. Tujuan Produk

## 3.1 Tujuan Utama

Membantu pengguna bergerak dari:

> “Saya hanya tahu tagihan listrik saya naik.”

menjadi:

> “Saya tahu bagian mana yang perlu diperiksa, alasan pemeriksaannya, tindakan yang dapat dicoba, dan perubahan setelah tindakan.”

## 3.2 Tujuan Bisnis

Produk harus memiliki alasan langganan bulanan melalui siklus:

```text
Catat bulan ini
→ lihat masalah
→ ambil tindakan
→ kembali bulan berikutnya
→ evaluasi hasil
```

## 3.3 Tujuan Kompetisi

Produk harus dapat didemonstrasikan secara end-to-end dan menunjukkan:

- inovasi teknologi;
- penyelesaian masalah nyata;
- dampak sosial dan ekonomi;
- kesiapan pasar;
- model bisnis;
- kelayakan finansial;
- kesiapan tim;
- kesesuaian dengan smart energy management.

---

# 4. Target Pengguna

## 4.1 Segmen Utama

### A. Pemilik kos all-in

Pemilik menanggung listrik kamar atau sebagian besar listrik bangunan.

### B. Pemilik kos dengan area bersama

Pemilik menanggung listrik untuk:

- pompa air;
- koridor;
- CCTV;
- WiFi;
- dapur bersama;
- laundry bersama;
- fasilitas umum.

### C. Pengelola beberapa properti kecil

Membutuhkan pemantauan beberapa lokasi dan prioritas lokasi yang perlu diperiksa.

## 4.2 Segmen Perluasan

Setelah segmen kos stabil:

- laundry;
- frozen food;
- cold storage kecil;
- F&B;
- minimarket;
- toko;
- homestay;
- usaha dengan alat berdaya tinggi.

## 4.3 Segmen Prioritas Rendah

Kos token murni per kamar bukan target awal utama karena biaya listrik kamar dibayar langsung oleh penghuni.

---

# 5. Persona Utama

## 5.1 Persona: Pemilik Kos Nonteknis

Karakteristik:

- tidak memahami istilah teknik kelistrikan;
- sering hanya mengetahui jumlah tagihan;
- tidak mengetahui watt atau jam pakai alat;
- tidak melakukan pencatatan rutin;
- ingin jawaban sederhana;
- ingin tahu penyebab kemungkinan kenaikan;
- tidak ingin memasang perangkat rumit;
- sensitif terhadap biaya;
- lebih nyaman menggunakan bahasa sehari-hari.

Pertanyaan utama persona:

- “Tagihan saya naik karena apa?”
- “Apa yang harus dicek dulu?”
- “Apakah kenaikan ini masih wajar?”
- “Apakah pendapatan saya terlalu banyak habis untuk listrik?”
- “Cara hemat yang paling masuk akal apa?”
- “Apakah tindakan saya ada hasilnya?”

## 5.2 Konsekuensi UX

Produk wajib:

- menerima jawaban “Tidak tahu”;
- tidak mewajibkan data watt;
- tidak mewajibkan daftar alat;
- tidak mewajibkan kWh;
- menggunakan istilah sederhana;
- memberi penjelasan;
- menghindari angka statistik yang tidak perlu;
- membatasi kandidat utama maksimal tiga;
- memberi CTA yang jelas;
- tidak membuat onboarding panjang.

---

# 6. Prinsip Produk

## 6.1 Tagihan-First

Pengguna dapat memulai dengan:

- jenis tempat;
- periode;
- jumlah tagihan saat ini;
- tagihan sebelumnya jika ada;
- konteks sederhana.

Data yang tidak wajib:

- kWh;
- meter;
- watt alat;
- jam pakai;
- sensor;
- data per alat.

## 6.2 Progressive Profiling

Data tambahan diminta hanya ketika relevan.

Contoh:

```text
Tagihan naik
→ tanyakan perubahan penghuni
→ tanyakan alat baru
→ tanyakan apakah pompa lebih sering menyala
```

Jangan menampilkan form besar di awal.

## 6.3 Explainable

Setiap output harus menjelaskan:

- apa yang terdeteksi;
- data apa yang digunakan;
- mengapa kandidat dipilih;
- data apa yang belum tersedia;
- batasan hasil.

## 6.4 Action-Oriented

Setiap analisis harus mengarah ke tindakan nyata.

## 6.5 Safe by Default

Sistem tidak boleh:

- meminta pengguna membuka panel;
- memberi instruksi teknis berbahaya;
- menyatakan alat rusak;
- menyatakan penyebab secara pasti;
- memberi janji penghematan.

## 6.6 Software-First, IoT-Ready

Produk harus berjalan tanpa IoT.

IoT adalah:

- opsi masa depan;
- alat verifikasi;
- add-on;
- bukan syarat trial;
- bukan syarat Pro;
- bukan scope P0.

---

# 7. Nilai Jual Utama

## 7.1 Sebelum

> WattWise membantu menganalisis penggunaan listrik dan dampaknya terhadap pendapatan.

## 7.2 Setelah

> WattWise membantu pengguna memahami kenaikan biaya, mempersempit bagian yang perlu diperiksa, menjalankan tindakan, dan mengevaluasi hasilnya.

## 7.3 Tiga Nilai Utama

### Tahu lebih awal

- perkiraan biaya;
- perubahan tagihan;
- tren.

### Tahu apa yang perlu diperiksa

- kandidat;
- ranking;
- alasan;
- checklist.

### Tahu hasilnya

- sebelum dan sesudah;
- konteks;
- evaluasi.

---

# 8. Batas Scope

## 8.1 P0 — Wajib

P0 harus selesai sebelum target rilis.

1. Authentication yang aman.
2. Flow register.
3. Pilihan Free atau Pro Trial.
4. Onboarding dasar.
5. Business/properti.
6. Input tagihan tanpa kWh wajib.
7. Periode tagihan.
8. Normalisasi panjang periode.
9. Perbandingan biaya.
10. Pemisahan biaya dan pemakaian.
11. Diagnostic session.
12. Questionnaire adaptif untuk segmen kos.
13. Jawaban “Tidak tahu”.
14. Profil alat opsional.
15. Candidate cause generator.
16. Candidate ranking.
17. Maksimal tiga kandidat.
18. Alasan kandidat.
19. Supporting factors.
20. Contradicting factors.
21. Data quality indicator.
22. Guided inspection.
23. Safety wording.
24. Candidate-to-action.
25. Rencana Hemat.
26. Status tindakan.
27. Baseline.
28. Evaluasi periode berikutnya.
29. Hasil sebelum-sesudah.
30. Dashboard berorientasi tindakan.
31. Laporan bulanan.
32. Entitlement.
33. Tenant isolation.
34. Feature flag.
35. Product analytics minimum.
36. Automated tests.
37. Staging.
38. Akun demo.
39. Video demo cadangan.
40. Dokumentasi.

## 8.2 P1 — Setelah P0 Stabil

- template laundry;
- template frozen food;
- Business portfolio;
- CSV import;
- reminder;
- feedback rekomendasi;
- assisted diagnosis;
- sensor data import;
- simulator yang lebih matang.

## 8.3 P2 — Roadmap

- perangkat IoT;
- integrasi vendor;
- real-time ingestion;
- mobile native;
- payment gateway production;
- WhatsApp Business production;
- benchmark lintas bisnis;
- enterprise SSO;
- advanced ML routing production.

## 8.4 Out of Scope Keras

Agent tidak boleh mengerjakan tanpa persetujuan tertulis:

- payroll;
- inventori;
- POS;
- accounting lengkap;
- manajemen penyewa;
- pembayaran sewa;
- chat generik;
- aplikasi mobile native;
- firmware;
- PCB;
- produksi sensor;
- IoT provisioning;
- smart home control;
- remote switching;
- payment production;
- PLN integration tidak resmi;
- diagnosis kerusakan;
- klaim real-time tanpa sensor;
- marketplace teknisi;
- marketplace hardware;
- carbon accounting penuh;
- enterprise dashboard di luar P0;
- peer benchmark tanpa dataset sah;
- fitur viral atau gamification yang tidak terkait nilai inti.

---

# 9. User Journey

## 9.1 Pengguna Baru

```text
Landing
→ Register
→ Pilih Free atau Trial
→ Onboarding
→ Buat profil bisnis
→ Input tagihan terakhir
→ Input tagihan sebelumnya
→ Lihat hasil awal
→ Jawab pertanyaan
→ Lihat kandidat
→ Mulai pemeriksaan
→ Buat Rencana Hemat
→ Dashboard
```

## 9.2 Pengguna Bulanan

```text
Login
→ Input tagihan bulan baru
→ Lihat perubahan
→ Jika perlu, jalankan diagnosis
→ Lihat kandidat
→ Lanjutkan tindakan
→ Evaluasi tindakan sebelumnya
→ Buka laporan
```

## 9.3 Diagnosis

```text
Pilih periode
→ validasi data
→ cek perbedaan periode
→ cek perubahan normal
→ jawab pertanyaan adaptif
→ generate kandidat
→ rank kandidat
→ tampilkan maksimal tiga
→ pilih kandidat
```

## 9.4 Pemeriksaan

```text
Pilih kandidat
→ lihat alasan
→ lihat checklist
→ jawab hasil pemeriksaan
→ tandai ditemukan/tidak ditemukan
→ buat tindakan
```

## 9.5 Evaluasi Hasil

```text
Tindakan diterapkan
→ tunggu periode berikutnya
→ masukkan data
→ sistem bandingkan
→ tampilkan perubahan
→ tampilkan context warning
→ tutup evaluasi
```

---

# 10. Functional Requirements

## 10.1 Authentication dan Journey

### FR-AUTH-001

User dapat register.

### FR-AUTH-002

Setelah register, user harus diarahkan ke pilihan:

- Free;
- Pro Trial 30 hari.

### FR-AUTH-003

User tidak boleh melewati journey:

```text
Register
→ Plan choice
→ Onboarding
→ Product
```

### FR-AUTH-004

Trial:

- hanya satu kali;
- tidak dapat diulang;
- tidak dapat diperpanjang dengan request berulang;
- activation harus atomik;
- trial tidak menyertakan IoT.

### FR-AUTH-005

Route produk harus terlindungi middleware dan authorization.

## 10.2 Business dan Profil Operasional

### FR-BIZ-001

User dapat membuat bisnis/properti.

### FR-BIZ-002

Business minimal menyimpan:

- nama;
- tipe;
- lokasi sederhana;
- segmen;
- sistem listrik;
- jumlah kamar/unit;
- status aktif.

### FR-BIZ-003

Untuk kos, sistem listrik harus mendukung:

- ALL_IN;
- TOKEN_PER_KAMAR;
- SUB_METER;
- PATUNGAN;
- CAMPURAN.

### FR-BIZ-004

Profil operasional opsional:

- okupansi;
- jumlah penghuni;
- hari operasional;
- jam operasional;
- kejadian khusus.

## 10.3 Input Tagihan

### FR-BILL-001

User dapat memasukkan tagihan tanpa kWh.

### FR-BILL-002

Field minimum:

- business;
- period start;
- period end;
- amount;
- source.

### FR-BILL-003

Field opsional:

- kWh;
- meter awal;
- meter akhir;
- tariff;
- note.

### FR-BILL-004

Sistem harus menghitung:

- jumlah hari;
- biaya per hari;
- kWh per hari jika tersedia;
- perubahan nominal;
- perubahan persentase;
- normalized change.

### FR-BILL-005

Jika periode berbeda, UI wajib menjelaskan bahwa tagihan nominal tidak langsung sebanding.

### FR-BILL-006

Jika hanya ada biaya, sistem tidak boleh menggunakan kata “konsumsi naik”.

### FR-BILL-007

Jika kWh tersedia, sistem boleh menggunakan “pemakaian kWh”.

### FR-BILL-008

Sumber data harus dibedakan:

- MANUAL_BILL;
- MANUAL_METER;
- IMPORT;
- SENSOR.

## 10.4 Profil Alat

### FR-APP-001

Daftar alat opsional.

### FR-APP-002

User dapat memilih kategori alat.

### FR-APP-003

User tidak wajib mengisi watt.

### FR-APP-004

User tidak wajib mengisi jam pakai.

### FR-APP-005

Detail opsional:

- category;
- name;
- quantity;
- size class;
- power watt;
- estimated frequency;
- estimated hours;
- data source;
- confidence.

### FR-APP-006

Sistem harus menerima “Tidak tahu”.

### FR-APP-007

Template default tidak boleh dianggap data aktual.

## 10.5 Diagnostic Session

### FR-DIAG-001

Diagnosis dibuat untuk satu business dan satu period.

### FR-DIAG-002

Status minimal:

- DRAFT;
- COLLECTING_CONTEXT;
- ANALYZED;
- INSPECTION_IN_PROGRESS;
- CLOSED.

### FR-DIAG-003

Sistem memeriksa:

- panjang periode;
- perubahan tarif;
- perubahan daya;
- ketersediaan kWh;
- kesalahan input;
- perubahan okupansi;
- perubahan jam operasi;
- alat baru;
- kegiatan khusus.

### FR-DIAG-004

Sebelum kandidat alat, sistem harus memeriksa faktor administratif.

### FR-DIAG-005

Diagnosis harus idempotent.

### FR-DIAG-006

Rule version wajib disimpan.

## 10.6 Questionnaire Adaptif

### FR-Q-001

Pertanyaan berdasarkan:

- segmen;
- data;
- jawaban;
- kandidat.

### FR-Q-002

Jawaban:

- Ya;
- Tidak;
- Tidak tahu;
- Tidak relevan.

### FR-Q-003

Pertanyaan tidak boleh hardcoded tersebar di banyak file.

### FR-Q-004

Question code dan version harus disimpan.

### FR-Q-005

Pertanyaan tidak boleh menuntut pengetahuan teknis.

### FR-Q-006

Contoh pertanyaan kos:

- jumlah penghuni bertambah?
- ada alat baru?
- pompa lebih sering menyala?
- ada kebocoran?
- AC lebih lama?
- tanggal pencatatan berbeda?
- ada kegiatan khusus?

## 10.7 Candidate Cause Generator

### FR-CAND-001

Candidate dapat berupa:

- APPLIANCE;
- OPERATIONAL;
- ADMINISTRATIVE;
- WATER_SYSTEM;
- OCCUPANCY;
- DATA_QUALITY;
- OTHER.

### FR-CAND-002

Kandidat tidak boleh hanya alat.

### FR-CAND-003

Generator mempertimbangkan:

- segmen;
- jawaban;
- histori;
- alat;
- perubahan;
- data quality.

### FR-CAND-004

Kandidat wajib menyimpan supporting factors.

### FR-CAND-005

Kandidat dapat menyimpan contradicting factors.

## 10.8 Candidate Ranking

### FR-RANK-001

Ranking deterministik.

### FR-RANK-002

Maksimal tiga kandidat utama.

### FR-RANK-003

Komponen internal:

- change signal;
- load potential;
- context fit;
- unexplained gap fit;
- evidence quality;
- inspection priority.

### FR-RANK-004

Skor tidak boleh ditampilkan sebagai probabilitas.

Jangan:

> 83,7% pompa menjadi penyebab.

Gunakan:

- Prioritas Tinggi;
- Prioritas Sedang;
- Prioritas Rendah.

### FR-RANK-005

Setiap kandidat wajib memiliki explanation.

### FR-RANK-006

Kandidat dengan kontradiksi besar tidak boleh otomatis ranking pertama.

### FR-RANK-007

Ranking alat tidak boleh hanya berdasarkan watt.

## 10.9 Data Quality

### FR-DQ-001

Sistem harus menilai kualitas data.

Komponen:

- histori;
- kelengkapan biaya;
- kWh;
- periode;
- okupansi;
- alat;
- jawaban;
- continuity.

### FR-DQ-002

Bahasa pengguna:

- Data Lengkap;
- Sebagian Data Belum Lengkap;
- Hasil Masih Perkiraan Awal.

### FR-DQ-003

Kualitas data memengaruhi wording dan evidence.

## 10.10 Guided Inspection

### FR-INSP-001

User dapat memulai pemeriksaan kandidat.

### FR-INSP-002

Setiap checklist memiliki safety level.

### FR-INSP-003

Instruksi hanya observasi aman.

### FR-INSP-004

Tidak boleh menginstruksikan:

- membuka panel;
- melepas kabel;
- memegang instalasi;
- mengukur tegangan tanpa kompetensi;
- memperbaiki perangkat.

### FR-INSP-005

Hasil:

- Ditemukan Masalah;
- Tidak Ditemukan;
- Tidak Tahu;
- Butuh Bantuan.

### FR-INSP-006

Checklist harus sesuai kandidat.

## 10.11 Rencana Hemat

### FR-ACTION-001

Kandidat dapat diubah menjadi action plan.

### FR-ACTION-002

Action plan menyimpan:

- business;
- candidate;
- inspection;
- title;
- reason;
- baseline;
- target;
- start date;
- evaluation period;
- status;
- note.

### FR-ACTION-003

Status:

- NOT_STARTED;
- IN_PROGRESS;
- APPLIED;
- WAITING_EVALUATION;
- EVALUATED;
- CANCELLED.

### FR-ACTION-004

Transisi status harus divalidasi server-side.

### FR-ACTION-005

Baseline tidak boleh berubah setelah evaluasi selesai.

### FR-ACTION-006

Expected saving harus berbentuk range dan estimasi.

## 10.12 Outcome Evaluation

### FR-OUT-001

Outcome membandingkan baseline dan evaluation period.

### FR-OUT-002

Perbandingan:

- total biaya;
- biaya per hari;
- kWh jika ada;
- okupansi;
- hari operasi;
- event khusus.

### FR-OUT-003

Output tidak boleh menyatakan kausalitas pasti.

### FR-OUT-004

Contoh aman:

> “Setelah tindakan diterapkan, biaya harian tercatat turun sekitar 8%.”

### FR-OUT-005

Tambahkan context warning.

### FR-OUT-006

Evidence level wajib disimpan.

## 10.13 Dashboard

### FR-DASH-001

Dashboard berorientasi tindakan.

### FR-DASH-002

Bagian atas:

- perkiraan tagihan;
- tagihan terakhir;
- perubahan;
- persentase pendapatan;
- data quality.

### FR-DASH-003

Bagian “Apa yang perlu dicek?”

### FR-DASH-004

Maksimal tiga candidate cards.

### FR-DASH-005

Bagian action plan aktif.

### FR-DASH-006

Bagian hasil tindakan terakhir.

### FR-DASH-007

Jangan menampilkan terlalu banyak jargon.

## 10.14 Laporan

### FR-REP-001

Nama pengguna:

**Ringkasan Pengendalian Biaya Listrik**

### FR-REP-002

Isi:

- period;
- tagihan;
- normalized comparison;
- pendapatan;
- status;
- data quality;
- candidate;
- action;
- outcome;
- disclaimer.

### FR-REP-003

PDF hanya untuk entitlement yang sesuai.

### FR-REP-004

PDF tidak memiliki iklan.

### FR-REP-005

Laporan tidak boleh disebut audit resmi.

## 10.15 Paket

### Free

- 1 bisnis;
- input dasar;
- diagnosis preview;
- kandidat terbatas;
- ads aman;
- tanpa PDF penuh.

### Pro Trial

- 30 hari;
- full Pro software;
- tanpa ads;
- tanpa IoT.

### Pro

- 1–3 lokasi;
- diagnosis;
- action plan;
- outcome;
- PDF;
- histori.

### Business

- multi-location;
- portfolio;
- report gabungan;
- plan per lokasi.

### FR-PLAN-001

Harga dan limit configurable.

### FR-PLAN-002

Tidak boleh hardcode di banyak component.

### FR-PLAN-003

Server-side entitlement wajib.

### FR-PLAN-004

Trial tidak otomatis mendapat hardware.

---

# 11. AI dan Machine Learning

## 11.1 Prinsip

AI adalah decision support, bukan branding kosong.

## 11.2 Fallback

### Histori 0–2 bulan

- rule-based;
- profil;
- asumsi konservatif.

### Histori 3–5 bulan

- moving average;
- trend.

### Histori 6–12 bulan

- model tervalidasi jika memenuhi gate.

### Lebih dari 12 bulan

- adaptive routing hanya jika valid.

## 11.3 Aturan Keras

Agent tidak boleh:

- mengaktifkan LSTM karena “lebih canggih”;
- mengaktifkan model tanpa benchmark;
- mengklaim akurasi;
- menggunakan dataset lisensi tidak jelas;
- menyimpan model tanpa version;
- mengganti baseline tanpa evaluasi;
- menyebut “AI belajar” jika tidak ada learning loop aktif.

## 11.4 Evaluasi

Model advanced harus dibandingkan dengan baseline:

- MAE;
- RMSE;
- MAPE jika aman;
- coverage;
- failure rate;
- segment;
- history depth.

Model yang kalah dari baseline tidak boleh menjadi production output.

---

# 12. Data Model Usulan

Nama final harus menyesuaikan audit repository.

## 12.1 diagnostic_sessions

- id
- business_id
- period
- electricity_entry_id
- baseline_type
- baseline_value
- current_value
- normalized_change
- unexplained_change
- data_quality_level
- status
- rule_version
- started_at
- completed_at
- timestamps

## 12.2 diagnostic_answers

- id
- diagnostic_session_id
- question_code
- question_version
- answer_code
- answer_value
- source
- answered_at
- timestamps

## 12.3 diagnostic_candidates

- id
- diagnostic_session_id
- candidate_code
- candidate_type
- title
- priority_level
- internal_score
- evidence_level
- explanation
- supporting_factors_json
- contradicting_factors_json
- status
- rank
- timestamps

## 12.4 inspection_plans

- id
- business_id
- diagnostic_candidate_id
- title
- status
- result_code
- user_note
- started_at
- completed_at
- timestamps

## 12.5 inspection_items

- id
- inspection_plan_id
- item_code
- instruction
- safety_level
- status
- answer
- note
- completed_at
- timestamps

## 12.6 energy_action_plans

- id
- business_id
- diagnostic_candidate_id
- inspection_plan_id
- title
- reason
- expected_savings_min
- expected_savings_max
- baseline_period
- target_period
- status
- started_at
- evaluation_at
- completed_at
- user_note
- timestamps

## 12.7 action_outcomes

- id
- action_plan_id
- baseline_period
- evaluation_period
- baseline_cost
- evaluation_cost
- baseline_daily_cost
- evaluation_daily_cost
- baseline_kwh
- evaluation_kwh
- occupancy_delta
- operating_days_delta
- interpretation
- context_warning
- evidence_level
- evaluated_at
- timestamps

## 12.8 appliance_profiles

- id
- business_id
- category
- name
- quantity
- size_class
- power_watt
- estimated_usage_frequency
- estimated_usage_hours
- data_source
- confidence
- active
- timestamps

---

# 13. Arsitektur

## 13.1 Controller

Controller tipis.

Tidak boleh berisi:

- formula bisnis;
- ranking;
- entitlement logic;
- tenant authorization manual berulang;
- report assembly besar.

## 13.2 Service Layer

Service yang disarankan:

- BillingPeriodNormalizer;
- ElectricityChangeAssessmentService;
- DiagnosticQuestionResolver;
- CandidateCauseGenerator;
- CandidateCauseRankingService;
- InspectionPlanService;
- EnergyActionPlanService;
- ActionOutcomeEvaluationService;
- DiagnosticReportAssembler;
- PlanEntitlementService.

## 13.3 Authorization

Gunakan policy atau authorization layer.

## 13.4 Tenant Isolation

Semua entitas harus terhubung ke business/user.

## 13.5 Feature Flag

Fitur baru default aman.

Usulan:

- DIAGNOSTICS_ENABLED;
- ACTION_PLANS_ENABLED;
- OUTCOME_TRACKING_ENABLED;
- SEGMENT_TEMPLATES_ENABLED;
- BUSINESS_PORTFOLIO_ENABLED;
- SENSOR_IMPORT_ENABLED.

## 13.6 Migration

Migration:

- reversible;
- nullable-first jika perlu;
- tidak menghapus data lama;
- tidak melakukan backfill berisiko saat deploy;
- memiliki rollback plan.

---

# 14. UI dan Copy

## 14.1 Terminologi

Gunakan:

| Teknis | Pengguna |
|---|---|
| Anomaly | Pemakaian Tidak Biasa |
| Prediction | Perkiraan Biaya |
| Candidate Cause | Bagian yang Perlu Dicek |
| Diagnostic Session | Cek Kenaikan |
| Action Plan | Rencana Hemat |
| Outcome | Hasil Tindakan |
| Data Quality | Kelengkapan Data |
| Revenue Ratio | Pendapatan untuk Listrik |

## 14.2 CTA

Gunakan:

- Cek Penyebab Kenaikan;
- Mulai Pemeriksaan;
- Tambahkan ke Rencana Hemat;
- Tandai Sudah Diterapkan;
- Lihat Hasil;
- Lengkapi Data.

## 14.3 Dilarang

- jargon AI berlebihan;
- probabilitas palsu;
- visual real-time tanpa data;
- angka hemat tanpa penjelasan;
- indikator hijau/merah tanpa teks;
- modal besar yang tidak dapat ditutup;
- menu yang tidak berfungsi.

---

# 15. Safe Wording

Wajib digunakan sesuai konteks.

## Estimasi

> “Estimasi ini berdasarkan data yang Anda input dan bukan tagihan resmi PLN.”

## Posisi

> “WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.”

## Pendapatan

> “Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.”

## Alat

> “Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.”

## Diagnosis

> “Ini adalah indikasi awal berbasis data input, bukan diagnosis teknis atau bukti kerusakan alat.”

## Outcome

> “Perubahan biaya dapat dipengaruhi oleh okupansi, jam operasional, tarif, cuaca, penggunaan alat, dan kondisi lainnya.”

---

# 16. Security dan Privacy

## 16.1 Data Sensitif

- pendapatan;
- alamat;
- tagihan;
- catatan;
- user identity.

## 16.2 Aturan

Agent wajib:

- mencegah cross-tenant access;
- menghindari sensitive logging;
- menggunakan server-side validation;
- mencegah mass assignment;
- menjaga CSRF;
- menjaga auth;
- menggunakan encrypted secret;
- tidak commit credential;
- tidak memakai data user asli untuk demo.

## 16.3 Demo

Gunakan akun dan data sintetis.

---

# 17. Product Analytics

Event minimum:

- registration_completed;
- plan_selected;
- trial_activated;
- onboarding_completed;
- business_created;
- first_bill_created;
- diagnosis_started;
- diagnosis_completed;
- candidate_viewed;
- inspection_started;
- action_plan_created;
- action_marked_applied;
- outcome_evaluated;
- report_viewed;
- pdf_exported;
- trial_converted;
- subscription_cancelled.

Analytics tidak boleh menyimpan:

- nominal pendapatan;
- nominal tagihan;
- alamat;
- catatan;
- isi jawaban sensitif.

---

# 18. Success Metrics

## Validasi Produk

- onboarding completion ≥ 60%;
- first input ≥ 60%;
- minimal 50% pilot kembali bulan kedua;
- trial-to-paid ≥ 10%;
- minimal 3 pre-order/pembayaran;
- minimal 5 dari 10 pilot aktif bulan kedua;
- action plan creation;
- outcome completion.

## Indikator Risiko

- user berhenti saat onboarding;
- user tidak kembali;
- user tidak membuat tindakan;
- diagnosis selalu berakhir “tidak tahu”;
- kandidat terlalu generik;
- support terlalu berat;
- pricing tidak diterima.

---

# 19. Acceptance Criteria P0

P0 dianggap selesai hanya jika:

1. User dapat mulai dengan tagihan.
2. kWh tidak wajib.
3. daftar alat tidak wajib.
4. “Tidak tahu” tersedia.
5. biaya dan pemakaian dibedakan.
6. periode dinormalisasi.
7. perubahan yang belum terjelaskan dapat ditentukan.
8. kandidat maksimal tiga.
9. kandidat tidak hanya alat.
10. explanation tersedia.
11. tidak ada kepastian palsu.
12. guided inspection aman.
13. candidate dapat menjadi action.
14. baseline tersimpan.
15. outcome dapat dievaluasi.
16. wording non-kausal.
17. dashboard action-oriented.
18. plan gating server-side.
19. tenant isolation lulus.
20. tests lulus.
21. staging stabil.
22. demo end-to-end.
23. tidak ada data pelanggan asli.
24. dokumentasi lengkap.
25. rollback tersedia.

---

# 20. Agentic AI Guardrails

Bagian ini bersifat **mandatory**.

## 20.1 Sebelum Coding

Agent wajib:

1. membaca PRD;
2. membaca repository structure;
3. membaca migration;
4. membaca route;
5. membaca test;
6. membaca service aktif;
7. membuat gap analysis;
8. mengidentifikasi reuse;
9. mengidentifikasi risiko;
10. mengembalikan proposal sebelum perubahan besar.

Agent dilarang langsung membuat implementasi besar dari satu prompt.

## 20.2 Bounded Scope

Setiap task harus memiliki:

- objective;
- in-scope;
- out-of-scope;
- acceptance criteria;
- files affected;
- migration impact;
- tests;
- rollback.

## 20.3 Larangan Rewrite

Agent tidak boleh:

- mengganti framework;
- memindahkan ke Next.js;
- memindahkan ke microservice;
- membuat mobile app;
- mengganti auth;
- mengganti billing;
- mengganti database;
- membuat arsitektur baru tanpa kebutuhan;
- menghapus kode aktif untuk “merapikan”.

## 20.4 Larangan Scope Creep

Agent tidak boleh menambah:

- chatbot;
- IoT;
- OCR luas;
- payment;
- WhatsApp;
- marketplace;
- akuntansi;
- inventory;
- payroll;
- tenant management;
- gamification;
- social feed;
- blockchain;
- RAG;
- vector database;
- new AI model;
- external integration;

kecuali secara tertulis disetujui Product Owner.

## 20.5 Larangan Klaim

Agent tidak boleh menulis copy:

- “pasti hemat”;
- “akurat 100%”;
- “mendeteksi kerusakan”;
- “real-time” tanpa sensor;
- “resmi PLN”;
- “terintegrasi PLN”;
- “AI belajar otomatis”;
- “audit energi”.

## 20.6 Data dan Model

Agent tidak boleh:

- mengunduh dataset lisensi tidak jelas;
- memasukkan data customer;
- menggunakan data sintetis sebagai bukti pasar;
- mengaktifkan model advanced;
- mengubah model routing;
- menghapus fallback;
- menyimpan model tanpa checksum/version.

## 20.7 Dependency

Agent tidak boleh menambah dependency sebelum:

- menjelaskan kebutuhan;
- menjelaskan ukuran;
- menjelaskan lisensi;
- menjelaskan maintenance;
- mendapat approval.

## 20.8 Production

Agent tidak boleh:

- deploy production;
- mengubah variable production;
- mengubah domain;
- melakukan migration production;
- mengaktifkan payment;
- mengaktifkan sensor;
- menghapus database;
- mengubah Railway production;
- membuat credential;
- menampilkan secret.

## 20.9 Git

Agent wajib:

- branch terpisah;
- commit terarah;
- PR bounded;
- tidak force push;
- tidak rewrite history;
- tidak merge otomatis;
- tidak menghapus tag;
- tidak mengubah main langsung.

## 20.10 UI

Agent tidak boleh:

- redesign total;
- mengubah branding;
- menambah menu kosong;
- membuat dark pattern;
- menyembunyikan disclaimer;
- membuat dashboard terlalu teknis;
- menggunakan placeholder palsu.

## 20.11 Tests

Agent tidak boleh:

- menghapus test gagal;
- skip test untuk lulus;
- menurunkan assertion;
- mengubah test agar sesuai bug;
- mengklaim pass tanpa menjalankan;
- hanya menjalankan focused test jika perubahan berdampak luas.

## 20.12 Hard Stop Conditions

Agent wajib berhenti dan meminta keputusan jika:

1. PRD bertentangan dengan repository.
2. migration berisiko kehilangan data.
3. perubahan membutuhkan production secret.
4. lisensi dataset tidak jelas.
5. fitur melewati deadline.
6. test baseline gagal.
7. perubahan paket/harga dibutuhkan.
8. klaim bisnis perlu diubah.
9. model advanced ingin diaktifkan.
10. scope P0 terancam.

---

# 21. Agent Execution Protocol

## Phase A — Analyze

Output wajib:

- current state;
- gap;
- reuse;
- risk;
- files;
- schema impact;
- test plan;
- estimated effort.

## Phase B — Propose

Agent mengusulkan:

- solusi minimum;
- alternatif;
- trade-off;
- PR plan.

## Phase C — Implement

Implementasi hanya pada scope.

## Phase D — Verify

Wajib:

- tests;
- static analysis;
- lint;
- typecheck;
- build;
- migration up/down;
- security;
- tenant;
- responsive;
- safe wording.

## Phase E — Report

Laporan wajib:

- summary;
- changed files;
- created files;
- migration;
- tests;
- risk;
- screenshots;
- rollback;
- remaining scope.

---

# 22. Definition of Done

Fitur selesai ketika:

- memenuhi acceptance criteria;
- server-side validation;
- authorization;
- tenant isolation;
- tests;
- typecheck;
- lint;
- build;
- migration rollback;
- responsive;
- accessible;
- safe wording;
- docs;
- staging;
- no secret;
- no scope creep;
- approved by Product Owner.

---

# 23. Pull Request Plan

## IT-DIAG-00

Repository audit dan ADR.

## IT-DIAG-01

Bill-first dan normalisasi periode.

## IT-DIAG-02

Diagnostic session dan questionnaire.

## IT-DIAG-03

Candidate generation dan ranking.

## IT-DIAG-04

Guided inspection.

## IT-DIAG-05

Action plan.

## IT-DIAG-06

Outcome evaluation.

## IT-DIAG-07

Dashboard dan report.

## IT-DIAG-08

Entitlement dan analytics.

## IT-DIAG-09

Release hardening.

Satu PR tidak boleh mencakup seluruh roadmap.

---

# 24. Change Control

Perubahan PRD harus berisi:

- requested change;
- reason;
- business impact;
- technical impact;
- deadline impact;
- financial impact;
- risks;
- approval.

Approval minimum:

- Product scope: Hanif.
- Copy/market: Tata.
- Pricing/financial: Stellung.
- Technical architecture: Hanif.
- High-risk change: seluruh tim.

---

# 25. Final Product Statement

WattWise tidak dibangun sebagai aplikasi yang hanya mengatakan:

> “Tagihan Anda naik.”

WattWise dibangun agar dapat mengatakan:

> “Tagihan Anda naik. Berdasarkan data yang tersedia, ada beberapa bagian yang layak diperiksa. Berikut alasannya, langkah pemeriksaannya, tindakan yang dapat dicoba, dan cara melihat hasilnya pada bulan berikutnya.”

---

# 26. Instruksi Awal untuk Agent Baru

Gunakan prompt berikut ketika agent pertama kali bekerja:

```text
Baca PRD ini sampai selesai.

Jangan menulis kode terlebih dahulu.

Lakukan audit repository dan kembalikan:
1. current implementation;
2. reusable components;
3. gap terhadap PRD;
4. conflict;
5. architecture proposal;
6. migration proposal;
7. security impact;
8. PR breakdown;
9. testing plan;
10. feasibility terhadap deadline.

Jangan menambah fitur di luar P0.
Jangan rewrite.
Jangan deploy.
Jangan merge.
Jangan mengaktifkan model advanced.
Jangan mengubah harga.
Jangan membuat klaim produk baru.
```

---

# 27. Checklist Review Product Owner

Sebelum menyetujui task:

- Apakah fitur masuk P0?
- Apakah memperkuat nilai diagnosis/tindakan/outcome?
- Apakah bisa dijelaskan?
- Apakah aman?
- Apakah pengguna nonteknis memahami?
- Apakah data minimum tetap ringan?
- Apakah mengganggu deadline?
- Apakah test jelas?
- Apakah rollback jelas?
- Apakah ada klaim berlebihan?
- Apakah agent menambah scope?
- Apakah fitur dapat didemo?

Jika jawaban penting “tidak”, task tidak boleh dilanjutkan.
