<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import { LayoutGrid, Building2, Zap, Cpu, FileBarChart2, ArrowRight } from '@lucide/vue';
import { computed } from 'vue';

const props = defineProps<{
    userName: string;
    hasBusiness: boolean;
    businessCount: number;
    businessName?: string | null;
    businessType?: string | null;
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
        ],
    },
});

const page = usePage();
const flashSuccess = computed(() => page.props.flash?.success);

const formatBusinessType = (type?: string | null) => {
    switch(type) {
        case 'KOS_PROPERTY': return 'Kos / Properti';
        case 'FNB': return 'Warung / F&B';
        case 'LAUNDRY': return 'Laundry';
        case 'RETAIL': return 'Toko / Retail';
        case 'COLD_STORAGE': return 'Cold Storage';
        case 'OTHER': return 'Lainnya';
        default: return type || '';
    }
};
</script>

<template>
    <Head title="Beranda WattWise" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Flash Alert Success -->
        <div 
            v-if="flashSuccess" 
            class="p-4 mb-2 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-800 flex items-center justify-between"
        >
            <div class="flex items-center gap-2">
                <span>✅</span>
                <span>{{ flashSuccess }}</span>
            </div>
        </div>

        <!-- Welcome Section -->
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold tracking-tight text-foreground">
                Selamat Datang, {{ userName || 'Pengguna' }}!
            </h1>
            <p class="text-muted-foreground text-base">
                Kelola data listrik, usaha, dan estimasi biaya secara bertahap.
            </p>
        </div>

        <!-- Onboarding Notice / CTA -->
        <div 
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                    <span>⚡</span> Mulai Onboarding WattWise
                </h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    Anda belum mendaftarkan usaha atau properti sewaan. Lengkapi onboarding profil usaha Anda sekarang untuk mendapatkan analisis biaya energi listrik yang akurat.
                </p>
            </div>
            <Link 
                href="/onboarding"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm self-start md:self-auto shrink-0"
            >
                Mulai Onboarding
                <ArrowRight class="h-4 w-4" />
            </Link>
        </div>

        <!-- Active Business Details -->
        <div 
            v-else
            class="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
            <div class="flex items-center gap-3">
                <div class="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 class="h-5 w-5" />
                </div>
                <div>
                    <h3 class="font-semibold text-foreground text-base">{{ businessName }}</h3>
                    <p class="text-xs text-muted-foreground">
                        Kategori: <strong class="text-foreground/80 font-medium">{{ formatBusinessType(businessType) }}</strong>
                    </p>
                </div>
            </div>
            <div class="text-sm text-muted-foreground">
                Total terdaftar: <strong>{{ businessCount }}</strong> properti / usaha
            </div>
        </div>

        <!-- Section Title -->
        <div class="border-b border-border pb-2 mt-4">
            <h2 class="text-lg font-semibold text-foreground">Fitur & Modul Aplikasi</h2>
        </div>

        <!-- Cards Grid -->
        <div class="grid gap-6 sm:grid-cols-2">
            <!-- Profil Usaha Card -->
            <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                <div class="flex flex-col gap-3">
                    <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 class="h-5 w-5" />
                    </div>
                    <h3 class="text-lg font-semibold text-foreground">Profil Usaha</h3>
                    <p class="text-muted-foreground text-sm leading-relaxed">
                        Lengkapi jenis usaha atau properti Anda agar WattWise bisa memberi estimasi yang lebih relevan.
                    </p>
                </div>
                <div class="mt-6 flex items-center justify-between">
                    <Link href="/businesses" class="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                        Kelola Usaha
                        <ArrowRight class="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <span class="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">Aktif</span>
                </div>
            </div>

            <!-- Data Listrik Card -->
            <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card/60 p-6 shadow-sm transition-all">
                <div class="flex flex-col gap-3">
                    <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Zap class="h-5 w-5" />
                    </div>
                    <h3 class="text-lg font-semibold text-foreground/80">Data Listrik</h3>
                    <p class="text-muted-foreground/75 text-sm leading-relaxed">
                        Input pemakaian dan biaya listrik akan tersedia di tahap berikutnya.
                    </p>
                </div>
                <div class="mt-6 flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Menunggu Fondasi Stabil</span>
                    <span class="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">Segera Hadir</span>
                </div>
            </div>

            <!-- Peralatan Card -->
            <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card/60 p-6 shadow-sm transition-all">
                <div class="flex flex-col gap-3">
                    <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Cpu class="h-5 w-5" />
                    </div>
                    <h3 class="text-lg font-semibold text-foreground/80">Peralatan</h3>
                    <p class="text-muted-foreground/75 text-sm leading-relaxed">
                        Template peralatan akan disiapkan setelah fondasi aplikasi stabil.
                    </p>
                </div>
                <div class="mt-6 flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Menunggu Fondasi Stabil</span>
                    <span class="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">Segera Hadir</span>
                </div>
            </div>

            <!-- Laporan Card -->
            <div class="group relative flex flex-col justify-between rounded-xl border border-border bg-card/60 p-6 shadow-sm transition-all">
                <div class="flex flex-col gap-3">
                    <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileBarChart2 class="h-5 w-5" />
                    </div>
                    <h3 class="text-lg font-semibold text-foreground/80">Laporan</h3>
                    <p class="text-muted-foreground/75 text-sm leading-relaxed">
                        Laporan internal akan dibuat setelah data listrik tersedia.
                    </p>
                </div>
                <div class="mt-6 flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Menunggu Data Listrik</span>
                    <span class="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">Segera Hadir</span>
                </div>
            </div>
        </div>
    </div>
</template>
