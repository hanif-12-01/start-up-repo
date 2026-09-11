# IT-P0-09: Multi-Location Portfolio Command Center

**Product Stage:** Pre-Seed / Working MVP Validation  
**Implementation Target:** `wattwise-vercel/` (Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Neon/PostgreSQL via Drizzle ORM, Better Auth)  
**Reference Target:** `wattwise-laravel/` (Read-only historical reference — untouched)  
**Primary Route:** `GET /portfolio`

---

## 1. User Problem & Context

Many Indonesian UMKM and multi-unit operators (juragan kos, laundry franchise owners, F&B multi-branch owners, cold-storage operators) manage between 2 and 50+ locations. Previously, the active Next.js application required owners to manually toggle between individual business locations using URL parameters or dropdown menus.

This created high cognitive friction and violated the primary operational need of multi-unit owners: **Manage by Exception**. Owners should not need to inspect every healthy location every day. Instead, they need a two-level command hierarchy:
1. **Level 1 — Portfolio (`GET /portfolio`):** *"Lokasi mana yang perlu saya perhatikan?"* (Command center overview to identify problems across all locations).
2. **Level 2 — Location (`GET /dashboard?businessId=...`):** *"Kenapa lokasi ini perlu diperhatikan?"* (Preserved individual business dashboard for detailed diagnostic investigation).

---

## 2. PRD Justification & Product Principles

Sourced directly from [`docs/PRD/WattWise_PRD_Current_Validation_Stage.md`](../PRD/WattWise_PRD_Current_Validation_Stage.md):
- **Core Principle:**
  > *"Portfolio Dashboard untuk mengetahui DI MANA masalahnya. Dashboard Lokasi untuk memahami KENAPA lokasi itu perlu diperiksa."*
- **Decision Support, Not Mechanical Certainty:** WattWise is a decision-support SaaS. It never claims confirmed equipment failure, electrical leakage, fraud, or official PLN data. All copy uses safe wording: *Aman*, *Perlu Dicek*, *Perlu Perhatian*, and *Data Belum Lengkap*.
- **Preserve Location Dashboard:** The existing individual business dashboard is fully retained and functional as the Level 2 investigation surface.

```mermaid
flowchart TD
    User([Authenticated User]) -->|GET /portfolio?month=YYYY-MM| Page[src/app/(product)/portfolio/page.tsx]
    Page -->|Session Check & Ownership| Service[src/server/services/portfolio.service.ts]
    Service -->|Count < 2| RedirectDashboard[Redirect to /dashboard]
    Service -->|Count >= 2| Drizzle[Drizzle ORM Batch Queries]
    Drizzle -->|Load Active Businesses| DB[(PostgreSQL / Neon)]
    Drizzle -->|Load Electricity Bills in Window| DB
    Drizzle -->|Load Revenue Entries in Window| DB
    Service -->|Authoritative Anomaly Rules & MoM Population Matching| DTO[PortfolioOverview Read Model]
    Page --> UI[React Server / Client Components]
    UI --> Summary[PortfolioSummary]
    UI --> Health[PortfolioHealth]
    UI --> Attention[PortfolioAttentionList]
    UI --> Trend[PortfolioTrend]
    UI --> Locations[PortfolioLocationList]
    Locations -->|Click 'Lihat Lokasi' -> /dashboard?businessId=...| Dashboard[Existing Location Dashboard]
```

---

## 3. Active Next.js Architecture

The multi-location portfolio command center is implemented natively in `wattwise-vercel/`:

```
wattwise-vercel/
├── src/
│   ├── app/
│   │   └── (product)/
│   │       ├── layout.tsx                     # Passes active business count to ProductShell
│   │       └── portfolio/
│   │           ├── page.tsx                   # Server Component for GET /portfolio
│   │           └── loading.tsx                # Skeleton loading state
│   ├── components/
│   │   ├── product/
│   │   │   └── ProductShell.tsx               # Renders "Semua Usaha" & "Lokasi Aktif" when businessCount >= 2
│   │   └── portfolio/
│   │       ├── PortfolioSummary.tsx           # KPI cards with data coverage disclosure
│   │       ├── PortfolioHealth.tsx            # "Kondisi Semua Usaha" status banner
│   │       ├── PortfolioAttentionList.tsx     # "Yang Perlu Anda Perhatikan" exception stream
│   │       ├── PortfolioTrend.tsx             # 6-month historical trend chart with coverage tooltips
│   │       ├── PortfolioLocationList.tsx      # Interactive desktop table & mobile stacked cards with filters
│   │       └── PortfolioFilters.tsx           # Calendar month selector (?month=YYYY-MM)
│   └── server/
│       └── services/
│           ├── portfolio.service.ts           # Read model aggregation, MoM matching, and anomaly evaluation
│           └── public-demo-provisioning.service.ts # 4 deterministic demo businesses
└── tests/
    └── unit/
        └── portfolio.test.ts                  # 16 unit tests covering domain rules, thresholds, and coverage
```

---

## 4. Route & Navigation Flow

### Route Contract
- **Endpoint:** `GET /portfolio`
- **Route Handler:** `src/app/(product)/portfolio/page.tsx`
- **Authentication:** Better Auth session via `getOptionalSession()`. Unauthenticated requests redirect to `/login`.
- **Query Parameter:** `?month=YYYY-MM` (optional, defaults to latest recorded calendar month or current month).

### Single vs. Multi-Business Behavior
1. **0 Active Businesses:**
   - Captured by `resolveJourneyStep(userId)` $\rightarrow$ Redirects to `/onboarding`.
2. **1 Active Business:**
   - `GET /portfolio` safely redirects to `/dashboard` (`302`).
   - Sidebar displays standard single-location navigation ("Ringkasan" $\rightarrow$ `/dashboard`).
3. **$\ge 2$ Active Businesses:**
   - `GET /portfolio` renders the Portfolio Command Center.
   - Sidebar displays grouped navigation under **RINGKASAN**:
     - **Semua Usaha** $\rightarrow$ `/portfolio`
     - **Lokasi Aktif** $\rightarrow$ `/dashboard`

---

## 5. Aggregation, Coverage, & MoM Comparison Rules

### Synchronized Calendar Month
- Comparison across locations is strictly synchronized to the **same calendar month** (`YYYY-MM`).
- WattWise never mixes disparate months (e.g. Location A in July + Location B in August) into a single aggregate total.

### Visible Data Coverage & Zero Fabrication
- **Rule:** Missing data is **never** fabricated as zero consumption (`0 kWh != missing record`).
- Every aggregate metric and chart tooltip discloses exact coverage:
  - `activeLocations`: Total active businesses owned by the user.
  - `locationsWithElectricity`: Locations with recorded electricity for the selected month.
  - `locationsWithRevenue`: Locations with recorded revenue for the selected month.
  - `electricityCoveragePercent`: `(locationsWithElectricity / activeLocations) * 100`
  - `revenueCoveragePercent`: `(locationsWithRevenue / activeLocations) * 100`

### Electricity Cost Resolution
Following existing WattWise business logic:
1. Prefer `bill.totalAmountRupiah`.
2. Fallback only if `kwh` is missing but `tariffRupiahPerKwh > 0`: `totalAmountRupiah / tariffRupiahPerKwh`.

### Month-over-Month (MoM) Comparison Rules
- Compares the selected month (`YYYY-MM`) with the previous calendar month (`YYYY-(MM-1)`).
- **Population Integrity:** MoM delta percentage is calculated **strictly on the subset of locations that have valid data in both months** (`comparableLocationCount`).
- If population coverage differs between months, the interface explicitly notes:
  *"Perbandingan berdasarkan X lokasi dengan data lengkap di dua bulan."*

---

## 6. Location Health & Safe Wording Mapping

To ensure strict alignment with core anomaly detection without duplicating magic numbers, `portfolio.service.ts` references authoritative thresholds from `product-analysis.ts`:
- `THRES_BOROS = 20.0` ($\ge 20\%$ increase vs historical baseline)
- `THRES_DICEK = 10.0` ($10\% - 19.9\%$ increase vs historical baseline)

### User-Facing Safe Wording Matrix
| Internal Anomaly Status | Portfolio Label | Description / Safe Reason | Badge Style |
| :--- | :--- | :--- | :--- |
| `Normal` | **Aman** | *"Pemakaian masih berada dalam pola yang wajar berdasarkan data yang tersedia."* | Emerald / Green |
| `Perlu Dicek` | **Perlu Dicek** | *"Pemakaian meningkat dibanding pola sebelumnya. Ada baiknya lokasi ini diperiksa."* | Amber / Yellow |
| `Boros` | **Perlu Perhatian** | *"Pemakaian meningkat cukup besar dibanding pola sebelumnya."* | Rose / Red |
| No Data / Null Entry | **Data Belum Lengkap** | *"Data bulan ini belum cukup untuk menilai kondisi lokasi."* | Slate / Gray |

*Disclaimer included on all portfolio views:*  
> *"Indikasi ini berdasarkan data yang dicatat di WattWise dan bukan diagnosis teknis instalasi listrik."*

---

## 7. "Yang Perlu Anda Perhatikan" Exception Engine

The command center features an exception stream limited to a maximum of 5 cards, sorted strictly by urgency:
1. **Priority 1:** `Perlu Perhatian` (highest positive electricity cost delta / percentage first)
2. **Priority 2:** `Perlu Dicek` (highest positive electricity cost delta / percentage first)
3. **Priority 3:** `Data Belum Lengkap` (missing electricity entry for selected month)
4. *Normal / Aman locations are completely excluded from this section.*

Each exception card includes:
- Location name, business type, and city (if set).
- Simple status badge.
- Plain-language reason and quantified impact (e.g. `+Rp420.000 (+22%)`).
- Cost vs. Revenue context (e.g. *"Biaya listrik naik lebih cepat daripada pendapatan"*).
- Direct drill-down action CTA: **[Lihat Lokasi]** or **[Lengkapi Data]** linking to `/dashboard?businessId=...`.

---

## 8. Drill-Down Flow (Level 1 $\rightarrow$ Level 2)

When an owner clicks **"Lihat Lokasi"** from any card or table row:
1. The user navigates to `/dashboard?businessId=[id]`.
2. `dashboard.service.ts` loads the requested business with strict ownership validation (`business.userId === session.user.id`).
3. User lands on the existing individual business dashboard for detailed diagnostic investigation (appliances, forecasts, recommendations, action plans).

---

## 9. Performance & Query Strategy

`portfolio.service.ts` uses batched Drizzle queries with `inArray`:
1. `SELECT * FROM business WHERE user_id = $userId AND is_active = true AND archived_at IS NULL`
2. `SELECT * FROM electricity_bill WHERE business_id IN ($ids)`
3. `SELECT * FROM revenue_entry WHERE business_id IN ($ids)`

All aggregations, MoM deltas, anomaly evaluations, and 6-month historical trend calculations are performed on the eagerly loaded collection in-memory. Total query complexity is strictly $O(1)$ database trips, performing seamlessly for 50+ businesses.

---

## 10. Demo Provisioning Updates

[`public-demo-provisioning.service.ts`](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/wattwise-vercel/src/server/services/public-demo-provisioning.service.ts) was enhanced to seed 4 realistic multi-location demo businesses:
1. **DEMO 01** (FNB, Bandung): Moderate increase ~11% $\rightarrow$ `Perlu Dicek`
2. **DEMO 02** (LAUNDRY, Surabaya): Latest month spike +22% $\rightarrow$ `Perlu Perhatian`
3. **DEMO 03** (KOS, Jakarta Selatan): Stable continuous 6-month history $\rightarrow$ `Aman` (N-BEATS AI active)
4. **DEMO 04** (COLD_STORAGE, Semarang): 3 historical months, skipping current month $\rightarrow$ `Data Belum Lengkap`

---

## 11. Verification & Test Evidence

### Unit Tests
File: [`wattwise-vercel/tests/unit/portfolio.test.ts`](file:///d:/LOMBA/MVP%20PROTOTIPE%20start-up/wattwise-vercel/tests/unit/portfolio.test.ts)
- Calendar & month utilities across year boundaries
- Electricity usage & cost fallback calculations
- Anomaly status mapping and threshold parity (`THRES_BOROS = 20.0`, `THRES_DICEK = 10.0`)
- Summary aggregation & visible data coverage (missing data never treated as zero)
- MoM comparison strictly evaluating comparable populations
- Attention items ordering (Perlu Perhatian > Perlu Dicek > Data Belum Lengkap), max 5 cap, and exclusion of Aman locations
- 6-month historical trend coverage preservation
- Full location processing pipeline integration

**Test Results:**
```
PASS  tests/unit/portfolio.test.ts
✓ Calendar & Month Utilities (3 tests)
✓ Electricity Usage & Cost Resolution (3 tests)
✓ Health Status Mapping & Authoritative Thresholds (4 tests)
✓ Summary Aggregation & Visible Data Coverage (1 test)
✓ Month-over-Month Comparison (Comparable Population Only) (1 test)
✓ Attention Items Ordering & Capping (2 tests)
✓ Historical 6-Month Trend (1 test)
✓ Health Summary Counts (1 test)
✓ Full Location Processing Pipeline (processLocations) (1 test)

Tests: 16 passed (16)
Total Vitest Unit Suite: 34 files passed, 446 tests passed
```

### TypeScript & Linting
- `npm run typecheck` (`tsc --noEmit`): 0 errors
- `npm run lint` (`eslint .`): 0 errors, 0 warnings
- `npm run build` (`next build`): Compiled `/portfolio` route successfully

---

## 12. Known Limitations & Follow-Ups
1. **Centralized Post-Login Redirect:** In accordance with Section 5, default post-login redirect remains unchanged to preserve Better Auth contracts. Multi-location users access `/portfolio` directly from the top of the sidebar.
2. **Date Filters:** MVP supports single-month selection (`?month=YYYY-MM`). Custom arbitrary date-range filtering is out of scope for MVP.
