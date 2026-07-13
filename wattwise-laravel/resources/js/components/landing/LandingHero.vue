<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowRight, CheckCircle2 } from '@lucide/vue';
import { computed } from 'vue';
import { dashboard, login, register } from '@/routes';

const props = defineProps<{
    authenticated: boolean;
    demoReady: boolean;
}>();

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

const secondaryLabel = computed(() =>
    props.demoReady ? 'Mulai Gratis' : 'Masuk',
);
const secondaryHref = computed(() => (props.demoReady ? register() : login()));
</script>

<template>
    <section
        id="produk"
        class="relative overflow-hidden bg-[#f7f4ec] pt-12 pb-18 sm:pt-18 sm:pb-24 lg:pt-22"
    >
        <div
            class="pointer-events-none absolute top-16 -right-40 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl"
            aria-hidden="true"
        />
        <div
            class="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8"
        >
            <div class="max-w-2xl">
                <p
                    data-hero-eyebrow
                    class="mb-6 inline-flex items-center rounded-full border border-emerald-900/15 bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.16em] text-emerald-800 uppercase"
                >
                    Untuk kos, properti kecil, dan UMKM padat energi
                </p>
                <h1
                    data-hero-title
                    class="max-w-3xl text-[clamp(2.75rem,6.2vw,5.85rem)] leading-[0.96] font-semibold tracking-[-0.065em] text-[#102a2d]"
                >
                    Biaya listrik lebih terkendali.
                    <span class="mt-2 block text-emerald-700"
                        >Keputusan usaha lebih percaya diri.</span
                    >
                </h1>
                <p
                    data-hero-copy
                    class="mt-7 max-w-xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8"
                >
                    Catat pemakaian dan tagihan, lihat dampaknya terhadap
                    pendapatan, lalu dapatkan arahan yang dapat diperiksa dan
                    ditindaklanjuti.
                </p>
                <div
                    data-hero-cta
                    class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <Link
                        :href="primaryHref"
                        class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_35px_rgba(5,150,105,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                        {{ primaryLabel }}
                        <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                        v-if="!authenticated"
                        :href="secondaryHref"
                        class="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-900/20 bg-white/60 px-6 py-3 text-sm font-bold text-[#102a2d] transition duration-200 hover:border-emerald-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                        {{ secondaryLabel }}
                    </Link>
                </div>
                <p
                    v-if="demoReady && !authenticated"
                    class="mt-3 text-sm leading-6 text-slate-600"
                >
                    Anda akan diarahkan ke halaman login demo terkontrol.
                </p>
                <ul
                    class="mt-7 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5"
                >
                    <li class="inline-flex items-center gap-2">
                        <CheckCircle2
                            class="h-4 w-4 text-emerald-600"
                            aria-hidden="true"
                        />
                        Mulai dari input manual
                    </li>
                    <li class="inline-flex items-center gap-2">
                        <CheckCircle2
                            class="h-4 w-4 text-emerald-600"
                            aria-hidden="true"
                        />
                        Tanpa alat tambahan
                    </li>
                </ul>
            </div>

            <div
                data-hero-visual
                class="relative mx-auto w-full max-w-3xl lg:mx-0"
            >
                <div
                    class="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-300/40 via-transparent to-teal-900/15 blur-2xl"
                    aria-hidden="true"
                />
                <figure
                    class="relative overflow-hidden rounded-[1.25rem] border border-slate-900/15 bg-white p-2 shadow-[0_30px_80px_rgba(15,42,45,0.18)] sm:rounded-[1.75rem] sm:p-3"
                >
                    <img
                        src="/images/landing/dashboard-overview.webp"
                        width="1440"
                        height="900"
                        alt="Dashboard WattWise menampilkan ringkasan biaya dan tren listrik dari data usaha contoh."
                        class="aspect-[16/10] w-full rounded-[0.9rem] object-cover object-top sm:rounded-[1.2rem]"
                        fetchpriority="high"
                        decoding="async"
                    />
                    <figcaption
                        class="flex items-center justify-between gap-3 px-2 pt-3 pb-1 text-xs text-slate-600 sm:px-3 sm:text-sm"
                    >
                        <span class="font-semibold text-[#102a2d]"
                            >Dashboard WattWise aktual</span
                        >
                        <span>Data demo terkontrol</span>
                    </figcaption>
                </figure>
            </div>
        </div>
    </section>
</template>
