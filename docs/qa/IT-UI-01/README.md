# IT-UI-01 QA Record

## Bundle comparison

| Artifact | Main baseline | IT-UI-01 branch | Delta |
|---|---:|---:|---:|
| Landing JavaScript chunk | 27.21 kB / 7.20 kB gzip | 153.56 kB / 55.92 kB gzip | +126.35 kB / +48.72 kB gzip |
| Landing CSS chunk | 0.15 kB / 0.13 kB gzip | 0.24 kB / 0.16 kB gzip | +0.09 kB / +0.03 kB gzip |
| Shared app JavaScript chunk | 172.30 kB / 48.40 kB gzip | 172.42 kB / 48.47 kB gzip | +0.12 kB / +0.07 kB gzip |

Installed GSAP version: `3.15.0`. The minified GSAP Core and ScrollTrigger files account for approximately 117.50 kB raw / 46.42 kB gzip. The landing-only increase is acceptable for the approved product-story interaction because it remains isolated to the public page, uses no continuous loop or background media, and cleans up its scoped triggers when the page unmounts.

## Automated results

- Full backend suite: 636 tests, 3,885 assertions, all passed.
- Focused landing, branding, and safe-wording suite: 28 tests, 327 assertions, all passed.
- Composer audit, ESLint, Vue TypeScript, meter OCR regression, Vite production build, changed-file Prettier, changed-file Pint, changed-file PHPStan, and `git diff --check`: passed.
- Global Prettier baseline: 27 pre-existing files; branch: 26 pre-existing files. No changed landing Vue/TS file fails formatting, so zero new violations were introduced.
- Global PHPStan baseline exhausted its configured 128 MiB memory. Both changed PHP test files pass a targeted PHPStan run at 512 MiB with zero errors.
- Global Pint baseline contains unrelated failures. Both changed PHP test files pass targeted Pint with zero failures.

## Browser QA

The production Vite bundle was tested locally at 1440×900, 1280×720, 1024×768, 768×1024, 390×844, and 320×568. All viewports passed first-load content, one-H1 rendering, CTA and anchor checks, sticky navigation, horizontal-overflow checks, native bottom scrolling, and asset loading. Desktop passed one pinned product-story region; tablet and mobile passed stacked story cards with no pinning. Reduced motion produced no pin spacer and kept the H1 visible. The mobile menu opened from its keyboard-focusable button and closed with Escape. An Inertia visit away from and back to the landing page returned with exactly one pin spacer. No console exception, failed network request, broken link, missing asset, or duplicate trigger was detected.

Safe captures:

- `desktop-hero.webp`
- `desktop-product-story.webp`
- `desktop-transparency-final-cta.webp`
- `mobile-hero.webp`
- `mobile-product-story.webp`
- `mobile-menu.webp`

## Scope compliance table

| Changed file | IT-UI-01 requirement | Why necessary |
|---|---|---|
| `docs/roadmap/IT-UI-01_GSAP_Product_Landing.md` | Phase A specification | Establishes the approved repository specification before UI implementation. |
| `docs/qa/IT-UI-01/README.md` | Performance, testing, Definition of Done | Records bundle comparison, gate results, browser QA, screenshots, and file-level scope evidence. |
| `docs/qa/IT-UI-01/desktop-hero.webp` | Manual browser QA | Provides the required safe desktop hero capture. |
| `docs/qa/IT-UI-01/desktop-product-story.webp` | Manual browser QA | Provides the required safe desktop product-story capture. |
| `docs/qa/IT-UI-01/desktop-transparency-final-cta.webp` | Manual browser QA | Provides the required safe desktop transparency/final-CTA capture. |
| `docs/qa/IT-UI-01/mobile-hero.webp` | Manual browser QA | Provides the required safe mobile hero capture. |
| `docs/qa/IT-UI-01/mobile-product-story.webp` | Manual browser QA | Provides the required safe mobile stacked-story capture. |
| `docs/qa/IT-UI-01/mobile-menu.webp` | Manual browser QA | Provides the required safe accessible-mobile-menu capture. |
| `wattwise-laravel/package.json` | GSAP dependency | Adds GSAP from npm without a CDN or a second animation framework. |
| `wattwise-laravel/package-lock.json` | GSAP dependency | Locks GSAP 3.15.0 and its integrity metadata for reproducible installation. |
| `wattwise-laravel/resources/js/pages/Welcome.vue` | Public landing architecture | Composes the scoped landing sections, auth-aware state, semantic main landmark, and animation root. |
| `wattwise-laravel/resources/js/components/landing/LandingNavigation.vue` | Navigation and CTA matrix | Implements sticky desktop navigation, keyboard-accessible mobile navigation, and safe auth/demo actions. |
| `wattwise-laravel/resources/js/components/landing/LandingHero.vue` | Hero | Presents the customer problem, outcome-led H1, safe CTA pair, and real product evidence. |
| `wattwise-laravel/resources/js/components/landing/LandingTrustProblems.vue` | Trust strip and customer problem | Connects the five trust points and four customer problems to implemented workflows. |
| `wattwise-laravel/resources/js/components/landing/LandingProductStory.vue` | GSAP product story | Implements Catat, Pahami, Tentukan Prioritas, and Laporkan for desktop and mobile. |
| `wattwise-laravel/resources/js/components/landing/LandingProof.vue` | Product proof | Shows only implemented capabilities with customer outcomes and explicit limitations. |
| `wattwise-laravel/resources/js/components/landing/LandingBenefitsPersonas.vue` | Benefits and personas | Presents business outcomes and exactly three approved customer groups. |
| `wattwise-laravel/resources/js/components/landing/LandingTransparencyCta.vue` | Transparency, plans, final CTA | Keeps limitations prominent and describes current Free/Pro Trial behavior without changing billing. |
| `wattwise-laravel/resources/js/components/landing/LandingFooter.vue` | Footer | Provides only working anchors and existing application routes. |
| `wattwise-laravel/resources/js/composables/useLandingAnimations.ts` | Vue/GSAP lifecycle and reduced motion | Scopes GSAP with context/matchMedia, separates desktop/mobile/reduced-motion behavior, and reverts on unmount. |
| `wattwise-laravel/public/images/landing/dashboard-overview.webp` | Hero and product proof | Supplies optimized, safe evidence of the implemented dashboard. |
| `wattwise-laravel/public/images/landing/electricity-input.webp` | Product story and proof | Supplies optimized, safe evidence of implemented electricity input. |
| `wattwise-laravel/public/images/landing/prediction-analysis.webp` | Product story and proof | Supplies optimized, safe evidence of implemented estimation and analysis. |
| `wattwise-laravel/public/images/landing/recommendations.webp` | Product story and proof | Supplies optimized, safe evidence of implemented decision-support recommendations. |
| `wattwise-laravel/public/images/landing/reports.webp` | Product story and proof | Supplies optimized, safe evidence of implemented report output. |
| `wattwise-laravel/tests/Feature/LandingPageTest.php` | Focused test requirements | Covers HTTP, messaging, routes, CTA states, transparency, forbidden claims, and asset existence. |
| `wattwise-laravel/tests/Feature/AuthBrandingTest.php` | Existing landing regression coverage | Updates existing landing expectations to follow the componentized product copy without weakening safety assertions. |
