<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import { Coins, ArrowLeft, Calendar, Info, AlertTriangle, PlusCircle, FileText, Landmark } from '@lucide/vue';
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
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Catat Pendapatan',
                href: '/revenue',
            },
        ],
    },
});

const currentBusiness = computed(() => {
    return props.businesses.find(b => b.id === props.activeBusinessId) || null;
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
    if (value === null || value === undefined || value === '') return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatMonth = (dateStr: string) => {
    if (!dateStr) return '';
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
        case 'EXACT': return 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-850';
        case 'RANGE': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-850';
        case 'SKIP': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-850';
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
</script>

<template>
    <Head title="Catat Pendapatan" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
                <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft class="h-4 w-4" />
                    Kembali ke Beranda
                </Link>
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Coins class="h-8 w-8 text-green-500" /> Catat Pendapatan
                </h1>
                <p class="text-muted-foreground text-base">
                    Masukkan pendapatan bulanan agar WattWise bisa membandingkan biaya listrik dengan pemasukan.
                </p>
            </div>

            <!-- Business Switcher (if business exists) -->
            <div v-if="businesses.length > 0" class="flex flex-col gap-1.5 min-w-[200px]">
                <label for="business-select" class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Usaha / Properti</label>
                <select 
                    id="business-select" 
                    :value="activeBusinessId" 
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Empty State if no business exists -->
        <div 
            v-if="businesses.length === 0"
            class="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto w-full"
        >
            <div class="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Coins class="h-6 w-6 text-green-500" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Belum Ada Usaha Terdaftar</h2>
            <p class="text-muted-foreground text-sm max-w-sm">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu sebelum dapat mencatat pendapatan bulanan usaha Anda.
            </p>
            <Link 
                href="/onboarding"
                class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
                Mulai Onboarding Usaha
            </Link>
        </div>

        <!-- Main Content (Logs and Form side-by-side) -->
        <div v-else class="grid gap-6 lg:grid-cols-3">
            <!-- Left 2 columns: Entries Log -->
            <div class="lg:col-span-2 flex flex-col gap-6">
                <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div class="p-6 border-b border-border flex items-center justify-between">
                        <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
                            <FileText class="h-5 w-5 text-primary" /> Riwayat Pencatatan Pendapatan
                        </h2>
                        <span class="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                            {{ entries.length }} Catatan
                        </span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                <tr>
                                    <th scope="col" class="px-6 py-4">Bulan</th>
                                    <th scope="col" class="px-6 py-4">Mode Input</th>
                                    <th scope="col" class="px-6 py-4">Pendapatan</th>
                                    <th scope="col" class="px-6 py-4">Catatan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr v-if="entries.length === 0">
                                    <td colspan="4" class="px-6 py-8 text-center text-muted-foreground">
                                        Belum ada data pendapatan bulanan yang tercatat untuk usaha ini. Silakan gunakan form di sebelah kanan untuk menambahkan data.
                                    </td>
                                </tr>
                                <tr 
                                    v-for="entry in entries" 
                                    :key="entry.id" 
                                    class="hover:bg-muted/30 transition-colors"
                                >
                                    <td class="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                                        {{ formatMonth(entry.period_month) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span 
                                            class="text-xs px-2.5 py-1 rounded-full font-semibold"
                                            :class="getModeBadgeClass(entry.revenue_input_mode)"
                                        >
                                            {{ getModeLabel(entry.revenue_input_mode) }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
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
                <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                    <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <PlusCircle class="h-5 w-5 text-primary" /> Input Pendapatan
                    </h2>

                    <form @submit.prevent="submit" class="flex flex-col gap-4">
                        <!-- Business Selection Hidden -->
                        <input type="hidden" v-model="form.business_id" />

                        <!-- Bulan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="period_month" class="text-sm font-medium text-foreground">Pilih Bulan <span class="text-red-500">*</span></label>
                            <input 
                                id="period_month" 
                                type="month" 
                                v-model="form.period_month" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.period_month" class="text-xs text-red-500 font-medium">{{ form.errors.period_month }}</span>
                        </div>

                        <!-- Mode Input Pendapatan -->
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm font-medium text-foreground">Mode Input Pendapatan <span class="text-red-500">*</span></label>
                            <div class="grid grid-cols-3 gap-2">
                                <label 
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1"
                                    :class="{ 'border-primary bg-primary/5 ring-1 ring-primary': form.revenue_input_mode === 'EXACT' }"
                                >
                                    <input 
                                        type="radio" 
                                        name="revenue_input_mode" 
                                        value="EXACT" 
                                        v-model="form.revenue_input_mode" 
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-semibold text-foreground">Nominal Pas</span>
                                    <span class="text-[9px] text-muted-foreground">Isi nominal</span>
                                </label>

                                <label 
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1"
                                    :class="{ 'border-primary bg-primary/5 ring-1 ring-primary': form.revenue_input_mode === 'RANGE' }"
                                >
                                    <input 
                                        type="radio" 
                                        name="revenue_input_mode" 
                                        value="RANGE" 
                                        v-model="form.revenue_input_mode" 
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-semibold text-foreground">Estimasi</span>
                                    <span class="text-[9px] text-muted-foreground">Rentang</span>
                                </label>

                                <label 
                                    class="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer text-center gap-1"
                                    :class="{ 'border-primary bg-primary/5 ring-1 ring-primary': form.revenue_input_mode === 'SKIP' }"
                                >
                                    <input 
                                        type="radio" 
                                        name="revenue_input_mode" 
                                        value="SKIP" 
                                        v-model="form.revenue_input_mode" 
                                        class="sr-only"
                                    />
                                    <span class="text-xs font-semibold text-foreground">Lewati</span>
                                    <span class="text-[9px] text-muted-foreground">Lewati dulu</span>
                                </label>
                            </div>
                            <span v-if="form.errors.revenue_input_mode" class="text-xs text-red-500 font-medium">{{ form.errors.revenue_input_mode }}</span>
                        </div>

                        <!-- Pendapatan Bulan Ini (Rp) -->
                        <div v-if="form.revenue_input_mode !== 'SKIP'" class="flex flex-col gap-1.5">
                            <label for="revenue_amount_idr" class="text-sm font-medium text-foreground">
                                Pendapatan Bulan Ini (Rp)
                                <span v-if="form.revenue_input_mode === 'EXACT'" class="text-red-500">*</span>
                            </label>
                            <input 
                                id="revenue_amount_idr" 
                                type="number" 
                                step="1" 
                                v-model="form.revenue_amount_idr" 
                                placeholder="Contoh: 15000000" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.revenue_amount_idr" class="text-xs text-red-500 font-medium">{{ form.errors.revenue_amount_idr }}</span>
                        </div>

                        <!-- Catatan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="notes" class="text-sm font-medium text-foreground">Catatan</label>
                            <textarea 
                                id="notes" 
                                v-model="form.notes" 
                                placeholder="Tambahkan catatan jika diperlukan..." 
                                rows="2"
                                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            ></textarea>
                            <span v-if="form.errors.notes" class="text-xs text-red-500 font-medium">{{ form.errors.notes }}</span>
                        </div>

                        <!-- Submit Button -->
                        <button 
                            type="submit" 
                            :disabled="form.processing"
                            class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
                        >
                            {{ form.processing ? 'Menyimpan...' : 'Simpan Pendapatan' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Disclaimers Section -->
        <div class="rounded-xl border border-yellow-200/50 dark:border-yellow-900/30 bg-yellow-50/50 dark:bg-yellow-950/10 p-5 flex flex-col md:flex-row gap-4 items-start shadow-sm mt-4">
            <div class="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle class="h-4 w-4" />
            </div>
            <div class="flex flex-col gap-2 text-xs md:text-sm leading-relaxed text-yellow-800 dark:text-yellow-300">
                <p class="font-medium text-yellow-900 dark:text-yellow-200">
                    Pemberitahuan Terkait Perhitungan:
                </p>
                <p class="text-xs text-yellow-800/90 dark:text-yellow-400 leading-normal">
                    Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
                </p>
            </div>
        </div>
    </div>
</template>
