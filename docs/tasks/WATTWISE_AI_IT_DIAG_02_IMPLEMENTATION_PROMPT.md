# WattWise AI — Implementation Prompt IT-DIAG-02

## Diagnostic Session dan Adaptive Questionnaire untuk Segmen Kos

Gunakan prompt ini setelah Product Owner menerima:

```text
IT-DIAG-01B — ACCEPTED LOCALLY

Accepted branch:
feature/it-diag-01b-bill-first

Accepted HEAD:
af0a29813ff234c04e75e21e201491a1c2ecab3c
```

Implementasikan tepat satu fase bounded:

```text
IT-DIAG-02 — Diagnostic Session dan Adaptive Questionnaire
```

Fase ini membuat pengguna dapat:

```text
memilih periode tagihan yang ingin diperiksa
→ memulai atau melanjutkan sesi
→ menjawab pertanyaan sederhana
→ memilih “Tidak tahu”
→ menyimpan jawaban secara tenant-safe
→ menyelesaikan pengumpulan konteks
```

Fase ini tidak boleh menghasilkan kandidat penyebab, ranking, diagnosis, rekomendasi, pemeriksaan, atau Rencana Hemat.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=af0a29813ff234c04e75e21e201491a1c2ecab3c
TARGET_BRANCH=feature/it-diag-02-diagnostic-questionnaire
TARGET_PHASE=IT-DIAG-02

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md

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
ALLOW_ADVANCED_ML=false

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
4. docs/tasks/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
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

Jika baseline bertentangan dengan repository atau keputusan penting tidak dapat dibuktikan:

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
af0a29813ff234c04e75e21e201491a1c2ecab3c
```

Workspace harus clean.

## 3.2 Branch

Jika belum ada:

```powershell
git switch -c feature/it-diag-02-diagnostic-questionnaire `
  af0a29813ff234c04e75e21e201491a1c2ecab3c
```

Jika branch sudah ada:

* jangan hapus;
* jangan reset;
* jangan menimpa;
* audit ancestry dan existing commits;
* lanjut hanya jika berasal dari accepted base.

Verifikasi:

```powershell
git merge-base --is-ancestor `
  af0a29813ff234c04e75e21e201491a1c2ecab3c `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_01B_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
```

Final state:

```text
docs/tasks/
└─ WATTWISE_AI_IT_DIAG_02_IMPLEMENTATION_PROMPT.md
```

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-02 diagnostic questionnaire
```

Activation commit harus menjadi direct child accepted HEAD dan hanya mengubah `docs/tasks` serta `docs/archive`.

---

# 4. Batas Scope

## Diizinkan

```text
diagnostic session persistence
session lifecycle foundation
rule version
question catalog
question code dan version
answer code
template questionnaire kos
adaptive question selection
jawaban Ya/Tidak/Tidak tahu/Tidak relevan
start-session idempotency
answer idempotency
resume session
questionnaire completion state
tenant authorization
server-side validation
migration dan rollback
unit tests
integration tests
runtime dan browser verification
```

## Dilarang

```text
candidate cause generation
candidate ranking
candidate score
candidate explanation
maksimal tiga kandidat
diagnosis penyebab
rekomendasi hemat
guided inspection
action plan
outcome evaluation
dashboard penuh
grafik baru
prediction
anomaly detection
AI atau ML
LLM integration
IoT
sensor
payment
subscription changes
pricing changes
analytics lengkap
IT-DIAG-03
push
PR
merge
deploy
Neon migration
```

IT-DIAG-02 hanya mengumpulkan konteks.

---

# 5. Audit Sebelum Coding

Audit target repository:

```text
current business schema
business segment/type
electricity-system fields jika ada
electricity_bill schema
accepted previous-period selection
bill comparison service
session/auth helper
tenant authorization helper
Server Action convention
repository/service convention
migration discovery
rollback convention
test helpers
current bills UI
current /setup flow
current motion components
```

Audit legacy Laravel secara read-only untuk:

```text
diagnostic session model
questionnaire definitions
question codes
answer codes
session statuses
rule version
adaptive question rules
idempotency
kos questionnaire
tenant policy
relevant tests
```

Jangan menebak nama file. Gunakan repository search.

Buat ringkasan internal:

```text
Current state
Reusable contract
Schema plan
Session lifecycle
Rule-version contract
Question-version contract
Answer-code contract
Adaptive-routing contract
Tenant risks
Migration plan
Test plan
Exact files planned
```

---

# 6. Target Pengguna Fase Ini

Fase ini hanya mengimplementasikan questionnaire P0 untuk:

```text
segmen kos
```

Utamakan pemilik kos nonteknis.

Pertanyaan harus:

```text
menggunakan bahasa sehari-hari
tidak meminta pengguna menghitung watt
tidak mewajibkan daftar alat
tidak mewajibkan kWh
selalu mendukung “Tidak tahu”
tidak menyimpulkan kerusakan
```

Jangan membuat template laundry, frozen food, F&B, atau segmen lain.

Untuk business non-kos:

```text
jangan memakai template kos sebagai fallback
jangan menganggap template kos sebagai data aktual
tampilkan state jujur bahwa questionnaire segmen tersebut belum tersedia
```

Jangan memperluas profil business kecuali canonical contract dan repository benar-benar memerlukannya.

---

# 7. Diagnostic Session Contract

Canonical lifecycle minimum:

```text
DRAFT
COLLECTING_CONTEXT
ANALYZED
INSPECTION_IN_PROGRESS
CLOSED
```

IT-DIAG-02 hanya diizinkan menggunakan transition:

```text
DRAFT
→ COLLECTING_CONTEXT
```

Ketika semua pertanyaan yang eligible telah dijawab:

```text
questionnaireCompletedAt dapat disimpan
status tidak boleh diubah menjadi ANALYZED
```

Status berikut dicadangkan:

```text
ANALYZED              → IT-DIAG-03
INSPECTION_IN_PROGRESS → IT-DIAG-04
CLOSED                → fase berikutnya
```

Jangan menyatakan session telah dianalisis pada fase ini.

Setiap session harus terikat kepada:

```text
satu authenticated tenant
satu business
satu current electricity-bill period
satu segment snapshot
satu rule version
```

Pertimbangkan model minimum:

```text
diagnostic_session

id
businessId
electricityBillId
segmentCode
status
ruleVersion
questionnaireCompletedAt nullable
createdAt
updatedAt
```

Gunakan naming dan ID convention repository aktual.

Jika comparison bill perlu disimpan sebagai snapshot agar sesi deterministic, audit dan jelaskan sebelum menambahkan `comparisonBillId`.

Jangan menerima `businessId`, `ownerId`, `userId`, status, segment, atau rule version langsung dari form pengguna.

---

# 8. Session Idempotency

Memulai session berulang untuk kombinasi yang sama:

```text
business
+ electricity bill
+ rule version
```

harus mengembalikan session yang sama.

Pertimbangkan unique constraint:

```text
businessId + electricityBillId + ruleVersion
```

Lakukan berdasarkan repository contract aktual.

Concurrent start test harus membuktikan:

```text
dua start request concurrent
→ hanya satu session tersimpan
→ kedua request memperoleh session yang sama atau hasil idempotent setara
```

Jangan membuat session baru setiap kali CTA ditekan.

Session untuk rule version baru boleh dibuat pada masa depan, tetapi jangan membuat fitur upgrade rule pada 02.

---

# 9. Question Catalog

Pertanyaan tidak boleh hardcoded tersebar di page, action, service, dan component.

Buat satu catalog versioned yang authoritative.

Setiap pertanyaan minimal memiliki:

```text
code
version
ruleVersion
segment
label
answerOptions
order/priority
eligibility rule
```

Pertimbangkan bentuk TypeScript yang typed dan immutable.

Published question version tidak boleh diubah diam-diam.

Jika copy atau logic pertanyaan berubah secara substantif:

```text
buat question version baru
```

Question code dan version harus tersimpan pada answer.

Jangan membuat admin question builder atau database CMS.

---

# 10. Answer Contract

Answer code internal:

```text
YES
NO
UNKNOWN
NOT_APPLICABLE
```

Label pengguna:

```text
Ya
Tidak
Tidak tahu
Tidak relevan
```

“Tidak tahu” adalah jawaban valid, bukan error, bukan `null`, dan bukan data yang hilang secara tidak sengaja.

Pertimbangkan model:

```text
diagnostic_answer

id
diagnosticSessionId
questionCode
questionVersion
answerCode
createdAt
updatedAt
```

Constraint minimum:

```text
unique session + questionCode + questionVersion
```

Answer submission harus:

```text
memastikan session milik current tenant
memastikan question code ada pada catalog aktif
memastikan question version benar
memastikan question eligible untuk session
memastikan answer code diperbolehkan
menolak unknown request fields
```

Repeated submission dengan jawaban yang sama harus idempotent.

Jangan menambahkan UI edit jawaban lama kecuali canonical atau legacy contract jelas mewajibkan.

Jika perubahan jawaban lama belum memiliki semantics yang aman:

```text
jangan implementasikan back-edit pada IT-DIAG-02
```

---

# 11. Adaptive Questionnaire

Pada IT-DIAG-02, adaptiveness hanya boleh berdasarkan:

```text
segment business
data business yang benar-benar tersimpan
data current/previous bill yang tersedia
jawaban sebelumnya
```

Jangan menggunakan:

```text
candidate cause
candidate score
AI
LLM
prediction
assumed appliance profile
template default sebagai data aktual
```

Candidate-dependent branching baru dapat ditambahkan pada IT-DIAG-03.

Minimum catalog kos harus mempertimbangkan pertanyaan sederhana seperti:

```text
Apakah tanggal atau cara pencatatan tagihan berbeda?

Apakah tarif atau daya listrik berubah, jika Anda mengetahuinya?

Apakah jumlah penghuni bertambah?

Apakah ada kegiatan khusus pada periode ini?

Apakah ada alat listrik baru?

Apakah pompa air lebih sering menyala?

Apakah ada kebocoran atau masalah aliran air?

Apakah AC digunakan lebih lama dari biasanya?
```

Ini adalah source candidate untuk catalog, bukan izin untuk menanyakan semuanya kepada semua pengguna.

Audit business data dan buat routing minimum yang deterministic.

Contoh adaptiveness:

```text
pompa lebih sering menyala = YES atau UNKNOWN
→ pertanyaan kebocoran dapat menjadi eligible

pompa tidak relevan
→ pertanyaan kebocoran dapat dilewati
```

Jangan membuat questionnaire panjang.

Target awal:

```text
sekitar 5–8 pertanyaan eligible
```

Jika seluruh jawaban adalah `UNKNOWN`, questionnaire harus tetap selesai dengan aman.

Tidak boleh menghasilkan kandidat atau kesimpulan penyebab.

---

# 12. Starting Eligibility

Integrasikan CTA pada comparison state `/bills`:

```text
Cek Kenaikan
```

CTA hanya boleh muncul ketika:

```text
current bill milik tenant
business valid
comparison context yang dibutuhkan tersedia
```

Jika hanya ada satu tagihan dan product contract membutuhkan periode pembanding, tampilkan:

```text
Tambahkan tagihan pembanding terlebih dahulu untuk memeriksa kenaikan.
```

Jangan menebak requirement bila canonical docs dan repository tidak cukup untuk menentukan apakah session boleh dimulai dengan satu tagihan.

Jika keputusan tersebut ambigu:

```text
BLOCKED — DECISION REQUIRED
```

Jika session sudah ada, CTA:

```text
Lanjutkan Cek Kenaikan
```

---

# 13. UI Minimum

Preferred route:

```text
/diagnostics/[sessionId]
```

Gunakan route convention aktual.

UI minimum:

```text
judul “Cek Kenaikan”
periode yang sedang diperiksa
ringkasan biaya yang sudah diverifikasi 01B
satu pertanyaan aktif
empat pilihan jawaban
pending state
validation state
resume state
completion state
```

Jangan menampilkan fixed question total jika adaptive routing membuat total berubah.

Copy completion:

```text
Konteks tagihan telah tersimpan.

Belum ada kesimpulan penyebab pada tahap ini.
Tahap berikutnya akan membantu menentukan bagian yang perlu diperiksa.
```

Jangan menampilkan:

```text
Penyebab ditemukan
AI mendeteksi
Alat bermasalah
Diagnosis selesai
Rekomendasi
Candidate score
```

Pastikan:

```text
keyboard dapat memilih jawaban
visible focus
tidak hanya mengandalkan warna
double-submit protection
native scrolling
reduced-motion support
```

Gunakan motion foundation existing secara restrained.

---

# 14. Architecture

Pertahankan:

```text
React Server Components
→ Server Actions
→ Zod validation
→ Authorization
→ Session/Questionnaire Service
→ Repository
→ PostgreSQL
```

Server Components adalah default.

Client Component hanya untuk:

```text
pending interaction
answer-button interaction bila benar-benar perlu
existing restrained motion
```

Authoritative routing dan next-question calculation harus server-side.

Dilarang:

```text
authorization client-side saja
question eligibility hanya di browser
hidden input untuk tenant/status/rule version
database query di presentational component
global mutable question state
randomized question routing
```

Adaptive routing harus deterministic dan testable sebagai pure function bila memungkinkan.

---

# 15. Migration

Buat migration baru setelah accepted migration `0002`.

Expected naming mengikuti convention, misalnya:

```text
drizzle/migrations/0003_diagnostic_questionnaire.sql
drizzle/rollbacks/0003_diagnostic_questionnaire_rollback.sql
```

Gunakan nama final sesuai convention repository.

Jangan mengubah:

```text
0000
0001
0002
```

Migration harus mencakup:

```text
diagnostic_session
diagnostic_answer
foreign keys
indexes
unique/idempotency constraints
check constraints yang relevan
```

Wajib diuji:

```text
up
→ schema verification
→ down
→ schema verification
→ up
```

Build tidak boleh membutuhkan database aktif.

---

# 16. Tenant Isolation

Semua operation harus dimulai dari authoritative session.

User A tidak boleh:

```text
memulai session untuk bill user B
membaca session user B
melanjutkan session user B
menjawab question session user B
melihat answer user B
mengubah sessionId pada URL untuk mengakses tenant lain
```

Query harus menggabungkan ownership chain:

```text
authenticated user
→ owned business
→ owned electricity bill
→ diagnostic session
→ answers
```

Jangan hanya memeriksa `session.userId` dari payload.

Gunakan not-found/forbidden convention repository tanpa membocorkan data tenant lain.

---

# 17. Testing Wajib

## 17.1 Unit tests

Minimum:

```text
question catalog code unik
published version stabil
answer-code validation
kos template selection
non-kos tidak memakai template kos
first question deterministic
next question deterministic
conditional pump/leak branch
UNKNOWN path
NOT_APPLICABLE path
semua UNKNOWN dapat selesai
template tidak dianggap data aktual
no candidate output
no diagnosis wording
rule version stored
question version stored
idempotent answer calculation
```

## 17.2 Integration tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
migration up/down/up
session dapat dibuat
session terikat satu business dan bill
start session idempotent
concurrent start menghasilkan satu session
status awal benar
first answer mengubah DRAFT ke COLLECTING_CONTEXT
answer dapat disimpan
same-answer retry tidak membuat duplicate
invalid question code ditolak
wrong question version ditolak
ineligible question ditolak
invalid answer code ditolak
UNKNOWN tersimpan sebagai explicit answer
questionnaire completion timestamp tersimpan
status tidak menjadi ANALYZED
cross-tenant start ditolak
cross-tenant read ditolak
cross-tenant answer ditolak
spoofed businessId/userId/status diabaikan atau ditolak
```

## 17.3 Regression

Seluruh accepted test tetap lulus:

```text
auth
plan/trial
onboarding
business
bill input
period normalization
tenant isolation
concurrent bill overlap
GSAP/reduced motion
```

---

# 18. Runtime Smoke

Gunakan:

```text
Node.js 24
PostgreSQL 16 disposable
synthetic users
synthetic businesses
synthetic bills
```

Flow:

```text
register user A
complete plan/onboarding/business kos
create two eligible bills
open /bills
click Cek Kenaikan
start session
answer Ya
answer Tidak
answer Tidak tahu
verify adaptive question path
leave session
resume session
finish questionnaire
verify no cause/candidate displayed
verify status is not ANALYZED
logout

register user B
create minimum journey
attempt session ID user A
confirm access denied
attempt answer submission to session A
confirm access denied
```

Tambahkan scenario:

```text
semua jawaban Tidak tahu
→ questionnaire tetap selesai
→ tidak ada error
→ tidak ada kesimpulan palsu
```

Jangan mencetak secret, password, cookie, token, atau database URL.

---

# 19. Browser Verification

Routes minimum:

```text
/bills
/diagnostics/[sessionId]
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
CTA Cek Kenaikan
start state
resume state
question state
UNKNOWN answer
NOT_APPLICABLE answer
conditional question
completion state
keyboard interaction
visible focus
pending state
double-submit protection
no horizontal overflow
no clipped text
reduced motion
native scroll
no hydration warning
no React warning
no GSAP warning
no console error
no HTTP 5xx
```

Jangan mengklaim browser PASS tanpa evidence.

---

# 20. Node.js 24 Quality Gates

Gunakan Docker `node:24-slim`.

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

Accepted 01B audit reference:

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

Bandingkan accepted-base lockfile dan current lockfile menggunakan advisory database yang sama.

Tidak boleh ada perubahan dependency.

Jika count atau severity bertambah karena perubahan dependency task:

```text
BLOCKED — DECISION REQUIRED
```

Jangan menjalankan:

```text
npm audit fix --force
```

---

# 21. Hard Stops

Berhenti jika:

```text
accepted base tidak ditemukan
workspace kotor atau divergen
active task lebih dari satu
baseline docs konflik
session-to-bill contract ambigu
business segment tidak dapat ditentukan aman
question editing semantics diperlukan tetapi tidak didefinisikan
migration berisiko kehilangan data
tenant test gagal
idempotency gagal
concurrent start membuat duplicate
question routing nondeterministic
dependency baru diperlukan
production atau Neon diperlukan
scope mulai menghasilkan kandidat
scope mulai menyatakan penyebab
build membutuhkan database aktif
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

# 22. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-02 diagnostic questionnaire
```

Setelah gates relevan lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(diagnostics): add tenant-safe diagnostic sessions

feat(questionnaire): add versioned adaptive kos questions

test(diagnostics): verify idempotency answers and tenant isolation
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

Gunakan full SHA dari Git.

Rollback hanya menggunakan `git revert`, newest ke oldest.

---

# 23. Definition of Done

```text
[ ] branch berasal dari accepted 01B HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] prompt 01B diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0002 tidak berubah
[ ] migration 0003 tersedia
[ ] rollback tersedia
[ ] migration up/down/up lulus
[ ] diagnostic session tenant-safe
[ ] session terikat business dan period
[ ] rule version tersimpan
[ ] seluruh canonical status tersedia
[ ] 02 hanya memakai DRAFT/COLLECTING_CONTEXT
[ ] session start idempotent
[ ] concurrent start tidak duplicate
[ ] centralized question catalog
[ ] question code tersimpan
[ ] question version tersimpan
[ ] answer code tersimpan
[ ] UNKNOWN explicit dan valid
[ ] NOT_APPLICABLE explicit dan valid
[ ] adaptive kos routing deterministic
[ ] semua UNKNOWN dapat selesai
[ ] non-kos tidak memakai template kos
[ ] no candidate generation
[ ] no ranking
[ ] no diagnosis claim
[ ] no recommendation
[ ] cross-tenant start ditolak
[ ] cross-tenant read ditolak
[ ] cross-tenant answer ditolak
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
[ ] dependency tidak berubah
[ ] Docker resources dibersihkan
[ ] workspace clean
[ ] no push/PR/merge/deploy
[ ] IT-DIAG-03 belum dimulai
```

---

# 24. Final Report

Laporkan:

```text
Status
Accepted base
Branch
Activation commit full SHA
Implementation commit full SHAs
Source hierarchy result
Migration files
Rollback file
Migration up/down/up
Session schema
Answer schema
Session lifecycle
Authorized transitions
Rule version
Question catalog
Question code/version
Answer codes
Kos adaptive rules
All-UNKNOWN result
Non-kos behavior
Start idempotency
Concurrent start
Answer idempotency
Tenant isolation
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
IT-DIAG-03 status
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
jangan mengerjakan IT-DIAG-03
jangan push
jangan PR
jangan merge
jangan deploy
```
