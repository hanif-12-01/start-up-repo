export type UsageSource = 'USER_ENTERED' | 'METER_DERIVED' | 'BILL_TARIFF_DERIVED' | 'LEGACY_UNKNOWN';

export interface UsageSample {
  period: string;
  usageKwh: number | null;
  billAmount: number;
  tariff: number | null;
  usageSource?: UsageSource;
  isEstimated?: boolean;
}

export function buildUsageSamplesFromBills(
  bills: Array<{
    periodEnd: string;
    kwh: string | null;
    totalAmountRupiah: bigint;
    tariffRupiahPerKwh: string | null;
    kwhSource?: string | null;
  }>
): UsageSample[] {
  return bills
    .map((bill) => {
      const period = bill.periodEnd.slice(0, 7);
      const kwhNum = bill.kwh !== null ? Number(bill.kwh) : null;
      const billAmount = Number(bill.totalAmountRupiah);
      const tariffNum = bill.tariffRupiahPerKwh !== null ? Number(bill.tariffRupiahPerKwh) : null;
      let usageSource: UsageSource;
      let isEstimated = false;

      if (kwhNum !== null && kwhNum > 0) {
        if (bill.kwhSource === 'METER_DERIVED') {
          usageSource = 'METER_DERIVED';
        } else if (bill.kwhSource === 'USER_ENTERED') {
          usageSource = 'USER_ENTERED';
        } else {
          usageSource = 'LEGACY_UNKNOWN';
        }
      } else if (tariffNum !== null && tariffNum > 0) {
        usageSource = 'BILL_TARIFF_DERIVED';
        isEstimated = true;
      } else {
        usageSource = 'LEGACY_UNKNOWN';
        isEstimated = true;
      }

      return {
        period,
        usageKwh: kwhNum,
        billAmount,
        tariff: tariffNum,
        usageSource,
        isEstimated,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface PredictionResult {
  hasPrediction: boolean;
  predictedUsageKwh: number | null;
  estimatedBill: number | null;
  previousUsageKwh: number | null;
  changePercent: number | null;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  confidence: 'Rendah' | 'Sedang' | 'Tinggi' | null;
  method: string | null;
  historyMonths: number;
  hasGaps: boolean;
  gapMonths: number;
  highVolatility: boolean;
}

const round = (value: number, precision = 2) => Number(value.toFixed(precision));

function usable(samples: UsageSample[]) {
  return samples
    .map((sample) => ({
      period: sample.period,
      usage: sample.usageKwh ?? (sample.tariff && sample.tariff > 0 ? sample.billAmount / sample.tariff : null),
    }))
    .filter((sample): sample is { period: string; usage: number } => sample.usage !== null && Number.isFinite(sample.usage))
    .sort((left, right) => left.period.localeCompare(right.period));
}

function monthIndex(period: string) {
  const [year, month] = period.split('-').map(Number);
  return year * 12 + month;
}

export function predictUsage(samples: UsageSample[], fallbackTariff: number | null): PredictionResult {
  const values = usable(samples);
  const n = values.length;
  if (n === 0) return { hasPrediction: false, predictedUsageKwh: null, estimatedBill: null, previousUsageKwh: null, changePercent: null, risk: null, confidence: null, method: null, historyMonths: 0, hasGaps: false, gapMonths: 0, highVolatility: false };

  let gapMonths = 0;
  for (let index = 1; index < n; index += 1) gapMonths += Math.max(0, monthIndex(values[index].period) - monthIndex(values[index - 1].period) - 1);
  const hasGaps = gapMonths > 0;
  const usages = values.map((item) => item.usage);
  let predicted: number;
  let method: string;
  if (n === 1) {
    predicted = usages[0];
    method = 'Baseline pemakaian terakhir';
  } else if (n === 2) {
    predicted = 2 * usages[1] - usages[0];
    method = 'Tren dasar dua periode';
  } else {
    const wmaWindow = usages.slice(-3);
    const wmaDenominator = wmaWindow.reduce((sum, _value, index) => sum + index + 1, 0);
    const wma = wmaWindow.reduce((sum, value, index) => sum + value * (index + 1), 0) / wmaDenominator;
    const trendWindow = usages.slice(-6);
    const count = trendWindow.length;
    const sumX = trendWindow.reduce((sum, _value, index) => sum + index, 0);
    const sumY = trendWindow.reduce((sum, value) => sum + value, 0);
    const sumXY = trendWindow.reduce((sum, value, index) => sum + value * index, 0);
    const sumX2 = trendWindow.reduce((sum, _value, index) => sum + index * index, 0);
    const denominator = count * sumX2 - sumX * sumX;
    const slope = denominator === 0 ? 0 : (count * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / count;
    const trend = intercept + slope * count;
    predicted = trend * 0.75 + wma * 0.25;
    method = 'Tren linear & rata-rata bergerak berbobot';
  }
  predicted = Math.max(0, predicted);
  const previous = usages[n - 1];
  const changePercent = previous > 0 ? round(((predicted - previous) / previous) * 100, 1) : null;
  const risk = changePercent !== null && changePercent >= 15 ? 'HIGH' : changePercent !== null && changePercent >= 5 ? 'MEDIUM' : 'LOW';
  const mean = usages.reduce((sum, value) => sum + value, 0) / n;
  const variance = usages.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
  const highVolatility = mean > 0 && Math.sqrt(variance) / mean > 0.25;
  let confidenceScore = n >= 6 ? 3 : n >= 3 ? 2 : n === 2 ? 1 : 0;
  if (hasGaps) confidenceScore -= 1;
  if (highVolatility) confidenceScore -= 1;
  const confidence = confidenceScore >= 3 ? 'Tinggi' : confidenceScore === 2 ? 'Sedang' : 'Rendah';
  const tariff = fallbackTariff ?? [...samples].reverse().find((item) => item.tariff !== null)?.tariff ?? null;
  return {
    hasPrediction: true,
    predictedUsageKwh: round(predicted),
    estimatedBill: tariff && tariff > 0 ? round(predicted * tariff) : null,
    previousUsageKwh: round(previous),
    changePercent,
    risk,
    confidence,
    method,
    historyMonths: n,
    hasGaps,
    gapMonths,
    highVolatility,
  };
}

export function analyzeLatestAnomaly(samples: UsageSample[]) {
  const values = usable(samples);
  if (values.length === 0) return { hasData: false, status: 'Data belum cukup', baseline: null, observed: null, differencePercent: null };
  const latest = values.at(-1)!;
  const history = values.slice(0, -1);
  if (history.length === 0) return { hasData: true, status: 'Data belum cukup', baseline: null, observed: round(latest.usage), differencePercent: null };
  const baseline = history.reduce((sum, item) => sum + item.usage, 0) / history.length;
  const differencePercent = baseline === 0 ? (latest.usage === 0 ? 0 : 100) : ((latest.usage - baseline) / baseline) * 100;
  return { hasData: true, status: differencePercent >= 20 ? 'Boros' : differencePercent >= 10 ? 'Perlu Dicek' : 'Normal', baseline: round(baseline), observed: round(latest.usage), differencePercent: round(differencePercent) };
}

export function calculateEfficiencyScore(input: { bill: number | null; revenue: number | null; hasTariff: boolean; applianceShares: number[] }) {
  if (input.bill === null || input.revenue === null || input.revenue <= 0) return { score: null, label: 'Data belum cukup', confidence: 'Rendah' };
  let score = 100;
  const ratio = (input.bill / input.revenue) * 100;
  score -= ratio > 20 ? 25 : ratio > 15 ? 15 : ratio > 10 ? 8 : 0;
  if (input.applianceShares.length === 0) score -= 10;
  if (!input.hasTariff) score -= 10;
  if (Math.max(0, ...input.applianceShares) > 30) score -= 10;
  score = Math.max(0, Math.min(100, score));
  return { score, label: score >= 80 ? 'Baik' : score >= 60 ? 'Perlu Dipantau' : 'Perlu Dicek', confidence: input.applianceShares.length > 0 && input.hasTariff ? 'Tinggi' : 'Sedang' };
}

export interface AnalysisRecommendation {
  id: string;
  priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
  title: string;
  reason: string;
  limitation: string;
  nextAction: string;
}

export function generateAnalysisRecommendations(input: {
  anomalyStatus: string;
  differencePercent: number | null;
  ratioPercent: number | null;
  predictionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  hasApplianceEstimates: boolean;
  highestApplianceShare: number;
}): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];

  if (input.anomalyStatus === 'Boros' || (input.differencePercent !== null && input.differencePercent >= 20)) {
    recommendations.push({
      id: 'rec-anomaly-high',
      priority: 'TINGGI',
      title: 'Lakukan Cek Kenaikan dan periksa peralatan berdaya tinggi',
      reason: `Indikasi kenaikan pemakaian sebesar ${input.differencePercent?.toFixed(1)}% melampaui ambang batas 20%.`,
      limitation: 'Estimasi berbasis data tagihan yang dimasukkan; perlu verifikasi fisik manual.',
      nextAction: 'Mulai alur Cek Kenaikan atau periksa catatan jam operasional peralatan.',
    });
  } else if (input.anomalyStatus === 'Perlu Dicek' || (input.differencePercent !== null && input.differencePercent >= 10)) {
    recommendations.push({
      id: 'rec-anomaly-med',
      priority: 'SEDANG',
      title: 'Pantau potensi lonjakan pemakaian pada periode ini',
      reason: `Terdeteksi kenaikan indikatif sebesar ${input.differencePercent?.toFixed(1)}% dari baseline harian.`,
      limitation: 'Kenaikan dapat dipengaruhi oleh perubahan musiman atau variasi jumlah hari tagihan.',
      nextAction: 'Bandingkan rincian tarif dan periksa apakah ada alat listrik baru yang beroperasi.',
    });
  }

  if (input.ratioPercent !== null && input.ratioPercent > 15) {
    recommendations.push({
      id: 'rec-ratio-high',
      priority: 'TINGGI',
      title: 'Evaluasi porsi biaya listrik terhadap pendapatan usaha',
      reason: `Biaya listrik mengambil ${input.ratioPercent.toFixed(1)}% dari omzet tercatat pada periode ini.`,
      limitation: 'Bukan perhitungan laba bersih; belum memperhitungkan biaya operasional lainnya.',
      nextAction: 'Tinjau jam operasional puncak untuk menekan beban arus bulanan.',
    });
  }

  if (input.highestApplianceShare > 30) {
    recommendations.push({
      id: 'rec-appliance-share',
      priority: 'SEDANG',
      title: 'Optimalkan jadwal pengoperasian peralatan dominan',
      reason: 'Satu kategori peralatan diperkirakan menyumbang lebih dari 30% total estimasi daya.',
      limitation: 'Perhitungan berdasarkan estimasi daya nominal dan jam penggunaan yang diisi pengguna.',
      nextAction: 'Gunakan pengatur waktu (timer) atau kurangi jam kerja idle pada peralatan tersebut.',
    });
  }

  if (!input.hasApplianceEstimates) {
    recommendations.push({
      id: 'rec-appliance-missing',
      priority: 'RENDAH',
      title: 'Lengkapi daftar peralatan listrik untuk estimasi lebih akurat',
      reason: 'Belum ada data rincian peralatan listrik yang tercatat pada profil usaha.',
      limitation: 'Analisis efisiensi tanpa daftar peralatan bersifat indikatif umum.',
      nextAction: 'Gunakan template peralatan usaha atau tambahkan peralatan secara manual.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-baseline-ok',
      priority: 'RENDAH',
      title: 'Pertahankan pola penggunaan listrik saat ini',
      reason: 'Pemakaian listrik berada dalam rentang wajar tanpa lonjakan indikatif yang signifikan.',
      limitation: 'Pemantauan tetap disarankan bila terjadi pergeseran aktivitas operasional.',
      nextAction: 'Lanjutkan pencatatan tagihan bulanan secara rutin.',
    });
  }

  return recommendations;
}

export async function getProductAnalysisReadModel(userId: string, requestedBusinessId?: string) {
  const { getDecisionSupport } = await import('./workspace.service');
  const data = await getDecisionSupport(userId, requestedBusinessId);

  const tariff = Number(data.business.tariffRupiahPerKwh ?? data.latestBill?.tariffRupiahPerKwh ?? 0) || null;

  const samples = buildUsageSamplesFromBills(data.bills);
  const prediction = predictUsage(samples, tariff);
  const anomaly = analyzeLatestAnomaly(samples);

  const estimates = data.applianceEstimates.filter((item) => item.monthlyKwh !== null);
  const totalEstimate = estimates.reduce((sum, item) => sum + (item.monthlyKwh ?? 0), 0);
  const shares = estimates.map((item) => (totalEstimate > 0 ? ((item.monthlyKwh ?? 0) / totalEstimate) * 100 : 0));
  const highestApplianceShare = shares.length > 0 ? Math.max(...shares) : 0;

  const efficiency = calculateEfficiencyScore({
    bill: data.latestBill ? Number(data.latestBill.totalAmountRupiah) : null,
    revenue: data.matchingRevenue ? Number(data.matchingRevenue.amountRupiah) : null,
    hasTariff: tariff !== null,
    applianceShares: shares,
  });

  const recommendations = generateAnalysisRecommendations({
    anomalyStatus: anomaly.status,
    differencePercent: anomaly.differencePercent,
    ratioPercent: data.ratio,
    predictionRisk: prediction.risk,
    hasApplianceEstimates: estimates.length > 0,
    highestApplianceShare,
  });

  return {
    data,
    tariff,
    samples,
    prediction,
    anomaly,
    efficiency,
    recommendations,
  };
}
