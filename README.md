# WattWise AI

WattWise AI is electricity cost intelligence for boarding houses, rental
properties, and energy-intensive small businesses. The active product is implemented
in `wattwise-laravel/` with Laravel, Vue, Inertia, TypeScript, and Tailwind CSS.

## Active repository layout

- `wattwise-laravel/`  the application, tests, migrations, and frontend build.
- `docs/`  active product, launch, QA, validation, migration, and architecture
  documentation.
- `README.md`  the public repository entry point.

The legacy implementation is no longer part of the active working tree. Historical
commits are intentionally preserved, so the retired files remain available through
Git history. IT-ARCH-01 did not rewrite history or reduce remote Git object storage.

## Railway

Railway uses `wattwise-laravel` as the application root. The service builds the
Laravel application directly and does not depend on a repository-root Node,
Next.js, Prisma, PostCSS, Tailwind, or TypeScript configuration.

Repository cleanup does not change Railway variables, deployment environments, or
production. GitHub Actions are intentionally absent.

## Local development

Run application commands from the Laravel directory:

```powershell
cd wattwise-laravel
composer install
npm ci
php artisan test
npm run lint:check
npm run format:check
npm run types:check
npm run test:meter-ocr
npm run build
```

Copy `wattwise-laravel/.env.example` to `wattwise-laravel/.env` for a local
environment, then configure local-only values. Never commit environment files or
credentials.

## Prediction boundary

The active Laravel product continues to use its approved deterministic intelligence
services. Repository cleanup does not activate LSTM, Ridge, Gradient Boosting, or any
other research model. Any future model integration requires separate approval,
training-data governance, validation, and runtime rollout work.

## Documentation

Start with:

- `docs/MVP_DEMO.md` for the current demo narrative;
- `docs/launch/` for staging and launch checks;
- `docs/product/` for product-specific QA;
- `docs/roadmap/` for approved implementation briefs;
- `docs/architecture/IT-ARCH-01_active-root.md` for the active-root contract.

WattWise estimates are decision-support information and are not official utility
bills or guaranteed savings.
