<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import {
    AlertTriangle,
    ArrowLeft,
    BrainCircuit,
    CheckCircle2,
    Clock3,
    Database,
    Play,
    RefreshCw,
    ShieldCheck,
    XCircle,
} from '@lucide/vue';
import { computed, ref } from 'vue';

interface RegisteredModel {
    key: string;
    version: string;
    execution_status: string;
    artifact_sha256: string | null;
}

interface ModelResult {
    model_key: string;
    model_version: string;
    execution_mode: string;
    status: string;
    predicted_usage_kwh: number | null;
    predicted_bill_idr: number | null;
    duration_ms: number | null;
    artifact_sha256: string | null;
    skip_reason: string | null;
    failure_code: string | null;
}

interface Scenario {
    scenario_key: string;
    business_id: number | null;
    business_name: string;
    business_type: string;
    configured_history_months: number;
    actual_history_months: number;
    expected_phase: string;
    detected_phase: string | null;
    expected_model_key: string;
    expected_model_label: string;
    expected_model_registered: boolean;
    phase_match: boolean;
    history_match: boolean;
    proof_status: string;
    latest_run: {
        id: number;
        target_period: string;
        history_bucket: string;
        generated_at: string | null;
    } | null;
    model_results: ModelResult[];
}

const props = defineProps<{
    demoAccount: {
        email: string;
        scenario_count: number;
    };
    flags: {
        demo_enabled: boolean;
        ml_validation_enabled: boolean;
        shadow_enabled: boolean;
        ridge_enabled: boolean;
        gradient_boosting_enabled: boolean;
        adaptive_router_enabled: boolean;
    };
    registeredModels: RegisteredModel[];
    scenarios: Scenario[];
    summary: {
        successful_scenarios: number;
        total_scenarios: number;
        missing_portfolio_models: string[];
        new_portfolio_fully_integrated: boolean;
    };
}>();

const running = ref(false);

const missingModelsLabel = computed(() => {
    if (props.summary.missing_portfolio_models.length === 0) {
        return 'Tidak ada';
    }

    return props.summary.missing_portfolio_models.join(', ');
});

const runValidation = () => {
    router.post('/internal/ml-validation/run', {}, {
        preserveScroll: true,
        onStart: () => {
            running.value = true;
        },
        onFinish: () => {
            running.value = false;
        },
    });
};

const formatKwh = (value: number | null) => {
    if (value === null) {
        return '-';
    }

    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kWh`;
};

const formatLatency = (value: number | null) => {
    if (value === null) {
        return '-';
    }

    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ms`;
};

const proofLabel = (status: string) => {
    const labels: Record<string, string> = {
        SUCCESS: 'Berhasil',
        SKIPPED: 'Dilewati',
        FAILED: 'Gagal',
        MISSING_BUSINESS: 'Bisnis belum disemai',
        PHASE_MISMATCH: 'Fase tidak cocok',
        PORTFOLIO_MODEL_NOT_REGISTERED: 'Model portfolio belum terdaftar',
        H00_SERVING_CONTRACT_REQUIRED: 'Kontrak serving H00 belum tersedia',
        WAITING_FOR_SHADOW_RUN: 'Menunggu shadow run',
        EXPECTED_MODEL_RESULT_MISSING: 'Hasil model yang diharapkan tidak ada',
    };

    return labels[status] ?? status;
};

const proofClass = (status: string) => {
    if (status === 'SUCCESS') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
    }

    if (status === 'FAILED' || status === 'PHASE_MISMATCH' || status === 'MISSING_BUSINESS') {
        return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300';
    }

    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
};

const resultClass = (status: string) => {
    if (status === 'SUCCESS') {
        return 'text-emerald-600 dark:text-emerald-400';
    }

    if (status === 'FAILED') {
        return 'text-red-600 dark:text-red-400';
    }

    return 'text-amber-600 dark:text-amber-400';
};

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Beranda', href: '/dashboard' },
            { title: 'Validasi ML Demo', href: '/internal/ml-validation' },
        ],
    },
});
</script>

<template>
    <Head title="Validasi ML Demo" />

    <div class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
        <div class="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3">
                    <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BrainCircuit class="h-6 w-6" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-foreground">Validasi Integrasi Model AI</h1>
                        <p class="text-sm text-muted-foreground">Satu akun demo dengan lima fase histori untuk membuktikan routing, inference, dan fallback.</p>
                    </div>
                </div>
                <span class="text-xs text-muted-foreground">Akun: {{ demoAccount.email }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <Link
                    href="/dashboard"
                    class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                    <ArrowLeft class="h-4 w-4" /> Kembali
                </Link>
                <button
                    type="button"
                    :disabled="running || !flags.shadow_enabled"
                    class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="runValidation"
                >
                    <RefreshCw v-if="running" class="h-4 w-4 animate-spin" />
                    <Play v-else class="h-4 w-4" />
                    {{ running ? 'Menjalankan...' : 'Jalankan Shadow Validation' }}
                </button>
            </div>
        </div>

        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <div class="flex items-start gap-3">
                <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
                <div class="space-y-1">
                    <p class="font-semibold">Halaman ini tidak otomatis mengaktifkan model baru untuk pengguna.</p>
                    <p>
                        Ia membandingkan portfolio yang diharapkan dengan model yang benar-benar terdaftar di Laravel. LightGBM atau N-BEATS yang belum terdaftar akan tampil sebagai gap integrasi, bukan dipalsukan sebagai sukses.
                    </p>
                </div>
            </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-border bg-card p-4">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skenario</span>
                <div class="mt-2 text-2xl font-bold text-foreground">{{ summary.total_scenarios }}</div>
                <p class="mt-1 text-xs text-muted-foreground">H00 sampai H13_PLUS</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Berhasil dibuktikan</span>
                <div class="mt-2 text-2xl font-bold text-foreground">{{ summary.successful_scenarios }}/{{ summary.total_scenarios }}</div>
                <p class="mt-1 text-xs text-muted-foreground">Expected model menghasilkan SUCCESS</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model runtime</span>
                <div class="mt-2 text-2xl font-bold text-foreground">{{ registeredModels.length }}</div>
                <p class="mt-1 text-xs text-muted-foreground">Terdaftar di ModelRegistry Laravel</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Portfolio siap UI</span>
                <div class="mt-2 flex items-center gap-2 text-lg font-bold" :class="summary.new_portfolio_fully_integrated ? 'text-emerald-600' : 'text-amber-600'">
                    <CheckCircle2 v-if="summary.new_portfolio_fully_integrated" class="h-5 w-5" />
                    <XCircle v-else class="h-5 w-5" />
                    {{ summary.new_portfolio_fully_integrated ? 'Ya' : 'Belum' }}
                </div>
                <p class="mt-1 text-xs text-muted-foreground">Model belum ada: {{ missingModelsLabel }}</p>
            </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
            <section class="rounded-xl border border-border bg-card p-5">
                <div class="mb-4 flex items-center gap-2">
                    <ShieldCheck class="h-5 w-5 text-primary" />
                    <h2 class="font-semibold text-foreground">Feature flags</h2>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                    <div v-for="(enabled, key) in flags" :key="key" class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span class="font-mono text-xs text-muted-foreground">{{ key }}</span>
                        <span :class="enabled ? 'text-emerald-600' : 'text-muted-foreground'">{{ enabled ? 'ON' : 'OFF' }}</span>
                    </div>
                </div>
            </section>

            <section class="rounded-xl border border-border bg-card p-5">
                <div class="mb-4 flex items-center gap-2">
                    <Database class="h-5 w-5 text-primary" />
                    <h2 class="font-semibold text-foreground">Model yang terdaftar</h2>
                </div>
                <div class="space-y-3">
                    <div v-for="model in registeredModels" :key="model.key" class="rounded-lg border border-border p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p class="font-mono text-sm font-semibold text-foreground">{{ model.key }}</p>
                                <p class="text-xs text-muted-foreground">{{ model.version }}</p>
                            </div>
                            <span class="rounded-full border border-border px-2.5 py-1 text-xs font-medium">{{ model.execution_status }}</span>
                        </div>
                        <p class="mt-2 break-all font-mono text-[10px] text-muted-foreground">{{ model.artifact_sha256 ?? 'No artifact checksum (deterministic)' }}</p>
                    </div>
                </div>
            </section>
        </div>

        <section class="space-y-4">
            <div>
                <h2 class="text-lg font-semibold text-foreground">Lima kasus validasi</h2>
                <p class="text-sm text-muted-foreground">Fase harus cocok lebih dulu; setelah itu expected model harus terdaftar dan menghasilkan SUCCESS.</p>
            </div>

            <article v-for="scenario in scenarios" :key="scenario.scenario_key" class="rounded-xl border border-border bg-card p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="space-y-2">
                        <div class="flex flex-wrap items-center gap-2">
                            <h3 class="font-semibold text-foreground">{{ scenario.business_name }}</h3>
                            <span class="rounded-full border px-2.5 py-1 text-xs font-semibold" :class="proofClass(scenario.proof_status)">
                                {{ proofLabel(scenario.proof_status) }}
                            </span>
                        </div>
                        <p class="text-xs text-muted-foreground">{{ scenario.business_type }} · ID {{ scenario.business_id ?? '-' }}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                        <div>
                            <span class="block text-xs text-muted-foreground">Histori</span>
                            <strong class="text-foreground">{{ scenario.actual_history_months }} bulan</strong>
                        </div>
                        <div>
                            <span class="block text-xs text-muted-foreground">Fase</span>
                            <strong :class="scenario.phase_match ? 'text-emerald-600' : 'text-red-600'">{{ scenario.detected_phase ?? '-' }}</strong>
                        </div>
                        <div>
                            <span class="block text-xs text-muted-foreground">Expected model</span>
                            <strong class="text-foreground">{{ scenario.expected_model_label }}</strong>
                        </div>
                        <div>
                            <span class="block text-xs text-muted-foreground">Terdaftar</span>
                            <strong :class="scenario.expected_model_registered ? 'text-emerald-600' : 'text-amber-600'">{{ scenario.expected_model_registered ? 'Ya' : 'Belum' }}</strong>
                        </div>
                    </div>
                </div>

                <div v-if="scenario.latest_run" class="mt-4 flex flex-wrap gap-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <span>Target: <strong class="text-foreground">{{ scenario.latest_run.target_period }}</strong></span>
                    <span>Bucket: <strong class="text-foreground">{{ scenario.latest_run.history_bucket }}</strong></span>
                    <span>Run ID: <strong class="text-foreground">{{ scenario.latest_run.id }}</strong></span>
                </div>

                <div v-if="scenario.model_results.length > 0" class="mt-4 overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="border-b border-border text-xs uppercase text-muted-foreground">
                            <tr>
                                <th class="px-3 py-2">Model</th>
                                <th class="px-3 py-2">Status</th>
                                <th class="px-3 py-2">Prediksi</th>
                                <th class="px-3 py-2">Latency</th>
                                <th class="px-3 py-2">Alasan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="result in scenario.model_results" :key="`${scenario.scenario_key}-${result.model_key}`" class="border-b border-border/60 last:border-0">
                                <td class="px-3 py-3">
                                    <div class="font-mono text-xs font-semibold text-foreground">{{ result.model_key }}</div>
                                    <div class="text-[10px] text-muted-foreground">{{ result.execution_mode }}</div>
                                </td>
                                <td class="px-3 py-3 font-semibold" :class="resultClass(result.status)">{{ result.status }}</td>
                                <td class="px-3 py-3 text-foreground">{{ formatKwh(result.predicted_usage_kwh) }}</td>
                                <td class="px-3 py-3 text-foreground">
                                    <span class="inline-flex items-center gap-1"><Clock3 class="h-3.5 w-3.5" />{{ formatLatency(result.duration_ms) }}</span>
                                </td>
                                <td class="px-3 py-3 text-xs text-muted-foreground">{{ result.skip_reason ?? result.failure_code ?? '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else class="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Belum ada hasil shadow untuk skenario ini.
                </div>
            </article>
        </section>
    </div>
</template>
