<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem } from '@/types';

withDefaults(
    defineProps<{
        breadcrumbs?: BreadcrumbItem[];
    }>(),
    {
        breadcrumbs: () => [],
    },
);
</script>

<template>
    <header
        class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl transition-[width,height] ease-linear md:px-6 dark:border-white/10 dark:bg-background/80"
        role="banner"
    >
        <SidebarTrigger
            class="-ml-1 rounded-lg border border-border bg-background shadow-sm hover:bg-primary/5 hover:text-primary dark:border-white/10 dark:bg-card"
            aria-label="Buka atau tutup menu"
        />
        <template v-if="breadcrumbs && breadcrumbs.length > 0">
            <Breadcrumbs :breadcrumbs="breadcrumbs" />
        </template>
    </header>
</template>
