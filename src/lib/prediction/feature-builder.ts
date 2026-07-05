import { LstmFeatureWindow } from "./lstm-umkm-model";
import { TabularFeatureInput } from "./tabular-umkm-model";

export interface HistoryStats {
  historyMonths: number;
  latestUsageKwh: number;
  previousUsageKwh: number;
  avg3: number;
  avg6: number;
  trend1: number;
  trend3: number;
  avgTariff: number;
  anomalyDeviation: number;
  hasSpike: boolean;
  hasDrop: boolean;
}

/**
 * 1. Enkripsi/encode business type ke numerik.
 * Harus konsisten dengan data training model.
 */
export function encodeBusinessType(businessType: string): number {
  const mapping: Record<string, number> = {
    LAUNDRY: 0,
    FNB: 1,
    RETAIL: 2,
    MANUFACTURE: 3,
    COLD_STORAGE: 4,
    OTHER: 6,
  };
  return mapping[businessType] ?? 6;
}

/**
 * 2. Hitung month sin (cyclic encoding).
 */
export function calculateMonthSin(month: number): number {
  return Math.sin((2 * Math.PI * month) / 12);
}

/**
 * 3. Hitung month cos (cyclic encoding).
 */
export function calculateMonthCos(month: number): number {
  return Math.cos((2 * Math.PI * month) / 12);
}

/**
 * 4. Hitung statistik dasar dan analisis anomali dari data historis.
 * Menerima list entries (newest to oldest).
 */
export function calculateHistoryStats(
  entries: Array<{ month: number; year: number; usageKwh: number; costIdr: number }>
): HistoryStats {
  const historyMonths = entries.length;
  if (historyMonths === 0) {
    return {
      historyMonths: 0,
      latestUsageKwh: 0,
      previousUsageKwh: 0,
      avg3: 0,
      avg6: 0,
      trend1: 0,
      trend3: 0,
      avgTariff: 1444.70,
      anomalyDeviation: 0,
      hasSpike: false,
      hasDrop: false,
    };
  }

  const current = entries[0];
  const latestUsageKwh = current.usageKwh;
  const previousUsageKwh = entries[1] ? entries[1].usageKwh : latestUsageKwh;

  // Rata-rata 3 bulan (terbaru)
  const avg3Count = Math.min(historyMonths, 3);
  const avg3 = entries.slice(0, avg3Count).reduce((s, e) => s + e.usageKwh, 0) / avg3Count;

  // Rata-rata 6 bulan (terbaru)
  const avg6Count = Math.min(historyMonths, 6);
  const avg6 = entries.slice(0, avg6Count).reduce((s, e) => s + e.usageKwh, 0) / avg6Count;

  const trend1 = (latestUsageKwh - previousUsageKwh) / (previousUsageKwh + 1e-5);
  const trend3 = (latestUsageKwh - avg3) / (avg3 + 1e-5);

  const avgTariff = latestUsageKwh > 0 ? current.costIdr / latestUsageKwh : 1444.70;

  const anomalyDeviation = avg6 > 0 ? (Math.abs(latestUsageKwh - avg6) / avg6) * 100 : 0;
  const hasSpike = anomalyDeviation > 10.0 && trend1 > 0.10;
  const hasDrop = anomalyDeviation > 10.0 && trend1 < -0.10;

  return {
    historyMonths,
    latestUsageKwh,
    previousUsageKwh,
    avg3,
    avg6,
    trend1,
    trend3,
    avgTariff,
    anomalyDeviation,
    hasSpike,
    hasDrop,
  };
}

/**
 * 5. Bangun fitur input tabular untuk model Ridge atau Gradient Boosting.
 */
export function buildTabularFeatures(params: {
  businessType: string;
  entries: Array<{ month: number; year: number; usageKwh: number; costIdr: number }>;
}): TabularFeatureInput {
  const { entries, businessType } = params;
  if (!entries || entries.length === 0) {
    throw new Error("Cannot build tabular features without historical entries.");
  }

  const stats = calculateHistoryStats(entries);
  const currentMonth = entries[0].month;

  return {
    business_type_encoded: encodeBusinessType(businessType),
    month: currentMonth,
    latest_usage_kwh: stats.latestUsageKwh,
    previous_usage_kwh: stats.previousUsageKwh,
    avg_3_month_usage_kwh: stats.avg3,
    avg_6_month_usage_kwh: stats.avg6,
    trend_1_month: stats.trend1,
    trend_3_month: stats.trend3,
    month_sin: calculateMonthSin(currentMonth),
    month_cos: calculateMonthCos(currentMonth),
    avg_tariff_idr_per_kwh: stats.avgTariff,
  };
}

/**
 * 6. Bangun sequence 6 bulan untuk model LSTM.
 */
export function buildLstmSequence(params: {
  businessType: string;
  entries: Array<{ month: number; year: number; usageKwh: number; costIdr: number }>;
  sequenceLength?: number;
}): LstmFeatureWindow[] {
  const { entries, businessType } = params;
  const seqLen = params.sequenceLength ?? 6;

  if (entries.length < seqLen) {
    throw new Error(
      `LSTM requires at least ${seqLen} historical entries, found ${entries.length}`
    );
  }

  // Slice sequenceLength teratas dan balik agar urutan kronologis (oldest -> newest)
  const entriesAsc = [...entries].slice(0, seqLen).reverse();
  const business_type_encoded = encodeBusinessType(businessType);

  return entriesAsc.map((entry, t): LstmFeatureWindow => {
    const curr = entry.usageKwh;
    const prev = t > 0 ? entriesAsc[t - 1].usageKwh : curr;

    // Window analisis lokal di dalam data asc
    const win3 = entriesAsc.slice(Math.max(0, t - 2), t + 1);
    const win6 = entriesAsc.slice(Math.max(0, t - 5), t + 1);

    const avg3 = win3.reduce((s, e) => s + e.usageKwh, 0) / win3.length;
    const avg6 = win6.reduce((s, e) => s + e.usageKwh, 0) / win6.length;

    const trend1 = (curr - prev) / (prev + 1e-5);
    const trend3 = (curr - avg3) / (avg3 + 1e-5);
    const m = entry.month;
    const tariff = entry.usageKwh > 0 ? entry.costIdr / entry.usageKwh : 1444.70;

    return {
      latest_usage_kwh: curr,
      previous_usage_kwh: prev,
      avg_3_month_usage_kwh: avg3,
      avg_6_month_usage_kwh: avg6,
      trend_1_month: trend1,
      trend_3_month: trend3,
      month_sin: calculateMonthSin(m),
      month_cos: calculateMonthCos(m),
      business_type_encoded,
      avg_tariff_idr_per_kwh: tariff,
    };
  });
}
