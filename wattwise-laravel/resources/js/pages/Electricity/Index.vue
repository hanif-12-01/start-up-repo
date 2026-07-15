<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import {
    Zap,
    ArrowLeft,
    ArrowRight,
    Calendar,
    HelpCircle,
    AlertTriangle,
    Info,
    PlusCircle,
    FileText,
    Coins,
} from '@lucide/vue';
import { computed, ref, onBeforeUnmount } from 'vue';
import { preprocessImage } from '../../services/meter-ocr/imagePreprocessor';
import type { MeterOcrResult } from '../../services/meter-ocr/MeterOcrResult';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
}

interface ElectricityEntry {
    id: number;
    business_id: number;
    period_month: string;
    usage_kwh: string | null;
    bill_amount_idr: string | null;
    meter_start: string | null;
    meter_end: string | null;
    tariff_per_kwh: string | null;
    payment_method: string | null;
    notes: string | null;
    created_at: string;
}

const props = defineProps<{
    businesses: Business[];
    activeBusinessId: number | null;
    entries: ElectricityEntry[];
    effectivePlan?: {
        id: string;
        label: string;
    } | null;
    electricityLimit?: number | null;
    meterHistory?: {
        period_month: string;
        meter_end: number;
    }[] | null;
    ocrConfig?: {
        enabled: boolean;
        driver: string;
        minimum_confidence: number;
        maximum_file_size_kb: number;
        maximum_image_dimension: number;
        processing_timeout_seconds: number;
    } | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Pemakaian Listrik',
                href: '/electricity',
            },
        ],
    },
});

const form = useForm({
    business_id: props.activeBusinessId || '',
    period_month: '',
    usage_kwh: null as number | null,
    border_id: '',
    bill_amount_idr: null as number | null,
    meter_start: null as number | null,
    meter_end: null as number | null,
    tariff_per_kwh: null as number | null,
    payment_method: '',
    notes: '',
});

// Update business_id if activeBusinessId changes
if (props.activeBusinessId) {
    form.business_id = props.activeBusinessId;
}

// Previous Meter Reading Suggestion Logic by Selected Period
const priorMeterSuggestion = computed(() => {
    if (!form.period_month || !props.meterHistory || props.meterHistory.length === 0) {
        return null;
    }

    const selectedPeriod = new Date(form.period_month + '-01');
    let closestEntry: { period_month: string; meter_end: number } | null = null;
    let closestDate: Date | null = null;

    for (const entry of props.meterHistory) {
        const entryDate = new Date(entry.period_month);

        // Use only entries from strictly prior periods (P_entry < P_form)
        if (entryDate < selectedPeriod) {
            if (closestDate === null || entryDate > closestDate) {
                closestDate = entryDate;
                closestEntry = entry;
            }
        }
    }

    return closestEntry;
});

const applyPriorMeterSuggestion = () => {
    if (!priorMeterSuggestion.value) {
        return;
    }

    const val = priorMeterSuggestion.value.meter_end;

    if (form.meter_start !== null && form.meter_start !== undefined && String(form.meter_start) !== '') {
        if (!confirm(`Apakah Anda yakin ingin mengganti angka meter awal saat ini (${form.meter_start}) dengan stand bulan sebelumnya (${val})?`)) {
            return;
        }
    }

    form.meter_start = val;
};

// OCR Setup & Handlers
const ocrEnabled = computed(() => !!props.ocrConfig?.enabled);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const rotatedPreviewUrl = ref<string | null>(null);
const rotation = ref(0);
const isProcessing = ref(false);
const ocrResult = ref<MeterOcrResult | null>(null);
const ocrError = ref<string | null>(null);
const isOcrCancelled = ref(false);
const activeEngine = ref<{ terminate: () => Promise<void> } | null>(null);

// Crop Region (Percentages 0 to 100)
const cropX = ref(10);
const cropY = ref(35);
const cropW = ref(80);
const cropH = ref(30);

const updateCropX = (val: number) => {
    cropX.value = Math.max(0, Math.min(90, val));

    if (cropX.value + cropW.value > 100) {
        cropW.value = 100 - cropX.value;
    }
};

const updateCropY = (val: number) => {
    cropY.value = Math.max(0, Math.min(90, val));

    if (cropY.value + cropH.value > 100) {
        cropH.value = 100 - cropY.value;
    }
};

const updateCropW = (val: number) => {
    cropW.value = Math.max(5, Math.min(100 - cropX.value, val));
};

const updateCropH = (val: number) => {
    cropH.value = Math.max(5, Math.min(100 - cropY.value, val));
};

const resetCrop = () => {
    cropX.value = 10;
    cropY.value = 35;
    cropW.value = 80;
    cropH.value = 30;
};

// Candidates UI State
const selectedCandidateId = ref<string | null>(null);
const manualOverride = ref(false);

const resetOcr = () => {
    isOcrCancelled.value = true;
    isProcessing.value = false;

    if (activeEngine.value) {
        activeEngine.value.terminate();
        activeEngine.value = null;
    }

    selectedFile.value = null;

    if (previewUrl.value) {
        try {
            URL.revokeObjectURL(previewUrl.value);
        } catch {}

        previewUrl.value = null;
    }

    if (rotatedPreviewUrl.value) {
        try {
            URL.revokeObjectURL(rotatedPreviewUrl.value);
        } catch {}

        rotatedPreviewUrl.value = null;
    }

    rotation.value = 0;
    ocrResult.value = null;
    ocrError.value = null;
    selectedCandidateId.value = null;
    manualOverride.value = false;
    resetCrop();
};

onBeforeUnmount(() => {
    resetOcr();
});

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;

    if (!target.files || target.files.length === 0) {
        return;
    }

    const file = target.files[0];
    ocrError.value = null;
    ocrResult.value = null;
    selectedCandidateId.value = null;
    manualOverride.value = false;
    resetCrop();

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
        ocrError.value =
            'Tipe file tidak didukung. Harap pilih gambar JPEG, PNG, atau WebP.';

        return;
    }

    const maxKb = props.ocrConfig?.maximum_file_size_kb || 8192;

    if (file.size > maxKb * 1024) {
        ocrError.value = `Ukuran file terlalu besar. Maksimal adalah ${maxKb} KB.`;

        return;
    }

    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
    rotatedPreviewUrl.value = previewUrl.value;
    rotation.value = 0;
};

const rotateImage = async () => {
    if (!selectedFile.value) {
        return;
    }

    rotation.value = (rotation.value + 90) % 360;
    resetCrop();

    if (
        rotatedPreviewUrl.value &&
        rotatedPreviewUrl.value !== previewUrl.value
    ) {
        try {
            URL.revokeObjectURL(rotatedPreviewUrl.value);
        } catch {}
    }

    isProcessing.value = true;

    try {
        const { dataUrl } = await preprocessImage(selectedFile.value, {
            maxDimension: props.ocrConfig?.maximum_image_dimension || 2400,
            rotationDegrees: rotation.value,
        });
        rotatedPreviewUrl.value = dataUrl;
    } catch (err: any) {
        ocrError.value = `Gagal memutar gambar: ${err.message || err}`;
    } finally {
        isProcessing.value = false;
    }
};

const startOcr = async () => {
    if (!selectedFile.value) {
        return;
    }

    isProcessing.value = true;
    ocrError.value = null;
    ocrResult.value = null;
    isOcrCancelled.value = false;
    selectedCandidateId.value = null;
    manualOverride.value = false;

    // Dynamically import BrowserMeterOcrEngine only when starting OCR
    const { BrowserMeterOcrEngine } = await import('../../services/meter-ocr/BrowserMeterOcrEngine');

    const engine = new BrowserMeterOcrEngine(
        props.ocrConfig?.minimum_confidence || 75,
        props.ocrConfig?.processing_timeout_seconds || 30,
    );
    activeEngine.value = engine;

    try {
        const { blob } = await preprocessImage(selectedFile.value, {
            maxDimension: props.ocrConfig?.maximum_image_dimension || 2400,
            rotationDegrees: rotation.value,
            crop: {
                x: cropX.value / 100,
                y: cropY.value / 100,
                width: cropW.value / 100,
                height: cropH.value / 100,
            },
        });

        if (isOcrCancelled.value) {
            return;
        }

        const result = await engine.processImage(blob);

        if (isOcrCancelled.value) {
            return;
        }

        if (result.success) {
            ocrResult.value = result;
        } else {
            ocrError.value = result.warnings.join(' ');
        }
    } catch (err: any) {
        ocrError.value = `Gagal melakukan pembacaan meteran: ${err.message || err}`;
    } finally {
        isProcessing.value = false;
        activeEngine.value = null;
    }
};

const applyOcrReading = (reading: number) => {
    if (
        form.meter_end !== null &&
        form.meter_end !== undefined &&
        String(form.meter_end) !== ''
    ) {
        if (
            !confirm(
                `Apakah Anda yakin ingin mengganti angka meter akhir saat ini (${form.meter_end}) dengan hasil pembacaan otomatis (${reading})?`,
            )
        ) {
            return;
        }
    }

    form.meter_end = reading;
    alert(
        `Angka meter akhir diisi dengan ${reading}. Pastikan angka sesuai dengan tampilan meter sebelum menyimpan.`,
    );
};

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/electricity', { business_id: target.value });
};

const formatIDR = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') {
        return 'Rp -';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));
};

const formatKWh = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') {
        return '- kWh';
    }

    return (
        Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) +
        ' kWh'
    );
};

const formatMonth = (dateStr: string) => {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);

    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
};

const submit = () => {
    form.post('/electricity', {
        preserveScroll: true,
        onSuccess: () => {
            form.reset(
                'period_month',
                'usage_kwh',
                'bill_amount_idr',
                'meter_start',
                'meter_end',
                'tariff_per_kwh',
                'payment_method',
                'notes',
            );
        },
    });
};

const isLimitReached = computed(
    () =>
        props.electricityLimit != null &&
        props.entries.length >= props.electricityLimit,
);

// Computed summary fields derived from entries
const sortedEntries = computed(() => {
    if (!props.entries) {
        return [];
    }

    return [...props.entries].sort((a, b) =>
        b.period_month.localeCompare(a.period_month),
    );
});

const latestEntry = computed(() => {
    return sortedEntries.value[0] || null;
});

const latestKwh = computed(() => {
    return latestEntry.value?.usage_kwh || null;
});

const latestCost = computed(() => {
    return latestEntry.value?.bill_amount_idr || null;
});

const latestTariff = computed(() => {
    return latestEntry.value?.tariff_per_kwh || null;
});

const historyCount = computed(() => {
    return props.entries ? props.entries.length : 0;
});
</script>

<template>
    <Head title="Pemakaian Listrik" />

    <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6">
        <!-- Header -->
        <div
            class="flex flex-col justify-between gap-6 pb-2 md:flex-row md:items-center"
        >
            <div class="flex flex-col gap-2">
                <Link
                    href="/dashboard"
                    class="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft class="h-3.5 w-3.5" />
                    Kembali ke Beranda
                </Link>
                <div class="flex flex-wrap items-center gap-3">
                    <h1
                        class="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-foreground"
                    >
                        <Zap class="h-8 w-8 text-emerald-500" /> Pemakaian Listrik
                    </h1>
                    <span
                        class="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-500/20 ring-inset dark:text-emerald-400"
                    >
                        Estimasi Simulatif
                    </span>
                </div>
                <p
                    class="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
                >
                    Catat pemakaian listrik bulanan Anda untuk memantau performa
                    energi usaha properti secara teratur.
                </p>
            </div>

            <!-- Business Switcher -->
            <div
                v-if="businesses.length > 0"
                class="flex min-w-[240px] flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
                <label
                    for="business-select"
                    class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                    >Pilih Properti / Usaha</label
                >
                <select
                    id="business-select"
                    :value="activeBusinessId"
                    @change="switchBusiness"
                    class="flex h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Summary Cards -->
        <div
            v-if="businesses.length > 0 && entries.length > 0"
            class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
            <!-- Prediksi Pemakaian Listrik -->
            <div
                class="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
            >
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                        >Prediksi pemakaian listrik</span
                    >
                    <div
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
                    >
                        <Zap class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span
                        class="text-2xl font-extrabold tracking-tight text-foreground"
                    >
                        {{ formatKWh(latestKwh) }}
                    </span>
                    <span
                        class="text-[10px] font-semibold text-muted-foreground"
                    >
                        Berdasarkan data input terakhir
                    </span>
                </div>
            </div>

            <!-- Estimasi Tagihan Listrik -->
            <div
                class="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
            >
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                        >Estimasi tagihan listrik</span
                    >
                    <div
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
                    >
                        <Coins class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span
                        class="text-2xl font-extrabold tracking-tight text-foreground"
                    >
                        {{ formatIDR(latestCost) }}
                    </span>
                    <span
                        class="mt-1 self-start rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                    >
                        Estimasi Simulatif
                    </span>
                </div>
            </div>

            <!-- Tarif Listrik -->
            <div
                class="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
            >
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                        >Tarif listrik</span
                    >
                    <div
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
                    >
                        <Zap class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span
                        class="text-2xl font-extrabold tracking-tight text-foreground"
                    >
                        {{ formatIDR(latestTariff)
                        }}<span
                            class="text-xs font-normal text-muted-foreground"
                            >/kWh</span
                        >
                    </span>
                    <span
                        class="text-[10px] font-semibold text-muted-foreground"
                    >
                        Tarif listrik terdaftar
                    </span>
                </div>
            </div>

            <!-- Riwayat Data -->
            <div
                class="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
            >
                <div class="flex items-center justify-between">
                    <span
                        class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
                        >Riwayat data</span
                    >
                    <div
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
                    >
                        <Calendar class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span
                        class="text-2xl font-extrabold tracking-tight text-foreground"
                    >
                        {{ historyCount }}
                        <span class="text-xs font-normal text-muted-foreground"
                            >Bulan</span
                        >
                    </span>
                    <span
                        class="text-[10px] font-semibold text-muted-foreground"
                    >
                        Jumlah bulan tercatat
                    </span>
                </div>
            </div>
        </div>

        <!-- Empty State if no business exists -->
        <div
            v-if="businesses.length === 0"
            class="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm"
        >
            <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
            >
                <Zap class="h-6 w-6" />
            </div>
            <h2 class="text-xl font-bold text-foreground">
                Belum Ada Usaha Terdaftar
            </h2>
            <p class="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu
                sebelum dapat mencatat pemakaian listrik bulanan.
            </p>
            <Link
                href="/onboarding"
                class="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95"
            >
                Mulai Onboarding Usaha
            </Link>
        </div>

        <!-- Main Content (Logs and Form side-by-side) -->
        <div v-else class="grid gap-8 lg:grid-cols-3">
            <!-- Left 2 columns: Entries Log -->
            <div class="flex flex-col gap-6 lg:col-span-2">
                <div
                    class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                    <div
                        class="flex items-center justify-between border-b border-border p-6"
                    >
                        <h2
                            class="flex items-center gap-2 text-lg font-bold text-foreground"
                        >
                            <FileText class="h-5 w-5 text-emerald-500" />
                            Riwayat Pencatatan Listrik
                        </h2>
                        <span
                            class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                        >
                            {{ entries.length }} Catatan
                        </span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead
                                class="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase"
                            >
                                <tr>
                                    <th scope="col" class="px-6 py-4 font-bold">
                                        Bulan
                                    </th>
                                    <th scope="col" class="px-6 py-4 font-bold">
                                        Meter (Awal / Akhir)
                                    </th>
                                    <th scope="col" class="px-6 py-4 font-bold">
                                        Pemakaian
                                    </th>
                                    <th scope="col" class="px-6 py-4 font-bold">
                                        Biaya Listrik
                                    </th>
                                    <th scope="col" class="px-6 py-4 font-bold">
                                        Metode / Catatan
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr v-if="entries.length === 0">
                                    <td
                                        colspan="5"
                                        class="px-6 py-12 text-center leading-relaxed text-muted-foreground"
                                    >
                                        Belum ada data bulanan yang tercatat
                                        untuk usaha ini.<br />
                                        <span
                                            class="text-xs text-muted-foreground/80"
                                            >Silakan gunakan form di sebelah
                                            kanan untuk menambahkan data pertama
                                            Anda.</span
                                        >
                                    </td>
                                </tr>
                                <tr
                                    v-for="entry in entries"
                                    :key="entry.id"
                                    class="transition-colors hover:bg-muted/20"
                                >
                                    <td
                                        class="px-6 py-4 font-semibold whitespace-nowrap text-foreground"
                                    >
                                        {{ formatMonth(entry.period_month) }}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-muted-foreground"
                                    >
                                        <span
                                            v-if="
                                                entry.meter_start !== null ||
                                                entry.meter_end !== null
                                            "
                                        >
                                            {{
                                                entry.meter_start !== null
                                                    ? entry.meter_start
                                                    : '-'
                                            }}
                                            /
                                            {{
                                                entry.meter_end !== null
                                                    ? entry.meter_end
                                                    : '-'
                                            }}
                                        </span>
                                        <span v-else>-</span>
                                    </td>
                                    <td
                                        class="px-6 py-4 font-bold whitespace-nowrap text-foreground"
                                    >
                                        {{ formatKWh(entry.usage_kwh) }}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-foreground"
                                    >
                                        <div class="flex flex-col">
                                            <span class="font-bold">{{
                                                formatIDR(entry.bill_amount_idr)
                                            }}</span>
                                            <span
                                                v-if="
                                                    entry.bill_amount_idr &&
                                                    (!entry.usage_kwh ||
                                                        !entry.tariff_per_kwh)
                                                "
                                                class="mt-0.5 self-start rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                                            >
                                                (Tagihan User)
                                            </span>
                                            <span
                                                v-else-if="
                                                    entry.bill_amount_idr
                                                "
                                                class="mt-0.5 self-start rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"
                                            >
                                                Estimasi
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-muted-foreground">
                                        <div
                                            class="max-w-[200px] truncate"
                                            :title="entry.notes || ''"
                                        >
                                            <span
                                                class="mr-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground"
                                            >
                                                {{
                                                    entry.payment_method ===
                                                    'PRABAYAR'
                                                        ? 'Token'
                                                        : entry.payment_method ===
                                                            'PASCABAYAR'
                                                          ? 'Tagihan'
                                                          : '-'
                                                }}
                                            </span>
                                            <span>{{
                                                entry.notes || '-'
                                            }}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Right 1 column: Form to Add/Upsert Entry -->
            <div class="flex flex-col gap-6">
                <div
                    class="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                    <h2
                        class="flex items-center gap-2 border-b border-border pb-2.5 text-lg font-bold text-foreground"
                    >
                        <PlusCircle class="h-5 w-5 text-emerald-500" /> Input
                        Data Bulanan
                    </h2>

                    <!-- Limit exceeded warning banner inside form -->
                    <div
                        v-if="isLimitReached"
                        class="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200"
                    >
                        <AlertTriangle
                            class="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                        />
                        <div class="space-y-1">
                            <span class="font-bold"
                                >Batas Entri Listrik Tercapai (Maks. 3
                                Bulan)</span
                            >
                            <p class="leading-normal text-muted-foreground/90">
                                Paket Gratis dibatasi maksimal 3 bulan
                                pencatatan listrik. Upgrade ke Pro untuk
                                menyimpan seluruh riwayat Anda.
                            </p>
                            <Link
                                href="/plans"
                                class="mt-1.5 inline-flex items-center gap-1 font-bold text-emerald-500 hover:underline"
                            >
                                Tingkatkan Paket <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>
                    </div>

                    <form @submit.prevent="submit" class="flex flex-col gap-4">
                        <!-- Business Selection Hidden -->
                        <input type="hidden" v-model="form.business_id" />

                        <!-- Bulan & Metode Pembayaran -->
                        <div
                            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1"
                        >
                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="period_month"
                                    class="text-sm font-semibold text-foreground"
                                    >Pilih Bulan
                                    <span class="text-red-500">*</span></label
                                >
                                <input
                                    id="period_month"
                                    type="month"
                                    v-model="form.period_month"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                                />
                                <span
                                    v-if="form.errors.period_month"
                                    class="text-xs font-medium text-red-500"
                                    >{{ form.errors.period_month }}</span
                                >
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="payment_method"
                                    class="text-sm font-semibold text-foreground"
                                    >Metode Pembayaran</label
                                >
                                <select
                                    id="payment_method"
                                    v-model="form.payment_method"
                                    class="flex h-10 w-full cursor-pointer rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                                >
                                    <option value="">Pilih Metode</option>
                                    <option value="PRABAYAR">
                                        Prabayar (Token)
                                    </option>
                                    <option value="PASCABAYAR">
                                        Pascabayar (Tagihan Bulanan)
                                    </option>
                                </select>
                                <span
                                    v-if="form.errors.payment_method"
                                    class="text-xs font-medium text-red-500"
                                    >{{ form.errors.payment_method }}</span
                                >
                            </div>
                        </div>

                        <!-- Pemakaian kWh & Tarif per kWh -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="usage_kwh"
                                    class="text-sm font-semibold text-foreground"
                                    >Pemakaian (kWh)</label
                                >
                                <input
                                    id="usage_kwh"
                                    type="number"
                                    step="0.01"
                                    v-model="form.usage_kwh"
                                    placeholder="Contoh: 350.5"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                                />
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="tariff_per_kwh"
                                    class="text-sm font-semibold text-foreground"
                                    >Tarif / kWh (Rp)</label
                                >
                                <input
                                    id="tariff_per_kwh"
                                    type="number"
                                    step="0.01"
                                    v-model="form.tariff_per_kwh"
                                    placeholder="Contoh: 1444.70"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                                />
                            </div>
                        </div>
                        <span
                            v-if="form.errors.usage_kwh"
                            class="text-xs font-medium text-red-500"
                            >{{ form.errors.usage_kwh }}</span
                        >
                        <span
                            v-if="form.errors.tariff_per_kwh"
                            class="text-xs font-medium text-red-500"
                            >{{ form.errors.tariff_per_kwh }}</span
                        >

                        <!-- Baca Foto Meter (Beta) -->
                        <div
                            v-if="ocrEnabled"
                            class="flex flex-col gap-2 rounded-xl border border-border bg-emerald-500/5 p-3.5"
                        >
                            <div class="flex items-center justify-between">
                                <div
                                    class="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                                >
                                    <Zap
                                        class="h-3.5 w-3.5 shrink-0 text-emerald-500"
                                    />
                                    <span>Baca Foto Meter (Beta)</span>
                                </div>
                                <span
                                    class="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 uppercase dark:text-emerald-400"
                                >
                                    Privacy-First
                                </span>
                            </div>

                            <p
                                class="text-[10px] leading-normal text-muted-foreground"
                            >
                                Foto diproses di perangkat ini dan tidak dikirim
                                ke layanan OCR eksternal.
                            </p>

                            <!-- Select file or capture -->
                            <div v-if="!selectedFile" class="mt-1">
                                <label
                                    for="meter-photo-input"
                                    class="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-500/30 bg-background/50 p-4 transition-all hover:bg-emerald-500/5"
                                >
                                    <Zap
                                        class="mb-1 h-6 w-6 text-emerald-500"
                                    />
                                    <span
                                        class="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                        >Pilih atau Ambil Foto Meteran</span
                                    >
                                    <span
                                        class="mt-0.5 text-[9px] text-muted-foreground"
                                        >JPEG, PNG, WebP (Maks.
                                        {{
                                            props.ocrConfig
                                                ?.maximum_file_size_kb || 8192
                                        }}
                                        KB)</span
                                    >
                                </label>
                                <input
                                    id="meter-photo-input"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="environment"
                                    @change="handleFileChange"
                                    class="hidden"
                                />
                            </div>

                            <!-- Preview & Actions -->
                            <div v-else class="mt-1.5 flex flex-col gap-3">
                                <div
                                    class="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
                                >
                                    <img
                                        :src="rotatedPreviewUrl || ''"
                                        alt="Preview meter"
                                        class="max-h-full object-contain"
                                    />

                                    <!-- Crop Box Overlay -->
                                    <div
                                        v-if="selectedFile && !isProcessing && !ocrResult"
                                        class="absolute border-2 border-dashed border-emerald-400 pointer-events-none"
                                        :style="{
                                            left: cropX + '%',
                                            top: cropY + '%',
                                            width: cropW + '%',
                                            height: cropH + '%'
                                        }"
                                    >
                                        <span class="absolute top-1 left-1 bg-emerald-600/80 px-1 py-0.5 text-[8px] font-bold text-white rounded">
                                            Area OCR
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        @click="rotateImage"
                                        :disabled="isProcessing"
                                        class="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/60 p-1.5 text-xs font-semibold text-white transition-all hover:bg-black/80"
                                    >
                                        Putar 90°
                                    </button>
                                </div>

                                <!-- Crop Sliders Control -->
                                <div v-if="selectedFile && !isProcessing && !ocrResult" class="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                                    <span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Sesuaikan Area Scan OCR:</span>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="flex flex-col gap-1">
                                            <label class="text-[9px] font-semibold text-muted-foreground">Posisi Horisontal (X)</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="90"
                                                :value="cropX"
                                                @input="updateCropX(Number(($event.target as HTMLInputElement).value))"
                                                class="h-1 w-full bg-border rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                        <div class="flex flex-col gap-1">
                                            <label class="text-[9px] font-semibold text-muted-foreground">Posisi Vertikal (Y)</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="90"
                                                :value="cropY"
                                                @input="updateCropY(Number(($event.target as HTMLInputElement).value))"
                                                class="h-1 w-full bg-border rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                        <div class="flex flex-col gap-1">
                                            <label class="text-[9px] font-semibold text-muted-foreground">Lebar Area (W)</label>
                                            <input
                                                type="range"
                                                min="10"
                                                :max="100 - cropX"
                                                :value="cropW"
                                                @input="updateCropW(Number(($event.target as HTMLInputElement).value))"
                                                class="h-1 w-full bg-border rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                        <div class="flex flex-col gap-1">
                                            <label class="text-[9px] font-semibold text-muted-foreground">Tinggi Area (H)</label>
                                            <input
                                                type="range"
                                                min="10"
                                                :max="100 - cropY"
                                                :value="cropH"
                                                @input="updateCropH(Number(($event.target as HTMLInputElement).value))"
                                                class="h-1 w-full bg-border rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                    </div>
                                    <div class="flex justify-between items-center mt-1">
                                        <span class="text-[8px] text-muted-foreground">Area: X:{{ cropX }}% Y:{{ cropY }}% W:{{ cropW }}% H:{{ cropH }}%</span>
                                        <button
                                            type="button"
                                            @click="resetCrop"
                                            class="text-[9px] font-bold text-emerald-600 hover:underline"
                                        >
                                            Reset Area
                                        </button>
                                    </div>
                                </div>

                                <div class="flex gap-2">
                                    <button
                                        type="button"
                                        @click="startOcr"
                                        :disabled="isProcessing"
                                        class="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {{
                                            isProcessing
                                                ? 'Memproses...'
                                                : 'Mulai Scan Foto'
                                        }}
                                    </button>
                                    <button
                                        type="button"
                                        @click="resetOcr"
                                        :disabled="isProcessing"
                                        class="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-3 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
                                    >
                                        Batal
                                    </button>
                                </div>

                                <!-- Progress and Results -->
                                <div
                                    v-if="isProcessing"
                                    role="status"
                                    class="mt-1 flex animate-pulse items-center gap-2 text-xs text-muted-foreground"
                                >
                                    <div
                                        class="h-2 w-2 rounded-full bg-emerald-500"
                                    ></div>
                                    <span
                                        >Mengekstrak teks stand meter secara
                                        lokal...</span
                                    >
                                </div>

                                <div
                                    v-if="ocrError"
                                    role="alert"
                                    class="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs leading-normal font-medium text-red-600 dark:text-red-400"
                                >
                                    {{ ocrError }}
                                </div>

                                <div
                                    v-if="ocrResult && ocrResult.success"
                                    class="flex flex-col gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5"
                                >
                                    <div
                                        class="flex items-center justify-between border-b border-emerald-500/10 pb-1.5"
                                    >
                                        <span
                                            class="text-xs font-bold text-emerald-800 dark:text-emerald-300"
                                            >Hasil Pembacaan:</span
                                        >
                                        <span
                                            class="text-[10px] font-semibold text-emerald-600"
                                            >Keyakinan:
                                            {{ ocrResult.overallConfidence }}%</span
                                        >
                                    </div>

                                    <!-- Ambiguity Warning Banner -->
                                    <div
                                        v-if="ocrResult.ambiguous"
                                        class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] font-medium leading-relaxed text-amber-700 dark:text-amber-400"
                                    >
                                        ⚠️ Terdeteksi beberapa kemungkinan angka meteran. Silakan pilih salah satu angka di bawah ini.
                                    </div>

                                    <!-- Candidates Selection List -->
                                    <div class="flex flex-col gap-2">
                                        <span class="text-[10px] font-bold text-muted-foreground uppercase">Pilih Angka Meteran:</span>
                                        <div class="flex flex-col gap-1.5">
                                            <button
                                                v-for="c in ocrResult.candidates"
                                                :key="c.id"
                                                type="button"
                                                @click="selectedCandidateId = c.id"
                                                :class="[
                                                    'flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg border transition-all text-left w-full focus:outline-none',
                                                    selectedCandidateId === c.id
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-background hover:bg-muted border-border text-foreground'
                                                ]"
                                            >
                                                <span>{{ c.value }}</span>
                                                <span :class="selectedCandidateId === c.id ? 'text-white/80' : 'text-muted-foreground'">
                                                    Yakin: {{ c.confidence }}%
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Low Confidence Manual Override Checkbox -->
                                    <div
                                        v-if="ocrResult.overallConfidence < (props.ocrConfig?.minimum_confidence || 75)"
                                        class="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 p-2"
                                    >
                                        <input
                                            id="manual-override-checkbox"
                                            type="checkbox"
                                            v-model="manualOverride"
                                            class="mt-0.5 h-3.5 w-3.5 rounded border-input text-emerald-600 focus:ring-emerald-500/30"
                                        />
                                        <label
                                            for="manual-override-checkbox"
                                            class="text-[10px] font-medium leading-tight text-amber-800 dark:text-amber-400"
                                        >
                                            Saya ingin menggunakan angka keyakinan rendah ini secara manual (Manual Override)
                                        </label>
                                    </div>

                                    <!-- Apply Button -->
                                    <div class="flex flex-col gap-1.5 mt-1">
                                        <button
                                            type="button"
                                            :disabled="
                                                !selectedCandidateId ||
                                                (ocrResult.overallConfidence < (props.ocrConfig?.minimum_confidence || 75) && !manualOverride)
                                            "
                                            @click="
                                                applyOcrReading(
                                                    ocrResult.candidates.find(c => c.id === selectedCandidateId)!.value
                                                )
                                            "
                                            class="inline-flex h-8 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Gunakan sebagai angka meter akhir
                                        </button>
                                        <p
                                            v-if="ocrResult.overallConfidence < (props.ocrConfig?.minimum_confidence || 75) && !manualOverride"
                                            class="text-[9px] text-center text-amber-600 font-medium"
                                        >
                                            Harap beri tanda centang di atas untuk mengaktifkan override manual.
                                        </p>
                                    </div>

                                    <!-- Warnings -->
                                    <div
                                        v-if="ocrResult.warnings.length > 0"
                                        class="flex flex-col gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 border-t border-emerald-500/10 pt-2"
                                    >
                                        <span
                                            v-for="(w, idx) in ocrResult.warnings"
                                            :key="idx"
                                            class="font-medium"
                                            >• {{ w }}</span
                                        >
                                    </div>

                                    <!-- Mandatory Warnings -->
                                    <div
                                        class="flex flex-col gap-1 border-t border-emerald-500/10 pt-2 text-[9px] leading-normal text-muted-foreground/85"
                                    >
                                        <p
                                            class="font-bold text-emerald-700 dark:text-emerald-400"
                                        >
                                            Hasil pembacaan otomatis perlu
                                            diverifikasi manual.
                                        </p>
                                        <p>
                                            Pastikan angka sesuai dengan
                                            tampilan meter sebelum menyimpan.
                                        </p>
                                        <p>
                                            WattWise bukan alat ukur resmi dan
                                            hasil OCR dapat keliru.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Meter Start & End Grid -->
                        <div
                            class="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5"
                        >
                            <div
                                class="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
                            >
                                <Info
                                    class="h-3.5 w-3.5 shrink-0 text-emerald-500"
                                />
                                <span>Estimasi Meter (Opsional)</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <label
                                        for="meter_start"
                                        class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                                        >Meter Awal</label
                                    >
                                    <input
                                        id="meter_start"
                                        type="number"
                                        step="0.01"
                                        v-model="form.meter_start"
                                        placeholder="Awal"
                                        class="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                                    />
                                    <span
                                        v-if="form.errors.meter_start"
                                        class="text-[10px] font-medium text-red-500"
                                        >{{ form.errors.meter_start }}</span
                                    >
                                    <div v-if="priorMeterSuggestion" class="mt-1 flex flex-col gap-1">
                                        <p class="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                            Saran meter awal dari bulan {{ formatMonth(priorMeterSuggestion.period_month) }}: {{ priorMeterSuggestion.meter_end }}
                                        </p>
                                        <button
                                            type="button"
                                            @click="applyPriorMeterSuggestion"
                                            class="self-start text-[9px] font-bold text-emerald-600 underline hover:text-emerald-700 focus:outline-none"
                                        >
                                            Gunakan stand bulan sebelumnya
                                        </button>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label
                                        for="meter_end"
                                        class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                                        >Meter Akhir</label
                                    >
                                    <input
                                        id="meter_end"
                                        type="number"
                                        step="0.01"
                                        v-model="form.meter_end"
                                        placeholder="Akhir"
                                        class="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                                    />
                                    <span
                                        v-if="form.errors.meter_end"
                                        class="text-[10px] font-medium text-red-500"
                                        >{{ form.errors.meter_end }}</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- Total Biaya (Rp) -->
                        <div class="flex flex-col gap-1.5">
                            <label
                                for="bill_amount_idr"
                                class="text-sm font-semibold text-foreground"
                                >Total Biaya Listrik (Rp)</label
                            >
                            <input
                                id="bill_amount_idr"
                                type="number"
                                step="1"
                                v-model="form.bill_amount_idr"
                                placeholder="Contoh: 500000"
                                class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                            />
                            <span
                                v-if="form.errors.bill_amount_idr"
                                class="text-xs font-medium text-red-500"
                                >{{ form.errors.bill_amount_idr }}</span
                            >
                        </div>

                        <!-- Helper Text -->
                        <p
                            class="flex items-start gap-1 text-[11px] leading-normal text-muted-foreground"
                        >
                            <HelpCircle
                                class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            />
                            <span
                                >Masukkan data berdasarkan catatan meter, token,
                                atau tagihan yang Anda miliki. Jika Anda
                                mengosongkan kWh namun mengisi meter awal/akhir,
                                sistem akan memperkirakan pemakaian kWh
                                Anda.</span
                            >
                        </p>

                        <!-- Catatan -->
                        <div class="flex flex-col gap-1.5">
                            <label
                                for="notes"
                                class="text-sm font-semibold text-foreground"
                                >Catatan</label
                            >
                            <textarea
                                id="notes"
                                v-model="form.notes"
                                placeholder="Tambahkan catatan jika diperlukan..."
                                rows="2"
                                class="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none"
                            ></textarea>
                            <span
                                v-if="form.errors.notes"
                                class="text-xs font-medium text-red-500"
                                >{{ form.errors.notes }}</span
                            >
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            :disabled="form.processing || isLimitReached"
                            class="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {{
                                form.processing
                                    ? 'Menyimpan...'
                                    : isLimitReached
                                      ? 'Batas Limit Tercapai'
                                      : 'Simpan Data Listrik'
                            }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Disclaimers Section -->
        <div
            class="mt-2 flex flex-col items-start gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 shadow-sm md:flex-row"
        >
            <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500"
            >
                <AlertTriangle class="h-5 w-5" />
            </div>
            <div
                class="dark:text-yellow-350 flex flex-col gap-2 text-xs leading-relaxed text-yellow-800 md:text-sm"
            >
                <p class="dark:text-yellow-250 font-bold text-yellow-900">
                    Disclaimers &amp; Batasan Penggunaan WattWise:
                </p>
                <ul
                    class="flex list-disc flex-col gap-1.5 pl-4 text-xs text-yellow-800/80 dark:text-yellow-400"
                >
                    <li>
                        Estimasi ini berdasarkan data yang Anda input dan bukan
                        tagihan resmi PLN.
                    </li>
                    <li>
                        WattWise AI bukan aplikasi resmi PLN, bukan pengganti
                        PLN Mobile, dan bukan alat ukur listrik resmi.
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
