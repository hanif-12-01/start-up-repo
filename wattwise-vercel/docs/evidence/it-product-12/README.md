# IT-PRODUCT-12 Local Evidence

Evidence was generated against a local production build, a disposable PostgreSQL container, and synthetic accounts only. No production, Neon, PR, merge, or deployment action was performed.

## Browser evidence

- `landing-desktop.png` — explicit light media, 1280 × 900 viewport.
- `landing-mobile.png` — 390 × 844 mobile viewport.
- `landing-dark.png` — persisted explicit dark preference.
- `dashboard.png` — light dashboard and desktop product shell.
- `dashboard-dark.png` — dark dashboard and desktop product shell.
- `analysis.png` — first-class Analysis workspace.
- `plans.png` — effective plan, limits, and sandbox disclosure.
- `bill-ocr.png` — browser-local meter OCR and privacy wording.
- `appearance-dark.png` — persisted DARK selection.
- `browser-verification.json` — machine-readable assertions; synthetic email only, no token/cookie/secret.

The automated verifier additionally checks horizontal overflow on landing, dashboard, analysis, bills, revenue, appliances, businesses, reports, plans, and appearance at 360 × 800, 768 × 1024, 1280 × 900, and 1440 × 900, plus the mobile navigation drawer.

`landing.png` is the initial visual baseline captured before the final viewport-specific evidence run.
