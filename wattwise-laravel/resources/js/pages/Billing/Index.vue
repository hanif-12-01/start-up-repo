<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { Check, CreditCard, ShieldAlert, FlaskConical } from '@lucide/vue';
import { ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Plan {
    code: string;
    name: string;
    price_amount: number;
    currency: string;
    interval: string;
    features: string[];
    is_free: boolean;
}

const props = defineProps<{
    sandbox: boolean;
    currency: string;
    currentPlan: { code: string; name: string };
    entitlement: { status: string; ends_at: string | null } | null;
    plans: Plan[];
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Sandbox Billing', href: '/billing' },
        ],
    },
});

const isProcessing = ref(false);

const formatPrice = (amount: number, currency: string): string => {
    if (amount === 0) {
        return 'Rp 0';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount);
};

// Human-readable feature labels (values are simulation-only feature flags).
const featureLabels: Record<string, string> = {
    basic_access: 'Akses dasar',
    pdf_reports: 'Laporan PDF',
    reminder_foundation_access: 'Akses fondasi pengingat',
    reminders: 'Pengingat bulanan',
    advanced_report_history: 'Riwayat laporan lanjutan',
};

const labelFor = (feature: string): string => featureLabels[feature] ?? feature;

const startCheckout = (planCode: string) => {
    isProcessing.value = true;
    router.post('/billing/checkout', { plan_code: planCode }, {
        onFinish: () => {
            isProcessing.value = false;
        },
    });
};

const cancel = () => {
    isProcessing.value = true;
    router.post('/billing/cancel', {}, {
        onFinish: () => {
            isProcessing.value = false;
        },
    });
};
</script>

<template>
    <Head title="Sandbox Billing" />

    <div class="space-y-8 p-6 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <CreditCard class="h-8 w-8 text-primary" /> Sandbox Billing
            </h1>
            <p class="text-muted-foreground max-w-2xl">
                Alur pembayaran ini sepenuhnya <strong>simulasi</strong>. Tidak ada pembayaran nyata, tidak ada data kartu, dan tidak ada penyedia pembayaran eksternal yang dihubungi.
            </p>
        </div>

        <!-- Sandbox Warning -->
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
            <ShieldAlert class="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
                <span class="font-bold block">Simulated Payment — Sandbox Billing</span>
                <p class="leading-relaxed text-muted-foreground">
                    Semua invoice dan pembayaran ditandai <code class="text-xs">simulated = true</code> dan diproses oleh driver
                    <code class="text-xs">sandbox_simulator</code>. Sistem ini hanya untuk staging/pengujian dan tidak menagih biaya apa pun.
                </p>
            </div>
        </div>

        <!-- Current Plan -->
        <Card class="border-primary/20 shadow-md">
            <CardHeader class="pb-4">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div class="space-y-1">
                        <CardDescription>Paket Saat Ini (Sandbox)</CardDescription>
                        <CardTitle class="text-2xl font-bold text-foreground flex items-center gap-2">
                            {{ currentPlan.name }}
                            <Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                <FlaskConical class="h-3 w-3" /> Sandbox
                            </Badge>
                            <Badge v-if="entitlement" variant="outline" class="text-muted-foreground border-muted-foreground/30 uppercase text-[10px]">
                                {{ entitlement.status }}
                            </Badge>
                        </CardTitle>
                    </div>
                    <Button
                        v-if="currentPlan.code !== 'free'"
                        variant="outline"
                        :disabled="isProcessing"
                        @click="cancel"
                    >
                        Batalkan &amp; kembali ke Free
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <!-- Available Plans -->
        <div class="grid gap-6 md:grid-cols-3">
            <Card
                v-for="plan in props.plans"
                :key="plan.code"
                class="flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                :class="{ 'border-primary shadow-md': plan.code === currentPlan.code }"
            >
                <CardHeader>
                    <CardTitle class="text-xl font-bold flex items-center gap-2">
                        {{ plan.name }}
                        <Badge v-if="plan.code === currentPlan.code" variant="secondary" class="bg-primary/10 text-primary border-primary/20">
                            Aktif
                        </Badge>
                    </CardTitle>
                    <CardDescription class="text-xs">
                        Paket sandbox — pembayaran disimulasikan.
                    </CardDescription>
                </CardHeader>

                <CardContent class="flex-grow flex flex-col gap-6">
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-extrabold tracking-tight text-foreground">{{ formatPrice(plan.price_amount, plan.currency) }}</span>
                        <span class="text-xs text-muted-foreground">/{{ plan.interval === 'yearly' ? 'tahun' : 'bulan' }}</span>
                    </div>

                    <ul class="space-y-2.5 text-xs">
                        <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2">
                            <Check class="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span class="text-foreground/90 leading-tight">{{ labelFor(feat) }}</span>
                        </li>
                    </ul>
                </CardContent>

                <CardFooter class="pt-4 border-t border-border/40">
                    <Button
                        v-if="plan.code === currentPlan.code"
                        variant="outline"
                        disabled
                        class="w-full"
                    >
                        Paket Aktif
                    </Button>
                    <Button
                        v-else-if="plan.is_free"
                        variant="outline"
                        class="w-full"
                        :disabled="isProcessing"
                        @click="startCheckout(plan.code)"
                    >
                        Pilih Free
                    </Button>
                    <Button
                        v-else
                        class="w-full flex items-center justify-center gap-1.5"
                        :disabled="isProcessing"
                        @click="startCheckout(plan.code)"
                    >
                        <FlaskConical class="h-3.5 w-3.5" /> Start Sandbox Checkout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
</template>
