<script setup lang="ts">
const proofItems = [
    {
        capability: 'Dashboard',
        image: '/images/landing/dashboard-overview.webp',
        alt: 'Dashboard WattWise dengan ringkasan pemakaian, biaya, dan konteks usaha.',
        outcome:
            'Melihat ringkasan listrik dan konteks usaha dalam satu tempat.',
        note: 'Ringkasan mengikuti data usaha aktif yang dimasukkan pengguna.',
    },
    {
        capability: 'Input listrik + bantuan OCR opsional',
        image: '/images/landing/electricity-input.webp',
        alt: 'Form aktual WattWise untuk memasukkan data listrik bulanan.',
        outcome:
            'Menyusun catatan tagihan, token, kWh, atau meter reading per periode.',
        note: 'OCR dapat membantu input ketika diaktifkan, tetapi hasilnya wajib diverifikasi. Input bukan data resmi PLN.',
    },
    {
        capability: 'Prediksi dan analisis',
        image: '/images/landing/prediction-analysis.webp',
        alt: 'Halaman prediksi WattWise dengan estimasi pemakaian dan biaya.',
        outcome:
            'Meninjau tren dan perkiraan periode berikutnya sebagai bahan perencanaan.',
        note: 'Hasil adalah estimasi berdasarkan data yang dimasukkan, bukan jaminan.',
    },
    {
        capability: 'Rekomendasi',
        image: '/images/landing/recommendations.webp',
        alt: 'Halaman rekomendasi WattWise dengan kandidat pemeriksaan dan tindakan.',
        outcome: 'Menyusun apa yang layak ditinjau lebih dahulu.',
        note: 'Rekomendasi adalah bantuan pengambilan keputusan dan memerlukan verifikasi manual.',
    },
    {
        capability: 'Laporan',
        image: '/images/landing/reports.webp',
        alt: 'Halaman laporan WattWise dengan ringkasan bulanan dan opsi ekspor.',
        outcome: 'Membawa catatan yang lebih rapi ke evaluasi bulanan.',
        note: 'PDF dan CSV mengikuti akses paket; estimasi bukan tagihan resmi.',
    },
];
</script>

<template>
    <section id="bukti-produk" class="bg-[#f7f4ec] py-20 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
                data-reveal-group
                class="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end"
            >
                <div>
                    <p
                        class="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase"
                    >
                        Bukti produk
                    </p>
                    <h2
                        class="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#0F172A] sm:text-5xl"
                    >
                        Lihat produknya. Baca batasannya.
                    </h2>
                </div>
                <p
                    class="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end"
                >
                    Setiap layar di bawah berasal dari aplikasi WattWise yang
                    berjalan. Tidak ada hasil pelanggan, statistik keberhasilan,
                    atau layar rekaan.
                </p>
            </div>

            <div class="mt-14 grid gap-6 lg:grid-cols-2">
                <article
                    v-for="item in proofItems"
                    :key="item.capability"
                    data-proof-card
                    class="overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-[0_20px_55px_rgba(15,42,45,0.07)]"
                >
                    <img
                        :src="item.image"
                        width="1440"
                        height="900"
                        :alt="item.alt"
                        class="aspect-[16/10] w-full border-b border-slate-900/10 object-cover object-top"
                        loading="lazy"
                        decoding="async"
                    />
                    <div class="p-6 sm:p-8">
                        <p
                            class="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase"
                        >
                            {{ item.capability }}
                        </p>
                        <h3
                            class="mt-3 text-2xl leading-snug font-semibold tracking-[-0.03em] text-[#0F172A]"
                        >
                            {{ item.outcome }}
                        </h3>
                        <p class="mt-4 text-sm leading-6 text-slate-600">
                            {{ item.note }}
                        </p>
                    </div>
                </article>
            </div>
        </div>
    </section>
</template>
