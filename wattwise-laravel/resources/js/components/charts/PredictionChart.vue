<script setup lang="ts">
import { ref, computed } from 'vue';

interface MonthData {
    period_month: string;
    month_name: string;
    bill_amount_idr: number | null;
    estimated_bill_amount_idr: number | null;
    occupancy_rate_percent: number | null;
    occupied_rooms: number | null;
}

interface PredictionData {
    period_month: string;
    month_name: string;
    bill_amount_idr: number | null;
}

const props = defineProps<{
    data: MonthData[];
    isKosProperty: boolean;
    nextMonthPrediction?: PredictionData | null;
}>();

const activeTab = ref<'actual_vs_est' | 'occupancy'>('actual_vs_est');

const width = 540;
const height = 240;
const padX = 54;
const padY = 32;

// Tooltip state
const activeIndex = ref<number | null>(null);

const activeTooltip = computed(() => {
    if (activeIndex.value === null) {
return null;
}

    if (activeIndex.value === chartPoints.value.length && projectedPoint.value) {
        return {
            month_name: projectedPoint.value.month_name,
            isProjection: true,
            value: projectedPoint.value.value,
            x: projectedPoint.value.x,
            y: projectedPoint.value.y,
            yAct: null,
            yEst: null,
            yCost: null,
            yOcc: null,
            actual: null,
            estimated: null,
            cost: null,
            occupancy: null,
            rooms: null,
        };
    }

    const pt = chartPoints.value[activeIndex.value];

    if (!pt) {
return null;
}

    return {
        month_name: pt.month_name,
        isProjection: false,
        value: 0,
        x: pt.x,
        y: pt.yAct ?? pt.yEst ?? pt.yCost ?? pt.yOcc ?? 0,
        yAct: pt.yAct,
        yEst: pt.yEst,
        yCost: pt.yCost,
        yOcc: pt.yOcc,
        actual: pt.actual,
        estimated: pt.estimated,
        cost: pt.cost,
        occupancy: pt.occupancy,
        rooms: pt.rooms,
    };
});

const validMonths = computed(() => props.data);

const chartPoints = computed(() => {
    const months = validMonths.value;
    const n = months.length;

    if (n === 0) {
return [];
}

    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;

    // Find max cost among actual and estimated and prediction to scale correctly
    const vals: number[] = [];
    months.forEach((m) => {
        if (typeof m.bill_amount_idr === 'number') {
vals.push(m.bill_amount_idr);
}

        if (typeof m.estimated_bill_amount_idr === 'number') {
vals.push(m.estimated_bill_amount_idr);
}
    });

    if (props.nextMonthPrediction?.bill_amount_idr) {
        vals.push(props.nextMonthPrediction.bill_amount_idr);
    }

    const max = vals.length ? Math.max(...vals) : 100000;
    const scaleMax = max === 0 ? 1 : max;

    // Occupancy vs Cost
    // Left Axis: Occupancy Rate (0% to 100%)
    // Right Axis: Cost Rp (0 to max cost)
    const costVals = months
        .map((m) => m.bill_amount_idr as number)
        .filter((v) => typeof v === 'number');
    const maxCost = costVals.length ? Math.max(...costVals) : 100000;
    const scaleMaxCost = maxCost === 0 ? 1 : maxCost;

    return months.map((m, i) => {
        const act = m.bill_amount_idr;
        const est = m.estimated_bill_amount_idr;
        const cost = m.bill_amount_idr;
        const occ = m.occupancy_rate_percent;

        const x = padX + (n > 1 ? stepX * i : innerW / 2);
        const yAct = act !== null ? padY + innerH - (act / scaleMax) * innerH : null;
        const yEst = est !== null ? padY + innerH - (est / scaleMax) * innerH : null;
        const yCost = cost !== null ? padY + innerH - (cost / scaleMaxCost) * innerH : null;
        const yOcc = occ !== null ? padY + innerH - (occ / 100.0) * innerH : null;

        return {
            period_month: m.period_month,
            month_name: m.month_name,
            actual: act,
            estimated: est,
            cost,
            occupancy: occ,
            rooms: m.occupied_rooms,
            x,
            yAct,
            yEst,
            yCost,
            yOcc,
        };
    });
});

const maxVal = computed(() => {
    if (activeTab.value === 'actual_vs_est') {
        const vals: number[] = [];
        validMonths.value.forEach((m) => {
            if (typeof m.bill_amount_idr === 'number') {
vals.push(m.bill_amount_idr);
}

            if (typeof m.estimated_bill_amount_idr === 'number') {
vals.push(m.estimated_bill_amount_idr);
}
        });

        if (props.nextMonthPrediction?.bill_amount_idr) {
            vals.push(props.nextMonthPrediction.bill_amount_idr);
        }

        return vals.length ? Math.max(...vals) : 100000;
    } else {
        const costVals = validMonths.value
            .map((m) => m.bill_amount_idr as number)
            .filter((v) => typeof v === 'number');

        return costVals.length ? Math.max(...costVals) : 100000;
    }
});

// Path builders
const actualLinePath = computed(() => {
    const pts = chartPoints.value.filter((p) => p.yAct !== null);

    if (pts.length < 2) {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.yAct}`).join(' L ');
});

const estimatedLinePath = computed(() => {
    const pts = chartPoints.value.filter((p) => p.yEst !== null);

    if (pts.length < 2) {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.yEst}`).join(' L ');
});

const occupancyLinePath = computed(() => {
    const pts = chartPoints.value.filter((p) => p.yOcc !== null);

    if (pts.length < 2) {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.yOcc}`).join(' L ');
});

const costLinePath = computed(() => {
    const pts = chartPoints.value.filter((p) => p.yCost !== null);

    if (pts.length < 2) {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.yCost}`).join(' L ');
});

// Projected coordinate for actual vs estimated next month connection
const projectedPoint = computed(() => {
    if (activeTab.value !== 'actual_vs_est' || !props.nextMonthPrediction) {
return null;
}

    const pts = chartPoints.value;

    if (pts.length === 0) {
return null;
}

    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const n = pts.length;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;
    const max = maxVal.value === 0 ? 1 : maxVal.value;

    const x = padX + innerW + (n > 1 ? stepX : innerW / 2); // place one step further right
    const pBill = props.nextMonthPrediction.bill_amount_idr ?? 0;
    const y = padY + innerH - (pBill / max) * innerH;

    return {
        month_name: props.nextMonthPrediction.month_name,
        value: pBill,
        x,
        y,
    };
});

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(val);
};

const gridLines = computed(() => {
    if (activeTab.value === 'actual_vs_est') {
        const max = maxVal.value;

        return [0.25, 0.5, 0.75, 1.0].map((p) => {
            const val = max * p;
            const y = padY + (height - padY * 2) * (1 - p);
            const formatted = val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k';

            return { y, val: formatted, leftVal: formatted, rightVal: '' };
        });
    } else {
        // Dual axis grid aligns with cost Y ticks on left, occupancy % ticks on right
        return [0.25, 0.5, 0.75, 1.0].map((p) => {
            const y = padY + (height - padY * 2) * (1 - p);
            const maxCost = maxVal.value;
            const costVal = maxCost * p;
            const formattedCost = costVal >= 1000000 ? (costVal / 1000000).toFixed(1) + 'M' : (costVal / 1000).toFixed(0) + 'k';
            const occVal = (p * 100).toFixed(0) + '%';

            return { y, val: '', leftVal: formattedCost, rightVal: occVal };
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
                    Simulasi vs Prediksi Biaya
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">Analisis realisasi pengeluaran vs target simulatif</p>
            </div>

            <!-- Tab Switcher (Only visible for Kos segment having room profile details) -->
            <div
                v-if="isKosProperty"
                class="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 max-w-fit"
            >
                <button
                    @click="activeTab = 'actual_vs_est'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'actual_vs_est'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Realisasi vs Target
                </button>
                <button
                    @click="activeTab = 'occupancy'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'occupancy'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Tingkat Hunian vs Biaya
                </button>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-if="validMonths.length === 0"
            class="h-48 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-center p-4 bg-muted/5"
        >
            <span class="text-xs font-bold text-muted-foreground">Grafik belum tersedia</span>
            <span class="text-[10px] text-muted-foreground mt-1 max-w-xs leading-normal">
                Memerlukan minimal 1 bulan data tagihan listrik terdaftar.
            </span>
        </div>

        <div v-else class="relative w-full overflow-x-auto">
            <svg
                :viewBox="`0 0 ${width + (nextMonthPrediction && activeTab === 'actual_vs_est' ? 60 : 0)} ${height}`"
                class="w-full h-auto min-w-[480px]"
                role="img"
                aria-label="Grafik Prediksi dan Target"
            >
                <!-- Grid Lines -->
                <g class="grid-lines">
                    <template v-for="grid in gridLines" :key="grid.y">
                        <line
                            :x1="padX"
                            :y1="grid.y"
                            :x2="width"
                            :y2="grid.y"
                            class="stroke-border/40"
                            stroke-width="1"
                            stroke-dasharray="4 4"
                        />

                        <!-- Left Tick (Cost) -->
                        <text
                            :x="padX - 8"
                            :y="grid.y + 3.5"
                            text-anchor="end"
                            class="fill-muted-foreground text-[8px] font-medium"
                        >
                            {{ activeTab === 'actual_vs_est' ? grid.val : grid.leftVal }}
                        </text>

                        <!-- Right Tick (Occupancy - only on occupancy tab) -->
                        <text
                            v-if="activeTab === 'occupancy'"
                            :x="width + 8"
                            :y="grid.y + 3.5"
                            text-anchor="start"
                            class="fill-muted-foreground text-[8px] font-medium"
                        >
                            {{ grid.rightVal }}
                        </text>
                    </template>
                </g>

                <!-- Baseline X-Axis -->
                <line
                    :x1="padX"
                    :y1="height - padY"
                    :x2="width + (nextMonthPrediction && activeTab === 'actual_vs_est' ? 60 : 0) - padX"
                    :y2="height - padY"
                    class="stroke-border"
                    stroke-width="1"
                />

                <!-- Tab 1: Realisasi vs Target (Estimated) -->
                <g v-if="activeTab === 'actual_vs_est'">
                    <!-- Target (Estimated Baseline) Line - dashed blue -->
                    <path
                        v-if="estimatedLinePath"
                        :d="estimatedLinePath"
                        fill="none"
                        class="stroke-blue-500/60 dark:stroke-blue-500/50"
                        stroke-width="2"
                        stroke-dasharray="5 4"
                    />

                    <!-- Actual Cost Line - emerald -->
                    <path
                        v-if="actualLinePath"
                        :d="actualLinePath"
                        fill="none"
                        class="stroke-emerald-500"
                        stroke-width="2.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />

                    <!-- Projected connector to next month -->
                    <line
                        v-if="projectedPoint && chartPoints.length && chartPoints[chartPoints.length - 1].yAct !== null"
                        :x1="chartPoints[chartPoints.length - 1].x"
                        :y1="chartPoints[chartPoints.length - 1].yAct!"
                        :x2="projectedPoint.x"
                        :y2="projectedPoint.y"
                        class="stroke-amber-500"
                        stroke-width="2"
                        stroke-dasharray="6 4"
                    />

                    <!-- Projected point -->
                    <circle
                        v-if="projectedPoint"
                        :cx="projectedPoint.x"
                        :cy="projectedPoint.y"
                        r="5"
                        class="fill-amber-500 stroke-background stroke-2 cursor-pointer"
                        @mouseenter="activeIndex = chartPoints.length"
                        @mouseleave="activeIndex = null"
                    />

                    <!-- Interactive Circles (Actual) -->
                    <template v-for="(p, idx) in chartPoints" :key="p.period_month">
                        <circle
                            v-if="p.yAct !== null"
                            :cx="p.x"
                            :cy="p.yAct"
                            :r="activeIndex === idx ? 6 : 4"
                            class="stroke-background stroke-2 cursor-pointer transition-all duration-200 fill-emerald-500"
                            :class="{ 'fill-emerald-400': activeIndex === idx }"
                            @mouseenter="activeIndex = idx"
                            @mouseleave="activeIndex = null"
                        />
                    </template>

                    <!-- Circles (Estimated) -->
                    <template v-for="p in chartPoints" :key="'est-' + p.period_month">
                        <circle
                            v-if="p.yEst !== null"
                            :cx="p.x"
                            :cy="p.yEst"
                            r="3"
                            class="fill-blue-500/70 stroke-background stroke-1"
                        />
                    </template>
                </g>

                <!-- Tab 2: Occupancy vs Cost (Dual Axis) -->
                <g v-else>
                    <!-- Occupancy Line (Blue) -->
                    <path
                        v-if="occupancyLinePath"
                        :d="occupancyLinePath"
                        fill="none"
                        class="stroke-blue-500"
                        stroke-width="2.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />

                    <!-- Cost Line (Emerald) -->
                    <path
                        v-if="costLinePath"
                        :d="costLinePath"
                        fill="none"
                        class="stroke-emerald-500"
                        stroke-width="2.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />

                    <!-- Circles (Occupancy) -->
                    <template v-for="(p, idx) in chartPoints" :key="'occ-' + p.period_month">
                        <circle
                            v-if="p.yOcc !== null"
                            :cx="p.x"
                            :cy="p.yOcc"
                            :r="activeIndex === idx ? 6 : 4"
                            class="stroke-background stroke-2 cursor-pointer transition-all duration-200 fill-blue-500"
                            :class="{ 'fill-blue-400': activeIndex === idx }"
                            @mouseenter="activeIndex = idx"
                            @mouseleave="activeIndex = null"
                        />
                    </template>

                    <!-- Circles (Cost) -->
                    <template v-for="(p, idx) in chartPoints" :key="'cost-' + p.period_month">
                        <circle
                            v-if="p.yCost !== null"
                            :cx="p.x"
                            :cy="p.yCost"
                            :r="activeIndex === idx ? 6 : 4"
                            class="stroke-background stroke-2 cursor-pointer transition-all duration-200 fill-emerald-500"
                            :class="{ 'fill-emerald-400': activeIndex === idx }"
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
                    <text
                        v-if="projectedPoint && activeTab === 'actual_vs_est'"
                        :x="projectedPoint.x"
                        :y="height - padY + 16"
                        text-anchor="middle"
                        class="fill-amber-600 dark:fill-amber-400 text-[9px] font-extrabold"
                    >
                        {{ projectedPoint.month_name }}
                    </text>
                </g>
            </svg>

            <!-- Tooltip Overlay -->
            <!-- Tooltip Tab 1 (Actual vs Estimated / Projection) -->
            <div
                v-if="activeTooltip && activeTab === 'actual_vs_est'"
                class="absolute z-10 bg-popover text-popover-foreground border border-border px-3 py-2.5 rounded-lg shadow-md text-xs pointer-events-none flex flex-col gap-1 min-w-[140px]"
                :style="{
                    left: `${(activeTooltip.x / (width + (nextMonthPrediction ? 60 : 0))) * 100}%`,
                    top: `${((activeTooltip.isProjection ? activeTooltip.y : (activeTooltip.yAct ?? 0)) / height) * 100 - 15}%`,
                    transform: 'translate(-50%, -100%)',
                }"
            >
                <template v-if="activeTooltip.isProjection">
                    <span class="font-bold border-b border-border pb-1 mb-1">{{ activeTooltip.month_name }}</span>
                    <span class="text-[9px] text-amber-500 font-extrabold uppercase tracking-wide">Proyeksi AI</span>
                    <span class="font-extrabold text-amber-650 dark:text-amber-400 text-sm">
                        {{ formatCurrency(activeTooltip.value) }}
                    </span>
                </template>
                <template v-else>
                    <span class="font-bold border-b border-border pb-1 mb-1">{{ activeTooltip.month_name }}</span>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-[9px] text-muted-foreground">Realisasi Tagihan</span>
                        <span class="font-bold text-emerald-600 dark:text-emerald-400">
                            {{ activeTooltip.actual !== null ? formatCurrency(activeTooltip.actual) : 'Tidak ada data' }}
                        </span>
                    </div>
                    <div class="flex flex-col gap-0.5 mt-1">
                        <span class="text-[9px] text-muted-foreground">Target (Rata-rata Baseline)</span>
                        <span class="font-bold text-blue-500">
                            {{ activeTooltip.estimated !== null ? formatCurrency(activeTooltip.estimated) : 'Tidak ada data' }}
                        </span>
                    </div>
                </template>
            </div>

            <!-- Tooltip Tab 2 (Occupancy vs Cost) -->
            <div
                v-if="activeTooltip && activeTab === 'occupancy' && !activeTooltip.isProjection"
                class="absolute z-10 bg-popover text-popover-foreground border border-border px-3 py-2.5 rounded-lg shadow-md text-xs pointer-events-none flex flex-col gap-1 min-w-[140px]"
                :style="{
                    left: `${(activeTooltip.x / width) * 100}%`,
                    top: `${(Math.min(activeTooltip.yCost ?? 0, activeTooltip.yOcc ?? 0) / height) * 100 - 15}%`,
                    transform: 'translate(-50%, -100%)',
                }"
            >
                <span class="font-bold border-b border-border pb-1 mb-1">{{ activeTooltip.month_name }}</span>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] text-muted-foreground">Tingkat Hunian</span>
                    <span class="font-extrabold text-blue-650 dark:text-blue-400">
                        {{ activeTooltip.occupancy !== null ? `${activeTooltip.occupancy.toFixed(0)}% (${activeTooltip.rooms} kamar)` : 'Tidak ada data' }}
                    </span>
                </div>
                <div class="flex flex-col gap-0.5 mt-1 border-t border-border pt-1">
                    <span class="text-[9px] text-muted-foreground">Pengeluaran Listrik</span>
                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {{ activeTooltip.cost !== null ? formatCurrency(activeTooltip.cost) : 'Tidak ada data' }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Legends -->
        <div class="flex items-center justify-center gap-6 text-[10px] text-muted-foreground mt-1 flex-wrap">
            <template v-if="activeTab === 'actual_vs_est'">
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Realisasi Biaya Listrik
                </span>
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2 w-2 rounded-full bg-blue-500"></span> Target (Rata-rata Historis)
                </span>
                <span v-if="nextMonthPrediction" class="flex items-center gap-1.5">
                    <span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span> Proyeksi Bulan Depan
                </span>
            </template>
            <template v-else>
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2 w-2 rounded-full bg-blue-500"></span> Tingkat Hunian (%)
                </span>
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Pengeluaran Listrik (Rp)
                </span>
            </template>
        </div>
    </div>
</template>
