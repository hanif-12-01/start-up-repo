<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { CheckCircle2, XCircle, ShieldAlert, FlaskConical } from '@lucide/vue';
import { ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const props = defineProps<{
    sandbox: boolean;
    currency: string;
    payment: { id: number; status: string; amount: number; provider: string; simulated: boolean };
    invoice: { invoice_number: string; amount: number; status: string; simulated: boolean };
    plan: { code: string; name: string };
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Sandbox Billing', href: '/billing' },
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

const simulate = (outcome: 'success' | 'failure') => {
    isProcessing.value = true;
    router.post(`/billing/payment/${props.payment.id}/simulate`, { outcome }, {
        onFinish: () => {
            isProcessing.value = false;
        },
    });
};
</script>

<template>
    <Head title="Simulasi Pembayaran" />

    <div class="space-y-6 p-6 max-w-2xl mx-auto">
        <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FlaskConical class="h-7 w-7 text-primary" /> Simulasi Pembayaran
            </h1>
            <p class="text-muted-foreground text-sm">
                Ini adalah halaman pembayaran <strong>simulasi</strong>. Klik salah satu tombol di bawah untuk mensimulasikan hasil. Tidak ada pembayaran nyata yang diproses.
            </p>
        </div>

        <!-- Sandbox Warning -->
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
            <ShieldAlert class="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
                <span class="font-bold block">Simulated Payment — Sandbox Billing</span>
                <p class="leading-relaxed text-muted-foreground">
                    Diproses oleh <code class="text-xs">{{ payment.provider }}</code>. Tidak ada penyedia pembayaran eksternal yang dihubungi.
                </p>
            </div>
        </div>

        <Card class="shadow-md">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div>
                        <CardDescription>Invoice</CardDescription>
                        <CardTitle class="text-lg font-mono">{{ invoice.invoice_number }}</CardTitle>
                    </div>
                    <Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                        <FlaskConical class="h-3 w-3" /> Simulated
                    </Badge>
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex justify-between text-sm border-b border-border/50 pb-2">
                    <span class="text-muted-foreground">Paket</span>
                    <span class="font-semibold text-foreground">{{ plan.name }}</span>
                </div>
                <div class="flex justify-between text-sm border-b border-border/50 pb-2">
                    <span class="text-muted-foreground">Jumlah</span>
                    <span class="font-bold text-foreground text-lg">{{ formatPrice(invoice.amount) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Status</span>
                    <Badge variant="outline" class="uppercase text-[10px]">{{ payment.status }}</Badge>
                </div>
            </CardContent>
            <CardFooter class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                <Button
                    class="w-full flex items-center justify-center gap-1.5"
                    :disabled="isProcessing"
                    @click="simulate('success')"
                >
                    <CheckCircle2 class="h-4 w-4" /> Simulate successful payment
                </Button>
                <Button
                    variant="outline"
                    class="w-full flex items-center justify-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                    :disabled="isProcessing"
                    @click="simulate('failure')"
                >
                    <XCircle class="h-4 w-4" /> Simulate failed payment
                </Button>
            </CardFooter>
        </Card>
    </div>
</template>
