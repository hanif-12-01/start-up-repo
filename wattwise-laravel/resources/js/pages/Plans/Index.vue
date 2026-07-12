<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3';
import {
    Check,
    X,
    Zap,
    Shield,
    Sparkles,
    Info,
    CreditCard,
    FlaskConical,
} from '@lucide/vue';
import { ref, computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

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

interface BillingPlanSummary {
    code: 'free' | 'pro' | 'business';
    name: string;
    price_amount: number;
    currency: string;
    interval: string;
}

const props = defineProps<{
    effectivePlan: PlanDetail;
    billingPlans: BillingPlanSummary[];
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

const page = usePage();
const billingEnabled = computed(
    () => page.props.billingEnabled === true,
);
const isProcessing = ref(false);

const activateTrial = () => {
    isProcessing.value = true;
    router.post(
        '/plans/trial',
        {},
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

const idempotencyKeys = ref<Record<string, string>>({});

const getOrGenerateIdempotencyKey = (planCode: string) => {
    if (!idempotencyKeys.value[planCode]) {
        const userId = page.props.auth.user?.id ?? 'guest';
        idempotencyKeys.value[planCode] =
            `${userId}-${planCode}-${Math.random().toString(36).substring(2, 15)}`;
    }

    return idempotencyKeys.value[planCode];
};

const startCheckout = (planCode: string) => {
    isProcessing.value = true;
    router.post(
        '/billing/checkout',
        {
            plan_code: planCode,
            idempotency_key: getOrGenerateIdempotencyKey(planCode),
        },
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

const cancelSubscription = () => {
    isProcessing.value = true;
    router.post(
        '/billing/cancel',
        {},
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);

    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const serverPrice = (code: BillingPlanSummary['code'], fallback: string) => {
    const plan = props.billingPlans.find((candidate) => candidate.code === code);

    if (!plan) {
        return fallback;
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: plan.currency,
        minimumFractionDigits: 0,
    }).format(plan.price_amount);
};

// Plan feature copy remains product-owned; canonical billing prices come from the server.
const planCards = computed(() => [
    {
        id: 'FREE',
        name: 'Gratis',
        price: serverPrice('free', 'Rp 0'),
        period: 'selamanya',
        description:
            'Untuk usaha mikro yang baru memulai pelacakan pengeluaran listrik.',
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
        popular: false,
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: serverPrice('pro', 'Rp 49.000'),
        period: 'bulan',
        description:
            'Ideal untuk pemilik kos dan UMKM padat energi yang butuh wawasan mendalam.',
        features: [
            'Pencatatan listrik & pendapatan tanpa batas',
            'Peralatan listrik tanpa batas',
            'Akses semua rekomendasi hemat energi',
            'Akses laporan bulanan lengkap & historis',
            'Template peralatan satu klik',
            'Analisis rasio & sisa pendapatan lengkap',
        ],
        notIncluded: ['Multi-bisnis/cabang', 'Kolaborasi tim (multi-user)'],
        buttonText: 'Mulai Pro Trial 30 Hari',
        buttonVariant: 'default' as const,
        popular: true,
    },
    {
        id: 'BUSINESS',
        name: 'Business',
        price: serverPrice('business', 'Rp 149.000'),
        period: 'bulan',
        description:
            'Untuk bisnis dengan banyak cabang, kos multi-lokasi, atau manajemen tim.',
        features: [
            'Semua fitur paket Pro',
            'Kelola hingga 5 cabang / properti',
            'Akses kolaborasi tim (hingga 5 pengguna)',
            'Konsolidasi laporan antar cabang',
            'Prioritas dukungan teknis',
        ],
        notIncluded: ['Integrasi API kustom'],
        buttonText: 'Hubungi Sales',
        buttonVariant: 'outline' as const,
        popular: false,
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise / Custom',
        price: 'Kustom',
        period: 'hubungi kami',
        description:
            'Untuk portofolio properti skala besar dan kebutuhan integrasi khusus.',
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
        popular: false,
    },
]);

const matrixFeatures = [
    {
        category: 'Batas & Kuota',
        items: [
            {
                name: 'Maks. Peralatan Listrik',
                free: '10 Unit',
                pro: 'Tanpa Batas',
                business: 'Tanpa Batas',
                enterprise: 'Tanpa Batas',
            },
            {
                name: 'Maks. Riwayat Input',
                free: '3 Bulan',
                pro: 'Tanpa Batas',
                business: 'Tanpa Batas',
                enterprise: 'Tanpa Batas',
            },
            {
                name: 'Jumlah Profil Usaha',
                free: '1 Bisnis',
                pro: '1 Bisnis',
                business: 'Maks. 5 Bisnis',
                enterprise: 'Tanpa Batas',
            },
            {
                name: 'Anggota Tim (Kolaborator)',
                free: 'Hanya 1',
                pro: 'Hanya 1',
                business: 'Maks. 5 User',
                enterprise: 'Tanpa Batas',
            },
        ],
    },
    {
        category: 'Analisis & Fitur Utama',
        items: [
            {
                name: 'Dashboard & Rasio Biaya',
                free: true,
                pro: true,
                business: true,
                enterprise: true,
            },
            {
                name: 'Rekomendasi Hemat Energi',
                free: 'Terbatas (Top 3)',
                pro: 'Akses Penuh',
                business: 'Akses Penuh',
                enterprise: 'Akses Penuh',
            },
            {
                name: 'Template Peralatan Instan',
                free: false,
                pro: true,
                business: true,
                enterprise: true,
            },
            {
                name: 'Laporan Bulanan',
                free: 'Bulan Terkini saja',
                pro: 'Akses Semua Riwayat',
                business: 'Akses Semua Riwayat',
                enterprise: 'Akses Semua Riwayat',
            },
            {
                name: 'Ekspor Laporan PDF',
                free: 'Segera Hadir',
                pro: 'Segera Hadir',
                business: 'Segera Hadir',
                enterprise: 'Segera Hadir',
            },
        ],
    },
];
</script>

<template>
    <Head title="Paket & Langganan" />

    <div class="mx-auto max-w-7xl space-y-8 p-6">
        <!-- Header Section -->
        <div class="flex flex-col gap-2 text-center md:text-left">
            <h1
                class="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight text-foreground md:justify-start"
            >
                <CreditCard class="h-8 w-8 text-primary" /> Paket & Langganan
            </h1>
            <p class="max-w-2xl text-muted-foreground">
                WattWise AI SaaS dikembangkan untuk membantu Anda mengendalikan
                pemborosan energi. Semua harga dan paket saat ini dalam tahap
                pilot dan validasi pasar.
            </p>
        </div>

        <!-- Staging Sandbox Billing Alert -->
        <div
            v-if="billingEnabled"
            class="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary shadow-sm"
        >
            <FlaskConical class="h-5 w-5 flex-shrink-0 text-primary" />
            <div>
                <span class="block font-bold"
                    >Mode Staging: Simulasi Billing Aktif</span
                >
                <span class="text-xs text-muted-foreground"
                    >Simulasi pembayaran — tidak ada uang yang
                    ditagihkan.</span
                >
            </div>
        </div>

        <!-- Current Active Plan Card -->
        <Card
            class="overflow-hidden border-primary/20 bg-gradient-to-r from-card to-muted/20 shadow-md"
        >
            <CardHeader class="pb-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="space-y-1">
                        <CardDescription>Paket Saat Ini</CardDescription>
                        <CardTitle
                            class="flex items-center gap-2 text-2xl font-bold text-foreground"
                        >
                            {{ effectivePlan.label }}
                            <Badge
                                v-if="effectivePlan.id === 'PRO_TRIAL'"
                                variant="secondary"
                                class="border-primary/20 bg-primary/10 text-primary hover:bg-primary/25"
                            >
                                Uji Coba Aktif
                            </Badge>
                            <Badge
                                v-else-if="effectivePlan.id === 'FREE'"
                                variant="outline"
                                class="border-muted-foreground/30 text-muted-foreground"
                            >
                                Gratis
                            </Badge>
                            <Badge
                                v-else
                                variant="secondary"
                                class="flex items-center gap-1 border-primary/20 bg-primary/10 text-primary"
                            >
                                <FlaskConical class="h-3 w-3" /> Sandbox Active
                            </Badge>
                        </CardTitle>
                    </div>
                    <div
                        v-if="effectivePlan.id === 'FREE'"
                        class="flex items-center gap-3"
                    >
                        <Button
                            @click="activateTrial"
                            :disabled="
                                isProcessing ||
                                effectivePlan.trial_ends_at !== null
                            "
                            class="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/95 text-primary-foreground shadow-md hover:opacity-90"
                        >
                            <Zap
                                class="h-4 w-4 fill-primary-foreground text-primary-foreground"
                            />
                            Mulai Pro Trial 30 Hari
                        </Button>
                    </div>
                    <div
                        v-else-if="
                            billingEnabled && effectivePlan.id !== 'FREE'
                        "
                        class="flex items-center gap-3"
                    >
                        <Button
                            variant="outline"
                            :disabled="isProcessing"
                            @click="cancelSubscription"
                            class="border-destructive/40 font-semibold text-destructive hover:bg-destructive/5"
                        >
                            Batalkan Langganan (Simulasi)
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div
                    class="grid gap-6 border-t border-border/50 pt-4 md:grid-cols-4"
                >
                    <div class="space-y-1">
                        <span
                            class="block text-xs font-medium text-muted-foreground"
                            >Batas Alat Listrik</span
                        >
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.appliances.current }} /
                            {{
                                usage.appliances.limit !== null
                                    ? usage.appliances.limit + ' Unit'
                                    : 'Tanpa Batas'
                            }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span
                            class="block text-xs font-medium text-muted-foreground"
                            >Entri Listrik</span
                        >
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.electricity_entries.current }} /
                            {{
                                usage.electricity_entries.limit !== null
                                    ? usage.electricity_entries.limit + ' Bulan'
                                    : 'Tanpa Batas'
                            }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span
                            class="block text-xs font-medium text-muted-foreground"
                            >Entri Pendapatan</span
                        >
                        <span class="text-sm font-bold text-foreground">
                            {{ usage.revenue_entries.current }} /
                            {{
                                usage.revenue_entries.limit !== null
                                    ? usage.revenue_entries.limit + ' Bulan'
                                    : 'Tanpa Batas'
                            }}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <span
                            class="block text-xs font-medium text-muted-foreground"
                            >Status Masa Aktif</span
                        >
                        <span class="text-sm font-bold text-foreground">
                            <span
                                v-if="
                                    effectivePlan.id === 'PRO_TRIAL' &&
                                    effectivePlan.trial_ends_at
                                "
                            >
                                Berakhir pada
                                {{ formatDate(effectivePlan.trial_ends_at) }}
                            </span>
                            <span
                                v-else-if="
                                    effectivePlan.id === 'FREE' &&
                                    effectivePlan.trial_ends_at !== null
                                "
                                class="text-xs text-muted-foreground"
                            >
                                Masa trial telah habis. Silakan hubungi kami
                                untuk perpanjangan Pro.
                            </span>
                            <span v-else> Aktif Selamanya </span>
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter
                v-if="effectivePlan.id === 'FREE'"
                class="flex items-center gap-1.5 border-t border-border/40 bg-muted/10 px-6 py-3 text-xs text-muted-foreground"
            >
                <Info class="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                Paket Gratis tetap bisa dipakai untuk input dasar dan ringkasan
                utama. Coba trial untuk membuka analisis premium.
            </CardFooter>
        </Card>

        <!-- Pricing Grid -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card
                v-for="card in planCards"
                :key="card.id"
                class="relative flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                :class="{
                    'scale-100 border-primary shadow-md lg:scale-[1.02]':
                        card.popular,
                    'border-border/60': !card.popular,
                }"
            >
                <div
                    v-if="card.popular"
                    class="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold tracking-wider text-primary-foreground uppercase"
                >
                    <Sparkles class="h-3 w-3 fill-primary-foreground" /> Paling
                    Populer
                </div>

                <CardHeader>
                    <CardTitle class="text-xl font-bold">{{
                        card.name
                    }}</CardTitle>
                    <CardDescription
                        class="mt-1.5 min-h-[40px] text-xs leading-relaxed"
                        >{{ card.description }}</CardDescription
                    >
                </CardHeader>

                <CardContent class="flex flex-grow flex-col gap-6">
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-3xl font-extrabold tracking-tight text-foreground"
                            >{{ card.price }}</span
                        >
                        <span
                            v-if="card.period"
                            class="text-xs text-muted-foreground"
                            >/{{ card.period }}</span
                        >
                    </div>

                    <!-- Features List -->
                    <div class="space-y-3.5 text-xs">
                        <div
                            class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                        >
                            Fitur Termasuk:
                        </div>
                        <ul class="space-y-2.5">
                            <li
                                v-for="feat in card.features"
                                :key="feat"
                                class="flex items-start gap-2"
                            >
                                <Check
                                    class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500"
                                />
                                <span
                                    class="leading-tight text-foreground/90"
                                    >{{ feat }}</span
                                >
                            </li>
                            <li
                                v-for="notInc in card.notIncluded"
                                :key="notInc"
                                class="flex items-start gap-2 opacity-50"
                            >
                                <X
                                    class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                                />
                                <span
                                    class="leading-tight text-muted-foreground"
                                    >{{ notInc }}</span
                                >
                            </li>
                        </ul>
                    </div>
                </CardContent>

                <CardFooter class="border-t border-border/40 pt-4">
                    <template v-if="billingEnabled">
                        <!-- Sandbox Billing is Enabled (Staging/Local) -->
                        <template v-if="card.id === 'FREE'">
                            <Button
                                variant="outline"
                                :disabled="
                                    effectivePlan.id === 'FREE' || isProcessing
                                "
                                class="w-full"
                                @click="startCheckout('free')"
                            >
                                {{
                                    effectivePlan.id === 'FREE'
                                        ? 'Paket Aktif'
                                        : 'Kembali ke Free (Simulasi)'
                                }}
                            </Button>
                        </template>
                        <template v-else-if="card.id === 'PRO'">
                            <Button
                                v-if="effectivePlan.id === 'PRO'"
                                variant="outline"
                                disabled
                                class="w-full border-primary text-primary"
                            >
                                Paket Aktif
                            </Button>
                            <Button
                                v-else
                                @click="startCheckout('pro')"
                                :disabled="isProcessing"
                                class="flex w-full items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary/95 font-semibold text-primary-foreground shadow-sm"
                            >
                                <FlaskConical class="h-3.5 w-3.5" /> Upgrade Pro
                                (Simulasi)
                            </Button>
                        </template>
                        <template v-else-if="card.id === 'BUSINESS'">
                            <Button
                                v-if="effectivePlan.id === 'BUSINESS'"
                                variant="outline"
                                disabled
                                class="w-full border-primary text-primary"
                            >
                                Paket Aktif
                            </Button>
                            <Button
                                v-else
                                @click="startCheckout('business')"
                                :disabled="isProcessing"
                                class="flex w-full items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary/95 font-semibold text-primary-foreground shadow-sm"
                            >
                                <FlaskConical class="h-3.5 w-3.5" /> Upgrade
                                Business (Simulasi)
                            </Button>
                        </template>
                        <template v-else>
                            <Button
                                variant="outline"
                                class="w-full border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                                disabled
                            >
                                Segera Hadir
                            </Button>
                        </template>
                    </template>
                    <template v-else>
                        <!-- Sandbox Billing is Disabled (Default Production/Sandbox Off) -->
                        <template v-if="card.id === 'FREE'">
                            <Button variant="outline" disabled class="w-full">
                                {{
                                    effectivePlan.id === 'FREE'
                                        ? 'Aktif'
                                        : 'Masa Aktif Selamanya'
                                }}
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
                                class="flex w-full items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary/95 text-primary-foreground shadow-sm"
                            >
                                <Zap
                                    class="h-3.5 w-3.5 fill-primary-foreground"
                                />
                                Mulai Trial
                            </Button>
                        </template>
                        <template v-else>
                            <Button
                                variant="outline"
                                class="w-full border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                                disabled
                            >
                                Segera Hadir
                            </Button>
                        </template>
                    </template>
                </CardFooter>
            </Card>
        </div>

        <!-- Pilot Program Disclaimer Alert -->
        <div
            class="flex gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-800 dark:text-yellow-200"
        >
            <Info
                class="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
            />
            <div class="space-y-1">
                <span class="block font-bold"
                    >Disclaimer Validasi Tahap Awal (Pilot Program):</span
                >
                <p class="leading-relaxed text-muted-foreground/90">
                    Sistem paket dan integrasi trial ini dikembangkan murni
                    untuk pengujian fitur pembatasan (gate logic) dan
                    memvalidasi kebutuhan wawasan energi bagi para pengguna
                    kos/UMKM. Saat ini kami tidak mengintegrasikan gateway
                    pembayaran (seperti Stripe/Midtrans) dan tidak menarik biaya
                    apa pun. Semua penawaran di atas adalah simulasi pilot untuk
                    masa pengembangan.
                </p>
            </div>
        </div>

        <!-- Detailed Feature Matrix -->
        <Card class="overflow-hidden border border-border/50 shadow-sm">
            <CardHeader class="bg-muted/10">
                <CardTitle class="flex items-center gap-2 text-lg font-bold">
                    <Shield class="h-5 w-5 text-primary" /> Matriks Perbandingan
                    Detail
                </CardTitle>
                <CardDescription class="text-xs"
                    >Bandingkan kapabilitas teknis dan kuota data untuk setiap
                    tingkatan paket SaaS.</CardDescription
                >
            </CardHeader>
            <CardContent class="overflow-x-auto p-0">
                <table
                    class="w-full min-w-[700px] border-collapse text-left text-xs"
                >
                    <thead>
                        <tr
                            class="border-b border-border/60 bg-muted/20 font-semibold text-muted-foreground"
                        >
                            <th class="w-[280px] p-4">Fitur & Kapabilitas</th>
                            <th class="p-4 text-center">Gratis</th>
                            <th
                                class="bg-primary/5 p-4 text-center text-primary"
                            >
                                Pro
                            </th>
                            <th class="p-4 text-center">Business</th>
                            <th class="p-4 text-center">Enterprise</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border/50">
                        <template
                            v-for="cat in matrixFeatures"
                            :key="cat.category"
                        >
                            <tr class="bg-muted/10">
                                <td
                                    colspan="5"
                                    class="p-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                                >
                                    {{ cat.category }}
                                </td>
                            </tr>
                            <tr
                                v-for="item in cat.items"
                                :key="item.name"
                                class="hover:bg-muted/5"
                            >
                                <td class="p-4 font-medium text-foreground">
                                    {{ item.name }}
                                </td>
                                <!-- FREE cell -->
                                <td class="p-4 text-center">
                                    <template
                                        v-if="typeof item.free === 'boolean'"
                                    >
                                        <Check
                                            v-if="item.free"
                                            class="mx-auto h-4 w-4 text-green-500"
                                        />
                                        <X
                                            v-else
                                            class="mx-auto h-4 w-4 text-muted-foreground/35"
                                        />
                                    </template>
                                    <span v-else class="font-medium">{{
                                        item.free
                                    }}</span>
                                </td>
                                <!-- PRO cell -->
                                <td class="bg-primary/5 p-4 text-center">
                                    <template
                                        v-if="typeof item.pro === 'boolean'"
                                    >
                                        <Check
                                            v-if="item.pro"
                                            class="mx-auto h-4 w-4 text-green-500"
                                        />
                                        <X
                                            v-else
                                            class="mx-auto h-4 w-4 text-muted-foreground/35"
                                        />
                                    </template>
                                    <span
                                        v-else
                                        class="font-bold text-primary"
                                        >{{ item.pro }}</span
                                    >
                                </td>
                                <!-- BUSINESS cell -->
                                <td class="p-4 text-center">
                                    <template
                                        v-if="
                                            typeof item.business === 'boolean'
                                        "
                                    >
                                        <Check
                                            v-if="item.business"
                                            class="mx-auto h-4 w-4 text-green-500"
                                        />
                                        <X
                                            v-else
                                            class="mx-auto h-4 w-4 text-muted-foreground/35"
                                        />
                                    </template>
                                    <span v-else class="font-medium">{{
                                        item.business
                                    }}</span>
                                </td>
                                <!-- ENTERPRISE cell -->
                                <td class="p-4 text-center">
                                    <template
                                        v-if="
                                            typeof item.enterprise === 'boolean'
                                        "
                                    >
                                        <Check
                                            v-if="item.enterprise"
                                            class="mx-auto h-4 w-4 text-green-500"
                                        />
                                        <X
                                            v-else
                                            class="mx-auto h-4 w-4 text-muted-foreground/35"
                                        />
                                    </template>
                                    <span v-else class="font-medium">{{
                                        item.enterprise
                                    }}</span>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </CardContent>
        </Card>
    </div>
</template>
