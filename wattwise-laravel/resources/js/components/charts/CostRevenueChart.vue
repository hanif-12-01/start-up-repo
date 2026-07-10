<script setup lang="ts">
import { ref, computed } from 'vue';

interface MonthData {
    period_month: string;
    month_name: string;
    bill_amount_idr: number | null;
    revenue_amount_idr: number | null;
    ratio_percent: number | null;
}

const props = defineProps<{
    data: MonthData[];
}>();

const activeTab = ref<'ratio' | 'cashflow'>('ratio');

const width = 540;
const height = 240;
const padX = 54;
const padY = 32;

// Tooltip state
const activeIndex = ref<number | null>(null);

const validMonths = computed(() =>
    props.data.filter((m) => {
        if (activeTab.value === 'ratio') {
            return typeof m.ratio_percent === 'number';
        }

        return typeof m.bill_amount_idr === 'number' || typeof m.revenue_amount_idr === 'number';
    }),
);

// Scale computations
const maxRatioVal = computed(() => {
    const ratios = validMonths.value
        .map((m) => m.ratio_percent as number)
        .filter((r) => r !== null && isFinite(r));

    if (ratios.length === 0) {
return 15;
}

    const max = Math.max(...ratios, 10.0); // anchor at minimum 10% for efficiency target line

    return max + 2.0; // pad slightly
});

const maxCashflowVal = computed(() => {
    const vals: number[] = [];
    validMonths.value.forEach((m) => {
        if (typeof m.revenue_amount_idr === 'number') {
vals.push(m.revenue_amount_idr);
}

        if (typeof m.bill_amount_idr === 'number') {
vals.push(m.bill_amount_idr);
}
    });

    if (vals.length === 0) {
return 1000000;
}

    const max = Math.max(...vals);

    return max === 0 ? 1 : max;
});

const chartPoints = computed(() => {
    const months = validMonths.value;
    const n = months.length;

    if (n === 0) {
return [];
}

    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;

    const maxRatio = maxRatioVal.value;
    const maxCashflow = maxCashflowVal.value;
    const colWidth = innerW / n;

    return months.map((m, i) => {
        const ratio = m.ratio_percent ?? 0;
        const bill = m.bill_amount_idr ?? 0;
        const rev = m.revenue_amount_idr ?? 0;

        // X coordinate matches tab logic
        const xLine = padX + (n > 1 ? stepX * i : innerW / 2);
        const xBar = padX + colWidth * i + colWidth / 2;
        const x = activeTab.value === 'ratio' ? xLine : xBar;

        const y = padY + innerH - (ratio / maxRatio) * innerH;
        const yBill = padY + innerH - (bill / maxCashflow) * innerH;
        const yRev = padY + innerH - (rev / maxCashflow) * innerH;

        return {
            period_month: m.period_month,
            month_name: m.month_name,
            bill: m.bill_amount_idr,
            revenue: m.revenue_amount_idr,
            ratio: m.ratio_percent,
            x,
            y,
            yBill,
            yRev,
        };
    });
});

// Area coordinates for line area path fill (ratio)
const areaPath = computed(() => {
    const pts = chartPoints.value;

    if (pts.length < 2 || activeTab.value !== 'ratio') {
return '';
}

    const first = pts[0];
    const last = pts[pts.length - 1];
    const linePath = pts.map((p) => `${p.x},${p.y}`).join(' L ');

    return `M ${first.x},${height - padY} L ${linePath} L ${last.x},${height - padY} Z`;
});

const linePath = computed(() => {
    const pts = chartPoints.value;

    if (pts.length < 2 || activeTab.value !== 'ratio') {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.y}`).join(' L ');
});

// Horizontal 10% line Y position (ratio chart only)
const targetRatioY = computed(() => {
    if (activeTab.value !== 'ratio') {
return null;
}

    const max = maxRatioVal.value;
    const innerH = height - padY * 2;

    return padY + innerH - (10.0 / max) * innerH;
});

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(val);
};

const gridLines = computed(() => {
    if (activeTab.value === 'ratio') {
        const max = maxRatioVal.value;

        return [3, 5, 8, 10, 12, 15].filter((v) => v < max).map((val) => {
            const y = padY + (height - padY * 2) * (1 - val / max);

            return { y, val: val.toFixed(0) + '%' };
        });
    } else {
        const max = maxCashflowVal.value;

        return [0.25, 0.5, 0.75, 1.0].map((p) => {
            const val = max * p;
            const y = padY + (height - padY * 2) * (1 - p);
            const formatted = val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k';

            return { y, val: formatted };
        });
    }
});
</script>

<template>
    <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div>
                <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
                    <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                    Rasio Pengeluaran Listrik & Cash Flow
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">Analisis beban listrik terhadap pendapatan kotor</p>
            </div>

            <!-- Tab Switcher -->
            <div class="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 max-w-fit">
                <button
                    @click="activeTab = 'ratio'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'ratio'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Rasio Listrik (%)
                </button>
                <button
                    @click="activeTab = 'cashflow'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'cashflow'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Listrik vs Omzet (Rp)
                </button>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-if="validMonths.length === 0"
            class="h-48 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-center p-4 bg-muted/5"
        >
            <span class="text-xs font-bold text-muted-foreground">Belum ada data Rasio & Cash Flow</span>
            <span class="text-[10px] text-muted-foreground mt-1 max-w-xs leading-normal">
                Tagihan listrik bulanan dan pendapatan bulanan yang dicatat diperlukan untuk melihat rasio ini.
            </span>
        </div>

        <div v-else class="relative w-full overflow-x-auto">
            <svg
                :viewBox="`0 0 ${width} ${height}`"
                class="w-full h-auto min-w-[480px]"
                role="img"
                aria-label="Grafik Rasio Listrik dan Cash Flow"
            >
                <g class="grid-lines">
                    <!-- Grid Lines & Y ticks -->
                    <template v-for="grid in gridLines" :key="grid.y">
                        <line
                            :x1="padX"
                            :y1="grid.y"
                            :x2="width - padX"
                            :y2="grid.y"
                            class="stroke-border/40"
                            stroke-width="1"
                            stroke-dasharray="4 4"
                        />
                        <text
                            :x="padX - 8"
                            :y="grid.y + 3.5"
                            text-anchor="end"
                            class="fill-muted-foreground text-[8px] font-medium"
                        >
                            {{ grid.val }}
                        </text>
                    </template>
                </g>

                <!-- Baseline X-Axis -->
                <line
                    :x1="padX"
                    :y1="height - padY"
                    :x2="width - padX"
                    :y2="height - padY"
                    class="stroke-border"
                    stroke-width="1"
                />

                <!-- Tab: Ratio Line Chart -->
                <g v-if="activeTab === 'ratio'">
                    <!-- Gradient Area Fill -->
                    <defs>
                        <linearGradient id="ratioAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="rgb(16, 185, 129)" stop-opacity="0.2" />
                            <stop offset="100%" stop-color="rgb(16, 185, 129)" stop-opacity="0.0" />
                        </linearGradient>
                    </defs>

                    <!-- Area Fill -->
                    <path v-if="areaPath" :d="areaPath" fill="url(#ratioAreaGrad)" />

                    <!-- Line -->
                    <path
                        v-if="linePath"
                        :d="linePath"
                        fill="none"
                        class="stroke-emerald-500"
                        stroke-width="2.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />

                    <!-- Efficiency Target Line (10.0%) -->
                    <line
                        v-if="targetRatioY !== null"
                        :x1="padX"
                        :y1="targetRatioY"
                        :x2="width - padX"
                        :y2="targetRatioY"
                        class="stroke-red-500/60 dark:stroke-red-500/50"
                        stroke-width="1.5"
                        stroke-dasharray="6 4"
                    />
                    <text
                        v-if="targetRatioY !== null"
                        :x="width - padX"
                        :y="targetRatioY - 6"
                        text-anchor="end"
                        class="fill-red-500 text-[8px] font-extrabold tracking-wide uppercase"
                    >
                        Batas Efisien (10%)
                    </text>

                    <!-- Circle points -->
                    <circle
                        v-for="(p, idx) in chartPoints"
                        :key="p.period_month"
                        :cx="p.x"
                        :cy="p.y"
                        :r="activeIndex === idx ? 6 : 4.5"
                        class="stroke-background cursor-pointer transition-all duration-200"
                        :class="
                            (p.ratio ?? 0) > 10.0
                                ? (activeIndex === idx ? 'fill-red-400' : 'fill-red-500')
                                : (activeIndex === idx ? 'fill-emerald-400' : 'fill-emerald-500')
                        "
                        stroke-width="2"
                        @mouseenter="activeIndex = idx"
                        @mouseleave="activeIndex = null"
                    />
                </g>

                <!-- Tab: Cashflow Grouped Bar Chart -->
                <g v-else>
                    <template v-for="(p, idx) in chartPoints" :key="p.period_month">
                        <!-- Revenue Bar -->
                        <rect
                            :x="p.x - 14"
                            :y="p.yRev"
                            :width="12"
                            :height="Math.max(1, height - padY - p.yRev)"
                            rx="3"
                            class="fill-emerald-500/80 dark:fill-emerald-500/70 transition-all duration-200 cursor-pointer"
                            :class="{ 'opacity-100 fill-emerald-400': activeIndex === idx }"
                            @mouseenter="activeIndex = idx"
                            @mouseleave="activeIndex = null"
                        />

                        <!-- Cost Bar -->
                        <rect
                            :x="p.x + 2"
                            :y="p.yBill"
                            :width="12"
                            :height="Math.max(1, height - padY - p.yBill)"
                            rx="3"
                            class="fill-amber-500/80 dark:fill-amber-500/70 transition-all duration-200 cursor-pointer"
                            :class="{ 'opacity-100 fill-amber-400': activeIndex === idx }"
                            @mouseenter="activeIndex = idx"
                            @mouseleave="activeIndex = null"
                        />
                    </template>
                </g>

                <!-- X Axis Labels -->
                <g class="x-labels">
                    <text
                        v-for="p in chartPoints"
                        :key="p.period_month"
                        :x="p.x"
                        :y="height - padY + 16"
                        text-anchor="middle"
                        class="fill-muted-foreground text-[9px] font-semibold"
                    >
                        {{ p.month_name }}
                    </text>
                </g>
            </svg>

            <!-- Tooltip Overlay -->
            <div
                v-if="activeIndex !== null && chartPoints[activeIndex]"
                class="absolute z-10 bg-popover text-popover-foreground border border-border px-3 py-2.5 rounded-lg shadow-md text-xs pointer-events-none flex flex-col gap-1 min-w-[140px]"
                :style="{
                    left: `${(chartPoints[activeIndex].x / width) * 100}%`,
                    top: `${(activeTab === 'ratio' ? chartPoints[activeIndex].y : Math.min(chartPoints[activeIndex].yBill ?? 0, chartPoints[activeIndex].yRev ?? 0)) / height * 100 - 15}%`,
                    transform: 'translate(-50%, -100%)',
                }"
            >
                <span class="font-bold border-b border-border pb-1 mb-1">{{ chartPoints[activeIndex].month_name }}</span>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] text-muted-foreground">Pendapatan (Omzet)</span>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">
                        {{ formatCurrency(chartPoints[activeIndex].revenue ?? 0) }}
                    </span>
                </div>
                <div class="flex flex-col gap-0.5 mt-1">
                    <span class="text-[9px] text-muted-foreground">Tagihan Listrik</span>
                    <span class="font-bold text-amber-600 dark:text-amber-400">
                        {{ formatCurrency(chartPoints[activeIndex].bill ?? 0) }}
                    </span>
                </div>
                <div class="flex flex-col gap-0.5 mt-1 border-t border-border pt-1">
                    <span class="text-[9px] text-muted-foreground">Rasio Pengeluaran</span>
                    <span
                        class="font-extrabold text-sm"
                        :class="
                            (chartPoints[activeIndex].ratio ?? 0) > 10.0
                                ? 'text-red-500'
                                : 'text-emerald-500'
                        "
                    >
                        {{ (chartPoints[activeIndex].ratio ?? 0).toFixed(1) }}%
                    </span>
                </div>
            </div>
        </div>

        <!-- Legend -->
        <div class="flex items-center justify-center gap-6 text-[10px] text-muted-foreground mt-1">
            <span class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Pendapatan Kotor (Omzet)
            </span>
            <span class="flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span> Pengeluaran Listrik
            </span>
        </div>
    </div>
</template>
