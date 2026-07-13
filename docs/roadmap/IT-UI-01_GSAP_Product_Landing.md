# IT-UI-01 — GSAP Product Landing and Conversion Experience

## 1. Task name

**Task ID:** IT-UI-01  
**Title:** GSAP Product Landing and Conversion Experience

Transform the public WattWise landing page into an original editorial SaaS product-acquisition experience. The page must make the electricity-cost problem, WattWise workflow, practical customer outcomes, limitations, and next action understandable in one visit.

## 2. Product Owner authorization

IT-UI-01 is an approved Product Owner addition to the WattWise roadmap. This specification is an addendum to `WattWise_AI_IT_AI_Agent_Guidebook_v2.0.md`; both documents are mandatory wherever they do not conflict. The authorization applies only to the public landing experience and does not authorize IT-P0-02 or any adjacent roadmap work.

## 3. Business problem

Electricity costs keep running, but small-business and small-property owners struggle to judge whether the cost is still reasonable, what should be inspected, and how electricity affects revenue. Bills change without understandable context, electricity costs are difficult to compare with revenue, appliance inspection priorities are based on guesses, monthly data and reports are scattered, and owners do not have time for complex analytics.

The landing page must help a visitor answer:

- Is WattWise suitable for my business?
- What problem does WattWise help with?
- What data do I enter?
- What outputs do I receive?
- Are the outputs estimates or official measurements?
- How do I try the product?

## 4. Target customers

Primary customers are:

- owners of kos and managers of kontrakan or small properties;
- laundry and other energy-intensive UMKM;
- culinary businesses, small cold storage, shops, and other businesses using high-power equipment.

The page must not target electricity companies, large factories, enterprise utilities, government, smart-grid operators, large industrial energy-management buyers, or IoT hardware buyers.

## 5. Product value proposition

**Primary value proposition:** WattWise helps turn electricity and business-revenue data into guidance that is easier to understand, inspect, and act on.

Customer outcomes:

- understand electricity-use and cost trends;
- view electricity burden in the context of revenue;
- estimate usage and cost for a following period;
- recognize changes that need review;
- prioritize candidate equipment for manual inspection;
- receive energy-saving recommendations as decision support;
- prepare monthly reports.

The experience leads with customer outcomes, not machine learning, AI architecture, rule engines, Laravel, Vue, analytics-platform language, or the SaaS technology stack. “AI” may remain in the WattWise AI brand but is not the core value proposition.

## 6. Landing-page information architecture

The public page follows this order:

1. **Navigation:** sticky, lightweight desktop navigation and an accessible mobile menu. Working links: Produk, Cara Kerja, Manfaat, Untuk Siapa, Transparansi, Masuk, and context-aware primary/secondary CTAs. No Roadmap link.
2. **Hero:** one H1, target-customer context, immediate customer problem and business outcome, primary and secondary CTAs, and an actual WattWise product visual without fabricated results.
3. **Trust strip:** simple manual input, no additional hardware, transparent estimates, isolated business data, and clear non-affiliation with PLN.
4. **Customer problem:** four concise problems, each connected to a WattWise workflow.
5. **Product story:** Catat, Pahami, Tentukan Prioritas, and Laporkan, with product evidence that changes alongside the story on desktop and stacked cards on mobile.
6. **Product proof:** only implemented dashboard, electricity input, optional OCR assistance, prediction/analysis, recommendations, and report capabilities. Every proof explains the capability, customer outcome, and relevant limitation.
7. **Benefits:** business outcomes, without guaranteed savings.
8. **Personas:** exactly three groups—kos/small property; laundry/energy-intensive UMKM; shops/culinary/businesses with high-power equipment—each with a problem, WattWise workflow, and practical outcome.
9. **Transparency:** visible explanations of estimates, user-entered-data dependence, decision-support limits, manual equipment inspection, no official PLN relationship, no sensor-based real-time measurement, and no official-bill claim.
10. **Plan and trial teaser:** only accurate Free and Pro Trial behavior; no real payment, no card collection, sandbox billing, and registration continuing through the existing plan-choice journey.
11. **Final CTA:** a clear path to start, demo/login, or dashboard, with brief reassurance about manual input, no additional hardware, no real payment for trial, and estimated outputs.
12. **Footer:** only functioning anchors and routes; no invented privacy, contact, or legal destinations.

CTA behavior must preserve current authentication behavior:

- guest with demo ready: primary “Coba Demo WattWise” to the existing login route and secondary “Mulai Gratis” to the registration route;
- guest with demo unavailable: primary “Mulai Gratis” to registration and secondary “Masuk” to login;
- authenticated user: primary “Buka Dashboard” to the dashboard route.

## 7. GSAP boundaries

Use the installed `gsap` package only—no CDN—and only GSAP Core, Timeline, ScrollTrigger, `gsap.context()`, and `gsap.matchMedia()`. Do not add another animation framework, smooth-scroll or scroll-jacking libraries, WebGL/Canvas engines, autoplay background video, or premium plugins.

Animation strengthens comprehension and never replaces readable content:

- initialize after Vue mounts using a landing root ref;
- register ScrollTrigger once;
- scope selectors and animations through `gsap.context()`;
- use `gsap.matchMedia()` for desktop, mobile, and reduced-motion behavior;
- revert context/match-media state on unmount so Inertia visits cannot accumulate triggers;
- keep the hero CTA immediately usable and animate the eyebrow, headline, support copy, CTA group, and product visual with restrained opacity, translate, scale, stagger, and easing;
- group section reveals rather than triggering every word;
- animate transform and opacity, not layout properties;
- allow desktop-only, reasonably short product-story pinning without snap, scroll trapping, required horizontal scroll, or repeated refresh calls;
- keep mobile content stacked with short reveals and native scrolling;
- use CSS for hover, focus, and small state changes;
- render all content visible and readable before JavaScript initializes or if JavaScript fails.

Official GSAP Showcase work may inform timing, visual rhythm, scroll storytelling, depth, section transitions, and product-focused motion only. No source code, layout, copy, color system, media, branding, proprietary artwork, or exact animation sequence may be copied.

## 8. Safe product wording

Use terms such as “estimasi,” “indikasi,” “kandidat,” “perlu ditinjau,” “berdasarkan data yang dimasukkan,” “rekomendasi,” “bantuan pengambilan keputusan,” and “verifikasi manual.” Preserve the existing disclaimer meaning.

Never state or imply that WattWise:

- identifies the definite cause of electricity use;
- detects broken appliances;
- measures real-time appliance use without sensors;
- reads official PLN data, replaces PLN Mobile, or is affiliated with PLN;
- guarantees predictions, savings, recommendations, or outcomes;
- produces an official electricity bill.

Do not invent customer counts, testimonials, partner/customer logos, awards, press mentions, savings percentages, performance benchmarks, usage statistics, or result metrics. Existing `18%`, `Rp180rb`, and `7+` values are removed from the primary journey and must not appear as customer outcomes.

## 9. Accessibility requirements

- Exactly one H1 and a semantic heading hierarchy within header, main, section, navigation, and footer landmarks.
- Keyboard-accessible mobile menu using real buttons and links, meaningful accessible names, visible focus rings, no click-only non-button controls, and no focus trap.
- Meaningful alt text for product evidence; decorative visuals hidden from assistive technology.
- Sufficient color contrast and no color-only meaning.
- Content understandable and CTAs functional without motion.
- No horizontal overflow at 320 px and no clipping from large typography.
- Respect `prefers-reduced-motion: reduce`: no pinning, scrub, parallax, or large movement; all content remains immediately visible with at most minimal opacity transitions.

## 10. Performance requirements

- Record the frontend bundle before and after implementation, including GSAP contribution and an acceptability assessment.
- Use optimized WebP or another efficient format where practical, explicit dimensions or aspect ratios, eager loading for the critical hero visual when beneficial, and lazy loading below the fold.
- Do not add giant video, heavy background media, continuous animation loops, unnecessary external fonts, or off-screen work.
- Use transform/opacity, prevent GSAP layout shift, keep scroll distance reasonable, clean up animations on navigation, and do not repeatedly call `ScrollTrigger.refresh()` during scrolling.
- The Vite production build, TypeScript, lint, formatting, OCR regression, and application test gates must remain healthy with zero new violations over baseline.

## 11. Acceptance criteria

1. `/` returns HTTP 200 and renders the new primary product headline, customer problem, and main CTA.
2. Guest registration uses the current registration route; guest demo/login uses the current login route; authenticated users receive a dashboard CTA.
3. Demo-ready and demo-unavailable CTA labels and fallback behavior match the approved matrix without changing authentication logic.
4. The page follows the required section order and uses concise Indonesian, customer-outcome-led copy.
5. Roadmap navigation, Week 1–Week 8 content, engineering milestones, technology-first explanations, launch-readiness language, plan-gating-as-feature copy, repetitive grids, and unsupported metrics are absent.
6. Product visuals are actual approved WattWise screenshots or accurate compositions derived from the implemented application, without credentials or personal data.
7. The GSAP story implements Catat, Pahami, Tentukan Prioritas, and Laporkan; desktop may pin within a reasonable span while mobile remains stacked and natively scrollable.
8. Reduced motion disables pinning/scrubbing/large movement and leaves every item visible and usable.
9. Mandatory transparency wording is prominent, safe wording is not weakened, and no forbidden or fabricated proof appears.
10. The page is keyboard accessible, has visible focus, one H1, no dead links, no 320 px overflow, and no motion-dependent comprehension.
11. GSAP initializes exactly once per landing visit and fully cleans up after Inertia navigation.
12. Required automated gates and manual browser QA pass or pre-existing baseline failures are recorded accurately with zero new violations.

## 12. Out-of-scope items

The task does not modify dashboard or authenticated navigation, registration business logic, trial activation, journey middleware, onboarding, electricity/revenue/appliance/prediction/anomaly/recommendation/report/billing/WhatsApp behavior, demo repair, `/up`, `/up/demo`, database schema, Railway variables/environments, production, legacy Next.js, Prisma, ML files, `bengkel/*`, GitHub Actions, or release tags. IT-P0-02 is not started. No third-party design or unlicensed asset is copied. No landing change creates new product capability.

## 13. Testing requirements

Focused automated coverage must verify:

1. landing HTTP 200;
2. primary headline;
3. customer problem;
4. main CTA;
5. current registration route;
6. current login/demo route;
7. authenticated dashboard CTA;
8. mandatory transparency wording;
9. Week 1–Week 8 absence;
10. Roadmap navigation absence;
11. unsupported metric absence;
12. unsafe claim absence;
13. no fake testimonials or customer logos;
14. referenced landing assets exist;
15. demo-ready CTA label;
16. demo-unavailable safe fallback.

Do not weaken `SafeWordingRegressionTest`. Run `php artisan test`, `composer audit`, `npm run lint:check`, `npm run format:check`, `npm run types:check`, `npm run test:meter-ocr`, `npm run build`, and `git diff --check`; run PHPStan and Pint test on changed PHP files, plus Prettier on every changed Vue/TS file. Record main baseline and branch results, distinguishing pre-existing failures from new violations.

Manual browser QA covers 1440×900, 1280×720, 1024×768, 768×1024, 390×844, and 320×568. Verify first load, CTAs, anchors, sticky navigation, mobile menu, desktop story pinning, mobile stacking, reduced motion, keyboard/focus, overflow, scroll behavior, pre-animation visibility, console/assets/links, Inertia leave-and-return behavior, and duplicate-trigger absence. Capture safe desktop hero/product-story/transparency-final-CTA and mobile hero/product-story/menu screenshots under an approved documentation path without credentials or private data.

## 14. Definition of Done

- The diff is limited to the public landing page, landing-specific Vue components/composable/assets, focused landing tests, GSAP dependency files, this specification, and approved QA documentation assets.
- Every changed file maps directly to this specification or the guidebook in the pre-commit scope compliance table.
- Product messaging is outcome-led, accurate, transparent, and free of unsupported claims or invented proof.
- Responsive, keyboard, focus, semantic, contrast, reduced-motion, no-animation, and 320 px requirements are verified.
- GSAP uses the approved API subset, desktop/mobile behavior is appropriate, and all animations/ScrollTriggers clean up on unmount.
- Backend tests, Composer audit, ESLint, Prettier, Vue TypeScript, OCR regression, Vite build, PHPStan/Pint for changed PHP, and diff check meet the zero-new-violation requirement.
- Before/after bundle sizes, GSAP contribution, asset optimization, browser console result, all required viewports, and safe screenshots are recorded.
- Pre-commit scope and secret audit passes; only explicit files are staged.
- One commit named `feat(landing): strengthen product story with GSAP` is pushed normally to `feature/gsap-product-landing`.
- One non-draft, open PR titled `feat(landing): strengthen WattWise product story with GSAP` targets `main`, remains unmerged, and confirms no production action, no IT-P0-02 work, and no adjacent product changes.
