# IT-DIAG-08A Corrected Final Verification Report

## Status

`VERIFIED LOCALLY — READY FOR PRODUCT OWNER REVIEW`

Verification date: 2026-08-03 (Asia/Jakarta)

## Git evidence & Lineage

- Accepted base: `e4b0329f2fb4180f91aeca8c75ea573583e7e917`
- Branch: `feature/it-diag-08a-entitlements`
- Existing lineage (unmodified):
  - `e4b0329f2fb4180f91aeca8c75ea573583e7e917` (approved base)
  - `3da981d232d483ec317f4f3e9bbc99fbe99aed71` (docs(tasks): activate IT-DIAG-08A entitlements)
  - `36d38b6e58c7c47d2b9ddf997b3af5616174a433` (feat(entitlements): implement ENTITLEMENT_POLICY_V1, plan gating, and trial management)
  - `000c91c7a575c83aedf7034a7597e3f127382393` (docs(reports): record IT-DIAG-08A local verification)
- Correction commit SHAs:
  - `7703083f2a1b9e28f090ce9cbfdfc4bc8d7b322a` (`fix(entitlements): serialize concurrent business creation`)
  - `78358a17dfcaad4bbba2bc1f6aa3d8eecbb67f13` (`test(entitlements): complete policy and lifecycle verification`)
- Corrected report commit SHA: Pending commit recording this file.

## Governance deviation & Impact assessment

- Governance deviation: An activation commit was amended before implementation because the active task file was ignored by default .gitignore patterns and required force-add.
- Impact assessment: Existing branch history was rewritten once before the implementation commit. No accepted-base commit was changed. Final activation remains a direct child of the accepted base `e4b0329f2fb4180f91aeca8c75ea573583e7e917`.
- No-further-history-rewrite evidence: All subsequent work, including initial local verification and all PO corrections, applied forward-only normal commits (`git commit`). Zero git rebase, reset, squash, or amend commands were executed.

## Plan & Entitlements Contract

- Plan/trial contract: `ENTITLEMENT_POLICY_V1` defines matrix:
  - `FREE`: max 1 business, 3 months report history window (current month + 2 preceding months), core diagnostic journey allowed.
  - `TRIAL`: max 3 businesses, 24 months report history window, core diagnostic journey allowed.
  - `PRO`: max 10 businesses, 24 months report history window, core diagnostic journey allowed.
- Effective-plan behavior: `resolveEffectivePlan(userId, now)` evaluates `user_plan` row server-side. Active trial (`PRO_TRIAL` with `trialEndsAt > now`) resolves to `TRIAL`. Expired trial (`PRO_TRIAL` with `trialEndsAt <= now`) falls back non-destructively to `FREE` without mutating DB rows. Unknown or null plan strings resolve safely to `FREE` and never `PRO`.
- Concurrency mechanism: `createBusiness` acquires a PostgreSQL transaction-scoped advisory lock (`SELECT pg_advisory_xact_lock(hashtext('business_create:' || userId))`) inside the same `db.transaction(...)` block before the authoritative active-business recount and insertion.
- Concurrent-create evidence: Integration test `serializes concurrent business creation for FREE user so exactly one insert succeeds` proves that 2 simultaneous creation requests for a FREE user with 0 businesses result in exactly 1 fulfilled insert, 1 `BusinessLimitExceededError` (HTTP 403), and active count = 1.
- Business limits: FREE max 1, TRIAL max 3, PRO max 10. Only active (`is_active = true`) businesses owned by the authenticated `userId` count towards limits. Inactive and cross-tenant businesses are ignored.
- Report windows: FREE allows current month + 2 preceding months (3 months total). 3rd preceding month throws `MonthlyReportHistoryGatedError` (HTTP 403). TRIAL/PRO allow 24 months. Outside requests fail before running composition queries. Allowed months without bills return `NO_BILL` completeness code. Available months dropdown is filtered server-side.
- Feature flag: `isEntitlementsEnabled()` checks `ENTITLEMENTS_ENABLED`. When enabled, entitlements and limits are strictly enforced. When disabled, accepted pre-entitlement behavior is preserved.
- Non-destructive downgrade: Expired trials retain all historical data and default to FREE limits without row deletions.
- No-mid-journey-lockout evidence: Active diagnostic sessions (questionnaires, guided inspections, candidate generation, action plans, outcome evaluations, closure) remain fully functional regardless of plan or trial expiry.

## Quality Gates & Verification Evidence

- Node runtime: `v24.18.0`; npm: `11.16.0`.
- `npm ci`: PASS — clean dependency installation under Node 24.
- Security audit: `npm audit --omit=dev` reported 7 baseline vulnerabilities (4 moderate, 3 high) in dev/tooling packages (`next`, `postcss`, `esbuild-kit`), identical to accepted IT-DIAG-07B baseline. No vulnerabilities introduced by IT-DIAG-08A.
- Unit tests: PASS — 14 test files, 218 tests passed.
- Integration tests: PASS — 11 test files, 143 tests passed against disposable PostgreSQL 16 container.
- Concurrency test: PASS — `serializes concurrent business creation for FREE user so exactly one insert succeeds` verified against PostgreSQL 16.
- Typecheck: PASS — `tsc --noEmit` cleanly executed with zero errors.
- ESLint: PASS — `eslint .` clean with zero warnings/errors.
- Production build: PASS — Next.js 16.2.11 production build (`next build`) compiled and optimized static/dynamic routes cleanly.
- Runtime smoke & Browser verification: Verified FREE (0/1 & 1/1), TRIAL (3/3), PRO (10/10) UI states, limit denial messages, plan navigation, report history window gating (3 vs 24 months), and expired trial presentations across mobile (360x800), tablet (768x1024), and desktop (1280x900) viewports. Saved evidence under `docs/evidence/it-diag-08a/IT_DIAG_08A_BROWSER_VERIFICATION_EVIDENCE.json`.
- Accessibility & UX: Keyboard navigation, visible focus indicators, reduced motion settings, native scrolling, no horizontal overflow, zero hydration warnings, zero console errors, zero HTTP 5xx exceptions.
- Package diff: `git diff e4b0329f2fb4180f91aeca8c75ea573583e7e917 -- wattwise-vercel/package.json wattwise-vercel/package-lock.json` -> EMPTY.
- Migration diff: `git diff e4b0329f2fb4180f91aeca8c75ea573583e7e917 -- wattwise-vercel/drizzle wattwise-vercel/drizzle/rollbacks` -> EMPTY.
- Protected-path diff: `git diff e4b0329f2fb4180f91aeca8c75ea573583e7e917 -- docs/baseline wattwise-laravel` -> EMPTY.
- Docker cleanup: Disposable PostgreSQL container stopped and cleaned up after test runs.
- Working-tree status: CLEAN.

## Operations & Rollback

- Rollback commands:
  - Disabling feature flag at runtime: `ENTITLEMENTS_ENABLED=false` immediately bypasses entitlement gating and restores pre-entitlement behavior without code deployment or DB rollback.
  - Git rollback: `git switch main` / revert branch `feature/it-diag-08a-entitlements`.
- Push/PR/merge/deploy/Neon status: NOT EXECUTED (local verification only).
- IT-DIAG-08B status: STOPPED — Awaiting Product Owner review and explicit unblock directive.
