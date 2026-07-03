# WattWise AI — MVP Guidebook

Versi: MVP Tahap 2 Planning — Revised AI Guardrail Edition  
Bahasa UI: Bahasa Indonesia  
Target: Prototype/demo startup competition untuk UMKM Indonesia  
Status: MVP Tahap 1 selesai, lanjut MVP Tahap 2

---

## 0. Cara Menggunakan Guidebook Ini

Guidebook ini adalah **patokan utama untuk AI coding agent** saat mengembangkan WattWise AI.

Setiap AI agent yang membantu project ini wajib:

1. Membaca guidebook ini sebelum mengubah kode.
2. Mengikuti stack, arsitektur, routing, database, dan product rules yang tertulis di sini.
3. Tidak mengganti keputusan teknis utama tanpa instruksi eksplisit.
4. Tidak rewrite project dari nol.
5. Tidak menambahkan fitur di luar scope MVP 2 kecuali diminta.
6. Menjaga semua UI copy tetap dalam Bahasa Indonesia.
7. Menjaga klaim produk tetap aman: estimasi, bukan tagihan resmi PLN.

Jika ada konflik antara prompt singkat dan guidebook ini, **guidebook ini menjadi sumber kebenaran utama**.

---

## 1. Identitas Produk

**Nama produk:** WattWise AI  
**Tagline:** Listrik Lebih Cerdas, Biaya Lebih Terkendali

**Target awal:** UMKM Indonesia, khususnya area Purwokerto.

**Target pengguna:**

- Pemilik UMKM non-teknis
- Laundry
- Frozen food
- Minimarket
- F&B / warung / cafe
- Fotokopi
- Barbershop
- Bengkel
- Kos / penginapan
- Manufaktur kecil

**Masalah utama yang diselesaikan:**  
UMKM sering tidak tahu kenapa tagihan listrik naik, alat mana yang boros, dan langkah hemat apa yang paling realistis dilakukan.

**Value proposition:**  
WattWise AI membantu UMKM memantau konsumsi listrik manual, memprediksi tagihan, mendeteksi anomali, memberi rekomendasi hemat listrik, dan membuat laporan bulanan yang mudah dipahami.

---

## 2. Prinsip Produk

WattWise AI untuk MVP 1 dan MVP 2 harus tetap:

### 2.1 Sederhana

- User UMKM non-teknis harus bisa paham.
- UI tidak boleh terlalu teknis.
- Penjelasan harus praktis, bukan akademis.

### 2.2 Realistis

- Belum memakai IoT real.
- Belum memakai PLN API real.
- Belum memakai AMI/smart meter real.
- Belum memakai payment gateway.
- Belum memakai WhatsApp API real.
- Belum memakai external AI API.
- Input listrik masih manual.
- Analisis AI masih rule-based/deterministic.

### 2.3 Meyakinkan untuk Demo

- Data terlihat realistis.
- Flow stabil.
- UI Bahasa Indonesia.
- Ada loading, empty, dan error state.
- Demo account harus bisa login.
- Tidak boleh ada halaman demo utama yang 404.

### 2.4 Aman Secara Klaim

- Jangan klaim terhubung resmi ke PLN.
- Jangan klaim membaca smart meter real-time.
- Jangan klaim prediksi 100% akurat.
- Prediksi dan laporan harus menyebut bahwa hasil adalah estimasi, bukan tagihan resmi PLN.

### 2.5 Tidak Rewrite dari Nol

- Lanjutkan project yang ada.
- Preserve UI yang sudah bagus.
- Tambah fitur secara bertahap.
- Jangan ubah file yang tidak relevan dengan task.

---

## 3. AI Wording Rule

Untuk MVP 2, kata **AI** pada WattWise AI berarti:

```txt
Analisis cerdas berbasis aturan, data input manual, pola konsumsi, dan rekomendasi otomatis.
```

Gunakan wording seperti:

```txt
Analisis cerdas berbasis data input Anda.
Estimasi berdasarkan pola pemakaian.
Rekomendasi otomatis berbasis aturan hemat energi.
Prediksi tagihan berdasarkan data yang Anda masukkan.
```

Hindari wording seperti:

```txt
Terhubung langsung ke PLN.
Membaca smart meter real-time.
AI machine learning akurat 100%.
Tagihan resmi PLN.
Data resmi dari PLN.
```

---

## 4. Stack, Arsitektur, dan Performance Direction

Bagian ini adalah **sumber kebenaran teknologi** untuk WattWise AI saat ini. Tabel stack lama yang menyebut FastAPI, Python notebook, scikit-learn, ESP32, MQTT, MySQL, Firebase, atau mobile app native **tidak lagi menjadi stack MVP saat ini**. Teknologi tersebut hanya boleh muncul sebagai rencana masa depan jika benar-benar relevan.

### 4.1 Stack Saat Ini Berdasarkan Repo

| Komponen | Stack WattWise AI Saat Ini | Status |
|---|---|---|
| Frontend | Next.js 14 App Router + React 18 + TypeScript | Aktif |
| Styling/UI | Tailwind CSS + custom WattWise design system + Lucide React | Aktif |
| Chart/Dashboard | Recharts | Aktif |
| Backend | Next.js Server Actions + API Routes | Aktif |
| Service Layer | TypeScript services/lib di dalam Next.js | Aktif |
| Database | Supabase PostgreSQL Cloud | Aktif |
| ORM | Prisma Client + Prisma Migrate | Aktif |
| Auth | NextAuth.js v4 Credentials Provider + bcryptjs | Aktif |
| Form/Validation | React Hook Form + Zod | Aktif |
| PDF Report | PDFKit server-side | Aktif |
| AI/Analysis | Rule-based analysis engine di Next.js service/lib | Aktif |
| Deployment | Vercel + Supabase | Aktif |
| IoT | Belum ada, hanya roadmap | Belum diimplementasi |
| PLN/AMI Integration | Belum ada, hanya disclaimer estimasi | Belum diimplementasi |
| External AI/ML API | Belum ada | Belum diimplementasi |

### 4.2 Stack yang Tidak Dipakai di MVP Saat Ini

Jangan tulis atau implementasikan stack berikut sebagai teknologi aktif MVP 2:

- FastAPI
- Express backend terpisah, kecuali diminta eksplisit
- Python notebook sebagai backend utama
- scikit-learn / ML pipeline produksi
- MySQL
- Firebase
- SQLAlchemy
- supabase-js untuk core database access
- ESP32
- PZEM
- MQTT
- WhatsApp/email webhook real
- API gateway
- Microservice architecture
- Flutter/React Native
- Kubernetes
- BI embedded

Semua item tersebut boleh masuk bagian **Future MVP 3 / Pilot Ideas**, bukan MVP 2.

### 4.3 Arsitektur Saat Ini

```txt
User
→ Browser / Client UI
→ Next.js App Router
→ Server Actions / API Routes
→ Service Layer
→ Prisma Client
→ Supabase PostgreSQL Cloud
```

### 4.4 Arsitektur yang Harus Dipertahankan untuk MVP 2

```txt
Frontend tetap Next.js + React + Tailwind
Backend tetap Next.js Server Actions/API Routes
Database tetap Supabase PostgreSQL
ORM tetap Prisma
AI tetap rule-based analysis engine
Deployment tetap Vercel + Supabase
```

Jangan rewrite menjadi backend terpisah sebelum ada alasan kuat. Untuk MVP 2, masalah utama bukan stack, tetapi **performance flow**.

### 4.5 Client Performance Evaluation

Feedback client saat ini:

```txt
Frontend terasa bagus, modern, dan tidak perlu diganti.
Database sejauh ini terasa lancar.
Backend/response server terasa lambat dan berisiko mengganggu demo/testing.
```

Interpretasi teknis:

- FE bukan masalah utama.
- DB belum menjadi tersangka utama.
- Backend flow perlu dioptimasi agar demo terasa cepat.
- Jangan ganti stack total hanya karena loading terasa lambat.
- Perbaiki cara data dihitung, di-cache, dan ditampilkan.

### 4.6 Backend Performance Direction

Backend tidak perlu diganti total. Yang harus diubah adalah pola kerja dari:

```txt
Hitung semuanya saat user membuka halaman
```

menjadi:

```txt
Hitung saat data berubah atau saat user klik generate
Simpan hasil ke database
Halaman hanya membaca data siap tampil
```

Contoh flow yang benar:

```txt
User input data listrik
→ Server simpan ElectricityEntry
→ Server jalankan analysis sekali
→ Simpan AnalysisResult, Anomaly, Recommendation, MonthlyReport summary
→ Dashboard membaca hasil yang sudah tersimpan
```

### 4.7 Performance Rules for MVP 2

AI agent wajib mengikuti aturan performance berikut:

1. Jangan menjalankan analysis berat setiap page load.
2. Analysis dijalankan setelah input data listrik atau tombol eksplisit seperti `Generate Analysis`.
3. Simpan hasil analysis ke database.
4. Dashboard membaca precomputed data, bukan menghitung ulang semuanya.
5. Gunakan query Prisma seminimal mungkin per page.
6. Hindari N+1 queries.
7. Gunakan `include`/`select` secara sengaja, jangan mengambil semua field jika tidak perlu.
8. PDF hanya digenerate saat user klik download, bukan saat halaman laporan dibuka.
9. Business switcher hanya update active business cookie dan reload scoped data.
10. Jangan generate ulang semua analysis saat user switch business.
11. Tambahkan skeleton/loading state agar perceived speed lebih baik.
12. Tidak boleh ada layar putih lama saat demo.
13. Semua form submit harus punya loading state yang jelas.
14. Jika proses butuh waktu, tampilkan pesan Bahasa Indonesia yang ramah.
15. Prioritaskan perceived response time untuk demo.

### 4.8 Target UX Performance untuk Demo

Target rasa penggunaan:

| Flow | Target Rasa |
|---|---|
| Buka landing page | Cepat, tanpa delay mencolok |
| Login demo | Tidak terasa macet |
| Buka dashboard | Data utama muncul cepat dengan skeleton jika perlu |
| Switch business | Cepat, tidak generate ulang analysis berat |
| Input data listrik | Responsif, ada loading jelas |
| Generate analysis | Boleh loading, tapi harus informatif |
| Buka laporan | Preview cepat karena data sudah tersimpan |
| Download PDF | Loading hanya saat klik download |

### 4.9 Backend Optimization Priority

Urutan optimasi yang harus diprioritaskan:

1. Precompute analysis setelah input data.
2. Dashboard query dibuat ringkas.
3. Business switcher tidak menjalankan proses berat.
4. Report preview membaca data tersimpan.
5. PDF generation lazy/on-demand.
6. Auth/login dibuat stabil dan tidak terlalu banyak query tambahan.
7. Tambahkan index database jika query mulai lambat.
8. Pastikan region deployment Vercel dan Supabase tidak terlalu jauh jika performa production lambat.

### 4.10 Larangan Stack

Jangan pindah ke:

- MySQL
- supabase-js langsung untuk core data
- localStorage/mock data untuk fitur utama
- external AI API untuk MVP 2
- IoT real
- PLN API real
- payment gateway
- WhatsApp API real
- mobile app native
- backend terpisah hanya karena panik performance

Jika performance lambat, lakukan profiling dan optimasi flow terlebih dahulu.

### 4.11 Anti Scope Creep Rule

Jika fitur bisa disimulasikan aman untuk MVP 2, simulasikan dulu.

Contoh:

- Notification: in-app only, bukan WhatsApp/email real.
- AI: rule-based explanation, bukan external LLM API.
- IoT: roadmap/demo narrative, bukan hardware integration.
- Payment/subscription: UI/mock status, bukan payment gateway.
- Admin: demo control sederhana, bukan enterprise admin kompleks.
- Performance: optimasi query/precompute dulu, bukan pindah stack total.

---

## 5. Prisma dan Database Rules

### 5.1 Prisma Datasource Wajib

`prisma/schema.prisma` wajib tetap memiliki `directUrl`.

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Jangan hapus `directUrl`.**

Alasan:

- `DATABASE_URL` memakai Supabase transaction pooler.
- `DIRECT_URL` dipakai Prisma migration melalui session pooler.
- Tanpa `directUrl`, migration bisa gagal atau salah lewat pooler.

### 5.2 Environment

Project memakai:

```txt
.env
.env.local
.env.example
```

Aturan:

- `.env` dibaca Prisma CLI.
- `.env.local` dibaca Next.js runtime.
- `.env.example` hanya template placeholder.
- `.env` dan `.env.local` harus sync.
- Jangan commit `.env` atau `.env.local`.
- `.env.example` tidak boleh berisi credential asli.

### 5.3 Catatan Penting Supabase

- `DATABASE_URL` memakai transaction pooler port 6543 dengan `pgbouncer=true`.
- `DIRECT_URL` memakai session pooler port 5432 untuk migration.
- Password database dengan karakter khusus harus URL-encoded.

Contoh:

```txt
Password raw: abc?123
Password di URL: abc%3F123
```

### 5.4 Schema Protection Rule

Sebelum mengubah Prisma schema, AI agent wajib inspect `prisma/schema.prisma` terlebih dahulu.

Aturan:

1. Jangan rename field existing kecuali benar-benar diperlukan.
2. Prefer additive changes daripada destructive changes.
3. Jangan duplicate model/field yang sudah ada dengan nama lain.
4. Jika field sudah ada dengan arti serupa, reuse field tersebut.
5. Setiap schema change harus disertai update service/action/seed yang terdampak.
6. Setelah schema change, jalankan atau instruksikan:

```bash
npx prisma generate
npx prisma migrate dev
```

Contoh penting:

Jika `Appliance` existing sudah punya:

```prisma
powerWatt
quantity
dailyUsageHours
usageStatus
```

Jangan langsung membuat field baru seperti:

```prisma
watt
hoursPerDay
```

kecuali ada rencana migrasi yang jelas.

---

## 6. Auth dan User Flow

### 6.1 Auth Saat Ini

- NextAuth Credentials Provider.
- Login dengan email dan password.
- JWT menyimpan:
  - `token.id`
  - `token.hasBusiness`
- Session menyimpan:
  - `session.user.id`
  - `session.user.hasBusiness`

### 6.2 Demo Account

```txt
Email: owner@wattwise.id
Password: password123
```

Password login demo berbeda dari password database Supabase.

### 6.3 Protected Routes

```txt
/dashboard/*
/onboarding/*
```

### 6.4 Middleware Behavior

- Kalau user belum punya business dan akses dashboard → redirect ke `/onboarding`.
- Kalau user sudah punya business dan akses onboarding → redirect ke `/dashboard`.

### 6.5 Login Stability Rule

Login demo harus selalu diuji setelah perubahan besar.

Checklist:

```txt
1. Jalankan seed jika perlu.
2. Login dengan owner@wattwise.id / password123.
3. Pastikan masuk ke /dashboard.
4. Pastikan tidak mental ke 404.
5. Pastikan session user punya id dan hasBusiness.
```

---

## 7. Routing Rules

Project memakai Next.js App Router dengan route group.

Dashboard existing berada di:

```txt
src/app/(dashboard)/dashboard
```

URL tetap:

```txt
/dashboard
```

Bukan:

```txt
/(dashboard)/dashboard
```

### 7.1 Rule untuk Page Dashboard Baru

Semua fitur dashboard baru untuk MVP 2 harus dibuat di bawah:

```txt
src/app/(dashboard)/dashboard/<feature>/page.tsx
```

Contoh:

```txt
/dashboard/peralatan
→ src/app/(dashboard)/dashboard/peralatan/page.tsx

/dashboard/simulasi
→ src/app/(dashboard)/dashboard/simulasi/page.tsx

/dashboard/notifikasi
→ src/app/(dashboard)/dashboard/notifikasi/page.tsx

/dashboard/demo-control
→ src/app/(dashboard)/dashboard/demo-control/page.tsx
```

Aturan:

- Jangan membuat page dashboard langsung di `src/app/(dashboard)/peralatan` kecuali struktur routing memang diubah secara sadar.
- Jangan menulis `/(dashboard)/` di `href`.
- Link internal harus memakai URL user-facing seperti `/dashboard/peralatan`.

---

## 8. MVP Tahap 1 — Status

MVP Tahap 1 dianggap selesai.

Fitur MVP 1:

- Register
- Login
- Logout
- Protected dashboard
- Business onboarding/profile
- Manual electricity input saved to database
- Database-powered dashboard
- Bill prediction
- Anomaly detection
- Recommendations
- Monthly report preview
- PDF report download

Prinsip MVP 1:

- Fullstack sudah pakai Prisma + Supabase PostgreSQL.
- Input listrik masih manual.
- Analisis masih rule-based.
- Belum IoT/PLN/AMI/payment/WhatsApp/external AI.
- UI Bahasa Indonesia.
- Disclaimer estimasi bukan tagihan resmi PLN.

---

## 9. MVP Tahap 2 — Goal

MVP Tahap 2 bertujuan membuat WattWise AI lebih:

- Personal
- Pintar
- Stabil
- Realistis
- Siap demo ke user, partner, mentor, atau juri

MVP 2 bukan fokus IoT berat. Fokusnya adalah membuat data manual yang ada menjadi lebih bernilai.

---

## 10. Scope MVP Tahap 2

### Scope Utama

1. Performance Stabilization untuk Demo
2. Business Switcher + Multi-business Flow
3. Appliance-level Estimation
4. Analysis Engine V2
5. Appliance-based Recommendation Engine
6. Scenario Simulator
7. Report History
8. Notification Center
9. Better Onboarding
10. Data Quality Check
11. CSV Export
12. Demo Scenario Control
13. UI Polish + README Update

### Yang Tidak Perlu di MVP 2

Jangan dulu implementasi:

- Real IoT hardware
- Integrasi resmi PLN
- AMI smart meter
- Payment gateway
- WhatsApp API real
- Machine learning berat
- Mobile app native
- Multi-tenant enterprise admin kompleks

Semua itu masuk MVP 3 atau pilot.

---

## 11. Active Business Rules

MVP 2 wajib punya flow active business yang konsisten.

### 11.1 Active Business Cookie

Gunakan satu nama cookie:

```txt
wattwise_active_business_id
```

Aturan:

- Simpan hanya `businessId`.
- Jangan simpan object business lengkap di cookie.
- Validate ownership server-side setiap kali digunakan.
- Jika businessId tidak valid atau bukan milik user, abaikan.

### 11.2 Active Business Resolver

Buat atau reuse helper/service seperti:

```ts
getActiveBusinessForUser(userId)
```

Tanggung jawab:

1. Baca `wattwise_active_business_id` dari server-side cookie.
2. Validasi bahwa business tersebut milik user yang sedang login.
3. Jika valid, return business tersebut.
4. Jika invalid/missing, fallback ke business pertama milik user.
5. Jika user tidak punya business, redirect ke `/onboarding`.

Aturan:

- Jangan duplicate logic active business di setiap page.
- Semua halaman dashboard harus memakai active business resolver yang sama.
- Semua query dashboard harus scoped by `businessId` milik active business.

---

## 12. Roadmap Eksekusi MVP 2

### Phase 0 — Performance Stabilization

#### Step 0. Audit dan Stabilkan Performance Demo

Status: wajib sebelum fitur besar MVP 2.

Target:

- Login demo tidak terasa lambat.
- Dashboard tidak menghitung ulang analysis berat saat page load.
- Query utama dibuat ringkas.
- Page utama punya loading/skeleton yang baik.
- Business switcher tidak trigger proses berat.
- PDF tidak digenerate saat membuka halaman laporan.

Implementation rules:

- Inspect semua page yang lambat.
- Identifikasi query yang berjalan saat page load.
- Pindahkan proses berat ke action eksplisit atau setelah input data.
- Simpan hasil analysis ke database.
- Dashboard hanya membaca hasil siap tampil.
- Jangan pindah stack.
- Jangan membuat backend terpisah dulu.

Acceptance criteria:

- Login demo berjalan stabil.
- Dashboard bisa dibuka tanpa delay berlebihan.
- Tidak ada layar putih lama.
- Loading state jelas.
- Semua data tetap scoped by active business.

---

### Phase 1 — Foundation

#### Step 1. Business Switcher + Multi-business Flow

Status: prioritas pertama.

Target:

- User bisa punya lebih dari 1 usaha.
- User bisa memilih usaha aktif.
- Semua halaman dashboard berubah sesuai usaha aktif.
- Data listrik, rekomendasi, laporan, dan analisis terpisah per usaha.

Implementation rules:

- Simpan active business di server-side cookie.
- Jangan localStorage.
- Validasi ownership setiap kali business dipilih.
- Kalau active business invalid, fallback ke business pertama milik user.
- Kalau user tidak punya business, redirect ke `/onboarding`.

Acceptance criteria:

- Login demo account.
- Switch dari Laundry Berkah ke Frozen Jaya Purwokerto.
- Dashboard berubah.
- Input listrik masuk ke business aktif.
- Prediction/anomaly/recommendation/report memakai business aktif.

---

### Phase 2 — Appliance Intelligence

#### Step 2. Appliance-level Estimation

Target:  
User bisa mencatat alat listrik per usaha dan melihat estimasi pemakaian per alat.

Data appliance minimal, disesuaikan dengan schema existing:

- name
- category, jika belum ada boleh ditambahkan
- powerWatt atau watt sesuai schema existing
- quantity
- dailyUsageHours atau hoursPerDay sesuai schema existing
- daysPerMonth, jika belum ada boleh ditambahkan
- isAlwaysOn, jika diperlukan

Formula:

```txt
monthlyKwh = watt × quantity × hoursPerDay × daysPerMonth / 1000
monthlyCost = monthlyKwh × tariffPerKwh
```

Halaman:

```txt
/dashboard/peralatan
```

Fitur:

- List peralatan
- Tambah alat
- Edit alat
- Hapus alat
- Summary total estimasi kWh/bulan
- Summary total estimasi biaya/bulan
- Alat paling boros

#### Step 3. Appliance Recommendation Engine

Target:  
Rekomendasi tidak hanya dari total tagihan, tapi juga dari alat yang digunakan.

Output recommendation:

- title
- priority
- estimatedSaving
- difficulty
- impact
- reason
- practicalSteps

Rules contoh:

Laundry:

- Dryer konsumsi tinggi → optimalkan batch, kurangi jam pemakaian.
- Setrika lama → jadwalkan setrika batch.
- Pompa air boros → cek kebocoran/jadwal nyala.
- Lampu toko boros → ganti LED.

Frozen food:

- Freezer 24 jam → cek karet pintu, suhu, tata stok.
- Showcase chiller sering dibuka → edukasi staff/pelanggan.
- Freezer suhu terlalu rendah → sesuaikan suhu.
- Lighting tinggi → LED.

---

### Phase 3 — Smarter Analysis

#### Step 4. Analysis Engine V2

Target:  
Rule-based engine lebih kuat dan stabil.

Analisis harus membandingkan:

- Bulan ini vs bulan lalu
- Bulan ini vs rata-rata 3 bulan terakhir
- Biaya vs kWh
- Total pemakaian vs estimasi appliance

Output:

- currentKwh
- currentCost
- previousMonthComparison
- threeMonthAverageComparison
- anomalies
- energyScore
- status
- insights
- disclaimer

Status:

- Efisien
- Normal
- Perlu Dicek
- Boros

Rules:

- Jika kWh naik > 15% dari rata-rata 3 bulan → Perlu Dicek.
- Jika kWh naik > 30% → Boros.
- Jika biaya naik > 20% tapi kWh naik < 5% → warning input/tarif/biaya tambahan.
- Jika alat tertentu menyumbang konsumsi besar → insight appliance.

---

### Phase 4 — Simulation and Reports

#### Step 5. Scenario Simulator

Target:  
User bisa mencoba skenario hemat tanpa mengubah data asli.

Halaman:

```txt
/dashboard/simulasi
```

Skenario:

- Kurangi jam pakai alat.
- Ganti alat ke watt lebih rendah/inverter.
- Target hemat 10%.
- Servis freezer/AC.

Output:

- estimasi kWh saved/month
- estimasi Rupiah saved/month
- affected appliance
- practical explanation
- disclaimer

#### Step 6. Report History

Target:  
Laporan bulanan bisa dilihat ulang, difilter, dan di-download ulang.

Fitur:

- List laporan per business.
- Filter bulan/tahun.
- Status laporan.
- Total kWh.
- Total biaya.
- Energy score.
- Download PDF ulang.
- Generate ulang jika perlu.

Constraint:

- Report harus scoped by `businessId`.
- Unique constraint ideal: `businessId + month + year`.

---

### Phase 5 — Reliability and Demo Readiness

#### Step 7. Notification Center

Target:  
Notifikasi in-app sederhana.

Jenis notifikasi:

- Input bulan ini belum diisi.
- Lonjakan pemakaian terdeteksi.
- Prediksi tagihan naik.
- Rekomendasi baru tersedia.
- Laporan bulanan siap.

Tidak perlu:

- Email real
- WhatsApp real
- Push notification real

#### Step 8. Data Quality Check

Target:  
Input manual lebih aman dan tidak ngawur.

Rules:

- Duplicate month/year untuk business yang sama → block.
- kWh terlalu kecil tapi biaya besar → warning.
- kWh besar tapi biaya terlalu kecil → warning.
- Usage naik > 50% dari bulan sebelumnya → warning.
- Bulan lompat → note.

#### Step 9. CSV Export

Target:  
Data bisa diekspor untuk UMKM/mentor/juri.

Export:

- Riwayat tagihan
- Rekomendasi
- Laporan ringkas

Format:

- CSV dulu cukup.
- Tidak perlu Excel dependency.

#### Step 10. Demo Scenario Control

Target:  
Mudah menyiapkan demo untuk lomba.

Halaman:

```txt
/dashboard/demo-control
```

Akses:

- Demo account atau admin sederhana.

Skenario:

- Laundry normal
- Laundry boros karena dryer
- Frozen food boros karena freezer
- UMKM hemat setelah rekomendasi diterapkan

---

## 13. UI/UX Rules

Semua UI copy harus Bahasa Indonesia.

Tone:

- Ramah
- Jelas
- Praktis
- Tidak terlalu teknis

Contoh microcopy:

```txt
Prediksi ini adalah estimasi berdasarkan data yang Anda masukkan, bukan tagihan resmi PLN.
```

```txt
Belum ada data peralatan. Tambahkan alat listrik untuk menghitung estimasi pemakaian.
```

```txt
Tagihan terlihat tidak wajar untuk jumlah kWh tersebut. Mohon cek ulang nominal Rupiah atau kWh yang dimasukkan.
```

```txt
Usaha aktif: Laundry Berkah
```

```txt
Data bulan ini belum lengkap. Tambahkan input listrik agar analisis lebih akurat.
```

---

## 14. Engineering Rules untuk AI Agent

AI coding agent wajib mengikuti aturan ini:

1. Inspect existing files before editing.
2. Jangan rewrite project dari nol.
3. Jangan pindah stack.
4. Jangan hapus `directUrl` dari Prisma schema.
5. Jangan pakai MySQL.
6. Jangan pakai `supabase-js` untuk core data.
7. Jangan pakai localStorage/mock data untuk fitur utama.
8. Semua database operation lewat Prisma.
9. Gunakan service layer.
10. Gunakan Server Actions/API Routes sesuai pola existing.
11. Preserve existing UI yang bagus.
12. Tambahkan fitur incremental.
13. Tambahkan loading/error/empty state.
14. Semua UI copy Bahasa Indonesia.
15. Prediction/report/recommendation wajib punya disclaimer estimasi.
16. Setelah perubahan schema, jalankan:
    - `npx prisma generate`
    - `npx prisma migrate dev`
17. Pastikan seed demo tetap aman dan tidak expose credential asli.
18. Test login demo setelah perubahan penting.
19. Jangan membuat route yang tidak sesuai struktur existing.
20. Jangan membuat model/field duplicate tanpa mengecek schema existing.
21. Jangan menjalankan analysis berat pada setiap page load.
22. Simpan hasil analysis/recommendation/report summary ke database.
23. Gunakan query Prisma yang ringkas dengan `select`/`include` seperlunya.
24. Tambahkan skeleton/loading state untuk page server-loaded.
25. PDF hanya digenerate saat user klik download.
26. Business switcher tidak boleh menjalankan proses berat.

---

## 15. AI Agent Workflow Wajib

Untuk setiap step implementasi, AI agent harus:

1. Inspect relevant existing files first.
2. Jelaskan rencana perubahan minimal.
3. Reuse existing components and styles.
4. Implement incremental, bukan rewrite besar-besaran.
5. Hindari mengubah file unrelated.
6. Update Prisma schema hanya jika perlu.
7. Update seed hanya jika perlu.
8. Jalankan atau sarankan command:

```bash
npm run lint
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

9. Verify demo login:

```txt
owner@wattwise.id / password123
```

10. Cek flow demo utama: login, dashboard, switch business, input data, laporan.
11. Summarize changed files, test result, dan potensi performance issue.

---

## 16. Suggested Folder Structure

Struktur harus menyesuaikan project existing.

Arah ideal:

```txt
src/
  app/
    actions/
      business.ts
      appliance.ts
      report.ts
      notification.ts

    (dashboard)/
      dashboard/
        page.tsx
        peralatan/
          page.tsx
        simulasi/
          page.tsx
        laporan/
          page.tsx
        rekomendasi/
          page.tsx
        notifikasi/
          page.tsx
        demo-control/
          page.tsx

  components/
    business-switcher.tsx
    notification-bell.tsx
    appliance-form.tsx
    appliance-table.tsx

  services/
    business-service.ts
    appliance-service.ts
    analysis-v2.ts
    recommendation-engine.ts
    simulator-service.ts
    report-service.ts
    notification-service.ts
    data-quality-service.ts

  lib/
    auth.ts
    db.ts
    utils.ts
    active-business.ts
```

Catatan:

- Jangan pindahkan folder existing tanpa alasan kuat.
- Jika project saat ini sudah punya `src/app/actions`, ikuti pola yang sudah ada.
- Jika project saat ini punya `src/services`, gunakan itu untuk business logic.

---

## 17. Data Model Additions for MVP 2

Model di bawah adalah **conceptual reference**, bukan replacement wajib.

AI agent wajib menyesuaikan dengan schema existing.

### 17.1 Existing Schema is Source of Truth

Aturan:

- Jangan duplicate model yang sudah ada.
- Jangan rename field tanpa migration plan.
- Jangan membuat field baru jika field existing sudah cukup.
- Gunakan current `User`, `Business`, `Appliance`, `ElectricityEntry`, `AnalysisResult`, `Anomaly`, `Recommendation`, dan `MonthlyReport` sebagai sumber kebenaran.

### 17.2 Appliance Concept

Jika existing `Appliance` sudah punya `powerWatt`, gunakan itu sebagai watt.
Jika existing `Appliance` sudah punya `dailyUsageHours`, gunakan itu sebagai hoursPerDay.

Field tambahan yang boleh dipertimbangkan:

```prisma
category     String?
daysPerMonth Int?
isAlwaysOn   Boolean @default(false)
```

Jangan langsung mengganti field existing:

```prisma
powerWatt → watt
dailyUsageHours → hoursPerDay
```

kecuali ada alasan kuat dan migration aman.

### 17.3 MonthlyReport Concept

Jika existing `MonthlyReport` belum menyimpan angka ringkasan, boleh pertimbangkan field tambahan:

```prisma
totalKwh    Float?
totalCost   Float?
energyScore Float?
```

Tetap pertahankan constraint:

```prisma
@@unique([businessId, year, month])
```

jika sudah ada.

### 17.4 Notification Concept

Jika belum ada model Notification, boleh tambahkan:

```prisma
model Notification {
  id         String   @id @default(uuid())
  userId     String
  businessId String?
  title      String
  message    String
  type       String
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

Catatan:

- Boleh tambahkan relation ke `User` dan `Business` jika sesuai pola schema existing.
- Notification MVP 2 cukup in-app, tidak perlu email/WhatsApp/push real.

---

## 18. Demo Narrative

Narasi demo ideal:

1. User login sebagai pemilik UMKM.
2. User memilih usaha aktif: Laundry Berkah.
3. Dashboard menampilkan tagihan, prediksi, energy score, dan insight.
4. User membuka Peralatan.
5. User melihat dryer sebagai alat paling boros.
6. WattWise AI memberi rekomendasi hemat.
7. User mencoba simulasi mengurangi dryer 1 jam/hari.
8. Sistem menampilkan potensi hemat per bulan.
9. User membuka laporan bulanan.
10. User download PDF.
11. User switch ke Frozen Jaya.
12. Dashboard berubah dan rekomendasi berbeda karena freezer menjadi beban utama.

---

## 19. Demo Safety Checklist

Sebelum demo, verify:

1. `npm run dev` starts successfully.
2. Login demo works:

```txt
owner@wattwise.id / password123
```

3. Demo account has at least two businesses:

```txt
Laundry Berkah
Frozen Jaya Purwokerto
```

4. Business switcher works.
5. Dashboard changes after switching business.
6. Input data is scoped to active business.
7. Report/PDF can be opened/downloaded.
8. No page returns 404.
9. No page shows raw technical error.
10. UI text is Bahasa Indonesia.
11. No real secrets are visible in UI, README, or console.
12. `.env.example` contains placeholders only.

---

## 20. Definition of Done MVP 2

MVP 2 dianggap selesai jika:

- Flow demo utama terasa responsif.
- Analysis berat tidak dijalankan pada setiap page load.
- Dashboard membaca precomputed/summary data.
- Loading/skeleton state tersedia di halaman utama.
- PDF hanya digenerate saat user klik download.
- Business switcher stabil.
- Semua halaman dashboard scoped by active business.
- Peralatan bisa CRUD dan dihitung estimasinya.
- Analysis Engine V2 berjalan.
- Rekomendasi berbasis business type dan appliance.
- Simulator hemat berjalan.
- Riwayat laporan tersedia.
- Notifikasi in-app tersedia.
- Input data punya quality check.
- Export CSV tersedia.
- Demo scenario bisa disiapkan.
- Tidak ada core feature yang kembali ke mock/localStorage.
- Tidak ada klaim integrasi resmi PLN.
- UI tetap Bahasa Indonesia.
- Login demo tetap berfungsi.
- Prisma migration berhasil.
- README diperbarui.

---

## 21. README Update Checklist

README perlu memuat:

- Nama produk
- Tagline
- Problem statement
- Target user
- Tech stack
- Architecture
- Current stack yang benar berdasarkan repo
- Performance rules dan optimization direction
- MVP 1 features
- MVP 2 features
- Limitations/disclaimer
- Setup local
- Environment variables placeholder
- Prisma migration command
- Seed command
- Demo account
- Screenshot/demo flow jika ada
- Catatan bahwa belum ada integrasi resmi PLN/IoT/AMI

---

## 22. Future MVP 3 / Pilot Ideas

Setelah MVP 2 stabil, baru pikirkan:

- IoT prototype
- Smart plug integration
- PLN data import manual/semi-manual
- WhatsApp notification
- Email report
- Payment reminder
- AI natural language explanation
- ML forecasting
- Mobile-first PWA
- Partner dashboard
- Pilot UMKM real

Jangan implementasi ini di MVP 2 kecuali ada alasan demo yang sangat kuat.

---

## 23. Prompt Pembuka untuk AI Agent

Gunakan prompt ini setiap kali memulai task besar:

```txt
You are helping build WattWise AI, a fullstack MVP for Indonesian MSMEs.

Before editing code, follow the WattWise AI MVP Guidebook.

Important rules:
- Use Next.js 14 App Router, TypeScript, Tailwind, Prisma, Supabase PostgreSQL, and NextAuth.
- Do not switch to MySQL.
- Do not use supabase-js for core data.
- Do not use localStorage/mock data for core MVP features.
- Do not remove directUrl from prisma/schema.prisma.
- Inspect existing files before editing.
- Do not rewrite the project from scratch.
- Preserve existing UI and routing structure.
- Dashboard routes live under src/app/(dashboard)/dashboard.
- User-facing URLs must be /dashboard/... not /(dashboard)/...
- All UI copy must be in Bahasa Indonesia.
- Predictions and reports must include disclaimers that they are estimates and not official PLN bills.
- Use Prisma service functions, server actions, or API routes for database operations.
- Test demo login owner@wattwise.id / password123 after important changes.

Current priority: MVP 2 implementation, starting with Business Switcher + Multi-business Flow.
```


Tambahan wajib untuk performance:

- Frontend sudah dianggap baik, jangan diganti.
- Database Supabase PostgreSQL sejauh ini dipertahankan.
- Backend terasa lambat dari sisi client, jadi optimasi flow backend harus diprioritaskan.
- Jangan pindah MySQL atau backend terpisah hanya karena performance.
- Jangan menjalankan analysis berat saat page load.
- Precompute analysis setelah input data atau tombol generate.
- Dashboard harus membaca data yang sudah siap tampil.
- PDF hanya dibuat saat user klik download.
- Semua page utama harus punya loading/skeleton state.
