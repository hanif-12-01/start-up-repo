import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

gsap.registerPlugin(ScrollTrigger);

type LandingConditions = {
    desktop: boolean;
    mobile: boolean;
    reduceMotion: boolean;
};

export function useLandingAnimations(root: Ref<HTMLElement | null>) {
    let context: gsap.Context | undefined;
    let media: gsap.MatchMedia | undefined;

    onMounted(() => {
        const scope = root.value;

        if (!scope) {
            return;
        }

        context = gsap.context(() => {
            media = gsap.matchMedia();

            media.add(
                {
                    desktop:
                        '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
                    mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (matchMediaContext) => {
                    const { desktop, mobile, reduceMotion } =
                        matchMediaContext.conditions as LandingConditions;

                    if (reduceMotion) {
                        gsap.set(
                            '[data-hero-eyebrow], [data-hero-title], [data-hero-copy], [data-hero-cta], [data-hero-visual], [data-reveal-group], [data-story-mobile]',
                            {
                                clearProps: 'all',
                            },
                        );

                        return;
                    }

                    const heroTimeline = gsap.timeline({
                        defaults: { duration: 0.62, ease: 'power3.out' },
                    });

                    heroTimeline
                        .from('[data-hero-eyebrow]', { autoAlpha: 0.7, y: 14 })
                        .from(
                            '[data-hero-title]',
                            { autoAlpha: 0.7, y: 24 },
                            '-=0.38',
                        )
                        .from(
                            '[data-hero-copy]',
                            { autoAlpha: 0.75, y: 18 },
                            '-=0.38',
                        )
                        .from('[data-hero-cta]', { y: 12 }, '-=0.34')
                        .from(
                            '[data-hero-visual]',
                            { autoAlpha: 0.78, scale: 0.985, y: 20 },
                            '-=0.44',
                        );

                    gsap.utils
                        .toArray<HTMLElement>('[data-reveal-group]')
                        .forEach((group) => {
                            gsap.from(group.children, {
                                autoAlpha: 0.82,
                                y: 22,
                                duration: 0.62,
                                stagger: 0.08,
                                ease: 'power2.out',
                                scrollTrigger: {
                                    trigger: group,
                                    start: 'top 84%',
                                    once: true,
                                },
                            });
                        });

                    if (desktop) {
                        const shell = scope.querySelector<HTMLElement>(
                            '.product-story-shell',
                        );
                        const visual = scope.querySelector<HTMLElement>(
                            '.product-story-visual',
                        );
                        const stages =
                            gsap.utils.toArray<HTMLElement>(
                                '[data-story-stage]',
                            );
                        const visuals = gsap.utils.toArray<HTMLElement>(
                            '[data-story-visual]',
                        );

                        if (
                            shell &&
                            visual &&
                            stages.length === visuals.length
                        ) {
                            gsap.set(visuals, { autoAlpha: 0 });
                            gsap.set(visuals[0], { autoAlpha: 1 });

                            ScrollTrigger.create({
                                trigger: shell,
                                pin: visual,
                                pinSpacing: false,
                                start: 'top 96px',
                                end: 'bottom bottom-=80',
                                invalidateOnRefresh: true,
                            });

                            stages.forEach((stage, index) => {
                                const showVisual = () => {
                                    gsap.to(visuals, {
                                        autoAlpha: 0,
                                        duration: 0.28,
                                        overwrite: true,
                                    });
                                    gsap.to(visuals[index], {
                                        autoAlpha: 1,
                                        duration: 0.52,
                                        ease: 'power2.out',
                                        overwrite: true,
                                    });
                                };

                                ScrollTrigger.create({
                                    trigger: stage,
                                    start: 'top 58%',
                                    end: 'bottom 42%',
                                    onEnter: showVisual,
                                    onEnterBack: showVisual,
                                });
                            });
                        }
                    }

                    if (mobile) {
                        gsap.utils
                            .toArray<HTMLElement>('[data-story-mobile]')
                            .forEach((card) => {
                                gsap.from(card, {
                                    autoAlpha: 0.86,
                                    y: 18,
                                    duration: 0.48,
                                    ease: 'power2.out',
                                    scrollTrigger: {
                                        trigger: card,
                                        start: 'top 88%',
                                        once: true,
                                    },
                                });
                            });
                    }
                },
            );
        }, scope);
    });

    onUnmounted(() => {
        media?.revert();
        context?.revert();
        media = undefined;
        context = undefined;
    });
}
