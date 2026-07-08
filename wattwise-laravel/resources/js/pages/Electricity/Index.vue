<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import { Zap, ArrowLeft, Calendar, HelpCircle, AlertTriangle, Info, PlusCircle, FileText } from '@lucide/vue';
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

const currentBusiness = computed(() => {
    return props.businesses.find(b => b.id === props.activeBusinessId) || null;
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
    if (value === null || value === undefined || value === '') return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatKWh = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kWh';
};

const formatMonth = (dateStr: string) => {
    if (!dateStr) return '';
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
</script>

<template>
    <Head title="Catat Data Listrik" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
                <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft class="h-4 w-4" />
                    Kembali ke Beranda
                </Link>
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Zap class="h-8 w-8 text-yellow-500" /> Catat Data Listrik
                </h1>
                <p class="text-muted-foreground text-base">
                    Masukkan pemakaian atau biaya listrik bulanan. Data ini menjadi dasar estimasi WattWise.
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
                <Zap class="h-6 w-6 text-yellow-500" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Belum Ada Usaha Terdaftar</h2>
            <p class="text-muted-foreground text-sm max-w-sm">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu sebelum dapat mencatat pemakaian listrik bulanan.
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
                            <FileText class="h-5 w-5 text-primary" /> Riwayat Pencatatan Listrik
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
                                    <th scope="col" class="px-6 py-4">Meter (Awal / Akhir)</th>
                                    <th scope="col" class="px-6 py-4">Pemakaian</th>
                                    <th scope="col" class="px-6 py-4">Biaya Listrik</th>
                                    <th scope="col" class="px-6 py-4">Metode / Catatan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr v-if="entries.length === 0">
                                    <td colspan="5" class="px-6 py-8 text-center text-muted-foreground">
                                        Belum ada data bulanan yang tercatat untuk usaha ini. Silakan gunakan form di sebelah kanan untuk menambahkan data.
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
                                    <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        <span v-if="entry.meter_start !== null || entry.meter_end !== null">
                                            {{ entry.meter_start !== null ? entry.meter_start : '-' }} / {{ entry.meter_end !== null ? entry.meter_end : '-' }}
                                        </span>
                                        <span v-else>-</span>
                                    </td>
                                    <td class="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                                        {{ formatKWh(entry.usage_kwh) }}
                                    </td>
                                    <td class="px-6 py-4 text-foreground whitespace-nowrap">
                                        <div class="flex flex-col">
                                            <span class="font-semibold">{{ formatIDR(entry.bill_amount_idr) }}</span>
                                            <span 
                                                v-if="entry.bill_amount_idr && (!entry.usage_kwh || !entry.tariff_per_kwh)" 
                                                class="text-[10px] text-muted-foreground"
                                            >
                                                (Tagihan User)
                                            </span>
                                            <span 
                                                v-else-if="entry.bill_amount_idr"
                                                class="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium"
                                            >
                                                Estimasi
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-muted-foreground">
                                        <div class="max-w-[200px] truncate" :title="entry.notes || ''">
                                            <span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium mr-1 inline-block">
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
                <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                    <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <PlusCircle class="h-5 w-5 text-primary" /> Input Data Bulanan
                    </h2>

                    <form @submit.prevent="submit" class="flex flex-col gap-4">
                        <!-- Business Selection Hidden (or shown if switcher doesn't handle it) -->
                        <input type="hidden" v-model="form.business_id" />

                        <!-- Bulan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="period_month" class="text-sm font-medium text-foreground">Pilih Bulan <span class="text-red-500">*</span></label>
                            <div class="relative">
                                <input 
                                    id="period_month" 
                                    type="month" 
                                    v-model="form.period_month" 
                                    class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                            <span v-if="form.errors.period_month" class="text-xs text-red-500 font-medium">{{ form.errors.period_month }}</span>
                        </div>

                        <!-- Pemakaian kWh -->
                        <div class="flex flex-col gap-1.5">
                            <label for="usage_kwh" class="text-sm font-medium text-foreground">Pemakaian Listrik (kWh)</label>
                            <input 
                                id="usage_kwh" 
                                type="number" 
                                step="0.01" 
                                v-model="form.usage_kwh" 
                                placeholder="Contoh: 350.5" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span class="text-[11px] text-muted-foreground flex items-center gap-1">
                                <HelpCircle class="h-3.5 w-3.5" /> Jika belum tahu kWh, Anda bisa isi angka meter awal dan akhir.
                            </span>
                            <span v-if="form.errors.usage_kwh" class="text-xs text-red-500 font-medium">{{ form.errors.usage_kwh }}</span>
                        </div>

                        <!-- Meter Start & End Grid -->
                        <div class="grid grid-cols-2 gap-3 border border-border/60 bg-muted/20 p-3 rounded-lg">
                            <div class="flex flex-col gap-1.5">
                                <label for="meter_start" class="text-xs font-semibold text-foreground">Meter Awal</label>
                                <input 
                                    id="meter_start" 
                                    type="number" 
                                    step="0.01" 
                                    v-model="form.meter_start" 
                                    placeholder="Awal" 
                                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <span v-if="form.errors.meter_start" class="text-[10px] text-red-500 font-medium">{{ form.errors.meter_start }}</span>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label for="meter_end" class="text-xs font-semibold text-foreground">Meter Akhir</label>
                                <input 
                                    id="meter_end" 
                                    type="number" 
                                    step="0.01" 
                                    v-model="form.meter_end" 
                                    placeholder="Akhir" 
                                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <span v-if="form.errors.meter_end" class="text-[10px] text-red-500 font-medium">{{ form.errors.meter_end }}</span>
                            </div>
                        </div>

                        <!-- Total Biaya (Rp) -->
                        <div class="flex flex-col gap-1.5">
                            <label for="bill_amount_idr" class="text-sm font-medium text-foreground">Total Biaya Listrik (Rp)</label>
                            <input 
                                id="bill_amount_idr" 
                                type="number" 
                                step="1" 
                                v-model="form.bill_amount_idr" 
                                placeholder="Contoh: 500000" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.bill_amount_idr" class="text-xs text-red-500 font-medium">{{ form.errors.bill_amount_idr }}</span>
                        </div>

                        <!-- Tarif per kWh -->
                        <div class="flex flex-col gap-1.5">
                            <label for="tariff_per_kwh" class="text-sm font-medium text-foreground">Tarif per kWh (Rp)</label>
                            <input 
                                id="tariff_per_kwh" 
                                type="number" 
                                step="0.01" 
                                v-model="form.tariff_per_kwh" 
                                placeholder="Contoh: 1444.70" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.tariff_per_kwh" class="text-xs text-red-500 font-medium">{{ form.errors.tariff_per_kwh }}</span>
                        </div>

                        <!-- Metode Pembayaran -->
                        <div class="flex flex-col gap-1.5">
                            <label for="payment_method" class="text-sm font-medium text-foreground">Metode Pembayaran</label>
                            <select 
                                id="payment_method" 
                                v-model="form.payment_method"
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">Pilih Metode</option>
                                <option value="PRABAYAR">Prabayar (Token)</option>
                                <option value="PASCABAYAR">Pascabayar (Tagihan Bulanan)</option>
                            </select>
                            <span v-if="form.errors.payment_method" class="text-xs text-red-500 font-medium">{{ form.errors.payment_method }}</span>
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
                            {{ form.processing ? 'Menyimpan...' : 'Simpan Data Listrik' }}
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
                    Disclaimers & Batasan Penggunaan WattWise:
                </p>
                <ul class="list-disc pl-4 flex flex-col gap-1.5 text-xs text-yellow-800/90 dark:text-yellow-400">
                    <li>Estimasi ini berdasarkan data yang Anda input dan bukan tagihan resmi PLN.</li>
                    <li>WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.</li>
                </ul>
            </div>
        </div>
    </div>
</template>
