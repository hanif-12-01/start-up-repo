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
  ReceiptText,
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
import { deriveDisplayedPrediction } from '@/lib/ai/prediction-display';

const tabs = [
  ['overview', Gauge, 'Ringkasan'],
  ['trend', LineChart, 'Tren'],
  ['anomaly', AlertTriangle, 'Anomali'],
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
}

interface ApplianceSummary {
  name: string;
  powerWatts: number | null;
}

interface DecisionSupportData {
  business: BusinessSummary;
  businesses: BusinessSummary[];
  latestBill: BillSummary | null;
  appliances: ApplianceSummary[];
}

interface AnalysisViewProps {
  data: DecisionSupportData;
  tariff: number | null;
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

  // Construct trend points for visualization with single unified prediction
  const trendPoints: TrendPoint[] = samples.map((s) => ({
    period: s.period,
    label: formatMonth(s.period),
    usageKwh: s.usageKwh,
    billAmount: s.billAmount,
    tariff: s.tariff,
    type: 'historical' as const,
  }));

  if (!isInferring && prediction.hasPrediction && prediction.predictedUsageKwh !== null) {
    trendPoints.push({
      period: 'forecast-next',
      label: 'Estimasi periode berikutnya',
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
            <StatusBadge variant="primary" size="md">
              {data.business.name}
            </StatusBadge>
          </div>
        }
      />

      {/* Top KPI Telemetry Strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Tagihan Terakhir"
          value={data.latestBill ? rupiah.format(Number(data.latestBill.totalAmountRupiah)) : '—'}
          secondary={data.latestBill ? formatMonth(data.latestBill.periodEnd) : 'Belum ada data'}
          icon={ReceiptText}
        />
        <MetricCard
          label="Indikasi Anomali"
          value={anomaly.status}
          secondary={
            anomaly.differencePercent === null
              ? 'Butuh baseline 2 periode'
              : `${anomaly.differencePercent >= 0 ? '+' : ''}${decimal.format(anomaly.differencePercent)}% dari baseline`
          }
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
              ? 'Menyiapkan prediksi WattWise...'
              : prediction.estimatedBill
                ? rupiah.format(prediction.estimatedBill)
                : `Keyakinan ${prediction.confidence ?? '—'}`
          }
          icon={TrendingUp}
        />
        <MetricCard
          label="Skor Efisiensi"
          value={score.score !== null ? score.score : '—'}
          secondary={`${score.label} · Keyakinan ${score.confidence}`}
          icon={Gauge}
        />
      </section>

      {/* Priority Action Banner */}
      <Surface variant="elevated" className="border-l-4 border-l-[var(--primary)]">
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

      {/* Primary Visual Trend Area */}
      <SoftCard>
        <SectionHeader
          title="Tren & Proyeksi Pemakaian Listrik"
          description="Visualisasi perbandingan data tagihan historis dengan prediksi periode berikutnya berdasarkan metode yang sedang digunakan."
          badge={
            <StatusBadge variant="info">
              {samples.length} Periode Data
            </StatusBadge>
          }
        />
        <div className="mt-6">
          <TrendChart
            points={trendPoints}
            metric="kwh"
            forecastLabel={isInferring ? 'Menyiapkan prediksi...' : sourceLabel}
          />
        </div>
      </SoftCard>

      {/* Analysis Tabs Navigation */}
      <nav aria-label="Bagian analisis" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5">
        {tabs.map(([key, Icon, label]) => (
          <Link
            key={key}
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
                Deteksi Anomali
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Mengidentifikasi perbedaan pemakaian listrik terhadap baseline untuk mendeteksi potensi pemborosan lebih dini.
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
            title="Status & Indikasi Anomali"
            description="Perbandingan pemakaian periode terkini terhadap rata-rata historis sebelumnya."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Status Anomali</p>
              <p className="mt-2 text-xl font-black text-[var(--foreground)]">{anomaly.status}</p>
            </Surface>
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Perubahan Pemakaian</p>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--foreground)]">
                {anomaly.differencePercent === null ? '—' : `${anomaly.differencePercent >= 0 ? '+' : ''}${decimal.format(anomaly.differencePercent)}%`}
              </p>
            </Surface>
            <Surface variant="muted">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Pemakaian vs Baseline</p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--muted)]">
                {anomaly.observed !== null ? `${decimal.format(anomaly.observed)} kWh` : '—'} (Baseline: {anomaly.baseline !== null ? `${decimal.format(anomaly.baseline)} kWh` : '—'})
              </p>
            </Surface>
          </div>
          <div className="mt-6">
            <DataNotice title="Definisi Sinyal Anomali" variant="warning">
              Ini adalah indikasi awal berbasis perbandingan data input Anda. Angka ini bukan diagnosis teknis, bukan bukti kerusakan peralatan, dan bukan klaim resmi PLN.
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
                Paket Gratis menampilkan ringkasan proyeksi dasar. Detail historis panjang dan faktor musim tersedia pada Paket Pro.
              </p>
            </div>
          )}
          <SectionHeader
            title="Prediksi WattWise"
            description="Mesin prediksi dipilih otomatis berdasarkan histori bulanan valid yang berurutan. Hasil tetap berupa estimasi berdasarkan data yang Anda masukkan."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge variant={fallbackUsed ? 'warning' : 'primary'}>
              {sourceLabel}
            </StatusBadge>
            <span className="text-xs text-[var(--muted)]">
              {forecastPlan.continuousHistoryMonths} bulan histori valid berurutan
            </span>
          </div>

          {isInferring ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
              <div className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--primary)]">
                <span className="animate-pulse">●</span> Menyiapkan prediksi WattWise...
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Memproses inferensi model N-BEATS secara aman di browser Anda tanpa pengiriman data ke server eksternal.
              </p>
            </div>
          ) : prediction.hasPrediction ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Surface variant="muted">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Estimasi Pemakaian</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-[var(--foreground)]">
                  {decimal.format(prediction.predictedUsageKwh ?? 0)} kWh
                </p>
              </Surface>
              <Surface variant="muted">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Estimasi Tagihan</p>
                <p className="mt-2 text-xl font-black tabular-nums text-[var(--foreground)]">
                  {prediction.estimatedBill === null ? 'Tarif belum diisi' : rupiah.format(prediction.estimatedBill)}
                </p>
              </Surface>
              <Surface variant="muted">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Tingkat Risiko Kenaikan</p>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{prediction.risk ?? 'Rendah'}</p>
              </Surface>
              <Surface variant="muted">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Tingkat Keyakinan</p>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{prediction.confidence ?? 'Sedang'}</p>
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
            Metode: {prediction.method ?? 'Belum tersedia'} · {prediction.historyMonths} bulan data · Gap {prediction.gapMonths} bulan.
            {' '}Prediksi ini bukan data resmi PLN dan perlu dibaca sebagai indikasi.
          </p>

          {displayedEngine === 'nbeats' && !fallbackUsed && inferenceLatencyMs !== null && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="font-semibold text-[var(--primary)]">Runtime:</span> ONNX Runtime Web (WASM) ·
              <span className="font-semibold text-[var(--primary)]">Latensi:</span> {decimal.format(inferenceLatencyMs)} ms ·
              <span className="font-semibold text-[var(--primary)]">Model:</span> {modelVersion ?? 'nbeats-ai02-1.0.0'}
            </div>
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
              defaultTariff={tariff ?? 1444.7}
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
