<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import AppLogoIcon from '@/components/AppLogoIcon.vue';
import { login, register } from '@/routes';

defineProps<{
    authenticated: boolean;
    demoReady: boolean;
}>();

const footerLinks = [
    { label: 'Produk', href: '#produk' },
    { label: 'Cara Kerja', href: '#cara-kerja' },
    { label: 'Transparansi', href: '#transparansi' },
    { label: 'Disclaimer', href: '#transparansi' },
];
</script>

<template>
    <footer class="border-t border-slate-900/10 bg-[#f7f4ec] py-10">
        <div
            class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8"
        >
            <div>
                <a
                    href="#produk"
                    class="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    aria-label="Kembali ke bagian produk WattWise AI"
                >
                    <span
                        class="grid h-9 w-9 place-items-center rounded-full bg-[#0F172A] text-white"
                        aria-hidden="true"
                    >
                        <AppLogoIcon class="h-4.5 w-4.5" />
                    </span>
                    <span
                        class="font-semibold tracking-[-0.02em] text-[#0F172A]"
                        >WattWise AI</span
                    >
                </a>
                <p class="mt-4 max-w-lg text-sm leading-6 text-slate-600">
                    Electricity cost intelligence untuk kos, properti kecil, dan
                    UMKM padat energi. Bukan aplikasi resmi PLN.
                </p>
            </div>

            <nav
                class="flex flex-wrap gap-x-5 gap-y-3 text-sm"
                aria-label="Navigasi footer"
            >
                <a
                    v-for="item in footerLinks"
                    :key="item.label"
                    :href="item.href"
                    class="rounded-md font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >{{ item.label }}</a
                >
                <Link
                    v-if="!authenticated && demoReady"
                    :href="login()"
                    class="rounded-md font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >Demo</Link
                >
                <Link
                    v-if="!authenticated"
                    :href="login()"
                    class="rounded-md font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >Masuk</Link
                >
                <Link
                    v-if="!authenticated"
                    :href="register()"
                    class="rounded-md font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >Daftar</Link
                >
            </nav>
        </div>
        <div
            class="mx-auto mt-8 max-w-7xl border-t border-slate-900/10 px-4 pt-6 text-xs text-slate-500 sm:px-6 lg:px-8"
        >
            © 2026 WattWise AI · Hasil analisis bersifat estimasi berdasarkan
            data yang dimasukkan.
        </div>
    </footer>
</template>
