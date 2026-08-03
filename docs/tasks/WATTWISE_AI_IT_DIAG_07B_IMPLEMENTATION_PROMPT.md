# WattWise AI — Implementation Prompt IT-DIAG-07B

## Monthly Business Electricity Report Integration

Keputusan Product Owner:

```text
IT-DIAG-07A — ACCEPTED LOCALLY
```

Accepted base:

```text
376af72373198313814ed687bbe55e943fa10a26
```

PERINGATAN:

```text
Jangan menjalankan task ini selama placeholder
376af72373198313814ed687bbe55e943fa10a26
belum diganti dengan full SHA final accepted IT-DIAG-07A.
```

Jika placeholder masih tersedia:

```text
BLOCKED — DECISION REQUIRED
```

Implementasikan tepat satu fase:

```text
IT-DIAG-07B — Monthly Report Integration
```

Tujuan:

```text
tagihan usaha
+ perbandingan tagihan
+ perjalanan Cek Kenaikan
+ candidate
+ inspection
+ Rencana Hemat
+ outcome evaluation

→ disusun menjadi laporan bulanan tenant-safe
→ menggunakan data accepted tanpa menghitung ulang domain
→ mudah dibaca di layar
→ dapat dicetak melalui browser
→ tidak mengandung prediksi atau klaim sebab-akibat
```

Laporan harus generik untuk UMKM.

Jangan membuat laporan yang hanya relevan untuk pemilik kos.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=376af72373198313814ed687bbe55e943fa10a26
TARGET_BRANCH=feature/it-diag-07b-monthly-report
TARGET_PHASE=IT-DIAG-07B

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_07B_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md

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
DEFAULT_REPORT_TIMEZONE=Asia/Jakarta
```

---

# 2. Sumber Kebenaran

Baca lengkap sesuai urutan:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_07B_IMPLEMENTATION_PROMPT.md
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

Monthly report harus menggunakan kontrak accepted dari:

```text
electricity bills
bill comparison
diagnostic session
candidate ranking
guided inspection
action plan
outcome evaluation
dashboard business context
```

Jangan membuat kontrak domain baru.

Jika laporan hanya dapat dibuat dengan mengubah lifecycle accepted:

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
376af72373198313814ed687bbe55e943fa10a26
```

Workspace harus clean.

## 3.2 Branch

Buat branch langsung dari accepted HEAD:

```powershell
git switch -c feature/it-diag-07b-monthly-report `
  376af72373198313814ed687bbe55e943fa10a26
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
  376af72373198313814ed687bbe55e943fa10a26 `
  HEAD
```

## 3.3 Task activation

Pindahkan tanpa mengubah isi historis:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md
```

ke:

```text
docs/archive/WATTWISE_AI_IT_DIAG_07A_IMPLEMENTATION_PROMPT.md
```

Simpan prompt ini sebagai:

```text
docs/tasks/WATTWISE_AI_IT_DIAG_07B_IMPLEMENTATION_PROMPT.md
```

Pastikan tepat satu active task.

Buat docs-only activation commit:

```text
docs(tasks): activate IT-DIAG-07B monthly report
```

Activation commit harus menjadi direct child accepted IT-DIAG-07A HEAD.

---

# 4. Product Decision

IT-DIAG-07B membuat **laporan dinamis read-only** dari data authoritative yang sudah ada.

Product Owner menetapkan:

```text
Tidak ada report snapshot persistence.
Tidak ada tabel laporan baru.
Tidak ada migration baru.
Tidak ada background job.
Tidak ada PDF generator.
Tidak ada file upload.
Tidak ada email delivery.
```

Laporan tersedia sebagai:

```text
server-rendered HTML
responsive report page
print-friendly browser view
```

Pengguna dapat menggunakan fungsi cetak browser.

Tombol yang diperbolehkan:

```text
Cetak Laporan
```

Jangan menggunakan label:

```text
Unduh PDF
```

karena aplikasi tidak membuat file PDF sendiri pada fase ini.

---

# 5. Scope

## Diizinkan

```text
monthly report route
business-context integration
month selection
monthly-report read model
monthly-report composition service
bill-period summary
accepted bill comparison presentation
diagnostic journey summary
candidate summary
inspection summary
action-plan summary
outcome summary
report completeness state
safe caveats
print-friendly layout
browser print action
dashboard report entry point
tenant authorization
server-side feature flag
unit tests
integration tests
runtime verification
browser verification
```

## Dilarang

```text
report snapshot table
database persistence
migration
background report generation
PDF library
PDF file generation
CSV export
email report
scheduled report
report sharing token
public report URL
prediction
forecast
machine learning
LLM
future savings estimate
ROI
payback
causal attribution
new candidate generation
new action recommendation
domain recomputation
analytics implementation
entitlement implementation
IT-DIAG-08
push
PR
merge
deploy
Neon
production
```

---

# 6. Generic UMKM Contract

Report shell harus generik.

Gunakan:

```text
Laporan Listrik Usaha
Ringkasan Tagihan
Perjalanan Cek Kenaikan
Pemeriksaan
Rencana Hemat
Evaluasi Hasil
```

Jangan hardcode:

```text
Laporan Kos
Penghuni kos
Kamar kos
Pemilik kos
Pompa kos
```

Informasi khusus segmen hanya boleh muncul jika berasal dari:

```text
candidate presentation
inspection catalog
action catalog
business segment presentation
```

Report harus tetap dapat dipakai ketika knowledge pack baru ditambahkan untuk:

```text
laundry
F&B
minimarket
frozen food
homestay
bengkel
usaha produksi kecil
```

---

# 7. Route dan Navigation

Preferred route:

```text
/reports/monthly?businessId=<owned-business-id>&month=YYYY-MM
```

Route harus:

```text
authenticated
server-rendered
force-dynamic
tenant-safe
business-scoped
not statically cached across users
```

Tambahkan entry dari dashboard:

```text
Lihat Laporan Bulanan
```

Entry harus menjadi secondary action.

Jangan mengganti deterministic primary CTA dashboard.

Tambahkan navigation entry bila konsisten dengan existing navigation:

```text
Laporan
```

Dashboard dan report harus mempertahankan selected business context.

---

# 8. Report Month Contract

Parameter:

```text
month=YYYY-MM
```

Gunakan strict Zod validation.

Valid:

```text
2026-01
2026-08
```

Tidak valid:

```text
2026-8
26-08
2026-13
teks bebas
```

Month tidak boleh berada setelah bulan berjalan menurut report timezone.

Timezone:

```text
gunakan business timezone jika canonical field tersedia
jika belum tersedia gunakan Asia/Jakarta
```

Jangan menggunakan timezone browser sebagai sumber authoritative.

## Default month

Jika query `month` tidak tersedia:

```text
pilih bulan dari period_end tagihan terbaru selected business
```

Jika belum ada tagihan:

```text
gunakan bulan berjalan
tampilkan empty state
```

## Month boundaries

Bangun:

```text
monthStart
nextMonthStart
```

sebagai date-only boundaries.

Gunakan rentang:

```text
monthStart <= date < nextMonthStart
```

---

# 9. Bill Inclusion Contract

Tagihan masuk laporan bulan berdasarkan:

```text
bill.period_end berada dalam report month
```

Ini adalah Product Owner decision.

Alasan:

```text
setiap bill masuk tepat satu monthly report
tidak perlu membagi konsumsi lintas kalender
tidak membuat estimasi prorata
tidak menghitung konsumsi harian yang tidak tercatat
```

Laporan wajib menjelaskan:

```text
Tagihan dikelompokkan berdasarkan bulan berakhirnya periode tagihan.
Laporan ini tidak membagi pemakaian menjadi kalender harian.
```

Dilarang:

```text
memecah tagihan lintas bulan
memperkirakan konsumsi kalender
melakukan prorata nominal atau kWh
```

---

# 10. Primary Bill Contract

Jika terdapat lebih dari satu tagihan yang berakhir dalam report month:

```text
tampilkan seluruh tagihan secara ringkas
```

Pilih satu primary bill secara deterministik untuk perjalanan diagnosis:

```text
1. period_end DESC
2. period_start DESC
3. created_at DESC
4. id DESC
```

Report harus menyebut:

```text
Tagihan utama laporan
```

Jangan menyembunyikan tagihan lain.

Jika hanya satu tagihan:

```text
tagihan tersebut menjadi primary bill
```

Jika tidak ada tagihan:

```text
tidak ada primary bill
tidak ada diagnostic journey yang direkonstruksi
tampilkan empty state
```

---

# 11. Previous Bill Comparison

Untuk primary bill, pilih previous bill accepted berdasarkan urutan periode:

```text
period_end < primaryBill.period_start
```

Pilih:

```text
1. period_end DESC
2. period_start DESC
3. created_at DESC
4. id DESC
```

Gunakan accepted:

```text
compareBills
inclusive-day convention
BigInt Rupiah
milli-kWh convention
safe comparison wording
```

Jangan membuat comparison formula baru.

Jika tidak ada previous bill:

```text
tampilkan bahwa perbandingan belum tersedia
```

---

# 12. Diagnostic Journey Inclusion

Untuk laporan V1, diagnostic journey harus terkait primary bill.

Gunakan existing accepted relation dari diagnostic session ke:

```text
current/source bill
comparison bill
comparison snapshot
```

Pilih session terbaru yang authoritative untuk primary bill menggunakan deterministic order repository.

Jangan memilih session hanya berdasarkan timestamp bulan.

Ini memastikan report menjelaskan:

```text
perjalanan yang dibuat untuk tagihan utama tersebut
```

Jika tidak ada session:

```text
tampilkan Belum ada Cek Kenaikan untuk tagihan ini
```

Jangan menggabungkan candidate, inspection, action, atau outcome dari session bisnis lain atau tagihan lain.

---

# 13. Monthly Report Read Model

Buat typed:

```text
MonthlyReportReadModel
```

Minimum:

```text
businessSummary
reportMonth
monthLabel
timezoneLabel

billSummaries
primaryBillSummary nullable
previousBillSummary nullable
billComparisonSummary nullable

diagnosticSummary nullable
candidateSummaries
inspectionSummaries
actionPlanSummaries
outcomeSummaries

reportCompleteness
safeCaveats
availableMonths
navigationLinks
generatedAtPresentation
```

Read model harus:

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
probabilities
confidence
secrets
tokens
database URLs
unneeded internal IDs
```

---

# 14. Report Completeness Contract

Gunakan presentation-only code:

```text
NO_BILL
BILL_ONLY
DIAGNOSTIC_IN_PROGRESS
ACTION_IN_PROGRESS
WAITING_EVALUATION
EVALUATED
SESSION_CLOSED
```

Ini bukan domain status baru dan tidak disimpan ke database.

Resolver harus pure dan deterministic.

## NO_BILL

```text
tidak ada bill yang berakhir dalam report month
```

Label:

```text
Belum ada data tagihan
```

## BILL_ONLY

```text
primary bill tersedia
tidak ada diagnostic session terkait
```

Label:

```text
Ringkasan tagihan tersedia
```

## DIAGNOSTIC_IN_PROGRESS

```text
session tersedia
belum mencapai active/completed action
```

Label:

```text
Cek Kenaikan sedang berjalan
```

## ACTION_IN_PROGRESS

```text
minimal satu action PLANNED atau IN_PROGRESS
```

Label:

```text
Rencana Hemat sedang berjalan
```

## WAITING_EVALUATION

```text
action COMPLETED
outcome belum tersedia
```

Label:

```text
Menunggu evaluasi tagihan berikutnya
```

## EVALUATED

```text
minimal satu outcome tersedia
session belum CLOSED
```

Label:

```text
Evaluasi hasil tersedia
```

## SESSION_CLOSED

```text
diagnostic session CLOSED
```

Label:

```text
Perjalanan Cek Kenaikan selesai
```

Precedence harus eksplisit dan unit-tested.

---

# 15. Report Sections

## 15.1 Report Header

Tampilkan:

```text
Laporan Listrik Usaha
business name
business segment
report month
report completeness label
```

Jangan menampilkan internal tenant atau business ID.

## 15.2 Ringkasan Bulan

Tampilkan:

```text
jumlah tagihan yang berakhir bulan tersebut
total nominal seluruh tagihan bulan tersebut
jumlah periode tercatat
kWh total hanya bila semua bill memiliki kWh
data completeness note
```

Gunakan exact BigInt untuk aggregate Rupiah.

Untuk kWh:

```text
jika semua bill memiliki kWh
→ tampilkan exact aggregate

jika sebagian bill tidak memiliki kWh
→ jangan tampilkan total seolah lengkap
→ tampilkan Data kWh belum lengkap
```

Jangan menjumlahkan tarif.

## 15.3 Daftar Tagihan

Untuk setiap bill:

```text
period start
period end
inclusive days
total cost
cost per day
kWh nullable
tariff nullable
primary-bill indicator
```

Gunakan bounded list.

Untuk V1, maksimum:

```text
12 bills dalam satu report month
```

Jika melebihi batas:

```text
BLOCKED — DECISION REQUIRED
```

Kondisi tersebut menunjukkan anomali data atau kebutuhan pagination yang belum dirancang.

## 15.4 Perbandingan Tagihan Utama

Tampilkan accepted comparison:

```text
primary bill
previous bill
cost direction
cost per day
usage direction bila kWh lengkap
tariff context bila tersedia
safe wording
```

Jangan menyamakan biaya dengan pemakaian.

## 15.5 Perjalanan Cek Kenaikan

Tampilkan:

```text
session status
tanggal mulai
tanggal selesai bila CLOSED
tagihan yang menjadi sumber
```

Raw enum tidak ditampilkan.

## 15.6 Candidate Summary

Maksimal tiga candidate accepted:

```text
title
rank presentation
safe explanation
inspection state
```

Jangan tampilkan:

```text
internal score
probability
confidence
support weight
rule code
```

## 15.7 Inspection Summary

Tampilkan:

```text
inspection title
status
result label
completed date nullable
```

Gunakan hasil accepted:

```text
Ditemukan Masalah
Tidak Ditemukan
Tidak Tahu
Butuh Bantuan
```

Jangan menghitung ulang aggregate result.

## 15.8 Rencana Hemat Summary

Tampilkan:

```text
action title
status
planned start date
started date nullable
completed/cancelled date nullable
review target
```

Jangan menyebut action `COMPLETED` sebagai berhasil.

## 15.9 Outcome Summary

Jika outcome tersedia:

```text
baseline period
follow-up period
cost direction
usage direction nullable
tariff direction nullable
data-quality label
overall outcome label
safe explanation
```

Gunakan immutable accepted snapshots.

Jangan menghitung ulang outcome.

## 15.10 Caveat

Minimum:

```text
Laporan ini merangkum data yang dicatat pada WattWise AI.

Perubahan sebelum dan sesudah tidak membuktikan bahwa satu tindakan
merupakan satu-satunya penyebab.
```

Jika kWh tidak lengkap:

```text
Evaluasi pemakaian terbatas karena data kWh belum lengkap.
```

---

# 16. Available Month Selector

Report menyediakan pilihan bulan.

Available months berasal dari:

```text
distinct bill.period_end month milik selected business
```

Urutkan:

```text
descending terbaru ke terlama
```

Maksimum:

```text
24 bulan terakhir yang memiliki bill
```

Selector harus:

```text
tenant-safe
server-authorized
mempertahankan businessId
menghasilkan URL canonical
```

Jangan mengambil available months dari client state.

Jika user memasukkan valid past month tanpa bill:

```text
izinkan
tampilkan NO_BILL state
```

---

# 17. Print-Friendly Contract

Tambahkan tombol:

```text
Cetak Laporan
```

Implementasi boleh menggunakan:

```text
window.print()
```

Gunakan Client Component kecil hanya untuk print action.

Print layout harus:

```text
menyembunyikan navigation
menyembunyikan selector
menyembunyikan interactive buttons
mempertahankan judul
mempertahankan business name
mempertahankan report month
mempertahankan caveat
menghindari text clipping
menghindari horizontal overflow
```

Gunakan CSS print media yang sudah tersedia atau tambahkan scoped print CSS.

Jangan:

```text
menambah dependency PDF
membuat binary PDF
menyimpan file report
mengunggah file
mengirim report melalui email
```

---

# 18. Dashboard Integration

Tambahkan secondary link:

```text
Lihat Laporan Bulanan
```

Tampilkan jika selected business memiliki minimal satu bill.

Default link menggunakan bulan dari:

```text
period_end tagihan terbaru
```

Link harus mempertahankan:

```text
businessId
month
```

Jangan mengubah primary next-action resolver IT-DIAG-07A.

Tambahkan unit regression:

```text
report link tidak menggantikan primary CTA
```

---

# 19. Safe Wording

Dilarang:

```text
penyebab pasti
tindakan berhasil
tindakan gagal
terbukti hemat
pasti menghemat
potensi hemat Rp
prediksi tagihan
tagihan akan turun
AI mendeteksi
confidence percentage
```

Allowed:

```text
biaya tercatat lebih rendah
biaya tercatat lebih tinggi
pemakaian per hari lebih rendah
ada sinyal perubahan
belum dapat disimpulkan
Rencana Hemat telah dicatat selesai
```

Nama domain:

```text
Rencana Hemat
```

boleh digunakan, tetapi tidak boleh dipakai sebagai klaim hasil.

---

# 20. Feature Flag

Gunakan server-side feature flag:

```text
MONTHLY_REPORTS_ENABLED
```

Ikuti existing feature-flag convention.

Jika disabled:

```text
report route tidak menyusun data
dashboard tidak menampilkan report link
gunakan safe fallback ke dashboard
```

Jangan mempercayai flag dari browser.

---

# 21. Tenant Isolation

Ownership chain:

```text
authenticated user
→ owned active business
→ owned bills
→ owned diagnostic session
→ owned candidates
→ owned inspections
→ owned action plans
→ owned outcomes
```

User A tidak boleh:

```text
melihat report business user B
melihat available months user B
menggunakan businessId user B
melihat tagihan user B
melihat diagnostic journey user B
melihat outcome user B
mengetahui bahwa report user B tersedia
```

Cross-tenant request harus menghasilkan safe not-found response.

Data dari dua business milik user yang sama juga tidak boleh tercampur.

---

# 22. Query Strategy

Preferred architecture:

```text
Monthly Report RSC
→ authentication dan business authorization
→ monthly-report composition service
→ bounded tenant-safe report repository
→ accepted domain presentation helpers
→ MonthlyReportReadModel
→ report UI
```

Hindari:

```text
query di setiap section component
N+1 query per candidate
N+1 query per inspection
N+1 query per action
browser-side aggregation
recomputing outcome
```

Target bounded query count:

```text
maksimum 4 repository queries per report
```

Suggested:

```text
1. owned active businesses + selected business
2. available months + bills in selected month + previous bill
3. diagnostic journey linked to primary bill
4. bounded candidate/inspection/action/outcome graph jika tidak tergabung pada query 3
```

Dokumentasikan actual query count dan uji di integration suite.

Jika query count tumbuh berdasarkan jumlah candidate/action:

```text
NOT VERIFIED — CORRECTION REQUIRED
```

---

# 23. No Migration Decision

IT-DIAG-07B tidak membutuhkan migration.

Dilarang menambah:

```text
monthly_report
report_snapshot
report_file
report_export
report_job
report_delivery
```

Jangan mengubah migration atau rollback `0000–0007`.

Jika persistence baru ternyata diperlukan:

```text
BLOCKED — DECISION REQUIRED
```

---

# 24. Unit Tests

Minimum:

```text
strict YYYY-MM validation
future month ditolak
default month latest bill
default current month tanpa bill
month boundaries Asia/Jakarta
business timezone digunakan jika canonical tersedia

bill inclusion berdasarkan period_end
bill lintas bulan hanya masuk pada month period_end
tidak ada prorata
primary bill deterministic
previous bill deterministic

NO_BILL
BILL_ONLY
DIAGNOSTIC_IN_PROGRESS
ACTION_IN_PROGRESS
WAITING_EVALUATION
EVALUATED
SESSION_CLOSED
report completeness precedence deterministic

aggregate Rupiah exact BigInt
all-kWh aggregate exact
partial kWh tidak ditampilkan sebagai total lengkap
tariff tidak dijumlahkan

candidate maksimal tiga
inspection result reused
action status reused
outcome reused
no domain recomputation

report wording generik
tidak hardcode Kos
tidak menyebut action berhasil
tidak mengandung prediction
tidak mengandung saving guarantee
tidak mengandung causal claim

read model tidak mengekspos internal score
read model tidak mengekspos raw JSON
read model tidak mengekspos rule version
report link tidak menggantikan dashboard primary CTA
```

---

# 25. Integration Tests

Gunakan PostgreSQL 16 disposable.

Minimum:

```text
report tanpa bill
report satu bill
report beberapa bill satu month
bill berakhir bulan lain tidak masuk
primary bill deterministic
previous bill selected correctly
accepted comparison reused

report tanpa diagnostic
report questionnaire aktif
report candidate tersedia
report inspection aktif
report action aktif
report waiting evaluation
report outcome tersedia
report closed session

available months distinct dan ordered
available months maksimal 24
valid empty month menghasilkan NO_BILL
future month ditolak
invalid month ditolak

multiple business terisolasi
selected business authoritative
inactive business ditolak
foreign business ditolak
cross-tenant report 404

candidate maksimum tiga
report data linked ke primary bill
journey business lain tidak tercampur
raw internal fields tidak ter-serialize

server-side feature flag
bounded query count
migration 0000–0007 tidak berubah
package manifest tidak berubah
```

---

# 26. Regression Tests

Seluruh accepted tests harus tetap lulus:

```text
authentication
plan/trial
onboarding
business
multi-business dashboard
bill input
bill overlap
bill comparison
BigInt Rupiah
tenant isolation
diagnostic session
questionnaire
candidate ranking
guided inspection
action plan
outcome evaluation
session closure
dashboard next-action resolver
dashboard query bound
responsive UI
reduced motion
```

Jangan menghapus, skip, atau melemahkan accepted tests.

---

# 27. Runtime Smoke

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
create business A
create two bills ending in different months

open dashboard
open latest monthly report
verify business and month context
verify latest bill summary
verify comparison
verify no diagnostic state

complete Cek Kenaikan for latest bill
complete inspection
create and complete Rencana Hemat
add eligible evaluation bill
create outcome
close session

reload original monthly report
verify journey and outcome summary
verify safe non-causal wording
verify print button

create business B owned by same user
create separate bill
verify business selector
verify report data does not mix

logout
register user C
attempt report business A
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

# 28. Browser Verification

Routes minimum:

```text
/dashboard
/reports/monthly
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
dashboard report link
business context preserved
month selector
NO_BILL report
BILL_ONLY report
diagnostic report
action-in-progress report
waiting-evaluation report
evaluated report
closed-session report

bill list
primary-bill indicator
comparison summary
candidate maximum three
inspection labels
action labels
outcome labels
data-quality caveat

print button keyboard accessible
print media hides navigation
print content retains title/business/month/caveat
native scrolling
visible focus
reduced motion
no horizontal overflow
no clipped text
no hydration warning
no React warning
no GSAP warning
no framework console error
no HTTP 5xx
cross-tenant report 404
```

Jangan menyatakan browser PASS tanpa evidence.

---

# 29. Node.js 24 Quality Gates

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

Gunakan audit IT-DIAG-07A sebagai accepted reference setelah evidence closure.

Advisory database dapat berubah.

Bandingkan accepted base dan current lockfile menggunakan advisory database yang sama.

`package.json` dan `package-lock.json` tidak boleh berubah.

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

# 30. Hard Stops

Berhenti jika:

```text
accepted base belum diganti dengan full SHA
accepted base tidak ditemukan
workspace kotor atau divergen
lebih dari satu active task
report membutuhkan domain lifecycle baru
report membutuhkan migration
report membutuhkan dependency baru
report membutuhkan PDF generator
report membutuhkan background job
report membutuhkan source data tenant lain
report month selection nondeterministic
primary bill selection nondeterministic
report memecah bill secara prorata
report menghitung ulang candidate
report menghitung ulang inspection result
report menghitung ulang action outcome
cross-business data tercampur
tenant isolation gagal
report mengekspos internal score
report menggunakan causal claim
report menggunakan prediction
report menghitung future savings
query count menjadi N+1
production atau Neon diperlukan
scope mulai mengerjakan entitlement
scope mulai mengerjakan analytics
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

# 31. Commit Rules

Activation commit:

```text
docs(tasks): activate IT-DIAG-07B monthly report
```

Setelah relevant gates lulus, buat maksimal 1–3 implementation commits.

Contoh:

```text
feat(reports): add tenant-safe monthly report read model

feat(reports): add monthly report and print-friendly UI

test(reports): verify report periods isolation and safe wording
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

# 32. Definition of Done

```text
[ ] final accepted IT-DIAG-07A SHA digunakan
[ ] branch berasal dari accepted IT-DIAG-07A HEAD
[ ] activation commit direct child accepted base
[ ] exactly one active task
[ ] IT-DIAG-07A prompt diarsipkan
[ ] baseline docs tidak berubah
[ ] Laravel tidak berubah
[ ] migration 0000–0007 tidak berubah
[ ] tidak ada migration baru
[ ] tidak ada dependency baru

[ ] monthly report route
[ ] authenticated dan tenant-safe
[ ] business selector context
[ ] strict YYYY-MM
[ ] report timezone
[ ] available month selector
[ ] bill inclusion by period_end
[ ] no calendar proration
[ ] deterministic primary bill
[ ] deterministic previous bill
[ ] accepted comparison reused

[ ] generic UMKM wording
[ ] no Kos hardcode dalam report shell
[ ] bill summary
[ ] diagnostic summary
[ ] maximum three candidates
[ ] inspection summary
[ ] action summary
[ ] outcome summary
[ ] safe caveats
[ ] report completeness resolver

[ ] no domain recomputation
[ ] no internal score
[ ] no raw JSON
[ ] no rule version
[ ] no prediction
[ ] no saving estimate
[ ] no causal claim

[ ] print-friendly page
[ ] print button
[ ] no PDF dependency
[ ] dashboard report link
[ ] dashboard primary CTA unchanged

[ ] bounded query count
[ ] no N+1
[ ] server-side feature flag
[ ] cross-tenant report denied
[ ] no cross-business mixing

[ ] unit tests lulus
[ ] integration tests lulus
[ ] accepted regression tests lulus
[ ] Node 24 typecheck lulus
[ ] Node 24 lint lulus
[ ] Node 24 build lulus
[ ] runtime smoke lulus
[ ] browser review lulus
[ ] print review lulus
[ ] responsive review lulus
[ ] keyboard review lulus
[ ] reduced-motion review lulus
[ ] audit dilaporkan jujur
[ ] Docker resources dibersihkan
[ ] workspace clean
[ ] no push/PR/merge/deploy
[ ] IT-DIAG-08 belum dimulai
[ ] AI/ML belum dimulai
```

---

# 33. Final Report

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

Report route
Navigation changes
Business-context contract
Month validation
Timezone
Default month
Month boundaries
Available-month behavior

Bill inclusion rule
Primary-bill rule
Previous-bill rule
Comparison behavior
Multiple-bill behavior
kWh completeness behavior

MonthlyReportReadModel
Composition-service architecture
Query strategy
Actual bounded query count
Feature flag

Report completeness codes
Bill summary
Diagnostic summary
Candidate summary
Inspection summary
Action summary
Outcome summary
Closed-session behavior
Generic UMKM wording audit
Kos-hardcode audit
Causal-wording audit
Prediction audit
Saving-claim audit
Internal-field exposure audit

Print behavior
Print CSS verification
Dashboard report-link behavior
Dashboard primary-CTA regression

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
Print review
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
IT-DIAG-08 status
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
jangan mengerjakan IT-DIAG-08
jangan mengerjakan entitlement
jangan mengerjakan analytics
jangan mengerjakan prediction atau ML
jangan push
jangan PR
jangan merge
jangan deploy
```
