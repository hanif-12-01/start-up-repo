# Railway Demo Readiness Contract

This document is the authoritative deployment contract for the WattWise AI Laravel service on Railway. It supersedes older instructions that relied on container-local SQLite or direct demo seeding.

## Confirmed root cause

The affected Railway service was inspected directly and resolved to this state:

- `APP_ENV=production`;
- both demo flags were disabled;
- `DB_CONNECTION` resolved to `sqlite`;
- the active database path was `/app/database/database.sqlite`;
- `demo@wattwise.local` did not exist in that database.

The login failure therefore was not a Fortify issue or merely a stale password. Railway pre-deploy commands run in a separate container, and their filesystem changes do not persist into the web container. Container-local SQLite cannot provide a durable demo provisioning contract. Staging/demo must use persistent PostgreSQL.

## Required environment separation

Production and staging/demo must be separate Railway environments and databases.

### Production

```dotenv
APP_ENV=production
APP_DEBUG=false
DEMO_LOGIN_ENABLED=false
DEMO_ML_VALIDATION_ENABLED=false
DB_CONNECTION=pgsql
DB_URL=<persistent PostgreSQL reference>
DB_SSLMODE=require
```

`DATABASE_URL` may be used instead of `DB_URL`. `DB_URL` takes precedence when both are present. Production fails closed if either demo flag is enabled or if Railway resolves the database driver to SQLite.

### Staging / demo

```dotenv
APP_ENV=staging
APP_DEBUG=false
DEMO_LOGIN_ENABLED=true
DEMO_ML_VALIDATION_ENABLED=true
DB_CONNECTION=pgsql
DB_URL=<persistent PostgreSQL reference>
DB_SSLMODE=require

PREDICTION_SHADOW_ENABLED=true
PREDICTION_RIDGE_ENABLED=true
PREDICTION_GRADIENT_BOOSTING_ENABLED=true
PREDICTION_ADAPTIVE_ROUTER_ENABLED=false
```

`DATABASE_URL` may be used instead of `DB_URL`. A Railway variable reference may resemble `DB_URL=${{Postgres.DATABASE_URL}}`, but `Postgres` must exactly match the actual database service name. Never commit the resolved URL or database password.

## Railway service configuration

- Root Directory: `wattwise-laravel`
- Config file when Railway still evaluates paths from the repository root: `/wattwise-laravel/railway.json`
- Healthcheck path: `/up/release`
- Healthcheck timeout: 300 seconds
- Restart policy: `ON_FAILURE`, maximum 3 retries

The config-as-code pre-deploy sequence is:

```bash
php artisan optimize:clear && php artisan migrate --force && php artisan wattwise:railway-release-guard && php artisan config:cache && php artisan route:cache && php artisan view:cache
```

The release guard runs after migrations and before caches are built. Any non-zero result aborts the deployment. There is no custom start command in `railway.json`, and demo data is never provisioned during the build.

## Release behavior

`php artisan wattwise:railway-release-guard`:

- establishes a real database connection;
- rejects Railway staging/production when the resolved driver is SQLite;
- rejects demo or ML validation flags in Railway production;
- performs no demo mutation when demo login is disabled;
- provisions or repairs only `demo@wattwise.local` and its named scenario records in allowed environments;
- verifies primary demo readiness and, when enabled, all five ML history scenarios;
- never prints connection URLs, hosts, usernames, passwords, hashes, application keys, or exception details.

The five scenario history lengths are exactly 0, 2, 5, 6, and 18 months and must resolve to `H00`, `H01_02`, `H03_05`, `H06_12`, and `H13_PLUS`. Additional harmless demo-owned businesses are not removed. LightGBM and N-BEATS remain research expectations only and must not be reported as integrated until they are registered and executable. User-facing predictions remain deterministic.

## Read-only health endpoints

- `/up` - Laravel liveness endpoint;
- `/up/demo` - fail-closed primary demo readiness;
- `/up/release` - authoritative read-only deployment healthcheck;
- `/internal/ml-validation` - authenticated demo-only validation UI, guarded at request time.

`/up/release` returns HTTP 200 only when every applicable release requirement passes. It never provisions data and returns compact, secret-free JSON. Failures return HTTP 503.

## Shell diagnosis and recovery

Open Railway Shell in the same project, service, and environment as the public deployment. A shell opened in another service or environment does not verify the deployed database.

```bash
php artisan optimize:clear
php artisan migrate --force
php artisan wattwise:railway-release-guard
php artisan wattwise:diagnose-demo-login
php artisan wattwise:diagnose-demo-login --fix
```

The `--fix` path delegates to the same lock-protected provisioning service used by the release guard.

Safe runtime verification:

```bash
php artisan tinker --execute='dump([
    "app_env" => app()->environment(),
    "railway_environment" => getenv("RAILWAY_ENVIRONMENT_NAME") ?: null,
    "demo_enabled" => config("demo.enabled"),
    "ml_validation_enabled" => config("demo.ml_validation_enabled"),
    "db_driver" => config("database.default"),
    "db_name" => Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
]);'
```

Expected staging state: app and Railway environments are `staging`, both demo flags are true, the driver is `pgsql`, and the database name identifies the attached persistent PostgreSQL database.
