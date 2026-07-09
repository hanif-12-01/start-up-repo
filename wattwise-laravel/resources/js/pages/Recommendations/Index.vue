<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Sparkles, Lightbulb, Building2, Zap, Coins, ArrowRight, AlertTriangle, HelpCircle, Info, ChevronRight, Activity } from '@lucide/vue';
import { computed } from 'vue';

interface Business {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
}

const props = defineProps<{
    hasBusiness: boolean;
    businesses: Business[];
    activeBusinessId: number | null;
    activeBusiness?: Business | null;
    recommendations: any[];
    efficiencyScore?: {
        score: number | null;
        label: string;
        status: 'GOOD' | 'WATCH' | 'CHECK' | 'INCOMPLETE';
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
        explanation: string;
    } | null;
    latestElectricityEntry?: any;
    latestRevenueEntry?: any;
    applianceCount: number;
    dataCompleteness: 'COMPLETE' | 'NO_ELECTRICITY' | 'NO_REVENUE' | 'EMPTY';
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Rekomendasi',
                href: '/recommendations',
            },
        ],
    },
});

const switchBusiness = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    router.get('/recommendations', { business_id: target.value });
};

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

const formatIDR = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return 'Rp -';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(Number(value));
};

const formatMonth = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};
</script>

<template>
    <Head title="Rekomendasi Hemat Listrik" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
                <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sparkles class="h-8 w-8 text-primary" /> Rekomendasi Hemat
                </h1>
                <p class="text-muted-foreground text-base">
                    Rekomendasi ini dibuat dari data listrik, pendapatan, dan peralatan yang Anda input.
                </p>
            </div>

            <!-- Business Switcher -->
            <div v-if="businesses.length > 0" class="flex flex-col gap-1.5 min-w-[200px]">
                <label for="business-select" class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Properti / Usaha</label>
                <select 
                    id="business-select" 
                    :value="activeBusinessId" 
                    @change="switchBusiness"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="b in businesses" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.city || '-' }})
                    </option>
                </select>
            </div>
        </div>

        <!-- Onboarding Notice / CTA if no business exists -->
        <div 
            v-if="!hasBusiness"
            class="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div class="flex flex-col gap-2 max-w-xl">
                <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                    <span>⚡</span> Mulai Onboarding WattWise
                </h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    Anda belum mendaftarkan usaha atau properti sewaan. Lengkapi onboarding profil usaha Anda sekarang untuk mendapatkan wawasan analisis hemat energi.
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

        <template v-else>
            <!-- Data Summary section -->
            <div class="grid gap-6 md:grid-cols-4">
                <div class="md:col-span-1 rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3">
                    <h3 class="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                        <Building2 class="h-4 w-4 text-primary" /> Data Usaha
                    </h3>
                    <div class="flex flex-col gap-2 text-xs">
                        <div>
                            <span class="text-muted-foreground block">Nama Bisnis:</span>
                            <span class="font-semibold text-foreground">{{ activeBusiness?.name }}</span>
                        </div>
                        <div>
                            <span class="text-muted-foreground block">Tipe Bisnis:</span>
                            <span class="font-semibold text-foreground">{{ formatBusinessType(activeBusiness?.business_type) }}</span>
                        </div>
                        <div>
                            <span class="text-muted-foreground block">Jumlah Peralatan:</span>
                            <span class="font-semibold text-foreground">{{ applianceCount }} alat terdaftar</span>
                        </div>
                        <div>
                            <span class="text-muted-foreground block">Listrik Terakhir:</span>
                            <span class="font-semibold text-foreground">
                                {{ latestElectricityEntry ? formatMonth(latestElectricityEntry.period_month) : 'Belum diisi' }}
                            </span>
                        </div>
                        <div>
                            <span class="text-muted-foreground block">Pendapatan Terakhir:</span>
                            <span class="font-semibold text-foreground">
                                {{ latestRevenueEntry ? formatMonth(latestRevenueEntry.period_month) : 'Belum diisi' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Efficiency Score Card -->
                <div class="md:col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="flex flex-col gap-3 max-w-lg">
                        <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Activity class="h-4 w-4 text-primary" /> Skor Efisiensi Listrik
                        </h3>
                        <p v-if="efficiencyScore && efficiencyScore.score !== null" class="text-sm text-foreground leading-relaxed">
                            {{ efficiencyScore.explanation }}
                        </p>
                        <p v-else class="text-sm text-muted-foreground">
                            Data tagihan listrik atau pendapatan bulan terbaru Anda belum lengkap. Silakan lakukan pencatatan untuk memunculkan skor efisiensi.
                        </p>
                        <span class="text-[11px] text-muted-foreground leading-relaxed mt-1">
                            *Skor ini adalah estimasi internal WattWise berdasarkan data input, bukan audit energi resmi.
                        </span>
                    </div>

                    <div class="flex flex-col items-center justify-center shrink-0 min-w-[160px] border-t md:border-t-0 md:border-l border-border/80 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                        <template v-if="efficiencyScore && efficiencyScore.score !== null">
                            <div class="text-5xl font-black text-foreground">
                                {{ efficiencyScore.score }}<span class="text-xl text-muted-foreground">/100</span>
                            </div>
                            <span 
                                class="mt-3 px-3 py-1 text-xs font-bold rounded-full"
                                :class="{
                                    'bg-green-500/10 text-green-500': efficiencyScore.status === 'GOOD',
                                    'bg-yellow-500/10 text-yellow-500': efficiencyScore.status === 'WATCH',
                                    'bg-red-500/10 text-red-500': efficiencyScore.status === 'CHECK'
                                }"
                            >
                                {{ efficiencyScore.label }}
                            </span>
                            <span class="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-wider font-semibold">
                                Kepercayaan: {{ efficiencyScore.confidence }}
                            </span>
                        </template>
                        <template v-else>
                            <span class="text-xl font-bold text-muted-foreground text-center">
                                Data belum cukup
                            </span>
                            <span class="text-[10px] text-center text-muted-foreground px-2 mt-1">
                                Butuh tagihan listrik & pendapatan terisi
                            </span>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Recommendation List Section -->
            <div class="flex flex-col gap-4 mt-2">
                <div class="border-b border-border pb-2 flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Lightbulb class="h-5 w-5 text-primary" /> Daftar Rekomendasi
                    </h2>
                    <span class="text-xs text-muted-foreground">
                        Ditemukan {{ recommendations.length }} rekomendasi
                    </span>
                </div>

                <!-- Recommendations list -->
                <div v-if="recommendations.length > 0" class="flex flex-col gap-4">
                    <div 
                        v-for="rec in recommendations" 
                        :key="rec.type"
                        class="rounded-xl border p-6 bg-card shadow-sm flex flex-col gap-4 transition-all hover:border-border/80 relative overflow-hidden"
                        :class="{
                            'border-l-4 border-l-red-500': rec.priority === 'HIGH' && !rec.is_locked,
                            'border-l-4 border-l-yellow-500': rec.priority === 'MEDIUM' && !rec.is_locked,
                            'border-l-4 border-l-blue-500': rec.priority === 'LOW' && !rec.is_locked,
                            'border-l-4 border-l-muted-foreground/35': rec.is_locked
                        }"
                    >
                        <!-- Lock overlay if gated -->
                        <div v-if="rec.is_locked" class="absolute inset-0 bg-background/50 backdrop-blur-[2.5px] flex flex-col items-center justify-center p-4 text-center z-10">
                            <Zap class="h-6 w-6 text-primary mb-2 fill-primary animate-pulse" />
                            <h4 class="font-bold text-xs text-foreground mb-1">Rekomendasi Hemat Tambahan Terkunci</h4>
                            <p class="text-[10px] text-muted-foreground max-w-xs mb-3">
                                Paket Gratis dibatasi hanya 3 rekomendasi teratas. Upgrade ke Pro untuk membuka semua analisis penghematan.
                            </p>
                            <Link href="/plans" class="inline-flex items-center justify-center rounded-md text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 shadow-sm">
                                Mulai Pro Trial 30 Hari
                            </Link>
                        </div>

                        <!-- Card contents (blurred if locked) -->
                        <div :class="{ 'filter blur-sm select-none pointer-events-none': rec.is_locked }" class="flex flex-col gap-4 w-full">
                            <div class="flex items-start justify-between gap-4 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <span 
                                        class="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                                        :class="{
                                            'bg-red-500/10 text-red-500': rec.priority === 'HIGH',
                                            'bg-yellow-500/10 text-yellow-500': rec.priority === 'MEDIUM',
                                            'bg-blue-500/10 text-blue-500': rec.priority === 'LOW'
                                        }"
                                    >
                                        {{ rec.priority === 'HIGH' ? 'Prioritas Tinggi' : (rec.priority === 'MEDIUM' ? 'Prioritas Sedang' : 'Prioritas Ringan') }}
                                    </span>
                                    <h3 class="font-bold text-foreground text-sm">{{ rec.title }}</h3>
                                </div>

                                <span v-if="rec.estimated_saving_idr" class="text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1 rounded-lg">
                                    Estimasi Potensi Hemat: {{ formatIDR(rec.estimated_saving_idr) }}
                                </span>
                            </div>

                            <div class="grid gap-4 md:grid-cols-3">
                                <div class="md:col-span-2 flex flex-col gap-2">
                                    <div>
                                        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Wawasan:</span>
                                        <p class="text-sm text-foreground leading-relaxed">{{ rec.description }}</p>
                                    </div>
                                    <div class="mt-1">
                                        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Dasar Analisis:</span>
                                        <p class="text-xs text-muted-foreground leading-relaxed">{{ rec.reason }}</p>
                                    </div>
                                </div>

                                <div class="rounded-lg bg-muted/40 p-4 border border-border/40 flex flex-col justify-between gap-3">
                                    <div>
                                        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tindakan Disarankan:</span>
                                        <p class="text-sm font-semibold text-foreground leading-relaxed mt-1">{{ rec.action }}</p>
                                    </div>
                                    <div class="flex items-center gap-1.5 flex-wrap mt-2">
                                        <span 
                                            v-for="badge in rec.badges" 
                                            :key="badge"
                                            class="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-semibold border border-border/60"
                                        >
                                            {{ badge }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else class="rounded-xl border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center gap-3">
                    <div class="h-12 w-12 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                        <Lightbulb class="h-6 w-6" />
                    </div>
                    <h3 class="text-base font-semibold text-foreground">Belum Ada Rekomendasi</h3>
                    <p class="text-sm text-muted-foreground max-w-md">
                        Belum ada rekomendasi. Lengkapi data listrik, pendapatan, dan peralatan agar WattWise bisa memberi saran yang lebih relevan.
                    </p>
                    <div class="flex items-center gap-3 mt-2">
                        <Link href="/electricity" class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium hover:bg-accent shadow-sm transition-colors">
                            Catat Listrik
                        </Link>
                        <Link href="/revenue" class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium hover:bg-accent shadow-sm transition-colors">
                            Catat Pendapatan
                        </Link>
                        <Link href="/appliances" class="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:bg-primary/95 shadow-sm transition-colors">
                            Kelola Peralatan
                        </Link>
                    </div>
                </div>
            </div>

            <!-- Disclaimers Section -->
            <div class="rounded-xl border border-border/80 bg-card/40 p-6 flex flex-col gap-4 shadow-sm mt-6">
                <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle class="h-4 w-4 text-muted-foreground" /> Informasi Penting & Batasan Aplikasi
                </h3>
                <div class="grid gap-3.5 text-xs leading-relaxed text-muted-foreground">
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.</span>
                    </p>
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.</span>
                    </p>
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.</span>
                    </p>
                    <p class="flex items-start gap-2">
                        <span class="text-primary shrink-0 mt-0.5">•</span>
                        <span>WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.</span>
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
