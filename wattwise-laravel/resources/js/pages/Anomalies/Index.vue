<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { AlertTriangle, Info, Zap, Coins, Clock, Lock, Sparkles, Building2, ArrowRight, CheckCircle2, ShieldAlert } from '@lucide/vue';
import { ref, computed } from 'vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
}

interface HistoryItem {
    period_month: string;
    usage_kwh: number | null;
    bill_amount_idr: number | null;
    tariff_per_kwh: number | null;
}

interface Analysis {
    has_data: boolean;
    current_status: 'Normal' | 'Perlu Dicek' | 'Boros';
    baseline_usage_kwh: number | null;
    observed_usage_kwh: number | null;
    difference_kwh: number | null;
    difference_percent: number | null;
    estimated_impact_idr: number | null;
    possible_causes: string[];
    recommended_actions: string[];
    selected_month: string;
    history: HistoryItem[];
    is_full_history_locked: boolean;
    data_requirements: {
        history_months: number;
        has_gaps: boolean;
        needs_more_data: boolean;
        message: string;
    };
    disclaimer: string;
}

const props = defineProps<{
    businesses: Business[];
    activeBusinessId: number | null;
    hasBusiness: boolean;
    selectedMonth: string;
    availableMonths: string[];
    analysis: Analysis | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Peringatan Pemakaian', href: '/anomalies' },
        ],
    },
});

// State for local status filter
const selectedStatusFilter = ref<'All' | 'Normal' | 'Perlu Dicek' | 'Boros'>('All');

// Utility formatting methods
const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return 'Rp -';
    }

    const val = Number(value);
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(val));

    return val < 0 ? `- ${formatted}` : formatted;
};

const formatKWh = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return '- kWh';
    }

    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kWh';
};

const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
        return '-';
    }

    const sign = value > 0 ? '+' : '';

    return sign + Number(value).toFixed(1) + '%';
};

const formatMonthName = (monthStr: string) => {
    if (!monthStr) {
return '';
}

    const parts = monthStr.split('-');

    if (parts.length !== 2) {
return monthStr;
}

    const [year, month] = parts;
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;

    return `${monthNames[mIdx]} ${year}`;
};

// Switch filters
const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/anomalies', { business_id: target.value, month: props.selectedMonth });
};

const switchMonth = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/anomalies', { business_id: props.activeBusinessId, month: target.value });
};

// Calculate preceding months status client-side chronologically
const enhancedHistory = computed(() => {
    if (!props.analysis || !props.analysis.history) {
return [];
}

    const history = props.analysis.history; // Oldest -> Newest chronologically
    const enhanced = [];
    const historicalUsages: number[] = [];

    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const usage = item.usage_kwh;

        let baseline: number | null = null;

        if (historicalUsages.length > 0) {
            baseline = historicalUsages.reduce((sum, u) => sum + u, 0) / historicalUsages.length;
        }

        let diffKwh: number | null = null;
        let diffPercent: number | null = null;
        let status: 'Normal' | 'Perlu Dicek' | 'Boros' = 'Normal';

        if (baseline !== null && usage !== null) {
            diffKwh = usage - baseline;

            if (baseline === 0) {
                diffPercent = usage > 0 ? 100.0 : 0.0;
            } else {
                diffPercent = (diffKwh / baseline) * 100.0;
            }

            if (diffPercent >= 20.0) {
                status = 'Boros';
            } else if (diffPercent >= 10.0) {
                status = 'Perlu Dicek';
            }
        }

        enhanced.push({
            ...item,
            baseline_usage_kwh: baseline,
            difference_kwh: diffKwh,
            difference_percent: diffPercent,
            status,
        });

        if (usage !== null) {
            historicalUsages.push(usage);
        }
    }

    // Newest first for table view
    return [...enhanced].reverse();
});

// Local status filtering
const filteredHistory = computed(() => {
    if (selectedStatusFilter.value === 'All') {
        return enhancedHistory.value;
    }

    return enhancedHistory.value.filter((item) => item.status === selectedStatusFilter.value);
});
</script>

<template>
    <Head title="Peringatan Pemakaian" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header & Top Filter Panel -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div class="flex flex-col gap-1">
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <ShieldAlert class="h-8 w-8 text-primary animate-pulse" /> Peringatan Pemakaian
                </h1>
                <p class="text-muted-foreground text-sm max-w-xl">
                    Deteksi penyimpangan dan lonjakan pemakaian listrik secara otomatis dan deterministik dibanding rata-rata historis usaha Anda.
                </p>
            </div>

            <!-- Business & Month Dropdowns -->
            <div v-if="businesses.length > 0" class="flex flex-wrap gap-3 items-center">
                <div class="flex flex-col gap-1 min-w-[180px]">
                    <label for="business-select" class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Properti</label>
                    <select
                        id="business-select"
                        :value="activeBusinessId ?? undefined"
                        @change="switchBusiness"
                        class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option v-for="b in businesses" :key="b.id" :value="b.id">
                            {{ b.name }}
                        </option>
                    </select>
                </div>

                <div v-if="availableMonths.length > 0" class="flex flex-col gap-1 min-w-[150px]">
                    <label for="month-select" class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Bulan</label>
                    <select
                        id="month-select"
                        :value="selectedMonth"
                        @change="switchMonth"
                        class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option v-for="m in availableMonths" :key="m" :value="m">
                            {{ formatMonthName(m) }}
                        </option>
                    </select>
                </div>
            </div>
        </div>

        <!-- State 1: No Business -->
        <div
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
                    <Building2 class="h-6 w-6 text-primary" /> Belum ada properti / usaha aktif
                </h2>
                <p class="text-muted-foreground text-sm">
                    Silakan selesaikan proses onboarding terlebih dahulu agar WattWise dapat melakukan analisis anomali listrik pada usaha Anda.
                </p>
            </div>
            <Link
                href="/onboarding"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shrink-0"
            >
                Mulai Onboarding <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <!-- State 2: Business exists but no data for selected month -->
        <div
            v-else-if="!analysis || !analysis.has_data"
            class="rounded-2xl border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center gap-4"
        >
            <div class="h-14 w-14 flex items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <AlertTriangle class="h-7 w-7" />
            </div>
            <div class="flex flex-col gap-1 max-w-md">
                <h3 class="text-lg font-bold text-foreground">Tidak ada data untuk bulan ini</h3>
                <p class="text-sm text-muted-foreground">
                    {{ analysis?.data_requirements.message || 'Belum ada data pemakaian listrik yang tercatat pada bulan yang dipilih.' }}
                </p>
            </div>
            <Link
                href="/electricity"
                class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm"
            >
                Catat Data Listrik <ArrowRight class="h-3.5 w-3.5" />
            </Link>
        </div>

        <!-- State 3: Analysis Available -->
        <template v-else>
            <!-- Insufficient History State banner -->
            <div
                v-if="analysis.data_requirements.needs_more_data"
                class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300"
            >
                <Info class="h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span class="leading-relaxed">{{ analysis.data_requirements.message }}</span>
            </div>

            <!-- Current Anomaly Status Banner -->
            <div
                class="relative overflow-hidden rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-all"
                :class="{
                    'bg-emerald-500/5 border-emerald-500/20': analysis.current_status === 'Normal',
                    'bg-amber-500/5 border-amber-500/20': analysis.current_status === 'Perlu Dicek',
                    'bg-red-500/5 border-red-500/20': analysis.current_status === 'Boros',
                }"
            >
                <div class="flex items-start gap-4">
                    <div
                        class="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                        :class="{
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': analysis.current_status === 'Normal',
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400': analysis.current_status === 'Perlu Dicek',
                            'bg-red-500/10 text-red-600 dark:text-red-400': analysis.current_status === 'Boros',
                        }"
                    >
                        <CheckCircle2 v-if="analysis.current_status === 'Normal'" class="h-6 w-6" />
                        <AlertTriangle v-else class="h-6 w-6" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Pemakaian Saat Ini</span>
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-black tracking-tight text-foreground">
                                {{ analysis.current_status }}
                            </span>
                            <span
                                v-if="analysis.difference_percent !== null && analysis.difference_percent > 0"
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                                :class="{
                                    'bg-amber-500/10 text-amber-600 dark:text-amber-400': analysis.current_status === 'Perlu Dicek',
                                    'bg-red-500/10 text-red-600 dark:text-red-400': analysis.current_status === 'Boros',
                                }"
                            >
                                {{ formatPercent(analysis.difference_percent) }} lebih boros
                            </span>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            Status dihitung secara deterministik berdasarkan data input pemakaian listrik Anda dibandingkan rata-rata historis.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Metrics Summary Cards -->
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <!-- Baseline -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                    <div class="flex items-center justify-between text-muted-foreground">
                        <span class="text-xs font-bold uppercase tracking-wider">Rata-rata Historis</span>
                        <Clock class="h-4.5 w-4.5" />
                    </div>
                    <span class="text-2xl font-black text-foreground tracking-tight">
                        {{ analysis.baseline_usage_kwh !== null ? formatKWh(analysis.baseline_usage_kwh) : '-' }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">Baseline pemakaian sebelum bulan terpilih</span>
                </div>

                <!-- Observed Usage -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                    <div class="flex items-center justify-between text-muted-foreground">
                        <span class="text-xs font-bold uppercase tracking-wider">Pemakaian Tercatat</span>
                        <Zap class="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span class="text-2xl font-black text-foreground tracking-tight">
                        {{ formatKWh(analysis.observed_usage_kwh) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">Penggunaan riil pada bulan terpilih</span>
                </div>

                <!-- Difference -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                    <div class="flex items-center justify-between text-muted-foreground">
                        <span class="text-xs font-bold uppercase tracking-wider">Selisih Pemakaian</span>
                        <span
                            class="text-xs font-extrabold"
                            :class="
                                analysis.difference_percent !== null && analysis.difference_percent > 0
                                    ? 'text-red-500'
                                    : 'text-emerald-500'
                            "
                        >
                            {{ formatPercent(analysis.difference_percent) }}
                        </span>
                    </div>
                    <span class="text-2xl font-black text-foreground tracking-tight">
                        {{ analysis.difference_kwh !== null ? formatKWh(analysis.difference_kwh) : '-' }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">Deviasi terhadap rata-rata historis</span>
                </div>

                <!-- Estimated Cost Impact -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                    <div class="flex items-center justify-between text-muted-foreground">
                        <span class="text-xs font-bold uppercase tracking-wider">Dampak Biaya</span>
                        <Coins class="h-4.5 w-4.5 text-yellow-500" />
                    </div>
                    <span class="text-2xl font-black text-foreground tracking-tight">
                        {{ analysis.estimated_impact_idr !== null ? formatIDR(analysis.estimated_impact_idr) : 'Rp -' }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">
                        {{
                            analysis.estimated_impact_idr !== null
                                ? 'Estimasi nominal akibat deviasi kWh'
                                : 'Tarif per kWh tidak tersedia'
                        }}
                    </span>
                </div>
            </div>

            <!-- Possible Causes & Recommended Actions -->
            <div class="grid gap-6 md:grid-cols-2">
                <!-- Causes -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-4">
                    <h3 class="text-base font-bold text-foreground flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-amber-500" /> Kemungkinan penyebab yang perlu dicek
                    </h3>

                    <div v-if="analysis.possible_causes.length === 0" class="flex flex-col items-center justify-center p-6 text-center gap-2">
                        <Lock class="h-8 w-8 text-muted-foreground" />
                        <span class="text-xs font-bold">Analisis Penyebab Terkunci</span>
                        <p class="text-[11px] text-muted-foreground">
                            Aktifkan paket Pro untuk membuka detail kemungkinan penyebab anomali pemakaian listrik secara lengkap.
                        </p>
                        <Link href="/plans" class="mt-1 text-xs text-primary font-bold hover:underline"> Upgrade Sekarang </Link>
                    </div>

                    <ul v-else class="flex flex-col gap-3">
                        <li
                            v-for="(cause, index) in analysis.possible_causes"
                            :key="index"
                            class="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                        >
                            <span class="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></span>
                            <span>{{ cause }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Actions -->
                <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-4">
                    <h3 class="text-base font-bold text-foreground flex items-center gap-2">
                        <Sparkles class="h-5 w-5 text-emerald-500" /> Rekomendasi Tindakan
                    </h3>

                    <div v-if="analysis.recommended_actions.length === 0" class="flex flex-col items-center justify-center p-6 text-center gap-2">
                        <Lock class="h-8 w-8 text-muted-foreground" />
                        <span class="text-xs font-bold">Rekomendasi Tindakan Terkunci</span>
                        <p class="text-[11px] text-muted-foreground">
                            Aktifkan paket Pro untuk membuka rekomendasi langkah mitigasi dan perbaikan konsumsi listrik secara detail.
                        </p>
                        <Link href="/plans" class="mt-1 text-xs text-primary font-bold hover:underline"> Upgrade Sekarang </Link>
                    </div>

                    <ul v-else class="flex flex-col gap-3">
                        <li
                            v-for="(action, index) in analysis.recommended_actions"
                            :key="index"
                            class="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                        >
                            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-2"></span>
                            <span>{{ action }}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Disclaimer Card -->
            <div class="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3 text-xs text-muted-foreground">
                <Info class="h-4.5 w-4.5 shrink-0 text-muted-foreground mt-0.5" />
                <span class="leading-relaxed font-medium">{{ analysis.disclaimer }}</span>
            </div>

            <!-- Anomaly History Section -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div class="flex flex-col">
                        <h3 class="text-lg font-bold text-foreground">Riwayat Analisis Anomali</h3>
                        <p class="text-xs text-muted-foreground">Daftar pemakaian listrik bulanan beserta status deviasi.</p>
                    </div>

                    <!-- Local Status Filter -->
                    <div class="flex items-center gap-1 bg-muted p-1 rounded-lg self-start">
                        <button
                            v-for="status in (['All', 'Normal', 'Perlu Dicek', 'Boros'] as const)"
                            :key="status"
                            type="button"
                            @click="selectedStatusFilter = status"
                            class="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                            :class="
                                selectedStatusFilter === status
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            "
                        >
                            {{ status }}
                        </button>
                    </div>
                </div>

                <!-- History Table Wrapper -->
                <div class="relative overflow-x-auto rounded-lg border border-border">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                                <th class="p-4 font-bold">Bulan</th>
                                <th class="p-4 font-bold">Pemakaian</th>
                                <th class="p-4 font-bold">Baseline</th>
                                <th class="p-4 font-bold">Selisih</th>
                                <th class="p-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="filteredHistory.length === 0" class="border-b border-border">
                                <td colspan="5" class="p-8 text-center text-xs text-muted-foreground">Tidak ada riwayat untuk filter status ini.</td>
                            </tr>
                            <tr
                                v-else
                                v-for="row in filteredHistory"
                                :key="row.period_month"
                                class="border-b border-border hover:bg-muted/20 transition-colors"
                            >
                                <td class="p-4 font-semibold text-foreground">
                                    {{ formatMonthName(row.period_month) }}
                                </td>
                                <td class="p-4 font-medium text-muted-foreground">
                                    {{ formatKWh(row.usage_kwh) }}
                                </td>
                                <td class="p-4 text-muted-foreground">
                                    {{ row.baseline_usage_kwh !== null ? formatKWh(row.baseline_usage_kwh) : '-' }}
                                </td>
                                <td class="p-4">
                                    <div class="flex flex-col">
                                        <span
                                            v-if="row.difference_kwh !== null"
                                            :class="row.difference_kwh > 0 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'"
                                        >
                                            {{ row.difference_kwh > 0 ? '+' : '' }}{{ row.difference_kwh.toFixed(1) }} kWh
                                        </span>
                                        <span v-if="row.difference_percent !== null" class="text-[10px] text-muted-foreground">
                                            {{ row.difference_percent > 0 ? '+' : '' }}{{ row.difference_percent.toFixed(1) }}%
                                        </span>
                                        <span v-else>-</span>
                                    </div>
                                </td>
                                <td class="p-4">
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border"
                                        :class="{
                                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20':
                                                row.status === 'Normal',
                                            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20':
                                                row.status === 'Perlu Dicek',
                                            'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20': row.status === 'Boros',
                                        }"
                                    >
                                        {{ row.status }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- FREE plan limit overlay -->
                    <div
                        v-if="analysis.is_full_history_locked"
                        class="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center justify-end p-6 border-t border-border/40"
                    >
                        <div class="flex flex-col items-center gap-2 text-center max-w-sm">
                            <span class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Lock class="h-3.5 w-3.5 text-primary" /> Riwayat Lebih Lama Terkunci
                            </span>
                            <p class="text-[11px] text-muted-foreground leading-relaxed">
                                Paket Gratis membatasi tampilan riwayat anomali hingga 3 bulan terakhir. Upgrade ke paket Pro untuk melihat riwayat lengkap.
                            </p>
                            <Link
                                href="/plans"
                                class="mt-1 inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Upgrade Pro Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
