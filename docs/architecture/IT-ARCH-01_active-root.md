# IT-ARCH-01 active repository root

## Contract

The active branch contains one deployable product: the Laravel/Vue application under
`wattwise-laravel/`. Product, launch, QA, validation, migration, and architecture
documentation remains under `docs/`.

The intended tracked top-level tree is:

```text
.
|-- .gitignore
|-- README.md
|-- docs/
`-- wattwise-laravel/
```

The baseline did not contain tracked root Railway/Nixpacks files, root Dependabot
metadata, or GitHub Actions. None were added. The active repository-level
`.gitignore` remains unchanged.

## Railway boundary

The successful staging deployment for source commit
`cad16f68e4b5aab7e2ae03282f6596f87089545d` reports:

- repository branch: `main`;
- root directory: `/wattwise-laravel`;
- Railpack provider: PHP;
- Laravel detection: true;
- no root Dockerfile, Nixpacks plan, or root Node build dependency.

The service setting is not changed by IT-ARCH-01.

## Removed active-tree paths

`.agent-skills/`, `.cursor/`, root `.env.example`, root `.eslintrc.json`,
`ML/`, `next.config.mjs`, root `package-lock.json`, root `package.json`,
root `postcss.config.js`, `prisma/`, root `scripts/`, `src/`,
`tailwind.config.ts`, and root `tsconfig.json` are removed only after private
archive verification.

The detailed classification and verification evidence are recorded in the three
IT-ARCH-01 CSV manifests in this directory.

## History and runtime guarantees

Git history is intentionally preserved and was not rewritten. Historical commits
continue to contain the retired implementation. This cleanup does not reduce
repository history or remote object storage.

No production system, Railway variable, release tag, GitHub Action, or Laravel
runtime file is changed. No research model is activated.
