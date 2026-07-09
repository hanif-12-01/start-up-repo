<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { 
    FileText, 
    Building2, 
    Calendar, 
    AlertTriangle, 
    ArrowRight, 
    Zap, 
    Coins, 
    Plug, 
    Sparkles, 
    Info, 
    ChevronRight,
    CheckCircle2
} from '@lucide/vue';
import { computed } from 'vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
}

interface ElectricityData {
    usage_kwh: number | null;
    bill_amount: number | null;
    tariff_per_kwh: number | null;
    data_status: 'AVAILABLE' | 'MISSING';
}

interface RevenueData {
    amount: number | null;
    data_status: 'AVAILABLE' | 'MISSING';
}

interface FinancialImpact {
    electricity_revenue_ratio_percent: number | null;
    remaining_revenue_after_electricity: number | null;
}

interface ApplianceCandidate {
    id: number;
    name: string;
    category: string;
    estimated_monthly_kwh: number | null;
    estimated_monthly_cost: number | null;
    ranking_reason: string;
    badges: string[];
}

interface Recommendation {
    type: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    action: string;
    reason?: string | null;
    estimated_saving_idr?: number | null;
    badges?: string[];
}

interface EfficiencyScore {
    score: number | null;
    label: string;
    status: 'GOOD' | 'WATCH' | 'CHECK' | 'INCOMPLETE';
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
}

const props = defineProps<{
    report: {
        business: Business | null;
        selected_month: string;
        available_months: string[];
        data_completeness: 'NO_BUSINESS' | 'COMPLETE' | 'NO_ELECTRICITY' | 'NO_REVENUE' | 'NO_APPLIANCES' | 'PARTIAL';
        electricity: ElectricityData;
        revenue: RevenueData;
        financial_impact: FinancialImpact;
        appliances: {
            count: number;
            top_candidates: ApplianceCandidate[];
        };
        recommendations: Recommendation[];
        efficiency_score: EfficiencyScore;
        disclaimers: string[];
    };
    effectivePlan?: {
        id: string;
        label: string;
    } | null;
    isLocked?: boolean;
    businesses?: Business[];
    activeBusinessId?: number | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Laporan',
                href: '/reports',
            },
        ],
    },
});

const formatBusinessType = (type?: string | null) => {
    switch (type) {
        case 'KOS_PROPERTY': return 'Kos / Properti';
        case 'FNB': return 'Warung / F&B';
        case 'LAUNDRY': return 'Laundry';
        case 'RETAIL': return 'Toko / Retail';
        case 'COLD_STORAGE': return 'Cold Storage';
        case 'OTHER': return 'Lainnya';
        default: return type || '';
    }
};

const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const [year, month] = parts;
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx]} ${year}`;
};

const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatKwh = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '- kWh';
    return `${Number(value).toFixed(2)} kWh`;
};

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/reports', { business_id: target.value, month: props.report.selected_month });
};

const onMonthChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/reports', { month: target.value, business_id: props.activeBusinessId });
};

const completenessLabel = computed(() => {
    switch (props.report.data_completeness) {
        case 'COMPLETE': return 'Lengkap';
        case 'NO_ELECTRICITY': return 'Data Listrik Kosong';
        case 'NO_REVENUE': return 'Data Pendapatan Kosong';
        case 'NO_APPLIANCES': return 'Peralatan Kosong';
        case 'PARTIAL': return 'Kurang Lengkap (Sebagian)';
        default: return 'Belum Lengkap';
    }
});

const completenessClass = computed(() => {
    switch (props.report.data_completeness) {
        case 'COMPLETE': 
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
        case 'NO_ELECTRICITY': 
        case 'NO_REVENUE': 
        case 'NO_APPLIANCES': 
        case 'PARTIAL': 
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
        default: 
            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
    }
});
</script>

<template>
    <Head title="Laporan Bulanan" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Title Header with Business Switcher -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div class="flex flex-col gap-2">
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <FileText class="h-8 w-8 text-primary" /> Laporan Bulanan
                </h1>
                <p class="text-muted-foreground text-sm">
                    Ringkasan listrik, pendapatan, peralatan, dan rekomendasi berdasarkan data yang Anda input.
                </p>
            </div>

            <!-- Business Switcher -->
            <div v-if="businesses && businesses.length > 0" class="flex flex-col gap-1.5 min-w-[200px]">
                <label for="business-select" class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Properti / Usaha</label>
                <select
                    id="business-select"
                    :value="activeBusinessId"
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }}
                    </option>
                </select>
            </div>
        </div>

        <!-- 1. Empty State (No Business) -->
        <div 
            v-if="report.data_completeness === 'NO_BUSINESS'"
            class="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                    <span>🏢</span> Belum ada usaha/properti
                </h2>
                <p class="text-muted-foreground text-sm">
                    Lengkapi onboarding agar WattWise bisa membuat laporan bulanan.
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
            <!-- 2 & 3. Header Info Row (Business Summary & Month Selector) -->
            <div class="grid gap-6 md:grid-cols-3 bg-card border border-border rounded-xl p-5 shadow-sm">
                <!-- Business Info -->
                <div class="flex flex-col gap-3">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/50">
                        <Building2 class="h-3.5 w-3.5 text-primary" /> Usaha/Properti
                    </h3>
                    <div class="flex flex-col gap-1">
                        <span class="text-base font-bold text-foreground">{{ report.business?.name }}</span>
                        <span class="text-xs text-muted-foreground">{{ formatBusinessType(report.business?.business_type) }}</span>
                    </div>
                </div>

                <!-- Selected Month Summary -->
                <div class="flex flex-col gap-3">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/50">
                        <Calendar class="h-3.5 w-3.5 text-primary" /> Periode Laporan
                    </h3>
                    <div class="flex flex-col gap-1">
                        <span class="text-base font-bold text-foreground">{{ formatMonth(report.selected_month) }}</span>
                        <span class="text-xs text-muted-foreground">Bulan terpilih</span>
                    </div>
                </div>

                <!-- Data Completeness Status & Month Selector Dropdown -->
                <div class="flex flex-col gap-3">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/50">
                        <Info class="h-3.5 w-3.5 text-primary" /> Status Data
                    </h3>
                    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <span 
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                            :class="completenessClass"
                        >
                            {{ completenessLabel }}
                        </span>

                        <!-- Month Selector Select -->
                        <div v-if="report.available_months.length > 0" class="w-full sm:w-auto">
                            <select 
                                id="month-select" 
                                :value="report.selected_month" 
                                @change="onMonthChange"
                                class="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option v-for="m in report.available_months" :key="m" :value="m">
                                    {{ formatMonth(m) }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lock state screen if historical report is locked -->
            <div v-if="isLocked" class="bg-card border border-border rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden py-16">
                <div class="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Zap class="h-8 w-8 fill-primary" />
                </div>
                <h2 class="text-xl font-bold text-foreground">Laporan Riwayat Bulanan Terkunci</h2>
                <p class="text-sm text-muted-foreground max-w-md leading-relaxed">
                    Pengguna Paket Gratis hanya dapat mengakses laporan bulan berjalan / bulan terbaru. Upgrade ke paket Pro untuk membuka akses riwayat seluruh laporan bulanan Anda.
                </p>
                <div class="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <Link href="/plans" class="inline-flex items-center justify-center rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 shadow-md flex items-center gap-1.5">
                        <Zap class="h-4 w-4 fill-primary-foreground" /> Mulai Pro Trial 30 Hari
                    </Link>
                    <Link href="/plans" class="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-input bg-background hover:bg-accent px-4 py-2.5 shadow-sm">
                        Lihat Paket Lain
                    </Link>
                </div>
            </div>

            <!-- Main report sections (only show if not locked) -->
            <div v-else class="space-y-6 flex flex-col gap-6 w-full">
                <!-- Month warning when no months are available -->
                <div 
                    v-if="report.available_months.length === 0"
                    class="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
                >
                    <AlertTriangle class="h-5 w-5 shrink-0 text-amber-600" />
                    <span>Belum ada bulan laporan. Tambahkan data listrik atau pendapatan terlebih dahulu.</span>
                </div>

                <!-- 4, 5, 6. Metric Cards Row -->
                <div class="grid gap-6 md:grid-cols-3">
                <!-- 4. Electricity Card -->
                <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-border pb-2">
                        <h3 class="text-sm font-semibold text-foreground">Prediksi Pemakaian Listrik</h3>
                        <Zap class="h-5 w-5 text-amber-500" />
                    </div>

                    <div v-if="report.electricity.data_status === 'AVAILABLE'" class="flex flex-col gap-3">
                        <div class="flex flex-col">
                            <span class="text-xs text-muted-foreground">Estimasi Tagihan Listrik</span>
                            <span class="text-2xl font-bold text-foreground">{{ formatIDR(report.electricity.bill_amount) }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                            <div class="flex flex-col">
                                <span class="text-muted-foreground">Konsumsi</span>
                                <span class="font-semibold text-foreground">{{ formatKwh(report.electricity.usage_kwh) }}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-muted-foreground">Tarif / kWh</span>
                                <span class="font-semibold text-foreground">{{ formatIDR(report.electricity.tariff_per_kwh) }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-else class="flex flex-col gap-3 items-center justify-center py-6 text-center text-xs">
                        <AlertTriangle class="h-8 w-8 text-amber-500/80 mb-1" />
                        <span class="text-muted-foreground">Data listrik bulan ini belum tersedia.</span>
                        <Link 
                            href="/electricity" 
                            class="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                            Input Data Listrik <ChevronRight class="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>

                <!-- 5. Revenue Card -->
                <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-border pb-2">
                        <h3 class="text-sm font-semibold text-foreground">Pendapatan Bulanan</h3>
                        <Coins class="h-5 w-5 text-emerald-500" />
                    </div>

                    <div v-if="report.revenue.data_status === 'AVAILABLE'" class="flex flex-col gap-3">
                        <div class="flex flex-col">
                            <span class="text-xs text-muted-foreground">Total Pendapatan</span>
                            <span class="text-2xl font-bold text-foreground">{{ formatIDR(report.revenue.amount) }}</span>
                        </div>
                        <div class="text-xs border-t border-border/50 pt-2 text-muted-foreground">
                            Pencatatan pendapatan periodik berhasil dimuat.
                        </div>
                    </div>

                    <div v-else class="flex flex-col gap-3 items-center justify-center py-6 text-center text-xs">
                        <AlertTriangle class="h-8 w-8 text-amber-500/80 mb-1" />
                        <span class="text-muted-foreground">Data pendapatan bulan ini belum tersedia.</span>
                        <Link 
                            href="/revenue" 
                            class="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                            Input Pendapatan <ChevronRight class="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>

                <!-- 6. Cash Flow Impact Card -->
                <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-border pb-2">
                        <h3 class="text-sm font-semibold text-foreground">Dampak ke Cash Flow</h3>
                        <FileText class="h-5 w-5 text-blue-500" />
                    </div>

                    <div 
                        v-if="report.financial_impact.electricity_revenue_ratio_percent !== null && report.financial_impact.remaining_revenue_after_electricity !== null" 
                        class="flex flex-col gap-3"
                    >
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="flex flex-col">
                                <span class="text-muted-foreground">Rasio listrik terhadap pendapatan</span>
                                <span class="text-lg font-bold text-foreground">
                                    {{ report.financial_impact.electricity_revenue_ratio_percent.toFixed(1) }}%
                                </span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-muted-foreground">Sisa pendapatan setelah listrik</span>
                                <span class="text-lg font-bold text-foreground">
                                    {{ formatIDR(report.financial_impact.remaining_revenue_after_electricity) }}
                                </span>
                            </div>
                        </div>

                        <p class="text-[10px] leading-relaxed text-muted-foreground border-t border-border/50 pt-2">
                            Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
                        </p>
                    </div>

                    <div v-else class="flex flex-col gap-3 items-center justify-center py-6 text-center text-xs">
                        <Info class="h-8 w-8 text-blue-500/80 mb-1" />
                        <span class="text-muted-foreground leading-relaxed px-4">
                            Dampak cash flow muncul setelah data listrik dan pendapatan tersedia.
                        </span>
                    </div>
                </div>
            </div>

            <!-- Lower Section: Left Column (Appliances & Recs) | Right Column (Efficiency Score) -->
            <div class="grid gap-6 md:grid-cols-3">
                <!-- Left Details Area (Col Span 2) -->
                <div class="md:col-span-2 flex flex-col gap-6">
                    <!-- 7. Appliance Candidates Section -->
                    <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <div class="flex flex-col gap-1 border-b border-border pb-3">
                            <h3 class="text-lg font-bold text-foreground flex items-center gap-2">
                                <Plug class="h-5 w-5 text-primary" /> Kandidat Alat yang Perlu Dicek
                            </h3>
                            <p class="text-xs text-muted-foreground">
                                Berdasarkan estimasi daya dan jam pakai, alat berikut kemungkinan memberi kontribusi listrik terbesar. Ini bukan pengukuran sensor.
                            </p>
                        </div>

                        <!-- Top Candidates List -->
                        <div v-if="report.appliances.top_candidates.length > 0" class="flex flex-col gap-3">
                            <div 
                                v-for="(appliance, idx) in report.appliances.top_candidates" 
                                :key="appliance.id"
                                class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20 gap-4"
                            >
                                <div class="flex gap-3 items-start">
                                    <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                        #{{ idx + 1 }}
                                    </span>
                                    <div class="flex flex-col gap-1">
                                        <span class="text-sm font-bold text-foreground">{{ appliance.name }}</span>
                                        <span class="text-xs text-muted-foreground uppercase">{{ appliance.category }}</span>
                                        <span class="text-xs text-rose-600 font-medium dark:text-rose-400 mt-1">
                                            Indikasi beban: {{ appliance.ranking_reason }}
                                        </span>
                                    </div>
                                </div>

                                <div class="flex flex-col items-start sm:items-end justify-between gap-2 shrink-0">
                                    <div class="text-left sm:text-right">
                                        <span class="text-xs text-muted-foreground block">Estimasi Pemakaian:</span>
                                        <span class="text-sm font-bold text-foreground">
                                            {{ formatKwh(appliance.estimated_monthly_kwh) }}
                                        </span>
                                        <span class="text-xs text-muted-foreground block">
                                            ({{ formatIDR(appliance.estimated_monthly_cost) }} / bln)
                                        </span>
                                    </div>

                                    <div class="flex flex-wrap gap-1">
                                        <span 
                                            v-for="badge in appliance.badges" 
                                            :key="badge"
                                            class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        >
                                            {{ badge }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end mt-2">
                                <Link 
                                    href="/appliances" 
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                                >
                                    Kelola Peralatan <ArrowRight class="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        <!-- Empty Appliance State -->
                        <div v-else class="flex flex-col gap-3 items-center justify-center py-8 text-center text-xs">
                            <Plug class="h-10 w-10 text-muted/60 mb-1" />
                            <span class="text-muted-foreground max-w-sm">
                                Belum ada data peralatan. Gunakan template peralatan atau tambah manual untuk membuat estimasi simulatif.
                            </span>
                            <Link 
                                href="/appliances" 
                                class="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                Kelola Peralatan
                            </Link>
                        </div>
                    </div>

                    <!-- 8. Recommendations Section -->
                    <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <div class="flex flex-col gap-1 border-b border-border pb-3">
                            <h3 class="text-lg font-bold text-foreground flex items-center gap-2">
                                <Sparkles class="h-5 w-5 text-primary" /> Rekomendasi Hemat
                            </h3>
                            <p class="text-xs text-muted-foreground">
                                Saran rule-based berdasarkan profil peralatan dan operasional yang terdaftar pada bisnis Anda.
                            </p>
                        </div>

                        <!-- Recommendations List -->
                        <div v-if="report.recommendations.length > 0" class="flex flex-col gap-4">
                            <div 
                                v-for="rec in report.recommendations" 
                                :key="rec.type"
                                class="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card shadow-sm hover:shadow transition-shadow"
                            >
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h4 class="text-sm font-bold text-foreground flex items-center gap-1.5">
                                        {{ rec.title }}
                                    </h4>

                                    <!-- Priority Badge -->
                                    <span 
                                        class="inline-block px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto border"
                                        :class="{
                                            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50': rec.priority === 'HIGH',
                                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50': rec.priority === 'MEDIUM',
                                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50': rec.priority === 'LOW',
                                        }"
                                    >
                                        {{ rec.priority === 'HIGH' ? 'Prioritas Tinggi' : rec.priority === 'MEDIUM' ? 'Prioritas Sedang' : 'Prioritas Ringan' }}
                                    </span>
                                </div>

                                <p class="text-xs text-muted-foreground leading-relaxed">
                                    {{ rec.description }}
                                </p>

                                <div class="grid gap-2 border-t border-border/50 pt-2 text-xs">
                                    <div>
                                        <span class="font-semibold text-foreground">Rencana Tindakan:</span>
                                        <span class="text-muted-foreground block mt-0.5">{{ rec.action }}</span>
                                    </div>
                                    <div v-if="rec.reason">
                                        <span class="font-semibold text-foreground">Indikasi Alasan:</span>
                                        <span class="text-muted-foreground block mt-0.5">{{ rec.reason }}</span>
                                    </div>
                                    <div v-if="rec.estimated_saving_idr" class="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        Potensi Hemat: {{ formatIDR(rec.estimated_saving_idr) }} / bln
                                    </div>
                                </div>

                                <div v-if="rec.badges && rec.badges.length > 0" class="flex flex-wrap gap-1 mt-1">
                                    <span 
                                        v-for="badge in rec.badges" 
                                        :key="badge"
                                        class="inline-block px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    >
                                        {{ badge }}
                                    </span>
                                </div>
                            </div>

                            <div class="flex justify-end mt-2">
                                <Link 
                                    href="/recommendations" 
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                                >
                                    Lihat Rekomendasi Lengkap <ArrowRight class="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        <!-- Empty Recommendations State -->
                        <div v-else class="flex flex-col gap-3 items-center justify-center py-8 text-center text-xs">
                            <Sparkles class="h-10 w-10 text-muted/60 mb-1" />
                            <span class="text-muted-foreground max-w-sm">
                                Belum ada rekomendasi. Lengkapi data listrik, pendapatan, dan peralatan agar WattWise bisa memberi saran yang lebih relevan.
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Right Details Area (Col Span 1) -->
                <div class="flex flex-col gap-6">
                    <!-- 9. Efficiency Score Section -->
                    <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <div class="border-b border-border pb-2">
                            <h3 class="text-sm font-semibold text-foreground">Skor Efisiensi Listrik</h3>
                        </div>

                        <div v-if="report.efficiency_score.score !== null" class="flex flex-col items-center gap-4 py-2">
                            <!-- Circular Score Gauge -->
                            <div class="relative flex items-center justify-center h-28 w-28">
                                <svg class="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                                    <!-- Background circle -->
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        class="stroke-muted fill-none" 
                                        stroke-width="8" 
                                    />
                                    <!-- Foreground circle -->
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        class="fill-none transition-all duration-500 ease-out" 
                                        :class="{
                                            'stroke-emerald-500': report.efficiency_score.status === 'GOOD',
                                            'stroke-amber-500': report.efficiency_score.status === 'WATCH',
                                            'stroke-rose-500': report.efficiency_score.status === 'CHECK',
                                        }"
                                        stroke-width="8" 
                                        stroke-dasharray="251.2"
                                        :stroke-dashoffset="251.2 - (251.2 * report.efficiency_score.score) / 100"
                                        stroke-linecap="round"
                                    />
                                </svg>
                                <span class="text-3xl font-extrabold text-foreground">
                                    {{ report.efficiency_score.score }}
                                </span>
                            </div>

                            <div class="text-center flex flex-col gap-1 w-full">
                                <span 
                                    class="inline-block px-3 py-1 rounded-full text-xs font-bold mx-auto border"
                                    :class="{
                                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400': report.efficiency_score.status === 'GOOD',
                                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400': report.efficiency_score.status === 'WATCH',
                                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400': report.efficiency_score.status === 'CHECK',
                                    }"
                                >
                                    {{ report.efficiency_score.label }}
                                </span>
                                
                                <p class="text-xs text-muted-foreground leading-relaxed px-2 mt-2">
                                    {{ report.efficiency_score.explanation }}
                                </p>
                            </div>

                            <div class="w-full text-xs border-t border-border/50 pt-3 flex justify-between">
                                <span class="text-muted-foreground">Tingkat Kepercayaan:</span>
                                <span class="font-bold text-foreground">
                                    {{ report.efficiency_score.confidence === 'HIGH' ? 'Tinggi' : report.efficiency_score.confidence === 'MEDIUM' ? 'Sedang' : 'Rendah' }}
                                </span>
                            </div>
                        </div>

                        <div v-else class="flex flex-col items-center justify-center py-10 text-center gap-3 text-xs">
                            <AlertTriangle class="h-10 w-10 text-amber-500/80" />
                            <span class="text-base font-bold text-foreground">Data belum cukup</span>
                            <p class="text-muted-foreground leading-relaxed px-4">
                                Harap lengkapi entri tagihan listrik dan pendapatan usaha pada bulan terbaru agar skor dapat dikalkulasi.
                            </p>
                        </div>

                        <!-- Helper footer -->
                        <div class="mt-2 text-[10px] leading-relaxed text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                            Skor ini adalah estimasi internal WattWise berdasarkan data input, bukan audit energi resmi.
                        </div>
                    </div>
                </div>
            </div>

            <!-- 10. Required Disclaimers Section -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-3">
                <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info class="h-4 w-4 text-muted-foreground" /> Catatan Penting
                </h3>

                <ul class="list-disc pl-5 text-xs text-muted-foreground space-y-2 border-t border-border/50 pt-3">
                    <li v-for="(disclaimer, idx) in report.disclaimers" :key="idx" class="leading-relaxed">
                        {{ disclaimer }}
                    </li>
                </ul>
            </div>
            </div>
        </template>
    </div>
</template>
