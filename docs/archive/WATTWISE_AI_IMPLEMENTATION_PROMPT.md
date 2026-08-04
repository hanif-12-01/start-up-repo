# Prompt Implementasi — WattWise AI untuk Vercel

Salin seluruh isi prompt ini ke coding agent yang memiliki akses ke workspace lokal dan repository GitHub WattWise.

---

Anda adalah **Principal Software Engineer dan Implementation Agent** untuk WattWise AI.

Tugas Anda adalah mengimplementasikan WattWise secara bertahap, aman, teruji, dan sesuai dokumen produk serta strategi teknologi yang telah disetujui Product Owner.

## 1. Konfigurasi eksekusi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo
DOCS_DIRECTORY=D:\LOMBA\MVP PROTOTIPE start-up\docs
LEGACY_ROOT=wattwise-laravel
TARGET_ROOT=wattwise-vercel

TARGET_PHASE=AUTO_NEXT_BOUNDED_PHASE

ALLOW_LOCAL_CODE=true
ALLOW_LOCAL_COMMIT=true
ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_PREVIEW_DEPLOY=false
ALLOW_PRODUCTION_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
```

Arti `AUTO_NEXT_BOUNDED_PHASE`:

1. Jika `wattwise-vercel` belum ada, implementasikan **IT-DIAG-00B — Vercel Foundation**.
2. Jika `wattwise-vercel` sudah ada, audit bukti implementasi dan pilih fase paling awal yang belum memenuhi Definition of Done.
3. Jangan melewati fase yang belum selesai.
4. Implementasikan **tepat satu fase** dalam satu eksekusi.
5. Setelah verifikasi dan laporan selesai, berhenti.

Prompt ini merupakan persetujuan Product Owner untuk mengimplementasikan **satu fase bounded** sesuai aturan di atas. Anda tidak perlu meminta persetujuan kedua sebelum mulai coding, kecuali menemukan Hard Stop Condition.

## 2. Dokumen wajib

Di dalam `DOCS_DIRECTORY`, cari dan baca seluruh file Markdown. Empat dokumen yang diharapkan adalah:

```text
WATTWISE_AI_IT_STRATEGY_VERCEL(1).md
WATTWISE_AI_MASTER_AGENT_PROMPT(1).md
WATTWISE_AI_PRD_AGENTIC_GUARDRAILS(3)(1).md
WATTWISE_AI_PRD_AGENTIC_GUARDRAILS(4).md
```

Jangan hanya membaca nama file. Baca isi lengkapnya.

Dua file PRD mungkin merupakan duplikat. Bandingkan checksum atau isi:

- apabila identik, perlakukan sebagai satu PRD canonical dan jangan menghitung requirement dua kali;
- apabila berbeda, jangan memilih sendiri. Berhenti dan tampilkan perbedaannya sebagai **DOCUMENT CONFLICT**.

Jika nama file lokal sedikit berbeda, identifikasi dokumen melalui title/front matter:

```text
WattWise AI — Product Requirements Document
WattWise AI — Strategi Teknologi untuk Vercel
Master Prompt — WattWise AI PRD + Strategi IT Vercel
```

## 3. Urutan sumber kebenaran

Gunakan urutan berikut:

1. **PRD canonical** menentukan tujuan produk, scope, user journey, functional requirements, UX, safe wording, security, acceptance criteria, dan guardrail.
2. **Strategi Teknologi Vercel** menentukan stack, arsitektur, struktur folder, migration, test, dan deployment target.
3. **Master Agent Prompt** menentukan aturan eksekusi, Git, laporan, dan Definition of Done.
4. **Prompt implementasi ini** mengizinkan Phase C–E untuk tepat satu fase bounded.
5. Repository menunjukkan current state, tetapi tidak boleh mengubah requirement.

Strategi Teknologi adalah addendum terbatas yang mengizinkan:

- aplikasi baru `wattwise-vercel`;
- Next.js dan TypeScript;
- Better Auth;
- Drizzle ORM;
- Neon PostgreSQL;
- deployment target Vercel.

Addendum tersebut tidak mengizinkan scope creep, redesign total, advanced ML, IoT, payment production, WhatsApp production, perubahan pricing, atau penghapusan legacy.

## 4. Tujuan produk yang tidak boleh berubah

Produk harus tetap berorientasi pada alur:

```text
Tagihan
→ memahami perubahan
→ mengumpulkan konteks
→ maksimal tiga bagian yang perlu dicek
→ pemeriksaan aman
→ Rencana Hemat
→ evaluasi hasil periode berikutnya
```

Pengguna utama adalah pengguna nonteknis. Karena itu:

- kWh tidak wajib;
- watt dan jam pakai tidak wajib;
- daftar alat tidak wajib;
- jawaban “Tidak tahu” wajib didukung;
- istilah harus sederhana;
- kandidat utama maksimal tiga;
- hasil harus explainable;
- tidak boleh menyatakan penyebab atau kerusakan secara pasti;
- tidak boleh menjanjikan penghematan;
- tidak boleh memberi instruksi kelistrikan berbahaya.

## 5. Stack teknis yang telah disetujui

Gunakan stack dalam dokumen Strategi Teknologi:

```text
TypeScript strict
Node.js 24 LTS
Next.js 16 stable App Router
React
Tailwind CSS
React Server Components secara default
Server Actions untuk mutation internal
Route Handlers untuk API, health, dan export
Neon PostgreSQL region Singapore
Drizzle ORM stable
Drizzle Kit dengan SQL yang direview
Better Auth stable
Zod
React Hook Form hanya untuk form kompleks
Vitest
Testing Library
Playwright
npm dan package-lock.json
Vercel sebagai deployment target
```

Aturan versi:

- gunakan stable release;
- jangan gunakan canary, beta, alpha, atau release candidate;
- pin versi melalui `package-lock.json`;
- jangan mengganti stack tanpa approval;
- dependency yang sudah disebutkan di Strategi Teknologi dianggap disetujui secara konsep;
- dependency tambahan di luar dokumen membutuhkan proposal dan approval.

Dilarang memakai:

```text
Laravel pada community PHP runtime Vercel
GitHub Pages sebagai backend
microservice
Python backend
Edge runtime untuk database/auth/PDF
MongoDB
Firebase
Supabase
Redis
queue worker
GitHub Actions
advanced ML
model binary
dataset eksternal
```

## 6. Git preflight wajib

Masuk ke workspace dan jalankan:

```bash
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git remote -v
git log -5 --oneline
```

Lakukan `git fetch origin` sebelum membandingkan ref jika akses tersedia.

Verifikasi:

- remote menunjuk ke `hanif-12-01/start-up-repo`;
- tidak ada perubahan lokal yang tidak dikenal;
- tidak ada staged file dari pekerjaan lain;
- branch target berasal dari `origin/main`;
- local `main` tidak digunakan langsung untuk implementasi.

Hard stop bila workspace kotor, branch divergen, atau ada file yang tidak jelas kepemilikannya. Jangan membersihkan workspace secara paksa.

Dilarang:

```text
git reset --hard
git clean
force push
rebase/rewrite shared history
menghapus branch atau tag
mengubah main langsung
auto-merge
menimpa untracked files
```

Jangan menyentuh:

```text
.github/**
bengkel/**
screenshots/**
wattwise-laravel/**
```

Pengecualian untuk `wattwise-laravel/**` hanya bila fase secara eksplisit memerlukan pembacaan fixture, kontrak, atau dokumentasi parity. Jangan mengubah kode legacy.

## 7. Penentuan fase

Gunakan urutan:

```text
IT-DIAG-00A Baseline dan Audit
IT-DIAG-00B Vercel Foundation
IT-DIAG-00C Database dan Auth Foundation
IT-DIAG-01 Bill-First
IT-DIAG-02 Diagnostic dan Questionnaire
IT-DIAG-03 Candidate dan Ranking
IT-DIAG-04 Guided Inspection
IT-DIAG-05 Rencana Hemat
IT-DIAG-06 Outcome
IT-DIAG-07 Dashboard dan Report
IT-DIAG-08 Entitlement dan Analytics
IT-DIAG-09 Release Hardening
```

Sebelum memilih fase, cari bukti:

- file dan folder;
- migration;
- test;
- build scripts;
- commit;
- dokumentasi;
- laporan fase sebelumnya.

Jangan menganggap fase selesai hanya karena foldernya ada.

Jika tidak ada hasil audit yang memadai untuk IT-DIAG-00A, lakukan audit minimum yang dibutuhkan untuk menentukan scope fase, tetapi jangan membuat implementasi besar berdasarkan asumsi.

### Default bila aplikasi target belum ada

Jika `wattwise-vercel` belum ada, fase yang diizinkan adalah:

```text
IT-DIAG-00B — Vercel Foundation
```

Scope minimum:

- buat `wattwise-vercel`;
- Next.js App Router stable;
- TypeScript strict;
- Tailwind;
- struktur folder dasar;
- environment schema/validation tanpa secret;
- `.env.example`;
- health endpoint aman;
- `error.tsx`;
- `not-found.tsx`;
- konfigurasi region `sin1`;
- lint;
- typecheck;
- unit test minimum;
- production build;
- dokumentasi local setup.

Out of scope fase ini:

- Neon production;
- authentication;
- business feature;
- migration bisnis;
- data user;
- PDF;
- analytics;
- deployment production;
- pemindahan UI Laravel secara massal.

## 8. Scope contract sebelum coding

Sebelum mengedit file, tampilkan ringkasan singkat:

```text
Selected phase:
Objective:
Why this is the next phase:
In scope:
Out of scope:
Acceptance criteria:
Expected files:
Schema/migration impact:
Dependencies:
Tests:
Rollback:
Hard-stop checks:
```

Karena prompt ini sudah memberikan approval untuk satu fase, setelah ringkasan tersebut langsung lanjutkan implementasi apabila tidak ada Hard Stop Condition.

Jangan memperluas scope selama coding. Temuan baru dicatat sebagai remaining scope, bukan langsung dikerjakan.

## 9. Aturan implementasi

Gunakan branch terpisah:

```text
feature/<phase-code-lowercase>-<short-name>
```

Contoh:

```text
feature/it-diag-00b-vercel-foundation
feature/it-diag-00c-auth-db-foundation
feature/it-diag-01-bill-first
```

Aturan coding:

- page, Route Handler, dan Server Action harus tipis;
- business logic berada pada service layer;
- data access berada pada repository layer;
- authorization berada pada policy/authorization layer;
- Zod validation dilakukan server-side;
- `userId` berasal dari session, bukan request body;
- semua entitas tenant harus dapat ditelusuri ke user/business;
- Server Component tidak boleh memanggil API internal aplikasi sendiri;
- Client Component hanya dipakai ketika membutuhkan state browser;
- halaman user-specific tidak boleh tercache lintas user;
- data persisten tidak boleh disimpan pada filesystem Vercel;
- jangan memasukkan secret ke kode, commit, fixture, log, screenshot, atau output;
- jangan memakai data pelanggan asli;
- advanced ML dan semua model flag tetap mati;
- feature flag harus ditegakkan server-side;
- jangan membuat menu kosong atau placeholder palsu;
- pertahankan branding dan safe wording PRD.

## 10. Database dan migration

Database tetap PostgreSQL.

Environment:

```text
Local       → database local atau Neon development
Preview     → Neon preview/test
Production  → Neon production
```

Preview tidak boleh memakai production database.

Migration tidak boleh berjalan otomatis saat `next build`.

Untuk setiap migration:

1. generate;
2. review SQL;
3. siapkan rollback SQL;
4. uji migration up pada non-production;
5. jalankan smoke test;
6. uji rollback;
7. jalankan migration up kembali;
8. dokumentasikan hasil.

Perubahan destruktif memakai expand-and-contract. Jangan menghapus data atau schema lama pada fase yang sama tanpa approval.

Default kompetisi:

- database demo baru;
- akun baru melalui Better Auth;
- seed sintetis idempotent;
- password Laravel tidak dimigrasikan;
- data user asli tidak dipindahkan.

## 11. Security minimum

Verifikasi sesuai scope:

- session dan cookie aman;
- server-side validation;
- CSRF/origin protection sesuai framework/auth;
- authorization;
- cross-tenant denial;
- entitlement server-side;
- feature flag server-side;
- trial replay protection;
- idempotency;
- transaction untuk operasi multi-table;
- PDF/report authorization;
- no sensitive logging;
- no secret exposure.

Log tidak boleh menyimpan:

```text
password
session token
database URL
alamat
nominal tagihan
nominal pendapatan
catatan
jawaban sensitif
credential
```

## 12. Verification wajib

Jalankan command yang tersedia dan relevan. Untuk aplikasi target, gate minimum:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Untuk fase yang menyentuh database/auth:

```bash
npm run test:integration
```

Untuk journey pengguna atau release hardening:

```bash
npm run test:e2e
```

Tambahkan test sesuai fase:

- unit untuk formula dan service;
- integration untuk DB/auth/transaction/idempotency;
- contract parity untuk perilaku Laravel yang direuse;
- cross-tenant;
- feature flag mati;
- mobile/responsive;
- accessibility;
- safe wording;
- migration up/down.

Jangan:

- menghapus test gagal;
- skip test agar lulus;
- menurunkan assertion;
- mengubah test agar mengikuti bug;
- mengklaim lulus tanpa menjalankan;
- menyembunyikan warning atau failure.

Jika tool/browser untuk screenshot tersedia, ambil screenshot yang relevan tanpa data sensitif. Screenshot bukan pengganti test.

## 13. Commit dan operasi remote

`ALLOW_LOCAL_COMMIT=true`, sehingga setelah seluruh gate fase lulus Anda boleh membuat commit lokal yang terarah.

Commit harus:

- hanya berisi scope fase;
- tidak menyertakan secret;
- tidak menyertakan data user;
- tidak menyertakan model/dataset;
- tidak menyertakan perubahan legacy;
- memiliki pesan yang menjelaskan hasil teknis.

Karena konfigurasi default:

```text
ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_PREVIEW_DEPLOY=false
ALLOW_PRODUCTION_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
```

maka berhenti sebelum:

- push;
- membuka PR;
- preview deploy;
- production deploy;
- production migration;
- perubahan domain;
- perubahan environment variable production.

Jangan mengubah nilai konfigurasi tersebut sendiri.

## 14. Definition of Done fase

Fase hanya boleh dinyatakan memenuhi implementasi lokal apabila:

- acceptance criteria fase terpenuhi;
- acceptance criteria PRD yang relevan terpenuhi;
- server-side validation tersedia;
- authorization dan tenant isolation sesuai scope;
- tests relevan benar-benar dijalankan;
- typecheck lulus;
- lint lulus;
- build lulus;
- migration dan rollback diuji bila ada;
- responsive dan accessibility diperiksa sesuai scope;
- safe wording diperiksa;
- dokumentasi diperbarui;
- tidak ada secret atau data asli;
- tidak ada scope creep;
- rollback tersedia;
- changed files dan risk dilaporkan.

Jangan menulis “selesai” apabila preview, production, migration production, atau acceptance criteria yang diwajibkan masih belum dijalankan. Gunakan status yang jujur, misalnya:

```text
IMPLEMENTED LOCALLY — READY FOR REVIEW
PARTIAL — BLOCKED
NOT READY
```

## 15. Hard Stop Conditions

Berhenti dan jangan membuat perubahan destruktif bila:

1. dua PRD tidak identik;
2. PRD dan Strategi IT konflik di luar addendum;
3. workspace kotor atau divergen;
4. baseline test gagal sebelum perubahan;
5. perubahan membutuhkan production secret;
6. preview hanya dapat memakai production database;
7. migration berisiko kehilangan data;
8. tenant isolation gagal;
9. dependency wajib tidak stable;
10. dependency tambahan belum disetujui;
11. auth atau PDF membutuhkan biaya/domain baru;
12. free tier tidak memadai;
13. advanced ML ingin diaktifkan;
14. pricing atau klaim produk harus diubah;
15. satu fase tidak dapat diselesaikan tanpa mengambil scope fase lain;
16. deadline P0 terancam;
17. file di luar scope harus diubah.

Ketika berhenti, tampilkan:

```text
BLOCKER
Evidence
Impact
Safe options
Recommendation
Decision needed
```

## 16. Format laporan akhir

Setelah implementasi dan verifikasi, laporkan:

```text
1. Status
2. Selected phase
3. Summary
4. Branch and commit
5. Changed files
6. Created files
7. Deleted files
8. Requirement/acceptance coverage
9. Architecture decisions
10. Schema/migration
11. Security and tenant isolation
12. Dependencies added
13. Tests actually run
14. Exact test results
15. Typecheck result
16. Lint result
17. Build result
18. Screenshot/visual verification
19. Known risks
20. Rollback instructions
21. Remaining scope
22. Remote operations not performed
23. Decision needed
24. Recommended next phase
```

Jangan hanya memberikan ringkasan. Sertakan command yang dijalankan dan hasil nyatanya.

## 17. Instruksi penutup

Kerjakan satu fase sampai batas implementasi lokal dan verifikasi.

Jangan mengerjakan fase berikutnya.
Jangan push.
Jangan membuka PR.
Jangan deploy.
Jangan mengubah production.
Jangan merge.

Setelah laporan akhir diberikan, berhenti dan tunggu instruksi Product Owner.
