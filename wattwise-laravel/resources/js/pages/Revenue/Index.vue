<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import { Coins, ArrowLeft, ArrowRight, Calendar, Info, AlertTriangle, PlusCircle, FileText, Landmark } from '@lucide/vue';
import { computed, watch } from 'vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
}

interface RevenueEntry {
    id: number;
    business_id: number;
    period_month: string;
    revenue_amount_idr: string | null;
    revenue_input_mode: string;
    notes: string | null;
    created_at: string;
}

const props = defineProps<{
    businesses: Business[];
    activeBusinessId: number | null;
    entries: RevenueEntry[];
    effectivePlan?: {
        id: string;
        label: string;
    } | null;
    revenueLimit?: number | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Pendapatan Usaha',
                href: '/revenue',
            },
        ],
    },
});



const form = useForm({
    business_id: props.activeBusinessId || '',
    period_month: '',
    revenue_amount_idr: null as number | null,
    revenue_input_mode: 'EXACT',
    notes: '',
});

// Watch mode changes: clear amount if SKIP is selected
watch(() => form.revenue_input_mode, (newMode) => {
    if (newMode === 'SKIP') {
        form.revenue_amount_idr = null;
    }
});

// Update business_id if activeBusinessId changes
if (props.activeBusinessId) {
    form.business_id = props.activeBusinessId;
}

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/revenue', { business_id: target.value });
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

const formatMonth = (dateStr: string) => {
    if (!dateStr) {
return '';
}

    const date = new Date(dateStr);

    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
};

const getModeLabel = (mode: string) => {
    switch (mode) {
        case 'EXACT': return 'Isi nominal';
        case 'RANGE': return 'Perkiraan rentang';
        case 'SKIP': return 'Lewati dulu';
        default: return mode;
    }
};

const getModeBadgeClass = (mode: string) => {
    switch (mode) {
        case 'EXACT': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        case 'RANGE': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
        case 'SKIP': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        default: return 'bg-secondary text-secondary-foreground';
    }
};

const submit = () => {
    form.post('/revenue', {
        preserveScroll: true,
        onSuccess: () => {
            form.reset('period_month', 'revenue_amount_idr', 'revenue_input_mode', 'notes');
        },
    });
};

const isLimitReached = computed(() => props.revenueLimit != null && props.entries.length >= props.revenueLimit);

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

const latestRevenue = computed(() => {
    return latestEntry.value?.revenue_amount_idr || null;
});

const historyCount = computed(() => {
    return props.entries ? props.entries.length : 0;
});
</script>

<template>
    <Head title="Pendapatan Usaha" />

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
                        <Coins class="h-8 w-8 text-emerald-500" /> Pendapatan Usaha
                    </h1>
                </div>
                <p class="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                    Masukkan pendapatan bulanan agar WattWise bisa membandingkan perkiraan biaya listrik dengan pemasukan kotor Anda.
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
            <!-- Pendapatan Terakhir -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendapatan Terakhir</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Coins class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-2xl font-extrabold text-foreground tracking-tight">
                        {{ formatIDR(latestRevenue) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground font-semibold">
                        Berdasarkan data input terakhir
                    </span>
                </div>
            </div>

            <!-- Rasio Biaya Listrik (Indikator Beranda) -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rasio Biaya Listrik</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Landmark class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-lg font-bold text-muted-foreground tracking-tight">
                        Lihat di Beranda
                    </span>
                    <span class="text-[10px] text-muted-foreground font-semibold">
                        Dihitung di Beranda Dashboard
                    </span>
                </div>
            </div>

            <!-- Sisa Pendapatan (Indikator Beranda) -->
            <div class="rounded-2xl border border-border p-6 bg-card shadow-sm flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimasi Sisa Pendapatan</span>
                    <div class="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Coins class="h-4.5 w-4.5" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-lg font-bold text-muted-foreground tracking-tight">
                        Lihat di Beranda
                    </span>
                    <span class="text-[10px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded self-start mt-1">
                        *Belum laba bersih
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
                <Coins class="h-6 w-6" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Belum Ada Usaha Terdaftar</h2>
            <p class="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu sebelum dapat mencatat pendapatan bulanan usaha Anda.
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
                            <FileText class="h-5 w-5 text-emerald-500" /> Riwayat Pencatatan Pendapatan
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
                                    <th scope="col" class="px-6 py-4 font-bold">Mode Input</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Pendapatan</th>
                                    <th scope="col" class="px-6 py-4 font-bold">Catatan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr v-if="entries.length === 0">
                                    <td colspan="4" class="px-6 py-12 text-center text-muted-foreground leading-relaxed">
                                        Belum ada data pendapatan bulanan yang tercatat untuk usaha ini.<br>
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
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span
                                            class="text-[10px] px-2.5 py-1 rounded-full font-bold inline-block"
                                            :class="getModeBadgeClass(entry.revenue_input_mode)"
                                        >
                                            {{ getModeLabel(entry.revenue_input_mode) }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                                        {{ formatIDR(entry.revenue_amount_idr) }}
                                    </td>
                                    <td class="px-6 py-4 text-muted-foreground">
                                        <div class="max-w-[250px] truncate" :title="entry.notes || ''">
                                            {{ entry.notes || '-' }}
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
                        <PlusCircle class="h-5 w-5 text-emerald-500" /> Input Pendapatan
                    </h2>

                    <!-- Limit exceeded warning banner inside form -->
                    <div v-if="isLimitReached" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div class="space-y-1">
                            <span class="font-bold">Batas Entri Pendapatan Tercapai (Maks. 3 Bulan)</span>
                            <p class="text-muted-foreground/90 leading-normal">
                                Paket Gratis dibatasi maksimal 3 bulan pencatatan pendapatan. Upgrade ke Pro untuk menyimpan seluruh riwayat Anda.
                            </p>
                            <Link href="/plans" class="inline-flex items-center gap-1 font-bold text-emerald-500 hover:underline mt-1.5">
                                Tingkatkan Paket <ArrowRight class="h-3 w-3" />
                            </Link>
                        </div>
                    </div>

                    <form @submit.prevent="submit" class="flex flex-col gap-4">
                        <!-- Business Selection Hidden -->
                        <input type="hidden" v-model="form.business_id" />

                        <!-- Bulan -->
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

                        <!-- Mode Input Pendapatan -->
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm font-semibold text-foreground">Mode Input Pendapatan <span class="text-red-500">*</span></label>
                            <div class="grid grid-cols-3 gap-2">
                                <label
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1 transition-all"
                                    :class="{ 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/50': form.revenue_input_mode === 'EXACT' }"
                                >
                                    <input
                                        type="radio"
                                        name="revenue_input_mode"
                                        value="EXACT"
                                        v-model="form.revenue_input_mode"
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-bold text-foreground">Nominal Pas</span>
                                    <span class="text-[9px] text-muted-foreground">Isi nominal</span>
                                </label>

                                <label
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1 transition-all"
                                    :class="{ 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/50': form.revenue_input_mode === 'RANGE' }"
                                >
                                    <input
                                        type="radio"
                                        name="revenue_input_mode"
                                        value="RANGE"
                                        v-model="form.revenue_input_mode"
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-bold text-foreground">Estimasi</span>
                                    <span class="text-[9px] text-muted-foreground">Rentang</span>
                                </label>

                                <label
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1 transition-all"
                                    :class="{ 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/50': form.revenue_input_mode === 'SKIP' }"
                                >
                                    <input
                                        type="radio"
                                        name="revenue_input_mode"
                                        value="SKIP"
                                        v-model="form.revenue_input_mode"
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-bold text-foreground">Lewati</span>
                                    <span class="text-[9px] text-muted-foreground">Lewati dulu</span>
                                </label>
                            </div>
                            <span v-if="form.errors.revenue_input_mode" class="text-xs text-red-500 font-medium">{{ form.errors.revenue_input_mode }}</span>
                        </div>

                        <!-- Pendapatan Bulan Ini (Rp) -->
                        <div v-if="form.revenue_input_mode !== 'SKIP'" class="flex flex-col gap-1.5">
                            <label for="revenue_amount_idr" class="text-sm font-semibold text-foreground">
                                Pendapatan Bulan Ini (Rp)
                                <span v-if="form.revenue_input_mode === 'EXACT'" class="text-red-500">*</span>
                            </label>
                            <input
                                id="revenue_amount_idr"
                                type="number"
                                step="1"
                                v-model="form.revenue_amount_idr"
                                placeholder="Contoh: 15000000"
                                class="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                            <span v-if="form.errors.revenue_amount_idr" class="text-xs text-red-500 font-medium">{{ form.errors.revenue_amount_idr }}</span>
                        </div>

                        <!-- Helper Text -->
                        <p class="text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                            <Info class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span>Gunakan angka pendapatan bulanan sebelum dikurangi biaya operasional lain.</span>
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
                            {{ form.processing ? 'Menyimpan...' : (isLimitReached ? 'Batas Limit Tercapai' : 'Simpan Pendapatan') }}
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
                    Pemberitahuan Terkait Perhitungan:
                </p>
                <p class="text-xs text-yellow-800/80 dark:text-yellow-400 leading-normal">
                    Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
                </p>
            </div>
        </div>
    </div>
</template>
