# Claude Opus Master Prompt — WattWise AI MVP Tahap 2

You are Claude Opus working inside an existing fullstack project called **WattWise AI**.

Your job is to continue the existing project into **MVP Tahap 2**.

## CRITICAL FIRST STEP — READ THE GUIDEBOOK BEFORE CODING

Before you inspect, edit, refactor, generate, migrate, or run any implementation work, you MUST first read the project guidebook:

```txt
docs/WattWise_AI_MVP_Guidebook.md
```

If the guidebook is not located there, search for a file with a similar name, for example:

```txt
WattWise_AI_MVP_Guidebook.md
WattWise_AI_MVP_Guidebook_Revised.md
```

You must treat the guidebook as the **primary source of truth** for this project.

Before making code changes, explicitly confirm in your own working summary that you have read and understood the guidebook sections covering:

1. Product identity and MVP goals
2. Stack and architecture rules
3. Prisma and database rules
4. Auth and routing rules
5. Active business rules
6. MVP 2 roadmap
7. AI agent workflow
8. Engineering guardrails
9. Demo safety checklist

If you cannot find or read the guidebook, STOP and ask the user to provide it. Do not start programming without reading it.

---

## Non-Negotiable Project Rules

Follow these rules throughout the entire session:

- Do not rewrite the project from scratch.
- Do not change the tech stack.
- Do not move away from Next.js 14 App Router.
- Do not move away from TypeScript.
- Do not move away from Tailwind CSS.
- Do not move away from Prisma.
- Do not move away from Supabase PostgreSQL.
- Do not move to MySQL.
- Do not use `supabase-js` for core data access.
- Do not use `localStorage` or mock data for core MVP data.
- Do not add external AI APIs for MVP 2.
- Do not add real IoT integration.
- Do not add official PLN API integration.
- Do not add payment gateway integration.
- Do not add real WhatsApp API integration.
- Do not remove `directUrl` from `prisma/schema.prisma`.
- Do not rename existing Prisma fields without a clear migration reason.
- Prefer additive schema changes over destructive changes.
- Preserve existing UI and improve incrementally.
- Keep all user-facing UI copy in Bahasa Indonesia.
- Keep all predictions, reports, recommendations, and simulations clearly framed as estimates.
- Never claim that WattWise AI is officially connected to PLN.
- Never claim the app reads smart meters in real time.
- Never expose real credentials in README, UI, seed output, logs, or example files.

The Prisma datasource must remain like this:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Existing Project Context

WattWise AI is a prototype/fullstack MVP for Indonesian UMKM.

Product name:

```txt
WattWise AI
```

Tagline:

```txt
Listrik Lebih Cerdas, Biaya Lebih Terkendali
```

Target users:

- Laundry
- Frozen food
- Minimarket
- F&B / warung / cafe
- Fotokopi
- Barbershop
- Bengkel
- Kos / penginapan
- Manufaktur kecil

MVP Tahap 1 is already considered complete.

Existing MVP 1 features:

- Register
- Login
- Logout
- Protected dashboard
- Business onboarding/profile
- Manual electricity input saved to database
- Database-powered dashboard
- Bill prediction
- Anomaly detection
- Recommendations
- Monthly report preview
- PDF report download

MVP 2 must make the app more:

- Personal
- Smart
- Stable
- Realistic
- Demo-ready

---

## Current Tech Stack

Use and preserve this stack:

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- lucide-react
- Recharts
- Prisma 5.22.0
- Supabase PostgreSQL
- NextAuth / Auth.js v4 Credentials Provider
- bcryptjs
- zod
- react-hook-form
- pdfkit

Architecture:

```txt
User
→ Next.js App
→ Server Actions / API Routes
→ Service Layer
→ Prisma
→ Supabase PostgreSQL
```

---

## Auth Context

The app uses NextAuth Credentials Provider.

Demo login must keep working:

```txt
Email: owner@wattwise.id
Password: password123
```

Important:

- This is the app login password.
- This is not the Supabase database password.
- Test demo login after major changes.

Protected routes:

```txt
/dashboard/*
/onboarding/*
```

Middleware behavior:

- If authenticated user has no business and accesses `/dashboard`, redirect to `/onboarding`.
- If authenticated user already has business and accesses `/onboarding`, redirect to `/dashboard`.

---

## Routing Rules

The app uses Next.js route groups.

Dashboard folder:

```txt
src/app/(dashboard)/dashboard
```

User-facing URL:

```txt
/dashboard
```

Never use this as a URL:

```txt
/(dashboard)/dashboard
```

New dashboard features must be placed under:

```txt
src/app/(dashboard)/dashboard/<feature>/page.tsx
```

Examples:

```txt
/dashboard/peralatan
→ src/app/(dashboard)/dashboard/peralatan/page.tsx

/dashboard/simulasi
→ src/app/(dashboard)/dashboard/simulasi/page.tsx

/dashboard/notifikasi
→ src/app/(dashboard)/dashboard/notifikasi/page.tsx

/dashboard/demo-control
→ src/app/(dashboard)/dashboard/demo-control/page.tsx
```

---

## Required Active Business Rule

MVP 2 must use one consistent active business flow.

Use this cookie name:

```txt
wattwise_active_business_id
```

Rules:

- Store only the active `businessId` in the cookie.
- Do not store full business objects in cookies.
- Do not use localStorage for active business.
- Validate business ownership server-side every time.
- If the cookie is missing, invalid, or belongs to another user, fallback to the first business owned by the user.
- If the user has no business, redirect to `/onboarding`.
- Do not duplicate active business logic in every page.
- Use one shared resolver/helper/service for active business.
- All dashboard queries must be scoped by the active business ID.

Suggested helper:

```ts
getActiveBusinessForUser(userId)
```

or equivalent based on the existing codebase.

---

## Mandatory AI Agent Workflow

For every implementation phase:

1. Read the guidebook first.
2. Inspect relevant existing files before editing.
3. Summarize the existing structure you found.
4. Propose a minimal implementation plan.
5. Implement incrementally.
6. Reuse existing components, services, styles, and patterns.
7. Avoid unrelated file changes.
8. Update Prisma schema only when necessary.
9. Before changing Prisma schema, inspect `prisma/schema.prisma`.
10. Do not duplicate existing models or fields.
11. Update seed only when needed.
12. Keep UI copy in Bahasa Indonesia.
13. Add loading, empty, and error states.
14. Keep all estimates/disclaimers safe.
15. Run or provide exact commands for:
    - `npm run lint`
    - `npx prisma generate`
    - `npx prisma migrate dev`
    - `npx prisma db seed`
16. Test or instruct testing for:
    - demo login
    - business switcher
    - dashboard data scoping
    - pages affected by the current step
17. Stop after each major step and summarize:
    - changed files
    - schema changes
    - migration commands
    - test results
    - remaining risks
    - next recommended step

Do not continue into the next phase automatically unless explicitly asked.

---

# MVP Tahap 2 Master Plan

The current priority is MVP Tahap 2.

Recommended implementation order:

1. Business Switcher + Multi-business Flow
2. Appliance-level Estimation
3. Appliance-based Recommendation Engine
4. Analysis Engine V2
5. Scenario Simulator
6. Report History
7. Notification Center
8. Data Quality Check
9. CSV Export
10. Demo Scenario Control
11. UI Polish + README Update

If Step 1 is already completed, verify it first before starting Step 2.

---

## Step 1 — Verify Business Switcher + Multi-business Flow

Do this even if the user says Step 1 is done.

### Goal

Ensure the app has a stable active business system.

### Requirements

- User can own multiple businesses.
- User can select active business.
- Dashboard data changes based on active business.
- Manual electricity input is saved to active business.
- Predictions, anomalies, recommendations, and reports use active business.
- Active business is stored in server-side cookie.
- Cookie name must be:

```txt
wattwise_active_business_id
```

- Ownership must be validated server-side.
- Invalid business ID must fallback safely.
- User with no business must redirect to `/onboarding`.

### Acceptance Criteria

- Login demo works.
- Business switcher appears.
- Switching between `Laundry Berkah` and `Frozen Jaya Purwokerto` changes dashboard data.
- No core data comes from mock/localStorage.
- No unauthorized business can be selected.

Stop and summarize before proceeding.

---

## Step 2 — Appliance-level Estimation

### Goal

Add appliance management per active business so UMKM owners can estimate electricity usage by equipment.

### Requirements

- Use active business resolver from Step 1.
- Inspect existing Prisma schema first.
- If an `Appliance` model exists, reuse it.
- Do not duplicate fields with different names.
- If schema has `powerWatt`, use it.
- If schema has `dailyUsageHours`, use it.
- Add missing fields only if needed:
  - `category`
  - `daysPerMonth`
  - `isAlwaysOn`

### Formula

```txt
monthlyKwh = watt × quantity × hoursPerDay × daysPerMonth / 1000
monthlyCost = monthlyKwh × tariffPerKwh
```

Use project field names consistently.

### Route

```txt
/dashboard/peralatan
```

File location:

```txt
src/app/(dashboard)/dashboard/peralatan/page.tsx
```

### Features

- List appliances for active business.
- Add appliance.
- Edit appliance.
- Delete appliance.
- Show total estimated kWh/month.
- Show total estimated cost/month.
- Show most wasteful/highest-usage appliance.
- Add empty state in Bahasa Indonesia.
- Add validation with zod/react-hook-form if consistent with the project.

### Suggested UI Copy

```txt
Belum ada data peralatan. Tambahkan alat listrik untuk menghitung estimasi pemakaian.
```

### Acceptance Criteria

- User can manage appliances per active business.
- Switching business shows different appliances.
- Estimation updates correctly.
- Invalid watt/hour/day inputs are rejected.
- Data is stored through Prisma and Supabase PostgreSQL.
- No localStorage/mock data is used for core data.

Stop and summarize before proceeding.

---

## Step 3 — Appliance-based Recommendation Engine

### Goal

Make recommendations more personal by using business type, monthly electricity records, and appliance estimates.

### Requirements

- Keep the engine rule-based and deterministic.
- Do not use external AI APIs.
- Generate recommendations per active business.
- Use appliance data if available.
- Use business type/category if available.
- Preserve existing recommendation UI where possible.

### Suggested service

```txt
src/services/recommendation-engine.ts
```

or use the existing service structure if different.

### Recommendation Output

Each recommendation should include:

- `title`
- `priority`: Tinggi, Sedang, Rendah
- `estimatedSaving`
- `difficulty`: Mudah, Sedang, Sulit
- `impact`: Rendah, Sedang, Tinggi
- `reason`
- `practicalSteps`

### Business-specific Rules

Laundry:

- Dryer high usage → optimize drying batch or reduce daily usage.
- Iron high usage → schedule batch ironing.
- Water pump high usage → check leaks or operating schedule.
- Lighting high usage → switch to LED.

Frozen food:

- Freezer 24 hours → check door seal, temperature, stock layout.
- Showcase chiller high usage → reduce unnecessary opening.
- Freezer temperature too low → adjust temperature.
- Lighting high usage → switch to LED.

F&B / warung / cafe:

- Refrigerator/freezer high usage → check placement and door opening frequency.
- Rice cooker high usage → optimize warm mode duration.
- Lighting/fan/AC high usage → schedule usage.

Minimarket:

- Chiller/freezer high usage → inspect seals and temperature.
- Lighting high usage → LED and zone-based lighting.
- AC high usage → temperature and operating schedule.

### Acceptance Criteria

- Laundry and Frozen Food get different recommendations.
- Recommendations include estimated savings and practical steps.
- Recommendations are scoped by active business.
- Savings include disclaimer that they are estimates.

Stop and summarize before proceeding.

---

## Step 4 — Analysis Engine V2

### Goal

Improve the existing rule-based analysis engine.

### Requirements

- Keep deterministic/rule-based analysis.
- Do not use external AI APIs.
- Analyze data per active business.
- Use monthly electricity records.
- Use appliance data if available.
- Work safely with limited data.

### Suggested service

```txt
src/services/analysis-v2.ts
```

or integrate with existing analysis service if one already exists.

### Analysis Must Compare

- Current month vs previous month
- Current month vs last 3 months average
- Cost vs kWh consistency
- Total electricity usage vs appliance estimates

### Output

- `currentKwh`
- `currentCost`
- `previousMonthComparison`
- `threeMonthAverageComparison`
- `anomalies`
- `energyScore`
- `status`
- `insights`
- `disclaimer`

### Status Values

Use Bahasa Indonesia:

- Efisien
- Normal
- Perlu Dicek
- Boros

### Rules

- If kWh increases more than 15% vs last 3-month average → `Perlu Dicek`.
- If kWh increases more than 30% → `Boros`.
- If cost increases more than 20% while kWh increases less than 5% → add warning about tariff, additional cost, or input error.
- If one appliance contributes a large share of estimated usage → add appliance insight.
- Penalize energy score for anomaly severity.

### Acceptance Criteria

- Analysis changes when active business changes.
- Analysis works with limited data.
- Proper empty states appear.
- Existing MVP 1 dashboard/prediction/anomaly pages still work.
- All analysis disclaimers remain safe.

Stop and summarize before proceeding.

---

## Step 5 — Scenario Simulator

### Goal

Add a simulation page where users can estimate savings without modifying original data.

### Route

```txt
/dashboard/simulasi
```

File location:

```txt
src/app/(dashboard)/dashboard/simulasi/page.tsx
```

### Scenario Types

- Reduce appliance usage hours.
- Replace appliance with lower wattage/inverter.
- Target saving percentage.
- Service freezer/AC efficiency improvement.

### Output

- Estimated kWh saved/month.
- Estimated Rupiah saved/month.
- Affected appliance.
- Practical explanation in Bahasa Indonesia.
- Disclaimer that results are estimates.

### Rules

- Use active business.
- Use appliance data.
- Do not modify actual records.
- Do not persist simulation unless a suitable model already exists and user explicitly asks.

### Acceptance Criteria

- User can run simulation for active business.
- Results do not alter actual electricity records.
- Switching business changes available appliances.
- Empty state appears if no appliance data exists.

Stop and summarize before proceeding.

---

## Step 6 — Report History

### Goal

Allow users to see, filter, regenerate, and download previous monthly reports per active business.

### Requirements

- Inspect existing report and PDF implementation first.
- Reuse existing report/PDF logic where possible.
- Add or update `MonthlyReport` only if needed.
- Reports must be scoped by `businessId`.

### Suggested Unique Constraint

Use if compatible with existing schema:

```prisma
@@unique([businessId, year, month])
```

### Features

- List reports by month/year.
- Filter by year.
- Show status.
- Show total kWh.
- Show total cost.
- Show energy score.
- Regenerate report if needed.
- Download PDF again.
- Include disclaimer in report/PDF.

### Acceptance Criteria

- Reports are separated per active business.
- User can download previous reports.
- Switching business changes report history.
- No official PLN claim appears.

Stop and summarize before proceeding.

---

## Step 7 — Notification Center

### Goal

Add simple in-app notifications.

### Requirements

- No email integration.
- No WhatsApp integration.
- No push notification integration.
- Store notifications in PostgreSQL through Prisma.

### Model Concept

If no equivalent model exists:

```prisma
model Notification {
  id         String   @id @default(uuid())
  userId     String
  businessId String?
  title      String
  message    String
  type       String
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

Add relations to `User` and `Business` if consistent with current schema.

### Service Functions

- `createNotification`
- `getUserNotifications`
- `markNotificationAsRead`
- `markAllNotificationsAsRead`

### Notification Types

- Missing current month input.
- Usage spike detected.
- Predicted bill increase.
- New recommendation available.
- Monthly report ready.

### UI

- Notification bell in dashboard header/sidebar.
- Notification list page:

```txt
/dashboard/notifikasi
```

### Acceptance Criteria

- Notifications are stored through Prisma.
- User can mark notifications as read.
- Notifications are scoped to logged-in user.
- Business-specific notifications use active business when relevant.

Stop and summarize before proceeding.

---

## Step 8 — Data Quality Check

### Goal

Make manual electricity input safer and more realistic.

### Requirements

- Update manual electricity input flow.
- Use active business.
- Use zod for blocking validation where appropriate.
- Use service-layer checks for historical comparison.
- Warnings should be Bahasa Indonesia.

### Rules

Blocking:

- Duplicate month/year for the same business.

Warnings:

- kWh too low but cost very high.
- kWh very high but cost too low.
- Usage increases more than 50% from previous month.
- Skipped month.

### Suggested Warning Copy

```txt
Tagihan terlihat tidak wajar untuk jumlah kWh tersebut. Mohon cek ulang nominal Rupiah atau kWh yang dimasukkan.
```

### Acceptance Criteria

- Duplicate month input is blocked.
- Suspicious input shows clear warning.
- Normal input still works.
- Records are saved to active business.

Stop and summarize before proceeding.

---

## Step 9 — CSV Export

### Goal

Allow UMKM owners, mentors, or judges to export simple business data.

### Requirements

- Use active business.
- Export only data belonging to active business.
- Use proper CSV escaping.
- CSV is enough. Do not add Excel dependency unless already present.

### Export Targets

- Electricity records.
- Recommendations.
- Monthly reports.

### Suggested Routes

Use the existing route/action pattern. Possible routes:

```txt
/api/export/electricity-records
/api/export/recommendations
/api/export/reports
```

### UI Buttons

Use Bahasa Indonesia:

```txt
Export Riwayat Tagihan
Export Rekomendasi
Export Laporan
```

### Acceptance Criteria

- Downloads valid CSV.
- Export changes when active business changes.
- No private data from other businesses is included.

Stop and summarize before proceeding.

---

## Step 10 — Demo Scenario Control

### Goal

Make startup competition demos easy to reset and prepare.

### Route

```txt
/dashboard/demo-control
```

### Requirements

- Restrict access to demo account or admin flag.
- Do not expose this page to normal users unless explicitly allowed.
- Store demo data in PostgreSQL through Prisma.
- Do not use localStorage/mock data.
- Keep seed safe.
- Do not expose credentials.

### Scenario Buttons

- Reset demo data.
- Generate Laundry normal scenario.
- Generate Laundry wasteful dryer scenario.
- Generate Frozen Food wasteful freezer scenario.
- Generate improved/efficient scenario after recommendations.

### Acceptance Criteria

- Demo account can reset scenarios.
- Generated scenarios affect dashboard, analysis, recommendations, and report.
- Non-demo users cannot access control page.

Stop and summarize before proceeding.

---

## Step 11 — UI Polish + README Update

### Goal

Make MVP 2 clean, demo-ready, and understandable.

### UI Polish

- Consistent spacing.
- Bahasa Indonesia copy.
- Empty states.
- Loading states.
- Error states.
- Clear disclaimers.
- No raw technical errors shown to users.
- No 404 on main demo flow.

### README Must Include

- Product name
- Tagline
- Problem statement
- Target users
- Tech stack
- Architecture
- MVP 1 features
- MVP 2 features
- Limitations/disclaimer
- Setup local
- Environment variables placeholders
- Prisma migration command
- Seed command
- Demo account
- Demo flow
- Note that there is no official PLN/IoT/AMI integration yet

### Acceptance Criteria

- README is updated.
- Demo flow is documented.
- User-facing pages are stable.
- No real credentials are committed.

Stop and summarize.

---

# Final Definition of Done

MVP 2 is complete only when:

- Business switcher is stable.
- All dashboard pages are scoped by active business.
- Appliances can be managed and estimated.
- Recommendations use business type and appliance data.
- Analysis Engine V2 works.
- Scenario simulator works.
- Report history works.
- Notification center works.
- Data quality checks work.
- CSV export works.
- Demo scenario control works.
- UI remains Bahasa Indonesia.
- Disclaimers are present.
- No core data uses mock/localStorage.
- No official PLN integration is claimed.
- Demo login works.
- Prisma migration works.
- README is updated.
- Guidebook remains the source of truth.

---

# Required Response Format After Each Step

After each implementation step, respond with:

```txt
## Step Completed: [Step Name]

### Guidebook Compliance
- Confirmed guidebook was read before coding: Yes
- Relevant guidebook sections followed:
  - ...

### Changed Files
- ...

### Database / Prisma Changes
- ...

### Commands Run
- ...

### Test Results
- ...

### Risks / Notes
- ...

### Next Recommended Step
- ...
```

If you did not read the guidebook, do not code. Stop and read it first.
