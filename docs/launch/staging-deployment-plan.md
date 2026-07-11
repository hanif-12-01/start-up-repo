# WattWise AI — Staging Deployment Plan

## 1. Release Context
* **App:** WattWise AI
* **Active app path:** `wattwise-laravel`
* **Release reference:** `v0.2-rc1`
* **Hosting target:** Railway
* **Database target:** Supabase PostgreSQL
* **GitHub source:** `main` branch
* **Old Next.js status:** legacy/reference only (archived/inactive)

---

## 2. Staging Architecture
* **Web Tier:** Railway App Service hosting the Laravel + Inertia.js + Vue.js application.
* **Asset Building:** Vite assets are built during the deployment pipeline step on Railway (`npm run build`).
* **Database Tier:** Supabase PostgreSQL database instances are used to store application data.
* **Configuration:** All application environments and secrets are managed via Railway's dashboard environment variables.
* **Queues & Cache:** 
  * The queue system runs in `sync` mode (`QUEUE_CONNECTION=sync`) for MVP staging. No separate Redis or background queue worker is required.
  * Session and caching stores use `database` or `file` drivers (no Redis dependency for the MVP).

---

## 3. Pre-Deployment Local Verification
Before initiating any deployment, run the following verification checks from the repository root:

```powershell
# From the repository root (D:\LOMBA\Startup Proto)
# 1. Verify working tree is clean and code is up-to-date
git status --short
git pull --ff-only origin main
git tag -l "v0.2-rc1"

# 2. Clear local cache, run tests and build locally
cd wattwise-laravel
php artisan optimize:clear
php artisan test
npm run build
```

### Expected Results:
* Git working tree must be clean (no uncommitted files or unstaged changes).
* Git tag `v0.2-rc1` must be present.
* PHPUnit test suite must pass completely: **213 tests passed, 0 failures**.
* Vite build (`npm run build`) must complete without compilation errors.

---

## 4. Supabase Setup Checklist
1. **Create Staging Project:** Set up a new PostgreSQL project on Supabase specifically for staging. Do not reuse a production database.
2. **Collect Connection Info:** Navigate to **Project Settings -> Database** in the Supabase Dashboard and copy the connection details.
3. **Connection Type Selection:**
   * **Direct Connection:** Prefer direct connection (`port 5432`) if Railway can resolve the direct network host without restrictions.
   * **Connection Pooling:** If the Railway network environment is IPv4-only and has resolution issues with Supabase IPv6, use the Supabase Connection Pooler (`port 6543` in **Session** mode).
4. **SSL Requirements:** Ensure that PostgreSQL SSL mode is enabled by setting `DB_SSLMODE=require`.
5. **Security:** Keep the database password secure. Never share or commit database credentials.

---

## 5. Railway Setup Checklist
1. **Create Project:** Initialize a new empty project on [Railway](https://railway.app/).
2. **Connect Repository:** Link the project to your GitHub repository and target the `main` branch.
3. **Configure Monorepo Root:**
   * In Railway's service settings, set the **Root Directory** (or app path) to `wattwise-laravel`. This instructs Railway to ignore the top-level Next.js files and build directly inside the Laravel directory.
4. **Input Environment Variables:** Populate the Railway environment variables dashboard with the keys outlined in Section 6.
5. **Configure Build & Start Pipelines:** Verify that the build commands execute properly. If automated detection is used, ensure it is targetting the `wattwise-laravel` subdirectory.
6. **Generate Domain:** Go to the service settings and click **Generate Domain** to provision a public URL (e.g. `https://xxx.up.railway.app`).
7. **Restrictions:**
   * **Do not** connect or expose the old Next.js application.
   * **Do not** set up or add any checkout, payment, or subscription-handling services.

---

## 6. Environment Variables Checklist
Provide the following environment variable keys in the Railway console. **Do not copy or commit actual secret values.**

| Key | Value/Note |
| :--- | :--- |
| `APP_NAME` | `WattWise AI` |
| `APP_ENV` | `staging` (or `production` depending on staging convention) |
| `APP_KEY` | *Generate securely* (e.g., `base64:...` via `php artisan key:generate --show`) |
| `APP_DEBUG` | `false` (Must be false on staging to secure error outputs) |
| `APP_URL` | *Must exactly match the generated Railway public URL (with https)* |
| `LOG_CHANNEL` | `stderr` |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | *Supabase host address* |
| `DB_PORT` | `5432` *(Direct)* or `6543` *(Session Pooler)* |
| `DB_DATABASE` | `postgres` (or your custom database name) |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | *Your Supabase DB password* |
| `DB_SSLMODE` | `require` |
| `SESSION_DRIVER` | `database` (or `file`) |
| `CACHE_STORE` | `database` (or `file`) |
| `QUEUE_CONNECTION`| `sync` |
| `VITE_APP_NAME` | `WattWise AI` |
| `DEMO_LOGIN_ENABLED`| `true` (Set to true only in staging to show demo login credentials and allow diagnostics) |

> [!IMPORTANT]
> * `APP_URL` must exactly match the Railway public domain name.
> * If you modify the `APP_URL` or session configurations, trigger a redeploy on Railway and run cache clearing commands to apply changes.
> * Never push environment variable files (`.env`) or paste live secrets into public repository chats.

---

## 7. Build and Start Commands
Railway normally detects Laravel applications automatically. Below is the recommended sequence to use or customize if needed.

### Build Command (Railway Build Step)
Execute this inside the service root (`wattwise-laravel`):
```bash
composer install --no-dev --optimize-autoloader && npm ci && npm run build
```

### Pre-Deploy / Start Command (Railway Release Step)
Run the following commands right before starting the web server container:
```bash
php artisan migrate --force && php artisan wattwise:ensure-demo-login && php artisan config:cache && php artisan route:cache && php artisan view:cache
```

> [!NOTE]
> * If the build script fails due to file path issues, confirm that the service root directory is set to `wattwise-laravel`.
> * If CSS, JS, or images fail to render, verify that the `npm run build` command ran inside `wattwise-laravel` and generated files in `public/build/manifest.json`.

---

## 8. Migration and Demo Seed Strategy
To prepare the database with demonstrative staging data:

1. **Enable Demo in Environment:**
   Set `DEMO_LOGIN_ENABLED=true` in the Railway variables.
2. **Clear Config Cache:**
   ```bash
   php artisan optimize:clear
   ```
3. **Run Migrations:**
   ```bash
   php artisan migrate --force
   ```
4. **Seed Demo Data:**
   Run the specific seeder to populate the Kos Melati Purwokerto profile (6-month history, 10 sample appliances, active trial state):
   ```bash
   php artisan db:seed --class=WattWiseDemoSeeder
   ```
5. **Diagnose Demo Login:**
   Run the utility script to ensure that the seeded demo account is properly functioning:
   ```bash
   php artisan wattwise:diagnose-demo-login
   ```
6. **Repair via Diagnostic Command:**
   If the demo user is missing or has stale credentials, run the fix option:
   ```bash
   php artisan wattwise:diagnose-demo-login --fix
   ```
7. **Staging Demo Account Credentials:**
   * **Email:** `demo@wattwise.local`
   * **Password:** `password`

### 8.1 Railway Release Contract and Safeguards

The release command pipeline executes `php artisan wattwise:ensure-demo-login` during deployment (prior to config/route caching).

#### Staging Environment Config:
- `APP_ENV=staging`
- `APP_DEBUG=false`
- `DEMO_LOGIN_ENABLED=true`

#### Production Environment Config:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `DEMO_LOGIN_ENABLED=false`

#### Release/Deploy Guarantees:
- **No-op Safety:** The `ensure-demo-login` command is a safe no-op when `DEMO_LOGIN_ENABLED=false` (e.g., in production).
- **Hard Refusal:** Deployment must fail (exit code 1) if `DEMO_LOGIN_ENABLED=true` is set in an unsafe environment (e.g. production).
- **Fail-closed Advertising:** The frontend will only display the demo banner and credentials if the database is fully repaired and verified ready (`demo.ready = true`).
- **Data Isolation:** Never use a staging demo database for live customer production data.
- **Manual Dashboard Control:** Environment variables and Railway settings remain manual after branch merge.

> [!WARNING]
> * Never seed demo credentials or run `WattWiseDemoSeeder` in a live production environment containing actual client data.

---

## 9. Post-Deploy Smoke Test
Open the newly deployed staging URL and walk through these routes sequentially:

1. **`GET /` (Welcome Page):** Verify that the custom WattWise AI landing page loads. It must *not* display the Laravel welcome page, the Vite development screen, or the old Next.js interface.
2. **`GET /login`:** Verify that the stylized login page is rendered.
3. **Demo Login:** Submit `demo@wattwise.local` / `password`. The login must succeed and redirect to `/dashboard`.
4. **`/dashboard`:** Ensure that the business dashboard (Kos Melati Purwokerto) loads without database or rendering errors.
5. **`/electricity`:** Verify that the 6-month historical electricity data is correctly displayed.
6. **`/revenue`:** Check that monthly revenue logs are present.
7. **`/appliances`:** Verify that the list of 10 appliances is rendered, displaying individual estimates.
8. **`/recommendations`:** Ensure rule-based recommendations are displayed.
9. **`/reports`:** Ensure monthly efficiency reports open correctly.
10. **`/plans`:** Verify that the trial membership status is displayed without any payment buttons or external gateway UI.

### Expected Smoke Test Results:
* **No Laravel default/placeholder templates.**
* **No Vite hot-reload errors.**
* **No Next.js files active.**
* **No Stripe/Midtrans/Xendit/credit-card checkout UI.**
* **No 500 Server Errors.**
* **Compliance:** The legal warnings and PLN disclaimers must be visible.

---

## 10. Common Staging Errors and Fixes

### 1. HTTP 500 Error After Deployment
* **Causes:** Missing `APP_KEY`, configuration caching issues, or misconfigured database.
* **Fixes:** Verify that `APP_KEY` is set in Railway env, and check application logs. Run `php artisan optimize:clear` to flush caches.

### 2. Login Loops or Session Timeouts
* **Causes:** Incorrect `APP_URL`, invalid `SESSION_DRIVER` configuration, or HTTPS mismatches.
* **Fixes:** Double-check that `APP_URL` matches the HTTPS URL of the Railway app. Switch the `SESSION_DRIVER` to `database` if `file` session permissions fail. Clear browser cookies.

### 3. Database Connection Refused
* **Causes:** Incorrect Supabase host, port, or SSL configuration.
* **Fixes:** Check if you need to use port `6543` for connection pooling. Ensure `DB_SSLMODE` is set to `require`.

### 4. Broken Layout / Assets Missing
* **Causes:** `npm run build` failed to compile or the files were built in the wrong directory.
* **Fixes:** Verify that `npm run build` runs inside the `wattwise-laravel` folder during Railway building. Confirm the existence of `public/build/manifest.json`.

### 5. Migration Failure
* **Causes:** Supabase credentials do not have permission to create tables, or connection timed out.
* **Fixes:** Check your database credentials and connection string. Test network reachability.

### 6. Demo Account Unable to Log In
* **Causes:** Database was not seeded or demo data got corrupted.
* **Fixes:** Run `php artisan db:seed --class=WattWiseDemoSeeder` followed by `php artisan wattwise:diagnose-demo-login` with the `--fix` flag if needed.

---

## 11. Rollback Plan
If staging experiences a critical failure, deploy the following fallback procedure:

1. **Redeploy Previous Commit:**
   Use the Railway console to rollback and rebuild the last known-good commit or tag (`v0.1-demo-ready`).
2. **Clear Caches:**
   Run cache clearing commands on the rollback container:
   ```bash
   php artisan optimize:clear
   ```
3. **Verify State:**
   Confirm that the application starts up and passes the quick login flow.
4. **Database Precaution:**
   Do *not* casually roll back the database. The `v0.2-rc1` release does not introduce schema changes, so database table restores are unnecessary. Casually restoring database backups might result in losing newly recorded demo/testing entries.

---

## 12. MVP Non-Goals and Compliance
WattWise AI is designed as a standalone cost-intelligence tool. Keep the following constraints in mind during testing:
* **PLN Affiliation:** The app is *not* an official PLN app, is *not* a replacement for PLN Mobile, and has no official integration with PLN databases.
* **No Payments:** The system does not handle actual payments or subscriptions. All premium features are unlocked via a simulation-based Pro Trial.
* **No PDF Actions:** PDF report downloads are disabled or locked.
* **No IoT/Hardware:** The app relies on manual user duration and load inputs; it does not read physical IoT meters.
* **No External AI APIs:** Machine learning predictions are done via local, rules-based algorithms. There are no API keys or connections to OpenAI, Gemini, or local LSTM servers.
* **Legacy Next.js:** The old Next.js code must remain untouched and completely disconnected from the current Laravel app.
