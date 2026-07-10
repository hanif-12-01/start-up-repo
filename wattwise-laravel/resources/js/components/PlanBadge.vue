<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

/**
 * Dynamic plan badge. Renders the authenticated user's effective plan from the
 * shared `effectivePlan` contract (App\Services\FeatureGateService). There is no
 * hardcoded plan state here — FREE users show "Gratis", trial users show
 * "Pro Trial — tersisa X hari", paid users show their real plan label.
 */
const page = usePage();
const effectivePlan = computed(() => page.props.effectivePlan);
const isActiveTrial = computed(
    () => !!effectivePlan.value?.is_trial && !effectivePlan.value?.is_expired,
);
</script>

<template>
    <span
        v-if="effectivePlan"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400"
    >
        {{ effectivePlan.label }}
        <span v-if="isActiveTrial" class="font-semibold opacity-80">
            — tersisa {{ effectivePlan.remaining_trial_days }} hari
        </span>
    </span>
</template>
