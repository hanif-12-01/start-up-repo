<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowUpRight, Menu, X, Zap } from '@lucide/vue';
import { computed, ref } from 'vue';
import { dashboard, login, register } from '@/routes';

const props = defineProps<{
    authenticated: boolean;
    demoReady: boolean;
}>();

const menuOpen = ref(false);

const navLinks = [
    { label: 'Produk', href: '#produk' },
    { label: 'Cara Kerja', href: '#cara-kerja' },
    { label: 'Manfaat', href: '#manfaat' },
    { label: 'Untuk Siapa', href: '#untuk-siapa' },
    { label: 'Transparansi', href: '#transparansi' },
];

const primaryLabel = computed(() => {
    if (props.authenticated) {
        return 'Buka Dashboard';
    }

    return props.demoReady ? 'Masuk ke Demo WattWise' : 'Mulai Gratis';
});

const primaryHref = computed(() => {
    if (props.authenticated) {
        return dashboard();
    }

    return props.demoReady ? login() : register();
});

function closeMenu() {
    menuOpen.value = false;
}

function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        closeMenu();
    }
}
</script>

<template>
    <header
        class="sticky top-0 z-50 border-b border-slate-900/10 bg-[#f7f4ec]/90 backdrop-blur-xl"
        @keydown="handleEscape"
    >
        <div
            class="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
            <Link
                href="/"
                class="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
                aria-label="WattWise AI, halaman utama"
                @click="closeMenu"
            >
                <span
                    class="grid h-10 w-10 place-items-center rounded-full bg-[#102a2d] text-emerald-300 transition-transform group-hover:-rotate-6"
                    aria-hidden="true"
                >
                    <Zap class="h-5 w-5 fill-current" />
                </span>
                <span
                    class="text-lg font-semibold tracking-[-0.03em] text-[#102a2d]"
                    >WattWise AI</span
                >
            </Link>

            <nav
                class="hidden items-center gap-6 lg:flex"
                aria-label="Navigasi utama"
            >
                <a
                    v-for="item in navLinks"
                    :key="item.href"
                    :href="item.href"
                    class="rounded-md text-sm font-medium text-slate-700 transition-colors hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
                >
                    {{ item.label }}
                </a>
            </nav>

            <div class="hidden items-center gap-3 lg:flex">
                <Link
                    v-if="!authenticated"
                    :href="login()"
                    class="rounded-lg px-3 py-2 text-sm font-semibold text-[#102a2d] transition-colors hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                    Masuk
                </Link>
                <Link
                    :href="primaryHref"
                    class="inline-flex items-center gap-2 rounded-full bg-[#102a2d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                    {{ primaryLabel }}
                    <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>

            <button
                type="button"
                class="grid h-11 w-11 place-items-center rounded-full border border-slate-900/15 text-[#102a2d] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:hidden"
                :aria-expanded="menuOpen"
                aria-controls="landing-mobile-menu"
                :aria-label="menuOpen ? 'Tutup menu' : 'Buka menu'"
                @click="menuOpen = !menuOpen"
            >
                <X v-if="menuOpen" class="h-5 w-5" aria-hidden="true" />
                <Menu v-else class="h-5 w-5" aria-hidden="true" />
            </button>
        </div>

        <nav
            v-if="menuOpen"
            id="landing-mobile-menu"
            class="border-t border-slate-900/10 bg-[#f7f4ec] px-4 pt-3 pb-5 lg:hidden"
            aria-label="Navigasi seluler"
        >
            <div class="mx-auto flex max-w-7xl flex-col">
                <a
                    v-for="item in navLinks"
                    :key="item.href"
                    :href="item.href"
                    class="rounded-lg px-3 py-3 text-base font-medium text-slate-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-600"
                    @click="closeMenu"
                >
                    {{ item.label }}
                </a>
                <div
                    class="mt-3 grid gap-2 border-t border-slate-900/10 pt-4 sm:grid-cols-2"
                >
                    <Link
                        v-if="!authenticated"
                        :href="login()"
                        class="rounded-full border border-slate-900/15 px-5 py-3 text-center text-sm font-semibold text-[#102a2d] focus-visible:outline-2 focus-visible:outline-emerald-600"
                        @click="closeMenu"
                    >
                        Masuk
                    </Link>
                    <Link
                        :href="primaryHref"
                        class="rounded-full bg-[#102a2d] px-5 py-3 text-center text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        @click="closeMenu"
                    >
                        {{ primaryLabel }}
                    </Link>
                </div>
            </div>
        </nav>
    </header>
</template>
