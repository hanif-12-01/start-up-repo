# WattWise AI — Implementation Prompt IT-DIAG-03

## Candidate Cause Generation dan Deterministic Ranking

Keputusan Product Owner:

```text
IT-DIAG-02 — ACCEPTED LOCALLY
```

Accepted base:

```text
43cb0f8908acb1477e6901a3ee5ad0ff28a45696
```

Implementasikan tepat satu fase:

```text
IT-DIAG-03 — Candidate Cause Generation and Ranking
```

Tujuan fase:

```text
questionnaire selesai
→ jawaban dan data tagihan dianalisis secara deterministik
→ menghasilkan 0–3 Bagian yang Perlu Dicek
→ menampilkan faktor pendukung dan keterbatasannya
```

Hasil adalah kandidat pemeriksaan, bukan penyebab pasti.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=43cb0f8908acb1477e6901a3ee5ad0ff28a45696
TARGET_BRANCH=feature/it-diag-03-candidate-ranking
TARGET_PHASE=IT-DIAG-03

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md

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
4. docs/tasks/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md
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

Jangan mengambil instruksi aktif dari file arsip.

Jika baseline, active task, dan repository tidak dapat direkonsiliasi:

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
43cb0f8908acb1477e6901a3ee5ad0ff28a45696
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-03-candidate-ranking `
  43cb0f8908acb1477e6901a3ee5ad0ff28a45696
```

Jika branch sudah ada:

* jangan hapus;
* jangan reset;
* jangan menimpa;
* audit ancestry;
* lanjut hanya jika branch berasal dari accepted HEAD.

Verifikasi:

```powershell
git merge-base --is-ancestor `
  43cb0f8908acb1477e6901a3ee5ad0ff28a45696 `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_03_IMPLEMENTATION_PROMPT.md
```

Pastikan hanya ada satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-03 candidate ranking
```

Activation commit harus menjadi direct child dari accepted IT-DIAG-02 HEAD.

---

# 4. Scope

## Diizinkan

```text
diagnostic candidate persistence
centralized candidate catalog
candidate code dan version
candidate type
rule-based candidate generation
supporting factors
contradicting factors
data-quality assessment
deterministic score
deterministic ranking
maksimal tiga kandidat
safe explanation
generation idempotency
concurrent-generation protection
session transition ke ANALYZED
tenant authorization
migration dan rollback
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
guided inspection
inspection checklist
inspection result
action plan
recommendation
saving estimation
outcome evaluation
prediction
cash-flow prediction
machine learning
model training
model inference
LLM
anomaly model
dashboard penuh
PDF report
analytics lengkap
plan atau subscription changes
IT-DIAG-04
push
PR
merge
deploy
Neon
production
```

---

# 5. Audit Sebelum Coding

Audit repository aktual:

```text
diagnostic_session schema
diagnostic_answer schema
question catalog
question routing
question codes dan versions
session lifecycle
questionnaire completion contract
electricity_bill schema
bill comparison service
current/previous bill snapshots
tenant authorization helpers
transaction convention
advisory-lock convention
repository/service convention
migration discovery
rollback convention
test helpers
diagnostics UI
feature flags
```

Audit legacy Laravel secara read-only:

```text
candidate model
candidate codes
candidate types
candidate generator
ranking service
score components
supporting factors
contradicting factors
data-quality rules
safe explanations
idempotency
tenant policies
candidate tests
```

Legacy hanya evidence. Jangan menyalin implementasi tanpa menyesuaikan canonical docs dan target architecture.

Sebelum mengubah kode, tentukan:

```text
candidate taxonomy
candidate catalog
generation version
score components
evidence-level contract
tie-break rules
persistence model
idempotency strategy
session transition
UI route
test matrix
exact files planned
```

---

# 6. Candidate Taxonomy

Candidate type canonical:

```text
ADMINISTRATIVE
OCCUPANCY
OPERATIONAL
APPLIANCE
WATER_SYSTEM
DATA_QUALITY
OTHER
```

Gunakan candidate type yang benar-benar relevan dengan questionnaire Kos IT-DIAG-02.

Minimum candidate catalog P0 dapat mencakup:

```text
perubahan tarif atau pencatatan
peningkatan jumlah penghuni
kegiatan atau jam penggunaan khusus
alat listrik baru
penggunaan AC lebih lama
sistem pompa atau aliran air
kelengkapan informasi
```

Jangan membuat candidate template untuk laundry, frozen food, F&B, atau segmen lain.

Setiap kandidat minimum memiliki:

```text
code
version
ruleVersion
type
title
description template
supporting-factor definitions
contradicting-factor definitions
eligibility rule
tie-break priority
```

Candidate definition harus terpusat dan versioned.

Jangan hardcode candidate logic tersebar di page, component, action, repository, dan service.

---

# 7. Persistence Model

Buat migration baru setelah `0003`.

Expected convention:

```text
drizzle/migrations/0004_diagnostic_candidates.sql
drizzle/rollbacks/0004_diagnostic_candidates_rollback.sql
```

Gunakan nama final sesuai convention repository.

Pertimbangkan model minimum:

```text
diagnostic_candidate

id
diagnosticSessionId
candidateCode
candidateVersion
candidateType
ruleVersion
title
rank
internalScore
evidenceLevel
explanation
supportingFactorsJson
contradictingFactorsJson
createdAt
updatedAt
```

Gunakan PostgreSQL `jsonb` untuk factor snapshot jika sesuai convention repository.

Constraint minimum:

```text
foreign key ke diagnostic_session
unique session + candidateCode + candidateVersion + ruleVersion
rank positif
rank maksimal 3
internalScore memiliki range aman
candidate type valid
evidence level valid
```

Jangan mengubah migration `0000–0003`.

Migration wajib reversible dan diuji:

```text
up
→ schema verification
→ down
→ schema verification
→ up
```

---

# 8. Generation Eligibility

Candidate generation hanya boleh dilakukan apabila:

```text
session milik authenticated tenant
questionnaireCompletedAt tersedia
session status = COLLECTING_CONTEXT
rule version dikenali
question catalog version dikenali
seluruh stored answer valid
bill snapshot/session context tersedia
```

Candidate generation tidak boleh berjalan pada:

```text
DRAFT session
questionnaire yang belum selesai
session tenant lain
session dengan rule version tidak dikenal
session yang sudah CLOSED
```

Jangan menerima dari client:

```text
businessId
userId
ownerId
candidate type
candidate score
candidate rank
supporting factors
rule version
session status
```

Client hanya boleh mengirim authoritative session identifier yang tetap diverifikasi melalui ownership chain.

---

# 9. Deterministic Rule Contract

IT-DIAG-03 menggunakan rule-based decision support.

Dilarang menggunakan:

```text
randomization
probabilistic model
machine learning
LLM
external AI API
unversioned heuristic
hidden browser calculation
```

Gunakan rule version eksplisit:

```text
DIAG_CANDIDATE_RULE_V1
```

Jika repository telah memiliki naming rule-version yang accepted, ikuti convention tersebut.

## Answer semantics

```text
YES
→ dapat menjadi supporting evidence

NO
→ dapat menjadi contradiction

UNKNOWN
→ bukan supporting evidence
→ bukan contradiction
→ berkontribusi terhadap DATA_QUALITY

NOT_APPLICABLE
→ branch kandidat terkait tidak eligible
```

Jawaban `UNKNOWN` tidak boleh diperlakukan sebagai `YES`.

## Bill semantics

```text
cost-only data
→ hanya membuktikan perubahan biaya

valid kWh pada kedua periode
→ dapat membuktikan perubahan pemakaian kWh

tarif tidak tersedia
→ tidak boleh menebak perubahan tarif

kWh tidak tersedia
→ tidak boleh mengeklaim konsumsi meningkat
```

Nominal tagihan saja tidak boleh menjadi supporting evidence untuk kandidat alat, okupansi, pompa, atau penggunaan AC.

---

# 10. Scoring Contract V1

Gunakan scoring transparan dan deterministic berikut, kecuali canonical baseline memiliki aturan yang lebih ketat.

```text
direct supporting YES       +40
secondary supporting YES    +20
direct contradicting NO     -35
secondary contradicting NO  -15
UNKNOWN                       0
NOT_APPLICABLE                branch ineligible
objective supporting data   +10 maksimal per candidate
```

Aturan:

```text
score akhir di-clamp ke 0–100
candidate non-DATA_QUALITY memerlukan minimal satu supporting YES
candidate tanpa supporting evidence tidak boleh ditampilkan
UNKNOWN tidak pernah menaikkan candidate causal score
cost-only change tidak mendukung usage-related candidate
```

## DATA_QUALITY candidate

DATA_QUALITY boleh dihasilkan ketika:

```text
setidaknya separuh pertanyaan eligible dijawab UNKNOWN
data utama yang dibutuhkan untuk membedakan biaya dan pemakaian tidak tersedia
jawaban relevan tidak cukup untuk menghasilkan kandidat lain
```

Missing kWh sendiri bukan error dan bukan alasan tunggal menyalahkan pengguna.

Wording harus netral:

```text
Beberapa informasi masih belum diketahui, sehingga bagian yang perlu diperiksa belum dapat dipersempit.
```

## Evidence level

Gunakan internal evidence level:

```text
STRONG
MODERATE
LIMITED
```

Contract V1:

```text
STRONG
→ minimal dua direct supporting factors
→ tidak ada contradiction

MODERATE
→ minimal satu direct supporting factor
→ tidak ada direct contradiction

LIMITED
→ kandidat melewati threshold
→ tetapi hanya memiliki secondary support atau memiliki contradiction
```

Evidence level bukan probabilitas dan bukan persentase keyakinan.

## Candidate threshold

```text
candidate non-DATA_QUALITY ditampilkan jika:
score >= 20
dan memiliki minimal satu supporting YES
```

DATA_QUALITY mengikuti eligibility rule khusus.

---

# 11. Ranking

Ranking harus:

```text
deterministic
stable
repeatable
maksimal tiga kandidat
```

Urutan:

```text
1. internalScore descending
2. evidenceLevel descending
3. catalog tie-break priority ascending
4. candidateCode ascending
```

Administrative candidates harus dievaluasi sebelum kandidat perangkat, tetapi tidak otomatis harus selalu berada di rank pertama jika tidak memiliki evidence.

Jangan menampilkan internal score kepada pengguna.

Jangan menampilkan:

```text
82% kemungkinan
AI confidence 91%
penyebab paling pasti
model mendeteksi
```

Jika tidak ada kandidat yang melewati threshold:

```text
tampilkan zero-candidate state yang jujur
```

Copy:

```text
Belum ada bagian prioritas yang dapat ditentukan dari jawaban saat ini.
```

---

# 12. Factor Traceability

Setiap candidate harus menyimpan snapshot faktor yang digunakan.

Supporting factor minimum:

```text
factorCode
sourceType
sourceCode
sourceVersion
displayLabel
weight
```

Contradicting factor menggunakan struktur setara.

Allowed source type:

```text
ANSWER
BILL_CONTEXT
DATA_QUALITY
```

Jangan menyimpan secret, session cookie, email, atau data tenant lain di factor JSON.

Explanation harus dihasilkan dari factor yang benar-benar tersimpan.

Dilarang menghasilkan explanation yang menyebut faktor yang tidak mendukung candidate tersebut.

---

# 13. Idempotency dan Concurrency

Repeated generation untuk session dan rule version yang sama harus:

```text
mengembalikan hasil kandidat yang sama
tidak membuat duplicate row
tidak mengubah rank secara nondeterministic
tidak mengubah explanation secara acak
```

Gunakan transaksi database.

Pertimbangkan:

```text
transaction-scoped advisory lock per diagnostic session
atau
unique constraints + transaction-safe retry
```

Concurrent test wajib:

```text
dua generation request berjalan concurrent
→ hanya satu candidate set tersimpan
→ kedua request menerima hasil setara
→ tidak ada duplicate
→ tidak ada partial candidate set
→ tidak ada leaked lock
```

Candidate persistence dan session transition harus atomic.

---

# 14. Session Lifecycle

IT-DIAG-03 mengizinkan transition:

```text
COLLECTING_CONTEXT
→ ANALYZED
```

Transition hanya dilakukan setelah:

```text
questionnaire selesai
candidate generation berhasil
candidate persistence berhasil
rank final berhasil disimpan
```

Jika generation gagal:

```text
session tetap COLLECTING_CONTEXT
tidak boleh ada partial candidate rows
```

Repeated generation pada session `ANALYZED` harus mengembalikan stored result secara idempotent.

IT-DIAG-03 tidak boleh mengubah status menjadi:

```text
INSPECTION_IN_PROGRESS
CLOSED
```

Status tersebut milik fase berikutnya.

---

# 15. Safe Wording

Terminologi pengguna:

```text
Candidate Cause
→ Bagian yang Perlu Dicek

Diagnostic result
→ Hasil Cek Kenaikan

Evidence
→ Dasar pemeriksaan
```

Contoh aman:

```text
Pompa dan aliran air perlu diperiksa lebih dahulu.

Dasar pemeriksaan:
Anda melaporkan pompa lebih sering menyala pada periode ini.

Hal yang belum pasti:
Belum diketahui apakah terdapat perubahan jumlah penghuni.
```

Dilarang:

```text
Pompa adalah penyebab kenaikan.
Sistem mendeteksi pompa rusak.
AI memastikan AC boros.
Kemungkinan kerusakan 90%.
Ganti pompa sekarang.
Matikan AC.
```

Disclaimer minimum:

```text
Hasil ini dibuat dari data tagihan dan jawaban yang Anda masukkan. Ini bukan diagnosis kerusakan atau audit energi profesional.
```

---

# 16. UI Minimum

Preferred route setelah audit:

```text
/diagnostics/[sessionId]/results
```

Atau gunakan route convention existing yang lebih konsisten.

Setelah questionnaire selesai, tampilkan CTA:

```text
Lihat Bagian yang Perlu Dicek
```

UI minimum:

```text
judul “Hasil Cek Kenaikan”
periode yang diperiksa
ringkasan perubahan biaya
kelengkapan data
0–3 candidate cards
rank visual tanpa angka probabilitas
candidate title
safe explanation
supporting factors
uncertainty/contradicting factors
disclaimer
CTA kembali ke tagihan
```

Jangan menampilkan raw:

```text
internalScore
factor weight
candidate code
rule version
JSON
database ID
```

Jangan membuat CTA fungsional:

```text
Mulai Pemeriksaan
Buat Rencana Hemat
Terapkan Rekomendasi
```

Fitur tersebut belum masuk scope.

Zero-candidate state harus tetap berguna dan tidak menampilkan error palsu.

All-UNKNOWN flow harus menghasilkan DATA_QUALITY state atau zero-candidate state yang jujur, bukan kandidat penyebab palsu.

---

# 17. Architecture

Gunakan:

```text
React Server Components
→ Server Action
→ Zod validation
→ Authorization
→ Candidate Generation Service
→ Ranking Service
→ Repository
→ PostgreSQL
```

Candidate generation dan ranking harus server-authoritative.

Pisahkan tanggung jawab:

```text
candidate catalog
factor resolver
candidate generator
ranking service
candidate repository
presentation mapper
```

Service layer tidak boleh bergantung pada React.

Repository tidak boleh berisi wording bisnis besar.

Presentational component tidak boleh menghitung score atau rank.

Gunakan pure functions untuk:

```text
factor resolution
candidate scoring
evidence level
ranking
safe explanation mapping
```

Jangan menambahkan dependency baru.

---

# 18. Tenant Isolation

Ownership chain wajib:

```text
authenticated user
→ owned business
→ owned electricity bill
→ owned diagnostic session
→ owned answers
→ owned candidates
```

User A tidak boleh:

```text
generate candidate untuk session user B
membaca hasil user B
menebak candidate melalui sessionId
mengakses result route user B
mengubah rank atau score user B
```

Cross-tenant read harus mengikuti existing not-found/forbidden convention tanpa membocorkan keberadaan session tenant lain.

---

# 19. Unit Tests

Minimum:

```text
candidate catalog code unik
candidate catalog version stabil
candidate type valid
same input menghasilkan output identik
YES menjadi supporting evidence
NO menjadi contradiction
UNKNOWN tidak menaikkan causal score
NOT_APPLICABLE membuat branch ineligible
cost-only tidak mendukung usage candidate
valid kWh dapat digunakan sesuai contract
candidate tanpa support tidak ditampilkan
score di-clamp 0–100
evidence STRONG
evidence MODERATE
evidence LIMITED
tie-break deterministic
maksimal tiga kandidat
administrative candidate dievaluasi
occupancy candidate
operational candidate
new-appliance candidate
AC candidate
water-system candidate
DATA_QUALITY candidate
all UNKNOWN aman
all NO aman
mixed answer path
zero-candidate state
supporting explanation sesuai factor
contradicting explanation sesuai factor
tidak ada causal wording
tidak ada recommendation wording
tidak ada probability wording
```

---

# 20. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
migration up/down/up
candidate insert
candidate foreign key
candidate unique constraint
generation hanya untuk completed questionnaire
incomplete questionnaire ditolak
generation dari DRAFT ditolak
generation dari COLLECTING_CONTEXT berhasil
session menjadi ANALYZED
candidate maksimal tiga
rank tersimpan benar
supporting factors tersimpan
contradicting factors tersimpan
rule version tersimpan
candidate version tersimpan
repeated generation idempotent
concurrent generation tidak duplicate
concurrent generation tidak partial
ANALYZED retry mengembalikan stored result
generation failure tidak mengubah session
cross-tenant generate ditolak
cross-tenant read ditolak
spoofed businessId ditolak
all UNKNOWN menghasilkan safe state
non-Kos tidak memakai candidate catalog Kos
migration historis tidak berubah
```

---

# 21. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
auth
plan/trial
onboarding
business
bill input
bill comparison
BigInt Rupiah
overlap concurrency
tenant isolation
diagnostic session
adaptive questionnaire
UNKNOWN
NOT_APPLICABLE
session resume
questionnaire completion
responsive UI
reduced motion
```

Jangan menghapus atau melemahkan accepted tests.

---

# 22. Runtime Smoke

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
start diagnostic session
complete questionnaire dengan mixed answers
generate candidates
verify maksimal tiga candidate
verify rank deterministic
verify safe explanation
verify no internal score displayed
reload result
verify identical results
retry generation
verify no duplicate
logout

register user B
attempt result route user A
verify access denied
attempt generation session user A
verify access denied
```

Tambahkan:

```text
all UNKNOWN flow
→ no fake cause
→ DATA_QUALITY atau zero-candidate safe state
→ session ANALYZED hanya setelah successful generation
```

---

# 23. Browser Verification

Routes minimum:

```text
/bills
/diagnostics/[sessionId]
/diagnostics/[sessionId]/results
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
questionnaire completion CTA
generation pending state
double-submit protection
candidate result state
maximum three cards
zero-candidate state
all-UNKNOWN state
supporting factors
uncertainty factors
safe disclaimer
no internal score
keyboard navigation
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
cross-tenant result 404
```

---

# 24. Node.js 24 Quality Gates

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

Accepted IT-DIAG-02 reference:

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

Advisory database dapat berubah. Bandingkan accepted-base dan current lockfile menggunakan advisory database yang sama.

`package.json` dan lockfile tidak boleh berubah.

Jika dependency berubah atau audit memburuk karena task ini:

```text
BLOCKED — DECISION REQUIRED
```

Dilarang:

```text
npm audit fix --force
```

Build harus berhasil tanpa database aktif.

---

# 25. Hard Stops

Berhenti jika:

```text
accepted base tidak ditemukan
workspace kotor atau divergen
lebih dari satu active task
canonical candidate contract konflik
question-answer codes tidak dapat dipetakan aman
candidate score membutuhkan asumsi di luar prompt
tenant test gagal
generation menghasilkan duplicate
candidate result nondeterministic
internal score terekspos
cost-only dianggap bukti konsumsi
UNKNOWN dianggap YES
candidate lebih dari tiga
hasil menyatakan penyebab pasti
hasil berisi recommendation
dependency baru diperlukan
production atau Neon diperlukan
build membutuhkan database aktif
scope mulai mengerjakan inspection atau action plan
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

# 26. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-03 candidate ranking
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(diagnostics): add tenant-safe candidate persistence

feat(diagnostics): add deterministic candidate generation and ranking

test(diagnostics): verify candidate evidence ranking and isolation
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

# 27. Definition of Done

```text
[ ] branch berasal dari accepted IT-DIAG-02 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] prompt IT-DIAG-02 diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0003 tidak berubah
[ ] migration 0004 tersedia
[ ] rollback 0004 tersedia
[ ] migration up/down/up lulus
[ ] centralized candidate catalog
[ ] candidate code dan version tersimpan
[ ] candidate type tersimpan
[ ] rule version tersimpan
[ ] supporting factors tersimpan
[ ] contradicting factors tersimpan
[ ] scoring deterministic
[ ] ranking deterministic
[ ] evidence level deterministic
[ ] candidate maksimal tiga
[ ] internal score tidak tampil
[ ] cost-only tidak disebut konsumsi
[ ] UNKNOWN bukan supporting evidence
[ ] NOT_APPLICABLE membuat branch ineligible
[ ] all-UNKNOWN aman
[ ] all-NO aman
[ ] zero-candidate state aman
[ ] no causal claim
[ ] no probability claim
[ ] no recommendation
[ ] generation idempotent
[ ] concurrent generation tidak duplicate
[ ] candidate persistence atomic
[ ] COLLECTING_CONTEXT menjadi ANALYZED setelah sukses
[ ] failed generation tidak mengubah status
[ ] cross-tenant generation ditolak
[ ] cross-tenant read ditolak
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
[ ] IT-DIAG-04 belum dimulai
[ ] AI/ML belum dimulai
```

---

# 28. Final Report

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
Candidate schema
Candidate catalog
Candidate codes
Candidate types
Rule version
Candidate version
Scoring components
Candidate threshold
Evidence levels
Tie-break rules
Supporting-factor contract
Contradicting-factor contract
DATA_QUALITY behavior
All-UNKNOWN behavior
All-NO behavior
Zero-candidate behavior
Generation idempotency
Concurrent generation
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
IT-DIAG-04 status
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
jangan mengerjakan IT-DIAG-04
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
