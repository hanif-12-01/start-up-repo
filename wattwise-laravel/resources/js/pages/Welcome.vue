<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import LandingBenefitsPersonas from '@/components/landing/LandingBenefitsPersonas.vue';
import LandingFooter from '@/components/landing/LandingFooter.vue';
import LandingHero from '@/components/landing/LandingHero.vue';
import LandingNavigation from '@/components/landing/LandingNavigation.vue';
import LandingProductStory from '@/components/landing/LandingProductStory.vue';
import LandingProof from '@/components/landing/LandingProof.vue';
import LandingTransparencyCta from '@/components/landing/LandingTransparencyCta.vue';
import LandingTrustProblems from '@/components/landing/LandingTrustProblems.vue';
import { useLandingAnimations } from '@/composables/useLandingAnimations';
import type { DemoState } from '@/types/demo';

const props = defineProps<{
    demo: DemoState;
}>();

const page = usePage();
const landingRoot = ref<HTMLElement | null>(null);
const authenticated = computed(() => Boolean(page.props.auth.user));

useLandingAnimations(landingRoot);
</script>

<template>
    <Head title="Biaya Listrik Lebih Terkendali" />

    <div
        ref="landingRoot"
        class="min-h-screen overflow-x-clip bg-[#f7f4ec] font-sans text-slate-800 antialiased"
    >
        <LandingNavigation
            :authenticated="authenticated"
            :demo-ready="props.demo.ready"
        />

        <main>
            <LandingHero
                :authenticated="authenticated"
                :demo-ready="props.demo.ready"
            />
            <LandingTrustProblems />
            <LandingProductStory />
            <LandingProof />
            <LandingBenefitsPersonas />
            <LandingTransparencyCta
                :authenticated="authenticated"
                :demo-ready="props.demo.ready"
            />
        </main>

        <LandingFooter
            :authenticated="authenticated"
            :demo-ready="props.demo.ready"
        />
    </div>
</template>

<style>
html {
    scroll-behavior: smooth;
    scroll-padding-top: 5rem;
}

@media (prefers-reduced-motion: reduce) {
    html {
        scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
</style>
