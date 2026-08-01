# IT-DIAG-06 Local Verification Report

## Status dan lineage

- Status: `VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW`
- Accepted base: `1a18883669e12adf0a3b1f956a3e8d602a5364c7`
- Branch: `feature/it-diag-06-outcome-evaluation`
- Activation commit: `9d972762c95ec8a8f88a8d9e724770cd1e1117d6`
- Implementation commit: `3a7f139bff5a4c0a59a030ad483ef72963df149a`
- Browser evidence commit: `dfc82ae4f57b829c669098dbbff34a846c48c41c`
- Report commit dan final HEAD: dicatat pada evidence closure setelah commit laporan dibuat; commit tidak dapat memuat SHA dirinya sendiri.
- Source hierarchy: task aktif dibaca setelah PRD, IT strategy, dan master agent prompt. Kontrak task mempersempit outcome menjadi perbandingan before/after non-kausal tanpa prediksi, estimasi penghematan, ML, atau LLM; tidak ditemukan konflik canonical.
- Exactly one active task: `WATTWISE_AI_IT_DIAG_06_IMPLEMENTATION_PROMPT.md`.
- IT-DIAG-05 telah diarsipkan byte-for-byte.

Urutan commit yang diverifikasi:

```text
1a18883669e12adf0a3b1f956a3e8d602a5364c7
→ 9d972762c95ec8a8f88a8d9e724770cd1e1117d6
→ 3a7f139bff5a4c0a59a030ad483ef72963df149a
→ dfc82ae4f57b829c669098dbbff34a846c48c41c
→ report commit (lihat final evidence closure)
```

## Migration dan persistence

- Migration: `drizzle/migrations/0007_action_outcome_evaluations.sql`.
- Rollback: `drizzle/rollbacks/0007_action_outcome_evaluations_rollback.sql`.
- Up/down/up: PASS pada PostgreSQL 16 integration suite.
- Schema outcome: `action_outcome_evaluation`, satu row unik per action plan, FK business/session/action/baseline bill/follow-up bill, enum checks, JSON-object checks, indexes session dan business.
- Session closure: `diagnostic_session.closed_at` dan status terminal `CLOSED`.
- Rule version: `OUTCOME_EVALUATION_RULE_V1`.
- Similarity band: exact `500 bps`.
- Eligible-after-date: tanggal lokal dari `completed_at`; follow-up wajib memiliki `period_start` yang strictly greater.
- Evaluation timezone: `Asia/Jakarta`, fallback canonical karena business schema belum menyimpan timezone.
- Next eligible bill: dipilih server-side, bukan input client; baseline dan comparison bill dikecualikan.
- Tie-break: `period_start ASC`, `period_end ASC`, `created_at ASC`, `id ASC`.
- Waiting state: tidak menulis row outcome dan menampilkan tautan tambah tagihan.

## Exact comparison dan snapshot

- Baseline: memakai kembali immutable `baseline_snapshot_json` dari Rencana Hemat; bill sumber tidak dibaca ulang untuk merekonstruksi baseline.
- Follow-up: snapshot immutable menyimpan periode, inclusive days, biaya, kWh/tarif bila ada, normalized rational values, dan captured timestamp.
- Comparison: snapshot immutable menyimpan rational normalized metrics, exact delta bps, direction, quality, dan overall code.
- Rupiah: integer `BigInt`/decimal string; tanpa JavaScript `Number` pada jalur authoritative.
- kWh: decimal string dikonversi exact menjadi milli-kWh `BigInt`.
- Tariff: decimal string dikonversi exact menjadi scaled integer `BigInt`.
- Rounding: rational integer, half-away-from-zero untuk bps; tidak memakai floating point authoritative.
- Directions: cost `LOWER|SIMILAR|HIGHER`; usage/tariff juga mendukung `UNAVAILABLE`.
- Data quality: `USAGE_COMPLETE`, `TARIFF_CONTEXT_ONLY`, `COST_ONLY`.
- Overall outcome: `POSITIVE_SIGNAL`, `NO_CLEAR_CHANGE`, `NEGATIVE_SIGNAL`, `MIXED_SIGNAL`, `INCONCLUSIVE`.

## Safety wording audit

- Safe wording: PASS; penjelasan berasal hanya dari metric yang tersedia dan menyertakan caveat bahwa perubahan bukan bukti satu-satunya penyebab.
- Causal wording: PASS; tidak ada attribution kausal. Kata “menyebabkan” hanya muncul dalam negasi aman yang ditentukan task.
- Success/failure labels: PASS; UI tidak memakai label `berhasil`, `gagal`, `efektif`, `tidak efektif`, atau `terbukti hemat` sebagai outcome.
- Saving claim: PASS; tidak menghitung atau menyatakan future saving, guaranteed saving, ROI, atau payback.
- Prediction: PASS; tidak ada forecast, prediction, ML, atau LLM.
- Cost-only: tidak dipakai sebagai bukti perubahan penggunaan; overall `INCONCLUSIVE` kecuali konteks tarif yang memenuhi rule deterministic.

## Concurrency, immutability, closure, dan tenant isolation

- Evaluation idempotency: PASS; retry mengembalikan row yang sama.
- Concurrent evaluation: PASS; row/advisory lock dan unique constraint menghasilkan tepat satu row/timestamp.
- `evaluated_at`: database-authoritative `SELECT now()` dalam transaction.
- Outcome immutability: PASS; perubahan bill sumber dan penambahan bill yang lebih awal setelah evaluasi tidak mengubah snapshot atau pilihan tersimpan.
- Closure eligibility: hanya `INSPECTION_IN_PROGRESS`; menolak plan `PLANNED`/`IN_PROGRESS`, completed plan tanpa outcome, dan sesi tanpa minimal satu outcome.
- Closure idempotency: PASS; retry mengembalikan `closed_at` yang sama.
- Closed behavior: terminal dan read-only; hasil, inspection, action plan, dan outcome tetap dapat dibaca, sedangkan mutation ditolak.
- Tenant isolation: evaluate/read/close tenant lain ditolak; browser route tenant lain menghasilkan 404 tanpa membocorkan resource.

## Verification gates

- Runtime: Docker `node:24-slim`, Node `v24.18.0`, npm `11.16.0`.
- Unit: PASS — 11 files, 165 tests.
- Integration/regression: PASS — 8 files, 122 tests pada disposable PostgreSQL 16.
- Typecheck: PASS — `tsc --noEmit`.
- Lint: PASS — `eslint .`.
- Build: PASS — Next.js `16.2.11`; route `/diagnostics/[sessionId]/actions/[actionPlanId]/outcome` terdaftar; build tidak membutuhkan database aktif.
- Runtime smoke: PASS — production build + Chrome headless + PostgreSQL 16 disposable.
- Browser review: PASS — registrasi/onboarding/business sintetis, waiting, same-day rejection, earliest eligible selection, pending button, immutable reload, closure blocked, explicit close, closed read-only, dan cross-tenant 404.
- Responsive: PASS — evidence 360x800, 768x900, dan 1280x900.
- Accessibility: PASS — semantic headings/forms/buttons/links, associated labels, `aria-live`, visible focus classes, dan role-based browser assertions.
- Reduced motion: PASS — accepted motion regression suite 11 tests; outcome memakai shared `PageReveal`/`Reveal` primitives yang tunduk pada reduced-motion contract.
- Browser evidence: `docs/reports/it-diag-06/browser/browser-evidence.json` dan empat PNG pada folder yang sama.

## Dependency dan audit

- `package.json` dan `package-lock.json`: byte-identical terhadap accepted base; tidak ada dependency baru.
- `npm audit --json`: 8 total — 4 moderate, 4 high, 0 critical.
- `npm audit --omit=dev --json`: 7 total — 4 moderate, 3 high, 0 critical.
- Advisory sama dengan lockfile accepted base. Tidak menjalankan `npm audit fix`, `--force`, atau upgrade out-of-scope.

## Scope dan cleanup

- Changed scope: task/archive activation; migration/rollback 0007; outcome schema/repository/services/validation/actions/UI; closed-session guards; unit/integration tests; browser evidence; laporan ini.
- Protected diff: kosong untuk canonical baseline docs, legacy Laravel, package/lock, dan migration 0000–0006.
- Docker cleanup: container browser, container integration PostgreSQL, dan volume Node/.next sudah dihapus; filter `wattwise-it-diag-06` kosong.
- Push/PR/merge/deploy: tidak dilakukan.
- Neon/production: tidak diakses.
- IT-DIAG-07: belum dimulai.
- AI/ML/LLM/prediction/dashboard final: belum dimulai.

## Known risks

- Advisory dependency baseline tetap terbuka dan memerlukan keputusan dependency-upgrade terpisah; tidak berasal dari IT-DIAG-06.
- `Asia/Jakarta` adalah fallback eksplisit sampai business memiliki timezone canonical.
- Evaluation membandingkan periode tersimpan dan tidak membuktikan sebab-akibat; okupansi, jam operasi, tarif, cuaca, alat, dan faktor lain dapat memengaruhi perubahan.

## Rollback

Jalankan `git revert` newest ke oldest. SHA report commit ditempatkan paling atas pada final evidence closure:

```powershell
git revert <REPORT_COMMIT_FULL_SHA>
git revert dfc82ae4f57b829c669098dbbff34a846c48c41c
git revert 3a7f139bff5a4c0a59a030ad483ef72963df149a
git revert 9d972762c95ec8a8f88a8d9e724770cd1e1117d6
```

## Final verdict

```text
VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW
```
