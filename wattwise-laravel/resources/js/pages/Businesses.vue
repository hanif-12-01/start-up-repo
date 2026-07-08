<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { Building2, ArrowLeft } from '@lucide/vue';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Usaha/Properti',
                href: '/businesses',
            },
        ],
    },
});
</script>

<template>
    <Head title="Kelola Usaha & Properti" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
        <div class="flex flex-col gap-2">
            <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft class="h-4 w-4" />
                Kembali ke Beranda
            </Link>
            <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Building2 class="h-8 w-8 text-primary" /> Usaha & Properti Anda
            </h1>
            <p class="text-muted-foreground text-base">
                Daftar lengkap kos, bisnis ritel, laundry, FnB, atau properti sewaan yang Anda kelola.
            </p>
        </div>

        <div class="rounded-xl border border-border bg-card p-8 flex flex-col gap-6 shadow-sm">
            <div class="flex flex-col gap-2">
                <h2 class="text-xl font-semibold text-foreground">Daftar Usaha Aktif</h2>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    Lihat detail profil usaha, kapasitas daya listrik (VA), tarif per kWh, dan jenis meteran yang terdaftar untuk masing-masing bisnis Anda.
                </p>
            </div>
            
            <div class="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                💼 Modul daftar usaha dan penambahan properti baru akan diintegrasikan dengan database pada langkah berikutnya.
            </div>
        </div>
    </div>
</template>
