<script setup lang="ts">
import { ref, computed } from 'vue';

interface MonthData {
    period_month: string;
    month_name: string;
    usage_kwh: number | null;
    bill_amount_idr: number | null;
}

const props = defineProps<{
    data: MonthData[];
}>();

const activeTab = ref<'kwh' | 'cost'>('kwh');

const width = 540;
const height = 240;
const padX = 54;
const padY = 32;

// Tooltip state
const activeIndex = ref<number | null>(null);

const validMonths = computed(() =>
    props.data.filter((m) => {
        if (activeTab.value === 'kwh') {
            return typeof m.usage_kwh === 'number';
        }

        return typeof m.bill_amount_idr === 'number';
    }),
);

const chartPoints = computed(() => {
    const months = validMonths.value;
    const n = months.length;

    if (n === 0) {
return [];
}

    const values = months.map((m) =>
        activeTab.value === 'kwh' ? (m.usage_kwh as number) : (m.bill_amount_idr as number),
    );

    let max = Math.max(...values);

    if (max === 0) {
max = 1;
}

    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;

    return months.map((m, i) => {
        const val = activeTab.value === 'kwh' ? (m.usage_kwh as number) : (m.bill_amount_idr as number);
        const x = padX + (n > 1 ? stepX * i : innerW / 2);
        const y = padY + innerH - (val / max) * innerH;

        return {
            period_month: m.period_month,
            month_name: m.month_name,
            value: val,
            x,
            y,
        };
    });
});

const maxVal = computed(() => {
    const months = validMonths.value;

    if (months.length === 0) {
return 0;
}

    return Math.max(
        ...months.map((m) => (activeTab.value === 'kwh' ? (m.usage_kwh as number) : (m.bill_amount_idr as number))),
    );
});

// Area coordinates for line area path fill
const areaPath = computed(() => {
    const pts = chartPoints.value;

    if (pts.length < 2) {
return '';
}

    const first = pts[0];
    const last = pts[pts.length - 1];
    const linePath = pts.map((p) => `${p.x},${p.y}`).join(' L ');

    return `M ${first.x},${height - padY} L ${linePath} L ${last.x},${height - padY} Z`;
});

const linePath = computed(() => {
    const pts = chartPoints.value;

    if (pts.length < 2) {
return '';
}

    return 'M ' + pts.map((p) => `${p.x},${p.y}`).join(' L ');
});

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(val);
};

const formatValue = (val: number) => {
    if (activeTab.value === 'kwh') {
        return val.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kWh';
    }

    return formatCurrency(val);
};

const gridLines = computed(() => {
    const max = maxVal.value;

    if (max <= 0) {
return [];
}

    return [0.25, 0.5, 0.75, 1.0].map((p) => {
        const val = max * p;
        const y = padY + (height - padY * 2) * (1 - p);

        return { y, val };
    });
});
</script>

<template>
    <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div>
                <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
                    <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                    Tren Pemakaian & Biaya Listrik
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">Evaluasi pemakaian historis 6 bulan terakhir</p>
            </div>

            <!-- Tab Switcher -->
            <div class="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 max-w-fit">
                <button
                    @click="activeTab = 'kwh'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'kwh'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Konsumsi (kWh)
                </button>
                <button
                    @click="activeTab = 'cost'"
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                    :class="
                        activeTab === 'cost'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    "
                >
                    Biaya (Rp)
                </button>
            </div>
        </div>

        <!-- Warning / Insufficient Data -->
        <div
            v-if="data.length > 0 && data.length < 3"
            class="flex items-center gap-2 px-3 py-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold"
        >
            <span>⚠️ Data kurang dari 3 bulan (Tingkat keyakinan tren rendah). Rekomendasi tetap simulatif.</span>
        </div>

        <!-- Empty State -->
        <div
            v-if="validMonths.length === 0"
            class="h-48 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-center p-4 bg-muted/5"
        >
            <span class="text-xs font-bold text-muted-foreground">Belum ada data historis listrik</span>
            <span class="text-[10px] text-muted-foreground mt-1 max-w-xs leading-normal">
                Catatan tagihan listrik yang Anda masukkan akan ditampilkan di grafik tren ini.
            </span>
        </div>

        <div v-else class="relative w-full overflow-x-auto">
            <svg
                :viewBox="`0 0 ${width} ${height}`"
                class="w-full h-auto min-w-[480px]"
                role="img"
                aria-label="Grafik Tren Pemakaian Listrik"
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
                            {{ activeTab === 'kwh' ? grid.val.toFixed(0) : grid.val >= 1000000 ? (grid.val / 1000000).toFixed(1) + 'M' : (grid.val / 1000).toFixed(0) + 'k' }}
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

                <!-- Tab: KWh Bar Chart -->
                <g v-if="activeTab === 'kwh'">
                    <template v-for="(p, idx) in chartPoints" :key="p.period_month">
                        <!-- Bar -->
                        <rect
                            :x="p.x - 12"
                            :y="p.y"
                            :width="24"
                            :height="height - padY - p.y"
                            rx="4"
                            class="transition-all duration-300 cursor-pointer"
                            :class="
                                activeIndex === idx
                                    ? 'fill-emerald-400'
                                    : 'fill-emerald-500/80 dark:fill-emerald-500/70'
                            "
                            @mouseenter="activeIndex = idx"
                            @mouseleave="activeIndex = null"
                        />
                    </template>
                </g>

                <!-- Tab: Cost Line Area Chart -->
                <g v-else>
                    <!-- Gradient Area Fill -->
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="rgb(16, 185, 129)" stop-opacity="0.25" />
                            <stop offset="100%" stop-color="rgb(16, 185, 129)" stop-opacity="0.00" />
                        </linearGradient>
                    </defs>

                    <!-- Area Path -->
                    <path v-if="areaPath" :d="areaPath" fill="url(#areaGrad)" />

                    <!-- Line Path -->
                    <path
                        v-if="linePath"
                        :d="linePath"
                        fill="none"
                        class="stroke-emerald-500"
                        stroke-width="2.5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                    />

                    <!-- Interactive Circles -->
                    <circle
                        v-for="(p, idx) in chartPoints"
                        :key="p.period_month"
                        :cx="p.x"
                        :cy="p.y"
                        :r="activeIndex === idx ? 6 : 4"
                        class="stroke-background cursor-pointer transition-all duration-200"
                        :class="activeIndex === idx ? 'fill-emerald-400' : 'fill-emerald-500'"
                        stroke-width="2"
                        @mouseenter="activeIndex = idx"
                        @mouseleave="activeIndex = null"
                    />
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
                class="absolute z-10 bg-popover text-popover-foreground border border-border px-3 py-2 rounded-lg shadow-md text-xs pointer-events-none flex flex-col gap-0.5"
                :style="{
                    left: `${(chartPoints[activeIndex].x / width) * 100}%`,
                    top: `${(chartPoints[activeIndex].y / height) * 100 - 15}%`,
                    transform: 'translate(-50%, -100%)',
                }"
            >
                <span class="font-bold">{{ chartPoints[activeIndex].month_name }}</span>
                <span class="text-[10px] text-muted-foreground">
                    {{ activeTab === 'kwh' ? 'Konsumsi Listrik' : 'Biaya Tagihan' }}
                </span>
                <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {{ formatValue(chartPoints[activeIndex].value) }}
                </span>
            </div>
        </div>
    </div>
</template>
