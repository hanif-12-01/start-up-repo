# IT-DIAG-07B Final Verification Report

## Verdict

`VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW`

Verification date: 2026-08-03 (Asia/Jakarta)

## Git evidence

- Branch: `feature/it-diag-07b-monthly-report`
- Approved base: `376af72373198313814ed687bbe55e943fa10a26`
- Activation commit: `bb7e7755dd2e7df8b91942889ea9fbc6155f6426`
- Implementation commit: `b056c23ccd4d51f40639c9b0ac7b47b2f71251f2`
- Browser evidence correction commit: `e7aff3879aefe7257d8c2b6dccab86f0cc13b648`
- This document is committed separately as the final report/evidence commit.
- Activation is a direct child of the approved base.
- Approved-base ancestry: PASS.
- Exactly one active task: `WATTWISE_AI_IT_DIAG_07B_IMPLEMENTATION_PROMPT.md`.
- Previous IT-DIAG-07A prompt archive SHA-256 remained byte-for-byte identical: `E287296DA3435144DCA5886B3DC51128D3504BA8A9FDFFF3B1F53A29BBACEBEA`.

## Delivered scope

- Added the server-rendered route `/reports/monthly?businessId=<id>&month=YYYY-MM`.
- Added strict month validation, future-month rejection, Asia/Jakarta boundaries, and deterministic default-month selection.
- Added business-scoped month and business selectors.
- Added bill summaries, accepted bill comparison, diagnostic journey, candidate, inspection, Rencana Hemat, and outcome summaries.
- Added explicit report-completeness states from no bill through closed journey.
- Added generic UMKM wording and safe non-causal caveats.
- Added print-friendly browser styling and the `Cetak Laporan` action.
- Added a secondary monthly-report link on the accepted dashboard without changing its primary CTA.
- Added the server-side `MONTHLY_REPORTS_ENABLED` feature flag.
- Added tenant-isolation, unit, integration, and production browser coverage.

## Data and query guarantees

- Bill inclusion rule: bill `period_end` falls inside the selected calendar month using half-open boundaries.
- Primary-bill order: `period_end`, `period_start`, `created_at`, and `id`, all descending.
- Previous bill rule: same business, `period_end < primary.period_start`, using the same deterministic order.
- Repository query count: four bounded queries per report read.
- Report construction reads accepted lifecycle data; it does not recalculate candidates, inspections, actions, or outcomes.
- Monetary aggregation uses exact integer/BigInt values. kWh totals are shown only when the selected set is complete.
- Every query and route lookup is scoped to the authenticated user's business membership.

## Quality-gate evidence

Node 24 container runtime: `v24.18.0`; npm: `11.16.0`.

- Unit: PASS — 13 files, 203 tests.
- Integration: PASS — 10 files, 135 tests against disposable PostgreSQL 16; cleanup confirmed.
- Typecheck: PASS.
- ESLint: PASS.
- Production build: PASS; `/reports/monthly` emitted as a dynamic route.
- `npm ci`: PASS under Node 24.
- `git diff --check`: PASS.
- Migration/rollback diff from approved base: empty.
- `package.json` and `package-lock.json` diff from approved base: empty.
- Forbidden segment wording and prediction/AI/ML/savings-estimate scan: no matches in the report read model or route.

Dependency audit observations were not introduced by IT-DIAG-07B:

- Full audit: 8 existing findings (4 moderate, 4 high).
- Production-only audit: 7 existing findings (4 moderate, 3 high).
- Available fixes require force/breaking upgrades, so no dependency mutation was made.

## Browser evidence

The production app ran with `node:24-slim`. The local CDP verification harness ran with Node `v22.17.0` and inspected the production application in headless Chrome.

- 24 route checks: PASS.
- Viewports: 360x800, 768x1024, and 1280x900.
- Completeness states: no bill, bill only, diagnostic, action, evaluated, and closed: PASS.
- Cross-tenant report access: 404 PASS.
- Dashboard secondary report link: PASS.
- Keyboard focus and reduced-motion checks: PASS.
- Print action invocation: PASS.
- Print media hides controls while retaining title, business, month, and caveat: PASS.
- Page-level horizontal overflow: none.
- Console warnings: 0.
- Browser exceptions: 0.
- HTTP 5xx responses: 0.
- Temporary application and PostgreSQL containers: stopped and removed.

Artifacts:

- `docs/evidence/it-diag-07b/browser-evidence.json`
- `docs/evidence/it-diag-07b/monthly-report-360x800.png`
- `docs/evidence/it-diag-07b/monthly-report-768x1024.png`
- `docs/evidence/it-diag-07b/monthly-report-1280x900.png`

## Constraint confirmation

- No migration or report table.
- No persisted report snapshot.
- No new dependency, PDF generator, PDF file, CSV export, email report, or background job.
- No candidate, inspection, action, or outcome recalculation.
- No dashboard primary-CTA change.
- No prediction, savings estimate, causal claim, AI, ML, or LLM.
- No push, PR, merge, deploy, or Neon access.
- IT-DIAG-08 was not started.

## Rollback

After the report commit SHA is known, revert newest to oldest:

```powershell
git revert <IT_DIAG_07B_REPORT_COMMIT_SHA>
git revert e7aff3879aefe7257d8c2b6dccab86f0cc13b648
git revert b056c23ccd4d51f40639c9b0ac7b47b2f71251f2
git revert bb7e7755dd2e7df8b91942889ea9fbc6155f6426
```

Do not revert the accepted IT-DIAG-07A base commit.
