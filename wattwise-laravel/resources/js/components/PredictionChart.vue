<script setup lang="ts">
import { computed } from 'vue';

interface ChartPoint {
    period_month: string;
    usage_kwh: number | null;
    type: 'actual' | 'predicted';
}

const props = defineProps<{ data: ChartPoint[] }>();

const width = 640;
const height = 240;
const padX = 44;
const padY = 28;

const points = computed(() =>
    props.data
        .map((d, i) => ({ ...d, index: i, value: typeof d.usage_kwh === 'number' ? d.usage_kwh : null }))
        .filter((d): d is ChartPoint & { index: number; value: number } => d.value !== null),
);

const layout = computed(() => {
    const pts = points.value;
    const n = pts.length;

    if (n === 0) {
        return null;
    }

    const values = pts.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (max === min) {
        // Avoid a zero range (which would divide by zero) — flatten to a mid line.
        max = min + 1;
        min = Math.max(0, min - 1);
    }

    const range = max - min;

    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const stepX = n > 1 ? innerW / (n - 1) : 0;

    const coords = pts.map((p, i) => {
        const x = padX + (n > 1 ? stepX * i : innerW / 2);
        const y = padY + innerH - ((p.value - min) / range) * innerH;

        return { period_month: p.period_month, type: p.type, value: p.value, x, y };
    });

    const actual = coords.filter((c) => c.type === 'actual');
    const predicted = coords.find((c) => c.type === 'predicted') ?? null;
    const actualLine = actual.map((c) => `${c.x},${c.y}`).join(' ');
    const lastActual = actual.length ? actual[actual.length - 1] : null;

    return { coords, actualLine, lastActual, predicted };
});
</script>

<template>
    <div class="w-full overflow-x-auto">
        <svg
            :viewBox="`0 0 ${width} ${height}`"
            class="h-auto w-full"
            role="img"
            aria-label="Grafik pemakaian listrik aktual versus proyeksi"
            preserveAspectRatio="xMidYMid meet"
        >
            <template v-if="layout">
                <!-- baseline -->
                <line
                    :x1="padX"
                    :y1="height - padY"
                    :x2="width - padX"
                    :y2="height - padY"
                    class="stroke-border"
                    stroke-width="1"
                />

                <!-- actual usage line -->
                <polyline
                    v-if="layout.actualLine"
                    :points="layout.actualLine"
                    fill="none"
                    class="stroke-emerald-500"
                    stroke-width="2.5"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                />

                <!-- dashed connector to the projected point -->
                <line
                    v-if="layout.lastActual && layout.predicted"
                    :x1="layout.lastActual.x"
                    :y1="layout.lastActual.y"
                    :x2="layout.predicted.x"
                    :y2="layout.predicted.y"
                    class="stroke-amber-500"
                    stroke-width="2.5"
                    stroke-dasharray="6 5"
                />

                <!-- points + labels -->
                <template v-for="c in layout.coords" :key="c.period_month">
                    <circle
                        :cx="c.x"
                        :cy="c.y"
                        :r="c.type === 'predicted' ? 5 : 4"
                        :class="c.type === 'predicted' ? 'fill-amber-500' : 'fill-emerald-500'"
                    />
                    <text
                        :x="c.x"
                        :y="height - padY + 16"
                        text-anchor="middle"
                        class="fill-muted-foreground text-[9px]"
                    >
                        {{ c.period_month }}
                    </text>
                </template>
            </template>

            <text
                v-else
                :x="width / 2"
                :y="height / 2"
                text-anchor="middle"
                class="fill-muted-foreground text-xs"
            >
                Grafik belum tersedia
            </text>
        </svg>

        <div class="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span class="flex items-center gap-1">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Pemakaian aktual
            </span>
            <span class="flex items-center gap-1">
                <span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span> Proyeksi bulan depan
            </span>
        </div>
    </div>
</template>
