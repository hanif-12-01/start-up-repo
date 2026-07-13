<script setup lang="ts">
import {
    BarChart3,
    ClipboardPenLine,
    FileOutput,
    ListChecks,
} from '@lucide/vue';

const stages = [
    {
        label: 'Catat',
        icon: ClipboardPenLine,
        image: '/images/landing/electricity-input.webp',
        alt: 'Form input listrik WattWise untuk mencatat tagihan, token, kWh, atau meter reading.',
        title: 'Mulai dari data yang memang Anda punya.',
        body: 'Catat tagihan, token, kWh, atau meter reading. OCR tersedia sebagai bantuan input opsional—hasilnya tetap perlu diperiksa sebelum disimpan.',
        note: 'Input manual tetap tersedia tanpa perangkat tambahan.',
    },
    {
        label: 'Pahami',
        icon: BarChart3,
        image: '/images/landing/prediction-analysis.webp',
        alt: 'Halaman analisis WattWise menampilkan tren dan estimasi berdasarkan data yang dimasukkan.',
        title: 'Baca perubahan dalam konteks usaha.',
        body: 'Lihat tren pemakaian, biaya, porsi listrik terhadap pendapatan, dan perbandingan antarperiode dalam bahasa yang lebih mudah ditinjau.',
        note: 'Prediksi dan biaya periode berikutnya adalah estimasi.',
    },
    {
        label: 'Tentukan prioritas',
        icon: ListChecks,
        image: '/images/landing/recommendations.webp',
        alt: 'Halaman rekomendasi WattWise menampilkan kandidat pemeriksaan dan arahan tindakan.',
        title: 'Ubah perubahan menjadi daftar pemeriksaan.',
        body: 'Tinjau perubahan yang menonjol, kandidat peralatan, dan rekomendasi tindakan agar waktu pemeriksaan tidak habis untuk menebak dari awal.',
        note: 'Kandidat peralatan memerlukan verifikasi manual.',
    },
    {
        label: 'Laporkan',
        icon: FileOutput,
        image: '/images/landing/reports.webp',
        alt: 'Halaman laporan WattWise untuk menyiapkan ringkasan bulanan dan ekspor.',
        title: 'Bawa ringkasan yang rapi ke evaluasi bulanan.',
        body: 'Susun ringkasan bulanan dan gunakan PDF atau CSV sesuai akses paket untuk membantu evaluasi usaha bersama data yang sudah dicatat.',
        note: 'Estimasi WattWise bukan tagihan listrik resmi.',
    },
];
</script>

<template>
    <section
        id="cara-kerja"
        class="overflow-hidden bg-[#102a2d] py-20 text-white sm:py-28"
    >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div data-reveal-group class="max-w-3xl">
                <p
                    class="text-xs font-bold tracking-[0.18em] text-emerald-300 uppercase"
                >
                    Cara kerja
                </p>
                <h2
                    class="mt-4 text-4xl leading-tight font-semibold tracking-[-0.05em] sm:text-6xl"
                >
                    Satu alur dari catatan listrik ke keputusan berikutnya.
                </h2>
                <p
                    class="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg"
                >
                    Empat tahap yang mengikuti cara pemilik usaha bekerja:
                    catat, pahami, tentukan prioritas, lalu laporkan.
                </p>
            </div>

            <div
                class="product-story-shell mt-14 hidden gap-12 lg:grid lg:grid-cols-[1.08fr_0.92fr] xl:gap-20"
            >
                <div
                    class="product-story-visual relative h-[min(68vh,680px)] self-start"
                >
                    <div
                        class="absolute -inset-10 rounded-full bg-emerald-400/10 blur-3xl"
                        aria-hidden="true"
                    />
                    <figure
                        v-for="(stage, index) in stages"
                        :key="stage.label"
                        :data-story-visual="index"
                        class="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-950 p-2 shadow-2xl"
                        :class="index === 0 ? 'opacity-100' : 'opacity-0'"
                    >
                        <img
                            :src="stage.image"
                            width="1440"
                            height="900"
                            :alt="stage.alt"
                            class="h-full w-full rounded-[1.35rem] object-cover object-top"
                            :loading="index === 0 ? 'eager' : 'lazy'"
                            decoding="async"
                        />
                    </figure>
                </div>

                <div class="product-story-stages">
                    <article
                        v-for="(stage, index) in stages"
                        :key="stage.label"
                        :data-story-stage="index"
                        class="flex min-h-[68vh] flex-col justify-center border-t border-white/15 py-16 first:border-t-0"
                    >
                        <div class="flex items-center gap-3 text-emerald-300">
                            <component
                                :is="stage.icon"
                                class="h-5 w-5"
                                aria-hidden="true"
                            />
                            <p
                                class="text-xs font-bold tracking-[0.18em] uppercase"
                            >
                                0{{ index + 1 }} · {{ stage.label }}
                            </p>
                        </div>
                        <h3
                            class="mt-6 text-3xl leading-tight font-semibold tracking-[-0.035em] text-white xl:text-4xl"
                        >
                            {{ stage.title }}
                        </h3>
                        <p class="mt-5 text-base leading-7 text-slate-300">
                            {{ stage.body }}
                        </p>
                        <p
                            class="mt-7 border-l-2 border-emerald-400 pl-4 text-sm leading-6 font-medium text-emerald-100"
                        >
                            {{ stage.note }}
                        </p>
                    </article>
                </div>
            </div>

            <div class="mt-12 grid gap-5 lg:hidden">
                <article
                    v-for="(stage, index) in stages"
                    :key="stage.label"
                    data-story-mobile
                    class="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04]"
                >
                    <img
                        :src="stage.image"
                        width="1440"
                        height="900"
                        :alt="stage.alt"
                        class="aspect-[16/10] w-full object-cover object-top"
                        loading="lazy"
                        decoding="async"
                    />
                    <div class="p-6 sm:p-8">
                        <div class="flex items-center gap-3 text-emerald-300">
                            <component
                                :is="stage.icon"
                                class="h-5 w-5"
                                aria-hidden="true"
                            />
                            <p
                                class="text-xs font-bold tracking-[0.16em] uppercase"
                            >
                                0{{ index + 1 }} · {{ stage.label }}
                            </p>
                        </div>
                        <h3
                            class="mt-5 text-2xl font-semibold tracking-[-0.03em]"
                        >
                            {{ stage.title }}
                        </h3>
                        <p
                            class="mt-4 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7"
                        >
                            {{ stage.body }}
                        </p>
                        <p class="mt-5 text-sm font-semibold text-emerald-200">
                            {{ stage.note }}
                        </p>
                    </div>
                </article>
            </div>
        </div>
    </section>
</template>
