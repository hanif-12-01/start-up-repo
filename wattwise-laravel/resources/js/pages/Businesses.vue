<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { Building2, ArrowLeft, Archive, RotateCcw, AlertTriangle, CheckCircle2, Info, MapPin, Zap, Plus, Edit } from '@lucide/vue';
import { ref, computed } from 'vue';
import BusinessFormDialog from '@/components/businesses/BusinessFormDialog.vue';
import type {BusinessRow} from '@/types';

const props = defineProps<{
    activeBusinesses: BusinessRow[];
    archivedBusinesses: BusinessRow[];
    activeBusinessCount: number;
    businessLimit: number | null;
    canCreateBusiness: boolean;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Usaha & Properti',
                href: '/businesses',
            },
        ],
    },
});

const page = usePage();

const flashSuccess = computed(() => (page.props.flash as { success?: string } | undefined)?.success ?? null);
const archiveError = computed(() => (page.props.errors as Record<string, string> | undefined)?.business_archive ?? null);
const limitError = computed(() => (page.props.errors as Record<string, string> | undefined)?.business_limit ?? null);

// Archive confirmation + per-action loading state
const archiveTargetId = ref<number | null>(null);
const processingId = ref<number | null>(null);

const businessTypeLabels: Record<string, string> = {
    KOS_PROPERTY: 'Kos / Properti',
    FNB: 'Makanan & Minuman',
    LAUNDRY: 'Laundry',
    RETAIL: 'Ritel',
    COLD_STORAGE: 'Penyimpanan Dingin',
    OTHER: 'Lainnya',
};

const typeLabel = (type: string): string => businessTypeLabels[type] ?? 'Lainnya';

const planUsagePct = computed(() => {
    if (props.businessLimit === null) {
        return 100;
    }

    if (props.businessLimit <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((props.activeBusinessCount / props.businessLimit) * 100));
});

const planUsageLabel = computed(() => {
    if (props.businessLimit === null) {
        return `${props.activeBusinessCount} usaha aktif · Tanpa batas`;
    }

    return `${props.activeBusinessCount} dari ${props.businessLimit} usaha aktif`;
});

const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
        return 'Belum diisi';
    }

    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

const formatTariff = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
        return 'Belum diisi';
    }

    return 'Rp ' + Number(value).toLocaleString('id-ID', { maximumFractionDigits: 0 });
};

const locationLabel = (b: BusinessRow): string => {
    const parts = [b.city, b.province].filter((p): p is string => !!p);

    return parts.length > 0 ? parts.join(', ') : 'Belum diisi';
};

const openArchiveDialog = (id: number) => {
    archiveTargetId.value = id;
};

const cancelArchiveDialog = () => {
    if (processingId.value !== null) {
        return;
    }

    archiveTargetId.value = null;
};

const confirmArchive = () => {
    if (archiveTargetId.value === null) {
        return;
    }

    const id = archiveTargetId.value;

    router.post(`/businesses/${id}/archive`, {}, {
        preserveScroll: true,
        onStart: () => {
            processingId.value = id;
        },
        onFinish: () => {
            processingId.value = null;
            archiveTargetId.value = null;
        },
    });
};

const restoreBusiness = (id: number) => {
    router.post(`/businesses/${id}/restore`, {}, {
        preserveScroll: true,
        onStart: () => {
            processingId.value = id;
        },
        onFinish: () => {
            processingId.value = null;
        },
    });
};

const isFormDialogOpen = ref(false);
const selectedBusiness = ref<BusinessRow | null>(null);

const openCreateDialog = () => {
    selectedBusiness.value = null;
    isFormDialogOpen.value = true;
};

const openEditDialog = (business: BusinessRow) => {
    selectedBusiness.value = business;
    isFormDialogOpen.value = true;
};

const closeFormDialog = () => {
    isFormDialogOpen.value = false;
    selectedBusiness.value = null;
};
</script>

<template>
    <Head title="Usaha & Properti" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex flex-col gap-2">
                <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft class="h-4 w-4" />
                    Kembali ke Beranda
                </Link>
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Building2 class="h-8 w-8 text-primary" /> Usaha & Properti
                </h1>
                <p class="text-muted-foreground text-base">
                    Kelola profil usaha, informasi operasional, dan data kelistrikan setiap lokasi.
                </p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <button
                    v-if="canCreateBusiness"
                    type="button"
                    @click="openCreateDialog"
                    class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                    <Plus class="h-4 w-4" />
                    Tambah Usaha
                </button>
                <Link
                    v-else
                    href="/plans"
                    class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
                >
                    Lihat Paket
                </Link>
            </div>
        </div>

        <!-- Flash success -->
        <div
            v-if="flashSuccess"
            class="rounded-xl border border-green-500/20 bg-green-500/10 p-4 flex gap-3 text-sm text-green-800 dark:text-green-200"
        >
            <CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <span>{{ flashSuccess }}</span>
        </div>

        <!-- Validation error: archive (last active) -->
        <div
            v-if="archiveError"
            class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200"
        >
            <AlertTriangle class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <span>{{ archiveError }}</span>
        </div>

        <!-- Validation error: restore (plan limit) -->
        <div
            v-if="limitError"
            class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200"
        >
            <AlertTriangle class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <span>{{ limitError }}</span>
        </div>

        <!-- Plan usage summary -->
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="flex flex-col gap-1">
                    <h2 class="text-sm font-semibold text-foreground uppercase tracking-wider">Penggunaan Paket</h2>
                    <p class="text-2xl font-bold text-foreground">{{ planUsageLabel }}</p>
                </div>
                <Zap class="h-6 w-6 text-primary shrink-0" />
            </div>

            <!-- Hand-rolled progress bar -->
            <div class="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    class="h-full rounded-full bg-primary transition-all"
                    :style="{ width: planUsagePct + '%' }"
                    role="progressbar"
                    :aria-valuenow="activeBusinessCount"
                    :aria-valuemin="0"
                    :aria-valuemax="businessLimit ?? activeBusinessCount"
                    aria-label="Penggunaan kuota usaha aktif"
                ></div>
            </div>

            <!-- Limit reached info -->
            <div
                v-if="!canCreateBusiness"
                class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200"
            >
                <Info class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Batas usaha aktif untuk paket Anda telah tercapai. Arsipkan usaha yang tidak digunakan atau tingkatkan paket untuk menambahkan usaha baru.</span>
            </div>
        </div>

        <!-- Active businesses -->
        <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-foreground">Usaha Aktif</h2>

            <!-- Empty state: active -->
            <div
                v-if="activeBusinesses.length === 0"
                class="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-8 text-center flex flex-col items-center gap-3"
            >
                <div class="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 class="h-6 w-6" />
                </div>
                <p class="text-base font-semibold text-foreground">Belum ada usaha aktif.</p>
                <p class="text-sm text-muted-foreground max-w-md">
                    Pulihkan salah satu usaha yang diarsipkan agar fitur operasional WattWise AI dapat digunakan kembali.
                </p>
            </div>

            <!-- Active grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div
                    v-for="b in activeBusinesses"
                    :key="b.id"
                    class="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex flex-col gap-1 min-w-0">
                            <h3 class="text-lg font-semibold text-foreground truncate">{{ b.name }}</h3>
                            <span class="text-xs text-muted-foreground">{{ typeLabel(b.business_type) }}</span>
                        </div>
                        <span class="shrink-0 text-[11px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
                            Aktif
                        </span>
                    </div>

                    <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin class="h-4 w-4 shrink-0" />
                        <span class="truncate">{{ locationLabel(b) }}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs text-muted-foreground">Daya (VA)</span>
                            <span class="text-foreground font-medium">{{ formatNumber(b.electricity_profile?.power_va ?? null) }}</span>
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs text-muted-foreground">Tarif per kWh</span>
                            <span class="text-foreground font-medium">{{ formatTariff(b.electricity_profile?.tariff_per_kwh ?? null) }}</span>
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs text-muted-foreground">Jenis Meteran</span>
                            <span class="text-foreground font-medium">{{ b.electricity_profile?.meter_type ?? 'Belum diisi' }}</span>
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs text-muted-foreground">Hari Operasi/Bln</span>
                            <span class="text-foreground font-medium">{{ formatNumber(b.business_profile?.operating_days_per_month ?? null) }}</span>
                        </div>
                    </div>

                    <div class="flex justify-between items-center border-t border-border pt-3">
                        <button
                            type="button"
                            @click="openEditDialog(b)"
                            :disabled="processingId === b.id"
                            class="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            <Edit class="h-4 w-4" />
                            Edit
                        </button>
                        <button
                            type="button"
                            @click="openArchiveDialog(b.id)"
                            :disabled="processingId === b.id"
                            class="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            <Archive class="h-4 w-4" />
                            Arsipkan
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Archived businesses -->
        <div class="flex flex-col gap-4 mt-2">
            <div class="flex flex-col gap-1">
                <h2 class="text-xl font-semibold text-foreground">Usaha Diarsipkan</h2>
                <p class="text-sm text-muted-foreground">
                    Data historis tetap tersimpan dan dapat dipulihkan selama batas paket masih tersedia.
                </p>
            </div>

            <!-- Empty state: archived (compact) -->
            <div
                v-if="archivedBusinesses.length === 0"
                class="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
            >
                Belum ada usaha yang diarsipkan.
            </div>

            <!-- Archived grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div
                    v-for="b in archivedBusinesses"
                    :key="b.id"
                    class="rounded-xl border border-border bg-muted/20 p-5 shadow-sm flex flex-col gap-4"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex flex-col gap-1 min-w-0">
                            <h3 class="text-lg font-semibold text-foreground truncate">{{ b.name }}</h3>
                            <span class="text-xs text-muted-foreground">{{ typeLabel(b.business_type) }}</span>
                        </div>
                        <span class="shrink-0 text-[11px] font-semibold bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full">
                            Diarsipkan
                        </span>
                    </div>

                    <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin class="h-4 w-4 shrink-0" />
                        <span class="truncate">{{ locationLabel(b) }}</span>
                    </div>

                    <div class="flex justify-end border-t border-border pt-3">
                        <button
                            type="button"
                            @click="restoreBusiness(b.id)"
                            :disabled="processingId === b.id"
                            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw class="h-4 w-4" />
                            {{ processingId === b.id ? 'Memulihkan...' : 'Pulihkan' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Archive Confirmation Overlay -->
        <Teleport to="body">
            <div
                v-if="archiveTargetId !== null"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="cancelArchiveDialog"
            >
                <div class="bg-card border border-border rounded-xl p-6 shadow-xl max-w-md w-full mx-4 flex flex-col gap-4">
                    <h3 class="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Archive class="h-5 w-5 text-amber-500" />
                        Arsipkan usaha ini?
                    </h3>
                    <p class="text-sm text-muted-foreground">
                        Usaha tidak akan muncul dalam pilihan operasional, tetapi seluruh data listrik, pendapatan, peralatan, dan riwayatnya tetap tersimpan.
                    </p>
                    <div class="flex gap-2 justify-end">
                        <button
                            type="button"
                            @click="cancelArchiveDialog"
                            :disabled="processingId !== null"
                            class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            @click="confirmArchive"
                            :disabled="processingId !== null"
                            class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {{ processingId !== null ? 'Mengarsipkan...' : 'Arsipkan' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Business Form Dialog -->
        <BusinessFormDialog
            :open="isFormDialogOpen"
            :business="selectedBusiness"
            @close="closeFormDialog"
        />
    </div>
</template>
