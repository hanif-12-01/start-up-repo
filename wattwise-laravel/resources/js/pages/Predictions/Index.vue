<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { TrendingUp, Zap, Coins, ArrowRight, ArrowLeft, AlertTriangle, Info, Lightbulb, HelpCircle, Lock, Sparkles, Gauge, Building2 } from '@lucide/vue';
import { computed } from 'vue';
import PredictionChart from '@/components/PredictionChart.vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
}

interface ChartPoint {
    period_month: string;
    usage_kwh: number | null;
    type: 'actual' | 'predicted';
}

interface Prediction {
    has_prediction: boolean;
    predicted_usage_kwh: number | null;
    estimated_bill_idr: number | null;
    previous_usage_kwh: number | null;
    previous_bill_idr: number | null;
    change_percent: number | null;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    confidence_level: 'Rendah' | 'Sedang' | 'Tinggi' | null;
    confidence_reason: string;
    method_label: string | null;
    possible_causes: string[];
    chart_data: ChartPoint[];
    is_detailed_analysis_locked: boolean;
    data_requirements: {
        history_months: number;
        has_gaps: boolean;
        gap_months: number;
        has_tariff: boolean;
        needs_more_data: boolean;
        message: string;
    };
    experimental_prediction?: {
        available: boolean;
        selected_model: string | null;
        reporting_phase: string | null;
        predicted_usage_kwh: number | null;
        deterministic_fallback_kwh: number | null;
        fallback_reason: string | null;
    };
}

const props = defineProps<{
    businesses: Business[];
    activeBusinessId: number | null;
    hasBusiness: boolean;
    prediction: Prediction | null;
    generated: boolean;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Prediksi Biaya', href: '/predictions' },
        ],
    },
});

const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
return 'Rp -';
}

    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
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

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/predictions', { business_id: target.value, ...(props.generated ? { generated: 1 } : {}) });
};

const buildPrediction = () => {
    if (props.activeBusinessId === null) {
return;
}

    router.post('/predictions/generate', { business_id: props.activeBusinessId });
};

const riskLabel = computed(() => {
    switch (props.prediction?.risk_level) {
        case 'HIGH': return 'Risiko Tinggi';
        case 'MEDIUM': return 'Risiko Sedang';
        case 'LOW': return 'Risiko Rendah';
        default: return '-';
    }
});

const changeClass = computed(() => {
    const c = props.prediction?.change_percent;

    if (c === null || c === undefined) {
return 'text-muted-foreground';
}

    return c > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
});
</script>

<template>
    <Head title="Prediksi Biaya" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header + business switcher -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div class="flex flex-col gap-2">
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <TrendingUp class="h-8 w-8 text-primary" /> Prediksi Biaya
                </h1>
                <p class="text-muted-foreground text-sm max-w-2xl">
                    Perkiraan pemakaian listrik dan estimasi tagihan bulan depan berdasarkan pola data yang Anda catat.
                </p>
            </div>

            <div v-if="businesses.length > 0" class="flex flex-col gap-1.5 min-w-[200px]">
                <label for="business-select" class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Properti / Usaha</label>
                <select
                    id="business-select"
                    :value="activeBusinessId ?? undefined"
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- No business -->
        <div
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Building2 class="h-5 w-5 text-primary" /> Belum ada usaha/properti
                </h2>
                <p class="text-muted-foreground text-sm">
                    Lengkapi onboarding agar WattWise bisa membuat prediksi pemakaian listrik untuk usaha Anda.
                </p>
            </div>
            <Link href="/onboarding" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shrink-0">
                Mulai Onboarding <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <!-- Intro / Build state -->
        <div
            v-else-if="!generated"
            class="rounded-2xl border border-border bg-card p-8 flex flex-col items-center text-center gap-5 shadow-sm"
        >
            <div class="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Gauge class="h-7 w-7" />
            </div>
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-bold text-foreground">Bangun Prediksi Pemakaian Listrik</h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    WattWise akan menghitung prediksi pemakaian listrik dan estimasi tagihan listrik bulan depan menggunakan pola data historis Anda. Analisis bersifat simulatif dan deterministik.
                </p>
            </div>
            <button
                type="button"
                @click="buildPrediction"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
            >
                <Sparkles class="h-4 w-4" /> Bangun Prediksi
            </button>
            <Link href="/dashboard" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft class="h-3.5 w-3.5" /> Kembali ke Beranda
            </Link>
        </div>

        <!-- Results state -->
        <template v-else>
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <span class="text-xs text-muted-foreground">Prediksi dihitung ulang setiap kali dibangun. Tidak disimpan sebagai data permanen.</span>
                <button
                    type="button"
                    @click="buildPrediction"
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-xs font-bold hover:bg-accent transition-colors shadow-sm"
                >
                    <Sparkles class="h-3.5 w-3.5" /> Perbarui Prediksi
                </button>
            </div>

            <!-- Empty / no-data state -->
            <div
                v-if="!prediction || !prediction.has_prediction"
                class="rounded-2xl border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center gap-3"
            >
                <div class="h-12 w-12 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                    <AlertTriangle class="h-6 w-6" />
                </div>
                <h3 class="text-base font-semibold text-foreground">Belum cukup data untuk prediksi</h3>
                <p class="text-sm text-muted-foreground max-w-md">
                    {{ prediction?.data_requirements.message ?? 'Belum ada data pemakaian listrik. Tambahkan minimal 1 bulan data untuk melihat estimasi.' }}
                </p>
                <Link href="/electricity" class="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Catat Data Listrik <ArrowRight class="h-3.5 w-3.5" />
                </Link>
            </div>

            <template v-else>
                <!-- Insufficient-data notice -->
                <div
                    v-if="prediction.data_requirements.needs_more_data"
                    class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300"
                >
                    <Info class="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>{{ prediction.data_requirements.message }}</span>
                </div>

                <!-- Missing-tariff notice -->
                <div
                    v-if="!prediction.data_requirements.has_tariff"
                    class="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 p-4 flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300"
                >
                    <Info class="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                    <span>Tarif per kWh belum tersedia sehingga estimasi tagihan listrik dalam Rupiah tidak ditampilkan. Lengkapi tarif pada data listrik Anda.</span>
                </div>

                <div
                    v-if="prediction.experimental_prediction"
                    class="rounded-xl border border-violet-300 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/20 p-5 flex flex-col gap-3"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            Prediksi AI Eksperimental
                        </span>
                        <span
                            v-if="prediction.experimental_prediction.selected_model"
                            class="text-[10px] rounded-full border border-violet-200 px-2 py-0.5 text-violet-700 dark:border-violet-800 dark:text-violet-300"
                        >
                            {{ prediction.experimental_prediction.selected_model }} · {{ prediction.experimental_prediction.reporting_phase }}
                        </span>
                    </div>
                    <p v-if="prediction.experimental_prediction.available" class="text-2xl font-extrabold text-foreground">
                        {{ formatKWh(prediction.experimental_prediction.predicted_usage_kwh) }}
                    </p>
                    <p v-else class="text-sm text-muted-foreground">
                        Model AI tidak tersedia untuk input ini. Estimasi deterministik tetap digunakan:
                        {{ formatKWh(prediction.experimental_prediction.deterministic_fallback_kwh) }}.
                    </p>
                    <p v-if="prediction.experimental_prediction.fallback_reason" class="text-xs text-muted-foreground">
                        Alasan fallback: {{ prediction.experimental_prediction.fallback_reason }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                        Hasil ini bersifat eksperimental, bukan kepastian, dan tidak menggantikan verifikasi manual.
                    </p>
                </div>

                <!-- Summary cards (always visible, even for FREE) -->
                <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prediksi pemakaian listrik</span>
                            <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Zap class="h-4.5 w-4.5" /></div>
                        </div>
                        <span class="text-2xl font-extrabold text-foreground tracking-tight">{{ formatKWh(prediction.predicted_usage_kwh) }}</span>
                        <span class="text-[10px] text-muted-foreground">Bulan lalu: {{ formatKWh(prediction.previous_usage_kwh) }}</span>
                    </div>

                    <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimasi tagihan listrik</span>
                            <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Coins class="h-4.5 w-4.5" /></div>
                        </div>
                        <span class="text-2xl font-extrabold text-foreground tracking-tight">{{ formatIDR(prediction.estimated_bill_idr) }}</span>
                        <span class="text-[10px] text-muted-foreground">Bulan lalu: {{ formatIDR(prediction.previous_bill_idr) }}</span>
                    </div>

                    <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Perubahan</span>
                            <div class="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><TrendingUp class="h-4.5 w-4.5" /></div>
                        </div>
                        <span class="text-2xl font-extrabold tracking-tight" :class="changeClass">{{ formatPercent(prediction.change_percent) }}</span>
                        <span class="text-[10px] text-muted-foreground">Dibanding bulan terakhir</span>
                    </div>

                    <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tingkat Risiko</span>
                            <div class="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><Gauge class="h-4.5 w-4.5" /></div>
                        </div>
                        <span
                            class="text-lg font-extrabold tracking-tight self-start px-2.5 py-0.5 rounded-full"
                            :class="{
                                'bg-red-500/10 text-red-600 dark:text-red-400': prediction.risk_level === 'HIGH',
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400': prediction.risk_level === 'MEDIUM',
                                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': prediction.risk_level === 'LOW',
                            }"
                        >
                            {{ riskLabel }}
                        </span>
                        <span class="text-[10px] text-muted-foreground">Keyakinan: {{ prediction.confidence_level }}</span>
                    </div>
                </div>

                <!-- Method + confidence reason -->
                <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {{ prediction.method_label }}
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                            Berdasarkan data input
                        </span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                            Perlu Verifikasi Manual
                        </span>
                    </div>
                    <p class="text-xs text-muted-foreground leading-relaxed">
                        Perkiraan dibuat dari pola pemakaian terbaru dan arah perubahan beberapa bulan terakhir.
                    </p>
                    <p v-if="prediction.confidence_reason" class="text-xs text-muted-foreground leading-relaxed">{{ prediction.confidence_reason }}</p>
                </div>

                <!-- Chart -->
                <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center gap-2 border-b border-border pb-3">
                        <TrendingUp class="h-5 w-5 text-primary" />
                        <h3 class="text-base font-bold text-foreground">Pemakaian Aktual vs Proyeksi</h3>
                    </div>
                    <PredictionChart :data="prediction.chart_data" />
                </div>

                <!-- Possible causes (detailed analysis) -->
                <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                    <div class="flex items-center gap-2 border-b border-border pb-3">
                        <Lightbulb class="h-5 w-5 text-primary" />
                        <h3 class="text-base font-bold text-foreground">Kemungkinan Penyebab yang Perlu Dicek</h3>
                    </div>

                    <div v-if="!prediction.is_detailed_analysis_locked" class="flex flex-col gap-3">
                        <div
                            v-for="(cause, idx) in prediction.possible_causes"
                            :key="idx"
                            class="flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground leading-relaxed"
                        >
                            <span class="text-primary mt-0.5 shrink-0">•</span>
                            <span>{{ cause }}</span>
                        </div>
                    </div>

                    <!-- FREE lock: summary is shown above; only detailed analysis is locked -->
                    <div v-else class="flex flex-col items-center justify-center text-center gap-3 py-6">
                        <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Lock class="h-5 w-5" />
                        </div>
                        <p class="text-sm font-semibold text-foreground">Analisis detail terkunci pada paket Gratis</p>
                        <p class="text-xs text-muted-foreground max-w-md">
                            Ringkasan prediksi tetap tersedia. Untuk melihat kemungkinan penyebab yang perlu dicek secara lengkap, aktifkan paket Pro.
                        </p>
                        <Link href="/plans" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Sparkles class="h-3.5 w-3.5" /> Lihat Paket Pro
                        </Link>
                    </div>
                </div>
            </template>
        </template>

        <!-- Required disclaimer (always shown) -->
        <div v-if="hasBusiness" class="rounded-2xl border border-border bg-muted/10 p-5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed shadow-sm">
            <HelpCircle class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.</span>
        </div>
    </div>
</template>
