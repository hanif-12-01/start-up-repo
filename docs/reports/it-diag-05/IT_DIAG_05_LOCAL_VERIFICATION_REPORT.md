# IT-DIAG-05 — Local Verification Report

## Status

- Status verifikasi: selesai secara lokal; menunggu review Product Owner.
- Accepted base: `84c89e81579d38edfa4c4d250780fcdcd732272b`.
- Branch: `feature/it-diag-05-action-plan`.
- Activation commit: `157821518258feaca80ff941e6b855d1b5347ae5`.
- Implementation commit: `8907abbd39c4b8b928f008fa3b62b65c2ab7f409`.
- Activation commit terverifikasi sebagai direct child accepted base.
- Hanya `WATTWISE_AI_IT_DIAG_05_IMPLEMENTATION_PROMPT.md` yang aktif di `docs/tasks`; prompt IT-DIAG-04 dipindahkan byte-for-byte ke `docs/archive`.
- Tidak ada push, pull request, merge, deploy, perubahan Neon, pekerjaan IT-DIAG-06, atau pekerjaan AI/ML.

## Source hierarchy result

Implementasi mengikuti, secara berurutan, guardrail PRD, strategi Vercel, master agent prompt, accepted IT-DIAG-04, dan prompt aktif IT-DIAG-05. Scope IT-DIAG-05 sengaja dibatasi pada pembuatan serta lifecycle rencana tindakan aman. Evaluasi before/after, hasil penghematan, estimasi, prediksi, dan status lifecycle lanjutan tetap ditunda ke fase berikutnya.

## Migration dan penyimpanan

- Migration: `wattwise-vercel/drizzle/migrations/0006_energy_action_plans.sql`.
- Rollback: `wattwise-vercel/drizzle/rollbacks/0006_energy_action_plans_rollback.sql`.
- Migration up/down/up: lulus dalam integration suite PostgreSQL 16.
- Tabel `energy_action_plan` menyimpan referensi tenant/business, diagnostic session, candidate, inspection plan, action/rule version, snapshot tindakan, snapshot hasil inspeksi, snapshot baseline, lifecycle, target review, tanggal mulai, catatan pengguna, dan timestamp.
- Constraint database mencakup foreign key, satu plan per inspection, JSON object/array non-kosong, status yang diizinkan, konsistensi timestamp lifecycle, serta batas panjang catatan.
- Migration 0000–0005 tidak berubah.

## Action catalog dan eligibility

- Catalog terpusat: `ACTION_PLAN_CATALOG`.
- Rule version: `ACTION_PLAN_RULE_V1`.
- Semua action menggunakan `actionVersion: 1`, candidate version/rule snapshot, inspection rule snapshot, dan urutan priority deterministik.
- Maksimum opsi: tiga; catalog saat ini menghasilkan dua opsi kandidat-spesifik untuk `FOUND`.

Mapping `FOUND`:

| Candidate | Action code |
| --- | --- |
| `BILL_ADMINISTRATION_CHANGE` | `REVIEW_BILL_RECORDS`, `PREPARE_OFFICIAL_PROVIDER_INQUIRY` |
| `OCCUPANCY_INCREASE` | `TRACK_OCCUPANCY_AND_SHARED_USAGE`, `SET_SHARED_FACILITY_ROUTINE` |
| `SPECIAL_ACTIVITY` | `LOG_SPECIAL_ACTIVITY`, `PLAN_RECURRING_ACTIVITY_SCHEDULE` |
| `NEW_ELECTRICAL_APPLIANCE` | `TRACK_APPLIANCE_OPERATING_TIME`, `SET_APPLIANCE_USAGE_ROUTINE` |
| `WATER_SYSTEM_CHANGE` | `TRACK_PUMP_OPERATION`, `RECORD_WATER_DEMAND_AND_PUMP_ACTIVITY` |

Mapping hasil inspeksi lainnya:

- `NEEDS_HELP`: tepat satu opsi, `REQUEST_COMPETENT_HELP`.
- `UNKNOWN`: tepat satu opsi, `COLLECT_MISSING_INFORMATION`.
- `NOT_FOUND`: tidak ada opsi dan pembuatan plan ditolak.
- Candidate `DATA_QUALITY`: tidak eligible untuk action plan.
- Tidak ada action AC dan tidak ada rekomendasi pembongkaran, perbaikan, pengukuran listrik, atau tindakan berbahaya.

## Baseline dan review target

- Snapshot baseline dibuat satu kali saat plan dibuat dan tidak dibaca ulang dari bill pada lifecycle berikutnya.
- Nilai Rupiah disimpan sebagai decimal integer dalam string exact, tanpa konversi floating point.
- Nilai kWh disimpan sebagai string exact ketika tersedia; nilai turunan harian direpresentasikan dalam milli-kWh integer untuk menghindari drift floating point.
- Snapshot memuat kedua bill, periode inklusif, durasi periode, total, kWh/tarif bila tersedia, dan nilai harian deterministik.
- Review mode selalu `NEXT_ELIGIBLE_BILL`.
- Planned start date divalidasi sebagai tanggal valid dan tidak boleh sebelum akhir periode baseline.
- Tidak ada savings amount, persentase penghematan, outcome, prediksi, atau klaim sebab-akibat.

## Lifecycle dan konsistensi

- Status yang didukung: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Transisi valid: `PLANNED → IN_PROGRESS`, `PLANNED → CANCELLED`, `IN_PROGRESS → COMPLETED`, dan `IN_PROGRESS → CANCELLED`.
- `COMPLETED` dan `CANCELLED` bersifat terminal dan immutable.
- Create idempotent: retry mengembalikan plan yang sama; concurrent create menghasilkan tepat satu row/snapshot melalui transaction, row lock, unique constraint, dan advisory lock.
- Start dan completion idempotent; concurrent completion menghasilkan state/timestamp yang konsisten.
- Cancellation aman dari `PLANNED` atau `IN_PROGRESS`; retry pada state terminal tidak mengubah data.
- Diagnostic session tetap `INSPECTION_IN_PROGRESS` pada seluruh transisi dan tidak ditutup oleh IT-DIAG-05.

## Tenant isolation dan input boundary

- Options, create, read, start, complete, dan cancel seluruhnya memerlukan ownership chain business/user yang sama.
- Akses cross-tenant menghasilkan not-found dan tidak membocorkan keberadaan resource.
- Server tidak mempercayai business ID, baseline, title, steps, status, atau snapshot dari client; nilai otoritatif dibaca dari database/catalog.
- Form action hanya mengabaikan field internal React `$ACTION_*`; field asing atau field bisnis yang disisipkan client tetap ditolak oleh schema strict.
- Feature gate `ACTION_PLANS_ENABLED` digunakan oleh service dan diaktifkan pada runner integration.

## Safe wording dan forbidden-instruction audit

- Copy menggunakan bahasa observasi/pencatatan, bukan diagnosis atau kepastian penyebab.
- Instruksi air/pompa membatasi observasi pada area kering dan aman serta memerintahkan berhenti bila kondisi tidak aman.
- Instruksi alat melarang membuka casing/komponen dan tidak meminta pengukuran kelistrikan.
- `NEEDS_HELP` selalu menghentikan inspeksi mandiri dan mengarahkan ke orang kompeten.
- Audit source tidak menemukan janji “pasti hemat”, jaminan penghematan, diagnosis pasti, rekomendasi perbaikan, atau prediksi penghematan.
- Frasa “penyebab pasti” yang ada digunakan dalam kalimat larangan eksplisit, bukan sebagai klaim.

## Automated verification

Lingkungan gate resmi: Docker `node:24-slim`, Node `v24.18.0`, npm `11.16.0`, dan PostgreSQL `16-alpine` disposable.

| Gate | Hasil |
| --- | --- |
| `npm ci` | PASS — 448 package terpasang dari lockfile |
| `npm run test` | PASS — 10 file, 141 test |
| `npm run test:integration` | PASS — 7 file, 107 test |
| Regression IT-DIAG-01B sampai IT-DIAG-04 | PASS — termasuk dalam unit/integration suite |
| Typecheck | PASS — `tsc --noEmit` |
| Lint | PASS — `eslint .` |
| Production build | PASS — Next.js 16.2.11 |

Integration coverage IT-DIAG-05 mencakup eligibility seluruh result, candidate mapping, batas tiga opsi, tanggal mulai, exact/immutable snapshots, create/start/complete idempotency, concurrent create/completion, cancellation, terminal immutability, tenant isolation, session lifecycle, constraint database, serta migration up/down/up.

## Runtime, browser, responsive, dan accessibility review

- Browser evidence dijalankan dengan Node `v24.14.0` dan Chrome `150.0.7871.187`.
- Quick regression routes `/`, `/register`, `/login`, `/plan`, `/onboarding`, `/businesses/new`, `/setup`, `/bills/new`, dan `/bills`: tidak ada HTTP 5xx.
- Browser journey memverifikasi opsi `FOUND=2`, `NEEDS_HELP=1`, `UNKNOWN=1`, `NOT_FOUND=0`.
- Validasi planned date, perlindungan pending submit, resume plan, terminal immutability, tampilan baseline, target next eligible bill, dan cross-tenant 404: lulus.
- Viewport `360×800`: `scrollWidth=360`; `768×1024`: `scrollWidth=768`; `1280×800`: `scrollWidth=1280`. Tidak ada horizontal overflow.
- Keyboard focus, native scroll, dan reduced-motion: lulus.
- Console issue: 0. HTTP 5xx: 0.
- Screenshot selection pada tiga viewport dan state completed telah diperiksa secara visual; tidak ditemukan clipping atau copy terpotong.
- Bukti tersimpan di `docs/reports/it-diag-05/browser/`.

## Dependency dan audit

- `package.json` dan `package-lock.json` identik dengan accepted base; task tidak menambah atau mengubah dependency.
- `npm audit`: exit code 1, 8 vulnerability — 4 moderate, 4 high, 0 critical.
- `npm audit --omit=dev`: exit code 1, 7 vulnerability — 4 moderate, 3 high, 0 critical.
- Temuan berasal dari dependency graph baseline yang tidak berubah (`brace-expansion`, chain dev `esbuild`/`drizzle-kit`, dan `postcss` melalui `next`/`better-auth`). Saran `--force` meminta perubahan breaking sehingga tidak diterapkan di task ini.

## Changed files

- Task governance: arsip prompt IT-DIAG-04 dan aktivasi prompt IT-DIAG-05.
- Database: schema/index action plan, migration 0006, rollback 0006.
- Domain/server: catalog, eligibility, baseline snapshot, lifecycle, presentation, repository, service, dan validation schema.
- UI/server actions: selection route/form, detail route/transition form, completed-inspection CTA, dan server actions.
- Verification: runner flag, unit test, integration test, update migration teardown/discovery regression, browser JSON, dan empat screenshot.
- Laporan ini.

Protected-directory diff: bersih untuk `docs/baseline`, seluruh `wattwise-laravel`, `package.json`, `package-lock.json`, dan migration 0000–0005.

## Cleanup dan Git state

- Container PostgreSQL disposable telah dihapus.
- Volume sementara `wattwise-it-diag-05-node-modules` dan `wattwise-it-diag-05-next` telah dihapus.
- Profil Chrome sementara `.tmp-it-diag-05-chrome` telah dihapus.
- Tidak ada resource Docker bernama `wattwise-it-diag-05` yang tersisa.
- Final working tree diverifikasi bersih setelah commit laporan.
- Tidak ada push, PR, merge, atau deploy.

## Rollback commands

Jalankan dari newest ke oldest bila rollback seluruh task diperlukan:

```powershell
git revert <REPORT_COMMIT_SHA>
git revert 8907abbd39c4b8b928f008fa3b62b65c2ab7f409
git revert 157821518258feaca80ff941e6b855d1b5347ae5
```

Untuk rollback database terkontrol, jalankan isi `wattwise-vercel/drizzle/rollbacks/0006_energy_action_plans_rollback.sql` sebelum atau sesuai prosedur release database tim.

## Known risks dan readiness

- Dependency baseline masih memiliki 8 advisory tanpa critical; remediasi membutuhkan workstream dependency tersendiri karena kandidat perbaikan audit mencakup perubahan breaking.
- Verifikasi ini lokal; Neon tidak disentuh dan production data tidak diuji.
- Preview siap diserahkan kepada Product Owner setelah branch dipush melalui proses yang diotorisasi terpisah.
- IT-DIAG-06 belum dimulai.
- Evaluasi before/after, penghitungan savings, prediction, dan AI/ML belum dimulai.

## Final verdict

VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW
