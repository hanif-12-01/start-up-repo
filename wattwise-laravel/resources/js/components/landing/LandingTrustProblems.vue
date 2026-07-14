<script setup lang="ts">
import {
    ArrowDownRight,
    Building2,
    FileSearch,
    Gauge,
    HandCoins,
    ShieldCheck,
    Wrench,
} from '@lucide/vue';

const trustPoints = [
    'Input manual sederhana',
    'Tanpa alat tambahan',
    'Estimasi transparan',
    'Data usaha terisolasi',
    'Bukan aplikasi resmi PLN',
];

const problems = [
    {
        icon: FileSearch,
        title: 'Tagihan berubah, tetapi konteksnya tidak jelas',
        body: 'WattWise menyusun catatan per periode agar perubahan pemakaian dan biaya lebih mudah ditinjau.',
        flow: 'Catat → bandingkan tren',
    },
    {
        icon: HandCoins,
        title: 'Biaya listrik sulit dibandingkan dengan pendapatan',
        body: 'Masukkan pendapatan sesuai opsi yang tersedia untuk melihat porsi listrik dalam konteks usaha.',
        flow: 'Masukkan → lihat porsinya',
    },
    {
        icon: Wrench,
        title: 'Pemeriksaan alat belum memiliki prioritas',
        body: 'Daftar peralatan membantu menyusun kandidat yang perlu ditinjau dan tetap memerlukan verifikasi manual.',
        flow: 'Tinjau → tentukan prioritas',
    },
    {
        icon: Building2,
        title: 'Laporan bulanan tersebar atau sulit dibaca',
        body: 'Ringkasan PDF dan CSV membantu membawa data yang lebih rapi ke evaluasi bulanan.',
        flow: 'Rangkum → evaluasi',
    },
];
</script>

<template>
    <section
        aria-label="Kepercayaan produk"
        class="border-y border-slate-900/10 bg-[#0F172A] text-white"
    >
        <ul
            class="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:divide-x lg:divide-y-0 lg:px-8"
        >
            <li
                v-for="point in trustPoints"
                :key="point"
                class="flex items-center gap-3 py-4 text-sm font-medium lg:px-4 lg:first:pl-0"
            >
                <ShieldCheck
                    v-if="point === 'Data usaha terisolasi'"
                    class="h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                />
                <Gauge
                    v-else
                    class="h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                />
                {{ point }}
            </li>
        </ul>
    </section>

    <section id="masalah" data-reveal-group class="bg-white py-20 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
                <div class="max-w-xl">
                    <p
                        class="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase"
                    >
                        Masalah sehari-hari
                    </p>
                    <h2
                        class="mt-4 text-4xl leading-tight font-semibold tracking-[-0.045em] text-[#0F172A] sm:text-5xl"
                    >
                        Biaya berjalan terus. Konteksnya sering tertinggal.
                    </h2>
                    <p class="mt-5 text-base leading-7 text-slate-600">
                        WattWise menghubungkan setiap masalah ke alur kerja yang
                        sederhana—bukan ke analitik yang harus dipelajari
                        berhari-hari.
                    </p>
                </div>

                <div
                    class="grid gap-px overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-900/10 sm:grid-cols-2"
                >
                    <article
                        v-for="problem in problems"
                        :key="problem.title"
                        class="group bg-[#f7f4ec] p-6 sm:p-8"
                    >
                        <component
                            :is="problem.icon"
                            class="h-6 w-6 text-emerald-700"
                            aria-hidden="true"
                        />
                        <h3
                            class="mt-8 text-xl leading-snug font-semibold tracking-[-0.025em] text-[#0F172A]"
                        >
                            {{ problem.title }}
                        </h3>
                        <p class="mt-3 text-sm leading-6 text-slate-600">
                            {{ problem.body }}
                        </p>
                        <p
                            class="mt-6 inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase"
                        >
                            {{ problem.flow }}
                            <ArrowDownRight
                                class="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:translate-y-1"
                                aria-hidden="true"
                            />
                        </p>
                    </article>
                </div>
            </div>
        </div>
    </section>
</template>
