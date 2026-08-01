# WattWise AI — Implementation Prompt IT-DIAG-05

## Rencana Hemat dan Safe Action Plan

Keputusan Product Owner:

```text
IT-DIAG-04 — ACCEPTED LOCALLY
```

Accepted base:

```text
84c89e81579d38edfa4c4d250780fcdcd732272b
```

Implementasikan tepat satu fase:

```text
IT-DIAG-05 — Rencana Hemat / Action Plan
```

Tujuan:

```text
inspection selesai
→ sistem menentukan opsi tindakan yang aman
→ pengguna memilih satu tindakan
→ baseline sebelum tindakan disimpan
→ tindakan dapat dimulai dan diselesaikan
→ evaluasi hasil ditunda sampai tagihan berikutnya
```

Action plan bukan diagnosis, bukan instruksi perbaikan, bukan prediksi, dan bukan jaminan penghematan.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=84c89e81579d38edfa4c4d250780fcdcd732272b
TARGET_BRANCH=feature/it-diag-05-action-plan
TARGET_PHASE=IT-DIAG-05

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md

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
```

---

# 2. Sumber Kebenaran

Baca lengkap sesuai urutan:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md
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

Jika canonical contract, active task, dan repository tidak dapat direkonsiliasi:

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
git log -10 --format="%H %s"
git diff --check
Get-ChildItem .\docs\tasks -File | Select-Object Name
```

Expected HEAD:

```text
84c89e81579d38edfa4c4d250780fcdcd732272b
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-05-action-plan `
  84c89e81579d38edfa4c4d250780fcdcd732272b
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
  84c89e81579d38edfa4c4d250780fcdcd732272b `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md
```

Pastikan tepat satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-05 action plan
```

Activation commit harus menjadi direct child dari accepted IT-DIAG-04 HEAD.

---

# 4. Scope

## Diizinkan

```text
energy action plan persistence
centralized versioned action catalog
candidate-to-action mapping
inspection-result-to-action mapping
safe action option generation
action selection
immutable action snapshots
immutable baseline snapshot
planned start date
action plan status
start action
complete action
cancel action
optional user note
action-plan resume
server-side eligibility
idempotency
concurrency protection
tenant authorization
migration dan rollback
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
outcome evaluation
before-after conclusion
saving calculation
saving estimation
percentage saving
Rupiah saving claim
ROI
payback period
forecast
prediction
machine learning
LLM
automatic recommendation based on AI
electrical repair instructions
equipment replacement recommendation
technician marketplace
payment
subscription changes
dashboard final
monthly report
IT-DIAG-06
push
PR
merge
deploy
Neon
production
```

---

# 5. Product Contract

IT-DIAG-05 menjawab:

```text
“Apa langkah aman yang akan dilakukan setelah pemeriksaan?”
```

IT-DIAG-05 tidak menjawab:

```text
“Apakah tindakan ini pasti menghemat listrik?”
“Berapa Rupiah yang akan dihemat?”
“Apakah alat harus diganti?”
```

Terminologi pengguna:

```text
Energy Action Plan → Rencana Hemat
Action option      → Pilihan Tindakan
Action status      → Status Rencana
Baseline           → Kondisi Sebelum Tindakan
Review target      → Evaluasi Tagihan Berikutnya
```

Disclaimer minimum:

```text
Rencana ini dibuat dari data tagihan dan hasil pengamatan yang Anda masukkan.

Rencana ini tidak menjamin besarnya penghematan dan bukan instruksi perbaikan kelistrikan.
```

---

# 6. Audit Sebelum Coding

Audit repository aktual:

```text
diagnostic_session schema dan lifecycle
diagnostic_candidate schema
inspection_plan schema
inspection_item schema
inspection result codes
candidate codes dan versions
inspection codes dan versions
completed inspection contract
bill snapshot dan comparison contract
BigInt Rupiah convention
milli-kWh convention
inclusive-day calculation
tenant authorization helpers
transaction convention
advisory-lock convention
repository/service convention
migration discovery
rollback convention
test database helpers
inspection completion UI
feature flags
```

Audit legacy Laravel secara read-only:

```text
energy action plan model
action catalog
candidate-to-action mapping
inspection-to-action mapping
action codes
action versions
status lifecycle
baseline fields
review target
tenant policies
action tests
safe wording
```

Legacy hanya evidence.

Jangan menyalin implementasi lama tanpa menyesuaikan canonical docs dan target architecture.

Sebelum coding, tentukan:

```text
exact accepted candidate codes
exact inspection result codes
action catalog taxonomy
action rule version
eligible action mapping
action plan lifecycle
baseline snapshot schema
idempotency strategy
concurrency strategy
route structure
test matrix
exact files planned
```

---

# 7. Eligibility

Action plan hanya dapat dibuat jika:

```text
authenticated user memiliki business
inspection plan milik business tersebut
inspection plan status = COMPLETED
inspection result tersedia
candidate dikenal
candidate version dikenal
inspection version dikenal
action catalog mapping tersedia
business masih aktif
diagnostic session tidak CLOSED
```

Action plan tidak boleh dibuat dari:

```text
inspection IN_PROGRESS
candidate tenant lain
inspection tenant lain
DATA_QUALITY candidate
candidate unknown
inspection version unknown
session DRAFT
session COLLECTING_CONTEXT
session ANALYZED tanpa completed inspection
session CLOSED
```

Client hanya boleh mengirim:

```text
inspectionPlanId
selectedActionCode
plannedStartDate
optional userNote
```

Client tidak boleh menentukan:

```text
businessId
userId
candidateCode
inspectionResult
actionVersion
actionRuleVersion
title
description
reason
steps
baseline
review mode
status
startedAt
completedAt
cancelledAt
estimated saving
```

Semua nilai authoritative harus ditentukan server.

---

# 8. Result-to-Action Contract

Gunakan exact result code accepted IT-DIAG-04:

```text
FOUND
NOT_FOUND
UNKNOWN
NEEDS_HELP
```

## FOUND

Tawarkan maksimal tiga candidate-specific action options.

Action harus:

```text
aman
reversible
tidak membutuhkan kompetensi kelistrikan
tidak membutuhkan pembongkaran
tidak menjanjikan penghematan
dapat dipantau pada periode berikutnya
```

## NEEDS_HELP

Tawarkan tepat satu action:

```text
REQUEST_COMPETENT_HELP
```

Wording:

```text
Minta bantuan orang yang kompeten untuk meninjau kondisi yang ditemukan.

Jangan membongkar, menyentuh instalasi, atau melakukan pengukuran listrik sendiri.
```

Jangan membuat marketplace atau memilih teknisi tertentu.

## UNKNOWN

Tawarkan tepat satu action:

```text
COLLECT_MISSING_INFORMATION
```

Wording:

```text
Kumpulkan informasi tambahan sebelum menentukan tindakan operasional.
```

Action dapat meminta pengguna:

```text
mencatat waktu kejadian
mencatat frekuensi penggunaan
memeriksa dokumen yang sudah tersedia
melanjutkan observasi aman
```

## NOT_FOUND

Tidak boleh membuat action plan dari inspection tersebut.

UI harus menampilkan:

```text
Tanda yang diperiksa belum ditemukan.

Pertimbangkan untuk memeriksa kandidat lain sebelum membuat Rencana Hemat.
```

Tidak ada CTA `Buat Rencana Hemat`.

---

# 9. Centralized Action Catalog

Buat action catalog yang:

```text
typed
centralized
immutable
versioned
deterministic
server-authoritative
```

Gunakan rule version:

```text
ACTION_PLAN_RULE_V1
```

Ikuti naming convention repository jika sudah ada versi canonical yang accepted.

Setiap action template minimum memiliki:

```text
actionCode
actionVersion
ruleVersion
candidateCode compatibility
candidateVersion compatibility
allowedInspectionResults
title
description
reason template
steps
priority
reviewMode
```

Setiap step minimum:

```text
stepCode
instruction
order
```

Action substantif yang berubah harus menaikkan version.

Jangan hardcode action wording tersebar di:

```text
page
component
Server Action
repository
database query
```

---

# 10. Candidate-Specific Action Catalog V1

Audit exact candidate codes dari IT-DIAG-03 sebelum menggunakan mapping.

Jangan menebak atau mengganti accepted candidate codes.

## 10.1 Administrasi Tagihan

Untuk result `FOUND`, action options dapat mencakup:

```text
REVIEW_BILL_RECORDS
PREPARE_OFFICIAL_PROVIDER_INQUIRY
```

### REVIEW_BILL_RECORDS

Langkah aman:

```text
bandingkan kembali tanggal periode
bandingkan nominal yang dimasukkan
catat perbedaan yang ditemukan
simpan sumber tagihan yang digunakan
```

### PREPARE_OFFICIAL_PROVIDER_INQUIRY

Langkah aman:

```text
kumpulkan rincian periode
kumpulkan nominal dan data yang tersedia
catat pertanyaan secara netral
gunakan kanal resmi penyedia jika perlu meminta penjelasan
```

Dilarang menyatakan penyedia melakukan kesalahan.

## 10.2 Perubahan Okupansi

Untuk result `FOUND`, action options dapat mencakup:

```text
TRACK_OCCUPANCY_AND_SHARED_USAGE
SET_SHARED_FACILITY_ROUTINE
```

Langkah aman:

```text
catat jumlah penghuni aktif
catat perubahan kamar aktif
catat penggunaan fasilitas bersama
buat rutinitas penggunaan yang realistis bersama penghuni
```

Jangan menyalahkan penghuni.

## 10.3 Kegiatan Khusus

Untuk result `FOUND`, action options dapat mencakup:

```text
LOG_SPECIAL_ACTIVITY
PLAN_RECURRING_ACTIVITY_SCHEDULE
```

Langkah aman:

```text
catat tanggal kegiatan khusus
catat durasi kegiatan
catat fasilitas yang digunakan
susun jadwal bila kegiatan akan berulang
```

Jangan menyatakan kegiatan tersebut pasti menyebabkan kenaikan.

## 10.4 Alat Listrik Baru

Untuk result `FOUND`, action options dapat mencakup:

```text
TRACK_APPLIANCE_OPERATING_TIME
SET_APPLIANCE_USAGE_ROUTINE
```

Langkah aman:

```text
catat kapan alat digunakan
catat durasi penggunaan
catat tujuan operasional
atur jam penggunaan sesuai kebutuhan nyata
baca manual resmi bila tersedia
```

Dilarang:

```text
membuka casing
mencabut kabel untuk pemeriksaan
mengukur daya
mengganti komponen
menyuruh menjual atau mengganti alat
```

## 10.5 Sistem Air atau Pompa

Untuk result `FOUND`, action options dapat mencakup:

```text
TRACK_PUMP_OPERATION
RECORD_WATER_DEMAND_AND_PUMP_ACTIVITY
```

Langkah aman:

```text
catat waktu pompa terdengar aktif dari area aman
catat perubahan kebutuhan air
catat kejadian aktivitas pompa di luar pola biasa
hentikan pencatatan jika kondisi tidak aman
```

Dilarang:

```text
menyentuh pompa
membuka pompa
membuka panel
mengukur listrik
menyentuh area basah dekat listrik
memberikan instruksi perbaikan
```

Jika inspection result `NEEDS_HELP`, hanya gunakan:

```text
REQUEST_COMPETENT_HELP
```

## 10.6 DATA_QUALITY

Tidak memiliki action plan dalam IT-DIAG-05 karena tidak memiliki completed physical inspection.

Jangan membuat action dari candidate DATA_QUALITY.

## 10.7 AC

Jangan membuat action template AC karena accepted questionnaire, candidate catalog, dan inspection catalog belum memiliki evidence AC.

---

# 11. Action Safety Guardrail

Semua action harus melewati safe-wording review.

Dilarang menginstruksikan:

```text
buka panel
buka casing
lepas kabel
pasang kabel
ukur tegangan
ukur arus
gunakan multimeter
bongkar perangkat
perbaiki perangkat
ganti komponen
ubah MCB
sentuh instalasi
mendekati air dekat listrik
operasikan alat yang tampak berbahaya
```

Dilarang menjanjikan:

```text
pasti hemat
akan menghemat
hemat 20%
hemat Rp500.000
tagihan pasti turun
ROI
payback
```

Wording yang diperbolehkan:

```text
dapat membantu pencatatan
dapat membantu mengevaluasi
akan dibandingkan pada tagihan berikutnya
hasil belum dapat dipastikan
```

---

# 12. Baseline Snapshot

Saat action plan dibuat, simpan baseline immutable.

Baseline berasal dari:

```text
diagnostic session
current electricity bill
comparison bill bila tersedia
candidate
completed inspection
```

Baseline minimum:

```text
sourceBillId
comparisonBillId nullable
periodStart
periodEnd
inclusiveDays

totalCostRupiah
costPerDayRupiah

totalKwhMilliKwh nullable
kwhPerDayMilliKwh nullable
tariffRupiahPerKwh nullable

comparisonPeriodStart nullable
comparisonPeriodEnd nullable
comparisonInclusiveDays nullable
comparisonTotalCostRupiah nullable
comparisonCostPerDayRupiah nullable
comparisonTotalKwhMilliKwh nullable
comparisonKwhPerDayMilliKwh nullable

candidateCode
candidateVersion
inspectionCode
inspectionVersion
inspectionResultCode
capturedAt
```

Aturan numerik:

```text
Rupiah disimpan sebagai exact decimal string
milli-kWh disimpan sebagai exact decimal string
jangan mengubah BigInt menjadi JavaScript Number
jangan menggunakan floating point untuk nilai authoritative
```

Baseline tidak boleh dihitung dari payload client.

Baseline tidak boleh berubah setelah plan dibuat, walaupun source record berubah pada masa depan.

Jangan menyimpan:

```text
password
email
token
cookie
secret
database URL
```

---

# 13. Persistence Model

Buat migration setelah `0005`.

Expected convention:

```text
drizzle/migrations/0006_energy_action_plans.sql
drizzle/rollbacks/0006_energy_action_plans_rollback.sql
```

Gunakan nama final sesuai convention repository.

Buat tabel minimum:

```text
energy_action_plan
```

Fields minimum:

```text
id
businessId
diagnosticCandidateId
inspectionPlanId

actionCode
actionVersion
ruleVersion

titleSnapshot
descriptionSnapshot
reasonSnapshot
stepsSnapshotJson

inspectionResultSnapshot
baselineSnapshotJson

status
reviewMode
plannedStartDate

userNote nullable

startedAt nullable
completedAt nullable
cancelledAt nullable

createdAt
updatedAt
```

Gunakan:

```text
reviewMode = NEXT_ELIGIBLE_BILL
```

Tidak perlu review mode tambahan pada fase ini.

Constraint minimum:

```text
foreign key ke business
foreign key ke diagnostic candidate
foreign key ke inspection plan

unique inspectionPlanId
actionVersion positif
valid status
valid review mode
steps JSON array nonkosong
baseline JSON object valid
user note maksimal 1.000 karakter

PLANNED tidak memiliki terminal timestamp
IN_PROGRESS wajib memiliki startedAt
COMPLETED wajib memiliki startedAt dan completedAt
CANCELLED wajib memiliki cancelledAt
COMPLETED dan CANCELLED tidak boleh bersamaan
```

Satu completed inspection hanya boleh memiliki satu action plan pada IT-DIAG-05.

Jangan mengubah migration `0000–0005`.

Migration wajib reversible:

```text
up
→ schema verification
→ down
→ schema verification
→ up
```

Build harus berhasil tanpa database aktif.

---

# 14. Action Plan Lifecycle

Status canonical:

```text
PLANNED
IN_PROGRESS
COMPLETED
CANCELLED
```

Initial state:

```text
PLANNED
```

Transition yang diizinkan:

```text
PLANNED → IN_PROGRESS
PLANNED → CANCELLED

IN_PROGRESS → COMPLETED
IN_PROGRESS → CANCELLED
```

Transition yang dilarang:

```text
COMPLETED → status lain
CANCELLED → status lain
IN_PROGRESS → PLANNED
```

Makna `COMPLETED`:

```text
Tindakan telah dilakukan oleh pengguna.
```

`COMPLETED` tidak berarti:

```text
tindakan berhasil menghemat
tagihan turun
penyebab telah terkonfirmasi
```

Setelah `COMPLETED` atau `CANCELLED`:

```text
action identity immutable
snapshots immutable
status immutable
planned date immutable
user note immutable
timestamps immutable
```

---

# 15. Planned Start Date

`plannedStartDate`:

```text
date-only ISO
wajib
divalidasi server
tidak boleh sebelum baseline bill period end
```

Jangan bergantung pada timezone browser untuk validasi authoritative.

Jangan meminta user menentukan tanggal evaluasi.

Review target selalu:

```text
Tagihan berikutnya yang eligible setelah tindakan dimulai.
```

IT-DIAG-06 akan menentukan exact comparison eligibility.

---

# 16. Create Idempotency dan Concurrency

Repeated create untuk inspection yang sama harus:

```text
mengembalikan action plan yang sama
tidak membuat duplicate
tidak membuat snapshot kedua
tidak mengubah selected action
```

Jika plan sudah ada dan client mengirim action code berbeda:

```text
jangan mengganti action
kembalikan existing plan atau safe conflict
```

Concurrent create test:

```text
dua request membuat plan dari inspection sama
→ tepat satu action plan
→ baseline snapshot sama
→ action snapshot sama
→ kedua caller menerima plan yang sama
→ tidak ada partial row
```

Gunakan:

```text
transaction
unique constraint
transaction-scoped advisory lock bila diperlukan
database authoritative timestamp
```

Start, complete, dan cancel harus idempotent untuk repeated identical request.

Concurrent completion harus menghasilkan status dan timestamp final yang sama.

---

# 17. Diagnostic Session Lifecycle

IT-DIAG-05 tidak menambahkan status diagnostic session baru.

Session tetap:

```text
INSPECTION_IN_PROGRESS
```

Ketika action plan dibuat, dimulai, diselesaikan, atau dibatalkan:

```text
jangan ubah session menjadi CLOSED
```

`CLOSED` dan outcome lifecycle adalah scope fase berikutnya.

---

# 18. Tenant Isolation

Ownership chain:

```text
authenticated user
→ owned business
→ owned electricity bill
→ owned diagnostic session
→ owned candidate
→ owned inspection plan
→ owned action plan
```

User A tidak boleh:

```text
melihat action options user B
membuat action plan dari inspection user B
membaca action plan user B
memulai action plan user B
menyelesaikan action plan user B
membatalkan action plan user B
mengubah actionCode melalui payload
mengubah baseline melalui payload
```

Cross-tenant access mengikuti existing not-found/forbidden convention tanpa membocorkan keberadaan data.

---

# 19. Architecture

Gunakan:

```text
React Server Components
→ Server Actions
→ Zod validation
→ Authorization
→ Action Plan Service
→ Repository
→ PostgreSQL
```

Pisahkan:

```text
action catalog
action eligibility resolver
baseline snapshot builder
action-plan service
action-plan repository
presentation mapper
```

Gunakan pure functions untuk:

```text
result-to-action resolution
candidate-to-action mapping
baseline serialization
status transition validation
safe copy mapping
```

Server authoritative untuk:

```text
eligible action options
action version
reason
steps
baseline
status transition
timestamps
review mode
```

Client tidak boleh menghitung atau menentukan hal tersebut.

Jangan menambah dependency baru.

---

# 20. Server Actions

Tambahkan Server Actions untuk:

```text
createActionPlan
startActionPlan
completeActionPlan
cancelActionPlan
```

Setiap action wajib:

```text
memerlukan authenticated user
memastikan journey eligibility
strict Zod validation
menolak unknown payload fields
memanggil tenant-safe service
tidak mengirim raw database error
melakukan revalidation
menggunakan redirect yang aman
```

Optional user note:

```text
maksimal 1.000 karakter
trim whitespace
empty string menjadi null
```

---

# 21. UI Minimum

Dari completed inspection page:

```text
/diagnostics/[sessionId]/inspections/[inspectionPlanId]
```

## FOUND

Tampilkan CTA:

```text
Buat Rencana Hemat
```

Tampilkan maksimal tiga action options.

## NEEDS_HELP

Tampilkan CTA:

```text
Buat Rencana Minta Bantuan
```

Hanya satu option:

```text
Minta bantuan orang yang kompeten
```

## UNKNOWN

Tampilkan CTA:

```text
Buat Rencana Lengkapi Informasi
```

## NOT_FOUND

Jangan tampilkan action-plan CTA.

Tampilkan:

```text
Periksa Kandidat Lain
```

Preferred routes:

```text
/diagnostics/[sessionId]/inspections/[inspectionPlanId]/actions
/diagnostics/[sessionId]/actions/[actionPlanId]
```

Gunakan route convention existing jika ada opsi lebih konsisten.

## Action selection page

Minimum:

```text
inspection result summary
candidate title
eligible action cards
action title
action description
reason
safe steps preview
planned start date
optional note
disclaimer
create pending state
double-submit protection
```

## Action detail page

Minimum:

```text
Rencana Hemat title
source candidate
source inspection result
status
planned start date
action steps
baseline summary
review target
optional note
start CTA
complete CTA
cancel CTA
terminal state
disclaimer
link kembali
```

Baseline UI hanya menampilkan informasi aman:

```text
periode baseline
total biaya
biaya per hari
kWh bila tersedia
```

Jangan tampilkan:

```text
raw JSON
database ID
action code
rule version
internal enum
raw BigInt
candidate score
estimated saving
predicted bill
probability
```

Status label:

```text
PLANNED     → Direncanakan
IN_PROGRESS → Sedang Dijalankan
COMPLETED   → Tindakan Selesai
CANCELLED   → Dibatalkan
```

Completion copy:

```text
Tindakan telah dicatat sebagai selesai.

Dampaknya belum dapat ditentukan sampai tagihan berikutnya tersedia.
```

Cancellation copy:

```text
Rencana dibatalkan. Tidak ada hasil penghematan yang disimpulkan.
```

---

# 22. Unit Tests

Minimum:

```text
action catalog code unik
action version positif
rule version stabil
mapping hanya untuk accepted candidate codes
FOUND menghasilkan candidate-specific options
NEEDS_HELP hanya menghasilkan REQUEST_COMPETENT_HELP
UNKNOWN hanya menghasilkan COLLECT_MISSING_INFORMATION
NOT_FOUND tidak menghasilkan option
DATA_QUALITY tidak menghasilkan action
no AC action
maksimal tiga options
option ordering deterministic
same input menghasilkan options identik

action wording tidak mengandung instruksi berbahaya
action wording tidak mengandung saving guarantee
action wording tidak mengandung probability
action wording tidak mengandung repair instruction

baseline snapshot exact
Rupiah tetap string
milli-kWh tetap string
missing kWh tetap null
inclusive days benar
comparison nullable aman

PLANNED transition valid
IN_PROGRESS transition valid
COMPLETED terminal
CANCELLED terminal
invalid transition ditolak

status labels exact
completion copy non-kausal
```

Forbidden wording audit harus memahami konteks.

Kalimat:

```text
Jangan membuka panel.
```

adalah safety warning dan tidak boleh ditolak sebagai instruksi membuka panel.

---

# 23. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
migration up/down/up
action plan insert
foreign keys
unique inspection plan constraint
status constraints
timestamp constraints
note limit
JSON constraints

create dari completed FOUND inspection
create dari completed NEEDS_HELP inspection
create dari completed UNKNOWN inspection
NOT_FOUND create ditolak
DATA_QUALITY create ditolak
IN_PROGRESS inspection create ditolak
unknown candidate create ditolak
unknown action code ditolak
action code tidak sesuai candidate ditolak
action code tidak sesuai result ditolak

baseline snapshot tersimpan exact
inspection result snapshot tersimpan
action snapshots tersimpan
review mode NEXT_ELIGIBLE_BILL

repeated create idempotent
concurrent create satu row
concurrent create satu snapshot
different action retry tidak mengganti existing plan

start action
repeated start idempotent
complete action
repeated completion idempotent
concurrent completion konsisten
cancel PLANNED
cancel IN_PROGRESS
completed immutable
cancelled immutable
invalid transition ditolak

cross-tenant options ditolak
cross-tenant create ditolak
cross-tenant read ditolak
cross-tenant start ditolak
cross-tenant complete ditolak
cross-tenant cancel ditolak
spoofed businessId ditolak
spoofed baseline ditolak
spoofed result ditolak

diagnostic session tetap INSPECTION_IN_PROGRESS
session tidak menjadi CLOSED
migration 0000–0005 tidak berubah
```

---

# 24. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
authentication
plan/trial
onboarding
business
bill input
bill comparison
BigInt Rupiah
bill overlap concurrency
tenant isolation
diagnostic session
questionnaire
candidate generation
candidate ranking
DATA_QUALITY
guided inspection
inspection safety
inspection idempotency
inspection concurrency
inspection aggregate result
completed inspection immutability
responsive UI
reduced motion
```

Jangan menghapus, skip, atau melemahkan accepted tests.

---

# 25. Runtime Smoke

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
complete plan/onboarding/business Kos
create two bills
complete questionnaire
generate candidates
complete FOUND inspection
open action options
select candidate-specific action
create action plan
verify baseline snapshot
leave page
resume plan
start action
reload
verify IN_PROGRESS
complete action
verify terminal state
verify no saving conclusion
verify diagnostic session not CLOSED

complete NEEDS_HELP inspection
verify only professional-help action

complete UNKNOWN inspection
verify only information-collection action

complete NOT_FOUND inspection
verify no Rencana Hemat CTA

logout

register user B
attempt action route user A
verify 404
attempt start/complete/cancel user A plan
verify denied
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

# 26. Browser Verification

Routes minimum:

```text
/bills
/diagnostics/[sessionId]
/diagnostics/[sessionId]/results
/diagnostics/[sessionId]/inspections/[inspectionPlanId]
/diagnostics/[sessionId]/inspections/[inspectionPlanId]/actions
/diagnostics/[sessionId]/actions/[actionPlanId]
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
/bills/new
```

Viewport:

```text
360×800
768×1024
1280×800
```

Verify:

```text
FOUND Rencana Hemat CTA
NEEDS_HELP professional-help CTA
UNKNOWN information CTA
NOT_FOUND no action CTA
action cards
planned date validation
optional note
create pending state
double-submit protection
plan resume
start transition
complete transition
cancel transition
terminal immutability
baseline display
review-next-bill copy
no saving estimate
no prediction
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
cross-tenant route 404
```

Jangan menyatakan browser PASS tanpa evidence.

---

# 27. Node.js 24 Quality Gates

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

Laporkan exact command dan exit code.

Accepted baseline reference:

```text
npm audit:
4 moderate
12 high
0 critical

npm audit --omit=dev:
4 moderate
3 high
0 critical
```

Advisory database dapat berubah.

Bandingkan accepted-base dan current lockfile menggunakan advisory database yang sama.

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

# 28. Hard Stops

Berhenti jika:

```text
accepted base tidak ditemukan
workspace kotor atau divergen
lebih dari satu active task
canonical action-plan contract konflik
accepted candidate atau inspection code tidak dapat dipetakan
baseline exact tidak dapat dipertahankan
Rupiah atau kWh membutuhkan floating point
action memerlukan instruksi perbaikan
action menjanjikan penghematan
NOT_FOUND menghasilkan Rencana Hemat
DATA_QUALITY menghasilkan action plan
tenant isolation gagal
concurrent create membuat duplicate
status terminal dapat dimutasi
diagnostic session menjadi CLOSED
dependency baru diperlukan
production atau Neon diperlukan
build membutuhkan database aktif
scope mulai mengerjakan outcome evaluation
scope mulai menghitung saving
scope mulai mengerjakan IT-DIAG-06
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

# 29. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-05 action plan
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(actions): add tenant-safe action plan persistence

feat(actions): add versioned safe action catalog and workflow

test(actions): verify baseline lifecycle and tenant isolation
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

# 30. Definition of Done

```text
[ ] branch berasal dari accepted IT-DIAG-04 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] IT-DIAG-04 prompt diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0005 tidak berubah
[ ] migration 0006 tersedia
[ ] rollback 0006 tersedia
[ ] migration up/down/up lulus

[ ] centralized action catalog
[ ] action rule version
[ ] action code/version snapshots
[ ] candidate-specific mapping
[ ] inspection-result mapping
[ ] FOUND actions aman
[ ] NEEDS_HELP hanya professional help
[ ] UNKNOWN hanya information collection
[ ] NOT_FOUND tanpa action
[ ] DATA_QUALITY tanpa action
[ ] no AC action
[ ] maximum three options
[ ] deterministic ordering

[ ] baseline immutable
[ ] Rupiah exact string
[ ] kWh exact string
[ ] review mode NEXT_ELIGIBLE_BILL
[ ] no saving estimate
[ ] no prediction
[ ] no repair recommendation

[ ] PLANNED
[ ] IN_PROGRESS
[ ] COMPLETED
[ ] CANCELLED
[ ] valid transitions
[ ] terminal immutability
[ ] create idempotent
[ ] concurrent create satu plan
[ ] start idempotent
[ ] completion idempotent
[ ] concurrent completion konsisten
[ ] cancellation aman

[ ] tenant-safe options
[ ] tenant-safe create
[ ] tenant-safe read
[ ] tenant-safe start
[ ] tenant-safe complete
[ ] tenant-safe cancel
[ ] session tetap INSPECTION_IN_PROGRESS
[ ] session tidak CLOSED

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
[ ] dependency tidak berubah
[ ] audit dilaporkan jujur
[ ] Docker resources dibersihkan
[ ] workspace clean
[ ] no push/PR/merge/deploy
[ ] IT-DIAG-06 belum dimulai
[ ] AI/ML belum dimulai
```

---

# 31. Final Report

Laporkan:

```text
Status
Accepted base
Branch
Activation commit full SHA
Implementation commit full SHAs
Source hierarchy result

Migration dan rollback
Migration up/down/up
Action plan schema
Action catalog
Action rule version
Action codes dan versions
Candidate-to-action mapping
Inspection-result mapping
FOUND behavior
NEEDS_HELP behavior
UNKNOWN behavior
NOT_FOUND behavior
DATA_QUALITY behavior

Baseline snapshot schema
Rupiah representation
kWh representation
Review mode
Planned start validation

Plan lifecycle
Status transitions
Terminal immutability
Create idempotency
Concurrent create
Start idempotency
Concurrent completion
Cancellation behavior

Session lifecycle
Tenant isolation
Safe wording review
Forbidden-instruction audit
Saving-claim audit

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
Docker cleanup
Git final state
Rollback commands
Known risks
Neon status
Preview readiness
IT-DIAG-06 status
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
jangan mengerjakan IT-DIAG-06
jangan mengevaluasi before-after
jangan menghitung penghematan
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
