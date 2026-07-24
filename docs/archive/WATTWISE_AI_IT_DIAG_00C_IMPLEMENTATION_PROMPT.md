# WattWise AI — Implementation Prompt IT-DIAG-00C

## Database dan Authentication Foundation

Gunakan prompt ini setelah fase berikut telah diterima oleh Product Owner:

```text
IT-DIAG-00B — Vercel Foundation
Status: APPROVED
Approved local HEAD:
ff530e021e7054cef92ce39d3830a7a9093b9ea3
```

Prompt ini merupakan **persetujuan Product Owner untuk mengimplementasikan tepat satu fase**, yaitu:

```text
IT-DIAG-00C — Database dan Auth Foundation
```

Prompt ini **bukan** persetujuan untuk push, membuka pull request, merge, preview deployment, production deployment, migration production, atau mengerjakan fase setelah IT-DIAG-00C.

---

# 1. Konfigurasi Eksekusi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo
DOCS_DIRECTORY=D:\LOMBA\MVP PROTOTIPE start-up\docs

LEGACY_ROOT=wattwise-laravel
TARGET_ROOT=wattwise-vercel

APPROVED_BASE_COMMIT=ff530e021e7054cef92ce39d3830a7a9093b9ea3
TARGET_BRANCH=feature/it-diag-00c-db-auth-foundation
TARGET_PHASE=IT-DIAG-00C

ALLOW_LOCAL_CODE=true
ALLOW_LOCAL_COMMIT=true

ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_MERGE=false
ALLOW_PREVIEW_DEPLOY=false
ALLOW_PRODUCTION_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
ALLOW_NEON_RESOURCE_CREATION=false
ALLOW_SECRET_CREATION_IN_REPOSITORY=false
ALLOW_REAL_USER_DATA=false
ALLOW_ADVANCED_ML=false

ALLOW_DISPOSABLE_LOCAL_POSTGRES=true
REQUIRE_NODE_24=true
```

---

# 2. Sumber Kebenaran

Sebelum mengubah kode:

1. Baca seluruh file Markdown di `DOCS_DIRECTORY`.
2. Baca implementasi aktual di `TARGET_ROOT`.
3. Gunakan urutan otoritas berikut:

```text
Canonical PRD
→ Strategi IT Vercel / addendum arsitektur
→ Master Agent Prompt
→ prompt implementasi fase ini
→ repository current state
```

Jika kedua file PRD yang tersedia identik, perlakukan sebagai satu canonical PRD.

Jika kedua file PRD berbeda secara substantif, berhenti dan laporkan konflik.

Jangan mengubah requirement produk berdasarkan preferensi agent.

---

# 3. Status Fase Sebelumnya

IT-DIAG-00B telah diterima dengan fondasi:

- Next.js 16 stable App Router;
- React;
- TypeScript strict;
- Tailwind CSS;
- Node.js 24 pinning;
- environment validation;
- health endpoints;
- error boundaries;
- Vercel region `sin1`;
- Vitest;
- production build;
- scoped dependency overrides yang telah diaudit.

Jangan membangun ulang foundation tersebut.

Jangan menghapus scoped overrides PostCSS atau Sharp tanpa bukti bahwa dependency Next.js stable telah membawa versi aman dan seluruh security gate telah dijalankan ulang.

---

# 4. Preflight Git Wajib

Jalankan dari repository root:

```bash
git fetch origin
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git log -5 --format="%H %s"
git remote -v
git diff --check
```

Hard requirement:

```text
HEAD harus sama dengan APPROVED_BASE_COMMIT
workspace harus clean
APPROVED_BASE_COMMIT harus berada dalam history
```

Karena IT-DIAG-00B belum di-push atau di-merge ke `origin/main`, fase ini diizinkan membuat branch dari **approved local HEAD**, bukan dari `origin/main`.

Buat branch:

```bash
git switch -c feature/it-diag-00c-db-auth-foundation ff530e021e7054cef92ce39d3830a7a9093b9ea3
```

Jika branch sudah ada:

- jangan menghapusnya;
- jangan menimpanya;
- periksa HEAD, history, dan workspace;
- lanjut hanya jika branch tersebut bersih dan masih berasal dari approved base.

Berhenti jika:

- HEAD tidak cocok;
- workspace kotor dengan perubahan tidak dikenal;
- branch sudah berisi pekerjaan lain;
- file penting hilang;
- history divergen;
- perlu memakai command destruktif.

Dilarang:

```text
git reset --hard
git clean
git checkout HEAD -- .
force push
rebase
amend
history rewrite
auto merge
hapus branch
ubah main langsung
```

---

# 5. Objective

Membangun fondasi database dan authentication yang aman untuk aplikasi Next.js WattWise dengan:

- PostgreSQL yang kompatibel dengan Neon;
- Drizzle ORM dan Drizzle Kit stable;
- migration SQL yang direview;
- rollback SQL yang dapat diuji;
- Better Auth stable;
- email/password;
- database-backed session;
- register;
- login;
- logout;
- authoritative server-side session protection;
- optimistic route redirect yang aman;
- fondasi policy tenant;
- integration test database dan auth;
- database health check nyata.

---

# 6. In Scope

## 6.1 Dependency Due Diligence

Audit paket yang dibutuhkan sebelum instalasi.

Minimum kandidat:

```text
drizzle-orm
drizzle-kit
better-auth
PostgreSQL driver yang kompatibel dengan Neon dan Drizzle
type package driver bila diperlukan
```

Aturan:

1. Gunakan versi stable.
2. Dilarang memakai canary, beta, preview, alpha, atau RC.
3. Pin exact version pada `package.json`.
4. Commit `package-lock.json`.
5. Jangan menghapus security overrides yang telah disetujui.
6. Jangan menambah lebih dari satu PostgreSQL runtime driver.
7. Preferensi awal adalah `node-postgres` (`pg`) dengan Drizzle `node-postgres`, karena dapat digunakan untuk PostgreSQL lokal dan Neon serta mendukung transaction.
8. Pilihan driver lain hanya diizinkan jika stable, sesuai dokumentasi resmi, lebih cocok dengan Better Auth dan Vercel, trade-off dijelaskan, serta tidak menambah dependency WebSocket yang tidak diperlukan.
9. Jangan memakai package atau contoh dokumentasi yang mensyaratkan Drizzle RC.
10. Jika integrasi hanya tersedia dengan dependency RC/beta, berhenti.

Laporkan untuk setiap dependency:

- versi;
- dist-tag;
- lisensi;
- alasan;
- alternatif yang dipertimbangkan;
- maintenance/security signal;
- ukuran atau bundle/runtime impact yang relevan.

Jangan menjalankan `npm audit fix --force`.

---

## 6.2 Environment Configuration

Perbarui validasi environment untuk mendukung:

```text
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
```

Aturan:

- `BETTER_AUTH_SECRET` minimal 32 karakter dan berentropi tinggi pada environment nyata;
- jangan membuat atau menyimpan secret nyata di repository;
- `.env.example` hanya berisi placeholder;
- hanya variabel yang memang aman untuk browser boleh memakai `NEXT_PUBLIC_`;
- jangan menampilkan `DATABASE_URL`, password, token, session token, atau auth secret pada log dan error;
- build tidak boleh membutuhkan koneksi database aktif;
- database tidak boleh dihubungi pada module import yang dijalankan saat static build;
- validation error harus aman dan tidak mencetak nilai secret.

Untuk test gunakan credential sintetis sementara melalui environment proses atau Docker. Jangan commit `.env.local`.

---

## 6.3 Database Layer

Buat atau lengkapi struktur berikut secara wajar:

```text
wattwise-vercel/
├─ drizzle.config.ts
├─ drizzle/
│  ├─ migrations/
│  └─ rollbacks/
└─ src/server/db/
   ├─ client.ts
   ├─ schema/
   │  ├─ auth.ts
   │  └─ index.ts
   └─ index.ts
```

Nama file dapat disesuaikan bila current repository sudah memiliki konvensi yang lebih baik.

Aturan database:

- PostgreSQL tetap menjadi database;
- runtime harus kompatibel dengan Neon;
- connection pool tidak boleh dibuat berulang tanpa kontrol;
- development hot reload tidak boleh membuat pool tak terbatas;
- query user-specific tidak boleh tercache lintas user;
- tidak ada query database di Edge runtime;
- tidak ada migration otomatis dalam `next build`;
- tidak memakai `drizzle-kit push` sebagai alur migration yang di-commit;
- gunakan code-first schema dan generated reviewed SQL;
- jangan menyimpan data inti sebagai satu blob JSON;
- timestamps audit memakai `timestamptz` atau padanan Drizzle yang benar;
- email wajib unik;
- foreign key dan index harus direview;
- jangan membuat schema bisnis lengkap pada fase ini.

---

## 6.4 Better Auth Schema

Gunakan schema resmi yang diperlukan oleh Better Auth stable untuk:

```text
user
session
account
verification
```

atau nama tabel yang dihasilkan oleh tooling resmi stable.

Aturan:

- schema Better Auth harus dihasilkan atau divalidasi menggunakan tooling/dokumentasi stable;
- jangan menyalin schema dari artikel lama secara buta;
- review seluruh kolom, index, unique constraint, foreign key, cascade behavior, dan timestamp;
- email unik;
- session token tidak boleh dilog;
- account credential/password hash tidak boleh ditampilkan;
- tidak memigrasikan password Laravel;
- tidak membawa data user lama;
- tidak menggunakan data user asli;
- jangan mengaktifkan plugin tambahan;
- jangan mengaktifkan OAuth, passkey, SSO, 2FA, organization, admin plugin, atau social login.

Jangan mengaktifkan opsi eksperimental Better Auth, termasuk experimental joins, pada fase ini.

---

## 6.5 Migration dan Rollback

Buat migration SQL untuk schema auth melalui Drizzle Kit.

Wajib:

```text
generate
→ review SQL
→ buat rollback SQL
→ migration up pada disposable database
→ schema smoke test
→ rollback
→ verifikasi tabel kembali ke kondisi awal
→ migration up kembali
→ integration test
```

Rollback SQL harus berada di:

```text
wattwise-vercel/drizzle/rollbacks/
```

Rollback harus:

- sesuai dengan migration yang dibuat;
- menurunkan object dalam urutan dependency yang aman;
- hanya diuji pada disposable local/test database;
- tidak dijalankan pada production;
- tidak menghapus database atau schema di luar migration ini.

Dilarang:

- migration production;
- koneksi ke production database;
- destructive migration terhadap data nyata;
- menjalankan migration saat build;
- mengandalkan rollback Git untuk rollback database.

---

## 6.6 Disposable PostgreSQL Test Database

Jika tidak ada `DATABASE_URL` Neon dev/test yang telah dikonfirmasi non-production, gunakan PostgreSQL disposable melalui Docker.

Ketentuan:

- gunakan image PostgreSQL stable yang masih didukung;
- gunakan nama database, user, dan password sintetis;
- jangan memakai credential production;
- jangan commit credential;
- gunakan port non-default host bila perlu;
- health check database harus menunggu sampai database siap;
- container harus dihentikan dan dibuang setelah test;
- jangan menjalankan `docker system prune`;
- jangan menghapus volume milik user;
- gunakan volume/container khusus fase ini atau ephemeral container.

Apabila agent menemukan `DATABASE_URL`:

1. jangan mencetak nilainya;
2. jangan menggunakannya sampai terbukti itu dev/test;
3. berhenti bila ada kemungkinan itu production;
4. jangan membuat Neon project, branch, database, atau role secara otomatis.

Local disposable PostgreSQL boleh membuktikan migration/auth compatibility, tetapi laporan akhir harus menyatakan apakah koneksi Neon dev benar-benar sudah diuji.

---

## 6.7 Better Auth Configuration

Implementasikan Better Auth stable dengan:

- email/password enabled;
- database-backed session;
- session expiry;
- logout;
- secure cookie behavior untuk production;
- HTTP-only cookie;
- SameSite yang aman;
- origin/trusted-origin yang eksplisit;
- Node runtime;
- Drizzle adapter stable;
- tanpa stateless-only session;
- tanpa token di localStorage.

Mount auth handler pada route resmi App Router, misalnya:

```text
src/app/api/auth/[...all]/route.ts
```

Gunakan API resmi stable yang sesuai dengan versi Better Auth yang dipin.

Jangan mengarang nama import atau API berdasarkan ingatan. Validasi terhadap package yang benar-benar terinstal dan dokumentasi stable.

---

## 6.8 Authentication UI

Implementasikan halaman minimum:

```text
/register
/login
```

dan logout yang dapat digunakan dari protected shell.

Form harus:

- memiliki label yang dapat diakses;
- dapat digunakan dengan keyboard;
- menampilkan error generik yang aman;
- tidak membedakan secara berlebihan apakah email tertentu terdaftar;
- tidak menampilkan stack trace;
- memvalidasi input dengan schema server;
- tidak mengandalkan validasi client saja;
- memiliki loading/disabled state untuk mencegah submit berulang;
- tidak menyimpan password pada state global, log, URL, analytics, atau storage.

Gunakan copy sederhana berbahasa Indonesia yang sesuai branding WattWise.

Jangan melakukan redesign total.

---

## 6.9 Route Protection

Implementasikan dua lapisan:

### Lapisan 1 — Optimistic redirect

Untuk Next.js 16, gunakan mekanisme `proxy.ts` bila diperlukan untuk redirect cepat berdasarkan cookie/session indicator.

Aturan:

- Proxy hanya untuk optimistic check;
- jangan melakukan query database lambat di Proxy;
- jangan menjadikan Proxy sebagai satu-satunya authorization layer.

### Lapisan 2 — Authoritative server check

Protected layout/page/handler/action wajib membaca session secara server-side melalui Better Auth dan menolak akses tanpa session valid.

Buat helper yang jelas, misalnya:

```text
getOptionalSession
requireSession
requireUserId
```

Nama dapat disesuaikan.

`userId` harus berasal dari session, bukan body, query string, form field, atau client state.

Tambahkan protected shell minimum untuk membuktikan route protection.

Protected shell **bukan dashboard produk final** dan tidak boleh mengklaim seluruh journey produk telah selesai.

---

## 6.10 Journey Boundary

Fase ini hanya membangun authentication foundation.

FR berikut belum diselesaikan penuh pada fase ini:

```text
plan choice
Pro Trial 30 hari
trial activation
entitlement
onboarding
business/properti
product dashboard
```

Jangan mengaktifkan trial atau entitlement.

Jangan membuat user dapat melewati plan choice dan onboarding menuju fitur produk nyata.

Setelah register/login, arahkan user ke protected setup placeholder yang secara jujur menyatakan bahwa pilihan paket dan onboarding belum tersedia pada fase foundation.

Jangan menandai FR-AUTH-002, FR-AUTH-003, atau FR-AUTH-004 selesai.

Yang dapat ditandai pada fase ini:

```text
FR-AUTH-001 — register foundation
FR-AUTH-005 — route protection foundation
```

Login/logout/session merupakan technical foundation tambahan dari Strategi IT.

---

## 6.11 Tenant Isolation Foundation

Buat fondasi policy server-side, misalnya:

```text
BusinessAccessPolicy
assertResourceOwner
requireTenantOwnership
```

Aturan:

- user ID selalu berasal dari session;
- resource owner ID tidak dipercaya dari client;
- mismatch harus ditolak;
- error tidak membocorkan keberadaan resource tenant lain;
- policy harus mudah digunakan oleh repository/service fase berikutnya;
- jangan membuat tabel business lengkap pada fase ini;
- jangan menganggap policy unit test sebagai bukti tenant isolation end-to-end.

Test minimum:

- authenticated user dengan owner ID yang sama diizinkan;
- user berbeda ditolak;
- unauthenticated ditolak;
- caller tidak dapat mengganti userId melalui input.

Laporan harus menyebut ini sebagai **tenant test foundation**, bukan full tenant isolation completion.

---

## 6.12 Database Health Endpoint

Perbarui:

```text
GET /api/health/database
```

Kontrak:

- jika `DATABASE_URL` tidak dikonfigurasi: status aman `unconfigured`, `configured=false`;
- jika dikonfigurasi dan query ringan berhasil: status `ok` atau `connected`;
- jika dikonfigurasi tetapi gagal: HTTP 503 dengan body tersanitasi;
- gunakan query ringan seperti `select 1`;
- gunakan timeout yang masuk akal;
- jangan menampilkan hostname, username, password, connection string, stack trace, SQL detail, atau secret;
- Node runtime;
- health route tidak boleh membuat migration.

Tambahkan test untuk tiga kondisi tersebut bila dapat dilakukan secara deterministik.

---

# 7. Out of Scope

Dilarang mengerjakan pada fase ini:

```text
Free/Trial/Pro activation
trial idempotency implementation
entitlement final
onboarding
business/properti schema lengkap
tagihan
kWh
diagnosis
questionnaire
candidate generator
candidate ranking
inspection
action plan
outcome
dashboard produk
report/PDF
analytics produk
payment
email verification flow
password reset
OAuth
social login
passkey
2FA
SSO
organization/team plugin
admin panel
IoT
advanced ML
queue
Redis
Python service
production seed
production data migration
```

Jangan mengubah:

```text
wattwise-laravel/**
.github/**
bengkel/**
docs baseline canonical
```

Membaca legacy untuk memahami contract diperbolehkan. Menulis ke legacy dilarang.

---

# 8. File Plan yang Diizinkan

Perubahan harus terbatas pada `wattwise-vercel/**`.

File yang mungkin dibuat atau diubah:

```text
wattwise-vercel/package.json
wattwise-vercel/package-lock.json
wattwise-vercel/.env.example
wattwise-vercel/drizzle.config.ts
wattwise-vercel/drizzle/migrations/**
wattwise-vercel/drizzle/rollbacks/**
wattwise-vercel/src/config/env.ts
wattwise-vercel/src/server/db/**
wattwise-vercel/src/server/auth/**
wattwise-vercel/src/server/policies/**
wattwise-vercel/src/server/validation/**
wattwise-vercel/src/app/api/auth/[...all]/route.ts
wattwise-vercel/src/app/api/health/database/route.ts
wattwise-vercel/src/app/(auth)/**
wattwise-vercel/src/app/(product)/**
wattwise-vercel/src/components/**
wattwise-vercel/tests/unit/**
wattwise-vercel/tests/integration/**
wattwise-vercel/scripts/**
wattwise-vercel/README.md
wattwise-vercel/docs/**
```

Jangan membuat file di luar daftar ini tanpa menjelaskan kebutuhan dan memastikan tetap berada di `wattwise-vercel`.

---

# 9. Implementation Rules

1. Server Components default.
2. Client Component hanya untuk interaksi browser/form yang memang memerlukan.
3. Page, Route Handler, Proxy, dan Server Action harus tipis.
4. Validasi server adalah sumber utama.
5. Authorization tidak boleh hanya di UI.
6. Jangan memanggil API internal dari Server Component untuk membaca session/data sendiri.
7. Jangan cache session/user-specific data lintas user.
8. Jangan log credential atau input password.
9. Jangan menampilkan exception database mentah.
10. Jangan membuat fallback yang mengizinkan akses ketika auth gagal.
11. Fail closed untuk protected route.
12. Jangan menambah feature flag baru tanpa kebutuhan.
13. Semua feature flag produk tetap false.
14. `ADVANCED_ML_ENABLED` tetap false.
15. Jangan mengubah pricing atau copy produk di luar kebutuhan auth minimum.
16. Jangan klaim production-ready sebelum preview dan production gate benar-benar dijalankan.
17. Jangan menjalankan background task di luar kemampuan Vercel.
18. Jangan mengandalkan filesystem persisten.

---

# 10. Test Plan Wajib

## 10.1 Unit Tests

Minimum:

- environment validation tanpa membocorkan secret;
- auth input schema;
- tenant ownership policy;
- safe error mapping;
- database health response mapping;
- unauthenticated policy denial.

## 10.2 Migration Integration Tests

Pada disposable PostgreSQL:

- migration up berhasil;
- tabel Better Auth tersedia;
- email unique constraint bekerja;
- foreign key penting tersedia;
- index penting tersedia;
- rollback berhasil;
- tabel migration kembali hilang/ke kondisi awal;
- migration up kedua berhasil;
- `drizzle-kit check` atau validasi migration setara lulus.

## 10.3 Auth Integration Tests

Minimum:

- register dengan input valid;
- duplicate email ditolak secara aman;
- password tidak tersimpan sebagai plaintext;
- login dengan credential benar;
- login salah ditolak;
- session dibuat di database;
- session cookie memiliki konfigurasi aman sesuai environment;
- session dapat dibaca server-side;
- protected route menolak anonymous;
- protected route menerima session valid;
- logout menginvalidasi session;
- session invalid/expired ditolak;
- user ID berasal dari session;
- user A tidak dapat mengganti userId menjadi user B melalui request input.

Gunakan dua user sintetis.

Jangan menggunakan email atau password milik manusia nyata.

## 10.4 Runtime Smoke Tests

Dengan Node 24:

```text
GET /
GET /register
GET /login
GET protected setup route tanpa session
register synthetic user
login synthetic user
GET protected setup route dengan session
logout
GET protected setup route setelah logout
GET /api/health
GET /api/health/database
GET /api/health/release
```

Jangan mencetak full cookie/session token pada laporan. Mask atau hanya laporkan presence dan atribut yang aman.

## 10.5 Quality Gates

Semua command Node/npm harus dijalankan menggunakan Node 24.

Karena local Windows memakai Node 22, gunakan Docker `node:24-slim`.

Jalankan secara fail-fast:

```text
npm ci
npm audit
npm audit --omit=dev
npm run test
npm run typecheck
npm run lint
npm run build
```

Tambahkan script integration test yang jelas, misalnya:

```text
npm run test:integration
```

Production build harus lulus tanpa membutuhkan database aktif.

Jangan menurunkan assertion, menghapus test, atau mengubah audit threshold untuk memperoleh hasil hijau.

---

# 11. Docker Safety

Diizinkan:

- `node:24-slim`;
- PostgreSQL disposable untuk test;
- bind mount hanya `wattwise-vercel`;
- volume khusus `/app/node_modules` dan `/app/.next`;
- port test non-production;
- synthetic credentials.

Dilarang:

```text
docker system prune
docker volume prune
docker builder prune
menghapus container/volume yang tidak dibuat untuk task ini
mount seluruh drive
mount home directory
mount secret store
mount Docker socket
privileged container
host network
```

Saat source hanya dibaca untuk build/test, gunakan bind mount read-only.

Saat package-lock atau generated migration perlu ditulis, gunakan write mount hanya pada `wattwise-vercel`.

---

# 12. Security Review Wajib

Audit dan laporkan:

- password hashing ditangani Better Auth;
- tidak ada plaintext password;
- session database-backed;
- cookie HTTP-only;
- cookie secure pada production;
- SameSite aman;
- expiry tersedia;
- logout invalidates session;
- trusted origin tidak wildcard;
- CSRF/origin protection tidak dimatikan;
- protected route fail closed;
- server-side authorization;
- no secret logging;
- no open redirect;
- no user enumeration yang tidak perlu;
- no cross-user access;
- no production DB;
- no production secret;
- no real user data;
- dependency audit;
- migration rollback.

Jangan mengklaim keamanan absolut.

---

# 13. Hard Stops

Berhenti dan minta keputusan bila:

1. approved base commit tidak ditemukan;
2. workspace kotor/divergen;
3. dependency stable tidak tersedia;
4. dokumentasi hanya memberi contoh RC/beta;
5. Better Auth dan Drizzle stable tidak kompatibel;
6. package audit memiliki high/critical vulnerability tanpa perbaikan aman;
7. perbaikan audit membutuhkan downgrade Next.js atau `--force`;
8. migration berisiko kehilangan data;
9. database yang tersedia mungkin production;
10. secret production dibutuhkan;
11. Neon resource harus dibuat otomatis;
12. test membutuhkan data user asli;
13. tenant policy gagal;
14. auth route hanya dapat dilindungi client-side;
15. build membutuhkan koneksi database;
16. migration dijalankan otomatis saat build;
17. rollback SQL tidak dapat diuji;
18. protected route fail open;
19. scope mulai masuk plan/trial/onboarding/business;
20. satu fase menjadi terlalu besar.

Format hard stop:

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

# 14. Commit Rules

Commit hanya setelah seluruh local gate yang relevan lulus.

Gunakan 1–3 commit lokal yang logis.

Contoh:

```text
feat(db): add IT-DIAG-00C Drizzle auth schema and migrations
feat(auth): add Better Auth session and protected route foundation
test(auth): verify migration session and tenant policy foundations
```

Atau satu commit bounded:

```text
feat(auth): implement IT-DIAG-00C database and auth foundation
```

Dilarang:

- amend;
- rebase;
- squash otomatis;
- push;
- PR;
- merge.

Gunakan SHA hasil `git rev-parse`, jangan mengarang SHA dari short hash.

---

# 15. Definition of Done

IT-DIAG-00C belum siap direview sebelum:

```text
[ ] branch benar dari approved IT-DIAG-00B HEAD
[ ] hanya wattwise-vercel yang berubah
[ ] dependency stable dan dipin exact
[ ] npm audit tidak memiliki high/critical
[ ] env validation aman
[ ] Drizzle config tersedia
[ ] Better Auth schema direview
[ ] migration SQL tersedia
[ ] rollback SQL tersedia
[ ] migration up/down/up diuji
[ ] register bekerja
[ ] login bekerja
[ ] logout bekerja
[ ] database-backed session bekerja
[ ] anonymous ditolak protected route
[ ] authenticated session diterima
[ ] tenant policy foundation diuji
[ ] database health nyata bekerja
[ ] no secret exposure
[ ] Node 24 digunakan
[ ] unit test lulus
[ ] integration test lulus
[ ] typecheck lulus
[ ] lint lulus
[ ] production build lulus
[ ] runtime smoke test lulus
[ ] git diff --check bersih
[ ] workspace clean setelah commit
[ ] docs diperbarui
[ ] risk dan rollback dilaporkan
```

Neon dev connection:

- bila diuji dengan Neon dev non-production: laporkan VERIFIED;
- bila hanya diuji dengan disposable local PostgreSQL: laporkan Neon dev verification pending;
- jangan mengklaim Neon terverifikasi bila belum benar-benar terhubung.

---

# 16. Final Report Format

Berikan laporan lengkap:

```text
1. Status
2. Selected Phase
3. Summary
4. Branch and Base Commit
5. Commits Created
6. Changed Files
7. Created Files
8. Deleted Files
9. Dependency Due Diligence
10. Dependency Tree
11. Schema
12. Migration SQL
13. Rollback SQL
14. Migration Up/Down/Up Result
15. Environment Configuration
16. Better Auth Configuration
17. Register Result
18. Login Result
19. Logout Result
20. Session Result
21. Route Protection Result
22. Tenant Policy Foundation
23. Database Health Result
24. Security Findings
25. npm Audit Result
26. Tests Actually Run
27. Exact Test Results
28. Typecheck Result
29. Lint Result
30. Build Result
31. Runtime Smoke Result
32. Node Version Actually Used
33. PostgreSQL Test Environment
34. Neon Dev Verification Status
35. Protected Directory Diff
36. Known Risks
37. Correct Git Rollback
38. Correct Database Rollback
39. Remaining Scope
40. Decision Needed
41. Final Verdict
```

Final verdict hanya boleh salah satu:

```text
VERIFIED — READY FOR PRODUCT OWNER REVIEW

VERIFIED LOCALLY — NEON DEV VERIFICATION PENDING

NOT VERIFIED — CORRECTION REQUIRED

BLOCKED — DECISION REQUIRED
```

Jangan menulis `IT-DIAG-00C ACCEPTED`. Hanya Product Owner yang dapat menerima fase.

Setelah laporan diberikan, berhenti.

Jangan mulai IT-DIAG-01.

---

# 17. Instruksi Eksekusi Singkat

Saat file ini telah disimpan di folder `docs`, gunakan instruksi berikut:

```text
Buka workspace:

D:\LOMBA\MVP PROTOTIPE start-up

Baca seluruh file Markdown di:

D:\LOMBA\MVP PROTOTIPE start-up\docs

Kemudian jalankan seluruh instruksi dalam:

D:\LOMBA\MVP PROTOTIPE start-up\docs\WATTWISE_AI_IT_DIAG_00C_IMPLEMENTATION_PROMPT.md

Implementasikan tepat satu fase:

IT-DIAG-00C — Database dan Auth Foundation

Gunakan approved local base commit:

ff530e021e7054cef92ce39d3830a7a9093b9ea3

Semua implementasi baru hanya boleh berada di:

D:\LOMBA\MVP PROTOTIPE start-up\wattwise-vercel

Jangan mengubah wattwise-laravel.
Jangan push.
Jangan membuka pull request.
Jangan merge.
Jangan deploy.
Jangan menjalankan migration production.
Jangan membuat atau mengubah resource Neon secara otomatis.
Jangan mengerjakan IT-DIAG-01.

Gunakan Node.js 24 melalui Docker untuk seluruh npm quality gate.

Setelah implementasi, migration up/down/up, integration test, security
verification, build, runtime smoke test, commit lokal, dan laporan selesai,
berhenti dan tunggu keputusan Product Owner.
```
