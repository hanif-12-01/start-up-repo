# IT-P0-09 — Multi-Location Portfolio Intelligence V1
**Owner Electricity Monitoring Across Multiple Locations**

**Active Application:** `wattwise-vercel/**`  
**Reference Application:** `wattwise-laravel/**` (Read-only architectural reference, zero modifications)  
**Branch:** `feature/portfolio-intelligence-v1`  
**Base Commit SHA:** `390dcc6c348b03bb70e2b96b0f81a165edced9dd`  
**Authoritative PRD:** [`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](../PRD/WattWise_PRD_Current_Validation_Stage.md)

---

## 1. Problem Statement & Product Purpose

For Indonesian small-and-medium property operators (e.g. kos-kosan, ruko) and multi-unit businesses (laundries, food & beverage outlets, cold storage), managing electricity bills across several active locations creates significant friction:

- An owner with 3 to 10 locations currently has to inspect individual business dashboards one by one just to discover whether an anomaly or bill spike occurred.
- Aggregating arbitrary "latest bills" across mismatched calendar months distorts portfolio metrics and masks seasonal spikes.
- Owners need an exception-based command center answering one primary operational question:  
  **"Di mana perhatian saya dibutuhkan hari ini?"**

---

## 2. Product Architecture: Portfolio vs. Location Intelligence

WattWise maintains a strict 2-level monitoring hierarchy:

```text
LEVEL 1 — PORTFOLIO INTELLIGENCE (GET /portfolio)
Purpose: "Tahu DI MANA perhatian dibutuhkan."
Focus: Multi-location exception triage, same-month electricity aggregation,
       coverage disclosure, top contributors to electricity growth.
                             │
                             ▼ [Lihat Lokasi]
LEVEL 2 — LOCATION INTELLIGENCE (GET /dashboard?businessId=...)
Purpose: "Tahu APA yang terjadi dan APA yang perlu diperiksa."
Focus: Individual diagnostic questionnaire (Cek Kenaikan), candidate ranking,
       equipment profiling, guided inspections, action plans, and outcome evaluations.
```

### Why it is NOT a "Super Admin"
The user of `/portfolio` is the business **owner** managing their own portfolio of commercial locations. It is not an administrative back-office, system configuration tool, or platform super-user view. Terminology is strictly owner-centric:
- *Semua Usaha*
- *Ringkasan Semua Lokasi*
- *Kondisi Semua Usaha*
- *Portfolio Listrik*

---

## 3. V1 Electricity-Only Scope Boundary

Portfolio Intelligence V1 is strictly focused on **electricity monitoring and decision support**:

### Included in V1:
1. Authenticated Next.js App Router route: `GET /portfolio` with optional `?month=YYYY-MM`.
2. Same-month calendar synchronization (no mismatched month aggregation).
3. Total portfolio electricity usage (kWh) and recorded bill cost (Rp).
4. Transparent data coverage disclosure (`activeBusinessCount`, `businessesWithElectricityData` strictly representing locations where `currentUsageKwh !== null`, `businessesWithBillRecord` tracking bill existence separately, and `electricityCoveragePercent`). Missing records are never fabricated as zero (`0 kWh != missing record`).
5. Reused authoritative location health classification (`analyzeLatestAnomaly` thresholds: `THRES_BOROS = 20.0`, `THRES_DICEK = 10.0`).
6. Owner-friendly health status mapping (`Normal` → `AMAN`, `Perlu Dicek` → `PERLU DICEK`, `Boros` → `PERLU PERHATIAN`, `Data belum cukup` / missing selected-month data → `DATA BELUM LENGKAP`).
7. Completely separate trend movement direction (`Naik` > +2.0%, `Stabil` -2.0% to +2.0%, `Turun` < -2.0%).
8. "Kondisi Semua Usaha" status banner with safe, non-alarmist narrative (no black-box AI scores) with count-aware majority evaluation considering all locations.
9. "Yang Perlu Anda Perhatikan" prioritized exception stream (max 5 items, excluding Aman locations) ranked and explained by authoritative `anomalyDifferencePercent`, never substituting cost percentage.
10. "Kontributor Kenaikan Terbesar" ranking locations by absolute kWh increase among strictly comparable populations.
11. 6-month historical portfolio electricity trend chart disclosing location reporting counts per month.
12. "Semua Lokasi" desktop table and mobile stacked card list with instant search and status filtering.
13. Safe drill-down links to existing location dashboard (`/dashboard?businessId=<id>`).

### Explicitly Excluded from V1:
- **Revenue / Omzet:** Zero revenue metrics, zero electricity-to-revenue ratio, zero margin or financial profitability scores in Portfolio V1. Existing revenue screens elsewhere in WattWise remain untouched.
- **Portfolio Forecasting:** Company-wide ML forecast or portfolio N-BEATS summation is deliberately deferred.
- **Hardware / IoT / Smart Meters:** Remains bill-first decision support.
- **Branch Manager RBAC / Org Hierarchies:** Single-owner multi-location model.
- **Accounting / ERP / POS:** Strictly out of scope.

---

## 4. Technical Implementation Details

### 4.1 Route & Access Control
- **Path:** `src/app/(product)/portfolio/page.tsx`
- **Session Enforcement:** Checked via Better Auth `getOptionalSession()`. Redirects unauthenticated users to `/login`.
- **Tenant Isolation:** Queries only records where `schema.business.userId = session.user.id`, `isActive = true`, and `archivedAt IS NULL`. Foreign businesses cannot leak.
- **Business Count Routing Rules:**
  - `0 active businesses` → redirect to `/onboarding`.
  - `1 active business` → redirect to `/dashboard?businessId=<ownedBusinessId>`.
  - `2+ active businesses` → render Portfolio Command Center.

### 4.2 Data Query Strategy (O(1) Batched Queries, No N+1)
To support 50+ locations without per-business N+1 query bottlenecks:
1. The Portfolio service (`getPortfolioOverview`) executes **2 batched database queries**:
   - Query 1: Fetch active businesses owned by the authenticated user (`schema.business.userId = userId`).
   - Query 2: Fetch all electricity bills for these businesses using a single `inArray(schema.electricityBill.businessId, businessIds)` query.
2. While the overall page request executes additional constant queries for session validation, user journey status, and route guards, the entire page request executes in constant O(1) query time with **zero per-business N+1 queries**.
3. In-memory grouping by `businessId` via `Map<string, BillDataLike[]>` ensures O(N) memory aggregation with pure mathematical classification.

### 4.3 Same-Month Aggregation & Fallback Semantics
- Strict calendar month validation (`isValidYearMonth`) ensures only genuine calendar months (`YYYY-MM` with months 01-12) are processed; invalid inputs such as `2026-00`, `2026-13`, `2026-99`, `abcd-12` safely fall back to the latest recorded month.
- If `?month=YYYY-MM` is omitted, the default selected month is the latest calendar month with electricity data for at least one active owned business.
- Month metrics aggregate **only** bills where `periodEnd.slice(0, 7) === selectedMonth`. Bills from other months are never summed into the selected month total.

### 4.4 Authoritative Anomaly Evaluation & Attention Item Semantics
- Location health strictly evaluates the selected month's usage. If the selected month lacks resolvable electricity usage (unusable kWh and no tariff derivation), the location is marked `Data Belum Lengkap` ("Data listrik bulan ini belum tersedia/lengkap."). `analyzeLatestAnomaly()` never evaluates an earlier usable month as a proxy for the selected month.
- Incomplete reasons are preserved:
  - Missing or unusable selected-month bill: "Data listrik bulan ini belum tersedia/lengkap."
  - Selected-month usage exists but historical baseline is insufficient (< 2 usable samples): "Histori penggunaan belum cukup untuk menentukan pola."
- Attention items preserve the specific incomplete reason rather than collapsing into a single generic message.
- **Authoritative Anomaly Deviation:** Preserves `anomalyDifferencePercent` from `analyzeLatestAnomaly(...).differencePercent`. This authoritative anomaly deviation is strictly used for Perlu Dicek / Perlu Perhatian explanatory percentages and attention ranking within equal severity. It never falls back to `costChangePercent`, ensuring cost movement is never substituted for electricity usage movement.

### 4.5 Comparable Month-over-Month (MoM) Population
When calculating percentage and absolute changes vs. previous month:
- **Usage comparability:** A business is considered usage-comparable **only** when **both** `selectedMonth` and `previousMonth` have resolvable electricity usage (kWh). If a bill exists but kWh is unusable, the business is excluded from the usage comparable population.
- **Cost comparability:** Modeled and tracked separately (`costComparableBusinessCount`) so that monetary comparisons do not distort kWh comparisons.
- `usageComparableBusinessCount` is explicitly disclosed in the UI (`Berdasarkan X dari Y lokasi yang memiliki data sebanding`).
- Trend labels (`Naik`, `Stabil`, `Turun`) strictly represent electricity usage movement. When electricity usage change is unavailable, trend is `null` (never falls back to cost percentage change, preventing tariff changes from falsely indicating "Pemakaian Naik").

### 4.6 Count-Aware Health Summary Narrative
The health summary narrative ("Kondisi Semua Usaha") considers all active locations using count-aware majority semantics:
- Majority safe (`safeCount > total / 2`): *"Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar. Ada X lokasi yang sebaiknya Anda tinjau."* (or *"Semua lokasi terpantau berada dalam batas pola penggunaan yang wajar."* if 0 need review).
- Majority needs review (`needsReview > total / 2`): *"Sebagian besar lokasi memerlukan peninjauan pemakaian listrik (X dari Y lokasi)."*
- Majority incomplete (`incompleteCount > total / 2`): *"Sebagian besar lokasi belum memiliki data listrik yang lengkap (X dari Y lokasi)."* (e.g. 7 incomplete out of 10 locations will never claim most locations are in a reasonable usage pattern).
- Neutral / mixed status (no single category holds a strict majority): *"Kondisi pemakaian beragam. Ada X lokasi yang disarankan untuk ditinjau."* (or *"Kondisi pemakaian beragam antar lokasi usaha."*).

### 4.7 Top Contributors to Electricity Increase (Section 17)
- Evaluates comparable locations where `increaseKwh = (currentUsageKwh - previousUsageKwh) > 0`.
- Calculates total increase: `totalIncreaseKwh = sum(increaseKwh)`.
- Contribution percent: `(increaseKwh / totalIncreaseKwh) * 100`.
- Ranks descending by `increaseKwh`. Negative or stable locations do not distort the increase contributor list.

---

## 5. UI / UX Design & Accessibility (WCAG 2.2 AA)

- **Calm, Professional Aesthetics:** Subtle borders, standard Tailwind tokens, restrained emerald accents, and clear typography.
- **Accessibility:** 
  - Status is never represented by color alone; every badge includes a distinct vector icon (`CheckCircle2`, `AlertCircle`, `AlertTriangle`, `HelpCircle`) and high-contrast text label.
  - Proper heading hierarchy (`h1` for page title, `h2` for main sections, `h3` for cards).
  - Responsive design with zero horizontal table scroll on mobile (desktop table converts to stacked cards on viewport `< 768px`).
  - Interactive elements have descriptive `aria-label`, visible focus rings, and touch targets $\ge 44 \times 44\text{px}$.

---

## 6. Verification & Quality Evidence

### 6.1 Automated Tests
- **Unit Tests (`tests/unit/portfolio.test.ts`):** 30 passing unit tests covering all core functions, health narratives, strict month validation, comparable populations, trend isolation, and route decisions.
- **Integration Tests (`tests/integration/portfolio.test.ts`):** Verifies PostgreSQL tenant ownership isolation, 0 business fallback, and batched execution.
- **Public Demo Provisioning Tests (`tests/integration/public-demo-provisioning.test.ts`):** Verifies idempotent convergence against stale records.
- **Full Repository Test Suite:** All test suites passing.
- **TypeScript:** `npm run typecheck` passing (0 errors).
- **ESLint:** `npm run lint` passing (0 errors, 0 warnings).
- **Production Build:** `npm run build` compiling cleanly with `/portfolio` as dynamic SSR route.

### 6.2 Browser QA Screenshots
- Desktop Portfolio Command Center: `desktop_portfolio_view.png`
- Mobile Responsive View: `mobile_portfolio_view.png`
- Browser Session Recording: `portfolio_v1_qa_1789204301479.webp`

---

## 7. Protected Boundaries & Deployment Confirmation

- `wattwise-laravel/**`: **Zero files modified** (confirmed read-only).
- `wattwise-vercel/**`: All changes and additions reside exclusively in the Next.js runtime.
- No ML forecasting models modified or retrained.
- No revenue / omzet / financial margin metrics added to Portfolio V1.
- No production database or production DNS modified.
- **No production deployment performed** (distinct from automatic ephemeral Vercel preview builds triggered on PR pushes; production remains untouched).
- Draft PR #26 remains in DRAFT status.
