<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import {
    Zap,
    ArrowRight,
    Sparkles,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Users,
    FileText,
} from '@lucide/vue';
import { dashboard, login, register } from '@/routes';

const navLinks = [
    { label: 'Masalah', href: '#masalah' },
    { label: 'Cara Kerja', href: '#cara-kerja' },
    { label: 'Untuk Siapa', href: '#untuk-siapa' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Demo', href: '#demo' },
    { label: 'Roadmap', href: '#roadmap' },
];

const stats = [
    { value: '18%', label: 'indikasi peluang efisiensi' },
    { value: 'Rp180rb', label: 'estimasi peluang hemat' },
    { value: '7+', label: 'kandidat alat yang perlu dicek' },
    { value: '0', label: 'sensor tambahan dibutuhkan' },
];

const problems = [
    {
        title: 'Tagihan listrik naik tapi sumbernya tidak jelas',
        desc: 'Kenaikan baru terasa saat tagihan keluar, sementara asalnya belum terlihat.',
    },
    {
        title: 'Pendapatan terlihat besar tapi cash flow tertekan listrik',
        desc: 'Sulit melihat berapa persen pendapatan bulanan terserap untuk biaya listrik.',
    },
    {
        title: 'Pemilik kos/UMKM tidak punya dashboard sederhana',
        desc: 'Belum ada panel ringkas untuk memantau biaya listrik dan dampaknya ke pendapatan.',
    },
    {
        title: 'Pengecekan alat masih manual',
        desc: 'Menandai alat yang perlu dicek masih mengandalkan perkiraan tanpa bantuan sistem.',
    },
];

const steps = [
    {
        n: '1',
        title: 'Input data listrik bulanan',
        desc: 'Masukkan tagihan/token/kWh atau meter reading secara manual.',
    },
    {
        n: '2',
        title: 'Input pendapatan',
        desc: 'Bisa angka pasti, rentang, atau dilewati dulu.',
    },
    {
        n: '3',
        title: 'Tambahkan daftar peralatan dan jam pakai',
        desc: 'Daftar alat beserta daya dan perkiraan jam pemakaian per hari.',
    },
    {
        n: '4',
        title: 'Dapatkan arahan WattWise AI',
        desc: 'Prediksi pemakaian listrik, estimasi tagihan listrik, kandidat alat yang perlu dicek, dan rekomendasi simulatif.',
    },
];

const personas = [
    {
        title: 'Pemilik kos',
        desc: 'Memantau biaya listrik kos dan dampaknya ke pendapatan sewa tanpa istilah teknis.',
    },
    {
        title: 'Pengelola kontrakan/properti kecil',
        desc: 'Melihat tren beban listrik lintas unit dan menandai bulan yang perlu ditinjau.',
    },
    {
        title: 'UMKM padat energi',
        desc: 'Laundry, F&B, cold storage, atau toko kecil dengan alat berdaya besar.',
    },
];

const features = [
    {
        title: 'Prediksi pemakaian listrik',
        desc: 'Perkiraan pemakaian listrik (kWh) berdasarkan data yang Anda input.',
    },
    {
        title: 'Estimasi tagihan listrik',
        desc: 'Perkiraan biaya listrik dalam Rupiah dari pemakaian dan tarif Anda.',
    },
    {
        title: 'Kandidat alat yang perlu dicek',
        desc: 'Menandai alat yang kemungkinan perlu diperiksa, untuk verifikasi manual.',
    },
    {
        title: 'Hybrid AI Decision Support',
        desc: 'Kombinasi perhitungan dan aturan (rule-based) untuk membantu keputusan hemat energi.',
    },
    {
        title: 'Laporan bulanan',
        desc: 'Ringkasan bulanan biaya listrik dan dampaknya terhadap pendapatan.',
    },
    {
        title: 'Plan gating / trial demo',
        desc: 'Simulasi paket Free dan Pro Trial untuk menguji pembatasan fitur.',
    },
];

const demoModules = [
    'Dashboard',
    'Electricity',
    'Revenue',
    'Appliances',
    'Recommendations',
    'Reports',
    'Plans',
];

const roadmap = [
    { w: 'Week 1', title: 'Laravel Foundation' },
    { w: 'Week 2', title: 'Electricity + Revenue' },
    { w: 'Week 3', title: 'Appliance + Templates' },
    { w: 'Week 4', title: 'Insights + Recommendations' },
    { w: 'Week 5', title: 'Monthly Reports' },
    { w: 'Week 6', title: 'Plan Gating + Trial' },
    { w: 'Week 7', title: 'QA Stabilization' },
    { w: 'Week 8', title: 'Demo & Launch Readiness' },
];

const disclaimers = [
    'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.',
    'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.',
    'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.',
    'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.',
];
</script>

<template>
    <Head title="Listrik Lebih Cerdas, Cash Flow Lebih Terkendali" />

    <div class="min-h-screen scroll-smooth bg-white text-slate-800 antialiased">
        <!-- ============ NAVBAR ============ -->
        <header
            class="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur"
        >
            <div
                class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
            >
                <Link href="/" class="flex items-center gap-3">
                    <div
                        class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                    >
                        <Zap class="h-5 w-5 fill-current" />
                    </div>
                    <div class="leading-tight">
                        <span class="text-lg font-extrabold tracking-tight text-slate-900">
                            WattWise <span class="gradient-text">AI</span>
                        </span>
                        <p
                            class="text-[9px] font-bold uppercase tracking-wider text-slate-400"
                        >
                            Hybrid AI Decision Support
                        </p>
                    </div>
                </Link>

                <nav
                    class="hidden items-center gap-7 text-[13px] font-semibold text-slate-500 md:flex"
                >
                    <a
                        v-for="link in navLinks"
                        :key="link.href"
                        :href="link.href"
                        class="transition hover:text-emerald-600"
                        >{{ link.label }}</a
                    >
                </nav>

                <Link
                    :href="login()"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/30"
                >
                    Coba Demo
                    <ArrowRight class="h-4 w-4" />
                </Link>
            </div>
        </header>

        <main>
            <!-- ============ HERO ============ -->
            <section
                class="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white"
            >
                <div
                    class="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
                />
                <div
                    class="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl"
                />

                <div
                    class="relative mx-auto grid max-w-6xl gap-12 px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-12 lg:items-center lg:px-8"
                >
                    <div class="flex flex-col items-start text-left lg:col-span-7">
                        <div
                            class="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur"
                        >
                            <Sparkles class="h-3.5 w-3.5 text-emerald-500" />
                            SaaS electricity cost intelligence untuk kos, properti
                            kecil, dan UMKM padat energi
                        </div>

                        <h1
                            class="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
                            aria-label="Listrik Lebih Cerdas, Cash Flow Lebih Terkendali"
                        >
                            Listrik Lebih Cerdas,<br />
                            Cash Flow Lebih
                            <span class="gradient-text">Terkendali</span>
                        </h1>

                        <p
                            class="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-500"
                        >
                            WattWise AI membantu pemilik kos, pengelola properti
                            kecil, dan UMKM padat energi memahami biaya listrik,
                            memperkirakan tagihan bulan depan, dan melihat
                            dampaknya ke pendapatan tanpa perlu paham istilah
                            teknis.
                        </p>

                        <p
                            class="mt-4 flex items-center gap-1.5 text-xs font-bold text-slate-400"
                        >
                            <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-500" />
                            Mulai dari input manual. Tanpa alat tambahan. Tanpa
                            integrasi resmi PLN.
                        </p>

                        <div class="mt-8 flex flex-wrap gap-3.5">
                            <Link
                                :href="login()"
                                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/35"
                            >
                                Coba Demo Dashboard
                                <ArrowRight class="h-5 w-5" />
                            </Link>
                            <a
                                href="#cara-kerja"
                                class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 transition-all hover:border-emerald-300 hover:text-emerald-700"
                            >
                                Lihat Cara Kerjanya
                            </a>
                        </div>
                    </div>

                    <!-- Browser mockup -->
                    <div class="relative lg:col-span-5">
                        <div
                            class="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-emerald-400/20 to-teal-300/20 blur-2xl"
                        />
                        <div
                            class="relative mx-auto max-w-[460px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-emerald-900/10"
                        >
                            <div
                                class="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3"
                            >
                                <div class="flex gap-1.5">
                                    <span class="h-3 w-3 rounded-full bg-rose-400" />
                                    <span class="h-3 w-3 rounded-full bg-amber-400" />
                                    <span class="h-3 w-3 rounded-full bg-emerald-400" />
                                </div>
                                <div
                                    class="w-48 truncate rounded-md border border-slate-200/60 bg-white px-3 py-0.5 text-center text-[10px] font-bold text-slate-400"
                                >
                                    app.wattwise.ai/dashboard
                                </div>
                                <div class="w-10" />
                            </div>

                            <div class="bg-slate-50/40 p-5">
                                <div class="mb-4 flex items-center justify-between">
                                    <div>
                                        <p
                                            class="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                                        >
                                            Properti Terdaftar
                                        </p>
                                        <h3 class="text-xs font-bold text-slate-800">
                                            Kos Melati Purwokerto
                                        </h3>
                                    </div>
                                    <span
                                        class="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700"
                                        >Properti Efisien</span
                                    >
                                </div>

                                <div class="mb-4 grid grid-cols-2 gap-3">
                                    <div
                                        class="rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm"
                                    >
                                        <p
                                            class="text-[9px] font-bold uppercase text-slate-400"
                                        >
                                            Estimasi Tagihan Listrik
                                        </p>
                                        <p class="mt-1 text-sm font-extrabold text-slate-800">
                                            Rp1.450.000
                                        </p>
                                        <span
                                            class="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600"
                                        >
                                            <TrendingDown class="h-2 w-2" /> estimasi
                                            simulatif
                                        </span>
                                    </div>
                                    <div
                                        class="rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm"
                                    >
                                        <p
                                            class="text-[9px] font-bold uppercase text-slate-400"
                                        >
                                            Peluang Hemat
                                        </p>
                                        <p class="mt-1 text-sm font-extrabold text-emerald-600">
                                            Rp240.000
                                        </p>
                                        <span
                                            class="mt-1 inline-flex items-center gap-0.5 text-[8px] font-semibold text-slate-400"
                                            >ilustratif</span
                                        >
                                    </div>
                                </div>

                                <div
                                    class="mb-4 rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-sm"
                                >
                                    <div class="mb-2 flex items-center justify-between">
                                        <p class="text-[9px] font-bold text-slate-500">
                                            Prediksi Pemakaian Listrik (kWh)
                                        </p>
                                        <span class="text-[8px] font-bold text-slate-400"
                                            >6 bulan terakhir</span
                                        >
                                    </div>
                                    <div class="flex h-16 w-full items-end">
                                        <svg
                                            viewBox="0 0 100 30"
                                            class="h-full w-full overflow-visible"
                                        >
                                            <path
                                                d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2"
                                                fill="none"
                                                stroke="#10b981"
                                                stroke-width="2.5"
                                                stroke-linecap="round"
                                            />
                                            <path
                                                d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2 L100,30 L0,30 Z"
                                                fill="url(#grad)"
                                                opacity="0.12"
                                            />
                                            <defs>
                                                <linearGradient
                                                    id="grad"
                                                    x1="0%"
                                                    y1="0%"
                                                    x2="0%"
                                                    y2="100%"
                                                >
                                                    <stop offset="0%" stop-color="#10b981" />
                                                    <stop offset="100%" stop-color="#ffffff" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>

                                <div
                                    class="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/70 p-3 shadow-sm"
                                >
                                    <div
                                        class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-600"
                                    >
                                        <AlertTriangle class="h-4 w-4" />
                                    </div>
                                    <div class="overflow-hidden">
                                        <h4 class="text-[10px] font-bold text-rose-950">
                                            Pemakaian malam hari perlu dicek
                                        </h4>
                                        <p
                                            class="mt-0.5 text-[9px] font-semibold leading-relaxed text-slate-500"
                                        >
                                            Kemungkinan terkait lampu koridor,
                                            pompa air, atau alat yang menyala
                                            lebih lama dari biasanya. Perlu
                                            verifikasi manual.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STATS STRIP -->
                <div class="relative mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
                    <div
                        class="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-200/50 shadow-sm md:grid-cols-4"
                    >
                        <div
                            v-for="s in stats"
                            :key="s.label"
                            class="bg-white/80 px-5 py-6 text-center backdrop-blur"
                        >
                            <p class="gradient-text text-2xl font-extrabold sm:text-3xl">
                                {{ s.value }}
                            </p>
                            <p
                                class="mt-1.5 text-[11px] font-semibold leading-snug text-slate-500"
                            >
                                {{ s.label }}
                            </p>
                        </div>
                    </div>
                    <p class="mt-3 text-center text-[11px] font-medium text-slate-400">
                        Angka di atas bersifat ilustratif untuk demo, bukan hasil
                        pengukuran aktual.
                    </p>
                </div>
                <div class="pb-16" />
            </section>

            <!-- ============ MASALAH ============ -->
            <section
                id="masalah"
                class="scroll-mt-20 border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24"
            >
                <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div class="mx-auto max-w-2xl text-center">
                        <span
                            class="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700"
                            >Beban Listrik</span
                        >
                        <h2
                            class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                        >
                            Masalah yang sering dialami
                        </h2>
                        <p
                            class="mt-4 text-base font-medium leading-relaxed text-slate-500"
                        >
                            Pemilik kos, pengelola properti kecil, dan pelaku
                            usaha padat energi sering kesulitan mengontrol biaya
                            listrik karena tidak ada pemetaan konsumsi yang
                            sederhana.
                        </p>
                    </div>

                    <div class="mt-12 grid gap-6 sm:grid-cols-2">
                        <div
                            v-for="p in problems"
                            :key="p.title"
                            class="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:shadow-md"
                        >
                            <div
                                class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"
                            >
                                <AlertTriangle class="h-5 w-5" />
                            </div>
                            <h3 class="text-base font-bold text-slate-800">
                                {{ p.title }}
                            </h3>
                            <p
                                class="mt-2 text-[13px] font-medium leading-relaxed text-slate-500"
                            >
                                {{ p.desc }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ CARA KERJA ============ -->
            <section id="cara-kerja" class="scroll-mt-20 py-20 sm:py-24">
                <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div class="mx-auto max-w-2xl text-center">
                        <span
                            class="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
                            >Alur Sistem</span
                        >
                        <h2
                            class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                        >
                            Cara kerja dalam 4 langkah
                        </h2>
                        <p
                            class="mt-4 text-base font-medium leading-relaxed text-slate-500"
                        >
                            Dari input manual sederhana menjadi arahan hemat daya
                            yang praktis. Tanpa pengukuran real-time dan tanpa
                            perangkat tambahan.
                        </p>
                    </div>

                    <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div
                            v-for="step in steps"
                            :key="step.n"
                            class="relative rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
                        >
                            <span
                                class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-extrabold text-white shadow-md shadow-emerald-500/20"
                                >{{ step.n }}</span
                            >
                            <h3 class="mt-4 text-sm font-bold text-slate-800">
                                {{ step.title }}
                            </h3>
                            <p
                                class="mt-2 text-[13px] font-medium leading-relaxed text-slate-500"
                            >
                                {{ step.desc }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ UNTUK SIAPA ============ -->
            <section
                id="untuk-siapa"
                class="scroll-mt-20 border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24"
            >
                <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div class="mx-auto max-w-2xl text-center">
                        <span
                            class="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
                            >Untuk Siapa</span
                        >
                        <h2
                            class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                        >
                            Dibuat untuk pemilik usaha padat energi
                        </h2>
                    </div>

                    <div class="mt-12 grid gap-6 md:grid-cols-3">
                        <div
                            v-for="persona in personas"
                            :key="persona.title"
                            class="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm transition hover:border-emerald-200/70 hover:shadow-md"
                        >
                            <div
                                class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"
                            >
                                <Users class="h-5 w-5" />
                            </div>
                            <h3 class="text-base font-bold text-slate-800">
                                {{ persona.title }}
                            </h3>
                            <p
                                class="mt-2 text-[13px] font-medium leading-relaxed text-slate-500"
                            >
                                {{ persona.desc }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ FITUR ============ -->
            <section id="fitur" class="scroll-mt-20 py-20 sm:py-24">
                <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div class="mx-auto max-w-2xl text-center">
                        <span
                            class="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
                            >Fitur</span
                        >
                        <h2
                            class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                        >
                            Fitur inti WattWise AI
                        </h2>
                        <p
                            class="mt-4 text-base font-medium leading-relaxed text-slate-500"
                        >
                            Semua berbasis perhitungan dan aturan dari data yang
                            Anda input — tanpa sensor, tanpa API AI eksternal.
                        </p>
                    </div>

                    <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div
                            v-for="feature in features"
                            :key="feature.title"
                            class="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:shadow-md"
                        >
                            <div
                                class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                            >
                                <Lightbulb class="h-5 w-5" />
                            </div>
                            <h3 class="text-sm font-bold text-slate-800">
                                {{ feature.title }}
                            </h3>
                            <p
                                class="mt-2 text-xs font-medium leading-relaxed text-slate-500"
                            >
                                {{ feature.desc }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ DEMO ============ -->
            <section
                id="demo"
                class="scroll-mt-20 border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24"
            >
                <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div
                        class="grid gap-10 lg:grid-cols-2 lg:items-center"
                    >
                        <div>
                            <span
                                class="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
                                >Demo</span
                            >
                            <h2
                                class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                            >
                                Coba demo dengan data properti nyata
                            </h2>
                            <p
                                class="mt-4 text-base font-medium leading-relaxed text-slate-500"
                            >
                                Masuk memakai akun demo lokal untuk menjelajahi
                                properti contoh
                                <strong class="text-slate-700">Kos Melati Purwokerto</strong>
                                lengkap dengan data listrik, pendapatan, dan
                                peralatan.
                            </p>

                            <div
                                class="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
                            >
                                <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">
                                    Demo lokal
                                </p>
                                <p class="mt-1 font-mono text-sm font-semibold text-slate-800">
                                    demo@wattwise.local / password
                                </p>
                                <p class="mt-2 text-xs font-medium text-slate-500">
                                    Akun demo hanya untuk pengujian lokal, bukan
                                    kredensial produksi.
                                </p>
                                <div class="mt-4 flex flex-wrap gap-3">
                                    <Link
                                        :href="login()"
                                        class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                                    >
                                        Masuk ke Dashboard Demo
                                        <ArrowRight class="h-4 w-4" />
                                    </Link>
                                    <Link
                                        :href="register()"
                                        class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:border-emerald-300 hover:text-emerald-700"
                                    >
                                        Daftar
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div
                            class="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-sm"
                        >
                            <h3 class="text-sm font-bold text-slate-800">
                                Yang bisa Anda lihat setelah login
                            </h3>
                            <ul class="mt-4 grid gap-2.5 sm:grid-cols-2">
                                <li
                                    v-for="mod in demoModules"
                                    :key="mod"
                                    class="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-sm font-semibold text-slate-700"
                                >
                                    <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-500" />
                                    {{ mod }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ ROADMAP ============ -->
            <section
                id="roadmap"
                class="scroll-mt-20 relative overflow-hidden bg-slate-900 py-20 text-white sm:py-24"
            >
                <div
                    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.20),transparent_40%)]"
                />
                <div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div class="mx-auto max-w-2xl text-center">
                        <span
                            class="inline-flex items-center rounded-full border border-emerald-800/60 bg-emerald-950 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400"
                            >Roadmap MVP</span
                        >
                        <h2
                            class="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                        >
                            Progres Week 1–8 (Launch Readiness)
                        </h2>
                        <p class="mt-4 text-sm font-medium leading-relaxed text-slate-400">
                            Fondasi MVP yang sudah dibangun bertahap dan berbasis
                            perhitungan serta aturan (rule-based).
                        </p>
                    </div>

                    <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div
                            v-for="item in roadmap"
                            :key="item.w"
                            class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="rounded-lg border border-emerald-800/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400"
                                    >{{ item.w }}</span
                                >
                                <CheckCircle2 class="h-4 w-4 text-emerald-400" />
                            </div>
                            <h3 class="mt-3 text-sm font-bold text-white">
                                {{ item.title }}
                            </h3>
                            <p class="mt-1 text-[11px] font-semibold text-emerald-400/80">
                                Selesai
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ============ DISCLAIMER ============ -->
            <section class="py-16 sm:py-20">
                <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div
                        class="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-6 sm:p-8"
                    >
                        <div class="flex items-center gap-2">
                            <FileText class="h-5 w-5 text-slate-500" />
                            <h2 class="text-sm font-bold uppercase tracking-wide text-slate-600">
                                Catatan &amp; Batasan
                            </h2>
                        </div>
                        <ul class="mt-4 space-y-3">
                            <li
                                v-for="(text, i) in disclaimers"
                                :key="i"
                                class="flex gap-2.5 text-[13px] font-medium leading-relaxed text-slate-500"
                            >
                                <span
                                    class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                                />
                                {{ text }}
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- ============ FINAL CTA ============ -->
            <section class="pb-20 sm:pb-24">
                <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div
                        class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 py-14 text-center text-white shadow-2xl shadow-emerald-600/20 md:px-12 md:py-16"
                    >
                        <div
                            class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
                        />
                        <div
                            class="pointer-events-none absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl"
                        />
                        <h2
                            class="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                        >
                            Siap lihat demo WattWise AI?
                        </h2>
                        <p
                            class="relative mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-emerald-50"
                        >
                            Lihat bagaimana data tagihan sederhana bisa berubah
                            menjadi arahan yang mudah dipahami.
                        </p>
                        <div class="relative mt-8 flex flex-wrap justify-center gap-3.5">
                            <Link
                                :href="login()"
                                class="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-extrabold text-emerald-700 shadow-lg transition-all hover:scale-[1.02] hover:bg-emerald-50"
                            >
                                Masuk ke Dashboard Demo
                                <ArrowRight class="h-5 w-5" />
                            </Link>
                            <Link
                                :href="register()"
                                class="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-transparent px-8 py-3.5 text-sm font-extrabold text-white transition-all hover:bg-white/10"
                            >
                                Daftar
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <footer
            class="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs font-medium text-slate-400"
        >
            <div
                class="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8"
            >
                <div class="flex items-center gap-2">
                    <span
                        class="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    >
                        <Zap class="h-3.5 w-3.5 fill-current" />
                    </span>
                    <span class="font-bold text-slate-500">WattWise AI</span>
                </div>
                <p>© 2026 WattWise AI · Demo Startup · Hybrid AI Decision Support</p>
                <div v-if="$page.props.auth.user">
                    <Link :href="dashboard()" class="font-semibold text-emerald-600 hover:underline"
                        >Buka Dashboard</Link
                    >
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.gradient-text {
    background-image: linear-gradient(to right, #10b981, #0d9488);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
</style>
