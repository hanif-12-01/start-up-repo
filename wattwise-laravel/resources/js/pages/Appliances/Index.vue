<script setup lang="ts">
import { Head, Link, useForm, router } from '@inertiajs/vue3';
import { Plug, ArrowLeft, ArrowRight, HelpCircle, AlertTriangle, PlusCircle, Pencil, Trash2, Info } from '@lucide/vue';
import { ref, computed } from 'vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
}

interface ApplianceData {
    id: number;
    business_id: number;
    name: string;
    category: string | null;
    watt: string | null;
    quantity: number;
    hours_per_day: string | null;
    days_per_month: number | null;
    source: string;
    confidence: string;
    notes: string | null;
    estimated_monthly_kwh: number | null;
    ranking_reason?: string;
    estimated_monthly_cost?: number | null;
    potential_saving?: number | null;
}

const props = defineProps<{
    businesses: Business[];
    activeBusinessId: number | null;
    businessType: string | null;
    appliances: ApplianceData[];
    tariffPerKwh: number | null;
    templateSegmentLabel?: string | null;
    templatePreview?: any[];
    effectivePlan?: {
        id: string;
        label: string;
    } | null;
    applianceLimit?: number | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Peralatan',
                href: '/appliances',
            },
        ],
    },
});


// Form mode: 'add' | 'edit'
const formMode = ref<'add' | 'edit'>('add');
const editingApplianceId = ref<number | null>(null);
const showForm = ref(false);
const deleteConfirmId = ref<number | null>(null);
const showTemplateCard = ref(true);

const isLimitReached = computed(() => props.applianceLimit != null && props.appliances.length >= props.applianceLimit);

const form = useForm({
    business_id: props.activeBusinessId || '',
    name: '',
    category: '',
    watt: null as number | null,
    quantity: 1,
    hours_per_day: null as number | null,
    days_per_month: null as number | null,
    notes: '',
});

const applyTemplateForm = useForm({
    business_id: props.activeBusinessId || '',
});

if (props.activeBusinessId) {
    form.business_id = props.activeBusinessId;
    applyTemplateForm.business_id = props.activeBusinessId;
}

const applyTemplate = () => {
    applyTemplateForm.post('/appliances/apply-template', {
        preserveScroll: true,
        onSuccess: () => {
            showTemplateCard.value = false;
        },
    });
};

const skipTemplate = () => {
    showTemplateCard.value = false;
    openAddForm();
};

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/appliances', { business_id: target.value });
};

const formatIDR = (value: number | null) => {
    if (value === null || value === undefined) {
return '-';
}

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(value);
};

const formatKWh = (value: number | null) => {
    if (value === null || value === undefined) {
return '-';
}

    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kWh';
};

const estimateCost = (kwh: number | null): number | null => {
    if (kwh === null || props.tariffPerKwh === null) {
return null;
}

    return kwh * props.tariffPerKwh;
};

const openAddForm = () => {
    formMode.value = 'add';
    editingApplianceId.value = null;
    form.reset();
    form.business_id = props.activeBusinessId || '';
    form.quantity = 1;
    showForm.value = true;
};

const openEditForm = (appliance: ApplianceData) => {
    formMode.value = 'edit';
    editingApplianceId.value = appliance.id;
    form.business_id = appliance.business_id;
    form.name = appliance.name;
    form.category = appliance.category || '';
    form.watt = appliance.watt !== null ? Number(appliance.watt) : null;
    form.quantity = appliance.quantity;
    form.hours_per_day = appliance.hours_per_day !== null ? Number(appliance.hours_per_day) : null;
    form.days_per_month = appliance.days_per_month;
    form.notes = appliance.notes || '';
    showForm.value = true;
};

const cancelForm = () => {
    showForm.value = false;
    formMode.value = 'add';
    editingApplianceId.value = null;
    form.reset();
    form.business_id = props.activeBusinessId || '';
    form.quantity = 1;
};

const submitForm = () => {
    if (formMode.value === 'edit' && editingApplianceId.value) {
        form.put(`/appliances/${editingApplianceId.value}`, {
            preserveScroll: true,
            onSuccess: () => cancelForm(),
        });
    } else {
        form.post('/appliances', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('name', 'category', 'watt', 'hours_per_day', 'days_per_month', 'notes');
                form.quantity = 1;
            },
        });
    }
};

const confirmDelete = (id: number) => {
    deleteConfirmId.value = id;
};

const cancelDelete = () => {
    deleteConfirmId.value = null;
};

const executeDelete = () => {
    if (deleteConfirmId.value) {
        router.delete(`/appliances/${deleteConfirmId.value}`, {
            preserveScroll: true,
            onSuccess: () => {
                deleteConfirmId.value = null;
            },
        });
    }
};

// Sorted by highest estimated kWh for "Kandidat Alat yang Perlu Dicek"
const topCandidates = computed(() => {
    return [...props.appliances]
        .filter(a => a.estimated_monthly_kwh !== null && a.estimated_monthly_kwh > 0)
        .sort((a, b) => {
            const diff = (b.estimated_monthly_kwh ?? 0) - (a.estimated_monthly_kwh ?? 0);

            if (diff !== 0) {
return diff;
}

            return a.name.localeCompare(b.name);
        })
        .slice(0, 5);
});

const totalEstimatedKwh = computed(() => {
    return props.appliances.reduce((sum, a) => sum + (a.estimated_monthly_kwh ?? 0), 0);
});

const totalEstimatedCost = computed(() => {
    if (props.tariffPerKwh === null) {
return null;
}

    return totalEstimatedKwh.value * props.tariffPerKwh;
});
</script>

<template>
    <Head title="Peralatan" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
                <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft class="h-4 w-4" />
                    Kembali ke Beranda
                </Link>
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Plug class="h-8 w-8 text-blue-500" /> Peralatan
                </h1>
                <p class="text-muted-foreground text-base">
                    Catat alat yang memakai listrik agar WattWise bisa membantu memperkirakan kontribusi biaya.
                </p>
            </div>

            <!-- Business Switcher -->
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

        <!-- Empty State: No Business -->
        <div 
            v-if="businesses.length === 0"
            class="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto w-full"
        >
            <div class="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Plug class="h-6 w-6 text-blue-500" />
            </div>
            <h2 class="text-xl font-bold text-foreground">Belum Ada Usaha Terdaftar</h2>
            <p class="text-muted-foreground text-sm max-w-sm">
                Anda perlu melengkapi onboarding profil usaha terlebih dahulu sebelum dapat mengelola peralatan listrik.
            </p>
            <Link 
                href="/onboarding"
                class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
                Mulai Onboarding Usaha
            </Link>
        </div>

        <!-- Main Content -->
        <div v-else class="flex flex-col gap-6">
            <!-- Template Card -->
            <div v-if="appliances.length === 0 && showTemplateCard && templatePreview && templatePreview.length > 0" class="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/10 dark:bg-blue-950/5 p-6 shadow-sm flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
                        <Plug class="h-5 w-5 text-blue-500" /> Gunakan Template Peralatan
                    </h2>
                    <p class="text-sm text-muted-foreground">
                        Kami menyiapkan daftar alat umum untuk jenis usaha/properti Anda. Anda bisa hapus, tambah, atau ubah dayanya nanti.
                    </p>
                </div>

                <div class="border border-border bg-card rounded-lg p-4 flex flex-col gap-3">
                    <div class="flex items-center justify-between border-b border-border pb-2">
                        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori Usaha Terdeteksi</span>
                        <span class="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                            {{ templateSegmentLabel }}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                        <div 
                            v-for="item in templatePreview" 
                            :key="item.key"
                            class="flex items-center justify-between text-xs border border-border/40 bg-muted/20 p-2.5 rounded-md"
                        >
                            <span class="font-medium text-foreground truncate max-w-[140px]">{{ item.name }}</span>
                            <span class="text-muted-foreground truncate">
                                {{ item.default_watt !== null ? item.default_watt + 'W' : 'Custom' }} · 
                                {{ item.default_quantity }}x · 
                                {{ item.default_hours_per_day !== null ? item.default_hours_per_day + 'j' : '-' }}
                            </span>
                        </div>
                    </div>

                    <div class="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                        <Info class="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <span>Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian. Angka ini hanya estimasi awal dan bisa diubah.</span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3">
                    <Link 
                        v-if="effectivePlan?.id === 'FREE'"
                        href="/plans"
                        class="inline-flex h-10 items-center justify-center rounded-md bg-muted text-muted-foreground border border-border px-5 py-2 text-sm font-medium hover:bg-muted/95 transition-colors gap-1.5"
                    >
                        <Zap class="h-3.5 w-3.5 fill-muted-foreground text-muted-foreground" /> Gunakan Template Ini (Pro)
                    </Link>
                    <button 
                        v-else
                        @click="applyTemplate"
                        :disabled="applyTemplateForm.processing"
                        class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {{ applyTemplateForm.processing ? 'Menerapkan...' : 'Gunakan Template Ini' }}
                    </button>
                    <button 
                        @click="skipTemplate"
                        class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        Tambah Manual Saja
                    </button>
                </div>
            </div>

            <!-- Summary Cards Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Peralatan</div>
                    <div class="text-2xl font-bold text-foreground">{{ appliances.length }}</div>
                </div>
                <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimasi kWh / Bulan</div>
                    <div class="text-2xl font-bold text-foreground">{{ formatKWh(totalEstimatedKwh) }}</div>
                    <div class="text-[10px] text-muted-foreground mt-1">Estimasi Simulatif · Berdasarkan data input</div>
                </div>
                <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimasi Biaya / Bulan</div>
                    <div class="text-2xl font-bold text-foreground">
                        {{ totalEstimatedCost !== null ? formatIDR(totalEstimatedCost) : '-' }}
                    </div>
                    <div v-if="tariffPerKwh === null" class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                        Tarif belum tersedia. Isi profil listrik atau data listrik bulanan.
                    </div>
                    <div v-else class="text-[10px] text-muted-foreground mt-1">Estimasi Simulatif · Bisa diubah kapan saja</div>
                </div>
            </div>

            <!-- Kandidat Alat yang Perlu Dicek -->
            <div v-if="topCandidates.length > 0" class="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/5 p-6 shadow-sm flex flex-col gap-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3">
                    <div class="flex flex-col gap-1">
                        <h3 class="text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <AlertTriangle class="h-5 w-5 text-amber-500" />
                            Kandidat Alat yang Perlu Dicek
                        </h3>
                        <p class="text-xs text-muted-foreground">
                            Berdasarkan estimasi daya dan jam pakai, alat berikut kemungkinan memberi kontribusi biaya terbesar. Ini bukan pengukuran sensor.
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-2 shrink-0">
                        <span class="text-[10px] bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-semibold border border-amber-200/50">
                            Estimasi Simulatif
                        </span>
                        <span class="text-[10px] bg-amber-100/60 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-semibold border border-amber-200/50">
                            Perlu Verifikasi Manual
                        </span>
                    </div>
                </div>

                <div class="grid gap-3">
                    <div 
                        v-for="(candidate, index) in topCandidates" 
                        :key="candidate.id" 
                        class="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border bg-card rounded-lg gap-3 transition-colors hover:bg-muted/10"
                    >
                        <div class="flex items-center gap-3">
                            <!-- Rank badge -->
                            <div class="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-xs font-mono">
                                #{{ index + 1 }}
                            </div>
                            <div class="flex flex-col">
                                <span class="font-semibold text-foreground text-sm">{{ candidate.name }}</span>
                                <span class="text-[11px] text-muted-foreground mt-0.5">
                                    Kontribusi: <strong class="text-foreground">{{ formatKWh(candidate.estimated_monthly_kwh) }}</strong>
                                </span>
                            </div>
                        </div>

                        <div class="flex flex-col md:items-end gap-1.5">
                            <div class="flex items-center gap-2 flex-wrap">
                                <!-- Reason badge -->
                                <span class="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium">
                                    {{ candidate.ranking_reason }}
                                </span>
                                <!-- Cost estimate -->
                                <span class="text-xs font-bold text-foreground">
                                    {{ candidate.estimated_monthly_cost !== null ? formatIDR(Number(candidate.estimated_monthly_cost)) + '/bulan' : '' }}
                                </span>
                            </div>
                            <!-- Save tip or warning -->
                            <div class="text-[10px]">
                                <span v-if="tariffPerKwh === null" class="text-amber-600 dark:text-amber-400 font-medium">
                                    Estimasi biaya muncul setelah tarif rata-rata tersedia dari data listrik Anda.
                                </span>
                                <span v-else-if="candidate.potential_saving" class="text-green-600 dark:text-green-400 font-semibold">
                                    Jika dikurangi 1 jam/hari, potensi hemat sekitar {{ formatIDR(Number(candidate.potential_saving)) }}/bulan.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Appliances Table + Form -->
            <div class="grid gap-6 lg:grid-cols-3">
                <!-- Left: Appliances Table -->
                <div class="lg:col-span-2 flex flex-col gap-4">
                    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <div class="p-5 border-b border-border flex items-center justify-between">
                            <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Plug class="h-5 w-5 text-primary" /> Daftar Peralatan
                            </h2>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                                    {{ appliances.length }} Alat
                                </span>
                                <Link 
                                    v-if="isLimitReached"
                                    href="/plans"
                                    class="inline-flex items-center gap-1 rounded-md bg-muted text-muted-foreground border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted/95 transition-colors"
                                >
                                    <PlusCircle class="h-3.5 w-3.5" /> Tambah
                                </Link>
                                <button 
                                    v-else
                                    @click="openAddForm"
                                    class="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <PlusCircle class="h-3.5 w-3.5" /> Tambah
                                </button>
                            </div>
                        </div>

                        <!-- Appliance limit reached warning banner -->
                        <div v-if="isLimitReached" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-200 mx-5 my-4">
                            <AlertTriangle class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div class="space-y-1">
                                <span class="font-bold">Batas Jumlah Peralatan Tercapai (Maks. 10)</span>
                                <p class="text-muted-foreground">
                                    Paket Gratis dibatasi maksimal 10 peralatan listrik. Upgrade ke Pro untuk menambahkan peralatan tanpa batas.
                                </p>
                                <Link href="/plans" class="inline-flex items-center gap-1 font-bold text-primary hover:underline mt-1.5">
                                    Tingkatkan Paket <ArrowRight class="h-3 w-3" />
                                </Link>
                            </div>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left">
                                <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                    <tr>
                                        <th scope="col" class="px-4 py-3">Nama Alat</th>
                                        <th scope="col" class="px-4 py-3 text-right">Watt</th>
                                        <th scope="col" class="px-4 py-3 text-right">Qty</th>
                                        <th scope="col" class="px-4 py-3 text-right">Jam/Hari</th>
                                        <th scope="col" class="px-4 py-3 text-right">Hari/Bln</th>
                                        <th scope="col" class="px-4 py-3 text-right">kWh/Bln</th>
                                        <th scope="col" class="px-4 py-3 text-right">Biaya/Bln</th>
                                        <th scope="col" class="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    <tr v-if="appliances.length === 0">
                                        <td colspan="8" class="px-4 py-8 text-center text-muted-foreground">
                                            Belum ada peralatan tercatat. Tambahkan peralatan secara manual atau terapkan templat bisnis.
                                        </td>
                                    </tr>
                                    <tr 
                                        v-for="appliance in appliances" 
                                        :key="appliance.id" 
                                        class="hover:bg-muted/30 transition-colors"
                                    >
                                        <td class="px-4 py-3">
                                            <div class="font-medium text-foreground">{{ appliance.name }}</div>
                                            <div v-if="appliance.category" class="text-[10px] text-muted-foreground">{{ appliance.category }}</div>
                                            <div v-if="appliance.source === 'TEMPLATE'" class="inline-flex mt-0.5">
                                                <span class="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">Template</span>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-right text-foreground tabular-nums">
                                            {{ appliance.watt !== null ? Number(appliance.watt).toLocaleString('id-ID') + ' W' : '-' }}
                                        </td>
                                        <td class="px-4 py-3 text-right text-foreground tabular-nums">{{ appliance.quantity }}</td>
                                        <td class="px-4 py-3 text-right text-foreground tabular-nums">
                                            {{ appliance.hours_per_day !== null ? appliance.hours_per_day : '-' }}
                                        </td>
                                        <td class="px-4 py-3 text-right text-foreground tabular-nums">
                                            {{ appliance.days_per_month !== null ? appliance.days_per_month : '-' }}
                                        </td>
                                        <td class="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                                            {{ formatKWh(appliance.estimated_monthly_kwh) }}
                                        </td>
                                        <td class="px-4 py-3 text-right text-foreground tabular-nums">
                                            {{ estimateCost(appliance.estimated_monthly_kwh) !== null ? formatIDR(estimateCost(appliance.estimated_monthly_kwh)) : '-' }}
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <div class="flex items-center justify-center gap-1">
                                                <button 
                                                    @click="openEditForm(appliance)"
                                                    class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" 
                                                    title="Edit"
                                                >
                                                    <Pencil class="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    @click="confirmDelete(appliance.id)"
                                                    class="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" 
                                                    title="Hapus"
                                                >
                                                    <Trash2 class="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Right: Add/Edit Form -->
                <div class="flex flex-col gap-4">
                    <div v-if="showForm" class="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
                        <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                            <PlusCircle class="h-5 w-5 text-primary" />
                            {{ formMode === 'edit' ? 'Edit Peralatan' : 'Tambah Peralatan' }}
                        </h2>

                        <form @submit.prevent="submitForm" class="flex flex-col gap-4">
                            <input type="hidden" v-model="form.business_id" />

                            <!-- Nama Alat -->
                            <div class="flex flex-col gap-1.5">
                                <label for="name" class="text-sm font-medium text-foreground">Nama Alat <span class="text-red-500">*</span></label>
                                <input 
                                    id="name" 
                                    type="text" 
                                    v-model="form.name" 
                                    placeholder="Contoh: AC Kamar, Kulkas" 
                                    class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <span v-if="form.errors.name" class="text-xs text-red-500 font-medium">{{ form.errors.name }}</span>
                            </div>

                            <!-- Kategori -->
                            <div class="flex flex-col gap-1.5">
                                <label for="category" class="text-sm font-medium text-foreground">Kategori</label>
                                <input 
                                    id="category" 
                                    type="text" 
                                    v-model="form.category" 
                                    placeholder="Contoh: Pendingin, Dapur, Penerangan" 
                                    class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <span v-if="form.errors.category" class="text-xs text-red-500 font-medium">{{ form.errors.category }}</span>
                            </div>

                            <!-- Daya (Watt) -->
                            <div class="flex flex-col gap-1.5">
                                <label for="watt" class="text-sm font-medium text-foreground">Daya (Watt)</label>
                                <input 
                                    id="watt" 
                                    type="number" 
                                    step="0.01" 
                                    v-model="form.watt" 
                                    placeholder="Contoh: 450" 
                                    class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <span class="text-[11px] text-muted-foreground flex items-start gap-1">
                                    <HelpCircle class="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    Lihat label daya pada alat. Biasanya tertulis 250W, 800W, atau 1200W. Jika tidak tahu, pakai estimasi awal dulu.
                                </span>
                                <span v-if="form.errors.watt" class="text-xs text-red-500 font-medium">{{ form.errors.watt }}</span>
                            </div>

                            <!-- Quantity & Hours Grid -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1.5">
                                    <label for="quantity" class="text-xs font-semibold text-foreground">Jumlah <span class="text-red-500">*</span></label>
                                    <input 
                                        id="quantity" 
                                        type="number" 
                                        min="1" 
                                        v-model="form.quantity" 
                                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <span v-if="form.errors.quantity" class="text-[10px] text-red-500 font-medium">{{ form.errors.quantity }}</span>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label for="hours_per_day" class="text-xs font-semibold text-foreground">Jam / Hari</label>
                                    <input 
                                        id="hours_per_day" 
                                        type="number" 
                                        step="0.5" 
                                        min="0" 
                                        max="24" 
                                        v-model="form.hours_per_day" 
                                        placeholder="8" 
                                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <span v-if="form.errors.hours_per_day" class="text-[10px] text-red-500 font-medium">{{ form.errors.hours_per_day }}</span>
                                </div>
                            </div>

                            <!-- Hari per bulan -->
                            <div class="flex flex-col gap-1.5">
                                <label for="days_per_month" class="text-xs font-semibold text-foreground">Hari / Bulan</label>
                                <input 
                                    id="days_per_month" 
                                    type="number" 
                                    min="0" 
                                    max="31" 
                                    v-model="form.days_per_month" 
                                    placeholder="30" 
                                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <span v-if="form.errors.days_per_month" class="text-[10px] text-red-500 font-medium">{{ form.errors.days_per_month }}</span>
                            </div>

                            <!-- Catatan -->
                            <div class="flex flex-col gap-1.5">
                                <label for="notes" class="text-sm font-medium text-foreground">Catatan</label>
                                <textarea 
                                    id="notes" 
                                    v-model="form.notes" 
                                    placeholder="Catatan tambahan..." 
                                    rows="2"
                                    class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                ></textarea>
                                <span v-if="form.errors.notes" class="text-xs text-red-500 font-medium">{{ form.errors.notes }}</span>
                            </div>

                            <!-- Buttons -->
                            <div class="flex gap-2 mt-1">
                                <button 
                                    type="submit" 
                                    :disabled="form.processing"
                                    class="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {{ form.processing ? 'Menyimpan...' : (formMode === 'edit' ? 'Simpan Perubahan' : 'Tambah Peralatan') }}
                                </button>
                                <button 
                                    type="button" 
                                    @click="cancelForm"
                                    class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Quick Add Button when form is hidden -->
                    <div v-if="!showForm" class="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-6 text-center flex flex-col items-center justify-center gap-3">
                        <button 
                            @click="openAddForm"
                            class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                        >
                            <PlusCircle class="h-4 w-4" />
                            Tambah Peralatan Baru
                        </button>
                        <p class="text-xs text-muted-foreground">Bisa diubah kapan saja</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Overlay -->
        <Teleport to="body">
            <div 
                v-if="deleteConfirmId !== null" 
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="cancelDelete"
            >
                <div class="bg-card border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 flex flex-col gap-4">
                    <h3 class="text-lg font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-red-500" />
                        Hapus Peralatan?
                    </h3>
                    <p class="text-sm text-muted-foreground">
                        Peralatan ini akan dihapus dari daftar. Data estimasi terkait juga akan hilang. Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div class="flex gap-2 justify-end">
                        <button 
                            @click="cancelDelete"
                            class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            @click="executeDelete"
                            class="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                        >
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Disclaimer Section -->
        <div class="rounded-xl border border-yellow-200/50 dark:border-yellow-900/30 bg-yellow-50/50 dark:bg-yellow-950/10 p-5 flex flex-col md:flex-row gap-4 items-start shadow-sm mt-2">
            <div class="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info class="h-4 w-4" />
            </div>
            <div class="flex flex-col gap-2 text-xs md:text-sm leading-relaxed text-yellow-800 dark:text-yellow-300">
                <p class="font-medium text-yellow-900 dark:text-yellow-200">
                    Estimasi Simulatif — Berdasarkan Data Input
                </p>
                <p class="text-xs text-yellow-800/90 dark:text-yellow-400">
                    Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.
                </p>
                <ul class="list-disc pl-4 flex flex-col gap-1 text-xs text-yellow-800/80 dark:text-yellow-400/80">
                    <li>Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian.</li>
                    <li>Estimasi ini bertujuan membantu perencanaan, bukan pengganti pengukuran resmi.</li>
                </ul>
            </div>
        </div>
    </div>
</template>
