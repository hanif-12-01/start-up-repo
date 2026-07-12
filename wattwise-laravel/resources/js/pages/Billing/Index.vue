<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3';
import { Check, CreditCard, ShieldAlert, FlaskConical } from '@lucide/vue';
import { ref } from 'vue';
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

interface Plan {
    code: string;
    name: string;
    price_amount: number;
    currency: string;
    interval: string;
    features: string[];
    is_free: boolean;
}

interface EffectivePlan {
    id: string;
    label: string;
    is_trial: boolean;
    is_expired: boolean;
    trial_ends_at: string | null;
    remaining_trial_days: number;
}

const props = defineProps<{
    sandbox: boolean;
    currency: string;
    effectivePlan: EffectivePlan;
    plans: Plan[];
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Paket & Langganan', href: '/plans' },
            { title: 'Simulasi Billing', href: '/billing' },
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

const featureLabels: Record<string, string> = {
    basic_access: 'Akses dasar',
    pdf_reports: 'Laporan PDF',
    reminders: 'Pengingat bulanan',
    advanced_report_history: 'Riwayat laporan lanjutan',
};

const labelFor = (feature: string): string => featureLabels[feature] ?? feature;

const page = usePage();
const idempotencyKeys = ref<Record<string, string>>({});

const getOrGenerateIdempotencyKey = (planCode: string) => {
    if (!idempotencyKeys.value[planCode]) {
        const userId = (page.props as any).auth?.user?.id ?? 'guest';
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

const planCodeMatchesEffective = (code: string): boolean => {
    const map: Record<string, string> = {
        free: 'FREE',
        pro: 'PRO',
        business: 'BUSINESS',
    };

    return (map[code] ?? '') === props.effectivePlan.id;
};
</script>

<template>
    <Head title="Simulasi Billing" />

    <div class="mx-auto max-w-6xl space-y-8 p-6">
        <div class="flex flex-col gap-2">
            <h1
                class="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground"
            >
                <CreditCard class="h-8 w-8 text-primary" /> Simulasi Billing
            </h1>
            <p class="max-w-2xl text-muted-foreground">
                Simulasi pembayaran —
                <strong>tidak ada uang yang ditagihkan</strong>. Alur ini
                sepenuhnya simulasi sandbox.
            </p>
        </div>

        <div
            class="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
            <ShieldAlert
                class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div class="space-y-1">
                <span class="block font-bold"
                    >Simulasi pembayaran — tidak ada uang yang ditagihkan</span
                >
                <p class="leading-relaxed text-muted-foreground">
                    Semua invoice dan pembayaran ditandai
                    <code class="text-xs">simulated = true</code>. Sistem ini
                    hanya untuk staging/pengujian dan tidak menagih biaya apa
                    pun.
                </p>
            </div>
        </div>

        <Card class="border-primary/20 shadow-md">
            <CardHeader class="pb-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="space-y-1">
                        <CardDescription>Paket Aktif Saat Ini</CardDescription>
                        <CardTitle
                            class="flex items-center gap-2 text-2xl font-bold text-foreground"
                        >
                            {{ effectivePlan.label }}
                            <Badge
                                variant="secondary"
                                class="flex items-center gap-1 border-primary/20 bg-primary/10 text-primary"
                            >
                                <FlaskConical class="h-3 w-3" /> Sandbox
                            </Badge>
                        </CardTitle>
                    </div>
                    <Button
                        v-if="effectivePlan.id !== 'FREE'"
                        variant="outline"
                        :disabled="isProcessing"
                        @click="cancelSubscription"
                    >
                        Batalkan langganan &amp; kembali ke Free
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card
                v-for="plan in props.plans"
                :key="plan.code"
                class="flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                :class="{
                    'border-primary shadow-md': planCodeMatchesEffective(
                        plan.code,
                    ),
                }"
            >
                <CardHeader>
                    <CardTitle
                        class="flex items-center gap-2 text-xl font-bold"
                    >
                        {{ plan.name }}
                        <Badge
                            v-if="planCodeMatchesEffective(plan.code)"
                            variant="secondary"
                            class="border-primary/20 bg-primary/10 text-primary"
                        >
                            Aktif
                        </Badge>
                    </CardTitle>
                    <CardDescription class="text-xs">
                        Paket sandbox — pembayaran disimulasikan.
                    </CardDescription>
                </CardHeader>

                <CardContent class="flex flex-grow flex-col gap-6">
                    <div class="flex items-baseline gap-1">
                        <span
                            class="text-3xl font-extrabold tracking-tight text-foreground"
                            >{{
                                formatPrice(plan.price_amount, plan.currency)
                            }}</span
                        >
                        <span class="text-xs text-muted-foreground"
                            >/{{
                                plan.interval === 'yearly' ? 'tahun' : 'bulan'
                            }}</span
                        >
                    </div>

                    <ul class="space-y-2.5 text-xs">
                        <li
                            v-for="feat in plan.features"
                            :key="feat"
                            class="flex items-start gap-2"
                        >
                            <Check
                                class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500"
                            />
                            <span class="leading-tight text-foreground/90">{{
                                labelFor(feat)
                            }}</span>
                        </li>
                    </ul>
                </CardContent>

                <CardFooter class="border-t border-border/40 pt-4">
                    <Button
                        v-if="planCodeMatchesEffective(plan.code)"
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
                        class="flex w-full items-center justify-center gap-1.5"
                        :disabled="isProcessing"
                        @click="startCheckout(plan.code)"
                    >
                        <FlaskConical class="h-3.5 w-3.5" /> Simulasi Checkout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
</template>
