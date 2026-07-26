# IT-DIAG-04 — Local Implementation and Verification Report

## Verdict

`VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW`

Tanggal verifikasi: 27 Juli 2026 (Asia/Jakarta).

Verdict ini hanya menyatakan hasil verifikasi lokal. Verdict ini tidak menyatakan product acceptance, tidak mencakup deploy, dan tidak memulai IT-DIAG-05.

## Source control dan source hierarchy

- Accepted base: `d3c23f9a465af97f6ac8b03c8f77d22826610f4e`
- Branch: `feature/it-diag-04-guided-inspection`
- Activation commit: `948286c986d1b6e35cd7aefeb70f6741ab601295`
- Implementation commit: `c9e572c52e8a679d718d3c31708a313740b18422`
- Activation commit adalah direct child accepted base.
- Implementasi dimulai dari worktree bersih.
- Tepat satu active task: `docs/tasks/WATTWISE_AI_IT_DIAG_04_IMPLEMENTATION_PROMPT.md`.
- Prompt IT-DIAG-03 dipindahkan ke `docs/archive/`.
- Lampiran task dan active-task file memiliki SHA-256 identik:
  `6614280C6F8CC44588CF7D776860E225ADABE55F1C40271F92B88FDD52581976`.
- Tiga dokumen baseline dibaca dalam urutan wajib. Tidak ditemukan konflik antara canonical contract, repository state, dan approved task.
- Audit Laravel dilakukan read-only. Tidak ditemukan kontrak guided inspection aman yang layak dipindahkan. Modul prediction/recommendation legacy tidak digunakan karena di luar scope dan dilarang task.

## Implementasi yang selesai

### Persistence dan migration

- Forward migration: `wattwise-vercel/drizzle/migrations/0005_guided_inspections.sql`
- Rollback: `wattwise-vercel/drizzle/rollbacks/0005_guided_inspections_rollback.sql`
- Migration discovery sekarang mencakup `0000` sampai `0005`.
- Up/down/up migration terbaru lulus pada PostgreSQL 16 disposable.
- `inspection_plan` menyimpan tenant/business ownership, kandidat asal, code/version/rule snapshot, status, hasil agregat, note opsional, dan timestamp lifecycle.
- `inspection_item` menyimpan item code/version, instruction snapshot, safety snapshot, result-option snapshot, urutan, jawaban, note, dan timestamp.
- FK, uniqueness, index, status/result/safety checks, positive order/version, completion consistency, JSON-array checks, dan batas note 1.000 karakter diterapkan di database.

### Katalog dan guardrail

- Rule terpusat dan berversi: `INSPECTION_RULE_V1`.
- Template tersedia tepat untuk kandidat accepted IT-DIAG-03:
  - `BILL_ADMINISTRATION_CHANGE`
  - `OCCUPANCY_INCREASE`
  - `SPECIAL_ACTIVITY`
  - `NEW_ELECTRICAL_APPLIANCE`
  - `WATER_SYSTEM_CHANGE`
- `INFORMATION_COMPLETENESS` (`DATA_QUALITY`) tidak memiliki template atau CTA pemeriksaan fisik.
- Tidak ada template AC karena accepted questionnaire/candidate catalog tidak menyediakan evidence AC.
- Safety levels internal:
  - `SAFE_OBSERVATION`
  - `PROFESSIONAL_REQUIRED`
- Label pengguna exact:
  - `Aman untuk diamati`
  - `Hentikan dan minta bantuan`
- Answer labels exact:
  - `FOUND` → `Ditemukan Masalah`
  - `NOT_FOUND` → `Tidak Ditemukan`
  - `UNKNOWN` → `Tidak Tahu`
  - `NEEDS_HELP` → `Butuh Bantuan`
- Raw enum tidak ditampilkan di UI.
- Instruksi tidak meminta membuka panel/casing, membongkar, menyentuh instalasi, mencabut kabel, mengukur tegangan/arus, memakai multimeter, memperbaiki, atau menggunakan perangkat rusak.
- Setiap template memiliki stop path eksplisit: jangan menyentuh atau membongkar, hentikan pemeriksaan, dan minta bantuan teknisi yang kompeten.

### Lifecycle, concurrency, dan authorization

- Plan hanya dapat dimulai dari kandidat milik tenant pada session `ANALYZED` atau `INSPECTION_IN_PROGRESS`.
- Kandidat/status/version/rule/template yang unknown atau dimanipulasi ditolak.
- Kandidat pada session `DRAFT`, `COLLECTING_CONTEXT`, atau `CLOSED` ditolak tanpa partial write.
- Start pertama mentransisikan session `ANALYZED` → `INSPECTION_IN_PROGRESS`.
- Kandidat kedua tetap dapat dimulai pada session yang sudah `INSPECTION_IN_PROGRESS`.
- Repeated dan concurrent start menghasilkan tepat satu plan dan satu item snapshot set.
- Jawaban/note identik idempotent; jawaban dapat diubah sebelum completion.
- Completed plan dan seluruh item-nya immutable.
- Completion mengunci plan/items, memvalidasi semua item `ANSWERED`, menghitung agregat server-side, lalu menulis hasil dan timestamp secara atomik.
- Aggregate precedence:
  1. `NEEDS_HELP`
  2. `FOUND`
  3. semua `NOT_FOUND`
  4. selainnya `UNKNOWN`
- Repeated dan concurrent completion mengembalikan hasil/timestamp database yang sama.
- Start, read, answer, dan complete memverifikasi tenant ownership di server dan database transaction.
- Client hanya mengirim identifier serta answer/note; instruction, safety, eligibility, dan aggregate result tidak dipercaya dari client.

### UI

- Route baru: `/diagnostics/[sessionId]/inspections/[inspectionPlanId]`.
- Candidate results menyediakan:
  - `Mulai pemeriksaan aman`
  - `Lanjutkan pemeriksaan`
  - `Lihat hasil pemeriksaan`
- DATA_QUALITY menampilkan state aman tanpa CTA fisik.
- Halaman inspeksi menampilkan safety notice, progress, ordered instructions, safety label, exact answer labels, note opsional, pending state, resume state, completion state, aggregate result, immutability notice, disclaimer, dan back navigation.
- Tidak ada diagnosis, repair instruction, action plan, marketplace teknisi, outcome tracking, prediction, ML/LLM, upload, foto, atau IoT.

## Test dan quality gates

Semua gate resmi dijalankan di `node:24-slim`.

| Gate | Hasil |
|---|---:|
| `node --version` | `v24.18.0` |
| `npm --version` | `11.16.0` |
| `npm ci` | exit 0 |
| `npm test` | exit 0 — 9 files, 127 tests passed |
| Integration Vitest pada PostgreSQL 16 | exit 0 — 6 files, 88 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |

Integration suite membuktikan:

- schema/constraint/FK/index;
- migration up/down/up;
- valid/invalid eligibility;
- failed-start rollback;
- repeated/concurrent start;
- item mismatch dan result-option enforcement;
- same-answer idempotency dan pre-completion edit;
- all aggregate outcomes;
- completion readiness, immutability, retry, dan concurrency;
- second-candidate start;
- DATA_QUALITY non-inspectable;
- cross-tenant start/read/answer/complete denial;
- accepted IT-DIAG-01B, IT-DIAG-02, dan IT-DIAG-03 regressions tetap lulus.

Build berhasil tanpa database aktif dan menghasilkan route inspeksi dinamis.

## Runtime dan browser evidence

Runtime menggunakan Node.js 24, PostgreSQL 16 disposable, Chrome headless production build, synthetic users/businesses/bills, dan feature flags yang sama seperti integration runner.

Flow yang diverifikasi:

- registrasi user A;
- plan/onboarding/business Kos;
- dua tagihan;
- questionnaire dan candidate generation;
- start inspection;
- session transition;
- `FOUND`, `NOT_FOUND`, `UNKNOWN`, dan `NEEDS_HELP`;
- leave/resume;
- atomic completion dan reload-stable aggregate;
- completed immutability;
- start kandidat kedua;
- logout;
- user B dengan DATA_QUALITY tanpa CTA/plan fisik;
- cross-tenant plan route → 404;
- cross-tenant answer/complete denial juga dibuktikan integration test.

Browser results:

| Check | Hasil |
|---|---:|
| 360×800 | no horizontal overflow; document 360×3463 |
| 768×1024 | no horizontal overflow; document width 753 |
| 1280×800 | no horizontal overflow; document width 1265 |
| Pending/double-submit protection | pass |
| Resume state | pass |
| Completion + aggregate | pass |
| Completed immutability | pass |
| DATA_QUALITY no physical CTA | pass |
| Keyboard focus | pass |
| Native scrolling | pass |
| Reduced motion | pass |
| Cross-tenant route | 404 |
| Hydration/React/GSAP/console issue | 0 |
| HTTP 5xx | 0 |
| Exact answer/safety labels | pass |

Evidence:

- `docs/reports/it-diag-04/browser/browser-report.json`
- `docs/reports/it-diag-04/browser/inspection-360x800.png`
- `docs/reports/it-diag-04/browser/inspection-768x1024.png`
- `docs/reports/it-diag-04/browser/inspection-1280x800.png`
- `docs/reports/it-diag-04/browser/inspection-completed.png`

## Dependency audit

`package.json` dan `package-lock.json` tidak berubah dari accepted base.

Advisory database yang sama menghasilkan:

| Audit | Moderate | High | Critical |
|---|---:|---:|---:|
| `npm audit` | 4 | 12 | 0 |
| `npm audit --omit=dev` | 4 | 3 | 0 |

Hasil sama dengan accepted IT-DIAG-03 reference. Tidak ada `npm audit fix`, dependency upgrade, atau lockfile mutation.

## Scope dan cleanup

- `docs/baseline/**`: tidak berubah.
- `wattwise-laravel/**`: tidak berubah.
- Migration `0000`–`0004`: tidak berubah.
- Package manifest/lockfile: tidak berubah.
- Tidak ada push, PR, merge, deploy, Neon write, atau production write.
- IT-DIAG-05 dan AI/ML tidak dimulai.
- Container aplikasi/PostgreSQL disposable, Docker network, Docker dependency volume, temporary browser scripts, dan Chrome test profiles telah dibersihkan.

## Rollback

Rollback source lokal:

```text
git revert c9e572c52e8a679d718d3c31708a313740b18422
```

Rollback database untuk environment yang kelak menerapkan migration:

```text
jalankan isi wattwise-vercel/drizzle/rollbacks/0005_guided_inspections_rollback.sql
```

Tidak ada rollback production/Neon yang dijalankan karena environment tersebut tidak disentuh.

## Known risks dan readiness

- Audit vulnerabilities adalah baseline dependency yang sudah ada dan tidak memburuk karena task ini.
- Verification menggunakan data sintetis dan environment disposable; belum ada preview/production deploy.
- Preview-ready secara lokal setelah Product Owner review, tetapi deploy tetap memerlukan otorisasi terpisah.
- Neon status: untouched.
