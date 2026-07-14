<script setup lang="ts">
import {
    ArrowRight,
    Building,
    ClipboardCheck,
    Factory,
    LineChart,
    SearchCheck,
    Store,
} from '@lucide/vue';

const benefits = [
    {
        icon: LineChart,
        title: 'Lebih cepat memahami perubahan biaya listrik',
        body: 'Tren per periode membantu Anda melihat kapan catatan perlu diperiksa lebih dekat.',
    },
    {
        icon: SearchCheck,
        title: 'Lebih mudah menentukan apa yang perlu diperiksa',
        body: 'Kandidat dan rekomendasi memberi titik awal tanpa mengklaim penyebab yang pasti.',
    },
    {
        icon: Store,
        title: 'Melihat beban listrik dalam konteks pendapatan',
        body: 'Bandingkan biaya listrik dengan data pendapatan yang Anda pilih untuk dimasukkan.',
    },
    {
        icon: ClipboardCheck,
        title: 'Membawa laporan yang lebih rapi ke evaluasi bulanan',
        body: 'Ringkasan terstruktur membantu percakapan evaluasi tetap berpijak pada catatan.',
    },
];

const personas = [
    {
        icon: Building,
        title: 'Kos dan properti kecil',
        problem:
            'Tagihan berubah antarbulan dan catatan beberapa area sulit dibandingkan.',
        workflow:
            'Catat listrik dan pendapatan sewa, lalu tinjau tren serta perubahan per periode.',
        outcome:
            'Evaluasi operasional bulanan memiliki konteks yang lebih mudah dibaca.',
    },
    {
        icon: Factory,
        title: 'Laundry atau UMKM padat energi',
        problem:
            'Mesin berdaya besar berjalan lama, sementara prioritas pemeriksaan belum jelas.',
        workflow:
            'Tambahkan catatan pemakaian dan peralatan untuk melihat kandidat yang perlu ditinjau.',
        outcome:
            'Waktu pemeriksaan dapat diarahkan ke kandidat yang paling relevan lebih dahulu.',
    },
    {
        icon: Store,
        title: 'Toko, kuliner, atau usaha dengan alat berdaya besar',
        problem:
            'Pendingin, pemanas, atau alat operasional membuat biaya sulit dibaca terpisah dari omzet.',
        workflow:
            'Bandingkan biaya listrik dengan pendapatan dan bawa ringkasannya ke evaluasi usaha.',
        outcome:
            'Keputusan operasional memiliki catatan biaya dan pendapatan yang lebih terhubung.',
    },
];
</script>

<template>
    <section id="manfaat" class="bg-white py-20 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div data-reveal-group class="max-w-3xl">
                <p
                    class="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase"
                >
                    Manfaat
                </p>
                <h2
                    class="mt-4 text-4xl leading-tight font-semibold tracking-[-0.05em] text-[#0F172A] sm:text-6xl"
                >
                    Bukan lebih banyak grafik. Lebih banyak konteks untuk
                    bertindak.
                </h2>
            </div>
            <div
                class="mt-14 grid gap-px overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-900/10 sm:grid-cols-2 lg:grid-cols-4"
            >
                <article
                    v-for="benefit in benefits"
                    :key="benefit.title"
                    data-benefit-card
                    class="bg-white p-7 sm:p-8"
                >
                    <component
                        :is="benefit.icon"
                        class="h-6 w-6 text-emerald-700"
                        aria-hidden="true"
                    />
                    <h3
                        class="mt-10 text-xl leading-snug font-semibold tracking-[-0.025em] text-[#0F172A]"
                    >
                        {{ benefit.title }}
                    </h3>
                    <p class="mt-4 text-sm leading-6 text-slate-600">
                        {{ benefit.body }}
                    </p>
                </article>
            </div>
            <p class="mt-6 text-sm font-medium text-slate-500">
                WattWise tidak menjanjikan penghematan; hasil keputusan tetap
                bergantung pada data dan tindakan pengguna.
            </p>
        </div>
    </section>

    <section id="untuk-siapa" class="bg-[#e8efe9] py-20 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
                data-reveal-group
                class="grid gap-6 lg:grid-cols-2 lg:items-end"
            >
                <div>
                    <p
                        class="text-xs font-bold tracking-[0.18em] text-emerald-800 uppercase"
                    >
                        Untuk siapa
                    </p>
                    <h2
                        class="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A] sm:text-5xl"
                    >
                        Tiga konteks usaha. Satu kebutuhan: biaya yang lebih
                        mudah dipahami.
                    </h2>
                </div>
                <p
                    class="max-w-xl text-base leading-7 text-slate-700 lg:justify-self-end"
                >
                    WattWise dirancang untuk pengelola skala kecil yang perlu
                    arahan praktis, bukan sistem energi industri atau perangkat
                    IoT.
                </p>
            </div>

            <div class="mt-14 grid gap-6 lg:grid-cols-3">
                <article
                    v-for="persona in personas"
                    :key="persona.title"
                    data-persona-card
                    class="flex flex-col rounded-3xl border border-slate-900/10 bg-[#f7f4ec] p-7 shadow-sm sm:p-8"
                >
                    <component
                        :is="persona.icon"
                        class="h-7 w-7 text-emerald-700"
                        aria-hidden="true"
                    />
                    <h3
                        class="mt-8 text-2xl font-semibold tracking-[-0.03em] text-[#0F172A]"
                    >
                        {{ persona.title }}
                    </h3>
                    <dl class="mt-7 space-y-5 text-sm leading-6">
                        <div>
                            <dt class="font-bold text-[#0F172A]">
                                Masalah utama
                            </dt>
                            <dd class="mt-1 text-slate-600">
                                {{ persona.problem }}
                            </dd>
                        </div>
                        <div>
                            <dt class="font-bold text-[#0F172A]">
                                Alur WattWise
                            </dt>
                            <dd class="mt-1 text-slate-600">
                                {{ persona.workflow }}
                            </dd>
                        </div>
                        <div>
                            <dt class="font-bold text-[#0F172A]">
                                Hasil praktis
                            </dt>
                            <dd class="mt-1 text-slate-600">
                                {{ persona.outcome }}
                            </dd>
                        </div>
                    </dl>
                    <a
                        href="#transparansi"
                        class="mt-8 inline-flex items-center gap-2 rounded-md text-sm font-bold text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                        Lihat batasan produk
                        <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    </a>
                </article>
            </div>
        </div>
    </section>
</template>
