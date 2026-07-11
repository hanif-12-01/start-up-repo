<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import InputError from '@/components/InputError.vue';
import PasskeyVerify from '@/components/PasskeyVerify.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

import type { DemoState } from '@/types/demo';

defineOptions({
    layout: {
        title: 'Masuk ke WattWise AI',
        description:
            'SaaS electricity cost intelligence untuk pemilik kos, pengelola properti kecil, dan UMKM padat energi',
    },
});

defineProps<{
    status?: string;
    canResetPassword: boolean;
    demo: DemoState;
}>();
</script>

<template>
    <Head title="Masuk ke WattWise AI" />

    <div
        v-if="status"
        class="mb-4 text-center text-sm font-medium text-green-600"
    >
        {{ status }}
    </div>

    <div
        v-if="demo.enabled"
        class="mb-6 rounded-lg border p-3 text-sm"
        :class="demo.ready
            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40'"
    >
        <div v-if="demo.ready && demo.credentials">
            <p class="font-medium text-green-800 dark:text-green-300">
                Demo lokal: {{ demo.credentials.email }} / {{ demo.credentials.password }}
            </p>
            <p class="mt-1 text-xs text-green-700/80 dark:text-green-400/80">
                Akun demo hanya untuk pengujian lokal atau staging terkontrol, bukan kredensial produksi.
            </p>
        </div>
        <div v-else-if="demo.message">
            <p class="font-medium text-yellow-850 dark:text-yellow-350">
                {{ demo.message }}
            </p>
        </div>
    </div>

    <PasskeyVerify />

    <Form
        v-bind="store.form()"
        :reset-on-success="['password']"
        v-slot="{ errors, processing }"
        class="flex flex-col gap-6"
    >
        <div class="grid gap-6">
            <div class="grid gap-2">
                <Label for="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autofocus
                    :tabindex="1"
                    autocomplete="email"
                    placeholder="email@example.com"
                />
                <InputError :message="errors.email" />
            </div>

            <div class="grid gap-2">
                <div class="flex items-center justify-between">
                    <Label for="password">Kata sandi</Label>
                    <TextLink
                        v-if="canResetPassword"
                        :href="request()"
                        class="text-sm"
                        :tabindex="5"
                    >
                        Lupa kata sandi?
                    </TextLink>
                </div>
                <PasswordInput
                    id="password"
                    name="password"
                    required
                    :tabindex="2"
                    autocomplete="current-password"
                    placeholder="Password"
                />
                <InputError :message="errors.password" />
            </div>

            <div class="flex items-center justify-between">
                <Label for="remember" class="flex items-center space-x-3">
                    <Checkbox id="remember" name="remember" :tabindex="3" />
                    <span>Ingat saya</span>
                </Label>
            </div>

            <Button
                type="submit"
                class="mt-4 w-full"
                :tabindex="4"
                :disabled="processing"
                data-test="login-button"
            >
                <Spinner v-if="processing" />
                Masuk
            </Button>
        </div>

        <div class="text-center text-sm text-muted-foreground">
            Belum punya akun?
            <TextLink :href="register()" :tabindex="5">Daftar</TextLink>
        </div>
    </Form>
</template>
