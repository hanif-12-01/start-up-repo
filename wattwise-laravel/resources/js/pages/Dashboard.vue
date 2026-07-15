<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import {
    Building2,
    Zap,
    Coins,
    ArrowRight,
    AlertTriangle,
    HelpCircle,
    Activity,
    Sparkles,
    Lightbulb,
    Info,
} from '@lucide/vue';
import { computed } from 'vue';
import CostRevenueChart from '@/components/charts/CostRevenueChart.vue';
import ElectricityTrendChart from '@/components/charts/ElectricityTrendChart.vue';
import PredictionChart from '@/components/charts/PredictionChart.vue';
import PlanBadge from '@/components/PlanBadge.vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
}

const props = defineProps<{
    userName: string;
    hasBusiness: boolean;
    businessCount: number;
    businessName?: string | null;
    businessType?: string | null;
    businesses: Business[];
    activeBusinessId: number | null;

    // Week 2 summary props
    latestElectricityEntry: any;
    latestRevenueEntry: any;
    electricityCostIdr: number | string | null;
    usageKwh: number | string | null;
    tariffPerKwh: number | string | null;
    revenueAmountIdr: number | string | null;
    electricityRevenueRatioPercent: number | string | null;
    remainingRevenueAfterElectricity: number | string | null;
    dataCompleteness: 'COMPLETE' | 'NO_ELECTRICITY' | 'NO_REVENUE' | 'EMPTY';
    topAppliances?: any[];

    // Week 4 recommendation props
    efficiencyScore?: {
        score: number | null;
        label: string;
        status: 'GOOD' | 'WATCH' | 'CHECK' | 'INCOMPLETE';
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
        explanation: string;
    } | null;
    topRecommendations?: any[];

    // Week 6/7 chart props
    chartsData?: any;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
        ],
    },
});

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/dashboard', { business_id: target.value });
};

const formatBusinessType = (type?: string | null) => {
    switch (type) {
        case 'KOS_PROPERTY':
            return 'Kos / Properti';
        case 'FNB':
            return 'Warung / F&B';
        case 'LAUNDRY':
            return 'Laundry';
        case 'RETAIL':
            return 'Toko / Retail';
        case 'COLD_STORAGE':
            return 'Cold Storage';
        case 'OTHER':
            return 'Lainnya';
        default:
            return type || '';
    }
};

const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return 'Rp -';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));
};

const formatKWh = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return '- kWh';
    }

    return (
        Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) +
        ' kWh'
    );
};

const formatPercent = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return Number(value).toFixed(1) + '%';
};

const formatMonth = (dateStr?: string) => {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);

    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const activeMonthName = computed(() => {
    if (props.latestElectricityEntry?.period_month) {
        return formatMonth(props.latestElectricityEntry.period_month);
    }

    if (props.latestRevenueEntry?.period_month) {
        return formatMonth(props.latestRevenueEntry.period_month);
    }

    return '';
});
</script>

<template>
    <Head title="Beranda" />

    <div
        class="wattwise-dashboard mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
    >
        <!-- Welcome Header -->
        <div
            class="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8 dark:from-card dark:via-card dark:to-emerald-950/20 dark:border-white/8"
        >
            <div
                class="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl"
                aria-hidden="true"
            />
            <div
                class="relative flex flex-col justify-between gap-6 md:flex-row md:items-center"
            >
                <div class="flex flex-col gap-2">
                    <p
                        class="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-400"
                    >
                        Selamat datang kembali
                    </p>
                    <div class="flex flex-wrap items-center gap-3">
                        <h1
                            class="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl"
                        >
                            Halo, {{ userName || 'Pengguna' }}
                        </h1>
                        <PlanBadge />
                    </div>
                    <p
                        class="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base"
                    >
                        Lihat kondisi listrik dan pendapatan usaha Anda dalam
                        satu tempat. Mulai dari angka utama, lalu ikuti saran
                        yang paling mudah dilakukan.
                    </p>
                </div>

                <!-- Business Switcher -->
                <div
                    v-if="businesses.length > 0"
                    class="flex min-w-[250px] flex-col gap-2 rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur"
                >
                    <label
                        for="business-select"
                        class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                        >Pilih Properti / Usaha</label
                    >
                    <select
                        id="business-select"
                        :value="activeBusinessId"
                        @change="switchBusiness"
                        class="flex h-11 w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        <option
                            v-for="b in businesses"
                            :key="b.id"
                            :value="b.id"
                        >
                            {{ b.name }} ({{ b.city || 'Purwokerto' }})
                        </option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Onboarding Notice / CTA if no business exists -->
        <div
            v-if="!hasBusiness"
            class="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[2rem] border border-emerald-700/15 bg-emerald-950 p-7 text-white shadow-[0_22px_60px_rgba(6,78,59,0.2)] sm:p-8 md:flex-row md:items-center"
        >
            <div class="flex max-w-2xl flex-col gap-2.5">
                <h2
                    class="flex items-center gap-2 text-xl font-bold text-white"
                >
                    <Zap class="h-5 w-5 text-emerald-300" /> Siapkan usaha
                    pertama Anda
                </h2>
                <p class="text-sm leading-relaxed text-emerald-50/80">
                    Isi informasi dasar usaha atau kos Anda. Setelah itu,
                    WattWise akan membantu merangkum biaya listrik dan memberi
                    saran penghematan.
                </p>
            </div>
            <Link
                href="/onboarding"
                class="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg md:self-auto"
            >
                Isi Data Usaha
                <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <template v-else>
            <!-- Active Business Details Card -->
            <div
                class="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-700/15 bg-card p-5 shadow-sm sm:flex-row sm:items-center"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        <Building2 class="h-6 w-6" />
                    </div>
                    <div>
                        <h3
                            class="text-lg leading-tight font-bold text-foreground"
                        >
                            {{ businessName }}
                        </h3>
                        <p class="mt-1 text-xs text-muted-foreground">
                            Jenis usaha:
                            <strong
                                class="ml-1 rounded bg-muted/60 px-2 py-0.5 font-bold text-foreground/80"
                                >{{ formatBusinessType(businessType) }}</strong
                            >
                        </p>
                    </div>
                </div>
                <div
                    class="text-xs font-semibold text-muted-foreground sm:text-right sm:text-sm"
                >
                    <span class="text-base font-extrabold text-foreground">{{
                        businessCount
                    }}</span>
                    usaha atau kos terdaftar
                </div>
            </div>

            <!-- Cost Intelligence Summary Section -->
            <div class="flex flex-col gap-5">
                <div
                    class="flex items-end justify-between gap-4 border-b border-border pb-4"
                >
                    <div>
                        <h2
                            class="flex items-center gap-2.5 text-xl font-bold text-foreground"
                        >
                            <Activity class="h-5 w-5 text-emerald-600" />
                            Kondisi usaha bulan ini
                        </h2>
                        <p class="mt-1 text-sm text-slate-600">
                            Empat angka utama untuk membantu Anda mengambil
                            keputusan.
                        </p>
                    </div>
                    <span
                        v-if="activeMonthName"
                        class="rounded-full border border-emerald-500/10 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm dark:text-emerald-400"
                    >
                        {{ activeMonthName }}
                    </span>
                </div>

                <!-- Grid of summary cards -->
                <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <!-- Estimasi Tagihan Listrik Card -->
                    <div
                        class="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        :class="[
                            dataCompleteness === 'EMPTY' ||
                            dataCompleteness === 'NO_ELECTRICITY'
                                ? 'border-muted bg-muted/10 opacity-55'
                                : 'border-border hover:border-yellow-500/30',
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                                >Perkiraan Tagihan</span
                            >
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500"
                            >
                                <Zap class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span
                                class="text-2xl font-extrabold tracking-tight text-foreground"
                            >
                                {{ formatIDR(electricityCostIdr) }}
                            </span>
                            <span
                                v-if="
                                    latestElectricityEntry &&
                                    !latestElectricityEntry.bill_amount_idr
                                "
                                class="mt-1 self-start rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400"
                            >
                                *Dihitung dari data Anda
                            </span>
                            <span
                                v-else
                                class="text-[10px] text-muted-foreground"
                                >&nbsp;</span
                            >
                        </div>
                    </div>

                    <!-- Pemakaian Listrik Card -->
                    <div
                        class="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        :class="[
                            dataCompleteness === 'EMPTY' ||
                            dataCompleteness === 'NO_ELECTRICITY'
                                ? 'border-muted bg-muted/10 opacity-55'
                                : 'border-border hover:border-yellow-500/30',
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                                >Pemakaian Listrik</span
                            >
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500"
                            >
                                <Zap class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span
                                class="text-2xl font-extrabold tracking-tight text-foreground"
                            >
                                {{ formatKWh(usageKwh) }}
                            </span>
                            <span
                                class="text-[10px] font-semibold text-muted-foreground"
                            >
                                {{
                                    latestElectricityEntry?.tariff_per_kwh
                                        ? `@ Rp${Number(latestElectricityEntry.tariff_per_kwh).toLocaleString('id-ID')}/kWh`
                                        : 'Tanpa tarif per kWh'
                                }}
                            </span>
                        </div>
                    </div>

                    <!-- Rasio Listrik terhadap Pendapatan Card -->
                    <div
                        class="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        :class="[
                            dataCompleteness !== 'COMPLETE'
                                ? 'border-muted bg-muted/10 opacity-55'
                                : 'border-border hover:border-green-500/30',
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="font-display text-xs font-bold tracking-wider text-muted-foreground uppercase"
                                >Pendapatan untuk Listrik</span
                            >
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500"
                            >
                                <Coins class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span
                                class="text-2xl font-extrabold tracking-tight text-foreground"
                            >
                                {{
                                    formatPercent(
                                        electricityRevenueRatioPercent,
                                    )
                                }}
                            </span>
                            <span
                                class="text-[10px] font-semibold text-muted-foreground"
                            >
                                Pendapatan: {{ formatIDR(revenueAmountIdr) }}
                            </span>
                        </div>
                    </div>

                    <!-- Sisa Pendapatan Setelah Listrik Card -->
                    <div
                        class="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        :class="[
                            dataCompleteness !== 'COMPLETE'
                                ? 'border-muted bg-muted/10 opacity-55'
                                : 'border-border hover:border-green-500/30',
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                                >Sisa Pendapatan</span
                            >
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500"
                            >
                                <Coins class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span
                                class="text-2xl font-extrabold tracking-tight text-foreground"
                            >
                                {{
                                    formatIDR(remainingRevenueAfterElectricity)
                                }}
                            </span>
                            <span
                                class="mt-1 self-start rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500"
                            >
                                Belum termasuk biaya lain
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div
                    v-if="chartsData && chartsData.has_data"
                    class="mt-2 grid gap-6 md:grid-cols-2"
                >
                    <!-- 1. Electricity Trend Chart -->
                    <ElectricityTrendChart :data="chartsData.months" />

                    <!-- 2. Cash Flow / Cost Revenue Chart -->
                    <CostRevenueChart :data="chartsData.months" />

                    <!-- 3. Realization & Target / Occupancy Chart -->
                    <div class="md:col-span-2">
                        <PredictionChart
                            :data="chartsData.months"
                            :isKosProperty="chartsData.is_kos_property"
                            :nextMonthPrediction="
                                chartsData.next_month_prediction
                            "
                        />
                    </div>
                </div>

                <!-- Conditional warnings / empty states -->
                <div
                    v-if="
                        dataCompleteness === 'EMPTY' ||
                        dataCompleteness === 'NO_ELECTRICITY'
                    "
                    class="border-yellow-250 mt-2 flex flex-col justify-between gap-4 rounded-2xl border bg-yellow-500/5 p-6 shadow-sm sm:flex-row sm:items-center"
                >
                    <div class="flex items-start gap-3.5">
                        <AlertTriangle
                            class="mt-0.5 h-5 w-5 shrink-0 text-yellow-600"
                        />
                        <div class="flex flex-col gap-0.5">
                            <p
                                class="dark:text-yellow-350 text-sm font-bold text-yellow-900"
                            >
                                Data listrik bulanan Anda belum diisi
                            </p>
                            <p
                                class="text-xs text-yellow-800/80 dark:text-yellow-400/80"
                            >
                                Masukkan tagihan listrik bulan ini agar WattWise
                                dapat menampilkan ringkasan dan saran.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/electricity"
                        class="hover:bg-yellow-750 inline-flex shrink-0 items-center justify-center rounded-xl bg-yellow-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                        Catat Listrik Sekarang
                    </Link>
                </div>

                <div
                    v-else-if="dataCompleteness === 'NO_REVENUE'"
                    class="mt-2 flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-blue-500/5 p-6 shadow-sm sm:flex-row sm:items-center"
                >
                    <div class="flex items-start gap-3.5">
                        <Info class="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                        <div class="flex flex-col gap-0.5">
                            <p
                                class="text-sm font-bold text-blue-900 dark:text-blue-300"
                            >
                                Data pendapatan bulanan belum dicatat
                            </p>
                            <p
                                class="text-blue-850/80 text-xs dark:text-blue-400/85"
                            >
                                Catat pendapatan bulan ini agar terlihat seberapa besar pengeluaran listrik memengaruhi porsi pendapatan usaha Anda.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/revenue"
                        class="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        Catat Pendapatan
                    </Link>
                </div>
            </div>

            <!-- Insight Utama Section -->
            <div class="mt-4 flex flex-col gap-5">
                <div class="border-b border-border pb-3">
                    <h2
                        class="flex items-center gap-2.5 text-xl font-bold text-foreground"
                    >
                        <Sparkles class="h-5 w-5 text-emerald-600" /> Yang perlu
                        Anda perhatikan
                    </h2>
                </div>

                <div class="grid gap-6 md:grid-cols-3">
                    <!-- Nilai Penggunaan Listrik Card -->
                    <div
                        class="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md md:col-span-1"
                    >
                        <div class="flex flex-col gap-1">
                            <h3
                                class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                            >
                                Nilai Penggunaan Listrik
                            </h3>
                            <p class="text-[10px] text-muted-foreground">
                                Penilaian awal dari data yang Anda catat
                            </p>
                        </div>

                        <div
                            class="flex flex-col items-center justify-center py-2"
                        >
                            <template
                                v-if="
                                    efficiencyScore &&
                                    efficiencyScore.score !== null
                                "
                            >
                                <div
                                    class="relative flex h-32 w-32 items-center justify-center"
                                >
                                    <!-- Radial Ring Progress visual -->
                                    <svg
                                        class="absolute h-full w-full -rotate-90 transform"
                                        viewBox="0 0 36 36"
                                    >
                                        <path
                                            class="text-muted/10 dark:text-muted/20"
                                            stroke="currentColor"
                                            stroke-width="3"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            class="gauge-path text-emerald-500 transition-all duration-500"
                                            :class="{
                                                'text-emerald-500':
                                                    efficiencyScore.status ===
                                                    'GOOD',
                                                'text-yellow-500':
                                                    efficiencyScore.status ===
                                                    'WATCH',
                                                'text-red-500':
                                                    efficiencyScore.status ===
                                                    'CHECK',
                                            }"
                                            stroke="currentColor"
                                            :stroke-dasharray="`${efficiencyScore.score}, 100`"
                                            stroke-width="3"
                                            stroke-linecap="round"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div class="flex flex-col items-center">
                                        <span
                                            class="text-3xl font-extrabold text-foreground"
                                            >{{ efficiencyScore.score }}</span
                                        >
                                        <span
                                            class="text-[9px] font-bold tracking-widest text-muted-foreground"
                                            >NILAI</span
                                        >
                                    </div>
                                </div>
                                <span
                                    class="mt-4 rounded-full border px-3.5 py-1 text-xs font-extrabold shadow-sm"
                                    :class="{
                                        'border-green-500/15 bg-green-500/10 text-green-600 dark:text-green-400':
                                            efficiencyScore.status === 'GOOD',
                                        'border-yellow-500/15 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400':
                                            efficiencyScore.status === 'WATCH',
                                        'border-red-500/15 bg-red-500/10 text-red-600 dark:text-red-400':
                                            efficiencyScore.status === 'CHECK',
                                    }"
                                >
                                    {{ efficiencyScore.label }}
                                </span>
                            </template>
                            <template v-else>
                                <div
                                    class="flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-dashed border-muted/20 p-3 text-center"
                                >
                                    <span
                                        class="text-[10px] font-bold text-muted-foreground"
                                        >BELUM ADA NILAI</span
                                    >
                                </div>
                                <span
                                    class="mt-4 text-center text-xs font-bold text-muted-foreground"
                                >
                                    Data belum cukup
                                </span>
                            </template>
                        </div>

                        <div
                            class="border-t border-border/60 pt-4 text-center text-[10px] leading-relaxed text-muted-foreground"
                        >
                            Nilai ini membantu Anda melihat apakah penggunaan
                            listrik sudah wajar berdasarkan catatan yang
                            tersedia.
                        </div>
                    </div>

                    <!-- Recommendations List Card -->
                    <div
                        class="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md md:col-span-2"
                    >
                        <div
                            class="flex items-center justify-between border-b border-border/60 pb-3"
                        >
                            <h3
                                class="flex items-center gap-2 text-sm font-bold text-foreground"
                            >
                                <Lightbulb
                                    class="h-4.5 w-4.5 text-emerald-500"
                                />
                                Saran hemat yang bisa dicoba
                            </h3>
                            <Link
                                href="/recommendations"
                                class="flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80"
                            >
                                Lihat semua saran
                                <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>

                        <!-- List of Top 3 Recommendations -->
                        <div class="flex flex-1 flex-col gap-4">
                            <template
                                v-if="
                                    topRecommendations &&
                                    topRecommendations.length > 0
                                "
                            >
                                <div
                                    v-for="rec in topRecommendations"
                                    :key="rec.type"
                                    class="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/10 p-4 transition-all hover:bg-muted/20"
                                >
                                    <div
                                        class="flex flex-wrap items-center justify-between gap-2"
                                    >
                                        <span
                                            class="flex items-center gap-2 text-sm font-extrabold text-foreground"
                                        >
                                            <span
                                                class="h-2 w-2 rounded-full"
                                                :class="{
                                                    'animate-pulse bg-red-500':
                                                        rec.priority === 'HIGH',
                                                    'bg-yellow-500':
                                                        rec.priority ===
                                                        'MEDIUM',
                                                    'bg-blue-500':
                                                        rec.priority === 'LOW',
                                                }"
                                            ></span>
                                            {{ rec.title }}
                                        </span>
                                        <span
                                            class="rounded-full border px-2 py-0.5 text-[9px] font-extrabold shadow-sm"
                                            :class="{
                                                'text-red-650 border-red-500/20 bg-red-500/10 dark:text-red-400':
                                                    rec.priority === 'HIGH',
                                                'text-yellow-650 border-yellow-500/20 bg-yellow-500/10 dark:text-yellow-400':
                                                    rec.priority === 'MEDIUM',
                                                'text-blue-650 border-blue-500/20 bg-blue-500/10 dark:text-blue-400':
                                                    rec.priority === 'LOW',
                                            }"
                                        >
                                            {{
                                                rec.priority === 'HIGH'
                                                    ? 'Dahulukan'
                                                    : rec.priority === 'MEDIUM'
                                                      ? 'Berikutnya'
                                                      : 'Tambahan'
                                            }}
                                        </span>
                                    </div>
                                    <p
                                        class="pl-4 text-xs leading-relaxed text-muted-foreground"
                                    >
                                        {{ rec.description }}
                                    </p>
                                    <div
                                        class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 pl-4 text-[11px]"
                                    >
                                        <span
                                            class="font-bold text-foreground/80"
                                        >
                                            Yang bisa dilakukan:
                                            <span
                                                class="font-semibold text-muted-foreground"
                                                >{{ rec.action }}</span
                                            >
                                        </span>
                                        <div
                                            class="flex flex-wrap items-center gap-1.5"
                                        >
                                            <span
                                                v-for="badge in rec.badges"
                                                :key="badge"
                                                class="rounded border border-border/60 bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground"
                                            >
                                                {{ badge }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <div
                                    class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground"
                                >
                                    <p class="text-sm font-semibold">
                                        Belum ada saran untuk saat ini.
                                    </p>
                                    <p class="mt-1 text-xs">
                                        Lengkapi catatan listrik dan daftar
                                        peralatan agar WattWise dapat menyiapkan
                                        saran.
                                    </p>
                                </div>
                            </template>
                        </div>

                        <div
                            class="border-t border-border/60 pt-4 text-center text-[10px] text-muted-foreground italic"
                        >
                            *Perkiraan WattWise dibuat dari data yang Anda
                            masukkan dan bukan tagihan resmi PLN.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Appliances Summary -->
            <div
                v-if="topAppliances && topAppliances.length > 0"
                class="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md"
            >
                <div
                    class="flex flex-col justify-between gap-2 border-b border-border pb-3 md:flex-row md:items-center"
                >
                    <div class="flex flex-col gap-0.5">
                        <h3
                            class="flex items-center gap-2.5 text-base font-bold text-foreground"
                        >
                            <AlertTriangle class="h-4.5 w-4.5 text-amber-500" />
                            Peralatan yang sebaiknya dicek
                        </h3>
                        <p class="pl-7 text-xs text-muted-foreground">
                            Urutan ini dibuat dari perkiraan daya dan lama
                            pemakaian yang Anda masukkan.
                        </p>
                    </div>
                    <Link
                        href="/appliances"
                        class="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                        Lihat semua peralatan <ArrowRight class="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div
                        v-for="(appliance, index) in topAppliances"
                        :key="appliance.id"
                        class="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 text-xs transition-all hover:bg-muted/30"
                    >
                        <div class="flex items-center gap-2.5">
                            <span
                                class="font-extrabold text-amber-600 dark:text-amber-400"
                                >#{{ index + 1 }}</span
                            >
                            <span class="font-bold text-foreground">{{
                                appliance.name
                            }}</span>
                        </div>
                        <span class="font-extrabold text-muted-foreground">{{
                            formatKWh(appliance.estimated_monthly_kwh)
                        }}</span>
                    </div>
                </div>
                <div
                    class="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground italic"
                >
                    <span>*Estimasi Simulatif · Perlu Verifikasi Manual</span>
                </div>
            </div>

            <!-- Features Quick Access Grid -->
            <div class="mt-8 border-b border-border pb-2">
                <h2 class="text-lg font-bold text-foreground">
                    Mau melakukan apa?
                </h2>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
                <!-- Catat Listrik Card -->
                <div
                    class="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
                >
                    <div class="flex flex-col gap-3">
                        <div
                            class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600"
                        >
                            <Zap class="h-5 w-5 fill-current" />
                        </div>
                        <h3 class="text-lg font-bold text-foreground">
                            Catat listrik bulan ini
                        </h3>
                        <p
                            class="text-sm leading-relaxed text-muted-foreground"
                        >
                            Masukkan angka meter atau jumlah tagihan. WattWise
                            akan menyimpannya sebagai catatan bulanan usaha
                            Anda.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link
                            href="/electricity"
                            class="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                        >
                            Mulai catat listrik
                            <ArrowRight
                                class="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                            />
                        </Link>
                        <span
                            class="rounded-full border border-yellow-500/10 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400"
                            >Aktif</span
                        >
                    </div>
                </div>

                <!-- Catat Pendapatan Card -->
                <div
                    class="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
                >
                    <div class="flex flex-col gap-3">
                        <div
                            class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600"
                        >
                            <Coins class="h-5 w-5" />
                        </div>
                        <h3 class="text-lg font-bold text-foreground">
                            Catat Pendapatan
                        </h3>
                        <p
                            class="text-sm leading-relaxed text-muted-foreground"
                        >
                            Masukkan jumlah pendapatan bulan ini untuk melihat
                            berapa bagiannya yang dipakai membayar listrik.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link
                            href="/revenue"
                            class="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                        >
                            Mulai catat pendapatan
                            <ArrowRight
                                class="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                            />
                        </Link>
                        <span
                            class="rounded-full border border-green-500/10 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400"
                            >Aktif</span
                        >
                    </div>
                </div>
            </div>

            <!-- Disclaimers Section -->
            <div
                class="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-muted/10 p-6 shadow-sm"
            >
                <h3
                    class="flex items-center gap-2 text-sm font-bold text-foreground"
                >
                    <HelpCircle class="h-4.5 w-4.5 text-muted-foreground" />
                    Catatan tentang hasil WattWise
                </h3>
                <div
                    class="grid gap-3 text-xs leading-relaxed font-medium text-muted-foreground"
                >
                    <p class="flex items-start gap-2.5">
                        <span class="mt-1 shrink-0 text-primary">•</span>
                        <span
                            >Perkiraan WattWise dibuat dari data yang Anda
                            masukkan dan bukan tagihan resmi PLN.</span
                        >
                    </p>
                    <p class="flex items-start gap-2.5">
                        <span class="mt-1 shrink-0 text-primary">•</span>
                        <span
                            >Sisa pendapatan belum dikurangi biaya lain seperti
                            bahan baku, gaji, sewa, air, dan internet.</span
                        >
                    </p>
                    <p class="flex items-start gap-2.5">
                        <span class="mt-1 shrink-0 text-primary">•</span>
                        <span
                            >WattWise membantu membaca catatan usaha; WattWise
                            bukan aplikasi resmi PLN atau alat ukur
                            listrik.</span
                        >
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
