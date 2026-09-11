<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Coins,
    Filter,
    HelpCircle,
    Info,
    LayoutGrid,
    Loader2,
    Search,
    TrendingDown,
    TrendingUp,
    Zap,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface Summary {
    active_business_count: number;
    businesses_with_electricity_data: number;
    businesses_with_revenue_data: number;
    electricity_coverage_percent: number;
    revenue_coverage_percent: number;
    total_usage_kwh: number;
    total_electricity_cost_idr: number;
    total_revenue_idr: number | null;
    electricity_revenue_ratio_percent: number | null;
}

interface Comparison {
    comparable_business_count: number;
    total_active_businesses: number;
    is_partial_comparison: boolean;
    cost_difference_idr: number | null;
    electricity_cost_change_percent: number | null;
    usage_change_percent: number | null;
    comparable_revenue_business_count: number;
    revenue_change_percent: number | null;
}

interface Health {
    safe_count: number;
    check_count: number;
    attention_count: number;
    incomplete_count: number;
    explanation: string;
    disclaimer: string;
}

interface AttentionItem {
    business_id: number;
    business_name: string;
    business_type: string;
    business_type_label: string;
    city: string | null;
    status: 'Perlu Perhatian' | 'Perlu Dicek' | 'Data Belum Lengkap';
    reason: string;
    magnitude: string | null;
    difference_percent: number | null;
    difference_kwh: number | null;
    estimated_impact_idr: number | null;
    cta_label: string;
}

interface LocationRow {
    id: number;
    name: string;
    business_type: string;
    business_type_label: string;
    city: string | null;
    usage_kwh: number | null;
    cost_idr: number | null;
    revenue_idr: number | null;
    cost_change_percent: number | null;
    revenue_change_percent: number | null;
    cost_vs_revenue_insight: string | null;
    status: 'Aman' | 'Perlu Dicek' | 'Perlu Perhatian' | 'Data Belum Lengkap';
    status_description: string;
    has_electricity: boolean;
    has_revenue: boolean;
    difference_percent: number | null;
    estimated_impact_idr: number | null;
}

interface TrendMonth {
    month: string;
    month_label: string;
    total_cost_idr: number;
    total_usage_kwh: number;
    total_revenue_idr: number | null;
    business_count_with_data: number;
    business_count_with_revenue: number;
    total_business_count: number;
    coverage_percent: number;
}

interface AvailableMonth {
    value: string;
    label: string;
}

interface PortfolioData {
    selected_month: string;
    selected_month_label: string;
    previous_month: string;
    previous_month_label: string;
    available_months: AvailableMonth[];
    summary: Summary;
    comparison: Comparison;
    health: Health;
    attention_items: AttentionItem[];
    locations: LocationRow[];
    trend: TrendMonth[];
}

const props = defineProps<{
    portfolio: PortfolioData;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Semua Usaha', href: '/portfolio' }],
    },
});

// Month selector state
const selectedMonth = ref(props.portfolio.selected_month);

const handleMonthChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newMonth = target.value;
    selectedMonth.value = newMonth;
    router.get(
        '/portfolio',
        { month: newMonth },
        {
            preserveState: true,
            preserveScroll: true,
        },
    );
};

// Drill down loading state
const selectingId = ref<number | null>(null);

const drillDown = (businessId: number) => {
    selectingId.value = businessId;
    router.post(
        '/businesses/select',
        {
            business_id: businessId,
            redirect_to: '/dashboard',
        },
        {
            preserveState: false,
            preserveScroll: true,
            onFinish: () => {
                selectingId.value = null;
            },
        },
    );
};

// Filters for "Semua Lokasi"
const searchFilter = ref('');
const statusFilter = ref<string>('ALL');
const typeFilter = ref<string>('ALL');

const filteredLocations = computed(() => {
    return props.portfolio.locations.filter((loc) => {
        // Status filter
        if (statusFilter.value !== 'ALL' && loc.status !== statusFilter.value) {
            return false;
        }

        // Type filter
        if (
            typeFilter.value !== 'ALL' &&
            loc.business_type !== typeFilter.value
        ) {
            return false;
        }

        // Search query
        if (searchFilter.value.trim() !== '') {
            const query = searchFilter.value.toLowerCase();
            const matchName = loc.name.toLowerCase().includes(query);
            const matchCity = (loc.city ?? '').toLowerCase().includes(query);
            return matchName || matchCity;
        }

        return true;
    });
});

// Formatters
const formatIDR = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
        return 'Belum ada data';
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCompactIDR = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
        return '-';
    }
    if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
    }
    if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
    }
    if (value >= 1_000) {
        return `Rp ${(value / 1_000).toFixed(0)} rb`;
    }
    return `Rp ${value.toFixed(0)}`;
};

const formatKWh = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
        return 'Belum ada data';
    }
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kWh`;
};

// Trend chart scaling
const maxTrendCost = computed(() => {
    const values = props.portfolio.trend.map((t) => t.total_cost_idr);
    const max = Math.max(...values, 1000);
    return max * 1.15; // give 15% headroom
});
</script>

<template>
    <Head title="Command Center Portofolio" />

    <div class="space-y-8 pb-12">
        <!-- 1. Header & Month Selector -->
        <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div>
                <div class="flex items-center gap-2">
                    <span
                        class="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                        <LayoutGrid class="size-3.5" />
                        Level 1 &mdash; Portofolio
                    </span>
                    <span class="text-xs text-muted-foreground"
                        >Manage by Exception</span
                    >
                </div>
                <h1
                    class="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                    Command Center Seluruh Usaha
                </h1>
                <p class="mt-1 text-sm text-muted-foreground">
                    Ketahui lokasi mana yang memerlukan perhatian dari satu
                    tampilan terpadu.
                </p>
            </div>

            <!-- Month Filter -->
            <div
                class="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-xs"
            >
                <Calendar class="ml-1 size-4 shrink-0 text-muted-foreground" />
                <label for="portfolio-month-select" class="sr-only"
                    >Pilih Bulan</label
                >
                <select
                    id="portfolio-month-select"
                    :value="portfolio.selected_month"
                    @change="handleMonthChange"
                    class="h-9 cursor-pointer rounded-lg border-0 bg-transparent py-1 pr-8 pl-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                    <option
                        v-for="opt in portfolio.available_months"
                        :key="opt.value"
                        :value="opt.value"
                    >
                        {{ opt.label }}
                    </option>
                </select>
            </div>
        </div>

        <!-- 2. Summary KPI Cards with Visible Data Coverage -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Lokasi Aktif -->
            <Card
                class="relative overflow-hidden border-border bg-card shadow-xs"
            >
                <CardHeader
                    class="flex flex-row items-center justify-between pb-2"
                >
                    <CardTitle
                        class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                        Lokasi Aktif
                    </CardTitle>
                    <div
                        class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    >
                        <Building2 class="size-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        class="text-2xl font-bold tracking-tight text-foreground"
                    >
                        {{ portfolio.summary.active_business_count }}
                        <span class="text-sm font-normal text-muted-foreground"
                            >lokasi</span
                        >
                    </div>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                        Dipantau aktif dalam portofolio Anda
                    </p>
                </CardContent>
            </Card>

            <!-- Total Pemakaian -->
            <Card
                class="relative overflow-hidden border-border bg-card shadow-xs"
            >
                <CardHeader
                    class="flex flex-row items-center justify-between pb-2"
                >
                    <CardTitle
                        class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                        Total Pemakaian
                    </CardTitle>
                    <div
                        class="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                        <Zap class="size-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        class="text-2xl font-bold tracking-tight text-foreground"
                    >
                        {{
                            portfolio.summary.total_usage_kwh.toLocaleString(
                                'id-ID',
                                { maximumFractionDigits: 1 },
                            )
                        }}
                        <span class="text-sm font-normal text-muted-foreground"
                            >kWh</span
                        >
                    </div>
                    <div
                        class="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                        <span class="font-medium text-foreground">
                            {{
                                portfolio.summary
                                    .businesses_with_electricity_data
                            }}
                            dari
                            {{ portfolio.summary.active_business_count }} lokasi
                        </span>
                        <span
                            >tercatat ({{
                                portfolio.summary.electricity_coverage_percent
                            }}%)</span
                        >
                    </div>
                </CardContent>
            </Card>

            <!-- Total Biaya Listrik -->
            <Card
                class="relative overflow-hidden border-border bg-card shadow-xs"
            >
                <CardHeader
                    class="flex flex-row items-center justify-between pb-2"
                >
                    <CardTitle
                        class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                        Total Biaya Listrik
                    </CardTitle>
                    <div
                        class="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        <Coins class="size-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="flex items-baseline gap-2">
                        <span
                            class="text-2xl font-bold tracking-tight text-foreground"
                        >
                            {{
                                formatCompactIDR(
                                    portfolio.summary
                                        .total_electricity_cost_idr,
                                )
                            }}
                        </span>
                        <!-- MoM change badge -->
                        <span
                            v-if="
                                portfolio.comparison
                                    .electricity_cost_change_percent !== null
                            "
                            :class="[
                                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                                portfolio.comparison
                                    .electricity_cost_change_percent > 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            ]"
                        >
                            <ArrowUpRight
                                v-if="
                                    portfolio.comparison
                                        .electricity_cost_change_percent > 0
                                "
                                class="size-3"
                            />
                            <ArrowDownRight v-else class="size-3" />
                            {{
                                Math.abs(
                                    portfolio.comparison
                                        .electricity_cost_change_percent,
                                )
                            }}%
                        </span>
                    </div>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                        <template
                            v-if="
                                portfolio.comparison.comparable_business_count >
                                0
                            "
                        >
                            Perbandingan berdasarkan
                            {{ portfolio.comparison.comparable_business_count }}
                            lokasi lengkap di dua bulan.
                        </template>
                        <template v-else>
                            Data dari
                            {{
                                portfolio.summary
                                    .businesses_with_electricity_data
                            }}
                            dari
                            {{ portfolio.summary.active_business_count }}
                            lokasi.
                        </template>
                    </p>
                </CardContent>
            </Card>

            <!-- Total Pendapatan & Rasio Listrik -->
            <Card
                class="relative overflow-hidden border-border bg-card shadow-xs"
            >
                <CardHeader
                    class="flex flex-row items-center justify-between pb-2"
                >
                    <CardTitle
                        class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                        Total Pendapatan
                    </CardTitle>
                    <div
                        class="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                        <TrendingUp class="size-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        class="text-2xl font-bold tracking-tight text-foreground"
                    >
                        {{
                            formatCompactIDR(
                                portfolio.summary.total_revenue_idr,
                            )
                        }}
                    </div>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                        <template
                            v-if="
                                portfolio.summary
                                    .electricity_revenue_ratio_percent !== null
                            "
                        >
                            Biaya listrik:
                            <span class="font-semibold text-foreground"
                                >{{
                                    portfolio.summary
                                        .electricity_revenue_ratio_percent
                                }}%</span
                            >
                            dari pendapatan
                        </template>
                        <template v-else>
                            {{ portfolio.summary.businesses_with_revenue_data }}
                            dari
                            {{ portfolio.summary.active_business_count }} lokasi
                            mencatat omset
                        </template>
                    </p>
                </CardContent>
            </Card>
        </div>

        <!-- 3. Health Summary Banner: "Kondisi Semua Usaha" -->
        <Card class="border-border bg-card/60 shadow-xs backdrop-blur-xs">
            <CardContent class="p-5 sm:p-6">
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div>
                        <div class="flex items-center gap-2">
                            <h2
                                class="text-base font-bold text-foreground sm:text-lg"
                            >
                                Kondisi Semua Usaha &mdash;
                                {{ portfolio.selected_month_label }}
                            </h2>
                        </div>
                        <p class="mt-1 text-sm text-muted-foreground">
                            {{ portfolio.health.explanation }}
                        </p>
                    </div>

                    <!-- Health Pills -->
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Aman -->
                        <div
                            class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                            <CheckCircle2 class="size-3.5" />
                            <span>{{ portfolio.health.safe_count }} Aman</span>
                        </div>

                        <!-- Perlu Dicek -->
                        <div
                            class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400"
                        >
                            <AlertTriangle class="size-3.5" />
                            <span
                                >{{ portfolio.health.check_count }} Perlu
                                Dicek</span
                            >
                        </div>

                        <!-- Perlu Perhatian -->
                        <div
                            class="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400"
                        >
                            <AlertCircle class="size-3.5" />
                            <span
                                >{{ portfolio.health.attention_count }} Perlu
                                Perhatian</span
                            >
                        </div>

                        <!-- Data Belum Lengkap -->
                        <div
                            class="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-400"
                        >
                            <Clock class="size-3.5" />
                            <span
                                >{{ portfolio.health.incomplete_count }} Data
                                Belum Lengkap</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Disclaimer footer -->
                <p
                    class="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground/80"
                >
                    <Info class="size-3 shrink-0" />
                    <span>{{ portfolio.health.disclaimer }}</span>
                </p>
            </CardContent>
        </Card>

        <!-- 4. "YANG PERLU ANDA PERHATIKAN" SECTION (Top Exceptions, Max 5) -->
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h2
                        class="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl"
                    >
                        <span>Yang Perlu Anda Perhatikan</span>
                        <Badge
                            v-if="portfolio.attention_items.length > 0"
                            variant="secondary"
                            class="rounded-full px-2 py-0 text-xs font-bold"
                        >
                            {{ portfolio.attention_items.length }} lokasi
                        </Badge>
                    </h2>
                    <p class="text-xs text-muted-foreground sm:text-sm">
                        Lokasi dengan peningkatan pemakaian listrik atau data
                        yang perlu dilengkapi bulan ini.
                    </p>
                </div>
            </div>

            <!-- Empty State: All Healthy -->
            <Card
                v-if="portfolio.attention_items.length === 0"
                class="border-emerald-500/20 bg-emerald-500/5 p-6 text-center shadow-xs"
            >
                <div
                    class="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                    <CheckCircle2 class="size-6" />
                </div>
                <h3 class="mt-3 text-sm font-bold text-foreground">
                    Semua Lokasi Terpantau Aman
                </h3>
                <p class="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    Seluruh lokasi usaha Anda mencatat pemakaian listrik dalam
                    rentang normal dan data bulan ini telah terisi lengkap.
                </p>
            </Card>

            <!-- Exception Cards Grid -->
            <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card
                    v-for="item in portfolio.attention_items"
                    :key="item.business_id"
                    :class="[
                        'relative flex flex-col justify-between border shadow-xs transition-shadow hover:shadow-md',
                        item.status === 'Perlu Perhatian'
                            ? 'border-rose-500/30 bg-card dark:border-rose-900/40'
                            : item.status === 'Perlu Dicek'
                              ? 'border-amber-500/30 bg-card dark:border-amber-900/40'
                              : 'border-slate-500/20 bg-card dark:border-slate-800',
                    ]"
                >
                    <CardHeader class="pb-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span
                                    class="text-[11px] font-medium text-muted-foreground"
                                >
                                    {{ item.business_type_label }}
                                    {{ item.city ? `&bull; ${item.city}` : '' }}
                                </span>
                                <h3
                                    class="text-base leading-snug font-bold text-foreground"
                                >
                                    {{ item.business_name }}
                                </h3>
                            </div>

                            <!-- Severity Badge -->
                            <span
                                :class="[
                                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold',
                                    item.status === 'Perlu Perhatian'
                                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                        : item.status === 'Perlu Dicek'
                                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                          : 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
                                ]"
                            >
                                {{ item.status }}
                            </span>
                        </div>
                    </CardHeader>

                    <CardContent class="space-y-3 pb-4">
                        <p
                            class="text-xs leading-relaxed text-muted-foreground"
                        >
                            {{ item.reason }}
                        </p>

                        <!-- Impact info if available -->
                        <div
                            v-if="item.magnitude || item.estimated_impact_idr"
                            class="space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs"
                        >
                            <div
                                v-if="item.magnitude"
                                class="flex justify-between text-muted-foreground"
                            >
                                <span>Deviasi:</span>
                                <span class="font-semibold text-foreground">{{
                                    item.magnitude
                                }}</span>
                            </div>
                            <div
                                v-if="item.estimated_impact_idr"
                                class="flex justify-between text-muted-foreground"
                            >
                                <span>Perkiraan dampak:</span>
                                <span
                                    class="font-bold text-rose-600 dark:text-rose-400"
                                >
                                    +{{ formatIDR(item.estimated_impact_idr) }}
                                </span>
                            </div>
                        </div>

                        <!-- Action Button: Level 2 Drill-down -->
                        <Button
                            variant="outline"
                            size="sm"
                            class="group mt-2 w-full cursor-pointer justify-between border-border font-semibold hover:bg-accent"
                            :disabled="selectingId === item.business_id"
                            @click="drillDown(item.business_id)"
                        >
                            <span class="flex items-center gap-2">
                                <Loader2
                                    v-if="selectingId === item.business_id"
                                    class="size-3.5 animate-spin"
                                />
                                <span>{{ item.cta_label }}</span>
                            </span>
                            <ArrowRight
                                class="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- 5. Six-Month Portfolio Trend Chart -->
        <Card class="border-border bg-card shadow-xs">
            <CardHeader
                class="pb-2 sm:flex sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <CardTitle class="text-base font-bold sm:text-lg">
                        Tren Biaya Seluruh Usaha (6 Bulan Terakhir)
                    </CardTitle>
                    <CardDescription class="text-xs text-muted-foreground">
                        Agregat biaya listrik portofolio yang tercatat dari
                        {{ portfolio.trend[0]?.month_label }} hingga
                        {{
                            portfolio.trend[portfolio.trend.length - 1]
                                ?.month_label
                        }}.
                    </CardDescription>
                </div>
                <div
                    class="mt-2 flex items-center gap-3 text-xs text-muted-foreground sm:mt-0"
                >
                    <div class="flex items-center gap-1.5">
                        <span
                            class="size-2.5 rounded-full bg-emerald-500"
                        ></span>
                        <span>Biaya Listrik</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent class="pt-4">
                <!-- Simple bar representation disclosing coverage -->
                <div
                    class="grid min-h-[160px] grid-cols-6 items-end gap-2 border-b border-border pt-4 pb-2 sm:gap-4"
                >
                    <div
                        v-for="item in portfolio.trend"
                        :key="item.month"
                        class="group relative flex flex-col items-center gap-2"
                    >
                        <!-- Tooltip on hover -->
                        <div
                            class="pointer-events-none absolute -top-12 z-10 rounded-md border border-border bg-popover px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                        >
                            <div>{{ formatIDR(item.total_cost_idr) }}</div>
                            <div
                                class="text-[10px] font-normal text-muted-foreground"
                            >
                                {{ item.business_count_with_data }}/{{
                                    item.total_business_count
                                }}
                                lokasi tercatat
                            </div>
                        </div>

                        <!-- Bar -->
                        <div
                            class="flex h-28 w-full items-end justify-center rounded-md bg-muted/20 p-1"
                        >
                            <div
                                class="w-full rounded-sm bg-emerald-500/80 transition-all group-hover:bg-emerald-500"
                                :style="{
                                    height: `${Math.max(8, (item.total_cost_idr / maxTrendCost) * 100)}%`,
                                }"
                            ></div>
                        </div>

                        <!-- Label -->
                        <div class="text-center">
                            <div class="text-xs font-semibold text-foreground">
                                {{ item.month_label }}
                            </div>
                            <div class="text-[10px] text-muted-foreground">
                                {{ item.business_count_with_data }}/{{
                                    item.total_business_count
                                }}
                            </div>
                        </div>
                    </div>
                </div>
                <p
                    class="mt-3 flex items-center gap-1 text-xs text-muted-foreground"
                >
                    <Info class="size-3.5 shrink-0 text-muted-foreground" />
                    <span
                        >Data per bulan hanya menghitung lokasi yang sudah
                        tercatat. Tidak mengasumsikan data kosong sebagai
                        nol.</span
                    >
                </p>
            </CardContent>
        </Card>

        <!-- 6. "Semua Lokasi" Comparison Table & Mobile Cards -->
        <div class="space-y-4">
            <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h2
                        class="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                    >
                        Semua Lokasi
                    </h2>
                    <p class="text-xs text-muted-foreground sm:text-sm">
                        Daftar lengkap seluruh usaha aktif. Klik "Lihat" untuk
                        membuka dashboard investigasi lokasi (Level 2).
                    </p>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap items-center gap-2">
                    <!-- Search input -->
                    <div class="relative w-full sm:w-48">
                        <Search
                            class="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground"
                        />
                        <input
                            v-model="searchFilter"
                            type="text"
                            placeholder="Cari lokasi..."
                            class="h-9 w-full rounded-lg border border-border bg-card pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                        />
                    </div>

                    <!-- Status Filter -->
                    <select
                        v-model="statusFilter"
                        class="h-9 cursor-pointer rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="Aman">Aman</option>
                        <option value="Perlu Dicek">Perlu Dicek</option>
                        <option value="Perlu Perhatian">Perlu Perhatian</option>
                        <option value="Data Belum Lengkap">
                            Data Belum Lengkap
                        </option>
                    </select>

                    <!-- Type Filter -->
                    <select
                        v-model="typeFilter"
                        class="h-9 cursor-pointer rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                    >
                        <option value="ALL">Semua Jenis</option>
                        <option value="KOS_PROPERTY">Kos / Properti</option>
                        <option value="LAUNDRY">Laundry</option>
                        <option value="FNB">Makanan & Minuman</option>
                        <option value="RETAIL">Ritel</option>
                        <option value="COLD_STORAGE">Penyimpanan Dingin</option>
                        <option value="OTHER">Lainnya</option>
                    </select>
                </div>
            </div>

            <!-- Desktop Table View (Hidden on mobile) -->
            <Card
                class="hidden overflow-hidden border-border bg-card shadow-xs md:block"
            >
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead
                            class="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                        >
                            <tr>
                                <th scope="col" class="py-3.5 pr-3 pl-6">
                                    Lokasi
                                </th>
                                <th scope="col" class="px-3 py-3.5">
                                    Jenis Usaha
                                </th>
                                <th scope="col" class="px-3 py-3.5">
                                    Pemakaian
                                </th>
                                <th scope="col" class="px-3 py-3.5">
                                    Biaya Listrik
                                </th>
                                <th scope="col" class="px-3 py-3.5">
                                    Pendapatan
                                </th>
                                <th scope="col" class="px-3 py-3.5">
                                    Perubahan Biaya
                                </th>
                                <th scope="col" class="px-3 py-3.5">Status</th>
                                <th
                                    scope="col"
                                    class="py-3.5 pr-6 pl-3 text-right"
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            <tr
                                v-for="loc in filteredLocations"
                                :key="loc.id"
                                class="transition-colors hover:bg-muted/20"
                            >
                                <td
                                    class="py-4 pr-3 pl-6 font-semibold text-foreground"
                                >
                                    <div>{{ loc.name }}</div>
                                    <div
                                        class="text-xs font-normal text-muted-foreground"
                                    >
                                        {{ loc.city ?? 'Kota belum diatur' }}
                                    </div>
                                    <div
                                        v-if="loc.cost_vs_revenue_insight"
                                        class="mt-1 flex items-center gap-1 text-[11px] font-normal text-amber-600 dark:text-amber-400"
                                    >
                                        <AlertTriangle
                                            class="size-3 shrink-0"
                                        />
                                        <span>{{
                                            loc.cost_vs_revenue_insight
                                        }}</span>
                                    </div>
                                </td>
                                <td class="px-3 py-4 text-muted-foreground">
                                    {{ loc.business_type_label }}
                                </td>
                                <td
                                    class="px-3 py-4 font-medium text-foreground"
                                >
                                    {{ formatKWh(loc.usage_kwh) }}
                                </td>
                                <td
                                    class="px-3 py-4 font-semibold text-foreground"
                                >
                                    {{ formatIDR(loc.cost_idr) }}
                                </td>
                                <td class="px-3 py-4 text-muted-foreground">
                                    {{
                                        loc.revenue_idr !== null
                                            ? formatIDR(loc.revenue_idr)
                                            : '-'
                                    }}
                                </td>
                                <td class="px-3 py-4">
                                    <span
                                        v-if="loc.cost_change_percent !== null"
                                        :class="[
                                            'inline-flex items-center gap-0.5 text-xs font-semibold',
                                            loc.cost_change_percent > 0
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-emerald-600 dark:text-emerald-400',
                                        ]"
                                    >
                                        {{
                                            loc.cost_change_percent > 0
                                                ? '+'
                                                : ''
                                        }}{{ loc.cost_change_percent }}%
                                    </span>
                                    <span
                                        v-else
                                        class="text-xs text-muted-foreground"
                                        >-</span
                                    >
                                </td>
                                <td class="px-3 py-4">
                                    <span
                                        :class="[
                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                                            loc.status === 'Aman'
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                : loc.status === 'Perlu Dicek'
                                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                                  : loc.status ===
                                                      'Perlu Perhatian'
                                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                                    : 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
                                        ]"
                                    >
                                        {{ loc.status }}
                                    </span>
                                </td>
                                <td class="py-4 pr-6 pl-3 text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="h-8 cursor-pointer border-border font-semibold hover:bg-accent"
                                        :disabled="selectingId === loc.id"
                                        @click="drillDown(loc.id)"
                                    >
                                        <Loader2
                                            v-if="selectingId === loc.id"
                                            class="mr-1 size-3 animate-spin"
                                        />
                                        <span>Lihat</span>
                                        <ArrowRight
                                            class="ml-1 size-3 text-muted-foreground"
                                        />
                                    </Button>
                                </td>
                            </tr>
                            <tr v-if="filteredLocations.length === 0">
                                <td
                                    colspan="8"
                                    class="py-8 text-center text-xs text-muted-foreground"
                                >
                                    Tidak ada lokasi yang cocok dengan filter
                                    yang dipilih.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>

            <!-- Mobile Stacked Cards View (Shown on small screens) -->
            <div class="grid gap-3 md:hidden">
                <Card
                    v-for="loc in filteredLocations"
                    :key="loc.id"
                    class="space-y-3 border-border bg-card p-4 shadow-xs"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <span
                                class="text-[11px] font-medium text-muted-foreground"
                            >
                                {{ loc.business_type_label }}
                                {{ loc.city ? `&bull; ${loc.city}` : '' }}
                            </span>
                            <h3 class="text-base font-bold text-foreground">
                                {{ loc.name }}
                            </h3>
                        </div>
                        <span
                            :class="[
                                'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                                loc.status === 'Aman'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : loc.status === 'Perlu Dicek'
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                      : loc.status === 'Perlu Perhatian'
                                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
                            ]"
                        >
                            {{ loc.status }}
                        </span>
                    </div>

                    <div
                        v-if="loc.cost_vs_revenue_insight"
                        class="rounded bg-amber-500/10 p-2 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                    >
                        {{ loc.cost_vs_revenue_insight }}
                    </div>

                    <div
                        class="grid grid-cols-2 gap-2 border-y border-border py-2 text-xs"
                    >
                        <div>
                            <span
                                class="block text-[11px] text-muted-foreground"
                                >Pemakaian:</span
                            >
                            <span class="font-medium text-foreground">{{
                                formatKWh(loc.usage_kwh)
                            }}</span>
                        </div>
                        <div>
                            <span
                                class="block text-[11px] text-muted-foreground"
                                >Biaya Listrik:</span
                            >
                            <span class="font-semibold text-foreground">{{
                                formatIDR(loc.cost_idr)
                            }}</span>
                        </div>
                        <div>
                            <span
                                class="block text-[11px] text-muted-foreground"
                                >Pendapatan:</span
                            >
                            <span class="text-muted-foreground">{{
                                loc.revenue_idr !== null
                                    ? formatIDR(loc.revenue_idr)
                                    : '-'
                            }}</span>
                        </div>
                        <div>
                            <span
                                class="block text-[11px] text-muted-foreground"
                                >Perubahan:</span
                            >
                            <span
                                v-if="loc.cost_change_percent !== null"
                                :class="[
                                    'font-semibold',
                                    loc.cost_change_percent > 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-emerald-600 dark:text-emerald-400',
                                ]"
                            >
                                {{ loc.cost_change_percent > 0 ? '+' : ''
                                }}{{ loc.cost_change_percent }}%
                            </span>
                            <span v-else class="text-muted-foreground">-</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        class="w-full justify-between border-border font-semibold"
                        :disabled="selectingId === loc.id"
                        @click="drillDown(loc.id)"
                    >
                        <span>Lihat Lokasi (Level 2)</span>
                        <ArrowRight class="size-3.5 text-muted-foreground" />
                    </Button>
                </Card>

                <div
                    v-if="filteredLocations.length === 0"
                    class="py-8 text-center text-xs text-muted-foreground"
                >
                    Tidak ada lokasi yang cocok dengan filter yang dipilih.
                </div>
            </div>
        </div>

        <!-- 7. Educational & Scope Clarification Footer -->
        <div
            class="space-y-1.5 rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground"
        >
            <div class="flex items-center gap-1.5 font-bold text-foreground">
                <Info class="size-4 text-primary" />
                <span>Prinsip Pemantauan Bertingkat WattWise</span>
            </div>
            <p>
                <strong>Level 1 (Portofolio):</strong> Mengetahui lokasi mana
                yang sedang mengalami masalah atau lonjakan biaya.
            </p>
            <p>
                <strong>Level 2 (Dashboard Lokasi):</strong> Menginvestigasi
                penyebab masalah di lokasi tersebut melalui pencatatan alat,
                riwayat harian/bulanan, dan simulasi penghematan.
            </p>
        </div>
    </div>
</template>
