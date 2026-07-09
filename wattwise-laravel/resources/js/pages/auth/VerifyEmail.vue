<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

defineOptions({
    layout: {
        title: 'Verifikasi Email',
        description:
            'Verifikasi alamat email Anda dengan mengeklik tautan yang baru kami kirimkan untuk mengaktifkan akun WattWise AI.',
    },
});

defineProps<{
    status?: string;
}>();
</script>

<template>
    <Head title="Verifikasi Email" />

    <div
        v-if="status === 'verification-link-sent'"
        class="mb-4 text-center text-sm font-medium text-green-600"
    >
        Tautan verifikasi baru telah dikirim ke alamat email yang Anda gunakan
        saat pendaftaran.
    </div>

    <Form
        v-bind="send.form()"
        class="space-y-6 text-center"
        v-slot="{ processing }"
    >
        <Button :disabled="processing" variant="secondary">
            <Spinner v-if="processing" />
            Kirim ulang email verifikasi
        </Button>

        <TextLink :href="logout()" as="button" class="mx-auto block text-sm">
            Keluar
        </TextLink>
    </Form>
</template>
