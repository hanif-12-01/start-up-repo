# WattWise AI — Implementation Prompt IT-DIAG-01B

## Bill-First Input, Period Normalization, Comparison, dan Safe Wording

Gunakan prompt ini setelah Product Owner menerima fase berikut:

```text
IT-DIAG-UI-01 — GSAP Frontend and Motion Foundation
Status: ACCEPTED LOCALLY

Approved local HEAD:
0dcf7ffe88ddd74ff7d76b52684d972894588009

Accepted branch:
feature/it-diag-ui-01-gsap-motion

Neon dev verification:
PENDING

Preview deployment:
NOT STARTED
```

Prompt ini memberi izin untuk mengimplementasikan tepat satu fase bounded:

```text
IT-DIAG-01B — Bill-First
```

Fase ini meliputi:

```text
input tagihan listrik manual
periode tagihan
kWh opsional
tarif opsional
previous-period selection
biaya per hari
perbandingan periode
normalisasi panjang periode
safe wording
tenant isolation
```

Fase ini tidak memberi izin untuk mengerjakan diagnosis, penyebab kenaikan, rekomendasi, dashboard penuh, prediksi, anomaly detection, AI model, payment, deployment, atau IT-DIAG-02.

---

# 1. Sasaran Produk

Alur produk setelah fase ini:

```text
Register
→ Plan Choice
→ Onboarding
→ Business Setup
→ Input Tagihan Pertama
→ Input Tagihan Berikutnya
→ Perbandingan Biaya Antarperiode
```

Tujuan 01B adalah membantu pengguna memahami:

```text
berapa total biaya listrik pada suatu periode
berapa panjang periode tersebut
berapa biaya rata-rata per hari
bagaimana biaya berubah dibanding periode sebelumnya
apakah data kWh tersedia untuk membandingkan pemakaian
```

01B tidak boleh menebak penyebab perubahan.

Contoh batas yang benar:

```text
Biaya listrik periode ini naik 12%.
```

Contoh yang dilarang ketika kWh tidak tersedia:

```text
Konsumsi listrik naik 12%.
Mesin tertentu menyebabkan kenaikan.
AI mendeteksi pemborosan.
```

---

# 2. Konfigurasi Eksekusi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=0dcf7ffe88ddd74ff7d76b52684d972894588009
TARGET_BRANCH=feature/it-diag-01b-bill-first
TARGET_PHASE=IT-DIAG-01B

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_UI_01_GSAP_MOTION_IMPLEMENTATION_PROMPT.md

ALLOW_LOCAL_CODE=true
ALLOW_LOCAL_COMMIT=true

ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_MERGE=false
ALLOW_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
ALLOW_NEON_RESOURCE_CREATION=false
ALLOW_PRODUCTION_SECRET=false
ALLOW_REAL_USER_DATA=false
ALLOW_ADVANCED_ML=false

ALLOW_NEW_DEPENDENCY=false
ALLOW_DISPOSABLE_POSTGRES=true
REQUIRE_NODE_24=true
```

Known dependency audit state pada accepted base:

```text
4 moderate
3 high
0 critical

npm audit exit code:
1

npm audit --omit=dev exit code:
1
```

Jumlah tersebut adalah known project-level risk.

Jangan menjalankan:

```text
npm audit fix --force
```

---

# 3. Sumber Kebenaran

Baca secara lengkap dan gunakan urutan berikut:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
5. repository aktual
```

Aturan direktori:

```text
docs/baseline → selalu aktif
docs/tasks    → tepat satu active task
docs/reports  → evidence historis, bukan instruksi
docs/archive  → arsip historis, bukan instruksi
```

Jangan menggunakan dokumen di `docs/archive` sebagai instruksi aktif.

Legacy Laravel adalah referensi read-only untuk kontrak bisnis dan formula.

Repository aktual menunjukkan implementation state, bukan requirement baru.

Urutan keputusan:

```text
PRD
→ IT Strategy
→ Master Agent Prompt
→ active task
→ repository evidence
→ legacy contract dan tests
```

Jika ada konflik substantif:

```text
BLOCKED — DECISION REQUIRED
```

---

# 4. Aktivasi Task dan Git Preflight

## 4.1 Verifikasi accepted base

Jalankan dari repository root:

```powershell
Set-Location "D:\LOMBA\MVP PROTOTIPE start-up"

git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log -10 --format="%H %s"
git diff --check
Get-ChildItem .\docs\tasks -File | Select-Object Name
```

Sebelum branch 01B dibuat, expected HEAD:

```text
0dcf7ffe88ddd74ff7d76b52684d972894588009
```

Hard requirements:

```text
workspace clean
approved base ditemukan
approved base berada dalam history
tidak ada perubahan tidak dikenal
tidak ada staged file
```

## 4.2 Buat branch

Jika branch belum ada:

```powershell
git switch -c feature/it-diag-01b-bill-first 0dcf7ffe88ddd74ff7d76b52684d972894588009
```

Jika branch sudah ada:

* jangan hapus branch;
* jangan menimpa branch;
* jangan reset branch;
* periksa ancestry dan existing commits;
* lanjut hanya jika branch berasal dari approved base dan workspace clean.

Verifikasi ancestry:

```powershell
git merge-base --is-ancestor 0dcf7ffe88ddd74ff7d76b52684d972894588009 HEAD
```

## 4.3 Aktivasi active task

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_UI_01_GSAP_MOTION_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_UI_01_GSAP_MOTION_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
```

Final state harus:

```text
docs/tasks/
└─ WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
```

Tidak boleh ada active task kedua.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-01B bill-first
```

Activation commit harus:

```text
direct child dari approved base
hanya mengubah docs/tasks dan docs/archive
tidak mengubah wattwise-vercel
tidak mengubah wattwise-laravel
tidak mengubah docs/baseline
```

Setelah activation commit, implementation HEAD memang satu commit di atas approved base.

Jangan salah mensyaratkan implementation HEAD masih sama persis dengan approved base.

Verifikasi:

```powershell
git show --stat --oneline HEAD
git diff HEAD^..HEAD --name-status
git status --short --untracked-files=all
```

---

# 5. Area yang Dilindungi

Setelah activation commit, implementation hanya boleh mengubah:

```text
wattwise-vercel/**
```

Jangan mengubah:

```text
wattwise-laravel/**
docs/baseline/**
docs/archive/**
.github/**
bengkel/**
```

Jangan mengubah active task lagi setelah activation commit.

Jangan mengubah migration historis:

```text
wattwise-vercel/drizzle/0000_lowly_rhino.sql
wattwise-vercel/drizzle/0001_complete_journey.sql
```

Buat migration baru mengikuti convention repository.

---

# 6. Audit Sebelum Coding

Sebelum membuat schema, formula, atau UI, audit:

```text
wattwise-vercel package.json
wattwise-vercel package-lock.json
current Drizzle schema
migration runner
rollback convention
business schema
business ownership relation
session helper
tenant authorization helper
journey guard
proxy.ts
/setup page
existing server-action convention
existing repository/service convention
existing error handling
existing test helpers
existing disposable PostgreSQL runner
existing GSAP motion components
```

Audit legacy Laravel secara read-only untuk:

```text
electricity entry model
electricity migrations
electricity controller/request
electricity calculator
period calculation
daily cost calculation
rupiah rounding
duplicate-period handling
previous-period selection
missing-kWh behavior
tenant authorization
relevant feature tests
relevant unit tests
```

Gunakan repository search; jangan menebak nama file.

Buat ringkasan internal sebelum coding:

```text
Current state
Reusable contracts
Schema mapping
Route mapping
Formula evidence
Date-period contract
Previous-period contract
Duplicate-period contract
Authorization contract
Migration plan
Test plan
Exact files planned
Risks
```

Jangan mulai coding sampai audit selesai.

---

# 7. Formula Tidak Boleh Ditebak

Prompt ini sengaja tidak menentukan apakah rentang tanggal dihitung inklusif atau eksklusif.

Agent wajib menentukan dari canonical docs, legacy implementation, dan tests:

```text
cara menghitung jumlah hari
apakah periodStart dan periodEnd inklusif
perilaku periode satu hari
biaya per hari
pembulatan rupiah
persentase perubahan
normalisasi periode berbeda panjang
previous-period selection
duplicate-period behavior
overlapping-period behavior
zero baseline
missing-kWh behavior
missing-tariff behavior
```

Contoh pertanyaan yang harus dijawab dengan evidence:

```text
Apakah 1–30 Juni memiliki 30 atau 29 hari?

Jika biaya sebelumnya Rp0, apakah persentase ditampilkan?

Jika tiga tagihan tersedia, tagihan mana yang menjadi previous period?

Apakah tagihan dengan periode sama ditolak, diperbarui, atau diizinkan?

Apakah periode yang saling overlap diperbolehkan?

Apakah kWh boleh diturunkan dari nominal dan tarif?
```

Default safety rule:

```text
Jangan menurunkan kWh dari nominal tagihan dan tarif
jika kontrak canonical dan legacy tidak secara jelas mengizinkannya.
```

Jika keputusan formula tidak dapat dibuktikan:

```text
BLOCKED — DECISION REQUIRED

Reason:
Evidence:
Ambiguous decision:
Product risk:
Safe options:
Recommendation:
No implementation performed after hard stop:
```

---

# 8. Target Data Model

Gunakan naming dan ID convention repository aktual.

Data minimum yang harus dipertimbangkan:

```text
id
businessId
periodStart
periodEnd
totalAmountRupiah
kWh optional
tariff optional
notes optional
createdAt
updatedAt
```

Aturan wajib:

```text
totalAmountRupiah menggunakan integer/bigint
jangan menggunakan floating point untuk rupiah
kWh menggunakan tipe numeric/decimal yang sesuai
tariff menggunakan tipe numeric/decimal yang sesuai
kWh nullable
tariff nullable
notes nullable
periodStart menggunakan date
periodEnd menggunakan date
periodEnd tidak boleh sebelum periodStart
nilai nominal, kWh, dan tariff tidak boleh negatif
business foreign key wajib
bill tenant-scoped
index business dan periode wajib dipertimbangkan
```

Jangan menerima dari client:

```text
userId
ownerId
createdBy
tenantId
effective plan
calculated comparison
calculated daily cost
```

Ownership harus dibuktikan server-side melalui:

```text
authenticated session
→ business ownership
→ bill ownership
```

Jangan menduplikasi `userId` pada bill jika repository dan relation business sudah memberikan tenant boundary yang aman.

Jika `userId` memang diperlukan berdasarkan contract repository, nilainya wajib berasal dari session, bukan request body.

## 8.1 Constraint

Audit sebelum menentukan:

```text
unique business + periodStart + periodEnd
duplicate exact period
overlapping period
cascade behavior
foreign-key delete behavior
```

Jangan membuat constraint yang berisiko atau tidak dapat di-rollback hanya berdasarkan asumsi.

## 8.2 Migration

Buat migration baru setelah migration terakhir.

Jangan mengubah migration 0000 atau 0001.

Migration harus memiliki:

```text
forward SQL
rollback SQL
foreign key
index
constraints yang sudah dibuktikan
```

Wajib diuji:

```text
up
→ schema verification
→ down
→ schema verification
→ up
```

Build aplikasi tidak boleh membutuhkan database aktif.

---

# 9. Arsitektur Implementasi

Pertahankan arsitektur:

```text
React Server Components
→ Server Actions
→ Validation
→ Authorization
→ Service Layer
→ Repository/Data Access
→ PostgreSQL
```

Gunakan:

```text
Server Components sebagai default
Server Actions untuk mutation internal
Zod untuk server-side validation
service murni untuk calculation/comparison
repository tenant-safe untuk data access
```

Client Component hanya diperbolehkan untuk:

```text
form pending state
browser interaction yang benar-benar diperlukan
existing GSAP presentation wrapper
```

Dilarang:

```text
mengubah seluruh route shell menjadi Client Component
melakukan authorization hanya di client
menghitung angka authoritative hanya di client
menerima hasil perhitungan dari hidden input
menaruh database query langsung di presentational component
```

Perhitungan harus:

```text
deterministic
server-side authoritative
testable sebagai pure function bila memungkinkan
tidak bergantung timezone browser
tidak bergantung locale parser browser
```

Pastikan BigInt/Decimal tidak dikirim mentah ke React Client Component tanpa serialization aman.

---

# 10. UX Minimum

Audit route convention dahulu.

Preferred bounded route structure, selama tidak bertentangan dengan repository:

```text
/bills
/bills/new
```

Jangan membuat dynamic detail/edit/delete route kecuali benar-benar diperlukan oleh acceptance criteria.

## 10.1 Setup integration

Pada `/setup`, ganti atau lengkapi next-step notice dengan CTA jujur:

```text
Masukkan Tagihan Listrik
```

CTA mengarah ke bill input.

Jangan mengubah:

```text
plan summary
onboarding status
business profile
auth semantics
journey gates
trial semantics
```

## 10.2 Bill input

Form minimum:

```text
Tanggal awal periode
Tanggal akhir periode
Total tagihan listrik
Pemakaian kWh — opsional
Tarif per kWh — opsional
Catatan — opsional
```

Copy untuk kWh:

```text
Kosongkan jika tidak tercantum pada tagihan.
```

Copy untuk tarif:

```text
Kosongkan jika tidak diketahui.
```

Submit label:

```text
Simpan Tagihan
```

Jangan menggunakan:

```text
Simpan dan Diagnosis
Analisis dengan AI
Cari Penyebab
Deteksi Pemborosan
```

## 10.3 Bills page

State minimum:

### Tidak ada tagihan

```text
Belum ada data tagihan.
Masukkan tagihan pertama untuk mulai mencatat biaya listrik usaha.
```

CTA:

```text
Masukkan Tagihan Pertama
```

### Satu tagihan

Tampilkan:

```text
periode
total tagihan
jumlah hari
biaya per hari
kWh jika tersedia
tarif jika tersedia
```

Wording:

```text
Tambahkan satu periode sebelumnya atau periode berikutnya
untuk melihat perbandingan biaya.
```

Jangan menampilkan persentase perubahan tanpa pembanding.

### Dua atau lebih tagihan

Tampilkan:

```text
tagihan periode saat ini
previous period
total biaya masing-masing
jumlah hari masing-masing
biaya per hari masing-masing
perubahan total biaya
perubahan biaya per hari
perubahan kWh hanya jika valid
```

Sediakan CTA bounded:

```text
Tambah Tagihan
```

Tidak perlu membuat dashboard penuh.

## 10.4 Previous-period selection

Gunakan kontrak yang ditemukan dari audit.

Jika canonical contract mengizinkan automatic selection, previous period harus dipilih secara deterministic.

Jika pengguna perlu memilih previous period, tampilkan hanya bill milik business yang sama.

Jangan memperlihatkan:

```text
ID internal user lain
bill business lain
bill yang tidak eligible
```

Jika current bill adalah periode terbaru, previous period biasanya harus merupakan periode eligible terdekat sebelumnya—tetapi jangan menerapkan aturan ini tanpa membuktikannya dari contract.

---

# 11. Calculation Contract

Pisahkan calculation dari UI.

Minimum output model yang perlu dipertimbangkan:

```text
currentPeriodDays
previousPeriodDays

currentTotalAmountRupiah
previousTotalAmountRupiah

currentDailyCostRupiah
previousDailyCostRupiah

totalAmountDifferenceRupiah
totalAmountChangePercent nullable

dailyCostDifferenceRupiah
dailyCostChangePercent nullable

currentKWh nullable
previousKWh nullable
kWhDifference nullable
kWhChangePercent nullable
```

Gunakan nama final sesuai convention repository.

## 11.1 Total-cost comparison

Total tagihan dan perubahan total biaya boleh ditampilkan ketika dua nominal valid tersedia.

Contoh:

```text
Tagihan periode ini: Rp1.250.000
Periode sebelumnya: Rp1.100.000
Perubahan total biaya: naik 13,6%
```

## 11.2 Period normalization

Untuk periode berbeda panjang, tampilkan biaya per hari.

Contoh:

```text
Biaya per hari periode ini: Rp41.667
Biaya per hari periode sebelumnya: Rp36.667
Perubahan biaya per hari: naik 13,6%
```

Jangan menyamakan perubahan total biaya dengan perubahan biaya per hari.

## 11.3 kWh comparison

Istilah berikut hanya boleh digunakan jika current dan previous period sama-sama memiliki kWh valid:

```text
Pemakaian kWh naik
Pemakaian kWh turun
Perubahan pemakaian
```

Jika salah satu periode tidak memiliki kWh:

```text
Perubahan pemakaian kWh belum dapat dihitung
karena data kWh tidak tersedia pada kedua periode.
```

Jangan menulis:

```text
Konsumsi naik
Pemakaian meningkat
Lebih boros
```

berdasarkan nominal tagihan saja.

## 11.4 Zero denominator

Jangan menghasilkan:

```text
Infinity
NaN
100% tanpa dasar
```

Jika previous value nol dan percentage contract tidak jelas, tampilkan perubahan nominal dan status percentage unavailable.

Contoh aman:

```text
Persentase perubahan belum dapat dihitung karena nilai periode sebelumnya nol.
```

## 11.5 Rounding

Gunakan satu rounding contract yang dibuktikan dan konsisten pada:

```text
service
UI
unit tests
integration tests
runtime smoke
```

Jangan melakukan rounding berbeda di server dan browser.

---

# 12. Safe Wording

Ketika hanya nominal tersedia, gunakan:

```text
Biaya listrik naik 12%.
Biaya listrik turun 8%.
Total tagihan lebih tinggi dibanding periode sebelumnya.
Biaya per hari relatif stabil.
```

Ketika kedua periode memiliki kWh:

```text
Pemakaian kWh tercatat naik 6%.
```

Gunakan kata:

```text
tercatat
berdasarkan data yang dimasukkan
dibanding periode sebelumnya
```

Hindari kausalitas:

```text
disebabkan oleh
pasti karena
AI memastikan
alat rusak
terdeteksi real-time
PLN salah menghitung
```

Disclaimer minimum:

```text
Perbandingan ini dibuat berdasarkan data tagihan yang Anda masukkan.
Hasil ini bukan tagihan resmi PLN dan belum menjelaskan penyebab perubahan.
```

Jangan menyebut hasil 01B sebagai:

```text
diagnosis
prediction
AI recommendation
anomaly detection
official PLN calculation
```

---

# 13. Validation

Validasi di server menggunakan Zod atau convention existing.

Minimum cases:

```text
periodStart required
periodEnd required
periodEnd tidak sebelum periodStart
totalAmountRupiah required
totalAmountRupiah numeric dan non-negative
kWh optional
blank kWh menjadi null
kWh non-negative jika tersedia
tariff optional
blank tariff menjadi null
tariff non-negative jika tersedia
notes length bounded
business ownership authoritative
unknown request fields tidak dimass-assign
```

Pastikan input rupiah Indonesia tidak disimpan sebagai floating point.

Audit bagaimana form menerima:

```text
1250000
1.250.000
Rp1.250.000
```

Pilih satu contract input yang sederhana dan tidak ambigu.

Jangan membuat parser permisif yang dapat salah membaca nilai.

Pesan validasi harus:

```text
jelas
berbahasa Indonesia
terhubung ke field
terlihat segera
tidak hanya menggunakan warna
```

---

# 14. Authentication, Journey, dan Tenant Isolation

Authoritative checks harus server-side.

## 14.1 Anonymous user

Anonymous user yang membuka bill routes harus diarahkan ke:

```text
/login
```

## 14.2 Journey incomplete

Authenticated user yang belum menyelesaikan journey harus mengikuti existing gate:

```text
plan
→ onboarding
→ business
→ bills
```

Jangan membuat gate baru yang bertentangan dengan 01A.

## 14.3 Business ownership

Sebelum create/read/compare:

```text
ambil session server-side
ambil current user
ambil business yang dimiliki user
authorize business ownership
baru query atau mutation bill
```

Jangan percaya `businessId` dari client.

User A tidak boleh:

```text
membuat bill untuk business user B
membaca bill user B
memilih bill user B sebagai previous period
membandingkan bill user B
mengubah URL untuk memperoleh data user B
```

Gunakan not-found atau forbidden behavior sesuai convention repository, tanpa membocorkan keberadaan tenant lain.

## 14.4 Existing semantics

Jangan mengubah:

```text
register
login
logout
session
Free plan
Pro Trial
30-day trial
one-time trial
trial expiry
onboarding
business ownership
proxy.ts semantics
```

Next.js Proxy hanya optimistic gate.

Authoritative check tetap server-side.

---

# 15. GSAP dan Visual Consistency

Gunakan motion foundation existing secara restrained.

Diperbolehkan:

```text
PageReveal existing
Reveal existing
StaggerGroup existing
InteractiveMotion existing
```

Jangan:

```text
menambah dependency animation
membuat motion system kedua
menambah ScrollTrigger
menambah scroll hijacking
menambah looping decorative animation
mengubah global motion tokens tanpa kebutuhan
```

Reduced-motion harus tetap bekerja:

```text
prefers-reduced-motion: reduce
```

Form dan submit tidak boleh menunggu animation selesai.

Server Components tetap menjadi default.

Visual direction:

```text
clean energy-tech SaaS
existing WattWise palette
existing typography
accessible focus
responsive layout
```

Jangan redesign total.

---

# 16. Testing Wajib

Jangan menghapus test gagal.

Jangan menurunkan assertion.

Jangan mengubah test agar sesuai bug.

## 16.1 Unit tests

Minimum cases:

```text
period-day calculation sesuai contract
single-day period
different period lengths
daily-cost calculation
rupiah rounding
total-cost difference
total-cost percentage
daily-cost difference
daily-cost percentage
previous zero handling
current zero handling
one bill returns no comparison
previous-period deterministic selection
multiple eligible periods
skipped periods
exact duplicate period behavior
overlapping period behavior
kWh missing on current
kWh missing on previous
kWh missing on both
kWh valid on both
tariff missing
extreme valid values
safe wording cost-only
safe wording with kWh
no diagnosis wording
deterministic repeatability
```

## 16.2 Integration tests

Gunakan PostgreSQL 16 disposable.

Minimum cases:

```text
migration up succeeds
rollback succeeds
second migration up succeeds
bill can be inserted
kWh can be null
tariff can be null
invalid period rejected
negative amount rejected
negative kWh rejected
negative tariff rejected
duplicate behavior matches contract
previous period selected correctly
different-length periods normalized correctly
one bill shows no comparison
two bills show comparison
userId spoof ignored/rejected
user A cannot create bill for user B
user A cannot read bill user B
user A cannot compare against bill user B
bill list only returns current tenant
historical migrations remain valid
```

## 16.3 Regression tests

Seluruh accepted tests tetap lulus:

```text
00B foundation
00C database/auth
01A journey/business
UI-01 motion
```

Khususnya:

```text
register
login
logout
plan selection
30-day trial
trial replay prevention
onboarding
business creation
setup
route protection
tenant isolation
reduced motion
```

## 16.4 Runtime HTTP smoke

Jalankan production server menggunakan:

```text
Node.js 24
PostgreSQL disposable
synthetic credentials
synthetic users
```

Smoke flow:

```text
GET /
register synthetic user A
choose plan
complete onboarding
create business
open /setup
follow bill CTA
save first bill without kWh
open bills page
confirm no comparison state
save second bill with a different period length
open bills page
confirm total-cost comparison
confirm daily-cost comparison
confirm consumption wording is not used when kWh incomplete
save or prepare two valid kWh periods
confirm kWh comparison wording
logout

register synthetic user B
complete minimum journey
attempt access to user A bill
confirm access denied
confirm no tenant data leak
```

Jangan mencetak:

```text
password
cookie
session token
auth secret
DATABASE_URL
real user data
full synthetic secret
```

---

# 17. Browser Verification

Lakukan browser verification setelah final source selesai.

Routes minimum:

```text
/setup
/bills
/bills/new
```

Quick regression smoke:

```text
/
/register
/login
/plan
/onboarding
/businesses/new
```

Viewport:

```text
360×800
768×1024
1280×800
```

Verifikasi:

```text
no horizontal overflow
no clipped text
labels readable
optional fields clearly marked
validation visible
keyboard Tab and Shift+Tab
visible focus
submit via keyboard
pending state
double-submit protection
error state
empty state
one-bill state
comparison state
rupiah formatting
date formatting
reduced motion
native scrolling
no blocked interaction
no hydration warning
no React warning
no GSAP warning
no console error
no network failure
```

Jangan mengklaim browser PASS tanpa evidence.

Jika browser automation unavailable, lakukan manual browser review dan laporkan keterbatasannya dengan jujur.

---

# 18. Node.js 24 Quality Gates

Seluruh npm quality gates harus menggunakan Node.js 24.

Buktikan:

```text
node --version
npm --version
```

Expected:

```text
Node.js v24.x
```

Jalankan secara individual atau menggunakan `sh -ec` yang fail-fast:

```text
npm ci
npm audit
npm audit --omit=dev
npm run test
npm run test:integration
npm run typecheck
npm run lint
npm run build
```

Jika ada script component/E2E existing yang relevan, jalankan juga.

Laporkan untuk setiap gate:

```text
exact command
Node version
exit code
test files
test count
summary
```

Jangan menggunakan PowerShell chain dengan `;` sebagai satu-satunya bukti bahwa seluruh command lulus.

Jangan menutupi exit code menggunakan:

```text
|| true
exit 0
```

Build tidak boleh membutuhkan database aktif.

---

# 19. Dependency dan Audit Rules

Tidak ada dependency baru yang diizinkan.

Gunakan stack existing:

```text
Next.js
React
Tailwind
Drizzle
PostgreSQL
Better Auth
Zod
Vitest
Testing Library
GSAP existing
```

Jika dependency baru tampak diperlukan:

```text
BLOCKED — DECISION REQUIRED
```

Audit current HEAD dan bandingkan dengan accepted base.

Known expected audit state:

```text
4 moderate
3 high
0 critical
```

Jika jumlah atau severity bertambah akibat 01B:

```text
BLOCKED — DECISION REQUIRED
```

Jangan menyebut vulnerability “aman”.

Laporkan:

```text
package
severity
dependency path
accepted-base status
current-HEAD status
introduced by 01B atau tidak
audit exit code
```

Jangan menjalankan:

```text
npm audit fix --force
```

---

# 20. Docker Safety

Diperbolehkan:

```text
node:24-slim
postgres:16-alpine
dedicated Docker network
synthetic database credential
bind mount hanya wattwise-vercel
dedicated node_modules volume
dedicated .next volume
task-specific labels
task-specific container names
```

Dilarang:

```text
Docker socket mount
privileged container
host network
mount seluruh drive
mount home directory
mount secret store
docker system prune
docker volume prune
docker builder prune
menghapus resource tanpa ownership check
menggunakan production database
menggunakan Neon tanpa approval
```

Container integration test runner harus benar-benar menggunakan Node 24.

PostgreSQL disposable harus:

```text
tidak dipublikasikan ke public network
menggunakan synthetic credential
dibersihkan setelah test
```

Buktikan cleanup hanya untuk resource milik task.

---

# 21. Security Review

Audit dan laporkan:

```text
session authoritative server-side
business ownership server-side
bill tenant isolation
user ID tidak berasal dari client
business ID tidak dipercaya tanpa authorization
previous bill berasal dari tenant yang sama
no mass assignment
no cross-tenant read
no cross-tenant create
no cross-tenant comparison
no sensitive logging
no real user data
no production secret
no production database
CSRF/origin protection tidak dimatikan
validation server-side
calculation server-side
migration rollback tested
no official PLN claim
no diagnosis claim
```

Jangan mengklaim keamanan absolut.

---

# 22. Hard Stops

Berhenti dan minta keputusan apabila:

```text
approved base tidak ditemukan
workspace kotor atau divergen
active task lebih dari satu
baseline docs konflik
legacy formula ambigu
period inclusivity tidak dapat dibuktikan
previous-period selection tidak dapat dibuktikan
duplicate/overlap behavior memiliki risiko data
schema conflict berisiko
migration berisiko kehilangan data
rollback tidak dapat dilakukan dengan aman
database mungkin production
production secret diperlukan
dependency baru diperlukan
audit severity bertambah dan tidak ada fix aman
build membutuhkan database aktif
tenant test gagal
journey regression gagal
Node 24 integration test tidak dapat dijalankan aman
scope masuk diagnosis
scope masuk dashboard penuh
scope masuk payment atau deployment
```

Format hard stop:

```text
BLOCKED — DECISION REQUIRED

Reason:
Evidence:
Risk:
Safe options:
Recommendation:
Files changed before hard stop:
No changes performed after hard stop:
```

---

# 23. Git Rules

Activation commit terpisah:

```text
docs(tasks): activate IT-DIAG-01B bill-first
```

Setelah activation, buat maksimal 1–3 implementation commits lokal yang logis.

Contoh:

```text
feat(bills): add tenant-safe bill persistence and input

feat(bills): add normalized period comparison and safe wording

test(bills): verify migration comparison and tenant isolation
```

Tidak wajib memakai ketiga commit jika perubahan lebih aman dalam satu atau dua commit.

Commit hanya setelah gate relevan lulus.

Dilarang:

```text
git reset --hard
git clean
git amend
git rebase
git squash
force push
push
open PR
merge
branch deletion
deploy
```

Gunakan full 40-character SHA dari:

```powershell
git rev-parse HEAD
git log --format="%H %s"
```

Jangan merekonstruksi SHA dari short hash.

Rollback Git hanya dengan `git revert`, newest ke oldest.

Jangan menjalankan rollback kecuali diperintahkan Product Owner.

---

# 24. Definition of Done IT-DIAG-01B

```text
[ ] branch dibuat dari accepted UI-01 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] docs/baseline tidak berubah
[ ] wattwise-laravel tidak berubah
[ ] historical migrations 0000 dan 0001 tidak berubah
[ ] migration bill baru tersedia
[ ] rollback migration tersedia
[ ] migration up/down/up lulus
[ ] bill pertama dapat disimpan
[ ] bill kedua dapat disimpan
[ ] amount menggunakan integer/bigint rupiah
[ ] kWh benar-benar optional
[ ] tariff benar-benar optional
[ ] period validation server-side
[ ] previous period dipilih secara benar
[ ] period-day calculation dibuktikan
[ ] biaya per hari benar
[ ] periode berbeda panjang ditangani
[ ] total-cost comparison benar
[ ] daily-cost comparison benar
[ ] zero baseline aman
[ ] no Infinity atau NaN
[ ] cost wording dan consumption wording tidak tertukar
[ ] missing kWh state jujur
[ ] tidak ada diagnosis penyebab
[ ] tidak ada official PLN claim
[ ] anonymous route protection lulus
[ ] journey gating lulus
[ ] userId berasal dari session
[ ] business ownership authoritative
[ ] user A tidak dapat membuat bill user B
[ ] user A tidak dapat membaca bill user B
[ ] user A tidak dapat memilih previous bill user B
[ ] unit tests lulus
[ ] integration tests Node 24 lulus
[ ] existing regression tests lulus
[ ] typecheck lulus
[ ] lint lulus
[ ] build lulus
[ ] runtime HTTP smoke lulus
[ ] responsive review lulus
[ ] keyboard review lulus
[ ] reduced-motion review lulus
[ ] browser console clean
[ ] audit exit code dilaporkan jujur
[ ] audit tidak bertambah dari accepted base
[ ] Docker resources dibersihkan
[ ] workspace clean
[ ] 1–3 implementation commits
[ ] no push
[ ] no PR
[ ] no merge
[ ] no deploy
[ ] IT-DIAG-02 belum dimulai
```

Agent tidak boleh menyatakan task `ACCEPTED`.

Acceptance hanya dapat diberikan Product Owner.

---

# 25. Final Report

Laporan akhir wajib berisi:

```text
1. Status
2. Selected Task
3. Product Owner Decision Applied
4. Repository Preflight
5. Accepted Base
6. Branch
7. Task Activation Result
8. docs/tasks Final State
9. docs/archive Final State
10. Activation Commit Full SHA
11. Implementation Commit Full SHAs
12. Process Deviations
13. Legacy Formula Evidence
14. Period-Day Contract
15. Rounding Contract
16. Previous-Period Contract
17. Duplicate/Overlap Contract
18. Missing-kWh Contract
19. Architecture
20. Routes
21. Schema
22. Migration SQL
23. Rollback SQL
24. Migration Up/Down/Up Result
25. Validation
26. Tenant Isolation
27. Bill Input Result
28. Empty State Result
29. One-Bill State Result
30. Comparison Result
31. Different-Length Period Result
32. Cost Safe Wording Result
33. kWh Safe Wording Result
34. Disclaimer Result
35. Unit Test Command and Result
36. Integration Test Command and Result
37. Regression Test Result
38. Typecheck Result
39. Lint Result
40. Build Result
41. Runtime Smoke Result
42. Browser Verification
43. Responsive Review
44. Keyboard Review
45. Reduced-Motion Review
46. Browser Console Review
47. Node Version
48. npm Version
49. PostgreSQL Test Environment
50. npm Audit Result and Exact Exit Codes
51. Accepted-Base Audit Comparison
52. Dependency Changes
53. Changed Files
54. Created Files
55. Deleted Files
56. Protected Directory Diff
57. Historical Migration Diff
58. Docker Cleanup
59. Git Final State
60. Correct Git Rollback
61. Correct Database Rollback
62. Known Risks
63. Neon Dev Status
64. Preview Readiness
65. Remaining Scope
66. IT-DIAG-02 Status
67. Decision Needed
68. Final Verdict
```

Final verdict hanya boleh salah satu:

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW

VERIFIED LOCALLY — NEON DEV VERIFICATION PENDING

NOT VERIFIED — CORRECTION REQUIRED

BLOCKED — DECISION REQUIRED
```

Gunakan:

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW
```

hanya jika seluruh local, migration, tenant, Node 24, runtime, dan browser gates lulus.

Jangan menulis:

```text
IT-DIAG-01B ACCEPTED
production-ready
official PLN calculation
AI diagnosis complete
```

Setelah laporan selesai:

```text
berhenti
jangan mengerjakan IT-DIAG-02
jangan push
jangan membuka PR
jangan merge
jangan deploy
jangan menjalankan migration Neon
tunggu keputusan Product Owner
```

---

# 26. Instruksi Eksekusi Langsung

```text
Buka workspace:

D:\LOMBA\MVP PROTOTIPE start-up

Gunakan accepted local base:

0dcf7ffe88ddd74ff7d76b52684d972894588009

Aktifkan tepat satu task:

IT-DIAG-01B — Bill-First

Target branch:

feature/it-diag-01b-bill-first

Arsipkan prompt IT-DIAG-UI-01 tanpa mengubah isinya.

Simpan prompt ini sebagai:

docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md

Buat activation commit docs-only.

Setelah activation, implementasikan hanya di:

wattwise-vercel/**

Audit legacy Laravel secara read-only sebelum menetapkan formula.

Jangan menebak period-day calculation, previous-period selection,
rounding, duplicate behavior, atau missing-kWh behavior.

Gunakan Node.js 24 untuk seluruh quality gates.

Jangan menambah dependency.

Jangan menyentuh Neon atau production.

Jangan push, PR, merge, atau deploy.

Setelah implementation, verification, commit lokal, dan laporan selesai,
berhenti dan tunggu keputusan Product Owner.
```
