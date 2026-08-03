# WattWise AI — Implementation Prompt IT-DIAG-07A

## Action-Oriented Dashboard Integration

Keputusan Product Owner:

```text
IT-DIAG-06 — ACCEPTED LOCALLY
```

Accepted base:

```text
970754b0903c64fd92cd265148e3d89ec877ddf6
```

PERINGATAN:

```text
Jangan menjalankan task ini jika placeholder accepted base
belum diganti dengan full SHA final IT-DIAG-06.
```

Jika placeholder masih tersedia:

```text
BLOCKED — DECISION REQUIRED
```

Implementasikan tepat satu fase:

```text
IT-DIAG-07A — Action-Oriented Dashboard
```

Tujuan:

```text
data business
+ tagihan
+ diagnostic session
+ kandidat
+ inspection
+ Rencana Hemat
+ outcome

→ digabungkan menjadi satu dashboard tenant-safe
→ menampilkan status saat ini
→ menampilkan satu next-best product action
→ mengarahkan pengguna ke fitur yang sudah tersedia
```

Dashboard tidak membuat diagnosis, tidak membuat rekomendasi baru, tidak menghitung prediksi, dan tidak menggantikan data sumber.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=970754b0903c64fd92cd265148e3d89ec877ddf6
TARGET_BRANCH=feature/it-diag-07a-action-dashboard
TARGET_PHASE=IT-DIAG-07A

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md

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
ALLOW_NEW_DEPENDENCY=false
ALLOW_MACHINE_LEARNING=false
ALLOW_LLM=false

REQUIRE_NODE_24=true
ALLOW_DISPOSABLE_POSTGRES=true

EXPECTED_NEW_MIGRATION=false
```

---

# 2. Sumber Kebenaran

Baca lengkap sesuai urutan:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md
5. repository aktual
6. wattwise-laravel sebagai referensi read-only
```

Aturan:

```text
docs/baseline → canonical dan selalu aktif
docs/tasks    → tepat satu active task
docs/reports  → evidence historis
docs/archive  → bukan instruksi aktif
```

Dashboard harus menggunakan kontrak domain yang sudah diterima.

Jangan membuat kontrak baru untuk:

```text
bill comparison
diagnostic lifecycle
candidate ranking
inspection result
action-plan lifecycle
outcome evaluation
```

Jika kontrak accepted tidak dapat digunakan tanpa perubahan domain:

```text
BLOCKED — DECISION REQUIRED
```

---

# 3. Aktivasi Task

## 3.1 Preflight

Jalankan:

```powershell
Set-Location "D:\LOMBA\MVP PROTOTIPE start-up"

git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log -10 --format="%H %P %s"
git diff --check
Get-ChildItem .\docs\tasks -File | Select-Object Name
```

Expected HEAD:

```text
970754b0903c64fd92cd265148e3d89ec877ddf6
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-07a-action-dashboard `
  970754b0903c64fd92cd265148e3d89ec877ddf6
```

Jika branch sudah ada:

```text
jangan hapus
jangan reset
jangan menimpa
audit ancestry dan existing commits
lanjut hanya jika berasal dari accepted HEAD
```

Verifikasi:

```powershell
git merge-base --is-ancestor `
  970754b0903c64fd92cd265148e3d89ec877ddf6 `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md
```

Pastikan tepat satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-07A action dashboard
```

Activation commit harus menjadi direct child accepted IT-DIAG-06 HEAD.

---

# 4. Scope

## Diizinkan

```text
authenticated dashboard route
business selector atau active-business context
dashboard composition service
dashboard repository/read model
latest bill summary
bill comparison summary
diagnostic-session summary
candidate summary
inspection summary
action-plan summary
outcome summary
closed-session summary
deterministic next-action resolver
empty states
feature-gated dashboard navigation
responsive dashboard UI
tenant authorization
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
mengubah domain lifecycle accepted
membuat candidate baru
menghitung ulang candidate ranking
membuat inspection otomatis
membuat action plan otomatis
membuat outcome otomatis
mengubah outcome
mengubah immutable snapshots
monthly report
report snapshot
PDF export
CSV export
prediction
forecast
machine learning
LLM
saving estimation
ROI
payback
cash-flow prediction
product analytics lengkap
subscription changes
billing/payment
admin dashboard
IT-DIAG-07B
IT-DIAG-08
push
PR
merge
deploy
Neon
production
```

Dashboard hanya membaca dan mempresentasikan data accepted.

Mutation hanya terjadi ketika pengguna mengikuti CTA menuju flow existing.

---

# 5. Product Contract

Dashboard menjawab:

```text
Bagaimana kondisi listrik bisnis saya?
Apa proses yang sedang berjalan?
Apa tindakan berikutnya yang tersedia?
```

Dashboard tidak menjawab:

```text
Apa yang akan terjadi bulan depan?
Berapa penghematan masa depan?
Apa penyebab pasti tagihan?
Apakah tindakan terbukti berhasil?
```

Prinsip utama:

```text
status
→ konteks singkat
→ satu tindakan berikutnya
```

Jangan membuat dashboard sebagai kumpulan grafik tanpa arah.

---

# 6. Audit Sebelum Coding

Audit repository aktual:

```text
root authenticated navigation
post-login redirect
business list dan active-business convention
business ownership
business active/inactive status

electricity bill repository
bill comparison service
bill presentation mapper

diagnostic session lifecycle
candidate repository
inspection repository
action-plan repository
outcome repository

feature-flag convention
React Server Component convention
Server Action convention
authorization helper
not-found convention
currency formatter
date formatter
kWh formatter
responsive primitives
motion primitives
loading/pending convention
test database helpers
```

Audit legacy Laravel secara read-only:

```text
dashboard layout
status cards
latest bill summary
diagnostic status
next action
business switching
empty state
report entry point
```

Legacy hanya evidence.

Jangan menyalin query, UI, atau wording tanpa menyesuaikan target architecture.

Sebelum coding, tentukan:

```text
dashboard route
business-selection contract
dashboard read model
query strategy
next-action precedence
empty-state hierarchy
presentation mapper
exact files planned
test matrix
```

---

# 7. Route dan Navigation

Preferred authenticated route:

```text
/dashboard
```

Jika existing architecture lebih tepat menggunakan:

```text
/businesses/[businessId]/dashboard
```

ikuti convention repository dan dokumentasikan alasannya.

Setelah login dan journey dasar selesai, dashboard menjadi entry point utama.

Jangan merusak redirect accepted untuk:

```text
user tanpa plan
user belum onboarding
user belum memiliki business
business tidak aktif
```

Tambahkan navigation entry:

```text
Dashboard
```

Dashboard route wajib:

```text
authenticated
server-rendered
tenant-safe
tidak menggunakan static cross-user cache
```

Dilarang menggunakan shared cache key yang tidak menyertakan tenant/business context.

---

# 8. Business Context

Dashboard harus bekerja untuk user yang memiliki satu atau lebih business.

## Satu business

Gunakan business tersebut sebagai active context.

## Lebih dari satu business

Gunakan existing business-selection convention jika tersedia.

Jika belum ada convention, buat selector ringan yang:

```text
hanya menampilkan business milik user
menggunakan stable business identifier
tidak mempercayai businessId tanpa authorization
tidak menyimpan preference baru ke database
```

Business selection dapat memakai:

```text
search parameter
atau route segment
```

Jangan menambah migration hanya untuk active-business preference.

## Tidak ada business

Gunakan existing onboarding/business creation flow.

Jangan membuat dashboard kosong yang melewati journey guard.

---

# 9. Dashboard Read Model

Buat satu typed dashboard read model.

Minimum:

```text
businessSummary

latestBillSummary
previousBillSummary nullable
billComparisonSummary nullable

latestDiagnosticSummary nullable
candidateSummaries
inspectionSummaries
actionPlanSummaries
outcomeSummaries

nextAction
secondaryLinks
dataFreshness
```

Dashboard read model harus:

```text
server-authoritative
tenant-scoped
typed
deterministic
presentation-ready
```

Jangan mengirim:

```text
raw database rows
raw JSON snapshots
internal scores
rule versions
secret fields
session cookies
database identifiers yang tidak dibutuhkan UI
```

---

# 10. Query Strategy

Buat dashboard composition service.

Preferred structure:

```text
Dashboard Page
→ authorization/business resolution
→ Dashboard Composition Service
→ existing repositories/read helpers
→ presentation mapper
```

Hindari:

```text
database query di setiap presentational component
N+1 query per candidate
N+1 query per inspection
N+1 query per action plan
browser-side aggregation
duplicated domain calculations
```

Gunakan bounded queries.

Dashboard hanya membutuhkan data terbaru dan data aktif yang relevan, bukan seluruh histori tanpa batas.

Suggested bounds:

```text
latest 2 bills untuk comparison summary
latest relevant diagnostic session
maksimal 3 candidates dari session
inspection plans terkait session aktif
action plans terkait session aktif
outcomes terkait session aktif atau closed terbaru
```

Histori lengkap tetap berada pada halaman domain masing-masing.

Jangan mengubah existing repositories dengan cara yang merusak accepted flows.

---

# 11. Dashboard Sections

## 11.1 Business Header

Tampilkan:

```text
business name
segment
active status
business selector bila lebih dari satu
```

Jangan menampilkan internal plan atau tenant identifiers.

## 11.2 Latest Bill Summary

Tampilkan:

```text
periode tagihan terbaru
total biaya
jumlah hari
biaya per hari
kWh jika tersedia
perubahan terhadap periode sebelumnya bila valid
```

Gunakan accepted bill-comparison service.

Wording:

```text
biaya naik/turun
pemakaian naik/turun hanya jika kWh lengkap
```

Jangan menghitung ulang dengan formula baru.

CTA:

```text
Tambah Tagihan
Lihat Riwayat Tagihan
```

## 11.3 Diagnostic Journey Summary

Tampilkan status sesi terbaru yang relevan:

```text
DRAFT
COLLECTING_CONTEXT
ANALYZED
INSPECTION_IN_PROGRESS
CLOSED
```

Raw enum tidak ditampilkan.

Label pengguna:

```text
DRAFT                  → Cek Kenaikan belum dimulai
COLLECTING_CONTEXT     → Pertanyaan sedang dilengkapi
ANALYZED               → Bagian yang perlu dicek tersedia
INSPECTION_IN_PROGRESS → Pemeriksaan atau tindakan sedang berjalan
CLOSED                 → Sesi telah selesai
```

## 11.4 Candidate Summary

Jika session telah dianalisis, tampilkan maksimal tiga candidate accepted:

```text
title
rank presentation
safe explanation singkat
inspection status
```

Jangan tampilkan:

```text
internal score
probability
confidence
rule code
factor weight
```

## 11.5 Inspection Summary

Tampilkan:

```text
jumlah inspection plan
status IN_PROGRESS/COMPLETED
result label
next incomplete inspection
```

Jangan menghitung ulang aggregate result.

Gunakan result accepted:

```text
Ditemukan Masalah
Tidak Ditemukan
Tidak Tahu
Butuh Bantuan
```

## 11.6 Rencana Hemat Summary

Tampilkan:

```text
action title
status
planned start date
review target
```

Status label accepted:

```text
Direncanakan
Sedang Dijalankan
Tindakan Selesai
Dibatalkan
```

Jangan menyebut action `COMPLETED` sebagai berhasil.

## 11.7 Outcome Summary

Jika outcome tersedia, tampilkan:

```text
baseline period
follow-up period
overall outcome label
cost direction
usage direction jika tersedia
data-quality label
safe caveat
```

Gunakan outcome accepted:

```text
Ada sinyal perbaikan
Belum ada perubahan berarti
Ada sinyal kenaikan
Hasil perubahan campuran
Belum dapat disimpulkan
```

Jangan menghitung ulang outcome pada dashboard.

## 11.8 Closed Session Summary

Jika sesi `CLOSED`, tampilkan ringkasan read-only:

```text
session completed
latest outcome
link lihat detail
```

Jangan menampilkan mutation CTA untuk session tersebut.

---

# 12. Deterministic Next-Action Resolver

Dashboard harus menampilkan tepat satu primary next action.

Gunakan precedence berikut.

## 12.1 Tidak ada tagihan

```text
CTA: Tambah Tagihan Pertama
```

## 12.2 Hanya satu tagihan atau belum ada comparison eligible

```text
CTA: Tambah Tagihan Pembanding
```

## 12.3 Comparison tersedia, belum ada diagnostic session

```text
CTA: Cek Kenaikan
```

## 12.4 Session DRAFT atau COLLECTING_CONTEXT

```text
CTA: Lanjutkan Cek Kenaikan
```

## 12.5 Session ANALYZED

Jika ada candidate inspectable tanpa inspection:

```text
CTA: Mulai Pemeriksaan
```

Jika semua candidate non-inspectable:

```text
CTA: Lihat Hasil Cek Kenaikan
```

## 12.6 Session INSPECTION_IN_PROGRESS

Precedence internal:

```text
1. inspection IN_PROGRESS
2. completed inspection eligible tanpa action plan
3. action plan PLANNED
4. action plan IN_PROGRESS
5. completed action tanpa eligible bill
6. completed action dengan eligible bill tanpa outcome
7. session closure eligible
8. lihat ringkasan session
```

CTA masing-masing:

```text
Lanjutkan Pemeriksaan
Buat Rencana Hemat
Mulai Rencana Hemat
Lanjutkan Rencana Hemat
Tambah Tagihan Evaluasi
Evaluasi Hasil
Tutup Sesi Cek Kenaikan
Lihat Perjalanan Cek Kenaikan
```

## 12.7 Session CLOSED

```text
CTA: Lihat Ringkasan Sesi
```

Resolver harus:

```text
pure
deterministic
unit-tested
tidak melakukan database query sendiri
```

Dilarang menampilkan dua primary CTA yang saling bersaing.

Secondary links boleh tersedia tetapi harus memiliki hierarchy lebih rendah.

---

# 13. Empty States

Minimum empty states:

```text
belum ada business
belum ada tagihan
baru satu tagihan
belum ada diagnostic session
tidak ada active diagnostic
tidak ada candidate inspectable
belum ada inspection
belum ada action plan
menunggu tagihan evaluasi
belum ada outcome
```

Empty state harus:

```text
menjelaskan kondisi
menjelaskan satu langkah berikutnya
tidak menyalahkan pengguna
tidak mengarang data
```

Contoh:

```text
Belum ada tagihan pembanding.

Tambahkan satu periode tagihan lagi agar perubahan biaya
dapat dibandingkan.
```

---

# 14. Safe Wording

Dashboard hanya merangkum data yang telah tersedia.

Dilarang:

```text
penyebab pasti
AI mendeteksi
berhasil menghemat
gagal menghemat
tagihan akan turun
prediksi bulan depan
potensi hemat Rp
confidence percentage
```

Allowed:

```text
bagian yang perlu dicek
hasil pengamatan
Rencana Hemat sedang dijalankan
ada sinyal perubahan
belum dapat disimpulkan
menunggu tagihan evaluasi
```

Tambahkan disclaimer ringkas pada outcome summary:

```text
Perubahan sebelum dan sesudah tidak membuktikan
bahwa tindakan merupakan satu-satunya penyebab.
```

---

# 15. UI Minimum

Dashboard harus memiliki:

```text
page heading
business context
primary next-action card
latest bill card
diagnostic progress card
candidate summary
inspection summary
Rencana Hemat summary
outcome summary
empty states
secondary navigation
```

Gunakan hierarchy:

```text
1. Apa yang perlu dilakukan sekarang
2. Kondisi tagihan terbaru
3. Perjalanan Cek Kenaikan
4. Hasil dan riwayat singkat
```

Jangan membuat dashboard terlalu padat.

Mobile harus menampilkan primary CTA tanpa memerlukan horizontal scroll.

Jangan menambahkan chart hanya untuk dekorasi.

Chart hanya boleh digunakan jika:

```text
data minimal dua periode valid
label mudah dipahami
tidak menyiratkan prediksi
tidak memerlukan dependency baru
```

Default yang direkomendasikan:

```text
gunakan comparison cards dan text summary
tanpa chart baru pada IT-DIAG-07A
```

---

# 16. Loading, Error, dan Access States

Gunakan existing loading convention.

Dashboard harus memiliki:

```text
loading state
not-found behavior
safe error boundary bila convention tersedia
```

Dilarang:

```text
menampilkan raw database error
menampilkan stack trace
menampilkan identifier tenant lain
menyembunyikan error sebagai data kosong
```

Cross-tenant business request harus mengikuti existing 404/not-found convention.

Inactive business harus mengikuti accepted business policy.

---

# 17. Feature Flag

Gunakan feature flag:

```text
DASHBOARD_ENABLED
```

Ikuti existing feature-flag convention.

Feature flag harus diperiksa server-side.

Jika disabled:

```text
jangan merender data dashboard
gunakan existing fallback destination
```

Jangan percaya flag dari client.

---

# 18. Tenant Isolation

Ownership chain:

```text
authenticated user
→ owned business
→ owned bills
→ owned diagnostic sessions
→ owned candidates
→ owned inspections
→ owned action plans
→ owned outcomes
```

User A tidak boleh:

```text
melihat dashboard business user B
mengganti businessId untuk tenant lain
melihat bill summary user B
melihat session user B
melihat action atau outcome user B
mendapat metadata bahwa business user B ada
```

Cross-tenant route harus menghasilkan safe not-found response.

Dashboard composition tidak boleh menggabungkan data dari dua business yang berbeda.

---

# 19. No Migration Decision

IT-DIAG-07A tidak diharapkan membutuhkan migration.

Dilarang menambah tabel untuk:

```text
dashboard snapshot
dashboard preferences
active business preference
cached metrics
widget layout
```

Jika dashboard memerlukan persistence baru:

```text
BLOCKED — DECISION REQUIRED
```

Jangan mengubah migration `0000–0007`.

---

# 20. Architecture

Gunakan:

```text
React Server Components
→ business authorization
→ dashboard composition service
→ accepted repositories/services
→ presentation mapper
→ UI components
```

Pisahkan:

```text
dashboard read model
dashboard composition service
next-action resolver
dashboard presentation mapper
dashboard components
```

Client Components hanya bila diperlukan untuk:

```text
business selector
existing restrained interaction
```

Jangan memindahkan domain aggregation ke browser.

Jangan menambah dependency baru.

---

# 21. Unit Tests

Minimum:

```text
next action tanpa bills
next action satu bill
next action comparison ready
next action questionnaire incomplete
next action candidate ready
next action inspection in progress
next action inspection completed tanpa action
next action action PLANNED
next action action IN_PROGRESS
next action menunggu evaluation bill
next action outcome ready
next action closure eligible
next action closed session

tepat satu primary CTA
precedence deterministic
same input menghasilkan CTA sama

status labels exact
inspection result labels exact
action status labels exact
outcome labels exact

cost-only tidak menyebut usage
action completed tidak disebut berhasil
outcome tidak causal
no prediction wording
no saving guarantee

dashboard mapper tidak mengekspos internal score
dashboard mapper tidak mengekspos raw JSON
dashboard mapper tidak mengekspos rule version
```

---

# 22. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
dashboard user tanpa bill
dashboard satu bill
dashboard dua bill
dashboard questionnaire aktif
dashboard analyzed session
dashboard inspection active
dashboard completed inspection
dashboard planned action
dashboard active action
dashboard waiting evaluation bill
dashboard eligible outcome
dashboard closed session

latest two bills selected deterministically
latest relevant session selected deterministically
data hanya berasal dari selected business
multiple-business selector tenant-safe
inactive-business policy

candidate maksimal tiga
inspection result reused
action status reused
outcome reused
no domain recomputation

cross-tenant dashboard ditolak
cross-tenant business parameter ditolak
no data leakage
feature flag server-side
migration 0000–0007 tidak berubah
```

Jika dashboard query instrumentation tersedia, tambahkan assertion bahwa query count tetap bounded dan tidak meningkat berdasarkan jumlah candidate secara N+1.

---

# 23. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
authentication
plan/trial
onboarding
business
bill input
bill comparison
BigInt Rupiah
tenant isolation
diagnostic session
questionnaire
candidate generation
candidate ranking
guided inspection
inspection safety
action plans
action lifecycle
outcome evaluation
exact arithmetic
session closure
closed-session guards
responsive UI
reduced motion
```

Jangan menghapus, skip, atau melemahkan accepted tests.

---

# 24. Runtime Smoke

Gunakan:

```text
Node.js 24
PostgreSQL 16 disposable
synthetic users
synthetic businesses
synthetic bills
```

Minimum flow:

```text
register user A
complete plan/onboarding
create business Kos
open dashboard
verify no-bill empty state

create first bill
verify add-comparison CTA

create second bill
verify Cek Kenaikan CTA

start questionnaire
verify continue-questionnaire CTA

complete questionnaire
generate candidates
verify inspection CTA

start inspection
verify continue-inspection CTA

complete inspection FOUND
verify create-action CTA

create action plan
verify start-action CTA

start action
verify active-action CTA

complete action
verify waiting-for-evaluation-bill CTA

create eligible bill
verify evaluate CTA

create outcome
verify close-session CTA

close session
verify closed read-only summary

create second owned business
verify selector
verify no mixed data

logout
register user B
attempt user A business dashboard
verify 404
```

Jangan mencetak:

```text
password
token
cookie
database URL
secret
session credential
```

---

# 25. Browser Verification

Routes minimum:

```text
/dashboard
/bills
/bills/new
/diagnostics/[sessionId]
/diagnostics/[sessionId]/results
/diagnostics/[sessionId]/inspections/[inspectionPlanId]
/diagnostics/[sessionId]/actions/[actionPlanId]
/diagnostics/[sessionId]/actions/[actionPlanId]/outcome
```

Quick regression:

```text
/
/register
/login
/plan
/onboarding
/businesses/new
/setup
```

Viewport:

```text
360×800
768×1024
1280×900
```

Verify:

```text
dashboard navigation
business header
business selector
primary CTA hierarchy
no-bill state
one-bill state
comparison-ready state
questionnaire state
candidate state
inspection state
action state
outcome state
closed-session state

latest bill summary
safe comparison wording
candidate maximum three
inspection result label
action status label
outcome label
safe caveat

keyboard navigation
visible focus
reduced motion
native scrolling
no horizontal overflow
no clipped text
no hydration warning
no React warning
no GSAP warning
no framework console error
no HTTP 5xx
cross-tenant dashboard 404
```

Jangan menyatakan browser PASS tanpa evidence.

---

# 26. Node.js 24 Quality Gates

Gunakan:

```text
node:24-slim
```

Buktikan:

```text
node --version
npm --version
```

Jalankan:

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

Gunakan audit IT-DIAG-06 sebagai accepted reference setelah evidence closure.

Advisory database dapat berubah.

Bandingkan accepted base dan current lockfile menggunakan advisory database yang sama.

`package.json` dan lockfile tidak boleh berubah.

Jika dependency berubah atau audit memburuk karena task:

```text
BLOCKED — DECISION REQUIRED
```

Dilarang:

```text
npm audit fix --force
```

Build harus berhasil tanpa database aktif.

---

# 27. Hard Stops

Berhenti jika:

```text
accepted base belum diganti dengan full SHA
accepted base tidak ditemukan
workspace kotor atau divergen
lebih dari satu active task
dashboard membutuhkan perubahan domain lifecycle
dashboard membutuhkan migration
dashboard membutuhkan dependency baru
dashboard menghitung ulang candidate
dashboard menghitung ulang inspection result
dashboard menghitung ulang action outcome
next-action resolver nondeterministic
lebih dari satu primary CTA
cross-business data tercampur
tenant test gagal
dashboard mengekspos internal score
dashboard menggunakan causal claim
dashboard menggunakan prediction
dashboard menghitung saving estimate
build membutuhkan database aktif
production atau Neon diperlukan
scope mulai membuat monthly report
scope mulai mengerjakan IT-DIAG-07B
scope mulai mengerjakan IT-DIAG-08
```

Format:

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

# 28. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-07A action dashboard
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(dashboard): add tenant-safe action-oriented read model

feat(dashboard): add deterministic next-action dashboard

test(dashboard): verify lifecycle states and tenant isolation
```

Dilarang:

```text
amend
rebase
squash
reset
git clean
push
PR
merge
deploy
branch deletion
```

Rollback hanya menggunakan `git revert`, newest ke oldest.

---

# 29. Definition of Done

```text
[ ] final accepted IT-DIAG-06 SHA digunakan
[ ] branch berasal dari accepted IT-DIAG-06 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] IT-DIAG-06 prompt diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0007 tidak berubah
[ ] tidak ada migration baru
[ ] tidak ada dependency baru

[ ] authenticated dashboard route
[ ] tenant-safe business context
[ ] multiple-business handling
[ ] latest bill summary
[ ] accepted bill comparison reused
[ ] diagnostic progress summary
[ ] candidate maximum three
[ ] inspection summary
[ ] action-plan summary
[ ] outcome summary
[ ] closed-session summary

[ ] exactly one primary next action
[ ] deterministic next-action precedence
[ ] all empty states
[ ] no causal wording
[ ] no prediction
[ ] no saving estimate
[ ] no internal score
[ ] no raw JSON
[ ] no rule version exposure

[ ] bounded query strategy
[ ] no N+1 candidate query
[ ] no browser-side domain aggregation
[ ] feature flag server-side
[ ] cross-tenant dashboard denied
[ ] no cross-business mixing

[ ] unit tests lulus
[ ] integration tests lulus
[ ] accepted regression tests lulus
[ ] Node 24 typecheck lulus
[ ] Node 24 lint lulus
[ ] Node 24 build lulus
[ ] runtime smoke lulus
[ ] browser review lulus
[ ] responsive review lulus
[ ] keyboard review lulus
[ ] reduced-motion review lulus
[ ] audit dilaporkan jujur
[ ] Docker resources dibersihkan
[ ] workspace clean
[ ] no push/PR/merge/deploy
[ ] IT-DIAG-07B belum dimulai
[ ] AI/ML belum dimulai
```

---

# 30. Final Report

Laporkan:

```text
Status
Accepted base
Branch
Activation commit full SHA
Implementation commit full SHAs
Report/evidence commit full SHA
Final HEAD
Source hierarchy result

Dashboard route
Navigation changes
Business-context contract
Multiple-business behavior
Dashboard read model
Composition-service architecture
Query strategy
Bounded-query evidence
Feature flag

Latest-bill behavior
Bill-comparison behavior
Diagnostic-summary behavior
Candidate-summary behavior
Inspection-summary behavior
Action-summary behavior
Outcome-summary behavior
Closed-session behavior

Next-action precedence
Primary CTA mapping
Empty-state behavior
Safe-wording review
Causal-wording audit
Prediction audit
Saving-claim audit
Internal-field exposure audit

Tenant isolation
Cross-business isolation
Unit tests
Integration tests
Regression tests
Node/npm versions
Typecheck
Lint
Build
Runtime smoke
Browser review
Responsive review
Accessibility review
Reduced motion

Audit results
Dependency comparison
Changed files
Protected-directory diff
Migration diff
Docker cleanup
Git final state
Rollback commands
Known risks
Neon status
Preview readiness
IT-DIAG-07B status
AI/ML status
Final verdict
```

Final verdict hanya:

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW

NOT VERIFIED — CORRECTION REQUIRED

BLOCKED — DECISION REQUIRED
```

Agent tidak boleh menyatakan task accepted.

Setelah laporan:

```text
berhenti
jangan mengerjakan IT-DIAG-07B
jangan membuat monthly report
jangan mengerjakan entitlement
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
