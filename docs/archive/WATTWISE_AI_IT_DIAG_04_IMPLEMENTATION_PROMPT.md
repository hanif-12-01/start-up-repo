# WattWise AI — Implementation Prompt IT-DIAG-04

## Guided Inspection dan Safe Observation Checklist

Keputusan Product Owner:

```text
IT-DIAG-03 — ACCEPTED LOCALLY
```

Accepted base:

```text
d3c23f9a465af97f6ac8b03c8f77d22826610f4e
```

Implementasikan tepat satu fase:

```text
IT-DIAG-04 — Guided Inspection
```

Tujuan fase:

```text
Bagian yang Perlu Dicek
→ pengguna memulai pemeriksaan
→ sistem menampilkan checklist observasi yang aman
→ pengguna mencatat hasil setiap langkah
→ hasil pemeriksaan disimpan secara tenant-safe
```

Guided Inspection bukan diagnosis kerusakan, bukan instruksi perbaikan, dan bukan pengganti teknisi.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=d3c23f9a465af97f6ac8b03c8f77d22826610f4e
TARGET_BRANCH=feature/it-diag-04-guided-inspection
TARGET_PHASE=IT-DIAG-04

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md

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
4. docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md
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

Jika canonical contract, repository, dan active task tidak dapat direkonsiliasi:

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

Expected accepted HEAD:

```text
d3c23f9a465af97f6ac8b03c8f77d22826610f4e
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-04-guided-inspection `
  d3c23f9a465af97f6ac8b03c8f77d22826610f4e
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
  d3c23f9a465af97f6ac8b03c8f77d22826610f4e `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md
```

Pastikan hanya ada satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-04 guided inspection
```

Activation commit harus menjadi direct child dari accepted IT-DIAG-03 HEAD.

---

# 4. Scope

## Diizinkan

```text
inspection plan persistence
inspection item persistence
centralized inspection catalog
inspection catalog version
candidate-specific checklist
safe observation instructions
safety level
start inspection
resume inspection
record item result
optional item note
complete inspection plan
aggregate inspection result
inspection idempotency
concurrent-start protection
tenant authorization
session transition ke INSPECTION_IN_PROGRESS
migration dan rollback
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
action plan
Rencana Hemat
recommendation
candidate-to-action conversion
saving estimation
replacement recommendation
repair instruction
electrical diagnosis
technician marketplace
outcome evaluation
prediction
machine learning
LLM
photo or video analysis
file upload
IoT
sensor integration
dashboard final
PDF report
pricing changes
subscription changes
IT-DIAG-05
push
PR
merge
deploy
Neon
production
```

---

# 5. Canonical Safety Boundaries

Instruksi hanya boleh berupa observasi aman.

Dilarang menginstruksikan pengguna untuk:

```text
membuka panel listrik
membuka stop kontak
membuka casing perangkat
melepas atau memasang kabel
menyentuh instalasi
memegang bagian listrik
mengukur tegangan atau arus
menggunakan multimeter
memperbaiki perangkat
membongkar pompa
mengubah MCB
mengganti komponen
mengoperasikan perangkat yang terlihat rusak
mendekati bagian basah yang berdekatan dengan listrik
```

Instruksi yang diperbolehkan:

```text
melihat kondisi dari jarak aman
mendengarkan suara tanpa menyentuh perangkat
memeriksa data pada tagihan
mengonfirmasi perubahan jumlah penghuni
mengonfirmasi jadwal kegiatan
mengamati kebocoran yang terlihat dari area aman
mengamati apakah pompa terdengar aktif
mencatat bau terbakar, asap, percikan, atau panas tidak biasa tanpa mendekat
menghentikan pemeriksaan dan mencari bantuan
```

Jika terdapat:

```text
asap
percikan
bau terbakar
kabel terbuka
air dekat instalasi listrik
suara keras yang tidak biasa
perangkat terlalu panas
risiko keselamatan lain
```

checklist harus mengarahkan:

```text
Jangan menyentuh atau membongkar perangkat.
Hentikan pemeriksaan dan minta bantuan teknisi yang kompeten.
```

Jangan memberikan instruksi teknis lanjutan.

---

# 6. Product Owner Decision — Safety Levels

Gunakan safety level internal berikut:

```text
SAFE_OBSERVATION
PROFESSIONAL_REQUIRED
```

## SAFE_OBSERVATION

Berarti langkah dapat dilakukan hanya melalui:

```text
pengamatan visual dari area aman
mendengarkan tanpa menyentuh perangkat
membaca data yang sudah tersedia
mengonfirmasi kejadian atau kebiasaan operasional
```

## PROFESSIONAL_REQUIRED

Berarti:

```text
pengguna tidak diminta melakukan pemeriksaan teknis
pengguna diperintahkan berhenti
pengguna diarahkan mencari bantuan orang yang kompeten
```

`PROFESSIONAL_REQUIRED` bukan izin untuk memberikan langkah perbaikan.

Label pengguna:

```text
SAFE_OBSERVATION      → Aman untuk diamati
PROFESSIONAL_REQUIRED → Hentikan dan minta bantuan
```

Jangan menampilkan enum internal secara langsung.

---

# 7. Audit Sebelum Coding

Audit repository aktual:

```text
diagnostic_session schema
diagnostic_candidate schema
candidate types dan codes
candidate result route
candidate authorization
session lifecycle
candidate generation version
transaction convention
advisory-lock convention
repository/service convention
migration discovery
rollback convention
test database helper
existing feature flags
existing UI components
existing Server Action convention
```

Audit legacy Laravel secara read-only:

```text
inspection plan model
inspection item model
inspection catalog
inspection codes
safety levels
candidate-to-checklist mapping
result codes
plan lifecycle
item lifecycle
completion rules
tenant policies
inspection tests
safe wording
```

Legacy hanya evidence.

Jangan menyalin implementasi lama tanpa menyesuaikan target architecture dan canonical contract.

Sebelum coding, tentukan:

```text
inspection taxonomy
inspection version
plan lifecycle
item lifecycle
result-code contract
completion contract
candidate eligibility
idempotency strategy
session transition
candidate-to-checklist mapping
safe wording
migration plan
test matrix
exact files planned
```

---

# 8. Inspection Eligibility

Inspection hanya dapat dimulai jika:

```text
candidate milik authenticated tenant
candidate berasal dari diagnostic session milik tenant
session status = ANALYZED atau INSPECTION_IN_PROGRESS
candidate rank valid
candidate version dikenal
candidate rule version dikenal
inspection template tersedia untuk candidate tersebut
```

Inspection tidak boleh dimulai untuk:

```text
session DRAFT
session COLLECTING_CONTEXT
session CLOSED
candidate tenant lain
candidate identifier tidak dikenal
candidate hasil manipulasi client
candidate tanpa template aman
```

Client tidak boleh menentukan:

```text
businessId
userId
candidateType
candidateCode
inspectionVersion
safetyLevel
instruction
resultCode aggregate
session status
plan status
```

Semua nilai tersebut harus diperoleh dan diverifikasi dari server.

---

# 9. DATA_QUALITY Candidate

Candidate `DATA_QUALITY` tidak boleh menghasilkan pemeriksaan fisik perangkat.

Untuk candidate kelengkapan informasi:

```text
jangan membuat checklist kelistrikan
jangan meminta pengguna memeriksa perangkat
jangan mengubah status session menjadi INSPECTION_IN_PROGRESS hanya karena DATA_QUALITY
```

Tampilkan state aman:

```text
Informasi yang tersedia belum cukup untuk memulai pemeriksaan terarah.

Periksa kembali data tagihan dan jawaban yang Anda masukkan sebelum melanjutkan.
```

Jangan membuat fitur edit tagihan atau edit questionnaire baru dalam IT-DIAG-04.

Candidate non-inspectable tidak memiliki CTA `Mulai Pemeriksaan`.

---

# 10. Inspection Catalog

Checklist tidak boleh hardcoded tersebar di page, action, repository, dan component.

Buat satu catalog typed, centralized, immutable, dan versioned.

Gunakan rule version eksplisit, misalnya:

```text
INSPECTION_RULE_V1
```

Ikuti naming convention repository jika sudah ada yang accepted.

Setiap inspection template minimum memiliki:

```text
inspectionCode
inspectionVersion
ruleVersion
candidateCode
candidateVersion compatibility
title
intro
items
completionCopy
```

Setiap item minimum memiliki:

```text
itemCode
itemVersion
instruction
safetyLevel
order
resultOptions
```

Saat plan dibuat, simpan snapshot instruksi dan safety level.

Perubahan substantif pada instruksi harus menghasilkan item version atau inspection version baru.

Published checklist tidak boleh berubah diam-diam.

---

# 11. Candidate-Specific Checklists

Buat checklist P0 hanya untuk candidate yang benar-benar dihasilkan IT-DIAG-03.

Audit exact accepted candidate codes terlebih dahulu.

Jangan menebak candidate code.

## 11.1 Administrasi Tagihan

Observasi yang boleh digunakan:

```text
periksa kembali tanggal awal dan akhir periode
periksa apakah cara pencatatan berbeda
periksa apakah nominal sesuai data yang dimasukkan
periksa apakah informasi tarif atau daya berubah jika tercantum
periksa apakah bill period berbeda panjang
```

Dilarang:

```text
mengklaim kesalahan PLN
menyatakan tagihan resmi salah
mengubah data secara otomatis
menebak tarif
```

## 11.2 Perubahan Okupansi

Observasi yang boleh digunakan:

```text
konfirmasi jumlah penghuni pada periode saat ini
konfirmasi apakah ada tamu atau penghuni sementara
konfirmasi apakah kamar aktif bertambah
konfirmasi apakah fasilitas bersama lebih sering digunakan
```

Jangan menyalahkan penghuni.

## 11.3 Kegiatan Khusus atau Operasional

Observasi yang boleh digunakan:

```text
konfirmasi acara atau kegiatan khusus
konfirmasi perubahan jam aktivitas
konfirmasi penggunaan fasilitas bersama lebih lama
konfirmasi pekerjaan renovasi atau kegiatan sementara
```

Jangan menganggap korelasi sebagai penyebab pasti.

## 11.4 Alat Listrik Baru

Observasi yang boleh digunakan:

```text
konfirmasi alat baru yang terlihat
catat kapan alat mulai digunakan
catat seberapa sering alat digunakan
baca label perangkat hanya jika mudah terlihat tanpa memindahkan atau membongkar
```

Dilarang:

```text
membuka casing
mencabut kabel untuk inspeksi
memegang kabel rusak
mengukur daya
menyuruh mengganti alat
```

## 11.5 Sistem Air atau Pompa

Observasi yang boleh digunakan:

```text
dengarkan dari area aman apakah pompa lebih sering aktif
amati kebocoran yang terlihat tanpa mendekati instalasi listrik
konfirmasi apakah aliran air atau kebutuhan air berubah
catat apakah pompa terdengar aktif saat tidak ada penggunaan air yang diketahui
```

Dilarang:

```text
menyentuh pompa
membuka pompa
membuka panel
menyentuh area basah di dekat listrik
mengukur listrik
menguji komponen
```

Jika ada air dekat listrik, kabel terbuka, bau terbakar, panas, atau suara berbahaya:

```text
PROFESSIONAL_REQUIRED
```

Jangan membuat checklist AC karena accepted questionnaire dan candidate catalog saat ini tidak menyediakan evidence AC.

---

# 12. Persistence Model

Buat migration baru setelah `0004`.

Expected convention:

```text
drizzle/migrations/0005_guided_inspections.sql
drizzle/rollbacks/0005_guided_inspections_rollback.sql
```

Gunakan nama final sesuai convention repository.

Pertimbangkan model minimum berikut.

## inspection_plan

```text
id
businessId
diagnosticCandidateId
inspectionCode
inspectionVersion
ruleVersion
title
status
resultCode nullable
userNote nullable
startedAt
completedAt nullable
createdAt
updatedAt
```

## inspection_item

```text
id
inspectionPlanId
itemCode
itemVersion
instructionSnapshot
safetyLevel
sortOrder
status
answerCode nullable
note nullable
completedAt nullable
createdAt
updatedAt
```

Gunakan naming dan ID convention repository aktual.

Constraint minimum:

```text
foreign key inspection_plan → business
foreign key inspection_plan → diagnostic_candidate
foreign key inspection_item → inspection_plan

unique candidate + inspectionCode + inspectionVersion + ruleVersion
unique inspectionPlan + itemCode + itemVersion

valid plan status
valid item status
valid result code
valid safety level
sortOrder positif
note memiliki batas panjang
```

Jangan mengubah migration `0000–0004`.

Migration wajib reversible:

```text
up
→ schema verification
→ down
→ schema verification
→ up
```

Build tidak boleh membutuhkan database aktif.

---

# 13. Plan Lifecycle

Gunakan status plan:

```text
IN_PROGRESS
COMPLETED
```

Plan dibuat langsung sebagai:

```text
IN_PROGRESS
```

Tidak perlu status tambahan jika canonical atau repository tidak memerlukannya.

Plan transition:

```text
IN_PROGRESS
→ COMPLETED
```

Setelah `COMPLETED`:

```text
item answer immutable
item note immutable
plan result immutable
user note immutable
```

Editing completed inspection bukan scope IT-DIAG-04.

---

# 14. Item Lifecycle dan Answer Codes

Gunakan item status:

```text
PENDING
ANSWERED
```

Gunakan answer code internal:

```text
FOUND
NOT_FOUND
UNKNOWN
NEEDS_HELP
```

Label pengguna:

```text
FOUND       → Ditemukan Masalah
NOT_FOUND   → Tidak Ditemukan
UNKNOWN     → Tidak Tahu
NEEDS_HELP  → Butuh Bantuan
```

Semantics:

```text
FOUND
→ pengguna mengamati tanda yang relevan

NOT_FOUND
→ pengguna tidak mengamati tanda tersebut

UNKNOWN
→ pengguna tidak dapat menentukan

NEEDS_HELP
→ pemeriksaan tidak aman atau memerlukan orang kompeten
```

`UNKNOWN` dan `NEEDS_HELP` adalah jawaban valid.

`NEEDS_HELP` tidak boleh dianggap `FOUND`.

Repeated submission dengan answer dan note yang sama harus idempotent.

Sebelum plan selesai, pengguna boleh mengubah jawaban item.

Setelah plan selesai, seluruh jawaban immutable.

Batas note yang disarankan:

```text
maksimal 1.000 karakter
```

Gunakan strict validation dan tolak unknown payload fields.

---

# 15. Plan Completion Contract

Plan hanya dapat diselesaikan ketika seluruh item telah berstatus:

```text
ANSWERED
```

`UNKNOWN` dan `NEEDS_HELP` dihitung sebagai jawaban lengkap.

Aggregate result ditentukan server-side:

```text
jika minimal satu item = NEEDS_HELP
→ plan result = NEEDS_HELP

else jika minimal satu item = FOUND
→ plan result = FOUND

else jika seluruh item = NOT_FOUND
→ plan result = NOT_FOUND

else
→ plan result = UNKNOWN
```

Urutan di atas wajib deterministic.

Client tidak boleh mengirim aggregate result.

Completion harus atomic:

```text
validate all items
→ compute aggregate result
→ update plan COMPLETED
→ set completedAt
```

Jika completion gagal:

```text
plan tetap IN_PROGRESS
tidak ada partial state
```

---

# 16. Idempotency dan Concurrency

Repeated start untuk candidate dan inspection version yang sama harus:

```text
mengembalikan plan yang sama
tidak membuat duplicate plan
tidak membuat duplicate items
```

Concurrent start test wajib:

```text
dua request start concurrent
→ hanya satu plan tersimpan
→ satu set item tersimpan
→ kedua request mendapat hasil idempotent setara
→ tidak ada partial item
```

Gunakan:

```text
transaction
unique constraint
transaction-scoped advisory lock jika diperlukan
```

Repeated item submission yang sama harus idempotent.

Concurrent completion wajib menghasilkan satu final result yang konsisten.

Tidak boleh ada leaked lock.

---

# 17. Diagnostic Session Lifecycle

IT-DIAG-04 hanya mengizinkan transition:

```text
ANALYZED
→ INSPECTION_IN_PROGRESS
```

Transition terjadi atomically ketika inspection plan inspectable pertama berhasil dibuat.

Jika start inspection gagal:

```text
session tetap ANALYZED
```

Jika session sudah `INSPECTION_IN_PROGRESS`, pengguna boleh:

```text
melanjutkan existing plan
memulai plan untuk kandidat inspectable lain milik session yang sama
```

IT-DIAG-04 tidak boleh mengubah session menjadi:

```text
CLOSED
```

Menyelesaikan satu atau seluruh inspection plan tidak menutup diagnostic session.

Penutupan dan action plan berada di fase berikutnya.

---

# 18. Safe Wording

Terminologi pengguna:

```text
Guided Inspection → Panduan Pemeriksaan
Inspection Plan   → Pemeriksaan
Inspection Item   → Langkah Pemeriksaan
Result            → Hasil Pengamatan
```

Intro minimum:

```text
Ikuti langkah berikut hanya jika dapat dilakukan dari area yang aman.

Jangan membuka, membongkar, menyentuh instalasi, atau melakukan pengukuran listrik.
```

Disclaimer minimum:

```text
Panduan ini hanya membantu observasi awal berdasarkan data yang Anda masukkan. Ini bukan diagnosis kerusakan atau pengganti teknisi.
```

Contoh wording aman:

```text
Amati dari jarak aman apakah terdapat kebocoran yang terlihat.

Dengarkan tanpa menyentuh perangkat apakah pompa lebih sering aktif.

Periksa kembali tanggal periode pada data tagihan yang Anda masukkan.
```

Dilarang:

```text
Pompa Anda rusak.
Buka panel dan periksa kabel.
Gunakan multimeter untuk mengukur tegangan.
Lepaskan kabel pompa.
Ganti pompa.
Perbaiki kebocoran sekarang.
Matikan MCB lalu buka casing.
Masalah ini pasti penyebab kenaikan.
```

---

# 19. UI Minimum

Dari result candidate page:

```text
/diagnostics/[sessionId]/results
```

Candidate inspectable memiliki CTA:

```text
Mulai Pemeriksaan
```

Jika plan sudah ada:

```text
Lanjutkan Pemeriksaan
```

Candidate `DATA_QUALITY` tidak memiliki CTA pemeriksaan fisik.

Preferred route setelah audit:

```text
/diagnostics/[sessionId]/inspections/[inspectionPlanId]
```

Gunakan route convention existing jika ada pilihan yang lebih konsisten.

UI minimum:

```text
judul pemeriksaan
candidate yang sedang diperiksa
periode tagihan
safety notice
progress item
satu langkah atau kelompok langkah yang mudah dibaca
instruction
safety label
empat pilihan hasil
optional note
pending state
resume state
completion state
aggregate result
disclaimer
kembali ke Hasil Cek Kenaikan
```

Jangan menampilkan:

```text
internal database ID
inspection rule code
item code
raw enum
raw JSON
candidate score
probability
repair recommendation
saving recommendation
```

Completion copy aman:

```text
Pemeriksaan telah dicatat.

Hasil ini merupakan pengamatan awal dan belum menjadi diagnosis kerusakan.
```

Untuk `NEEDS_HELP`:

```text
Pemeriksaan memerlukan bantuan orang yang kompeten. Jangan melanjutkan langkah teknis sendiri.
```

Untuk `NOT_FOUND`:

```text
Tanda yang diperiksa belum ditemukan. Hasil ini tidak membuktikan bahwa tidak ada faktor lain.
```

Untuk `FOUND`:

```text
Ada tanda yang perlu ditindaklanjuti. Hasil ini belum memastikan penyebab kenaikan tagihan.
```

Untuk `UNKNOWN`:

```text
Hasil pemeriksaan belum dapat ditentukan dari pengamatan saat ini.
```

---

# 20. Architecture

Gunakan:

```text
React Server Components
→ Server Actions
→ Zod validation
→ Authorization
→ Inspection Service
→ Repository
→ PostgreSQL
```

Pisahkan:

```text
inspection catalog
inspection plan service
inspection result resolver
inspection repository
presentation mapper
```

Server authoritative untuk:

```text
candidate eligibility
template selection
safety level
item creation
answer validation
aggregate result
plan completion
session transition
```

Client Component hanya untuk:

```text
pending interaction
answer controls bila diperlukan
existing restrained motion
```

Dilarang:

```text
authorization client-side saja
aggregate result dihitung browser
instruction berasal dari hidden field
safety level dipercaya dari client
database query di presentational component
mutable global checklist state
randomized item order
```

Jangan menambah dependency baru.

---

# 21. Tenant Isolation

Ownership chain:

```text
authenticated user
→ owned business
→ owned electricity bill
→ owned diagnostic session
→ owned candidate
→ owned inspection plan
→ owned inspection items
```

User A tidak boleh:

```text
memulai inspection candidate user B
membaca inspection plan user B
menjawab item user B
menyelesaikan plan user B
mengakses route plan user B
mengubah candidateId atau planId untuk tenant lain
```

Gunakan existing not-found/forbidden convention tanpa membocorkan keberadaan data tenant lain.

---

# 22. Unit Tests

Minimum:

```text
inspection catalog code unik
inspection version stabil
candidate mapping valid
unknown candidate tidak mendapat template
DATA_QUALITY non-inspectable
item order deterministic
instruction snapshot deterministic
safety level valid
all instructions memenuhi safe-wording contract
forbidden electrical instruction detector/test
FOUND mapping
NOT_FOUND mapping
UNKNOWN mapping
NEEDS_HELP mapping
same item answer retry idempotent
answer dapat diubah sebelum completion
answer immutable setelah completion
aggregate NEEDS_HELP precedence
aggregate FOUND precedence
aggregate all NOT_FOUND
aggregate mixed UNKNOWN
completion membutuhkan semua item answered
completed plan immutable
candidate administrative checklist
candidate occupancy checklist
candidate operational checklist
candidate new-appliance checklist
candidate water-system checklist
no AC checklist
no repair wording
no causal wording
no action-plan output
```

Tambahkan test eksplisit bahwa instruction catalog tidak berisi istilah berbahaya seperti:

```text
buka panel
lepas kabel
ukur tegangan
multimeter
bongkar
perbaiki
ganti komponen
```

Test wording harus tetap mempertimbangkan konteks kalimat larangan.

Jangan membuat assertion naif yang menolak safety warning seperti:

```text
Jangan membuka panel.
```

---

# 23. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
migration up/down/up
inspection plan insert
inspection item insert
foreign keys
unique constraints
start plan untuk inspectable candidate
DATA_QUALITY start ditolak
unknown candidate start ditolak
start dari ANALYZED berhasil
session menjadi INSPECTION_IN_PROGRESS
failed start tidak mengubah session
start dari COLLECTING_CONTEXT ditolak
start dari CLOSED ditolak
repeated start idempotent
concurrent start satu plan
concurrent start satu item set
item answer tersimpan
same-answer retry tidak duplicate
item answer dapat diperbarui sebelum completion
invalid answer ditolak
invalid item ditolak
cross-plan item tampering ditolak
completion sebelum semua answered ditolak
completion aggregate FOUND
completion aggregate NOT_FOUND
completion aggregate UNKNOWN
completion aggregate NEEDS_HELP
completed plan immutable
resume plan
second candidate inspection pada session yang sama
cross-tenant start ditolak
cross-tenant read ditolak
cross-tenant answer ditolak
cross-tenant complete ditolak
spoofed businessId/userId/resultCode ditolak
migration historis 0000–0004 tidak berubah
```

Concurrent completion test harus membuktikan:

```text
final result konsisten
completedAt hanya satu state final
tidak ada partial update
```

---

# 24. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
auth
plan/trial
onboarding
business
bill input
bill comparison
BigInt Rupiah
bill overlap concurrency
tenant isolation
diagnostic session
questionnaire routing
UNKNOWN
NOT_APPLICABLE
candidate generation
candidate ranking
supporting factors
contradicting factors
DATA_QUALITY
all-UNKNOWN
all-NO zero-state
candidate concurrency
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
open result page
start inspection kandidat inspectable
verify session becomes INSPECTION_IN_PROGRESS
answer FOUND
answer NOT_FOUND
answer UNKNOWN
answer NEEDS_HELP pada scenario terpisah
leave page
resume inspection
complete plan
verify aggregate result
reload
verify result unchanged
verify completed plan immutable
return to candidate results
start second candidate inspection
logout

register user B
attempt plan route user A
verify access denied
attempt answer item user A
verify access denied
attempt complete plan user A
verify access denied
```

Tambahkan scenario:

```text
DATA_QUALITY candidate
→ no physical-inspection CTA
→ no inspection plan created
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
Mulai Pemeriksaan CTA
Lanjutkan Pemeriksaan CTA
DATA_QUALITY tanpa inspection CTA
safety notice terlihat
SAFE_OBSERVATION label
PROFESSIONAL_REQUIRED label
FOUND selection
NOT_FOUND selection
UNKNOWN selection
NEEDS_HELP selection
optional note
pending state
double-submit protection
resume state
completion state
aggregate result
completed immutable state
keyboard interaction
visible focus
reduced motion
native scrolling
no horizontal overflow
no clipped text
no hydration warning
no React warning
no GSAP warning
no console error
no HTTP 5xx
cross-tenant route 404
```

Jangan mengklaim browser PASS tanpa evidence.

---

# 27. Node.js 24 Quality Gates

Gunakan Docker:

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

Accepted IT-DIAG-03 reference:

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

Jika dependency berubah atau vulnerability memburuk karena task:

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
canonical inspection contract konflik
accepted candidate code tidak dapat dipetakan
checklist membutuhkan tindakan teknis berbahaya
safety level tidak dapat disimpan aman
instruction mengandung langkah membuka atau memperbaiki perangkat
tenant test gagal
start inspection membuat duplicate
completion menghasilkan partial state
result aggregation nondeterministic
completed inspection dapat dimutasi
DATA_QUALITY menghasilkan inspeksi fisik
dependency baru diperlukan
production atau Neon diperlukan
build membutuhkan database aktif
scope mulai membuat Rencana Hemat
scope mulai memberi recommendation
scope mulai mengerjakan IT-DIAG-05
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
docs(tasks): activate IT-DIAG-04 guided inspection
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(inspections): add tenant-safe inspection persistence

feat(inspections): add versioned safe candidate checklists

test(inspections): verify safety results and tenant isolation
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
[ ] branch berasal dari accepted IT-DIAG-03 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] prompt IT-DIAG-03 diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0004 tidak berubah
[ ] migration 0005 tersedia
[ ] rollback 0005 tersedia
[ ] migration up/down/up lulus
[ ] centralized inspection catalog
[ ] inspection version tersimpan
[ ] item code dan version tersimpan
[ ] instruction snapshot tersimpan
[ ] safety level tersimpan
[ ] candidate-specific checklist
[ ] DATA_QUALITY non-inspectable
[ ] no AC checklist
[ ] no unsafe instruction
[ ] no panel-opening instruction
[ ] no wire-handling instruction
[ ] no voltage-measurement instruction
[ ] no repair instruction
[ ] start plan idempotent
[ ] concurrent start tidak duplicate
[ ] plan items tidak partial
[ ] item answers tenant-safe
[ ] FOUND valid
[ ] NOT_FOUND valid
[ ] UNKNOWN valid
[ ] NEEDS_HELP valid
[ ] item dapat dikoreksi sebelum completion
[ ] completed plan immutable
[ ] aggregate result deterministic
[ ] completion atomic
[ ] ANALYZED menjadi INSPECTION_IN_PROGRESS setelah start sukses
[ ] failed start tidak mengubah session
[ ] session tidak menjadi CLOSED
[ ] cross-tenant start ditolak
[ ] cross-tenant read ditolak
[ ] cross-tenant answer ditolak
[ ] cross-tenant complete ditolak
[ ] no action plan
[ ] no recommendation
[ ] no prediction
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
[ ] IT-DIAG-05 belum dimulai
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
Inspection plan schema
Inspection item schema
Inspection catalog
Inspection rule version
Inspection/item versions
Candidate-to-checklist mapping
Non-inspectable candidates
Safety levels
Forbidden-instruction audit
Plan lifecycle
Item lifecycle
Answer codes
Aggregate-result contract
Plan completion
Completed immutability
Start idempotency
Concurrent start
Concurrent completion
Session transition
Tenant isolation
Safe wording review
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
IT-DIAG-05 status
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
jangan mengerjakan IT-DIAG-05
jangan membuat Rencana Hemat
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
