<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { Building2, Calendar, Zap, AlertTriangle } from '@lucide/vue';
import { watch, computed } from 'vue';
import InputError from '@/components/InputError.vue';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import type {BusinessRow} from '@/types';

const props = defineProps<{
    open: boolean;
    business: BusinessRow | null;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const isEdit = computed(() => !!props.business);

const businessLimitError = computed(() => (form.errors as Record<string, string>).business_limit ?? null);
const businessStatusError = computed(() => (form.errors as Record<string, string>).business_status ?? null);

const form = useForm({
    name: '',
    business_type: '',
    city: '',
    province: '',
    address: '',
    // Operasional
    room_count: null as number | null,
    occupied_room_count: null as number | null,
    employee_count: null as number | null,
    operating_days_per_month: null as number | null,
    business_notes: '',
    // Kelistrikan
    customer_type: '',
    power_va: null as number | null,
    tariff_per_kwh: null as number | null,
    payment_method: '',
    meter_type: '',
    electricity_notes: '',
});

// Watch open/business props to reset or populate form fields
watch(
    [() => props.open, () => props.business],
    ([isOpen, business]) => {
        if (isOpen) {
            form.clearErrors();

            if (business) {
                form.name = business.name || '';
                form.business_type = business.business_type || '';
                form.city = business.city || '';
                form.province = business.province || '';
                form.address = business.address || '';

                const bp = business.business_profile;
                form.room_count = bp?.room_count ?? null;
                form.occupied_room_count = bp?.occupied_room_count ?? null;
                form.employee_count = bp?.employee_count ?? null;
                form.operating_days_per_month = bp?.operating_days_per_month ?? null;
                form.business_notes = bp?.notes || '';

                const ep = business.electricity_profile;
                form.customer_type = ep?.customer_type || '';
                form.power_va = ep?.power_va ?? null;
                form.tariff_per_kwh = ep?.tariff_per_kwh !== null && ep?.tariff_per_kwh !== undefined ? Number(ep.tariff_per_kwh) : null;
                form.payment_method = ep?.payment_method || '';
                form.meter_type = ep?.meter_type || '';
                form.electricity_notes = ep?.notes || '';
            } else {
                form.name = '';
                form.business_type = '';
                form.city = '';
                form.province = '';
                form.address = '';

                form.room_count = null;
                form.occupied_room_count = null;
                form.employee_count = null;
                form.operating_days_per_month = null;
                form.business_notes = '';

                form.customer_type = '';
                form.power_va = null;
                form.tariff_per_kwh = null;
                form.payment_method = '';
                form.meter_type = '';
                form.electricity_notes = '';
            }
        }
    },
    { immediate: true }
);

const handleUpdateOpen = (val: boolean) => {
    if (!val && !form.processing) {
        emit('close');
    }
};

const submit = () => {
    form.transform((data) => {
        const convertNumeric = (val: any) => {
            if (val === '' || val === null || val === undefined) {
return null;
}

            const num = Number(val);

            return isNaN(num) ? null : num;
        };

        const convertString = (val: any) => {
            if (val === '' || val === null || val === undefined) {
return null;
}

            return String(val).trim();
        };

        return {
            name: convertString(data.name),
            business_type: convertString(data.business_type),
            city: convertString(data.city),
            province: convertString(data.province),
            address: convertString(data.address),

            room_count: convertNumeric(data.room_count),
            occupied_room_count: convertNumeric(data.occupied_room_count),
            employee_count: convertNumeric(data.employee_count),
            operating_days_per_month: convertNumeric(data.operating_days_per_month),
            business_notes: convertString(data.business_notes),

            customer_type: convertString(data.customer_type),
            power_va: convertNumeric(data.power_va),
            tariff_per_kwh: convertNumeric(data.tariff_per_kwh),
            payment_method: convertString(data.payment_method),
            meter_type: convertString(data.meter_type),
            electricity_notes: convertString(data.electricity_notes),
        };
    });

    if (isEdit.value && props.business) {
        form.put(`/businesses/${props.business.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                emit('close');
                form.reset();
            },
        });
    } else {
        form.post('/businesses', {
            preserveScroll: true,
            onSuccess: () => {
                emit('close');
                form.reset();
            },
        });
    }
};
</script>

<template>
    <Dialog :open="open" @update:open="handleUpdateOpen">
        <DialogContent
            class="max-h-[90vh] overflow-y-auto sm:max-w-2xl w-full p-6 flex flex-col gap-6"
            :showCloseButton="!form.processing"
            @escape-key-down="(e) => { if (form.processing) e.preventDefault(); }"
            @pointer-down-outside="(e) => { if (form.processing) e.preventDefault(); }"
            role="dialog"
            aria-modal="true"
        >
            <!-- Title Header -->
            <DialogHeader class="text-left">
                <DialogTitle class="text-xl font-bold text-foreground">
                    {{ isEdit ? 'Edit Usaha atau Properti' : 'Tambah Usaha atau Properti' }}
                </DialogTitle>
                <DialogDescription class="text-sm text-muted-foreground mt-1">
                    {{ isEdit ? 'Perbarui profil dan pengaturan usaha tanpa mengubah data historis.' : 'Lengkapi profil, informasi operasional, dan data kelistrikan lokasi baru.' }}
                </DialogDescription>
            </DialogHeader>

            <!-- Form-level Errors -->
            <div
                v-if="businessLimitError"
                class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3 text-sm text-red-800 dark:text-red-200"
            >
                <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{{ businessLimitError }}</span>
            </div>
            <div
                v-if="businessStatusError"
                class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3 text-sm text-red-800 dark:text-red-200"
            >
                <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{{ businessStatusError }}</span>
            </div>

            <!-- Form Sections -->
            <form @submit.prevent="submit" class="flex flex-col gap-6">
                <!-- SECTION A — Profil Usaha -->
                <div class="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
                    <h3 class="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <Building2 class="h-4 w-4 text-primary" />
                        Profil Usaha / Properti
                    </h3>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <!-- Nama Usaha -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-name" class="text-sm font-medium text-foreground">
                                Nama Usaha atau Properti <span class="text-red-500">*</span>
                            </label>
                            <input
                                id="form-name"
                                type="text"
                                v-model="form.name"
                                maxlength="120"
                                placeholder="Contoh: Kos Sederhana, Resto Lezat, Laundry Cepat"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.name"
                            />
                            <InputError :message="form.errors.name" />
                        </div>

                        <!-- Jenis Usaha -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-business-type" class="text-sm font-medium text-foreground">
                                Jenis Usaha <span class="text-red-500">*</span>
                            </label>
                            <select
                                id="form-business-type"
                                v-model="form.business_type"
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.business_type"
                            >
                                <option value="" disabled>Pilih Kategori</option>
                                <option value="KOS_PROPERTY">Kos / Properti</option>
                                <option value="FNB">Makanan & Minuman</option>
                                <option value="LAUNDRY">Laundry</option>
                                <option value="RETAIL">Ritel</option>
                                <option value="COLD_STORAGE">Penyimpanan Dingin</option>
                                <option value="OTHER">Lainnya</option>
                            </select>
                            <InputError :message="form.errors.business_type" />
                        </div>

                        <!-- Kota -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-city" class="text-sm font-medium text-foreground">Kota/Kabupaten</label>
                            <input
                                id="form-city"
                                type="text"
                                v-model="form.city"
                                placeholder="Contoh: Bandung, Jakarta Selatan"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.city"
                            />
                            <InputError :message="form.errors.city" />
                        </div>

                        <!-- Provinsi -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-province" class="text-sm font-medium text-foreground">Provinsi</label>
                            <input
                                id="form-province"
                                type="text"
                                v-model="form.province"
                                placeholder="Contoh: Jawa Barat, DKI Jakarta"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.province"
                            />
                            <InputError :message="form.errors.province" />
                        </div>

                        <!-- Alamat -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-address" class="text-sm font-medium text-foreground">Alamat</label>
                            <textarea
                                id="form-address"
                                v-model="form.address"
                                placeholder="Tulis alamat fisik properti / usaha..."
                                rows="2"
                                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.address"
                            ></textarea>
                            <InputError :message="form.errors.address" />
                        </div>
                    </div>
                </div>

                <!-- SECTION B — Operasional -->
                <div class="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
                    <h3 class="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <Calendar class="h-4 w-4 text-primary" />
                        Detail Operasional
                    </h3>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <!-- Jumlah Kamar -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-room-count" class="text-sm font-medium text-foreground">Jumlah Kamar/Unit</label>
                            <input
                                id="form-room-count"
                                type="number"
                                v-model="form.room_count"
                                min="0"
                                max="10000"
                                placeholder="Misal: 10"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.room_count"
                            />
                            <span class="text-[11px] text-muted-foreground">Berguna terutama untuk tipe Kos / Properti.</span>
                            <InputError :message="form.errors.room_count" />
                        </div>

                        <!-- Kamar Terisi -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-occupied-room-count" class="text-sm font-medium text-foreground">Kamar/Unit Terisi</label>
                            <input
                                id="form-occupied-room-count"
                                type="number"
                                v-model="form.occupied_room_count"
                                min="0"
                                placeholder="Misal: 8"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.occupied_room_count"
                            />
                            <InputError :message="form.errors.occupied_room_count" />
                        </div>

                        <!-- Jumlah Karyawan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-employee-count" class="text-sm font-medium text-foreground">Jumlah Karyawan</label>
                            <input
                                id="form-employee-count"
                                type="number"
                                v-model="form.employee_count"
                                min="0"
                                max="100000"
                                placeholder="Misal: 2"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.employee_count"
                            />
                            <InputError :message="form.errors.employee_count" />
                        </div>

                        <!-- Hari Operasional per Bulan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-operating-days" class="text-sm font-medium text-foreground">Hari Operasional per Bulan</label>
                            <input
                                id="form-operating-days"
                                type="number"
                                v-model="form.operating_days_per_month"
                                min="1"
                                max="31"
                                placeholder="Misal: 30"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.operating_days_per_month"
                            />
                            <InputError :message="form.errors.operating_days_per_month" />
                        </div>

                        <!-- Catatan Operasional -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-business-notes" class="text-sm font-medium text-foreground">Catatan Operasional</label>
                            <textarea
                                id="form-business-notes"
                                v-model="form.business_notes"
                                placeholder="Catatan jam operasional atau detail properti..."
                                rows="2"
                                maxlength="1000"
                                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.business_notes"
                            ></textarea>
                            <InputError :message="form.errors.business_notes" />
                        </div>
                    </div>
                </div>

                <!-- SECTION C — Kelistrikan -->
                <div class="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
                    <h3 class="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <Zap class="h-4 w-4 text-primary" />
                        Data Kelistrikan
                    </h3>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <!-- Jenis Pelanggan -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-customer-type" class="text-sm font-medium text-foreground">Jenis Pelanggan</label>
                            <input
                                id="form-customer-type"
                                type="text"
                                v-model="form.customer_type"
                                placeholder="Contoh: R1-T / B2"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.customer_type"
                            />
                            <InputError :message="form.errors.customer_type" />
                        </div>

                        <!-- Daya Terpasang -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-power-va" class="text-sm font-medium text-foreground">Daya Terpasang (VA)</label>
                            <input
                                id="form-power-va"
                                type="number"
                                v-model="form.power_va"
                                min="450"
                                max="200000"
                                placeholder="Contoh: 1300, 2200, 4400"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.power_va"
                            />
                            <InputError :message="form.errors.power_va" />
                        </div>

                        <!-- Tarif per kWh -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-tariff" class="text-sm font-medium text-foreground">Tarif per kWh yang Digunakan</label>
                            <input
                                id="form-tariff"
                                type="number"
                                v-model="form.tariff_per_kwh"
                                min="0"
                                max="10000"
                                step="any"
                                placeholder="Contoh: 1444, 1699"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.tariff_per_kwh"
                            />
                            <span class="text-[11px] text-muted-foreground">Tarif listrik yang dibebankan per kWh.</span>
                            <InputError :message="form.errors.tariff_per_kwh" />
                        </div>

                        <!-- Metode Pembayaran -->
                        <div class="flex flex-col gap-1.5">
                            <label for="form-payment-method" class="text-sm font-medium text-foreground">Metode Pembayaran</label>
                            <select
                                id="form-payment-method"
                                v-model="form.payment_method"
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.payment_method"
                            >
                                <option value="">Pilih Metode</option>
                                <option value="PRABAYAR">Prabayar (Token)</option>
                                <option value="PASCABAYAR">Pascabayar (Tagihan Bulanan)</option>
                            </select>
                            <InputError :message="form.errors.payment_method" />
                        </div>

                        <!-- Jenis Meteran -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-meter-type" class="text-sm font-medium text-foreground">Jenis Meteran</label>
                            <input
                                id="form-meter-type"
                                type="text"
                                v-model="form.meter_type"
                                placeholder="Contoh: Prabayar Digital, Pascabayar Analog"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.meter_type"
                            />
                            <InputError :message="form.errors.meter_type" />
                        </div>

                        <!-- Catatan Kelistrikan -->
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label for="form-electricity-notes" class="text-sm font-medium text-foreground">Catatan Kelistrikan</label>
                            <textarea
                                id="form-electricity-notes"
                                v-model="form.electricity_notes"
                                placeholder="Catatan spesifik tentang pembagian meteran atau riwayat daya..."
                                rows="2"
                                maxlength="1000"
                                class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                :disabled="form.processing"
                                :aria-invalid="!!form.errors.electricity_notes"
                            ></textarea>
                            <InputError :message="form.errors.electricity_notes" />
                        </div>
                    </div>
                </div>

                <!-- Dialog Footer Buttons -->
                <DialogFooter class="flex flex-row gap-2 justify-end mt-4 border-t border-border pt-4">
                    <button
                        type="button"
                        @click="emit('close')"
                        :disabled="form.processing"
                        class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        :disabled="form.processing"
                        class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {{ form.processing ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan Usaha') }}
                    </button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
