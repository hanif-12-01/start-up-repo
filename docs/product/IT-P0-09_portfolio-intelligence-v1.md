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
4. Transparent data coverage disclosure (`activeBusinessCount`, `businessesWithElectricityData`, `electricityCoveragePercent`). Missing records are never fabricated as zero (`0 kWh != missing record`).
5. Reused authoritative location health classification (`analyzeLatestAnomaly` thresholds: `THRES_BOROS = 20.0`, `THRES_DICEK = 10.0`).
6. Owner-friendly health status mapping (`Normal` → `AMAN`, `Perlu Dicek` → `PERLU DICEK`, `Boros` → `PERLU PERHATIAN`, `Data belum cukup` / missing selected-month data → `DATA BELUM LENGKAP`).
7. Completely separate trend movement direction (`Naik` > +2.0%, `Stabil` -2.0% to +2.0%, `Turun` < -2.0%).
8. "Kondisi Semua Usaha" status banner with safe, non-alarmist narrative (no black-box AI scores).
9. "Yang Perlu Anda Perhatikan" prioritized exception stream (max 5 items, excluding Aman locations).
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

### 4.2 Data Query Strategy (O(1) Batched Queries)
To support 50+ locations without N+1 query bottlenecks:
1. Query active businesses owned by user in 1 query.
2. Extract `businessIds = businesses.map(b => b.id)`.
3. Fetch all electricity bills for these businesses using `inArray(schema.electricityBill.businessId, businessIds)` in 1 batched query.
4. In-memory grouping by `businessId` via `Map<string, BillDataLike[]>`.
5. Pure mathematical aggregation and status mapping.

### 4.3 Same-Month Aggregation & Fallback Semantics
- If `?month=YYYY-MM` is provided, it is validated and applied.
- If omitted, default selected month is the latest calendar month with electricity data for at least one active owned business.
- Month metrics aggregate **only** bills where `periodEnd.slice(0, 7) === selectedMonth`. Bills from other months are never summed into the selected month total.

### 4.4 Comparable Month-over-Month (MoM) Population
When calculating percentage and absolute changes vs. previous month:
- A business is considered comparable **only** if it has valid data in **both** `selectedMonth` and `previousMonth`.
- `comparableBusinessCount` is explicitly disclosed in the UI (`Berdasarkan X dari Y lokasi yang sebanding`).
- Non-comparable locations are excluded from the denominator to prevent distorted percentages.

### 4.5 Top Contributors to Electricity Increase (Section 17)
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

### 6.1 Automated Unit Tests (`vitest run tests/unit/portfolio.test.ts`)
18 unit tests passing with 100% coverage of portfolio core logic:
- `deriveTrendDirection`: verifies Naik (>2%), Turun (<-2%), Stabil (-2% to 2%), and null handling.
- `processSingleLocation`: verifies Aman, Perlu Dicek, Perlu Perhatian, and Data Belum Lengkap mappings.
- `calculateSummary`: verifies active locations count, reporting locations count, coverage %, and null fallback when no data exists.
- `calculateComparison`: verifies strict comparable population matching and null handling for zero-comparable sets.
- `calculateHealth`: verifies status breakdown and safe narrative generation.
- `buildAttentionItems`: verifies prioritization (Perlu Perhatian > Perlu Dicek > Data Belum Lengkap), exclusion of Aman, and cap of 5 items.
- `buildTopIncreaseContributors`: verifies absolute kWh increases, contribution percentages, and exclusion of decreasing locations.
- `buildTrend`: verifies 6-month historical trend point generation with reporting count metadata.

**Full Repository Suite Results:**
- `npm test`: **34 test files passed (448 tests)**
- `npm run typecheck`: **0 errors**
- `npm run lint`: **0 errors, 0 warnings**
- `npm run build`: **Next.js 16.2.11 production build compiled cleanly (`/portfolio` registered as dynamic SSR route)**

### 6.2 Browser QA Screenshots
- Desktop Portfolio Command Center: `desktop_portfolio_view.png`
- Mobile Responsive View: `mobile_portfolio_view.png`
- Browser Session Recording: `portfolio_v1_qa_1789204301479.webp`

---

## 7. Protected Boundaries Confirmation

- `wattwise-laravel/**`: **Zero files modified**.
- `wattwise-vercel/**`: All changes and additions reside exclusively in the Next.js runtime.
- No ML forecasting models modified or retrained.
- No production database or DNS modified.
- No deployment performed.
