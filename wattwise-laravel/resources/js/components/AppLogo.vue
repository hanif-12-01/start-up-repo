<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue';
</script>

<template>
    <div
        class="flex aspect-square size-10 items-center justify-center rounded-full bg-background text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.16)] ring-1 ring-white/15 dark:bg-card"
    >
        <AppLogoIcon class="size-6" aria-hidden="true" />
    </div>
    <div class="ml-1.5 grid flex-1 text-left">
        <span
            class="truncate text-[15px] leading-tight font-bold tracking-[-0.02em] text-white"
        >
            WattWise
        </span>
        <span class="mt-0.5 truncate text-[10px] font-medium text-slate-400">
            Listrik usaha lebih jelas
        </span>
    </div>
</template>
