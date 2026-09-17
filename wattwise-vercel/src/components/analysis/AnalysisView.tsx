'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Lightbulb,
  LineChart,
  LockKeyhole,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { TrendChart, type TrendPoint } from '@/components/analysis/TrendChart';
import {
  BusinessSelector,
  DataNotice,
  EmptyState,
  MetricCard,
  SectionHeader,
  SoftCard,
  StatusBadge,
  Surface,
  WorkspaceHeader,
  WorkspacePage,
  primaryButton,
} from '@/components/product/WorkspaceUI';
import { decimal, formatMonth, rupiah } from '@/lib/format';
import { Simulator } from '@/app/(product)/predictions/Simulator';
import type { EmbeddedForecastPlan } from '@/server/services/product-analysis';
import type { PredictionResult } from '@/server/services/product-analysis';
import { runEmbeddedNBeatsInference } from '@/lib/ai/embedded-nbeats';
import {
  deriveDisplayedPrediction,
  getDataReadinessStatus,
  getRuntimePredictionStatus,
} from '@/lib/ai/prediction-display';
import {
  getOwnerFacingHealthStatus,
  getOwnerFacingPredictionLabel,
  getOwnerFacingPredictionMethod,
  formatPatternComparison,
  ENERGY_CONDITION_DISCLAIMER,
} from '@/lib/presentation';
import {
  getOwnerFacingTariffLabel,
  resolveTariffContext,
  type TariffContext,
} from '@/lib/tariff';
import {
  buildElectricityCompleteness,
  findHighestRecordedCost,
  buildElectricityInsightSummary,
} from '@/lib/electricity-insights';
import type { BillRecord } from '@/server/repositories/bill.repository';

const tabs = [
  ['overview', Gauge, 'Ringkasan'],
  ['trend', LineChart, 'Tren'],
  ['anomaly', AlertTriangle, 'Kondisi Pemakaian'],
  ['forecast', TrendingUp, 'Proyeksi'],
  ['recommendations', Lightbulb, 'Rekomendasi'],
  ['simulator', SlidersHorizontal, 'Simulasi'],
] as const;

interface BusinessSummary {
  id: string;
  name: string;
  businessType: string;
  tariffRupiahPerKwh?: string | null;
}

interface BillSummary {
  totalAmountRupiah: bigint | number;
  periodEnd: string;
  tariffRupiahPerKwh?: string | null;
}

interface ApplianceSummary {
  name: string;
  powerWatts: number | null;
}

interface DecisionSupportData {
  business: BusinessSummary;
  businesses: BusinessSummary[];
  bills?: Array<{
    id: string;
    businessId?: string;
    periodStart: string;
    periodEnd: string;
    totalAmountRupiah: bigint | number;
    kwh?: string | null;
    tariffRupiahPerKwh?: string | null;
  }>;
  latestBill: BillSummary | null;
  appliances: ApplianceSummary[];
}

interface AnalysisViewProps {
  data: DecisionSupportData;
  tariff: number | null;
  tariffContext?: TariffContext;
  samples: Array<{ period: string; usageKwh: number | null; billAmount: number; tariff: number | null }>;
  forecastPlan: EmbeddedForecastPlan;
  anomaly: {
    hasData: boolean;
    status: string;
    baseline: number | null;
    observed: number | null;
    differencePercent: number | null;
  };
  score: {
    score: number | null;
    label: string;
    confidence: string;
  };
  recommendations: Array<{
    id: string;
    priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
    title: string;
    reason: string;
    limitation: string;
    nextAction: string;
  }>;
  entitlements: {
    limits: {
      detailedAnalysis: boolean;
    };
  };
  activeTab: string;
  businessQuery: string;
}

interface AiPredictionState {
  prediction: PredictionResult;
  sourceLabel: string;
  displayedEngine: string;
  modelVersion: string | null;
  fallbackUsed: boolean;
  latencyMs: number | null;
}

export function AnalysisView({
  data,
  tariff,
  tariffContext,
  samples,
  forecastPlan,
  anomaly,
  score,
  recommendations,
  entitlements,
  activeTab,
  businessQuery,
}: AnalysisViewProps) {
  const [aiPrediction, setAiPrediction] = useState<AiPredictionState | null>(null);
  const [isInferring, setIsInferring] = useState<boolean>(forecastPlan.eligible && Boolean(forecastPlan.history6m));

  useEffect(() => {
    if (!forecastPlan.eligible || !forecastPlan.history6m) {
      return;
    }

    let cancelled = false;

    runEmbeddedNBeatsInference(forecastPlan.history6m)
      .then((res) => {
        if (cancelled) return;
        const updated = deriveDisplayedPrediction(
          forecastPlan.deterministicPrediction,
          res.predictionKwh,
          tariff,
          forecastPlan.continuousHistoryMonths,
          'nbeats'
        );
        setAiPrediction({
          prediction: updated,
          sourceLabel: forecastPlan.phaseLabel,
          displayedEngine: 'nbeats',
          modelVersion: res.modelVersion,
          fallbackUsed: false,
          latencyMs: res.latencyMs,
        });
        setIsInferring(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAiPrediction({
          prediction: forecastPlan.deterministicPrediction,
          sourceLabel: 'Prediksi aman berdasarkan histori tersedia',
          displayedEngine: 'deterministic_baseline',
          modelVersion: null,
          fallbackUsed: true,
          latencyMs: null,
        });
        setIsInferring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forecastPlan, tariff]);

  const prediction = aiPrediction ? aiPrediction.prediction : forecastPlan.deterministicPrediction;
  const sourceLabel = aiPrediction ? aiPrediction.sourceLabel : forecastPlan.sourceLabel;
  const displayedEngine = aiPrediction ? aiPrediction.displayedEngine : forecastPlan.requestedEngine;
  const modelVersion = aiPrediction ? aiPrediction.modelVersion : forecastPlan.modelVersion;
  const fallbackUsed = aiPrediction ? aiPrediction.fallbackUsed : false;
  const inferenceLatencyMs = aiPrediction ? aiPrediction.latencyMs : null;

  const dataReadiness = getDataReadinessStatus(forecastPlan.continuousHistoryMonths);
  const runtimeStatus = getRuntimePredictionStatus({
    eligible: forecastPlan.eligible,
    continuousHistoryMonths: forecastPlan.continuousHistoryMonths,
    isInferring,
    displayedEngine,
    fallbackUsed,
    hasAiPrediction: Boolean(aiPrediction && !aiPrediction.fallbackUsed),
  });

  // Sorted bills for dual electricity signals
  const rawBills = data.bills ?? [];
  const sortedBills = [...rawBills].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  // Data completeness, Highest cost context, and Insight Bridge
  const completeness = buildElectricityCompleteness(
    sortedBills.length > 0
      ? sortedBills.map((b) => ({ totalAmountRupiah: b.totalAmountRupiah, kwh: b.kwh }))
      : samples.map((s) => ({ totalAmountRupiah: s.billAmount, kwh: s.usageKwh }))
  );
  const highestCost = findHighestRecordedCost(
    sortedBills.length > 0
      ? sortedBills
      : samples.map((s) => ({
          id: s.period,
          periodEnd: s.period,
          totalAmountRupiah: BigInt(s.billAmount),
          kwh: s.usageKwh,
        }))
  );

  const currentBill = sortedBills.length > 0 ? (sortedBills[sortedBills.length - 1] as unknown as BillRecord) : null;
  const prevBill = sortedBills.length > 1 ? (sortedBills[sortedBills.length - 2] as unknown as BillRecord) : null;
  const insightBridge = buildElectricityInsightSummary(currentBill, prevBill);

  // Sinyal 1: Cost Points (All valid bills with cost appear, even if kWh is null)
  const costPoints: TrendPoint[] =
    sortedBills.length > 0
      ? sortedBills.map((b) => ({
          period: b.periodEnd,
          label: formatMonth(b.periodEnd),
          usageKwh: b.kwh === null || b.kwh === undefined ? null : Number(b.kwh),
          billAmount: Number(b.totalAmountRupiah),
          tariff:
            b.tariffRupiahPerKwh === null || b.tariffRupiahPerKwh === undefined
              ? null
              : Number(b.tariffRupiahPerKwh),
          type: 'historical' as const,
        }))
      : samples.map((s) => ({
          period: s.period,
          label: formatMonth(s.period),
          usageKwh: s.usageKwh,
          billAmount: s.billAmount,
          tariff: s.tariff,
          type: 'historical' as const,
        }));

  // Sinyal 2: Usage Points (Only legitimate recorded kWh, missing remains null)
  const usageHistoricalPoints: TrendPoint[] =
    sortedBills.length > 0
      ? sortedBills.map((b) => ({
          period: b.periodEnd,
          label: formatMonth(b.periodEnd),
          usageKwh: b.kwh === null || b.kwh === undefined ? null : Number(b.kwh),
          billAmount: Number(b.totalAmountRupiah),
          tariff:
            b.tariffRupiahPerKwh === null || b.tariffRupiahPerKwh === undefined
              ? null
              : Number(b.tariffRupiahPerKwh),
          type: 'historical' as const,
        }))
      : samples.map((s) => ({
          period: s.period,
          label: formatMonth(s.period),
          usageKwh: s.usageKwh,
          billAmount: s.billAmount,
          tariff: s.tariff,
          type: 'historical' as const,
        }));

  const usageTrendPoints: TrendPoint[] = [...usageHistoricalPoints];
  if (!isInferring && prediction.hasPrediction && prediction.predictedUsageKwh !== null) {
    usageTrendPoints.push({
      period: forecastPlan.targetPeriod,
      label: formatMonth(forecastPlan.targetPeriod),
      usageKwh: prediction.predictedUsageKwh,
      billAmount: prediction.estimatedBill,
      tariff,
      type: 'forecast' as const,
    });
  }

  // Priority action recommendation
  const primaryAction = !data.latestBill
    ? {
        title: 'Catat Tagihan Listrik Periode Terkini',
        desc: 'Tagihan adalah fondasi utama untuk analisis tren dan deteksi anomali.',
        href: `/bills?${businessQuery}`,
        btnText: 'Tambah Tagihan',
      }
    : anomaly.status !== 'Normal' && anomaly.status !== 'Data belum cukup'
      ? {
          title: `Indikasi Perubahan Biaya (${anomaly.status})`,
          desc: `Pemakaian tercatat naik ${decimal.format(Math.abs(anomaly.differencePercent ?? 0))}% dibanding baseline. Jalankan Cek Kenaikan untuk pemeriksaan terstruktur.`,
          href: `/diagnostics?${businessQuery}`,
          btnText: 'Jalankan Cek Kenaikan',
        }
      : {
          title: 'Ruang Kerja Terorganisir Dengan Baik',
          desc: 'Data tagihan Anda teratur. Anda dapat mensimulasikan tambahan peralatan atau meninjau laporan bulanan.',
          href: `/predictions?${businessQuery}`,
          btnText: 'Buka Simulator',
        };

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Pusat analisis"
        title="Analisis biaya dan pemakaian"
        description="Satu tempat terpadu untuk membaca tren historis, indikasi anomali, prediksi WattWise, rekomendasi prioritas, dan simulasi skenario."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/analysis" />
            <StatusBadge
              variant={
                (tariffContext?.value ?? tariff) !== null ? 'info' : 'neutral'
              }
            >
              {getOwnerFacingTariffLabel(
                tariffContext ??
                  resolveTariffContext({
                    businessTariff: data.business.tariffRupiahPerKwh,
                    latestBillTariff: data.latestBill?.tariffRupiahPerKwh,
                  })
              )}
            </StatusBadge>
          </div>
        }
      />

      {/* Key Diagnostic & Prediction Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Kondisi Pemakaian"
          value={getOwnerFacingHealthStatus(anomaly.status)}
          secondary={formatPatternComparison(anomaly.differencePercent)}
          icon={Activity}
          trend={
            anomaly.differencePercent !== null
              ? {
                  value: `${anomaly.differencePercent >= 0 ? '+' : ''}${decimal.format(anomaly.differencePercent)}%`,
                  isNegative: anomaly.differencePercent >= 15,
                  isPositive: anomaly.differencePercent < 0,
                }
              : undefined
          }
        />
        <MetricCard
          label="Prediksi Pemakaian"
          value={
            isInferring
              ? 'Menyiapkan...'
              : prediction.predictedUsageKwh === null
                ? 'Belum ada'
                : `${decimal.format(prediction.predictedUsageKwh)} kWh`
          }
          secondary={
            isInferring
              ? 'Menyiapkan estimasi...'
              : prediction.estimatedBill
                ? rupiah.format(prediction.estimatedBill)
                : prediction.predictedUsageKwh !== null
                  ? 'Tarif belum tersedia'
                  : `Kesiapan Data: ${prediction.confidence ?? '—'}`
          }
          icon={TrendingUp}
        />
        <MetricCard
          label="Kondisi Energi"
          value={score.label}
          secondary={
            score.score !== null
              ? `Indikator data: ${score.score}/100 · Kesiapan: ${score.confidence}`
              : 'Data operasional belum lengkap'
          }
          icon={Gauge}
        />
      </section>
      <p className="text-[11px] text-[var(--muted)] -mt-2 sm:-mt-1">
        {ENERGY_CONDITION_DISCLAIMER}
      </p>

      {/* Priority Action Banner */}
      <Surface data-tour-id="analysis-next-action" variant="elevated" className="border-l-4 border-l-[var(--primary)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-[var(--primary)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">
                Langkah Prioritas Utama
              </span>
              <h2 className="text-lg font-black text-[var(--foreground)]">{primaryAction.title}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{primaryAction.desc}</p>
            </div>
          </div>
          <Link href={primaryAction.href} className={primaryButton}>
            {primaryAction.btnText}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </Surface>

      {/* Electricity Insight Summary Layer */}
      <Surface variant="elevated" className="space-y-5 rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">
                Yang terlihat dari data Anda
              </span>
              <StatusBadge variant={completeness.isKwhComplete ? 'success' : 'info'}>
                {completeness.costCount} Periode Tercatat
              </StatusBadge>
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--foreground)]">
              {insightBridge.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed max-w-3xl">
              {insightBridge.detail}
            </p>
          </div>
          {completeness.hasMissingKwh && (
            <Link
              href={`/bills?${businessQuery}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/50 px-3.5 py-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition shrink-0"
            >
              Lengkapi kWh yang belum tersedia
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Signal Relationship (Latest Period Bridge) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              Hubungan Sinyal {insightBridge.periodTransition ? `(${insightBridge.periodTransition})` : ''}
            </span>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted)]">Biaya:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {insightBridge.costLabel ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted)]">Pemakaian:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {insightBridge.usageLabel ?? '—'}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/60 pt-2">
              Sinyal biaya dan konsumsi disajikan berdampingan tanpa mengasumsikan hubungan sebab-akibat langsung.
            </p>
          </div>

          {/* Historical Cost Context */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {highestCost.wording?.title ?? 'Biaya tertinggi yang tercatat'}
            </span>
            <p className="mt-2 text-sm sm:text-base font-black text-[var(--foreground)]">
              {highestCost.wording?.subtitle ?? 'Belum ada data tagihan'}
            </p>
            {highestCost.wording?.limitation && (
              <p className="mt-2 text-[11px] text-[var(--warning)] leading-relaxed">
                {highestCost.wording.limitation}
              </p>
            )}
            {highestCost.highestBill?.isKwhMissing && (
              <div className="mt-2">
                <Link
                  href={`/bills?${businessQuery}`}
                  className="text-[11px] font-extrabold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                >
                  Lengkapi data periode ini →
                </Link>
              </div>
            )}
          </div>

          {/* Data Completeness */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 sm:col-span-2 lg:col-span-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              Kelengkapan Data Tersedia
            </span>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Biaya listrik:</span>
                <span className="font-bold text-[var(--foreground)]">{completeness.costLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Pemakaian kWh:</span>
                <span className="font-bold text-[var(--foreground)]">{completeness.kwhLabel}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/60 pt-2">
              Pencatatan biaya tetap dapat dianalisis walau kWh belum diisi. Lengkapi kWh untuk membuka perbandingan konsumsi.
            </p>
          </div>
        </div>
      </Surface>

      {/* Dual Electricity Signals Container */}
      <section data-tour-id="analysis-trend-section" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">
              Tren listrik usaha
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)]">
              Dua Sinyal Listrik Usaha
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Biaya dan pemakaian energi adalah dua indikator terpisah. Biaya menjawab beban rupiah, sedangkan pemakaian menjawab konsumsi fisik kWh.
            </p>
          </div>
          <Link
            href={`/bills?${businessQuery}`}
            className="text-xs font-bold text-[var(--primary)] hover:underline"
          >
            Kelola data tagihan →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Signal 1: Cost Graph */}
          <SoftCard className="p-4 sm:p-6">
            <TrendChart
              points={costPoints}
              metric="rupiah"
              eyebrow="Sinyal 1 · Pengeluaran"
              title="Tren biaya listrik"
              description="Berapa biaya listrik yang tercatat dari periode ke periode? Semua tagihan dengan nominal biaya ditampilkan di sini."
              manageBillsHref={`/bills?${businessQuery}`}
            />
          </SoftCard>

          {/* Signal 2: Usage Graph */}
          <SoftCard className="p-4 sm:p-6">
            <TrendChart
              points={usageTrendPoints}
              metric="kwh"
              eyebrow="Sinyal 2 · Konsumsi Energi"
              title="Tren pemakaian listrik"
              description="Berapa energi listrik aktual yang tercatat dari periode ke periode? Periode tanpa data kWh tidak ditarik garis sambung."
              forecastLabel={isInferring ? 'Menyiapkan prediksi...' : sourceLabel}
              emptyTitle="Pemakaian kWh belum tercatat"
              emptyDescription="Tagihan Anda tetap dapat dianalisis dari sisi biaya. Tambahkan kWh jika tersedia untuk memahami perubahan konsumsi listrik."
              manageBillsHref={`/bills?${businessQuery}`}
            />
          </SoftCard>
        </div>
      </section>

      {/* Analysis Tabs Navigation */}
      <nav aria-label="Bagian analisis" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5">
        {tabs.map(([key, Icon, label]) => (
          <Link
            key={key}
            data-tour-id={
              key === 'forecast'
                ? 'analysis-forecast-tab'
                : key === 'recommendations'
                ? 'analysis-recommendations-tab'
                : undefined
            }
            href={`/analysis?${businessQuery}&tab=${key}`}
            aria-current={activeTab === key ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === key
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Surface variant="default">
              <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider">
                <LineChart className="h-4 w-4" />
                Tren Historis
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Menunjukkan pola biaya dan pemakaian berbasis tagihan bulanan yang telah Anda masukkan.
              </p>
            </Surface>
            <Surface variant="default">
              <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                Kondisi Pemakaian
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Mengidentifikasi perbedaan pemakaian listrik dibanding pola sebelumnya untuk menemukan kenaikan yang perlu diperiksa lebih dini.
              </p>
            </Surface>
            <Surface variant="default">
              <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="h-4 w-4" />
                Prediksi WattWise
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Memberikan estimasi kebutuhan pemakaian dan biaya listrik periode berikutnya untuk perencanaan operasional.
              </p>
            </Surface>
          </div>

          {/* Data Readiness Banner */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  Kesiapan Data Usaha
                </p>
                <h3 className="mt-0.5 text-base font-black text-[var(--foreground)]">
                  {dataReadiness.label} · {forecastPlan.continuousHistoryMonths} Bulan Histori Berurutan
                </h3>
              </div>
              <StatusBadge variant={runtimeStatus.variant}>
                {getOwnerFacingPredictionLabel(runtimeStatus.label)}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
              {dataReadiness.description} {dataReadiness.milestoneMessage}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: TREND */}
      {activeTab === 'trend' && (
        <SoftCard>
          <SectionHeader
            title="Tabel Riwayat Pemakaian"
            description="Detail catatan histori bulanan yang digunakan sebagai dasar perhitungan tren dan prediksi."
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase font-extrabold">
                <tr>
                  <th className="pb-3">Periode</th>
                  <th className="pb-3 text-right">Pemakaian (kWh)</th>
                  <th className="pb-3 text-right">Tagihan (Rp)</th>
                  <th className="pb-3 text-right">Tarif (Rp/kWh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {samples.map((s) => (
                  <tr key={s.period}>
                    <td className="py-3 font-semibold">{formatMonth(s.period)}</td>
                    <td className="py-3 text-right tabular-nums">{s.usageKwh !== null ? `${decimal.format(s.usageKwh)} kWh` : '—'}</td>
                    <td className="py-3 text-right tabular-nums">{rupiah.format(s.billAmount)}</td>
                    <td className="py-3 text-right tabular-nums">{s.tariff ? rupiah.format(s.tariff) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SoftCard>
      )}

      {/* TAB 3: ANOMALY */}
      {activeTab === 'anomaly' && (
        <SoftCard>
          <SectionHeader
            title="Status & Kondisi Pemakaian"
            description="Perbandingan pemakaian periode terkini terhadap pola beberapa periode sebelumnya."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Status Kondisi</p>
              <p className="mt-2 text-xl font-black text-[var(--foreground)]">{getOwnerFacingHealthStatus(anomaly.status)}</p>
            </Surface>
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Perubahan Pemakaian</p>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--foreground)]">
                {anomaly.differencePercent === null ? '—' : `${anomaly.differencePercent >= 0 ? '+' : ''}${decimal.format(anomaly.differencePercent)}%`}
              </p>
            </Surface>
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Pemakaian vs Pola Sebelumnya</p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--muted)]">
                {anomaly.observed !== null ? `${decimal.format(anomaly.observed)} kWh` : '—'} (Pola sebelumnya: {anomaly.baseline !== null ? `${decimal.format(anomaly.baseline)} kWh` : '—'})
              </p>
            </Surface>
          </div>

          {(anomaly.status === 'Boros' || anomaly.status === 'Perlu Dicek') && (
            <Surface variant="elevated" className="mt-6 border-l-4 border-l-[var(--warning)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--warning)]">
                    Langkah Penyelidikan Disarankan
                  </p>
                  <h3 className="mt-1 text-base font-black text-[var(--foreground)]">
                    Tindak Lanjuti dengan Cek Kenaikan
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Periksa kemungkinan faktor operasional atau alat berdaya tinggi yang menyebabkan peningkatan pemakaian ini.
                  </p>
                </div>
                <Link
                  href={`/diagnostics?${businessQuery}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                >
                  Mulai Cek Kenaikan
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </Surface>
          )}

          <div className="mt-6">
            <DataNotice title="Catatan Indikasi Pemakaian" variant="warning">
              Ini adalah indikasi awal berbasis perbandingan data yang Anda masukkan. Angka ini bukan vonis pemborosan, bukan diagnosis teknis atau bukti kerusakan alat, dan bukan data resmi PLN.
            </DataNotice>
          </div>
        </SoftCard>
      )}

      {/* TAB 4: FORECAST */}
      {activeTab === 'forecast' && (
        <SoftCard>
          {!entitlements.limits.detailedAnalysis && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[var(--surface-muted)] p-4">
              <LockKeyhole className="h-5 w-5 text-[var(--muted)] shrink-0" />
              <p className="text-xs text-[var(--muted)]">
                Paket Gratis menampilkan ringkasan proyeksi dasar. Analisis lanjutan dan ekspor data tersedia pada Paket Pro.
              </p>
            </div>
          )}
          <SectionHeader
            title="Prediksi WattWise"
            description="Mesin prediksi dipilih otomatis berdasarkan histori bulanan valid yang berurutan. Hasil tetap berupa estimasi berdasarkan data yang Anda masukkan."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge variant={fallbackUsed ? 'warning' : 'primary'}>
              {getOwnerFacingPredictionLabel(sourceLabel)}
            </StatusBadge>
            <span className="text-xs text-[var(--muted)]">
              {forecastPlan.continuousHistoryMonths} bulan histori valid berurutan
            </span>
          </div>

          {/* Data Readiness Indicator Component */}
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  Kesiapan Data WattWise
                </p>
                <h4 className="text-sm font-bold text-[var(--foreground)]">
                  {dataReadiness.label}
                </h4>
              </div>
              <StatusBadge variant={runtimeStatus.variant}>
                {getOwnerFacingPredictionLabel(runtimeStatus.label)}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
              {dataReadiness.description} {dataReadiness.milestoneMessage}
            </p>
          </div>

          {isInferring ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
              <div className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--primary)]">
                <span className="animate-pulse">●</span> Menyiapkan prediksi WattWise...
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Memproses estimasi secara aman di browser Anda tanpa pengiriman data ke server eksternal.
              </p>
            </div>
          ) : prediction.hasPrediction ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Surface variant="muted">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Estimasi Pemakaian</p>
                  <p className="mt-2 text-2xl font-black tabular-nums text-[var(--foreground)]">
                    {decimal.format(prediction.predictedUsageKwh ?? 0)} kWh
                  </p>
                </Surface>
                <Surface variant="muted">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Estimasi Tagihan</p>
                  <p className="mt-2 text-xl font-black tabular-nums text-[var(--foreground)]">
                    {prediction.estimatedBill === null ? 'Tarif belum tersedia' : rupiah.format(prediction.estimatedBill)}
                  </p>
                  {prediction.estimatedBill === null && prediction.predictedUsageKwh !== null && (
                    <p className="mt-1 text-[11px] text-[var(--muted)]">Estimasi biaya belum dihitung</p>
                  )}
                </Surface>
                <Surface variant="muted">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Tingkat Risiko Kenaikan</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{prediction.risk ?? 'Rendah'}</p>
                </Surface>
                <Surface variant="muted">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Kesiapan Data</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{prediction.confidence ?? 'Sedang'}</p>
                </Surface>
              </div>

              {/* Contextual Next Step Handoff */}
              <Surface variant="elevated" className="border-l-4 border-l-[var(--primary)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--primary)]">
                      Langkah Selanjutnya
                    </p>
                    <h3 className="mt-1 text-base font-black text-[var(--foreground)]">
                      {prediction.risk === 'HIGH' || prediction.risk === 'MEDIUM'
                        ? 'Periksa Potensi Kenaikan (Cek Kenaikan)'
                        : 'Tinjau Rekomendasi Efisiensi Energi'}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {prediction.risk === 'HIGH' || prediction.risk === 'MEDIUM'
                        ? 'Prediksi menunjukkan potensi kenaikan beban biaya/pemakaian. Jalankan Cek Kenaikan untuk memeriksa faktor yang mungkin berkontribusi.'
                        : 'Proyeksi pemakaian berada dalam rentang wajar. Tinjau rekomendasi operasional atau lanjutkan pencatatan rutin.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prediction.risk === 'HIGH' || prediction.risk === 'MEDIUM' ? (
                      <Link
                        href={`/diagnostics?${businessQuery}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                      >
                        Mulai Cek Kenaikan
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href={`/analysis?${businessQuery}&tab=recommendations`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                      >
                        Lihat Rekomendasi
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </Surface>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={TrendingUp}
                title="Belum dapat diproyeksikan"
                description="Tambahkan minimal satu catatan dengan kWh atau kombinasi tagihan dan tarif untuk menghasilkan proyeksi."
              />
            </div>
          )}

          <p className="mt-5 text-xs text-[var(--muted)]">
            Metode: {getOwnerFacingPredictionMethod(prediction.method)} · {prediction.historyMonths} bulan data · Gap {prediction.gapMonths} bulan.
            {' '}Prediksi ini bukan data resmi PLN dan perlu dibaca sebagai indikasi.
          </p>

          {displayedEngine === 'nbeats' && !fallbackUsed && inferenceLatencyMs !== null && (
            <details className="mt-4 text-xs text-[var(--muted)]">
              <summary className="cursor-pointer font-semibold text-[var(--primary)] hover:underline">
                Detail Teknis Perhitungan
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span><strong className="text-[var(--foreground)]">Model:</strong> {modelVersion ?? 'nbeats-ai02-1.0.0'}</span>
                <span>·</span>
                <span><strong className="text-[var(--foreground)]">Runtime:</strong> ONNX Runtime Web (WASM)</span>
                <span>·</span>
                <span><strong className="text-[var(--foreground)]">Latensi:</strong> {decimal.format(inferenceLatencyMs)} ms</span>
                <span>·</span>
                <span><strong className="text-[var(--foreground)]">Metode:</strong> {prediction.method}</span>
              </div>
            </details>
          )}
        </SoftCard>
      )}

      {/* TAB 5: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.length ? (
            recommendations.map((item) => (
              <SoftCard key={item.id}>
                <div className="flex items-center justify-between">
                  <StatusBadge variant={item.priority === 'TINGGI' ? 'warning' : 'primary'}>
                    Prioritas {item.priority}
                  </StatusBadge>
                  <Lightbulb className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{item.reason}</p>
                <p className="mt-2 text-xs italic text-[var(--muted)]">{item.limitation}</p>
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--primary)]">Rekomendasi tindakan: {item.nextAction}</p>
                </div>
              </SoftCard>
            ))
          ) : (
            <div className="md:col-span-3">
              <EmptyState
                icon={CheckCircle2}
                title="Belum ada prioritas tambahan"
                description="Data terkini Anda berada dalam kondisi baik dan tidak memicu aturan rekomendasi utama."
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SIMULATOR */}
      {activeTab === 'simulator' && (
        <SoftCard>
          <SectionHeader
            title="Simulator Skenario Peralatan"
            description="Simulasikan dampak biaya tambahan peralatan sebelum Anda membelinya. Perhitungan berjalan di browser tanpa mengubah data tersimpan."
          />
          <div className="mt-6">
            <Simulator
              baseBill={data.latestBill ? Number(data.latestBill.totalAmountRupiah) : null}
              defaultTariff={tariff}
              applianceOptions={data.appliances
                .filter((item) => item.powerWatts !== null)
                .map((item) => ({ name: item.name, powerWatts: item.powerWatts as number }))}
            />
          </div>
        </SoftCard>
      )}

      {/* Data Notice Footer */}
      <DataNotice title="Ketentuan & Transparansi Data WattWise AI">
        Semua analisis, indikasi anomali, proyeksi, dan rekomendasi disusun berdasarkan data yang Anda masukkan. Hasil ini bukan pembacaan sensor langsung, bukan bukti kerusakan alat, dan tidak menggantikan pengukuran resmi PLN.
      </DataNotice>
    </WorkspacePage>
  );
}
