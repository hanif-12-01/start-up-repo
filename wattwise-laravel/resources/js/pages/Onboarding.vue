<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ClipboardList, ArrowLeft, Building2, Zap, Calendar } from '@lucide/vue';
import { computed } from 'vue';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Onboarding',
                href: '/onboarding',
            },
        ],
    },
});

const form = useForm({
    name: '',
    business_type: '',
    city: '',
    province: '',
    address: '',
    customer_type: '',
    power_va: null as number | null,
    tariff_per_kwh: null as number | null,
    payment_method: '',
    room_count: null as number | null,
    occupied_room_count: null as number | null,
    operating_days_per_month: 30,
});

const showRoomFields = computed(() => form.business_type === 'KOS_PROPERTY');

const submit = () => {
    form.post('/onboarding', {
        preserveScroll: true,
    });
};
</script>

<template>
    <Head title="Onboarding WattWise" />

    <div class="flex flex-1 flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col gap-2">
            <Link href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft class="h-4 w-4" />
                Kembali ke Beranda
            </Link>
            <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ClipboardList class="h-8 w-8 text-primary" /> Mulai dari Data Dasar
            </h1>
            <p class="text-muted-foreground text-base">
                Isi yang Anda tahu dulu. Data ini bisa diubah nanti.
            </p>
        </div>

        <form @submit.prevent="submit" class="flex flex-col gap-6">
            <!-- Section 1: Profil Usaha -->
            <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Building2 class="h-5 w-5 text-primary" /> 1. Informasi Usaha & Lokasi
                </h2>

                <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Nama Usaha -->
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="name" class="text-sm font-medium text-foreground">Nama Usaha / Properti <span class="text-red-500">*</span></label>
                        <input 
                            id="name" 
                            type="text" 
                            v-model="form.name" 
                            placeholder="Contoh: Kos Sederhana, Resto Lezat, Laundry Cepat" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span v-if="form.errors.name" class="text-xs text-red-500 font-medium">{{ form.errors.name }}</span>
                    </div>

                    <!-- Jenis Usaha -->
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="business_type" class="text-sm font-medium text-foreground">Jenis Usaha <span class="text-red-500">*</span></label>
                        <select 
                            id="business_type" 
                            v-model="form.business_type"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Pilih Kategori</option>
                            <option value="KOS_PROPERTY">Kos / Properti</option>
                            <option value="FNB">Warung / F&B</option>
                            <option value="LAUNDRY">Laundry</option>
                            <option value="RETAIL">Toko / Retail</option>
                            <option value="COLD_STORAGE">Cold Storage</option>
                            <option value="OTHER">Lainnya</option>
                        </select>
                        <span v-if="form.errors.business_type" class="text-xs text-red-500 font-medium">{{ form.errors.business_type }}</span>
                    </div>

                    <!-- Kota -->
                    <div class="flex flex-col gap-1.5">
                        <label for="city" class="text-sm font-medium text-foreground">Kota / Kabupaten</label>
                        <input 
                            id="city" 
                            type="text" 
                            v-model="form.city" 
                            placeholder="Contoh: Bandung, Jakarta Selatan" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.city" class="text-xs text-red-500 font-medium">{{ form.errors.city }}</span>
                    </div>

                    <!-- Provinsi -->
                    <div class="flex flex-col gap-1.5">
                        <label for="province" class="text-sm font-medium text-foreground">Provinsi</label>
                        <input 
                            id="province" 
                            type="text" 
                            v-model="form.province" 
                            placeholder="Contoh: Jawa Barat, DKI Jakarta" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.province" class="text-xs text-red-500 font-medium">{{ form.errors.province }}</span>
                    </div>

                    <!-- Alamat Lengkap -->
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="address" class="text-sm font-medium text-foreground">Alamat Lengkap</label>
                        <textarea 
                            id="address" 
                            v-model="form.address" 
                            placeholder="Tulis alamat fisik properti / usaha..." 
                            rows="2"
                            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        ></textarea>
                        <span v-if="form.errors.address" class="text-xs text-red-500 font-medium">{{ form.errors.address }}</span>
                    </div>
                </div>
            </div>

            <!-- Section 2: Detail Operasional -->
            <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Calendar class="h-5 w-5 text-primary" /> 2. Operasional Bisnis
                </h2>

                <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Hari Operasional -->
                    <div class="flex flex-col gap-1.5">
                        <label for="operating_days_per_month" class="text-sm font-medium text-foreground">Hari Kerja per Bulan</label>
                        <input 
                            id="operating_days_per_month" 
                            type="number" 
                            v-model="form.operating_days_per_month" 
                            placeholder="30" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.operating_days_per_month" class="text-xs text-red-500 font-medium">{{ form.errors.operating_days_per_month }}</span>
                    </div>

                    <!-- Conditional Room Fields for Kos / Properti -->
                    <template v-if="showRoomFields">
                        <div class="flex flex-col gap-1.5">
                            <label for="room_count" class="text-sm font-medium text-foreground">Jumlah Kamar Total</label>
                            <input 
                                id="room_count" 
                                type="number" 
                                v-model="form.room_count" 
                                placeholder="Misal: 10" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.room_count" class="text-xs text-red-500 font-medium">{{ form.errors.room_count }}</span>
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <label for="occupied_room_count" class="text-sm font-medium text-foreground">Jumlah Kamar Terisi</label>
                            <input 
                                id="occupied_room_count" 
                                type="number" 
                                v-model="form.occupied_room_count" 
                                placeholder="Misal: 8" 
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <span v-if="form.errors.occupied_room_count" class="text-xs text-red-500 font-medium">{{ form.errors.occupied_room_count }}</span>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Section 3: Profil Listrik -->
            <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                <h2 class="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Zap class="h-5 w-5 text-primary" /> 3. Profil Listrik (Opsional)
                </h2>

                <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Kapasitas Listrik (VA) -->
                    <div class="flex flex-col gap-1.5">
                        <label for="power_va" class="text-sm font-medium text-foreground">Kapasitas Listrik PLN (VA)</label>
                        <input 
                            id="power_va" 
                            type="number" 
                            v-model="form.power_va" 
                            placeholder="Contoh: 1300, 2200, 4400" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.power_va" class="text-xs text-red-500 font-medium">{{ form.errors.power_va }}</span>
                    </div>

                    <!-- Tarif per kWh -->
                    <div class="flex flex-col gap-1.5">
                        <label for="tariff_per_kwh" class="text-sm font-medium text-foreground">Tarif Listrik per kWh (Rp)</label>
                        <input 
                            id="tariff_per_kwh" 
                            type="number" 
                            v-model="form.tariff_per_kwh" 
                            placeholder="Contoh: 1444, 1699" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.tariff_per_kwh" class="text-xs text-red-500 font-medium">{{ form.errors.tariff_per_kwh }}</span>
                    </div>

                    <!-- Golongan Tarif / Customer Type -->
                    <div class="flex flex-col gap-1.5">
                        <label for="customer_type" class="text-sm font-medium text-foreground">Golongan Tarif PLN</label>
                        <input 
                            id="customer_type" 
                            type="text" 
                            v-model="form.customer_type" 
                            placeholder="Contoh: R1-T / B2" 
                            class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span v-if="form.errors.customer_type" class="text-xs text-red-500 font-medium">{{ form.errors.customer_type }}</span>
                    </div>

                    <!-- Metode Pembayaran -->
                    <div class="flex flex-col gap-1.5">
                        <label for="payment_method" class="text-sm font-medium text-foreground">Metode Bayar Listrik</label>
                        <select 
                            id="payment_method" 
                            v-model="form.payment_method"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">Pilih Metode</option>
                            <option value="PRABAYAR">Prabayar (Token)</option>
                            <option value="PASCABAYAR">Pascabayar (Tagihan Bulanan)</option>
                        </select>
                        <span v-if="form.errors.payment_method" class="text-xs text-red-500 font-medium">{{ form.errors.payment_method }}</span>
                    </div>
                </div>
            </div>

            <!-- Submit buttons and notice -->
            <div class="flex flex-col gap-3">
                <p class="text-xs text-muted-foreground text-center">
                    ⚠️ Tidak perlu sempurna. WattWise bisa tetap berjalan dengan data dasar.
                </p>

                <div class="flex flex-col sm:flex-row gap-3 justify-end mt-2">
                    <Link 
                        href="/dashboard"
                        class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors text-center"
                    >
                        Lewati Dulu
                    </Link>
                    <button 
                        type="submit" 
                        :disabled="form.processing"
                        class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 text-center"
                    >
                        {{ form.processing ? 'Menyimpan...' : 'Simpan dan Lanjut ke Dashboard' }}
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>
