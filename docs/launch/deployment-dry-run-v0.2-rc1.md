# WattWise AI — Deployment Dry Run v0.2-rc1

**Release tag:** `v0.2-rc1`

Deployment dry run / hosting preparation reference. No deployment is performed by this document — it is a checklist and command reference for a safe first deploy.

---

## 1. Recommended Hosting (first demo / staging)

**Railway** — recommended for the first demo/staging deploy.

- Native Node + PHP build support (Laravel + Inertia + Vite friendly)
- Managed PostgreSQL, compatible with Supabase PostgreSQL connections
- Simplest environment-variable UI for beginners
- Low-cost / free-tier suitable for a demo
- Lowest risk for a first-time deploy

Runner-up: Render. Fly.io offers more control at the cost of more setup. VPS/manual is the most reliable but requires you to manage everything.

---

## 2. Production Environment Checklist

Set these on the hosting platform. Do not commit real values. Do not print `.env`.

| Key | Recommended value / note |
| --- | --- |
| `APP_NAME` | WattWise AI |
| `APP_ENV` | `production` |
| `APP_KEY` | generated (`php artisan key:generate`) |
| `APP_DEBUG` | `false` |
| `APP_URL` | production URL |
| `DB_CONNECTION` | `pgsql` (Supabase PostgreSQL) |
| `DB_HOST` | Supabase host |
| `DB_PORT` | Supabase port |
| `DB_DATABASE` | database name |
| `DB_USERNAME` | database user |
| `DB_PASSWORD` | database password (secret) |
| `SESSION_DRIVER` | `database` or `file` (per deployment constraints) |
| `CACHE_STORE` / `CACHE_DRIVER` | `file` or `database` (Redis not required for MVP) |
| `QUEUE_CONNECTION` | `sync` for MVP (no queue worker configured) |
| `MAIL_MAILER` | per provider (e.g. `log` for demo) |
| `VITE_APP_NAME` | WattWise AI |

---

## 3. Build / Deploy Command Sequence

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Notes:
- Run `npm run build` before `php artisan view:cache`.
- Do not `config:cache` locally with production values loaded.
- Environment variables must be set on the host before caching config.

---

## 4. Demo / Staging Seed Commands

```bash
php artisan db:seed --class=WattWiseDemoSeeder
php artisan wattwise:diagnose-demo-login
```

- Demo seeder is for demo/staging only; it must not expose production credentials.
- Diagnostic command must not print secrets.

---

## 5. Post-Deploy Smoke Test Checklist

Run in order, immediately after deploy, on the production URL.

**Boot & auth**
- [ ] `GET /` loads — must NOT be the Laravel starter page, must NOT be the Vite dev-server page
- [ ] `GET /login` renders the login form
- [ ] Demo login succeeds (if `WattWiseDemoSeeder` account seeded on staging) — otherwise register a fresh account

**Core pages (each returns 200, no 500, content renders)**
- [ ] `/dashboard` — summary cards render
- [ ] `/electricity` — entries list loads
- [ ] `/revenue` — entries list loads
- [ ] `/appliances` — templates + list load
- [ ] `/recommendations` — insights render
- [ ] `/reports` — monthly report renders
- [ ] `/plans` — plan gating displays correctly

**Content & safety verification**
- [ ] No Laravel starter page anywhere
- [ ] No Vite dev-server page anywhere
- [ ] Safe wording holds — none of: "prediksi tagihan", "penyebab pasti", "alat rusak", "sensor membaca", "terdeteksi real-time", "AI memastikan", "official PLN"
- [ ] Allowed negated PLN wording present where expected: "bukan aplikasi resmi PLN" / "bukan tagihan resmi PLN" / "Tanpa integrasi resmi PLN"
- [ ] Release notes / version reference matches **v0.2-rc1**

**Fast green loop:** `/` → `/login` → demo login → `/dashboard`. All four green = app is up.

---

## 6. Rollback Plan

**Risk level: LOW.** Phase 7 introduces no schema change, so database rollback is not required.

- [ ] Redeploy the previous stable tag (`v0.1-demo-ready`) or last known-good commit
- [ ] `php artisan optimize:clear` on the rolled-back build
- [ ] Re-run `config:cache` / `route:cache` / `view:cache` for the restored tag
- [ ] Verify login + `/dashboard` load post-rollback (fast green loop above)

**Do NOT roll back casually:**
- [ ] Database — no migration ran in this phase; do NOT restore a DB backup unless a migration actually mutated data (none did). A casual DB rollback risks losing real demo/staging entries.
- [ ] Environment variables — a redeploy does NOT roll these back; re-verify prod env still matches after any rollback.

---

## 7. MVP Non-Goals

- Not an official PLN app.
- Not a PLN Mobile replacement.
- No payment gateway (no Stripe / Midtrans / Xendit / checkout / invoice / subscription webhook).
- No PDF export/download.
- No IoT / sensor integration.
- No external AI API / LSTM (no OpenAI / Gemini).
- Old Next.js app is legacy / reference only — not connected to Laravel.

---

**No official PLN claim.** WattWise AI is not affiliated with, and not an official application of, PLN.
