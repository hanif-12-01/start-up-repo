<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { computed } from 'vue';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Preference {
    has_phone: boolean;
    masked_phone: string | null;
    whatsapp_enabled: boolean;
    opted_in: boolean;
    monthly_reminder_day: number | null;
    timezone: string;
}

const props = defineProps<{ preference: Preference }>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Notifikasi WhatsApp',
                href: '/settings/notifications',
            },
        ],
    },
});

const days = Array.from({ length: 28 }, (_, i) => i + 1);

const form = useForm({
    whatsapp_phone: '',
    whatsapp_enabled: props.preference.whatsapp_enabled,
    consent: false,
    monthly_reminder_day: props.preference.monthly_reminder_day ?? 1,
    timezone: props.preference.timezone,
});

const removeForm = useForm({});

const phonePlaceholder = computed(() =>
    props.preference.masked_phone ? `Tersimpan: ${props.preference.masked_phone}` : 'Contoh: 081234567890',
);

const submit = () => {
    form.put('/settings/notifications', { preserveScroll: true });
};

const removeNumber = () => {
    removeForm.delete('/settings/notifications', { preserveScroll: true });
};
</script>

<template>
    <Head title="Notifikasi WhatsApp" />

    <h1 class="sr-only">Pengaturan Notifikasi WhatsApp</h1>

    <div class="flex flex-col space-y-6">
        <Heading
            variant="small"
            title="Pengingat WhatsApp"
            description="Terima pengingat bulanan untuk mencatat data listrik dan pendapatan WattWise."
        />

        <div
            class="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
            role="note"
        >
            Fondasi pengingat telah disiapkan. Pengiriman WhatsApp akan aktif setelah kanal layanan tersedia.
            Fitur ini untuk pengingat operasional WattWise, bukan pesan pemasaran.
        </div>

        <form class="space-y-6" @submit.prevent="submit">
            <!-- Phone -->
            <div class="grid gap-2">
                <Label for="whatsapp_phone">Nomor WhatsApp</Label>
                <Input
                    id="whatsapp_phone"
                    v-model="form.whatsapp_phone"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel"
                    :placeholder="phonePlaceholder"
                    class="mt-1 block w-full"
                />
                <p class="text-xs text-muted-foreground">
                    Nomor Indonesia, akan disimpan dalam format +62. Kosongkan untuk mempertahankan nomor tersimpan.
                </p>
                <InputError class="mt-1" :message="form.errors.whatsapp_phone" />
            </div>

            <!-- Reminder day -->
            <div class="grid gap-2">
                <Label for="monthly_reminder_day">Tanggal pengingat setiap bulan</Label>
                <select
                    id="monthly_reminder_day"
                    v-model.number="form.monthly_reminder_day"
                    class="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <option v-for="day in days" :key="day" :value="day">Tanggal {{ day }}</option>
                </select>
                <InputError class="mt-1" :message="form.errors.monthly_reminder_day" />
            </div>

            <!-- Timezone (read-only display) -->
            <div class="grid gap-2">
                <Label for="timezone">Zona waktu</Label>
                <Input id="timezone" :model-value="form.timezone" class="mt-1 block w-full max-w-[280px]" readonly />
                <p class="text-xs text-muted-foreground">Pengingat dievaluasi berdasarkan zona waktu ini.</p>
            </div>

            <!-- Enable + consent -->
            <div class="space-y-3 rounded-lg border border-border p-4">
                <div class="flex items-start gap-3">
                    <input
                        id="whatsapp_enabled"
                        v-model="form.whatsapp_enabled"
                        type="checkbox"
                        class="mt-1 size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Label for="whatsapp_enabled" class="font-medium">
                        Aktifkan pengingat WhatsApp bulanan
                    </Label>
                </div>
                <InputError :message="form.errors.whatsapp_enabled" />

                <div v-if="form.whatsapp_enabled" class="flex items-start gap-3">
                    <input
                        id="consent"
                        v-model="form.consent"
                        type="checkbox"
                        class="mt-1 size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Label for="consent" class="text-sm font-normal text-muted-foreground">
                        Dengan mengaktifkan fitur ini, Anda menyetujui penerimaan pesan operasional WattWise melalui
                        WhatsApp. Fitur dapat dinonaktifkan kapan saja.
                    </Label>
                </div>
                <InputError :message="form.errors.consent" />
            </div>

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :disabled="form.processing" data-test="save-notifications-button">
                    Simpan
                </Button>

                <Button
                    v-if="preference.has_phone"
                    type="button"
                    variant="outline"
                    :disabled="removeForm.processing"
                    data-test="remove-number-button"
                    @click="removeNumber"
                >
                    Hapus nomor & nonaktifkan
                </Button>
            </div>
        </form>
    </div>
</template>
