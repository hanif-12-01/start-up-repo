<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { LayoutGrid, Building2, Zap, Coins, FileBarChart2, ArrowRight, AlertTriangle, HelpCircle, Activity, Sparkles, Lightbulb, Info } from '@lucide/vue';
import { computed } from 'vue';

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
    switch(type) {
        case 'KOS_PROPERTY': return 'Kos / Properti';
        case 'FNB': return 'Warung / F&B';
        case 'LAUNDRY': return 'Laundry';
        case 'RETAIL': return 'Toko / Retail';
        case 'COLD_STORAGE': return 'Cold Storage';
        case 'OTHER': return 'Lainnya';
        default: return type || '';
    }
};

const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return 'Rp -';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatKWh = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '- kWh';
    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kWh';
};

const formatPercent = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '-';
    return Number(value).toFixed(1) + '%';
};

const formatMonth = (dateStr?: string) => {
    if (!dateStr) return '';
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
    <Head title="Beranda Dashboard" />

    <div class="flex flex-1 flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
        <!-- Welcome Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
            <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-3xl font-extrabold tracking-tight text-foreground">
                        Selamat Datang, {{ userName || 'Pengguna' }}!
                    </h1>
                    <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        Demo PRO_TRIAL
                    </span>
                </div>
                <p class="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                    Kelola pemakaian listrik, analisis biaya operasional, dan optimalkan cash flow usaha properti Anda secara cerdas.
                </p>
            </div>

            <!-- Business Switcher -->
            <div v-if="businesses.length > 0" class="flex flex-col gap-2 min-w-[240px] bg-card p-3 rounded-xl border border-border shadow-sm">
                <label for="business-select" class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Properti / Usaha</label>
                <select
                    id="business-select"
                    :value="activeBusinessId"
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all cursor-pointer"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || 'Purwokerto' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Onboarding Notice / CTA if no business exists -->
        <div
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md"
        >
            <div class="flex flex-col gap-2.5 max-w-2xl">
                <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
                    <span class="text-emerald-500">⚡</span> Mulai Onboarding WattWise AI
                </h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    Anda belum mendaftarkan properti atau usaha sewaan Anda. Lengkapi profil usaha pertama Anda sekarang untuk mengakses simulasi biaya dan rekomendasi efisiensi energi.
                </p>
            </div>
            <Link
                href="/onboarding"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md hover:shadow-lg self-start md:self-auto shrink-0"
            >
                Mulai Onboarding
                <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <template v-else>
            <!-- Active Business Details Card -->
            <div class="rounded-2xl border border-emerald-500/20 border-l-4 border-l-emerald-500 bg-emerald-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all hover:bg-emerald-500/10">
                <div class="flex items-center gap-4">
                    <div class="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Building2 class="h-6 w-6" />
                    </div>
                    <div>
                        <h3 class="font-bold text-foreground text-lg leading-tight">{{ businessName }}</h3>
                        <p class="text-xs text-muted-foreground mt-1">
                            Segmen Bisnis: <strong class="text-foreground/80 font-bold bg-muted/60 px-2 py-0.5 rounded ml-1">{{ formatBusinessType(businessType) }}</strong>
                        </p>
                    </div>
                </div>
                <div class="text-xs sm:text-sm text-muted-foreground font-semibold sm:text-right">
                    Total terdaftar: <span class="text-foreground font-extrabold text-base">{{ businessCount }}</span> properti / usaha aktif
                </div>
            </div>

            <!-- Cost Intelligence Summary Section -->
            <div class="flex flex-col gap-5">
                <div class="border-b border-border pb-3 flex items-center justify-between">
                    <h2 class="text-xl font-bold text-foreground flex items-center gap-2.5">
                        <Activity class="h-5 w-5 text-emerald-500" /> Ringkasan Listrik & Cash Flow
                    </h2>
                    <span v-if="activeMonthName" class="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm">
                        {{ activeMonthName }}
                    </span>
                </div>

                <!-- Grid of summary cards -->
                <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <!-- Estimasi Tagihan Listrik Card -->
                    <div
                        class="rounded-2xl border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                        :class="[
                            dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY'
                                ? 'opacity-55 border-muted bg-muted/10'
                                : 'border-border hover:border-yellow-500/30'
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimasi Tagihan Listrik</span>
                            <div class="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Zap class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-2xl font-extrabold text-foreground tracking-tight">
                                {{ formatIDR(electricityCostIdr) }}
                            </span>
                            <span
                                v-if="latestElectricityEntry && !latestElectricityEntry.bill_amount_idr"
                                class="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded self-start mt-1"
                            >
                                *Estimasi Sistem
                            </span>
                            <span v-else class="text-[10px] text-muted-foreground">&nbsp;</span>
                        </div>
                    </div>

                    <!-- Pemakaian Listrik Card -->
                    <div
                        class="rounded-2xl border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                        :class="[
                            dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY'
                                ? 'opacity-55 border-muted bg-muted/10'
                                : 'border-border hover:border-yellow-500/30'
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pemakaian Listrik</span>
                            <div class="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Zap class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-2xl font-extrabold text-foreground tracking-tight">
                                {{ formatKWh(usageKwh) }}
                            </span>
                            <span class="text-[10px] text-muted-foreground font-semibold">
                                {{ latestElectricityEntry?.tariff_per_kwh ? `@ Rp${Number(latestElectricityEntry.tariff_per_kwh).toLocaleString('id-ID')}/kWh` : 'Tanpa tarif per kWh' }}
                            </span>
                        </div>
                    </div>

                    <!-- Rasio Listrik terhadap Pendapatan Card -->
                    <div
                        class="rounded-2xl border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                        :class="[
                            dataCompleteness !== 'COMPLETE'
                                ? 'opacity-55 border-muted bg-muted/10'
                                : 'border-border hover:border-green-500/30'
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground font-display">Rasio Listrik / Pendapatan</span>
                            <div class="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                <Coins class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-2xl font-extrabold text-foreground tracking-tight">
                                {{ formatPercent(electricityRevenueRatioPercent) }}
                            </span>
                            <span class="text-[10px] text-muted-foreground font-semibold">
                                Pendapatan: {{ formatIDR(revenueAmountIdr) }}
                            </span>
                        </div>
                    </div>

                    <!-- Sisa Pendapatan Setelah Listrik Card -->
                    <div
                        class="rounded-2xl border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                        :class="[
                            dataCompleteness !== 'COMPLETE'
                                ? 'opacity-55 border-muted bg-muted/10'
                                : 'border-border hover:border-green-500/30'
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sisa Pendapatan</span>
                            <div class="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                <Coins class="h-4.5 w-4.5" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-2xl font-extrabold text-foreground tracking-tight">
                                {{ formatIDR(remainingRevenueAfterElectricity) }}
                            </span>
                            <span class="text-[10px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded self-start mt-1">
                                *Belum laba bersih
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Conditional warnings / empty states -->
                <div v-if="dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY'" class="rounded-2xl border border-yellow-250 bg-yellow-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 shadow-sm">
                    <div class="flex items-start gap-3.5">
                        <AlertTriangle class="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div class="flex flex-col gap-0.5">
                            <p class="text-sm font-bold text-yellow-900 dark:text-yellow-350">Data listrik bulanan Anda belum diisi</p>
                            <p class="text-xs text-yellow-800/80 dark:text-yellow-400/80">Masukkan tagihan listrik bulan ini untuk mengaktifkan kalkulasi efisiensi.</p>
                        </div>
                    </div>
                    <Link
                        href="/electricity"
                        class="inline-flex items-center justify-center rounded-xl bg-yellow-600 hover:bg-yellow-750 text-white px-5 py-3 text-xs font-bold shrink-0 transition-colors shadow-sm"
                    >
                        Catat Listrik Sekarang
                    </Link>
                </div>

                <div v-else-if="dataCompleteness === 'NO_REVENUE'" class="rounded-xl border border-blue-200 bg-blue-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 shadow-sm">
                    <div class="flex items-start gap-3.5">
                        <Info class="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div class="flex flex-col gap-0.5">
                            <p class="text-sm font-bold text-blue-900 dark:text-blue-300">Data pendapatan bulanan belum dicatat</p>
                            <p class="text-xs text-blue-850/80 dark:text-blue-400/85">Catat pendapatan kotor Anda untuk menghitung seberapa besar pengeluaran listrik memengaruhi profitabilitas.</p>
                        </div>
                    </div>
                    <Link
                        href="/revenue"
                        class="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-xs font-bold shrink-0 transition-colors shadow-sm"
                    >
                        Catat Pendapatan
                    </Link>
                </div>
            </div>

            <!-- Insight Utama Section -->
            <div class="mt-4 flex flex-col gap-5">
                <div class="border-b border-border pb-3">
                    <h2 class="text-xl font-bold text-foreground flex items-center gap-2.5">
                        <Sparkles class="h-5 w-5 text-emerald-500" /> Analisis &amp; Rekomendasi
                    </h2>
                </div>

                <div class="grid gap-6 md:grid-cols-3">
                    <!-- Skor Efisiensi Listrik Card -->
                    <div class="md:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-6 hover:shadow-md transition-all duration-300">
                        <div class="flex flex-col gap-1">
                            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Skor Efisiensi Listrik</h3>
                            <p class="text-[10px] text-muted-foreground">Estimasi Simulatif · Berdasarkan data input</p>
                        </div>

                        <div class="flex flex-col items-center justify-center py-2">
                            <template v-if="efficiencyScore && efficiencyScore.score !== null">
                                <div class="relative flex items-center justify-center h-32 w-32">
                                    <!-- Radial Ring Progress visual -->
                                    <svg class="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path class="text-muted/10 dark:text-muted/20" stroke="currentColor" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path
                                            class="text-emerald-500 transition-all duration-500 gauge-path"
                                            :class="{
                                                'text-emerald-500': efficiencyScore.status === 'GOOD',
                                                'text-yellow-500': efficiencyScore.status === 'WATCH',
                                                'text-red-500': efficiencyScore.status === 'CHECK'
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
                                        <span class="text-3xl font-extrabold text-foreground">{{ efficiencyScore.score }}</span>
                                        <span class="text-[9px] text-muted-foreground font-bold tracking-widest">SKOR</span>
                                    </div>
                                </div>
                                <span
                                    class="mt-4 px-3.5 py-1 text-xs font-extrabold rounded-full border shadow-sm"
                                    :class="{
                                        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/15': efficiencyScore.status === 'GOOD',
                                        'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/15': efficiencyScore.status === 'WATCH',
                                        'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/15': efficiencyScore.status === 'CHECK'
                                    }"
                                >
                                    {{ efficiencyScore.label }}
                                </span>
                            </template>
                            <template v-else>
                                <div class="h-28 w-28 rounded-full border-4 border-dashed border-muted/20 flex flex-col items-center justify-center p-3 text-center">
                                    <span class="text-[10px] font-bold text-muted-foreground">INCOMPLETE</span>
                                </div>
                                <span class="mt-4 text-xs font-bold text-muted-foreground text-center">
                                    Data belum cukup
                                </span>
                            </template>
                        </div>

                        <div class="border-t border-border/60 pt-4 text-[10px] text-muted-foreground leading-relaxed text-center">
                            Skor di atas dihitung secara sistematis dari data input listrik &amp; spesifikasi peralatan terdaftar.
                        </div>
                    </div>

                    <!-- Recommendations List Card -->
                    <div class="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-6 hover:shadow-md transition-all duration-300">
                        <div class="flex items-center justify-between border-b border-border/60 pb-3">
                            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
                                <Lightbulb class="h-4.5 w-4.5 text-emerald-500" /> Rekomendasi Penghematan Utama
                            </h3>
                            <Link
                                href="/recommendations"
                                class="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                            >
                                Selengkapnya
                                <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>

                        <!-- List of Top 3 Recommendations -->
                        <div class="flex-1 flex flex-col gap-4">
                            <template v-if="topRecommendations && topRecommendations.length > 0">
                                <div
                                    v-for="rec in topRecommendations"
                                    :key="rec.type"
                                    class="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-muted/10 transition-all hover:bg-muted/20"
                                >
                                    <div class="flex items-center justify-between gap-2 flex-wrap">
                                        <span class="font-extrabold text-foreground text-sm flex items-center gap-2">
                                            <span class="h-2 w-2 rounded-full" :class="{
                                                'bg-red-500 animate-pulse': rec.priority === 'HIGH',
                                                'bg-yellow-500': rec.priority === 'MEDIUM',
                                                'bg-blue-500': rec.priority === 'LOW'
                                            }"></span>
                                            {{ rec.title }}
                                        </span>
                                        <span
                                            class="text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm"
                                            :class="{
                                                'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20': rec.priority === 'HIGH',
                                                'bg-yellow-500/10 text-yellow-650 dark:text-yellow-400 border-yellow-500/20': rec.priority === 'MEDIUM',
                                                'bg-blue-500/10 text-blue-650 dark:text-blue-400 border-blue-500/20': rec.priority === 'LOW'
                                            }"
                                        >
                                            {{ rec.priority === 'HIGH' ? 'Prioritas Tinggi' : (rec.priority === 'MEDIUM' ? 'Prioritas Sedang' : 'Prioritas Ringan') }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-muted-foreground leading-relaxed pl-4">
                                        {{ rec.description }}
                                    </p>
                                    <div class="flex flex-wrap items-center justify-between gap-2 mt-1 text-[11px] pl-4 border-t border-border/40 pt-2">
                                        <span class="text-foreground/80 font-bold">
                                            Tindakan: <span class="text-muted-foreground font-semibold">{{ rec.action }}</span>
                                        </span>
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            <span
                                                v-for="badge in rec.badges"
                                                :key="badge"
                                                class="px-2 py-0.5 bg-muted rounded text-[9px] text-muted-foreground font-bold border border-border/60"
                                            >
                                                {{ badge }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <div class="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
                                    <p class="text-sm font-semibold">Belum ada rekomendasi aktif saat ini.</p>
                                    <p class="text-xs mt-1">Lengkapi data usaha atau spesifikasi peralatan untuk memicu analisis.</p>
                                </div>
                            </template>
                        </div>

                        <div class="border-t border-border/60 pt-4 text-[10px] text-muted-foreground italic text-center">
                            *Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Appliances Summary -->
            <div v-if="topAppliances && topAppliances.length > 0" class="rounded-2xl border border-border bg-card p-6 shadow-sm mt-6 flex flex-col gap-4 hover:shadow-md transition-all duration-300">
                <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-2">
                    <div class="flex flex-col gap-0.5">
                        <h3 class="text-base font-bold text-foreground flex items-center gap-2.5">
                            <AlertTriangle class="h-4.5 w-4.5 text-amber-500" />
                            Kandidat Alat yang Perlu Dicek
                        </h3>
                        <p class="text-xs text-muted-foreground pl-7">
                            Berdasarkan perkiraan daya dan durasi pakai. Tidak diukur dengan sensor fisik.
                        </p>
                    </div>
                    <Link href="/appliances" class="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        Daftar Peralatan Lengkap <ArrowRight class="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                        v-for="(appliance, index) in topAppliances"
                        :key="appliance.id"
                        class="p-4 border border-border bg-muted/20 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-muted/30"
                    >
                        <div class="flex items-center gap-2.5">
                            <span class="font-extrabold text-amber-600 dark:text-amber-400">#{{ index + 1 }}</span>
                            <span class="font-bold text-foreground">{{ appliance.name }}</span>
                        </div>
                        <span class="text-muted-foreground font-extrabold">{{ formatKWh(appliance.estimated_monthly_kwh) }}</span>
                    </div>
                </div>
                <div class="text-[10px] text-muted-foreground italic flex items-center gap-1.5 mt-1">
                    <span>*Estimasi Simulatif · Perlu Verifikasi Manual</span>
                </div>
            </div>

            <!-- Features Quick Access Grid -->
            <div class="border-b border-border pb-2 mt-8">
                <h2 class="text-lg font-bold text-foreground">Menu Akses Cepat</h2>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
                <!-- Catat Listrik Card -->
                <div class="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div class="flex flex-col gap-3">
                        <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
                            <Zap class="h-5 w-5 fill-current" />
                        </div>
                        <h3 class="text-lg font-bold text-foreground">Catat Data Listrik</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed">
                            Input pemakaian kWh bulanan atau total pembayaran rekening listrik untuk melacak fluktuasi konsumsi energi usaha Anda.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link href="/electricity" class="text-sm font-bold text-primary hover:underline flex items-center gap-1.5">
                            Buka Catat Listrik
                            <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <span class="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/10">Aktif</span>
                    </div>
                </div>

                <!-- Catat Pendapatan Card -->
                <div class="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div class="flex flex-col gap-3">
                        <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                            <Coins class="h-5 w-5" />
                        </div>
                        <h3 class="text-lg font-bold text-foreground">Catat Pendapatan</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed">
                            Input pemasukan kotor usaha bulanan Anda untuk memantau porsi pengeluaran listrik terhadap operasional bisnis.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link href="/revenue" class="text-sm font-bold text-primary hover:underline flex items-center gap-1.5">
                            Buka Catat Pendapatan
                            <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <span class="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/10">Aktif</span>
                    </div>
                </div>
            </div>

            <!-- Disclaimers Section -->
            <div class="rounded-2xl border border-border bg-muted/10 p-6 flex flex-col gap-4 shadow-sm mt-6">
                <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
                    <HelpCircle class="h-4.5 w-4.5 text-muted-foreground" /> Informasi Penting &amp; Batasan Aplikasi
                </h3>
                <div class="grid gap-3 text-xs leading-relaxed text-muted-foreground font-medium">
                    <p class="flex items-start gap-2.5">
                        <span class="text-primary shrink-0 mt-1">•</span>
                        <span>Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.</span>
                    </p>
                    <p class="flex items-start gap-2.5">
                        <span class="text-primary shrink-0 mt-1">•</span>
                        <span>Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.</span>
                    </p>
                    <p class="flex items-start gap-2.5">
                        <span class="text-primary shrink-0 mt-1">•</span>
                        <span>WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.</span>
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
