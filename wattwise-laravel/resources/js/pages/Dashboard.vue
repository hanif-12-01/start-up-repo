<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { LayoutGrid, Building2, Zap, Coins, FileBarChart2, ArrowRight, AlertTriangle, HelpCircle, Activity, Sparkles, Lightbulb } from '@lucide/vue';
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
    <Head title="Beranda WattWise" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Welcome Section -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
                <h1 class="text-3xl font-bold tracking-tight text-foreground">
                    Selamat Datang, {{ userName || 'Pengguna' }}!
                </h1>
                <p class="text-muted-foreground text-base">
                    Kelola pemakaian listrik, analisis biaya, dan pendapatan usaha Anda.
                </p>
            </div>

            <!-- Business Switcher (if businesses exist) -->
            <div v-if="businesses.length > 0" class="flex flex-col gap-1.5 min-w-[200px]">
                <label for="business-select" class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Properti / Usaha</label>
                <select 
                    id="business-select" 
                    :value="activeBusinessId" 
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Onboarding Notice / CTA if no business exists -->
        <div 
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                    <span>⚡</span> Mulai Onboarding WattWise
                </h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    Anda belum mendaftarkan usaha atau properti sewaan. Lengkapi onboarding profil usaha Anda sekarang untuk mendapatkan analisis biaya energi listrik yang akurat.
                </p>
            </div>
            <Link 
                href="/onboarding"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm self-start md:self-auto shrink-0"
            >
                Mulai Onboarding
                <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <template v-else>
            <!-- Active Business Details -->
            <div class="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="font-semibold text-foreground text-base">{{ businessName }}</h3>
                        <p class="text-xs text-muted-foreground">
                            Kategori: <strong class="text-foreground/80 font-medium">{{ formatBusinessType(businessType) }}</strong>
                        </p>
                    </div>
                </div>
                <div class="text-sm text-muted-foreground">
                    Total terdaftar: <strong>{{ businessCount }}</strong> properti / usaha
                </div>
            </div>

            <!-- Cost Intelligence Summary Section -->
            <div class="flex flex-col gap-4">
                <div class="border-b border-border pb-2 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Activity class="h-5 w-5 text-primary" /> Ringkasan Listrik Bulan Ini
                    </h2>
                    <span v-if="activeMonthName" class="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {{ activeMonthName }}
                    </span>
                </div>

                <!-- Grid of summary cards -->
                <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <!-- Estimasi Tagihan Listrik Card -->
                    <div 
                        class="rounded-xl border p-6 bg-card shadow-sm flex flex-col gap-2"
                        :class="{ 'opacity-50 border-muted bg-muted/10': dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY' }"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-muted-foreground">Estimasi Tagihan Listrik</span>
                            <Zap class="h-4 w-4 text-yellow-500" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-2xl font-bold text-foreground">
                                {{ formatIDR(electricityCostIdr) }}
                            </span>
                            <span 
                                v-if="latestElectricityEntry && !latestElectricityEntry.bill_amount_idr"
                                class="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold"
                            >
                                *Estimasi Sistem
                            </span>
                            <span v-else class="text-[10px] text-muted-foreground">&nbsp;</span>
                        </div>
                    </div>

                    <!-- Pemakaian Listrik Card -->
                    <div 
                        class="rounded-xl border p-6 bg-card shadow-sm flex flex-col gap-2"
                        :class="{ 'opacity-50 border-muted bg-muted/10': dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY' }"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-muted-foreground">Pemakaian Listrik</span>
                            <Zap class="h-4 w-4 text-yellow-500" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-2xl font-bold text-foreground">
                                {{ formatKWh(usageKwh) }}
                            </span>
                            <span class="text-[10px] text-muted-foreground">
                                {{ latestElectricityEntry?.tariff_per_kwh ? `@ Rp${Number(latestElectricityEntry.tariff_per_kwh).toLocaleString('id-ID')}/kWh` : 'Tanpa tarif per kWh' }}
                            </span>
                        </div>
                    </div>

                    <!-- Rasio Listrik terhadap Pendapatan Card -->
                    <div 
                        class="rounded-xl border p-6 bg-card shadow-sm flex flex-col gap-2"
                        :class="{ 'opacity-50 border-muted bg-muted/10': dataCompleteness !== 'COMPLETE' }"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-muted-foreground">Rasio Listrik / Pendapatan</span>
                            <Coins class="h-4 w-4 text-green-500" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-2xl font-bold text-foreground">
                                {{ formatPercent(electricityRevenueRatioPercent) }}
                            </span>
                            <span class="text-[10px] text-muted-foreground">
                                Pendapatan: {{ formatIDR(revenueAmountIdr) }}
                            </span>
                        </div>
                    </div>

                    <!-- Sisa Pendapatan Setelah Listrik Card -->
                    <div 
                        class="rounded-xl border p-6 bg-card shadow-sm flex flex-col gap-2"
                        :class="{ 'opacity-50 border-muted bg-muted/10': dataCompleteness !== 'COMPLETE' }"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-muted-foreground">Sisa Pendapatan Setelah Listrik</span>
                            <Coins class="h-4 w-4 text-green-500" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-2xl font-bold text-foreground">
                                {{ formatIDR(remainingRevenueAfterElectricity) }}
                            </span>
                            <span class="text-[10px] text-red-500 font-medium">
                                *Belum laba bersih
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Conditional warnings / empty states -->
                <div v-if="dataCompleteness === 'EMPTY' || dataCompleteness === 'NO_ELECTRICITY'" class="rounded-xl border border-yellow-200/60 dark:border-yellow-900/30 bg-yellow-50/40 dark:bg-yellow-950/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <div class="flex items-start gap-3">
                        <AlertTriangle class="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p class="text-sm text-yellow-800 dark:text-yellow-300">
                            Belum ada data listrik. Catat data listrik bulanan untuk mulai melihat ringkasan.
                        </p>
                    </div>
                    <Link 
                        href="/electricity"
                        class="inline-flex items-center justify-center rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 text-xs font-medium shrink-0 transition-colors shadow-sm"
                    >
                        Catat Listrik
                    </Link>
                </div>

                <div v-else-if="dataCompleteness === 'NO_REVENUE'" class="rounded-xl border border-blue-200/60 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <div class="flex items-start gap-3">
                        <Info class="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <p class="text-sm text-blue-800 dark:text-blue-300">
                            Belum ada data pendapatan. Tambahkan pendapatan agar rasio listrik bisa dihitung.
                        </p>
                    </div>
                    <Link 
                        href="/revenue"
                        class="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-medium shrink-0 transition-colors shadow-sm"
                    >
                        Catat Pendapatan
                    </Link>
                </div>
            </div>

            <!-- Insight Utama Section -->
            <div class="mt-2 flex flex-col gap-4">
                <div class="border-b border-border pb-2">
                    <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Sparkles class="h-5 w-5 text-primary" /> Insight Utama
                    </h2>
                </div>

                <div class="grid gap-6 md:grid-cols-3">
                    <!-- Skor Efisiensi Listrik Card -->
                    <div class="md:col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-4">
                        <div>
                            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skor Efisiensi Listrik</h3>
                            <p class="text-xs text-muted-foreground mt-1">Estimasi Simulatif · Berdasarkan data input</p>
                        </div>
                        
                        <div class="flex flex-col items-center justify-center py-4">
                            <template v-if="efficiencyScore && efficiencyScore.score !== null">
                                <div class="relative flex items-center justify-center">
                                    <span class="text-5xl font-extrabold text-foreground">
                                        {{ efficiencyScore.score }}<span class="text-2xl text-muted-foreground">/100</span>
                                    </span>
                                </div>
                                <span 
                                    class="mt-3 px-3 py-1 text-xs font-bold rounded-full"
                                    :class="{
                                        'bg-green-500/10 text-green-500': efficiencyScore.status === 'GOOD',
                                        'bg-yellow-500/10 text-yellow-500': efficiencyScore.status === 'WATCH',
                                        'bg-red-500/10 text-red-500': efficiencyScore.status === 'CHECK'
                                    }"
                                >
                                    {{ efficiencyScore.label }}
                                </span>
                            </template>
                            <template v-else>
                                <span class="text-2xl font-bold text-muted-foreground text-center py-2">
                                    Data belum cukup
                                </span>
                                <span class="mt-2 text-xs text-center text-muted-foreground px-2">
                                    Isi tagihan listrik dan pendapatan untuk melihat skor.
                                </span>
                            </template>
                        </div>

                        <div class="border-t border-border/60 pt-3 text-[11px] text-muted-foreground leading-relaxed">
                            Skor ini adalah estimasi internal WattWise berdasarkan data input, bukan audit energi resmi.
                        </div>
                    </div>

                    <!-- Recommendations List Card -->
                    <div class="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-4">
                        <div class="flex items-center justify-between border-b border-border/60 pb-3">
                            <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Lightbulb class="h-4 w-4 text-primary" /> Rekomendasi Penghematan
                            </h3>
                            <Link 
                                href="/recommendations"
                                class="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            >
                                Lihat Rekomendasi Lengkap
                                <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>

                        <!-- List of Top 3 Recommendations -->
                        <div class="flex-1 flex flex-col gap-4">
                            <template v-if="topRecommendations && topRecommendations.length > 0">
                                <div 
                                    v-for="rec in topRecommendations" 
                                    :key="rec.type"
                                    class="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-muted/10"
                                >
                                    <div class="flex items-center justify-between gap-2 flex-wrap">
                                        <span class="font-bold text-foreground text-xs flex items-center gap-1.5">
                                            <span class="h-1.5 w-1.5 rounded-full" :class="{
                                                'bg-red-500': rec.priority === 'HIGH',
                                                'bg-yellow-500': rec.priority === 'MEDIUM',
                                                'bg-blue-500': rec.priority === 'LOW'
                                            }"></span>
                                            {{ rec.title }}
                                        </span>
                                        <span 
                                            class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                            :class="{
                                                'bg-red-500/10 text-red-500': rec.priority === 'HIGH',
                                                'bg-yellow-500/10 text-yellow-500': rec.priority === 'MEDIUM',
                                                'bg-blue-500/10 text-blue-500': rec.priority === 'LOW'
                                            }"
                                        >
                                            {{ rec.priority === 'HIGH' ? 'Prioritas Tinggi' : (rec.priority === 'MEDIUM' ? 'Prioritas Sedang' : 'Prioritas Ringan') }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {{ rec.description }}
                                    </p>
                                    <div class="flex flex-wrap items-center justify-between gap-2 mt-1 text-[11px]">
                                        <span class="text-foreground/80 font-medium">
                                            Tindakan: <span class="text-muted-foreground font-normal">{{ rec.action }}</span>
                                        </span>
                                        <div class="flex items-center gap-1 flex-wrap">
                                            <span 
                                                v-for="badge in rec.badges" 
                                                :key="badge"
                                                class="px-1.5 py-0.5 bg-muted rounded text-[9px] text-muted-foreground font-medium border border-border/40"
                                            >
                                                {{ badge }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <div class="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                    <p class="text-sm">Belum ada rekomendasi aktif saat ini.</p>
                                    <p class="text-xs mt-1">Lengkapi data usaha atau peralatan untuk memicu analisis.</p>
                                </div>
                            </template>
                        </div>

                        <div class="border-t border-border/60 pt-3 text-[10px] text-muted-foreground italic">
                            *Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Appliances Summary -->
            <div v-if="topAppliances && topAppliances.length > 0" class="rounded-xl border border-border bg-card p-5 shadow-sm mt-4 flex flex-col gap-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-2 gap-2">
                    <div class="flex flex-col gap-0.5">
                        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <AlertTriangle class="h-4 w-4 text-amber-500" />
                            Kandidat Alat yang Perlu Dicek
                        </h3>
                        <p class="text-xs text-muted-foreground pl-6">
                            Berdasarkan estimasi daya dan jam pakai. Ini bukan pengukuran sensor.
                        </p>
                    </div>
                    <Link href="/appliances" class="text-xs text-primary hover:underline flex items-center gap-1">
                        Lihat Semua Alat <ArrowRight class="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div 
                        v-for="(appliance, index) in topAppliances" 
                        :key="appliance.id"
                        class="p-3 border border-border bg-muted/20 rounded-lg flex items-center justify-between text-xs"
                    >
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-amber-600 dark:text-amber-400">#{{ index + 1 }}</span>
                            <span class="font-medium text-foreground">{{ appliance.name }}</span>
                        </div>
                        <span class="text-muted-foreground font-semibold">{{ formatKWh(appliance.estimated_monthly_kwh) }}</span>
                    </div>
                </div>
                <div class="text-xs text-muted-foreground italic flex items-center gap-1">
                    <span>*Estimasi Simulatif · Perlu Verifikasi Manual</span>
                </div>
            </div>

            <!-- Features Quick Access Grid -->
            <div class="border-b border-border pb-2 mt-6">
                <h2 class="text-lg font-semibold text-foreground">Menu Navigasi Cepat</h2>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
                <!-- Catat Listrik Card -->
                <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                    <div class="flex flex-col gap-3">
                        <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
                            <Zap class="h-5 w-5" />
                        </div>
                        <h3 class="text-lg font-semibold text-foreground">Catat Data Listrik</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed">
                            Input pemakaian kWh bulanan atau total pembayaran rekening listrik untuk melacak konsumsi energi.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link href="/electricity" class="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            Catat Listrik
                            <ArrowRight class="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <span class="text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded font-medium">Aktif</span>
                    </div>
                </div>

                <!-- Catat Pendapatan Card -->
                <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                    <div class="flex flex-col gap-3">
                        <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                            <Coins class="h-5 w-5" />
                        </div>
                        <h3 class="text-lg font-semibold text-foreground">Catat Pendapatan</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed">
                            Input pemasukan usaha bulanan Anda untuk memantau porsi pengeluaran listrik terhadap operasional.
                        </p>
                    </div>
                    <div class="mt-6 flex items-center justify-between">
                        <Link href="/revenue" class="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            Catat Pendapatan
                            <ArrowRight class="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <span class="text-[10px] text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-medium">Aktif</span>
                    </div>
                </div>
            </div>

            <!-- Disclaimers Section -->
            <div class="rounded-xl border border-border/80 bg-card/40 p-6 flex flex-col gap-4 shadow-sm mt-4">
                <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle class="h-4 w-4 text-muted-foreground" /> Informasi Penting & Batasan Aplikasi
                </h3>
                <div class="grid gap-3 text-xs leading-relaxed text-muted-foreground">
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.</span>
                    </p>
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.</span>
                    </p>
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.</span>
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
