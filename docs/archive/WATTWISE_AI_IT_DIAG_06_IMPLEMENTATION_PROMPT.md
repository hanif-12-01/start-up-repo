# WattWise AI — Implementation Prompt IT-DIAG-06

## Outcome Evaluation dan Before–After Comparison

Keputusan Product Owner:

```text
IT-DIAG-05 — ACCEPTED LOCALLY
```

Accepted base:

```text
1a18883669e12adf0a3b1f956a3e8d602a5364c7
```

Implementasikan tepat satu fase:

```text
IT-DIAG-06 — Outcome Evaluation
```

Tujuan fase:

```text
Rencana Hemat selesai
→ tagihan berikutnya tersedia
→ server memilih tagihan evaluasi yang eligible
→ baseline dibandingkan dengan periode evaluasi
→ hasil perubahan ditampilkan secara non-kausal
→ outcome disimpan secara immutable
```

Outcome Evaluation bukan prediksi, bukan bukti sebab-akibat, bukan jaminan penghematan, dan bukan evaluasi profesional.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=1a18883669e12adf0a3b1f956a3e8d602a5364c7
TARGET_BRANCH=feature/it-diag-06-outcome-evaluation
TARGET_PHASE=IT-DIAG-06

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md

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

DEFAULT_EVALUATION_TIMEZONE=Asia/Jakarta
```

---

# 2. Sumber Kebenaran

Baca lengkap sesuai urutan:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md
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
git log -10 --format="%H %P %s"
git diff --check
Get-ChildItem .\docs\tasks -File | Select-Object Name
```

Expected HEAD:

```text
1a18883669e12adf0a3b1f956a3e8d602a5364c7
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-06-outcome-evaluation `
  1a18883669e12adf0a3b1f956a3e8d602a5364c7
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
  1a18883669e12adf0a3b1f956a3e8d602a5364c7 `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md
```

Pastikan tepat satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-06 outcome evaluation
```

Activation commit harus menjadi direct child accepted IT-DIAG-05 HEAD.

---

# 4. Scope

## Diizinkan

```text
outcome evaluation persistence
next eligible bill selection
completed-action eligibility
immutable baseline reuse
immutable follow-up snapshot
exact normalized cost comparison
exact normalized kWh comparison
tariff-context comparison
cost direction
usage direction
tariff direction
data-quality classification
non-causal overall interpretation
waiting-for-next-bill state
evaluation idempotency
concurrent-evaluation protection
session closure eligibility
explicit diagnostic-session closure
tenant authorization
migration dan rollback
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
prediction
forecast
machine learning
LLM
cash-flow prediction
future bill estimation
future kWh estimation
estimated saving
guaranteed saving
ROI
payback period
causal attribution
automatic success claim
automatic failure claim
new recommendation generation
new action-plan generation
equipment replacement recommendation
electrical repair instruction
dashboard final
monthly report
analytics lengkap
subscription changes
IT-DIAG-07
push
PR
merge
deploy
Neon
production
```

---

# 5. Product Contract

IT-DIAG-06 menjawab:

```text
“Bagaimana kondisi periode setelah tindakan
dibandingkan dengan baseline sebelum tindakan?”
```

IT-DIAG-06 tidak menjawab:

```text
“Apakah tindakan pasti menyebabkan penurunan?”
“Berapa penghematan yang akan terjadi selanjutnya?”
“Apakah tindakan ini berhasil secara ilmiah?”
```

Terminologi pengguna:

```text
Outcome Evaluation       → Evaluasi Hasil
Baseline                 → Kondisi Sebelum Tindakan
Follow-up bill           → Tagihan Evaluasi
Cost direction           → Perubahan Biaya per Hari
Usage direction          → Perubahan Pemakaian per Hari
Overall outcome          → Ringkasan Perubahan
Data quality             → Kelengkapan Data Evaluasi
```

Disclaimer minimum:

```text
Evaluasi ini membandingkan data sebelum dan sesudah tindakan.

Perubahan yang terlihat tidak membuktikan bahwa tindakan tersebut
merupakan satu-satunya penyebab.
```

---

# 6. Audit Sebelum Coding

Audit repository aktual:

```text
energy_action_plan schema
action-plan baseline snapshot schema
reviewMode NEXT_ELIGIBLE_BILL
action lifecycle
action terminal immutability
diagnostic session lifecycle
electricity_bill schema
inclusive-period convention
bill overlap convention
bill comparison service
BigInt Rupiah utilities
milli-kWh utilities
tariff decimal utilities
date-only utilities
timezone convention
tenant authorization helpers
transaction convention
advisory-lock convention
repository/service convention
migration discovery
rollback convention
test database helpers
action detail UI
feature flags
```

Audit legacy Laravel secara read-only:

```text
outcome model
baseline-follow-up comparison
next bill selection
normalized period comparison
cost outcome
usage outcome
data-quality outcome
before-after wording
session closure
tenant policies
outcome tests
```

Legacy hanya evidence.

Jangan menyalin implementasi lama tanpa menyesuaikan canonical docs dan target architecture.

Sebelum coding, tentukan:

```text
exact accepted action-plan schema
exact baseline snapshot shape
exact bill snapshot shape
evaluation rule version
eligible bill selection
comparison arithmetic
direction thresholds
overall outcome contract
data-quality contract
session closure contract
persistence schema
idempotency strategy
route structure
test matrix
exact files planned
```

---

# 7. Evaluation Eligibility

Outcome hanya dapat dibuat jika:

```text
authenticated user memiliki business
action plan milik business tersebut
action plan status = COMPLETED
action plan reviewMode = NEXT_ELIGIBLE_BILL
action plan baseline snapshot valid
diagnostic session milik tenant yang sama
diagnostic session status = INSPECTION_IN_PROGRESS
eligible follow-up bill tersedia
outcome belum pernah dibuat untuk action plan tersebut
```

Outcome tidak boleh dibuat dari:

```text
PLANNED action
IN_PROGRESS action
CANCELLED action
action tenant lain
session DRAFT
session COLLECTING_CONTEXT
session ANALYZED
session CLOSED tanpa existing outcome
invalid baseline snapshot
unknown action version
unknown evaluation rule version
```

Client hanya boleh mengirim:

```text
actionPlanId
```

Client tidak boleh menentukan:

```text
businessId
userId
diagnosticSessionId
baselineBillId
followUpBillId
baseline values
follow-up values
cost direction
usage direction
overall outcome
data quality
rule version
evaluatedAt
session status
```

Semua nilai authoritative ditentukan server.

---

# 8. Next Eligible Bill Selection

Review mode canonical:

```text
NEXT_ELIGIBLE_BILL
```

## 8.1 Evaluation eligible-after date

Gunakan tanggal penyelesaian action plan sebagai batas evaluasi.

Tentukan:

```text
evaluationEligibleAfterDate
```

dari `actionPlan.completedAt`.

Aturan timezone:

```text
gunakan business timezone jika canonical field sudah tersedia
jika belum tersedia, gunakan Asia/Jakarta
```

Simpan hasil sebagai date-only ISO:

```text
YYYY-MM-DD
```

Jangan menggunakan timezone browser sebagai sumber authoritative.

## 8.2 Bill eligibility

Follow-up bill harus:

```text
milik business yang sama
bukan baseline source bill
bukan comparison bill baseline
memiliki periodStart dan periodEnd valid
memiliki periodStart > evaluationEligibleAfterDate
lolos existing bill-validity contract
```

`periodStart` harus **strictly after** tanggal action selesai agar periode evaluasi tidak mencampur hari sebelum tindakan selesai.

Bill yang periodenya dimulai pada hari action selesai tidak eligible.

## 8.3 Deterministic selection

Jika lebih dari satu bill eligible, pilih otomatis berdasarkan:

```text
1. periodStart ascending
2. periodEnd ascending
3. createdAt ascending
4. bill ID ascending
```

User tidak boleh memilih bill secara manual.

Ini mencegah cherry-picking periode.

Jika belum ada eligible bill:

```text
jangan membuat outcome row
tampilkan waiting state
```

Copy:

```text
Belum ada tagihan evaluasi yang memenuhi syarat.

Tambahkan tagihan dengan periode yang dimulai setelah tindakan selesai.
```

---

# 9. Evaluation Rule Version

Gunakan rule version eksplisit:

```text
OUTCOME_EVALUATION_RULE_V1
```

Jika repository telah memiliki naming canonical yang accepted, ikuti convention tersebut.

Product Owner decision:

```text
SIMILARITY_BAND_BPS = 500
```

Artinya perubahan dalam rentang:

```text
-5% sampai +5%
```

diklasifikasikan sebagai:

```text
SIMILAR
```

Band ini hanya digunakan untuk menghindari klaim perubahan berarti dari variasi yang kecil.

Band bukan confidence interval dan bukan hasil statistik.

---

# 10. Exact Arithmetic

Dilarang menggunakan JavaScript `Number` untuk nilai authoritative:

```text
Rupiah
kWh
milli-kWh
normalized values
delta
basis points
```

Gunakan:

```text
BigInt
exact decimal utilities
integer cross multiplication
existing accepted normalization helpers
```

## 10.1 Cost per day comparison

Bandingkan normalized cost tanpa floating-point division.

Untuk:

```text
baselineTotalCost
baselineInclusiveDays
followUpTotalCost
followUpInclusiveDays
```

gunakan perbandingan rasional melalui cross multiplication.

Conceptual ratio:

```text
followUpTotalCost / followUpInclusiveDays
dibandingkan dengan
baselineTotalCost / baselineInclusiveDays
```

Jangan membulatkan terlebih dahulu sebelum menentukan arah.

## 10.2 kWh per day comparison

Jika kedua periode memiliki kWh:

```text
baselineMilliKwh
followUpMilliKwh
```

gunakan metode rasional yang sama.

Jika salah satu periode tidak memiliki kWh:

```text
usageDirection = UNAVAILABLE
```

Jangan menebak pemakaian dari nominal biaya.

## 10.3 Delta basis points

Hitung delta basis points secara exact dan deterministic.

Gunakan pure helper yang:

```text
menerima integer/rational inputs
tidak menggunakan floating point
mendefinisikan rounding secara eksplisit
menghasilkan hasil yang sama di semua runtime
```

Gunakan rounding:

```text
round half away from zero
```

Simpan basis points sebagai integer.

---

# 11. Direction Contract

Gunakan direction internal:

```text
LOWER
SIMILAR
HIGHER
UNAVAILABLE
```

`UNAVAILABLE` hanya digunakan untuk metric yang memang tidak tersedia.

Dengan band 500 bps:

```text
delta < -500 bps → LOWER
-500 hingga +500 bps → SIMILAR
delta > +500 bps → HIGHER
```

Gunakan batas secara konsisten pada cost dan usage.

## Tariff direction

Jika kedua periode memiliki tarif:

```text
bandingkan menggunakan exact decimal utility
```

Gunakan:

```text
LOWER
SIMILAR
HIGHER
```

Jika salah satu tidak memiliki tarif:

```text
UNAVAILABLE
```

Jangan menggunakan nominal biaya untuk menebak tarif.

---

# 12. Data Quality Contract

Gunakan:

```text
USAGE_COMPLETE
TARIFF_CONTEXT_ONLY
COST_ONLY
```

## USAGE_COMPLETE

```text
baseline memiliki kWh
follow-up memiliki kWh
```

Outcome dapat membandingkan penggunaan per hari.

## TARIFF_CONTEXT_ONLY

```text
kWh tidak lengkap
baseline dan follow-up memiliki tarif
```

Cost dapat dilihat dengan konteks perubahan tarif.

## COST_ONLY

```text
kWh tidak lengkap
tarif juga tidak lengkap
```

Sistem hanya dapat melaporkan perubahan biaya per hari.

Label pengguna:

```text
USAGE_COMPLETE       → Data biaya dan pemakaian tersedia
TARIFF_CONTEXT_ONLY  → Data biaya dan tarif tersedia
COST_ONLY            → Evaluasi berdasarkan biaya saja
```

`COST_ONLY` bukan error.

---

# 13. Overall Outcome Contract

Gunakan internal code:

```text
POSITIVE_SIGNAL
NO_CLEAR_CHANGE
NEGATIVE_SIGNAL
MIXED_SIGNAL
INCONCLUSIVE
```

Label pengguna:

```text
POSITIVE_SIGNAL  → Ada sinyal perbaikan
NO_CLEAR_CHANGE  → Belum ada perubahan berarti
NEGATIVE_SIGNAL  → Ada sinyal kenaikan
MIXED_SIGNAL     → Hasil perubahan campuran
INCONCLUSIVE     → Belum dapat disimpulkan
```

## 13.1 Jika usage tersedia

Jika `usageDirection != UNAVAILABLE`:

```text
usage LOWER dan cost bukan HIGHER
→ POSITIVE_SIGNAL

usage HIGHER dan cost bukan LOWER
→ NEGATIVE_SIGNAL

usage SIMILAR dan cost SIMILAR
→ NO_CLEAR_CHANGE

kombinasi lainnya
→ MIXED_SIGNAL
```

Contoh mixed:

```text
pemakaian per hari turun
tetapi biaya per hari naik
```

atau:

```text
pemakaian per hari naik
tetapi biaya per hari turun
```

## 13.2 Jika usage tidak tersedia

Jika usage unavailable tetapi kedua tarif tersedia dan:

```text
tariffDirection = SIMILAR
```

gunakan cost:

```text
cost LOWER   → POSITIVE_SIGNAL
cost SIMILAR → NO_CLEAR_CHANGE
cost HIGHER  → NEGATIVE_SIGNAL
```

Jika tarif berubah atau tidak lengkap:

```text
overallOutcome = INCONCLUSIVE
```

Cost direction tetap ditampilkan, tetapi jangan mengeklaim outcome keseluruhan.

## 13.3 Prohibition

Dilarang menggunakan label:

```text
berhasil
gagal
efektif
tidak efektif
terbukti hemat
tidak berhasil hemat
```

---

# 14. Safe Explanations

Penjelasan harus berasal dari metric yang benar-benar tersedia.

## POSITIVE_SIGNAL

```text
Data periode evaluasi menunjukkan nilai per hari yang lebih rendah
dibandingkan kondisi sebelum tindakan.

Perubahan ini belum membuktikan bahwa tindakan merupakan satu-satunya penyebab.
```

## NO_CLEAR_CHANGE

```text
Perubahan per hari masih berada dalam rentang yang dianggap serupa
untuk evaluasi awal ini.
```

## NEGATIVE_SIGNAL

```text
Data periode evaluasi menunjukkan nilai per hari yang lebih tinggi
dibandingkan kondisi sebelum tindakan.

Hal ini tidak membuktikan bahwa tindakan menyebabkan kenaikan.
```

## MIXED_SIGNAL

```text
Biaya dan pemakaian menunjukkan arah perubahan yang berbeda.

Perubahan tarif atau faktor operasional lain dapat memengaruhi hasil.
```

## INCONCLUSIVE

```text
Data yang tersedia belum cukup untuk menyimpulkan arah hasil secara keseluruhan.

Perubahan biaya tetap ditampilkan sebagai informasi, bukan bukti keberhasilan tindakan.
```

Dilarang:

```text
Rencana Hemat berhasil.
Tindakan ini menghemat sekian Rupiah.
Tindakan menyebabkan tagihan turun.
Pompa terbukti menjadi penyebab.
AI menilai tindakan efektif.
```

---

# 15. Persistence Model

Buat migration setelah `0006`.

Expected convention:

```text
drizzle/migrations/0007_action_outcome_evaluations.sql
drizzle/rollbacks/0007_action_outcome_evaluations_rollback.sql
```

Gunakan nama final sesuai convention repository.

Buat tabel minimum:

```text
action_outcome_evaluation
```

Fields minimum:

```text
id
businessId
diagnosticSessionId
actionPlanId

baselineBillId
followUpBillId

ruleVersion
similarityBandBps
evaluationEligibleAfterDate

baselineSnapshotJson
followUpSnapshotJson
comparisonSnapshotJson

costDirection
usageDirection
tariffDirection
dataQualityCode
overallOutcomeCode

explanationSnapshotJson

evaluatedAt
createdAt
updatedAt
```

Constraint minimum:

```text
foreign key ke business
foreign key ke diagnostic session
foreign key ke action plan
foreign key ke baseline bill bila schema memungkinkan
foreign key ke follow-up bill

unique actionPlanId
followUpBillId berbeda dari baselineBillId
similarityBandBps positif
valid direction codes
valid data-quality code
valid overall outcome code
snapshot JSON object nonkosong
explanation snapshot JSON object nonkosong
evaluatedAt wajib
```

Jangan mengubah migration `0000–0006`.

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

# 16. Snapshot Contract

Outcome harus menyimpan snapshot immutable.

## Baseline snapshot

Gunakan baseline snapshot dari accepted action plan.

Jangan membangun ulang baseline dari bill source.

Jangan membaca ulang source bill untuk mengganti nilai baseline.

## Follow-up snapshot

Simpan minimum:

```text
billId
periodStart
periodEnd
inclusiveDays
totalCostRupiah
costPerDay representation
totalKwhMilliKwh nullable
kwhPerDay representation nullable
tariffRupiahPerKwh nullable
capturedAt
```

Gunakan schema serializer yang konsisten dengan baseline snapshot accepted.

## Comparison snapshot

Simpan minimum:

```text
baseline normalized cost representation
follow-up normalized cost representation
costDeltaBps
costDirection

baseline normalized usage representation nullable
follow-up normalized usage representation nullable
usageDeltaBps nullable
usageDirection

baseline tariff nullable
follow-up tariff nullable
tariffDirection

dataQualityCode
overallOutcomeCode
similarityBandBps
```

Snapshot tidak boleh berubah setelah outcome dibuat.

Jika source bill berubah atau bill baru yang lebih awal ditambahkan kemudian:

```text
existing outcome tetap immutable
tidak auto-recompute
tidak auto-replace follow-up bill
```

Re-evaluation bukan scope IT-DIAG-06.

---

# 17. Idempotency dan Concurrency

Repeated evaluation untuk action plan yang sama harus:

```text
mengembalikan outcome yang sama
tidak membuat duplicate
tidak memilih follow-up bill baru
tidak menghitung ulang snapshot
tidak mengubah evaluatedAt
```

Concurrent evaluation test:

```text
dua request evaluate bersamaan
→ tepat satu outcome row
→ follow-up bill sama
→ snapshots sama
→ outcome code sama
→ evaluatedAt sama
→ tidak ada partial state
```

Gunakan:

```text
transaction
row locking
unique constraint
transaction-scoped advisory lock bila diperlukan
database authoritative timestamp
```

Jika tidak ada eligible bill:

```text
jangan membuat partial outcome
jangan membuat placeholder row
```

---

# 18. Diagnostic Session Closure

IT-DIAG-06 mengizinkan transition:

```text
INSPECTION_IN_PROGRESS
→ CLOSED
```

Transition tidak otomatis terjadi hanya karena satu outcome dibuat.

Tambahkan explicit action:

```text
Tutup Sesi Cek Kenaikan
```

Session dapat ditutup hanya jika:

```text
minimal satu outcome evaluation tersedia
tidak ada action plan PLANNED
tidak ada action plan IN_PROGRESS
setiap action plan COMPLETED memiliki outcome evaluation
action plan CANCELLED tidak memerlukan outcome
session milik authenticated tenant
session status = INSPECTION_IN_PROGRESS
```

Jika ada completed action plan tanpa outcome:

```text
closure ditolak
```

Jika seluruh plan hanya CANCELLED dan tidak ada outcome:

```text
closure ditolak
```

Closure harus:

```text
atomic
idempotent
tenant-safe
database timestamp authoritative
```

Repeated close pada session yang sudah `CLOSED`:

```text
mengembalikan existing closed state
tidak mengubah timestamp
```

Setelah `CLOSED`:

```text
tidak boleh memulai inspection baru
tidak boleh membuat action plan baru
tidak boleh membuat outcome baru selain membaca existing outcome
```

Existing pages tetap read-only.

---

# 19. Tenant Isolation

Ownership chain:

```text
authenticated user
→ owned business
→ owned electricity bill
→ owned diagnostic session
→ owned candidate
→ owned inspection plan
→ owned action plan
→ owned outcome evaluation
```

User A tidak boleh:

```text
melihat waiting state action user B
mengevaluasi action user B
membaca outcome user B
memilih bill user B
menutup session user B
mengganti followUpBillId melalui payload
mengganti baseline melalui payload
mengganti outcome code melalui payload
```

Cross-tenant access harus mengikuti existing not-found/forbidden convention tanpa membocorkan keberadaan resource.

---

# 20. Architecture

Gunakan:

```text
React Server Components
→ Server Actions
→ Zod validation
→ Authorization
→ Outcome Evaluation Service
→ Repository
→ PostgreSQL
```

Pisahkan:

```text
eligible bill selector
bill snapshot builder
exact normalized comparison
direction resolver
data-quality resolver
overall-outcome resolver
explanation mapper
outcome repository
outcome service
session closure service
presentation mapper
```

Gunakan pure functions untuk:

```text
rational comparison
basis-point calculation
direction classification
data-quality classification
overall outcome resolution
safe explanation mapping
closure eligibility
```

Server authoritative untuk:

```text
eligible bill
snapshots
similarity band
directions
outcome
explanation
evaluation timestamp
session closure
```

Client tidak boleh menghitung hasil tersebut.

Jangan menambah dependency baru.

---

# 21. Server Actions

Tambahkan Server Actions untuk:

```text
evaluateActionOutcome
closeDiagnosticSession
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

`evaluateActionOutcome` hanya menerima:

```text
actionPlanId
```

`closeDiagnosticSession` hanya menerima:

```text
sessionId
```

---

# 22. UI Minimum

Dari action plan detail route accepted:

```text
/diagnostics/[sessionId]/actions/[actionPlanId]
```

## 22.1 Waiting state

Jika action `COMPLETED` tetapi belum ada eligible bill:

```text
Menunggu Tagihan Evaluasi
```

Tampilkan:

```text
tanggal tindakan selesai
syarat periode berikutnya
link tambah tagihan
penjelasan bahwa outcome belum dapat dibuat
```

Jangan membuat outcome row.

## 22.2 Ready state

Jika eligible bill tersedia:

```text
Evaluasi Hasil
```

Tampilkan bill yang akan dipilih:

```text
periode tagihan evaluasi
```

User tidak dapat mengganti bill.

## 22.3 Outcome route

Preferred route:

```text
/diagnostics/[sessionId]/actions/[actionPlanId]/outcome
```

Gunakan route convention existing jika ada pilihan lebih konsisten.

UI outcome minimum:

```text
judul Evaluasi Hasil
status Rencana Hemat
baseline period
follow-up period
biaya total kedua periode
biaya per hari kedua periode
cost direction
kWh total dan per hari jika tersedia
usage direction jika tersedia
tariff context jika tersedia
data-quality label
overall outcome label
safe explanation
caveats
disclaimer
link kembali ke action
```

Jangan menampilkan:

```text
raw JSON
database ID
rule version
raw enum
raw BigInt
internal basis-point formula
probability
confidence score
estimated future saving
ROI
causal claim
```

## 22.4 Session closure UI

Jika closure eligible:

```text
Tutup Sesi Cek Kenaikan
```

Sebelum submit tampilkan:

```text
Menutup sesi tidak menghapus data.
Hasil, pemeriksaan, dan Rencana Hemat tetap dapat dibaca.
```

Setelah closed:

```text
Sesi Cek Kenaikan Selesai
```

Tidak ada CTA untuk memulai inspection atau action baru.

---

# 23. Unit Tests

Minimum:

```text
eligible-after date Asia/Jakarta
business timezone digunakan jika tersedia
bill pada hari completion tidak eligible
bill setelah completion eligible
earliest eligible bill deterministic
tie-break deterministic
baseline/comparison bills tidak eligible
cross-business bill tidak eligible
no eligible bill menghasilkan waiting state

cost rational comparison exact
kWh rational comparison exact
no JavaScript Number pada authoritative path
basis points positive
basis points negative
round half away from zero
-500 boundary SIMILAR
+500 boundary SIMILAR
below -500 LOWER
above +500 HIGHER

usage unavailable jika salah satu kWh null
tariff unavailable jika salah satu tariff null

USAGE_COMPLETE
TARIFF_CONTEXT_ONLY
COST_ONLY

POSITIVE_SIGNAL
NO_CLEAR_CHANGE
NEGATIVE_SIGNAL
MIXED_SIGNAL
INCONCLUSIVE

cost lower tetapi usage higher → MIXED
usage lower tetapi cost higher → MIXED
cost-only dengan tariff tidak lengkap → INCONCLUSIVE
cost-only dengan tariff sama dan cost lower → POSITIVE_SIGNAL

safe explanation tidak causal
safe explanation tidak menggunakan berhasil/gagal
no saving guarantee
no prediction wording

closure minimal satu outcome
closure ditolak dengan PLANNED action
closure ditolak dengan IN_PROGRESS action
closure ditolak dengan completed action tanpa outcome
cancelled action tidak memblokir
all-cancelled tanpa outcome tidak dapat close
closed terminal
```

---

# 24. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
migration up/down/up
outcome insert
foreign keys
unique actionPlanId
valid enum constraints
JSON constraints
evaluatedAt constraint

evaluate completed action
PLANNED action ditolak
IN_PROGRESS action ditolak
CANCELLED action ditolak
no eligible bill tidak membuat row
eligible bill otomatis dipilih
bill pada completion date dilewati
earliest eligible bill dipilih
manual follow-up spoof ditolak

baseline snapshot reused exact
follow-up snapshot exact
comparison snapshot exact
Rupiah exact string
milli-kWh exact string
missing kWh null
tariff context exact

repeated evaluation idempotent
concurrent evaluation satu row
concurrent evaluation timestamp sama
later earlier bill tidak mengubah existing outcome
source bill change tidak mengubah existing outcome

cost-only INCONCLUSIVE
usage-complete positive
usage-complete negative
mixed result
similar result

cross-tenant evaluate ditolak
cross-tenant read ditolak
cross-tenant close ditolak

close session dengan semua condition terpenuhi
close ditolak jika active action
close ditolak jika missing outcome
close repeated idempotent
closedAt konsisten
new inspection setelah close ditolak
new action setelah close ditolak
new outcome pada closed session ditolak
existing outcome tetap readable

migration 0000–0006 tidak berubah
```

---

# 25. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
authentication
plan/trial
onboarding
business
bill input
bill overlap
bill comparison
BigInt Rupiah
tenant isolation
diagnostic session
questionnaire
candidate generation
candidate ranking
DATA_QUALITY
guided inspection
inspection safety
inspection concurrency
inspection immutability
action catalog
action eligibility
action baseline
action lifecycle
action concurrency
action terminal immutability
responsive UI
reduced motion
```

Jangan menghapus, skip, atau melemahkan accepted tests.

---

# 26. Runtime Smoke

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
create baseline bills
complete questionnaire
generate candidates
complete inspection
create Rencana Hemat
start action
complete action

open action detail
verify waiting state
create bill whose period starts on action completion date
verify bill not eligible
create bill whose period starts after action completion date
verify evaluate CTA
evaluate outcome
verify selected bill
verify before-after normalized comparison
verify safe non-causal wording
reload
verify outcome immutable

create second action plan
leave it IN_PROGRESS
verify session closure blocked
complete second action
add eligible bill
evaluate second outcome
close session
verify session CLOSED
verify pages read-only

logout

register user B
attempt outcome route user A
verify 404
attempt evaluation user A action
verify denied
attempt close user A session
verify denied
```

Tambahkan scenario:

```text
kWh lengkap → usage comparison
kWh tidak lengkap → cost-only atau tariff-context outcome
cost turun tetapi usage naik → MIXED_SIGNAL
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

# 27. Browser Verification

Routes minimum:

```text
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
1280×800
```

Verify:

```text
waiting-for-bill state
add-bill link
same-day bill remains ineligible
next full-period bill eligible
evaluate pending state
double-submit protection
baseline card
follow-up card
cost direction
usage direction
tariff context
USAGE_COMPLETE label
TARIFF_CONTEXT_ONLY label
COST_ONLY label
POSITIVE_SIGNAL
NO_CLEAR_CHANGE
NEGATIVE_SIGNAL
MIXED_SIGNAL
INCONCLUSIVE
safe caveat
no causal wording
no saving guarantee
outcome reload immutable
closure blocked state
close-session CTA
closed-session read-only state
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

# 28. Node.js 24 Quality Gates

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

Accepted IT-DIAG-05 audit reference:

```text
npm audit:
4 moderate
4 high
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

# 29. Hard Stops

Berhenti jika:

```text
accepted base tidak ditemukan
workspace kotor atau divergen
lebih dari satu active task
canonical outcome contract konflik
baseline snapshot tidak dapat dibaca exact
eligible bill selection nondeterministic
follow-up bill membutuhkan pilihan client
Rupiah atau kWh membutuhkan floating point
cost-only dianggap bukti pemakaian
outcome menggunakan causal claim
outcome menggunakan berhasil/gagal
outcome menghitung future saving
concurrent evaluation membuat duplicate
existing outcome dapat berubah
tenant isolation gagal
session close dengan active action
session close tanpa outcome
closed session dapat dimutasi
dependency baru diperlukan
production atau Neon diperlukan
build membutuhkan database aktif
scope mulai membuat prediction
scope mulai mengerjakan dashboard
scope mulai mengerjakan IT-DIAG-07
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

# 30. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-06 outcome evaluation
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(outcomes): add tenant-safe outcome persistence

feat(outcomes): add exact next-bill evaluation and session closure

test(outcomes): verify comparisons concurrency and non-causal wording
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

# 31. Definition of Done

```text
[ ] branch berasal dari accepted IT-DIAG-05 HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] IT-DIAG-05 prompt diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0006 tidak berubah
[ ] migration 0007 tersedia
[ ] rollback 0007 tersedia
[ ] migration up/down/up lulus

[ ] completed action eligibility
[ ] deterministic next eligible bill
[ ] same-day bill tidak eligible
[ ] user tidak dapat memilih follow-up bill
[ ] waiting state tanpa outcome row
[ ] immutable baseline reused
[ ] immutable follow-up snapshot
[ ] immutable comparison snapshot

[ ] exact cost comparison
[ ] exact usage comparison
[ ] exact tariff comparison
[ ] no floating point authoritative
[ ] similarity band 500 bps
[ ] cost direction
[ ] usage direction
[ ] tariff direction
[ ] USAGE_COMPLETE
[ ] TARIFF_CONTEXT_ONLY
[ ] COST_ONLY

[ ] POSITIVE_SIGNAL
[ ] NO_CLEAR_CHANGE
[ ] NEGATIVE_SIGNAL
[ ] MIXED_SIGNAL
[ ] INCONCLUSIVE
[ ] no causal claim
[ ] no success/failure claim
[ ] no future-saving estimate
[ ] no prediction

[ ] evaluation idempotent
[ ] concurrent evaluation satu row
[ ] evaluatedAt database-authoritative
[ ] existing outcome immutable
[ ] cross-tenant evaluate ditolak
[ ] cross-tenant read ditolak

[ ] explicit session closure
[ ] closure memerlukan outcome
[ ] closure menolak active plans
[ ] closure menolak missing outcomes
[ ] closure idempotent
[ ] CLOSED terminal
[ ] closed session read-only
[ ] cross-tenant close ditolak

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
[ ] IT-DIAG-07 belum dimulai
[ ] AI/ML belum dimulai
```

---

# 32. Final Report

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

Migration dan rollback
Migration up/down/up
Outcome schema
Evaluation rule version
Similarity band
Eligible-after-date rule
Evaluation timezone
Next eligible bill selection
Tie-break rules
Waiting-state behavior

Baseline snapshot reuse
Follow-up snapshot
Comparison snapshot
Rupiah representation
kWh representation
Tariff representation
Cost direction
Usage direction
Tariff direction
Data-quality codes
Overall-outcome codes
Safe wording review
Causal-wording audit
Saving-claim audit

Evaluation idempotency
Concurrent evaluation
Outcome immutability
Session closure eligibility
Session closure idempotency
Closed-session behavior
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
IT-DIAG-07 status
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
jangan mengerjakan IT-DIAG-07
jangan membuat dashboard final
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
