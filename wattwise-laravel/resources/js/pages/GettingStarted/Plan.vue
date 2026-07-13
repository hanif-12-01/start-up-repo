<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { Check, Zap, Shield } from '@lucide/vue';
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

defineProps<{
    trialEligible: boolean;
}>();

const isProcessing = ref(false);

const chooseFree = () => {
    isProcessing.value = true;
    router.post(
        '/getting-started/choose-free',
        {},
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

const chooseTrial = () => {
    isProcessing.value = true;
    router.post(
        '/getting-started/choose-trial',
        {},
        {
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

const freeFeatures = [
    'Dashboard analisis listrik',
    'Input data listrik (maks. 3 bulan)',
    'Input pendapatan (maks. 3 bulan)',
    'Peralatan listrik (maks. 10)',
    'Ringkasan prediksi & anomali',
    'Rekomendasi penghematan',
    '1 bisnis/properti',
];

const proFeatures = [
    'Semua fitur Gratis',
    'Input data tanpa batas',
    'Peralatan tanpa batas',
    'Template peralatan instan',
    'Prediksi & anomali detail',
    'Riwayat anomali lengkap',
    'Laporan lengkap & PDF',
    'Hingga 3 bisnis/properti',
    'Tanpa iklan',
];
</script>

<template>
    <Head title="Pilih Paket — WattWise" />

    <div
        class="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6"
    >
        <div class="w-full max-w-3xl">
            <div class="mb-8 text-center">
                <div
                    class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
                >
                    <Zap class="h-6 w-6 text-primary" />
                </div>
                <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
                    Selamat Datang di WattWise!
                </h1>
                <p class="mt-2 text-muted-foreground">
                    Pilih paket untuk memulai analisis biaya listrik Anda.
                </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <!-- Free Plan -->
                <Card class="flex flex-col">
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Shield class="h-5 w-5 text-muted-foreground" />
                            Gratis
                        </CardTitle>
                        <CardDescription>
                            Mulai tanpa biaya, upgrade kapan saja.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="flex-1">
                        <p class="mb-4 text-2xl font-bold">
                            Rp 0
                            <span
                                class="text-sm font-normal text-muted-foreground"
                                >/selamanya</span
                            >
                        </p>
                        <ul class="space-y-2 text-sm" role="list">
                            <li
                                v-for="feature in freeFeatures"
                                :key="feature"
                                class="flex items-start gap-2"
                            >
                                <Check
                                    class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <span>{{ feature }}</span>
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button
                            class="w-full"
                            variant="outline"
                            :disabled="isProcessing"
                            aria-label="Pilih paket Gratis"
                            @click="chooseFree"
                        >
                            {{ isProcessing ? 'Memproses...' : 'Pilih Gratis' }}
                        </Button>
                    </CardFooter>
                </Card>

                <!-- Pro Trial Plan -->
                <Card class="flex flex-col border-primary">
                    <CardHeader>
                        <div class="flex items-center justify-between">
                            <CardTitle class="flex items-center gap-2">
                                <Zap class="h-5 w-5 text-primary" />
                                Pro Trial
                            </CardTitle>
                            <Badge variant="default">Disarankan</Badge>
                        </div>
                        <CardDescription>
                            Akses penuh selama 30 hari, tanpa pembayaran.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="flex-1">
                        <p class="mb-1 text-2xl font-bold">
                            Rp 0
                            <span
                                class="text-sm font-normal text-muted-foreground"
                                >/30 hari</span
                            >
                        </p>
                        <p class="mb-4 text-xs text-muted-foreground">
                            Tidak perlu kartu kredit. Tidak ada biaya
                            tersembunyi.
                        </p>
                        <ul class="space-y-2 text-sm" role="list">
                            <li
                                v-for="feature in proFeatures"
                                :key="feature"
                                class="flex items-start gap-2"
                            >
                                <Check
                                    class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                    aria-hidden="true"
                                />
                                <span>{{ feature }}</span>
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button
                            v-if="trialEligible"
                            class="w-full"
                            :disabled="isProcessing"
                            aria-label="Mulai Pro Trial 30 hari gratis"
                            @click="chooseTrial"
                        >
                            {{
                                isProcessing
                                    ? 'Memproses...'
                                    : 'Mulai Pro Trial Gratis'
                            }}
                        </Button>
                        <p
                            v-else
                            class="w-full text-center text-sm text-muted-foreground"
                        >
                            Trial tidak tersedia untuk akun ini.
                        </p>
                    </CardFooter>
                </Card>
            </div>

            <p class="mt-6 text-center text-xs text-muted-foreground">
                Anda dapat mengubah paket kapan saja dari halaman Paket &amp;
                Langganan.
            </p>
        </div>
    </div>
</template>
