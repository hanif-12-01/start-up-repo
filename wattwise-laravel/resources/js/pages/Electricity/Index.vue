<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import { Zap, ArrowLeft, ArrowRight, Calendar, HelpCircle, AlertTriangle, Info, PlusCircle, FileText, Coins } from '@lucide/vue';
import { computed } from 'vue';

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
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Catat Listrik',
                href: '/electricity',
            },
        ],
    },
});



const form = useForm({
    business_id: props.activeBusinessId || '',
    period_month: '',
    usage_kwh: null as number | null,
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
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatKWh = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') {
return '- kWh';
}

    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kWh';
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
                'notes'
            );
        },
    });
};

const isLimitReached = computed(() => props.electricityLimit != null && props.entries.length >= props.electricityLimit);

// Computed summary fields derived from entries
const sortedEntries = computed(() => {
    if (!props.entries) {
return [];
}

    return [...props.entries].sort((a, b) => b.period_month.localeCompare(a.period_month));
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
    <Head title="Catat Data Listrik" />

    <div class="flex flex-1 flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
            <div class="flex flex-col gap-2">
                <Link href="/dashboard" class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1">
                    <ArrowLeft class="h-3.5 w-3.5" />
                    Kembali ke Beranda
                </Link>
                <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Zap class="h-8 w-8 text-emerald-500" /> Catat Listrik
                    </h1>
                    <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        Estimasi Simulatif
                    </span>
                </div>
                <p class="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                    Catat pemakaian listrik bulanan Anda untuk memantau performa energi usaha properti secara teratur.
                </p>
            </div>

            <!-- Business Switcher -->
            <div v-if="businesses.length > 0" class="flex flex-col gap-2 min-w-[240px] bg-card p-3 rounded-xl border border-border shadow-sm">
                <label for="business-select" class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Properti / Usaha</label>
                <select
                    id="business-select"
                    :value="activeBusinessId"
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all cursor-pointer"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Summary Cards -->
        <div v-if="businesses.length > 0 && entries.length > 0" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Prediksi Pemakaian Listrik -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prediksi pemakaian listrik</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Zap class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-extrabold text-foreground tracking-tight">
                        {{ formatKWh(latestKwh) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground font-semibold">
                        Berdasarkan data input terakhir
                    </span>
                </div>
            </div>

            <!-- Estimasi Tagihan Listrik -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimasi tagihan listrik</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Coins class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-extrabold text-foreground tracking-tight">
                        {{ formatIDR(latestCost) }}
                    </span>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded self-start mt-1">
                        Estimasi Simulatif
                    </span>
                </div>
            </div>

            <!-- Tarif Listrik -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarif listrik</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Zap class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-extrabold text-foreground tracking-tight">
                        {{ formatIDR(latestTariff) }}<span class="text-xs text-muted-foreground font-normal">/kWh</span>
                    </span>
                    <span class="text-[10px] text-muted-foreground font-semibold">
                        Tarif listrik terdaftar
                    </span>
                </div>
            </div>

            <!-- Riwayat Data -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Riwayat data</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Calendar class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-extrabold text-foreground tracking-tight">
                        {{ historyCount }} <span class="text-xs font-normal text-muted-foreground">Bulan</span>
                    </span>
                    <span class="text-[10px] text-muted-foreground font-semibold">
                        Jumlah bulan tercatat
                    </span>
                </div>
            </div>
        </div>

        <!-- Empty State if no business exists -->
        <div
            v-if="businesses.length === 0"
            class="rounded-2xl border border-dashed border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto w-full shadow-sm"
        >
            <div class="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Zap class="h-6 w-6" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Belum Ada Usaha Terdaftar</h2>
            <p class="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu sebelum dapat mencatat pemakaian listrik bulanan.
            </p>
            <Link
                href="/onboarding"
                class="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all"
            >
                Mulai Onboarding Usaha
            </Link>
        </div>

        <!-- Main Content (Logs and Form side-by-side) -->
        <div v-else class="grid gap-8 lg:grid-cols-3">
            <!-- Left 2 columns: Entries Log -->
            <div class="lg:col-span-2 flex flex-col gap-6">
                <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-border flex items-center justify-between">
                        <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
                            <FileText class="h-5 w-5 text-emerald-500" /> Riwayat Pencatatan Listrik
                        </h2>
                        <span class="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-bold">
                            {{ entries.length }} Catatan
                        </span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                                <tr>
                                    <th scope="col" class="px-6 py-4 font-bold">Bulan</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Meter (Awal / Akhir)</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Pemakaian</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Biaya Listrik</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Metode / Catatan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr v-if="entries.length === 0">
                                    <td colspan="5" class="px-6 py-12 text-center text-muted-foreground leading-relaxed">
                                        Belum ada data bulanan yang tercatat untuk usaha ini.<br>
                                        <span class="text-xs text-muted-foreground/80">Silakan gunakan form di sebelah kanan untuk menambahkan data pertama Anda.</span>
                                    </td>
                                </tr>
                                <tr
                                    v-for="entry in entries"
                                    :key="entry.id"
                                    class="hover:bg-muted/20 transition-colors"
                                >
                                    <td class="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                                        {{ formatMonth(entry.period_month) }}
                                    </td>
                                    <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        <span v-if="entry.meter_start !== null || entry.meter_end !== null">
                                            {{ entry.meter_start !== null ? entry.meter_start : '-' }} / {{ entry.meter_end !== null ? entry.meter_end : '-' }}
                                        </span>
                                        <span v-else>-</span>
                                    </td>
                                    <td class="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                                        {{ formatKWh(entry.usage_kwh) }}
                                    </td>
                                    <td class="px-6 py-4 text-foreground whitespace-nowrap">
                                        <div class="flex flex-col">
                                            <span class="font-bold">{{ formatIDR(entry.bill_amount_idr) }}</span>
                                            <span
                                                v-if="entry.bill_amount_idr && (!entry.usage_kwh || !entry.tariff_per_kwh)"
                                                class="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded self-start mt-0.5"
                                            >
                                                (Tagihan User)
                                            </span>
                                            <span
                                                v-else-if="entry.bill_amount_idr"
                                                class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded self-start mt-0.5"
                                            >
                                                Estimasi
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-muted-foreground">
                                        <div class="max-w-[200px] truncate" :title="entry.notes || ''">
                                            <span class="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-bold mr-1 inline-block">
                                                {{ entry.payment_method === 'PRABAYAR' ? 'Token' : (entry.payment_method === 'PASCABAYAR' ? 'Tagihan' : '-') }}
                                            </span>
                                            <span>{{ entry.notes || '-' }}</span>
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
                <div class="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-5">
                    <h2 class="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                        <PlusCircle class="h-5 w-5 text-emerald-500" /> Input Data Bulanan
                    </h2>

                    <!-- Limit exceeded warning banner inside form -->
                    <div v-if="isLimitReached" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div class="space-y-1">
                            <span class="font-bold">Batas Entri Listrik Tercapai (Maks. 3 Bulan)</span>
                            <p class="text-muted-foreground/90 leading-normal">
                                Paket Gratis dibatasi maksimal 3 bulan pencatatan listrik. Upgrade ke Pro untuk menyimpan seluruh riwayat Anda.
                            </p>
                            <Link href="/plans" class="inline-flex items-center gap-1 font-bold text-emerald-500 hover:underline mt-1.5">
                                Tingkatkan Paket <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>
                    </div>

                    <form @submit.prevent="submit" class="flex flex-col gap-4">
                        <!-- Business Selection Hidden -->
                        <input type="hidden" v-model="form.business_id" />

                        <!-- Bulan & Metode Pembayaran -->
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <div class="flex flex-col gap-1.5">
                                <label for="period_month" class="text-sm font-semibold text-foreground">Pilih Bulan <span class="text-red-500">*</span></label>
                                <input
                                    id="period_month"
                                    type="month"
                                    v-model="form.period_month"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                                />
                                <span v-if="form.errors.period_month" class="text-xs text-red-500 font-medium">{{ form.errors.period_month }}</span>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label for="payment_method" class="text-sm font-semibold text-foreground">Metode Pembayaran</label>
                                <select
                                    id="payment_method"
                                    v-model="form.payment_method"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                                >
                                    <option value="">Pilih Metode</option>
                                    <option value="PRABAYAR">Prabayar (Token)</option>
                                    <option value="PASCABAYAR">Pascabayar (Tagihan Bulanan)</option>
                                </select>
                                <span v-if="form.errors.payment_method" class="text-xs text-red-500 font-medium">{{ form.errors.payment_method }}</span>
                            </div>
                        </div>

                        <!-- Pemakaian kWh & Tarif per kWh -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1.5">
                                <label for="usage_kwh" class="text-sm font-semibold text-foreground">Pemakaian (kWh)</label>
                                <input
                                    id="usage_kwh"
                                    type="number"
                                    step="0.01"
                                    v-model="form.usage_kwh"
                                    placeholder="Contoh: 350.5"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                                />
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label for="tariff_per_kwh" class="text-sm font-semibold text-foreground">Tarif / kWh (Rp)</label>
                                <input
                                    id="tariff_per_kwh"
                                    type="number"
                                    step="0.01"
                                    v-model="form.tariff_per_kwh"
                                    placeholder="Contoh: 1444.70"
                                    class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                                />
                            </div>
                        </div>
                        <span v-if="form.errors.usage_kwh" class="text-xs text-red-500 font-medium">{{ form.errors.usage_kwh }}</span>
                        <span v-if="form.errors.tariff_per_kwh" class="text-xs text-red-500 font-medium">{{ form.errors.tariff_per_kwh }}</span>

                        <!-- Meter Start & End Grid -->
                        <div class="flex flex-col gap-2 border border-border bg-muted/20 p-3.5 rounded-xl">
                            <div class="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                                <Info class="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Estimasi Meter (Opsional)</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <label for="meter_start" class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meter Awal</label>
                                    <input
                                        id="meter_start"
                                        type="number"
                                        step="0.01"
                                        v-model="form.meter_start"
                                        placeholder="Awal"
                                        class="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
                                    />
                                    <span v-if="form.errors.meter_start" class="text-[10px] text-red-500 font-medium">{{ form.errors.meter_start }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label for="meter_end" class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meter Akhir</label>
                                    <input
                                        id="meter_end"
                                        type="number"
                                        step="0.01"
                                        v-model="form.meter_end"
                                        placeholder="Akhir"
                                        class="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
                                    />
                                    <span v-if="form.errors.meter_end" class="text-[10px] text-red-500 font-medium">{{ form.errors.meter_end }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Total Biaya (Rp) -->
                        <div class="flex flex-col gap-1.5">
                            <label for="bill_amount_idr" class="text-sm font-semibold text-foreground">Total Biaya Listrik (Rp)</label>
                            <input
                                id="bill_amount_idr"
                                type="number"
                                step="1"
                                v-model="form.bill_amount_idr"
                                placeholder="Contoh: 500000"
                                class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                            <span v-if="form.errors.bill_amount_idr" class="text-xs text-red-500 font-medium">{{ form.errors.bill_amount_idr }}</span>
                        </div>

                        <!-- Helper Text -->
                        <p class="text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                            <HelpCircle class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span>Masukkan data berdasarkan catatan meter, token, atau tagihan yang Anda miliki. Jika Anda mengosongkan kWh namun mengisi meter awal/akhir, sistem akan memperkirakan pemakaian kWh Anda.</span>
                        </p>

                        <!-- Catatan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="notes" class="text-sm font-semibold text-foreground">Catatan</label>
                            <textarea
                                id="notes"
                                v-model="form.notes"
                                placeholder="Tambahkan catatan jika diperlukan..."
                                rows="2"
                                class="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            ></textarea>
                            <span v-if="form.errors.notes" class="text-xs text-red-500 font-medium">{{ form.errors.notes }}</span>
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            :disabled="form.processing || isLimitReached"
                            class="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 w-full"
                        >
                            {{ form.processing ? 'Menyimpan...' : (isLimitReached ? 'Batas Limit Tercapai' : 'Simpan Data Listrik') }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Disclaimers Section -->
        <div class="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 flex flex-col md:flex-row gap-4 items-start shadow-sm mt-2">
            <div class="h-9 w-9 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                <AlertTriangle class="h-5 w-5" />
            </div>
            <div class="flex flex-col gap-2 text-xs md:text-sm leading-relaxed text-yellow-800 dark:text-yellow-350">
                <p class="font-bold text-yellow-900 dark:text-yellow-250">
                    Disclaimers &amp; Batasan Penggunaan WattWise:
                </p>
                <ul class="list-disc pl-4 flex flex-col gap-1.5 text-xs text-yellow-800/80 dark:text-yellow-400">
                    <li>Estimasi ini berdasarkan data yang Anda input dan bukan tagihan resmi PLN.</li>
                    <li>WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.</li>
                </ul>
            </div>
        </div>
    </div>
</template>
