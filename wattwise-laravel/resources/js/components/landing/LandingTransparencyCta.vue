<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import {
    ArrowRight,
    Check,
    CircleDollarSign,
    Eye,
    ShieldAlert,
} from '@lucide/vue';
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

const transparencyPoints = [
    'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
    'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
    'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
    'Rekomendasi adalah bantuan pengambilan keputusan; kandidat peralatan memerlukan verifikasi manual.',
    'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.',
];

const plans = [
    {
        name: 'Free',
        summary:
            'Mulai mencatat dan mengenal alur WattWise melalui perjalanan pendaftaran yang tersedia.',
        points: [
            'Registrasi melalui rute yang ada',
            'Pilihan paket setelah pendaftaran',
            'Tanpa alat tambahan',
        ],
    },
    {
        name: 'Pro Trial',
        summary:
            'Mencoba akses trial tanpa pembayaran nyata atau pengumpulan kartu.',
        points: [
            'Tidak memerlukan pembayaran nyata',
            'Tidak ada pengumpulan kartu',
            'Billing tetap sandbox',
        ],
    },
];
</script>

<template>
    <section id="transparansi" class="bg-[#102a2d] py-20 text-white sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
                data-reveal-group
                class="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16"
            >
                <div class="max-w-xl">
                    <div class="flex items-center gap-3 text-emerald-300">
                        <Eye class="h-5 w-5" aria-hidden="true" />
                        <p
                            class="text-xs font-bold tracking-[0.18em] uppercase"
                        >
                            Transparansi
                        </p>
                    </div>
                    <h2
                        class="mt-5 text-4xl leading-tight font-semibold tracking-[-0.05em] sm:text-6xl"
                    >
                        Batasan yang terlihat membangun keputusan yang lebih
                        sehat.
                    </h2>
                    <p class="mt-6 text-base leading-7 text-slate-300">
                        WattWise membantu membaca data yang Anda masukkan. Ia
                        tidak menggantikan meter resmi, pemeriksaan teknisi,
                        atau tagihan listrik resmi.
                    </p>
                </div>

                <div
                    class="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04]"
                >
                    <article
                        v-for="(point, index) in transparencyPoints"
                        :key="point"
                        data-transparency-item
                        class="grid gap-4 border-b border-white/10 p-6 last:border-b-0 sm:grid-cols-[auto_1fr] sm:p-7"
                    >
                        <span
                            class="grid h-9 w-9 place-items-center rounded-full bg-emerald-300 text-sm font-bold text-[#102a2d]"
                            aria-hidden="true"
                            >0{{ index + 1 }}</span
                        >
                        <p
                            class="text-sm leading-6 text-slate-200 sm:text-base sm:leading-7"
                        >
                            {{ point }}
                        </p>
                    </article>
                </div>
            </div>
        </div>
    </section>

    <section id="paket" class="bg-[#f7f4ec] py-20 sm:py-28">
        <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div data-reveal-group class="mx-auto max-w-3xl text-center">
                <div
                    class="mx-auto flex w-fit items-center gap-2 text-emerald-800"
                >
                    <CircleDollarSign class="h-5 w-5" aria-hidden="true" />
                    <p class="text-xs font-bold tracking-[0.18em] uppercase">
                        Mulai tanpa pembayaran nyata
                    </p>
                </div>
                <h2
                    class="mt-5 text-4xl font-semibold tracking-[-0.05em] text-[#102a2d] sm:text-5xl"
                >
                    Kenali alurnya melalui Free atau Pro Trial.
                </h2>
                <p class="mt-5 text-base leading-7 text-slate-600">
                    Pendaftaran tetap melanjutkan ke pilihan paket yang sudah
                    ada. IT-UI-01 tidak mengubah aktivasi trial atau billing.
                </p>
            </div>

            <div class="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
                <article
                    v-for="plan in plans"
                    :key="plan.name"
                    data-plan-card
                    class="rounded-3xl border border-slate-900/10 bg-white p-7 shadow-sm sm:p-8"
                >
                    <p
                        class="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase"
                    >
                        {{ plan.name }}
                    </p>
                    <h3
                        class="mt-4 text-2xl leading-snug font-semibold tracking-[-0.03em] text-[#102a2d]"
                    >
                        {{ plan.summary }}
                    </h3>
                    <ul class="mt-7 space-y-3">
                        <li
                            v-for="point in plan.points"
                            :key="point"
                            class="flex items-start gap-3 text-sm leading-6 text-slate-600"
                        >
                            <Check
                                class="mt-1 h-4 w-4 shrink-0 text-emerald-700"
                                aria-hidden="true"
                            />
                            {{ point }}
                        </li>
                    </ul>
                </article>
            </div>
            <div
                class="mx-auto mt-7 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-900/15 bg-amber-50 p-5 text-sm leading-6 text-amber-950"
            >
                <ShieldAlert
                    class="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                />
                Trial tidak memerlukan pembayaran nyata, tidak mengumpulkan
                kartu, dan billing tetap sandbox.
            </div>
        </div>
    </section>

    <section class="bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div
            data-final-cta
            class="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-emerald-600 px-6 py-14 text-center text-white sm:px-10 sm:py-18 lg:px-16 lg:py-22"
        >
            <div
                class="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl"
                aria-hidden="true"
            />
            <div class="relative mx-auto max-w-4xl">
                <p
                    class="text-xs font-bold tracking-[0.18em] text-emerald-100 uppercase"
                >
                    Langkah berikutnya
                </p>
                <h2
                    class="mt-5 text-4xl leading-tight font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl"
                >
                    Mulai memahami biaya listrik usaha Anda.
                </h2>
                <p
                    class="mx-auto mt-6 max-w-2xl text-base leading-7 text-emerald-50"
                >
                    Mulai dengan input manual, tanpa alat tambahan. Trial tanpa
                    pembayaran nyata dan hasil WattWise bersifat estimasi.
                </p>
                <div
                    class="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
                >
                    <Link
                        :href="primaryHref"
                        class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#102a2d] px-7 py-3 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                    >
                        {{ primaryLabel }}
                        <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                        v-if="!authenticated"
                        :href="secondaryHref"
                        class="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                    >
                        {{ secondaryLabel }}
                    </Link>
                </div>
            </div>
        </div>
    </section>
</template>
