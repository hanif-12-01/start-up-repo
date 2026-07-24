# WattWise AI — Implementation Prompt IT-DIAG-01A

## Journey Gate, Plan/Trial Foundation, Basic Onboarding, dan Business Minimum

Gunakan prompt ini setelah fase berikut diterima oleh Product Owner:

```text
IT-DIAG-00C — Database dan Auth Foundation
Status: ACCEPTED LOCALLY
Approved local HEAD:
bcef7f49c96ec6413af557afae8f313d80fe16f3
Neon dev verification: pending
```

Prompt ini memberi izin untuk mengimplementasikan **tepat satu subfase bounded**:

```text
IT-DIAG-01A — Journey Gate dan Business Minimum
```

Prompt ini tidak memberi izin untuk mengerjakan input tagihan, perhitungan tagihan, diagnosis, dashboard, push, pull request, merge, preview deployment, production deployment, atau migration production.

---

# 1. Alasan Subfase Ini Ada

Canonical PRD mewajibkan urutan:

```text
Register
→ Plan choice
→ Onboarding
→ Product
```

Strategi IT menetapkan IT-DIAG-01 sebagai fase Bill-First, tetapi business dan tagihan tidak boleh diekspos sebagai product journey sebelum plan choice dan onboarding tersedia.

Karena itu IT-DIAG-01 dibagi menjadi:

```text
IT-DIAG-01A
Journey Gate + Plan/Trial Foundation + Basic Onboarding + Business Minimum

IT-DIAG-01B
Input Tagihan + Previous Period + Normalisasi + Perbandingan + Safe Wording
```

Pembagian ini tidak mengubah roadmap. Ini hanya menjaga satu task tetap bounded dan mencegah user melewati journey PRD.

Setelah IT-DIAG-01A selesai, berhenti. Jangan mulai IT-DIAG-01B.

---

# 2. Konfigurasi Eksekusi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo
TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=bcef7f49c96ec6413af557afae8f313d80fe16f3
TARGET_BRANCH=feature/it-diag-01a-journey-business
TARGET_PHASE=IT-DIAG-01A

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

REQUIRE_NODE_24=true
ALLOW_DISPOSABLE_POSTGRES=true
```

---

# 3. Sumber Kebenaran

Baca secara lengkap dan gunakan urutan berikut:

```text
1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_01A_IMPLEMENTATION_PROMPT.md
5. repository aktual
```

Aturan folder docs:

```text
docs/baseline → selalu aktif
docs/tasks    → hanya prompt task ini yang aktif
docs/reports  → bukti riwayat, bukan instruksi
docs/archive  → jangan digunakan sebagai instruksi
```

Canonical PRD menentukan produk dan journey.
Strategi IT menentukan implementasi teknis.
Repository menunjukkan current state, bukan requirement baru.

Berhenti bila file canonical hilang, duplikat aktif berbeda, atau ada konflik substantif.

---

# 4. Preflight Git Wajib

Jalankan dari repository root:

```bash
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log -7 --format="%H %s"
git remote -v
git diff --check
```

Hard requirement:

```text
HEAD = bcef7f49c96ec6413af557afae8f313d80fe16f3
workspace clean
approved base berada dalam history
```

Karena fase sebelumnya masih berupa accepted local branch dan belum di-merge ke origin/main, branch task ini dibuat dari approved local HEAD:

```bash
git switch -c feature/it-diag-01a-journey-business bcef7f49c96ec6413af557afae8f313d80fe16f3
```

Jika branch sudah ada:

- jangan hapus;
- jangan menimpa;
- periksa HEAD dan history;
- lanjut hanya jika bersih dan berasal dari approved base.

Dilarang:

```text
git reset --hard
git clean
force push
rebase
amend
history rewrite
auto merge
branch deletion
mengubah main langsung
```

---

# 5. Audit Sebelum Coding

Sebelum menulis migration atau UI, audit:

```text
wattwise-vercel current schema
Better Auth user/session relations
current route protection dan proxy.ts
current /register, /login, /setup behavior
current tenant policy helpers
current migration runner dan rollback convention
current unit/integration/smoke test convention
legacy Laravel plan/trial/onboarding/business migrations
legacy Laravel validation dan test yang masih sesuai PRD
```

Buat ringkasan internal:

```text
Current state
Reusable contracts
Schema mapping
Route mapping
Security risks
Migration risks
Exact files planned
```

Jangan menerjemahkan Laravel baris demi baris.
Reuse hanya kontrak produk, validasi yang benar, fixture sintetis, copy, dan acceptance test yang masih sesuai PRD.

Jika nama atau tipe schema tidak dapat ditentukan secara aman dari baseline dan repository aktif, berhenti dengan decision request sebelum coding besar.

---

# 6. Objective

Membuat journey pengguna baru yang benar dan terlihat:

```text
Register/Login
→ Pilih Free atau Pro Trial 30 hari
→ Onboarding singkat
→ Buat bisnis/properti minimum
→ Lihat ringkasan setup selesai
```

Fase ini harus memastikan user tidak dapat melewati plan choice, onboarding, atau business setup dengan mengetik URL langsung.

---

# 7. In Scope

## 7.1 Journey State Resolver

Implementasikan resolver server-side yang menentukan langkah berikutnya berdasarkan data authoritative:

```text
NO_PLAN
→ /plan

PLAN_SELECTED + ONBOARDING_INCOMPLETE
→ /onboarding

ONBOARDING_COMPLETE + NO_BUSINESS
→ /businesses/new

BUSINESS_EXISTS
→ /setup atau halaman ringkasan business yang valid
```

Nama enum dan route dapat disesuaikan setelah audit.

Aturan:

- session wajib valid;
- userId selalu dari session;
- jangan percaya journey status dari client;
- resolver dipakai oleh login redirect, protected setup, dan setiap step;
- fail closed bila state tidak konsisten;
- jangan cache state lintas user;
- redirect tidak boleh membentuk loop.

## 7.2 Plan Choice

Sediakan halaman minimum:

```text
/plan
```

Pilihan yang ditampilkan:

```text
Free
Pro Trial 30 hari
```

Aturan UI dan produk:

- gunakan bahasa Indonesia sederhana;
- jangan menampilkan harga yang belum disetujui;
- jangan menyebut payment;
- jangan menjanjikan semua fitur yang belum dibangun;
- trial tidak menyertakan IoT atau hardware;
- tidak ada dark pattern;
- kedua opsi harus dapat digunakan dengan keyboard;
- error ditampilkan generik dan aman.

## 7.3 Trial Activation Foundation

Implementasikan trial satu kali secara nyata, bukan placeholder.

Wajib:

- satu trial per user;
- activation atomik;
- unique constraint database;
- idempotency key atau mekanisme setara;
- repeat request mengembalikan hasil konsisten tanpa memperpanjang trial;
- tanggal mulai dan berakhir dihitung server-side;
- durasi tepat 30 hari sesuai PRD;
- tidak ada payment;
- tidak ada IoT;
- tidak ada production subscription;
- tidak ada feature-specific entitlement lengkap pada fase ini.

IT-DIAG-08 tetap bertanggung jawab atas central entitlement gate dan analytics minimum.

Untuk fase ini, plan/trial state hanya digunakan untuk:

```text
journey progression
trial one-time guarantee
penyimpanan status plan awal
```

Jangan membuat fitur Pro palsu.

## 7.4 Free Plan Selection Foundation

Free selection harus:

- disimpan server-side;
- idempotent;
- tidak membuat trial record;
- tidak dapat dimanipulasi melalui userId dari request;
- tidak memberikan entitlement yang belum dibangun.

Plan switching dan conversion bukan scope fase ini.

Jika user sudah memiliki plan awal, request pilihan ulang tidak boleh membuat state ganda.

## 7.5 Basic Onboarding

Sediakan halaman minimum:

```text
/onboarding
```

Onboarding harus singkat dan progressive.

Gunakan satu layar atau flow yang sangat pendek untuk:

- menjelaskan bahwa pengguna dapat mulai dari tagihan;
- menjelaskan kWh tidak wajib;
- menjelaskan WattWise bukan aplikasi resmi PLN atau alat ukur resmi;
- memberi tahu data yang akan diminta pada langkah bisnis;
- menyimpan `onboarding completed` secara server-side setelah tindakan eksplisit pengguna.

Jangan meminta:

- daftar alat;
- watt;
- jam pakai;
- sensor;
- pendapatan;
- data diagnosis;
- form panjang.

Onboarding bukan sekadar redirect otomatis. User harus melihat informasi dan menekan CTA yang jelas.

## 7.6 Business Minimum

Sediakan halaman:

```text
/businesses/new
```

Business minimum wajib menyimpan:

```text
name
type
simple location
segment
electrical system
room/unit count
active status
timestamps
owner relation
```

Untuk segmen kos, electrical system harus mendukung:

```text
ALL_IN
TOKEN_PER_KAMAR
SUB_METER
PATUNGAN
CAMPURAN
```

Field operasional berikut tetap opsional atau ditunda:

```text
occupancy
resident count
operating days
operating hours
special event
```

Aturan:

- satu business minimum pada fase ini untuk menjaga bounded scope;
- jangan membangun portfolio/multi-location UI;
- owner/userId dari session, bukan form;
- active default harus eksplisit dan aman;
- location sederhana, jangan meminta alamat lengkap bila tidak dibutuhkan;
- jangan log alamat, nama bisnis, atau data sensitif;
- validasi server dengan Zod;
- cegah mass assignment;
- enum harus divalidasi server-side dan database-level bila tepat.

## 7.7 Business Summary

Setelah business berhasil dibuat, tampilkan ringkasan yang jujur:

```text
Profil usaha berhasil dibuat
Plan awal
Status onboarding
Nama/tipe/segmen/sistem listrik
```

Jangan membuat dashboard palsu.
Jangan membuat chart palsu.
Jangan membuat tombol input tagihan yang belum berfungsi.

Boleh menampilkan pemberitahuan jujur bahwa input tagihan akan dikerjakan pada IT-DIAG-01B.

## 7.8 Route Protection dan Step Enforcement

Semua route berikut wajib protected:

```text
/plan
/onboarding
/businesses/**
/setup
```

Aturan:

- anonymous → `/login`;
- user tanpa plan tidak boleh membuka onboarding/business;
- user belum onboarding tidak boleh membuka business;
- user tanpa business tidak boleh dianggap setup complete;
- user yang selesai step sebelumnya boleh diarahkan ke step berikutnya;
- authoritative check terjadi di server;
- proxy hanya optimistic redirect;
- jangan melakukan database query berat di proxy.

## 7.9 Tenant Policy

Gunakan atau perluas policy dari IT-DIAG-00C.

Wajib:

- user A hanya dapat membaca business milik user A;
- user A tidak dapat membaca atau mengubah business user B;
- error tidak membocorkan apakah business user lain ada;
- owner relation tidak bisa ditulis client;
- repository query selalu scoped oleh authenticated user/owner.

---

# 8. Schema dan Migration

Final naming harus mengikuti audit current schema dan legacy contract.

Schema minimum yang perlu dipertimbangkan:

```text
plan or journey state
trial activation/history
onboarding completion/progress
businesses
```

Jangan memaksa empat tabel bila desain lebih sederhana tetap memenuhi seluruh constraint.

Database requirements:

- PostgreSQL;
- Drizzle stable;
- reviewed generated SQL;
- `timestamptz` untuk audit timestamps;
- foreign key ke Better Auth user;
- unique user plan/journey row bila digunakan;
- unique one-trial-per-user constraint;
- unique idempotency key untuk trial bila digunakan;
- index `businesses.user_id` atau padanan owner relation;
- check constraint untuk nilai non-negatif seperti room/unit count;
- enum atau check constraint untuk electrical system;
- cascade behavior harus direview;
- tidak ada data user asli;
- tidak ada migration pada `next build`.

Migration workflow wajib:

```text
generate
→ review SQL
→ buat rollback SQL
→ disposable PostgreSQL
→ migration up
→ schema/constraint smoke
→ rollback
→ verifikasi kembali ke kondisi awal
→ migration up kembali
→ integration tests
```

Rollback SQL simpan di:

```text
wattwise-vercel/drizzle/rollbacks/
```

Dilarang menjalankan migration production atau Neon yang belum dikonfirmasi dev/test.

---

# 9. Arsitektur Kode

Gunakan struktur yang sesuai current repository, dengan arah berikut:

```text
src/features/plans/
src/features/onboarding/
src/features/businesses/
src/server/repositories/
src/server/services/
src/server/policies/
src/server/validation/
src/server/db/schema/
```

Aturan:

- Server Components default;
- Client Component hanya untuk interaksi form yang memang perlu;
- Server Action/Route Handler tipis;
- page membaca session, memanggil resolver/service, dan merender;
- formula/state transition di service;
- query di repository;
- authorization di policy;
- validation schema server adalah sumber utama;
- jangan memanggil internal HTTP API dari Server Component;
- jangan menyimpan sensitive state di localStorage;
- jangan menggunakan global mutable user state.

Dependency baru tidak diperkirakan diperlukan.
Jika dependency baru dianggap perlu, berhenti dan minta approval dengan due diligence lengkap.

---

# 10. UI dan Accessibility

Minimum UI:

```text
Plan choice
Onboarding
Business form
Business/setup summary
Navigation/logout yang sudah ada
```

Wajib:

- responsive mobile dan desktop;
- label terhubung ke input;
- keyboard navigation;
- visible focus;
- error summary atau error dekat field;
- loading/disabled state;
- tidak ada double submit;
- teks tidak bergantung hanya pada warna;
- tidak ada menu mati;
- tidak ada modal besar yang tidak bisa ditutup;
- copy Indonesia sederhana;
- branding existing dipertahankan, bukan redesign total.

Safe positioning wajib terlihat pada onboarding atau context yang tepat:

```text
WattWise bukan aplikasi resmi PLN, bukan pengganti PLN Mobile,
dan bukan alat ukur listrik resmi.
```

---

# 11. Out of Scope

Dilarang mengerjakan:

```text
input tagihan
previous period
cost/day
normalisasi periode
perbandingan biaya
kWh calculation
diagnosis
questionnaire
candidate generator
candidate ranking
data quality final
guided inspection
action plan
outcome
dashboard produk
report/PDF
full entitlement gate
product analytics
payment
subscription production
plan conversion
portfolio/multi-location
email verification
password reset
OAuth/passkey/2FA/SSO
IoT
advanced ML
```

Jangan mengubah:

```text
wattwise-laravel/**
.github/**
bengkel/**
docs/baseline/**
docs/archive/**
```

Membaca legacy diperbolehkan. Menulis ke legacy dilarang.

---

# 12. Test Plan Wajib

## 12.1 Unit Tests

Minimum:

- journey resolver untuk setiap state;
- state tidak konsisten fail closed;
- plan input validation;
- trial expiry calculation 30 hari;
- trial repeated request tidak memperpanjang;
- onboarding transition validation;
- business schema validation;
- electrical system enum;
- room/unit count validation;
- safe redirect target/no open redirect.

## 12.2 Migration Integration Tests

Pada PostgreSQL disposable:

- migration up berhasil;
- table/column/index/constraint tersedia;
- one trial per user enforced;
- duplicate idempotency key aman;
- invalid enum ditolak;
- negative room/unit count ditolak;
- FK ke user bekerja;
- rollback berhasil;
- re-apply migration berhasil.

## 12.3 Journey Integration Tests

Gunakan user sintetis.

Minimum:

- anonymous ditolak;
- new user diarahkan ke plan;
- Free selection tersimpan;
- Pro Trial activation tersimpan;
- duplicate trial request tidak membuat trial kedua;
- repeated request tidak memperpanjang expiry;
- user dengan plan dapat membuka onboarding;
- user tanpa plan tidak dapat membuka onboarding;
- onboarding completion tersimpan;
- user belum onboarding tidak dapat membuka business form;
- business creation mengikat owner dari session;
- user tidak dapat spoof owner/userId;
- user A tidak dapat melihat business user B;
- completed journey mencapai business summary;
- logout tetap bekerja.

## 12.4 Runtime Smoke

Jalankan production server pada Node 24 dan PostgreSQL disposable.

Verifikasi:

```text
GET /
register synthetic user
redirect ke /plan
pilih Free
lihat /onboarding
complete onboarding
buat business
lihat summary
logout

register user kedua
pilih Pro Trial
retry activation
pastikan expiry tidak berubah
complete onboarding
buat business
cross-tenant access ditolak
```

Jangan mencetak password, cookie, session token, auth secret, database URL, alamat, atau nama bisnis lengkap pada laporan.

## 12.5 Existing Regression Gates

Seluruh test IT-DIAG-00B dan IT-DIAG-00C harus tetap lulus.

---

# 13. Quality Gates

Seluruh npm command harus menggunakan Node.js 24 melalui Docker.

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

Jika project sudah memiliki component/E2E script yang relevan, jalankan juga tanpa mengurangi assertion.

Aturan:

- jangan `npm audit fix --force`;
- empat moderate dev vulnerabilities existing tetap dilaporkan bila masih ada;
- high/critical baru adalah hard stop bila tidak ada perbaikan aman;
- build tidak boleh membutuhkan DB aktif;
- jangan klaim pass tanpa output dan exit code.

---

# 14. Docker Safety

Diizinkan:

- `node:24-slim`;
- PostgreSQL 16 disposable;
- dedicated Docker network;
- bind mount hanya `wattwise-vercel`;
- volume khusus node_modules/.next;
- synthetic credentials.

Dilarang:

```text
docker system prune
docker volume prune
docker builder prune
mount Docker socket
privileged container
host network
mount seluruh drive/home/secret store
menghapus resource yang tidak dibuat oleh task ini
```

Cleanup seluruh container/network khusus task dan buktikan hasilnya.

---

# 15. Security Review

Audit dan laporkan:

- session authoritative server-side;
- userId dari session;
- one trial per user;
- trial activation atomic dan idempotent;
- no trial extension via replay;
- no mass assignment;
- no cross-tenant access;
- no open redirect;
- no sensitive logging;
- no real user data;
- no production DB/secret;
- CSRF/origin protection tidak dimatikan;
- no feature entitlement claim yang belum dibangun;
- migration rollback teruji.

Jangan mengklaim keamanan absolut.

---

# 16. Hard Stops

Berhenti dan minta keputusan bila:

1. approved base commit tidak ditemukan;
2. workspace kotor/divergen;
3. baseline docs konflik;
4. schema legacy dan target memiliki key/type conflict berisiko;
5. trial semantics tidak dapat dibuat atomik/idempotent;
6. migration berisiko kehilangan data;
7. database mungkin production;
8. production secret diperlukan;
9. dependency baru diperlukan tanpa approval;
10. high/critical vulnerability tidak memiliki fix aman;
11. build membutuhkan DB aktif;
12. cross-tenant test gagal;
13. route gating hanya dapat dilakukan client-side;
14. scope mulai masuk bills atau IT-DIAG-01B;
15. satu task menjadi terlalu besar.

Format:

```text
BLOCKED — DECISION REQUIRED

Reason:
Evidence:
Risk:
Safe options:
Recommendation:
No changes performed after hard stop:
```

---

# 17. Commit Rules

Buat 1–3 commit lokal yang logis setelah gate relevan lulus.

Contoh:

```text
feat(journey): add plan selection trial and onboarding foundation
feat(business): add tenant-safe business minimum setup
 test(journey): verify trial onboarding and business isolation
```

Jangan memakai spasi awal pada commit message ketiga; contoh final yang benar:

```text
test(journey): verify trial onboarding and business isolation
```

Dilarang:

- amend;
- rebase;
- squash otomatis;
- push;
- PR;
- merge;
- branch deletion.

SHA harus disalin dari `git rev-parse`/`git log`, bukan direkonstruksi dari short hash.

---

# 18. Definition of Done IT-DIAG-01A

```text
[ ] branch dari approved IT-DIAG-00C HEAD
[ ] hanya wattwise-vercel yang berubah
[ ] canonical docs dipatuhi
[ ] plan choice Free/Pro Trial terlihat dan accessible
[ ] one-time trial atomik dan idempotent
[ ] trial replay tidak memperpanjang expiry
[ ] onboarding singkat dan jujur
[ ] business minimum tersimpan
[ ] owner berasal dari session
[ ] journey step tidak dapat dilewati
[ ] cross-tenant access ditolak
[ ] migration SQL tersedia
[ ] rollback SQL tersedia
[ ] migration up/down/up lulus
[ ] unit test lulus
[ ] integration test lulus
[ ] auth regression test lulus
[ ] typecheck lulus
[ ] lint lulus
[ ] build lulus
[ ] runtime smoke Node 24 lulus
[ ] npm audit dilaporkan
[ ] Docker resource dibersihkan
[ ] no secret/data asli
[ ] git diff --check bersih
[ ] workspace clean setelah commit
[ ] changed-file/risk/rollback report lengkap
```

Neon dev tetap boleh pending pada local review, tetapi jangan mengklaim Neon verified tanpa koneksi nyata ke branch/database dev non-production.

---

# 19. Final Report Format

```text
1. Status
2. Selected Subphase
3. Summary
4. Baseline Compliance
5. Branch and Approved Base
6. Commits Created
7. Changed Files
8. Created Files
9. Deleted Files
10. Legacy Contracts Reviewed
11. Schema Design
12. Migration SQL
13. Rollback SQL
14. Migration Up/Down/Up Evidence
15. Journey State Model
16. Plan Choice Result
17. Free Selection Result
18. Trial Activation Result
19. Trial Replay/Expiry Result
20. Onboarding Result
21. Business Creation Result
22. Route Gate Result
23. Tenant Isolation Result
24. Security Review
25. Tests Actually Run
26. Exact Test Names and Counts
27. npm Audit
28. Typecheck
29. Lint
30. Build
31. Runtime Smoke
32. Node Version
33. PostgreSQL Environment
34. Neon Dev Verification
35. Docker Cleanup
36. Git Final State
37. Known Risks
38. Git Rollback
39. Database Rollback
40. Remaining Scope
41. Decision Needed
42. Final Verdict
```

Final verdict hanya boleh:

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW

VERIFIED LOCALLY — NEON DEV VERIFICATION PENDING

NOT VERIFIED — CORRECTION REQUIRED

BLOCKED — DECISION REQUIRED
```

Jangan menulis `IT-DIAG-01A ACCEPTED`.
Hanya Product Owner yang dapat menerima.

Setelah laporan, berhenti.
Jangan mulai IT-DIAG-01B.

---

# 20. Instruksi Singkat untuk Coding Agent

```text
Buka workspace:

D:\LOMBA\MVP PROTOTIPE start-up

Baca lengkap, dalam urutan:

1. docs/baseline/WATTWISE_AI_PRD_AGENTIC_GUARDRAILS.md
2. docs/baseline/WATTWISE_AI_IT_STRATEGY_VERCEL.md
3. docs/baseline/WATTWISE_AI_MASTER_AGENT_PROMPT.md
4. docs/tasks/WATTWISE_AI_IT_DIAG_01A_IMPLEMENTATION_PROMPT.md

Implementasikan tepat satu subfase:

IT-DIAG-01A — Journey Gate, Plan/Trial Foundation,
Basic Onboarding, dan Business Minimum

Gunakan approved local base:

bcef7f49c96ec6413af557afae8f313d80fe16f3

Semua perubahan hanya dalam wattwise-vercel.
Jangan mengubah wattwise-laravel, baseline docs, .github, atau bengkel.
Jangan push, PR, merge, deploy, atau migration production.
Jangan mengerjakan input tagihan atau IT-DIAG-01B.
Gunakan Node 24 untuk seluruh npm quality gate.
Gunakan PostgreSQL disposable untuk migration dan integration test.

Setelah code, migration up/down/up, tests, runtime smoke,
commit lokal, cleanup, dan final report selesai, berhenti dan
tunggu keputusan Product Owner.
```
