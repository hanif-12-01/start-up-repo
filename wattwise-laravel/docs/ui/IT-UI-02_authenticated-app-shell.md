# IT-UI-02: Authenticated App Shell Refresh

## Design Objective

Redesign the authenticated WattWise interface to:
- Use WattWise branding consistently (not Laravel defaults)
- Clearly separate sidebar, top bar, and page content
- Match the landing page's color palette and visual identity
- Be understandable to boarding-house and small-business owners with low technical literacy
- Remain responsive, accessible, and consistent across all authenticated pages

## Target Users

- Boarding-house owners (kos)
- Laundry operators
- F&B businesses
- Retail shop owners
- Small property managers
- Users with limited technical, accounting, or software knowledge

## Authenticated Shell Structure

```
+----------------------+--------------------------------------+
| SIDEBAR              | TOP BAR (sticky, backdrop-blur)      |
| (dark navy bg)       +--------------------------------------+
|                      | MAIN PAGE CONTENT                    |
| Logo + brand         | (bg-background, rounded inset)       |
| Business switcher    |                                      |
| Grouped nav          |                                      |
| Account (footer)     |                                      |
+----------------------+--------------------------------------+
```

### Sidebar
- Fixed/sticky, dark navy background (`--sidebar-background`)
- WattWise mark + "WattWise" wordmark at top
- Business switcher below logo
- Grouped navigation with plain-language Indonesian labels
- Active item: soft emerald background + left border accent (not solid neon fill)
- `aria-current="page"` on active nav items
- Mobile: sheet/drawer via existing shadcn Sheet component

### Top Bar
- Sticky, semi-transparent with backdrop blur
- Sidebar toggle + breadcrumbs
- Minimal height (h-14)
- Clear border separation from content

### Content Area
- Rounded inset panel on desktop
- Full-width on mobile
- Page-specific headers and content

## Color/Token Mapping from Landing Page

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--background` | `hsl(44 41% 95%)` warm cream | `hsl(222.2 47.4% 7%)` dark navy |
| `--card` | `hsl(0 0% 100%)` white | `hsl(222.2 47.4% 10%)` elevated surface |
| `--primary` | `hsl(159.8 84.1% 39.4%)` emerald #10B981 | same |
| `--border` | `hsl(38 22% 84%)` | `hsl(222.2 47.4% 18%)` stronger |
| `--sidebar-background` | `hsl(222.2 47.4% 11.2%)` dark navy | `hsl(222.2 47.4% 5%)` darker |
| `--brand-soft` | emerald 10% opacity | emerald 12% opacity |
| `--success` | emerald | emerald |
| `--warning` | gold | gold |
| `--danger` | red | red |
| `--info` | blue | blue |

## Logo/Favicon Assets

- `public/favicon.svg` — WattWise lightning bolt mark (navy + teal + emerald)
- `public/favicon.ico` — ICO fallback
- `public/apple-touch-icon.png` — Apple touch icon
- `AppLogoIcon.vue` — SVG component matching favicon
- `AppLogo.vue` — Logo + "WattWise" wordmark + tagline

Blade template title fallback changed from `'Laravel'` to `'WattWise'`.
`.env.example` updated: `APP_NAME="WattWise AI"`.

## Navigation Information Architecture

### Before → After

| Group | Before | After |
|-------|--------|-------|
| — | Beranda | **Ringkasan** > Beranda |
| Catatan Bulanan | Catat Listrik | **Catat Usaha** > Pemakaian Listrik |
| Catatan Bulanan | Catat Pendapatan | **Catat Usaha** > Pendapatan Usaha |
| Data Usaha | Daftar Peralatan | **Catat Usaha** > Peralatan |
| Pahami Kondisi | Perkiraan Bulan Depan | **Pantau & Hemat** > Prediksi Biaya |
| Pahami Kondisi | Cek Kejanggalan | **Pantau & Hemat** > Peringatan Pemakaian |
| Pahami Kondisi | Saran Penghematan | **Pantau & Hemat** > Saran Penghematan |
| — | Laporan | **Pantau & Hemat** > Laporan |
| Data Usaha | Usaha / Kos Saya | **Kelola** > Usaha & Properti |
| Akun | Paket Saya | **Kelola** > Paket & Langganan |
| Akun | Pengaturan Akun | **Kelola** > Pengaturan |

### Route Paths (unchanged)
All route paths (`/dashboard`, `/electricity`, `/revenue`, etc.) remain identical.

## Terminology Changes

| Location | Before | After |
|----------|--------|-------|
| PredictionService constant | Hybrid AI Decision Support | Analisis Tren & Rata-Rata Bergerak |
| ReportExportService CSV | Hybrid AI Decision Support | Analisis Tren & Rata-Rata Bergerak |
| Prediction page title | Prediksi & Estimasi | Prediksi Biaya |
| Anomaly page title | Analisis Anomali | Peringatan Pemakaian |
| Electricity page title | Catat Data Listrik | Pemakaian Listrik |
| Revenue page title | Catat Pendapatan | Pendapatan Usaha |
| Appliances page title | Peralatan Listrik | Peralatan |
| Recommendations page title | Rekomendasi Hemat Listrik | Saran Penghematan |
| Reports page title | Laporan Bulanan | Laporan |
| Business page description | Kelola profil usaha... | Kelola informasi usaha, lokasi, dan pengaturan listrik dalam satu tempat. |

Added explanation on prediction page: "Perkiraan dibuat dari pola pemakaian terbaru dan arah perubahan beberapa bulan terakhir."

## Responsive Behavior

- **Mobile (< 768px):** Sidebar becomes Sheet drawer. Top bar retains toggle. Cards stack vertically.
- **Desktop:** Fixed sidebar with inset content panel. Cards use responsive grid.
- Sheet component includes `SheetTitle`/`SheetDescription` for accessibility.
- Touch targets remain ~44px minimum (h-10 nav items, h-11 select).

## Accessibility

- Navigation landmark: sidebar with `data-slot="sidebar"`, content in `<main>`
- `aria-current="page"` on active nav items
- `aria-label="Buka atau tutup menu"` on sidebar trigger
- Keyboard shortcut (Ctrl+B) toggles sidebar
- Escape closes mobile sheet
- Focus ring using `--ring` (emerald)
- Reduced-motion: `.gauge-path` transition disabled; GSAP checks `prefers-reduced-motion`
- Decorative icons use `aria-hidden="true"`
- Semantic heading hierarchy maintained

## Pages Audited

- Dashboard (Beranda)
- Usaha & Properti (Businesses)
- Pemakaian Listrik (Electricity)
- Pendapatan Usaha (Revenue)
- Peralatan (Appliances)
- Prediksi Biaya (Predictions)
- Peringatan Pemakaian (Anomalies)
- Saran Penghematan (Recommendations)
- Laporan (Reports)
- Paket & Langganan (Plans)
- Pengaturan (Settings — via settings layout)
- Auth pages (Login, Register, etc. — separate layout, not modified)

## Known Limitations

- Visual QA screenshots not embedded (no repo screenshot convention established)
- Auth pages (Login/Register) continue using `AuthLayout` — not part of this shell refresh
- Settings pages use nested layout pattern — labels updated via breadcrumbs only
- PHPStan shows 100 baseline errors (all pre-existing, none in changed files)
- Pint has pre-existing style issues across 56 files (none introduced by this change)
- 433 test errors are baseline (APP_KEY not set in test environment)

## Validation Results

| Check | Result |
|-------|--------|
| `php artisan test` | 734 tests, 301 passed, 0 failed, 433 errors (baseline) |
| `npx vue-tsc --noEmit` | Pass |
| `npm run build` | Pass (5.39s) |
| `vendor/bin/pint --test` | Baseline failures only |
| `vendor/bin/phpstan analyse` | 100 baseline errors, 0 new |
| `git diff --check` | No whitespace errors |

## No Business Logic Changes

- No route changes
- No controller logic changes
- No database migrations
- No authentication changes
- No prediction algorithm changes
- No billing logic changes
- No ML flag changes
- Railway and production untouched
