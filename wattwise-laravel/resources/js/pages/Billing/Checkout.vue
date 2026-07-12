<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import {
    CheckCircle2,
    XCircle,
    Ban,
    ShieldAlert,
    FlaskConical,
} from '@lucide/vue';
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

const props = defineProps<{
    sandbox: boolean;
    currency: string;
    payment: {
        id: number;
        status: string;
        amount: number;
        provider: string;
        simulated: boolean;
    };
    invoice: {
        invoice_number: string;
        amount: number;
        status: string;
        simulated: boolean;
    };
    plan: { code: string; name: string };
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Paket & Langganan', href: '/plans' },
            { title: 'Simulasi Pembayaran', href: '#' },
        ],
    },
});

const isProcessing = ref(false);

const formatPrice = (amount: number): string =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: props.currency,
        minimumFractionDigits: 0,
    }).format(amount);

const simulate = (outcome: 'success' | 'failure' | 'cancelled') => {
    isProcessing.value = true;
    router.post(
        `/billing/payment/${props.payment.id}/simulate`,
        { outcome },
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};
</script>

<template>
    <Head title="Simulasi Pembayaran" />

    <div class="mx-auto max-w-2xl space-y-6 p-6">
        <div class="flex flex-col gap-2">
            <h1
                class="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"
            >
                <FlaskConical class="h-7 w-7 text-primary" /> Simulasi
                Pembayaran
            </h1>
            <p class="text-sm text-muted-foreground">
                Simulasi pembayaran —
                <strong>tidak ada uang yang ditagihkan</strong>. Klik salah satu
                tombol di bawah untuk mensimulasikan hasil.
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
                    Diproses oleh
                    <code class="text-xs">{{ payment.provider }}</code
                    >. Tidak ada penyedia pembayaran eksternal yang dihubungi.
                </p>
            </div>
        </div>

        <Card class="shadow-md">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div>
                        <CardDescription>Invoice</CardDescription>
                        <CardTitle class="font-mono text-lg">{{
                            invoice.invoice_number
                        }}</CardTitle>
                    </div>
                    <Badge
                        variant="secondary"
                        class="flex items-center gap-1 border-primary/20 bg-primary/10 text-primary"
                    >
                        <FlaskConical class="h-3 w-3" /> Simulated
                    </Badge>
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div
                    class="flex justify-between border-b border-border/50 pb-2 text-sm"
                >
                    <span class="text-muted-foreground">Paket</span>
                    <span class="font-semibold text-foreground">{{
                        plan.name
                    }}</span>
                </div>
                <div
                    class="flex justify-between border-b border-border/50 pb-2 text-sm"
                >
                    <span class="text-muted-foreground">Jumlah</span>
                    <span class="text-lg font-bold text-foreground">{{
                        formatPrice(invoice.amount)
                    }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Status</span>
                    <Badge variant="outline" class="text-[10px] uppercase">{{
                        payment.status
                    }}</Badge>
                </div>
            </CardContent>
            <CardFooter
                class="flex flex-col gap-3 border-t border-border/40 pt-4"
            >
                <div class="flex w-full flex-col gap-3 sm:flex-row">
                    <Button
                        class="flex w-full items-center justify-center gap-1.5"
                        :disabled="isProcessing"
                        @click="simulate('success')"
                    >
                        <CheckCircle2 class="h-4 w-4" /> Simulasi Berhasil
                    </Button>
                    <Button
                        variant="outline"
                        class="flex w-full items-center justify-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                        :disabled="isProcessing"
                        @click="simulate('failure')"
                    >
                        <XCircle class="h-4 w-4" /> Simulasi Gagal
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    class="flex w-full items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
                    :disabled="isProcessing"
                    @click="simulate('cancelled')"
                >
                    <Ban class="h-4 w-4" /> Batalkan Pembayaran
                </Button>
            </CardFooter>
        </Card>
    </div>
</template>
