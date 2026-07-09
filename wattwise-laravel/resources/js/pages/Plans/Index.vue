<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { 
    Check, 
    X, 
    Zap, 
    Shield, 
    Building2, 
    Users, 
    Sparkles, 
    ArrowRight, 
    HelpCircle,
    Info,
    Calendar,
    CreditCard
} from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlanDetail {
    id: string;
    label: string;
    trial_ends_at: string | null;
    is_trial: boolean;
    is_expired: boolean;
}

interface UsageMetric {
    current: number;
    limit: number | null;
}

const props = defineProps<{
    effectivePlan: PlanDetail;
    usage: {
        electricity_entries: UsageMetric;
        revenue_entries: UsageMetric;
        appliances: UsageMetric;
        businesses: UsageMetric;
    };
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Beranda',
                href: '/dashboard',
            },
            {
                title: 'Paket & Langganan',
                href: '/plans',
            },
        ],
    },
});

const isProcessing = ref(false);

const activateTrial = () => {
    isProcessing.value = true;
    router.post('/plans/trial', {}, {
        onFinish: () => {
            isProcessing.value = false;
        }
    });
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Plan options metadata
const planCards = [
    {
        id: 'FREE',
        name: 'Gratis',
        price: 'Rp 0',
        period: 'selamanya',
        description: 'Untuk usaha mikro yang baru memulai pelacakan pengeluaran listrik.',
        features: [
            'Pencatatan listrik bulanan (maks. 3 bulan)',
            'Pencatatan pendapatan bulanan (maks. 3 bulan)',
            'Maksimal 10 peralatan listrik',
            '3 rekomendasi hemat energi teratas',
            'Laporan bulanan bulan berjalan saja',
            '1 profil usaha aktif',
        ],
        notIncluded: [
            'Template peralatan instan',
            'Akses laporan historis lengkap',
            'Ekspor laporan PDF',
            'Multi-bisnis/cabang',
        ],
        buttonText: 'Paket Saat Ini',
        buttonVariant: 'outline' as const,
        popular: false
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: 'Rp 49.000',
        period: 'bulan',
        description: 'Ideal untuk pemilik kos dan UMKM padat energi yang butuh wawasan mendalam.',
        features: [
            'Pencatatan listrik & pendapatan tanpa batas',
            'Peralatan listrik tanpa batas',
            'Akses semua rekomendasi hemat energi',
            'Akses laporan bulanan lengkap & historis',
            'Template peralatan satu klik',
            'Analisis rasio & sisa pendapatan lengkap',
        ],
        notIncluded: [
            'Multi-bisnis/cabang',
            'Kolaborasi tim (multi-user)',
        ],
        buttonText: 'Mulai Pro Trial 30 Hari',
        buttonVariant: 'default' as const,
        popular: true
    },
    {
        id: 'BUSINESS',
        name: 'Business',
        price: 'Rp 149.000',
        period: 'bulan',
        description: 'Untuk bisnis dengan banyak cabang, kos multi-lokasi, atau manajemen tim.',
        features: [
            'Semua fitur paket Pro',
            'Kelola hingga 5 cabang / properti',
            'Akses kolaborasi tim (hingga 5 pengguna)',
            'Konsolidasi laporan antar cabang',
            'Prioritas dukungan teknis',
        ],
        notIncluded: [
            'Integrasi API kustom',
        ],
        buttonText: 'Hubungi Sales',
        buttonVariant: 'outline' as const,
        popular: false
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise / Custom',
        price: 'Kustom',
        period: 'hubungi kami',
        description: 'Untuk portofolio properti skala besar dan kebutuhan integrasi khusus.',
        features: [
            'Semua fitur paket Business',
            'Lokasi & cabang tanpa batas',
            'Anggota tim tanpa batas',
            'Onboarding khusus & dukungan prioritas',
            'Keamanan & SLA korporat',
        ],
        notIncluded: [],
        buttonText: 'Diskusi Kebutuhan',
        buttonVariant: 'outline' as const,
        popular: false
    }
];

const matrixFeatures = [
    {
        category: 'Batas & Kuota',
        items: [
            { name: 'Maks. Peralatan Listrik', free: '10 Unit', pro: 'Tanpa Batas', business: 'Tanpa Batas', enterprise: 'Tanpa Batas' },
            { name: 'Maks. Riwayat Input', free: '3 Bulan', pro: 'Tanpa Batas', business: 'Tanpa Batas', enterprise: 'Tanpa Batas' },
            { name: 'Jumlah Profil Usaha', free: '1 Bisnis', pro: '1 Bisnis', business: 'Maks. 5 Bisnis', enterprise: 'Tanpa Batas' },
            { name: 'Anggota Tim (Kolaborator)', free: 'Hanya 1', pro: 'Hanya 1', business: 'Maks. 5 User', enterprise: 'Tanpa Batas' },
        ]
    },
    {
        category: 'Analisis & Fitur Utama',
        items: [
            { name: 'Dashboard & Rasio Biaya', free: true, pro: true, business: true, enterprise: true },
            { name: 'Rekomendasi Hemat Energi', free: 'Terbatas (Top 3)', pro: 'Akses Penuh', business: 'Akses Penuh', enterprise: 'Akses Penuh' },
            { name: 'Template Peralatan Instan', free: false, pro: true, business: true, enterprise: true },
            { name: 'Laporan Bulanan', free: 'Bulan Terkini saja', pro: 'Akses Semua Riwayat', business: 'Akses Semua Riwayat', enterprise: 'Akses Semua Riwayat' },
            { name: 'Ekspor Laporan PDF', free: 'Segera Hadir', pro: 'Segera Hadir', business: 'Segera Hadir', enterprise: 'Segera Hadir' },
        ]
    }
];
</script>

<template>
    <Head title="Paket & Langganan" />

    <div class="space-y-8 p-6 max-w-7xl mx-auto">
        <!-- Header Section -->
        <div class="flex flex-col gap-2 text-center md:text-left">
            <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center md:justify-start gap-2">
                <CreditCard class="h-8 w-8 text-primary" /> Paket & Langganan
            </h1>
            <p class="text-muted-foreground max-w-2xl">
                WattWise AI SaaS dikembangkan untuk membantu Anda mengendalikan pemborosan energi. Semua harga dan paket saat ini dalam tahap pilot dan validasi pasar.
            </p>
        </div>

        <!-- Current Active Plan Card -->
        <Card class="bg-gradient-to-r from-card to-muted/20 border-primary/20 overflow-hidden shadow-md">
            <CardHeader class="pb-4">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div class="space-y-1">
                        <CardDescription>Paket Aktif Saat Ini</CardDescription>
                        <CardTitle class="text-2xl font-bold text-foreground flex items-center gap-2">
                            {{ effectivePlan.label }}
                            <Badge v-if="effectivePlan.id === 'PRO_TRIAL'" variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/25 border-primary/20">
                                Uji Coba Aktif
                            </Badge>
                            <Badge v-else-if="effectivePlan.id === 'FREE'" variant="outline" class="text-muted-foreground border-muted-foreground/30">
                                Gratis
                            </Badge>
                        </CardTitle>
                    </div>
                    <div v-if="effectivePlan.id === 'FREE'" class="flex items-center gap-3">
                        <Button 
                            @click="activateTrial" 
                            :disabled="isProcessing || effectivePlan.trial_ends_at !== null"
                            class="bg-gradient-to-r from-primary to-primary/95 text-primary-foreground hover:opacity-90 shadow-md flex items-center gap-2"
                        >
                            <Zap class="h-4 w-4 fill-primary-foreground text-primary-foreground" />
                            Mulai Pro Trial 30 Hari
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div class="grid gap-6 md:grid-cols-4 border-t border-border/50 pt-4">
                    <div class="space-y-1">
                        <span class="text-xs text-muted-foreground block font-medium">Batas Alat Listrik</span>
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.appliances.current }} / {{ usage.appliances.limit !== null ? usage.appliances.limit + ' Unit' : 'Tanpa Batas' }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span class="text-xs text-muted-foreground block font-medium">Entri Listrik</span>
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.electricity_entries.current }} / {{ usage.electricity_entries.limit !== null ? usage.electricity_entries.limit + ' Bulan' : 'Tanpa Batas' }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span class="text-xs text-muted-foreground block font-medium">Entri Pendapatan</span>
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.revenue_entries.current }} / {{ usage.revenue_entries.limit !== null ? usage.revenue_entries.limit + ' Bulan' : 'Tanpa Batas' }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span class="text-xs text-muted-foreground block font-medium">Status Masa Aktif</span>
                        <span class="text-sm font-bold text-foreground">
                            <span v-if="effectivePlan.id === 'PRO_TRIAL' && effectivePlan.trial_ends_at">
                                Berakhir pada {{ formatDate(effectivePlan.trial_ends_at) }}
                            </span>
                            <span v-else-if="effectivePlan.id === 'FREE' && effectivePlan.trial_ends_at !== null" class="text-muted-foreground text-xs">
                                Masa trial telah habis. Silakan hubungi kami untuk perpanjangan Pro.
                            </span>
                            <span v-else>
                                Aktif Selamanya
                            </span>
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter v-if="effectivePlan.id === 'FREE'" class="bg-muted/10 px-6 py-3 border-t border-border/40 text-xs text-muted-foreground flex items-center gap-1.5">
                <Info class="h-3.5 w-3.5 text-primary flex-shrink-0" />
                Paket Gratis tetap bisa dipakai untuk input dasar dan ringkasan utama. Coba trial untuk membuka analisis premium.
            </CardFooter>
        </Card>

        <!-- Pricing Grid -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card 
                v-for="card in planCards" 
                :key="card.id"
                class="flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                :class="{
                    'border-primary shadow-md scale-100 lg:scale-[1.02]': card.popular,
                    'border-border/60': !card.popular
                }"
            >
                <div v-if="card.popular" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles class="h-3 w-3 fill-primary-foreground" /> Paling Populer
                </div>

                <CardHeader>
                    <CardTitle class="text-xl font-bold">{{ card.name }}</CardTitle>
                    <CardDescription class="min-h-[40px] text-xs mt-1.5 leading-relaxed">{{ card.description }}</CardDescription>
                </CardHeader>

                <CardContent class="flex-grow flex flex-col gap-6">
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-extrabold tracking-tight text-foreground">{{ card.price }}</span>
                        <span v-if="card.period" class="text-xs text-muted-foreground">/{{ card.period }}</span>
                    </div>

                    <!-- Features List -->
                    <div class="space-y-3.5 text-xs">
                        <div class="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Fitur Termasuk:</div>
                        <ul class="space-y-2.5">
                            <li v-for="feat in card.features" :key="feat" class="flex items-start gap-2">
                                <Check class="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span class="text-foreground/90 leading-tight">{{ feat }}</span>
                            </li>
                            <li v-for="notInc in card.notIncluded" :key="notInc" class="flex items-start gap-2 opacity-50">
                                <X class="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span class="text-muted-foreground leading-tight">{{ notInc }}</span>
                            </li>
                        </ul>
                    </div>
                </CardContent>

                <CardFooter class="pt-4 border-t border-border/40">
                    <template v-if="card.id === 'FREE'">
                        <Button 
                            variant="outline" 
                            disabled 
                            class="w-full"
                        >
                            {{ effectivePlan.id === 'FREE' ? 'Aktif' : 'Masa Aktif Selamanya' }}
                        </Button>
                    </template>
                    <template v-else-if="card.id === 'PRO'">
                        <!-- Active trial or has used trial -->
                        <Button 
                            v-if="effectivePlan.id === 'PRO_TRIAL'"
                            variant="outline"
                            disabled
                            class="w-full border-primary text-primary"
                        >
                            Uji Coba Sedang Berjalan
                        </Button>
                        <Button 
                            v-else-if="effectivePlan.trial_ends_at !== null"
                            variant="outline"
                            disabled
                            class="w-full"
                        >
                            Trial Sudah Digunakan
                        </Button>
                        <Button 
                            v-else
                            @click="activateTrial"
                            :disabled="isProcessing"
                            class="w-full bg-gradient-to-r from-primary to-primary/95 text-primary-foreground flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <Zap class="h-3.5 w-3.5 fill-primary-foreground" /> Mulai Trial
                        </Button>
                    </template>
                    <template v-else>
                        <Button 
                            variant="outline" 
                            class="w-full border-muted-foreground/30 hover:border-muted-foreground/50 text-muted-foreground"
                            disabled
                        >
                            Segera Hadir
                        </Button>
                    </template>
                </CardFooter>
            </Card>
        </div>

        <!-- Pilot Program Disclaimer Alert -->
        <div class="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3 text-xs text-yellow-800 dark:text-yellow-200">
            <Info class="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
                <span class="font-bold block">Disclaimer Validasi Tahap Awal (Pilot Program):</span>
                <p class="leading-relaxed text-muted-foreground/90">
                    Sistem paket dan integrasi trial ini dikembangkan murni untuk pengujian fitur pembatasan (gate logic) dan memvalidasi kebutuhan wawasan energi bagi para pengguna kos/UMKM. Saat ini kami tidak mengintegrasikan gateway pembayaran (seperti Stripe/Midtrans) dan tidak menarik biaya apa pun. Semua penawaran di atas adalah simulasi pilot untuk masa pengembangan.
                </p>
            </div>
        </div>

        <!-- Detailed Feature Matrix -->
        <Card class="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader class="bg-muted/10">
                <CardTitle class="text-lg font-bold flex items-center gap-2">
                    <Shield class="h-5 w-5 text-primary" /> Matriks Perbandingan Detail
                </CardTitle>
                <CardDescription class="text-xs">Bandingkan kapabilitas teknis dan kuota data untuk setiap tingkatan paket SaaS.</CardDescription>
            </CardHeader>
            <CardContent class="p-0 overflow-x-auto">
                <table class="w-full min-w-[700px] border-collapse text-xs text-left">
                    <thead>
                        <tr class="border-b border-border/60 bg-muted/20 font-semibold text-muted-foreground">
                            <th class="p-4 w-[280px]">Fitur & Kapabilitas</th>
                            <th class="p-4 text-center">Gratis</th>
                            <th class="p-4 text-center bg-primary/5 text-primary">Pro</th>
                            <th class="p-4 text-center">Business</th>
                            <th class="p-4 text-center">Enterprise</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border/50">
                        <template v-for="cat in matrixFeatures" :key="cat.category">
                            <tr class="bg-muted/10">
                                <td colspan="5" class="p-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {{ cat.category }}
                                </td>
                            </tr>
                            <tr v-for="item in cat.items" :key="item.name" class="hover:bg-muted/5">
                                <td class="p-4 font-medium text-foreground">{{ item.name }}</td>
                                <!-- FREE cell -->
                                <td class="p-4 text-center">
                                    <template v-if="typeof item.free === 'boolean'">
                                        <Check v-if="item.free" class="h-4 w-4 text-green-500 mx-auto" />
                                        <X v-else class="h-4 w-4 text-muted-foreground/35 mx-auto" />
                                    </template>
                                    <span v-else class="font-medium">{{ item.free }}</span>
                                </td>
                                <!-- PRO cell -->
                                <td class="p-4 text-center bg-primary/5">
                                    <template v-if="typeof item.pro === 'boolean'">
                                        <Check v-if="item.pro" class="h-4 w-4 text-green-500 mx-auto" />
                                        <X v-else class="h-4 w-4 text-muted-foreground/35 mx-auto" />
                                    </template>
                                    <span v-else class="font-bold text-primary">{{ item.pro }}</span>
                                </td>
                                <!-- BUSINESS cell -->
                                <td class="p-4 text-center">
                                    <template v-if="typeof item.business === 'boolean'">
                                        <Check v-if="item.business" class="h-4 w-4 text-green-500 mx-auto" />
                                        <X v-else class="h-4 w-4 text-muted-foreground/35 mx-auto" />
                                    </template>
                                    <span v-else class="font-medium">{{ item.business }}</span>
                                </td>
                                <!-- ENTERPRISE cell -->
                                <td class="p-4 text-center">
                                    <template v-if="typeof item.enterprise === 'boolean'">
                                        <Check v-if="item.enterprise" class="h-4 w-4 text-green-500 mx-auto" />
                                        <X v-else class="h-4 w-4 text-muted-foreground/35 mx-auto" />
                                    </template>
                                    <span v-else class="font-medium">{{ item.enterprise }}</span>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </CardContent>
        </Card>
    </div>
</template>
