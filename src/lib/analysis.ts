import { BusinessType, RecommendationDifficulty, ReportStatus, RiskLevel } from '@prisma/client';
import { db } from './db';
import { classifyApplianceEfficiency } from '@/services/appliance-efficiency';
import { buildRecommendationReasoning, SAVINGS_DISCLAIMER } from '@/services/recommendation-reasoning';
import { createNotificationIfMissing, NotificationType } from '@/services/notification';

export type UsageStatusLabel = 'Efisien' | 'Normal' | 'Perlu Dicek' | 'Boros';

const ANALYSIS_SOURCE = 'ANALYSIS_V2';
const DEFAULT_TARIFF_IDR = 1450;
const DISCLAIMER = 'Hasil analisis WattWise AI adalah estimasi berbasis data input manual dan aturan efisiensi, bukan tagihan resmi PLN.';

type EntryLite = {
  month: number;
  year: number;
  usageKwh: number;
  costIdr: number;
};

export interface ComparisonOutput {
  baselineKwh: number | null;
  baselineCostIdr: number | null;
  kwhChangePct: number | null;
  costChangePct: number | null;
}

export interface AnalysisOutput {
  currentKwh: number;
  currentCost: number;
  previousMonthComparison: ComparisonOutput;
  threeMonthAverageComparison: ComparisonOutput;
  anomalies: { description: string; severity: RiskLevel }[];
  energyScore: number;
  usageStatus: UsageStatusLabel;
  insights: string[];
  estimatedSavings: number;
  disclaimer: string;
  efficiencyScore: number;
  avgDailyKwh: number;
  carbonKg: number;
  predictedKwh: number;
  predictedCostIdr: number;
  riskLevel: RiskLevel;
  potentialSavingsIdr: number;
  anomaliesCount: number;
}

type GeneratedRecommendation = {
  title: string;
  description: string;
  estimatedSavingsIdr: number;
  estimatedSavingsKwh: number;
  difficulty: RecommendationDifficulty;
  priority: string;
  impact: string;
  reason: string;
  practicalSteps: string[];
  disclaimer: string;
  triggerApplianceName?: string;
};

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
 ];

function periodIndex(entry: { month: number; year: number }) {
  return entry.year * 12 + entry.month;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function pctChange(current: number, baseline?: number | null) {
  if (!baseline || baseline <= 0) return null;
  return round1(((current - baseline) / baseline) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fallbackExpectedKwh(type: BusinessType) {
  if (type === BusinessType.LAUNDRY) return 750;
  if (type === BusinessType.FNB) return 500;
  if (type === BusinessType.COLD_STORAGE) return 1200;
  if (type === BusinessType.RETAIL) return 400;
  if (type === BusinessType.MANUFACTURE) return 950;
  return 350;
}

function applianceMonthlyKwh(appliance: { powerWatt: number; quantity: number; dailyUsageHours: number }) {
  return (appliance.powerWatt * appliance.quantity * appliance.dailyUsageHours * 30) / 1000;
}

function expectedMonthlyKwh(type: BusinessType, appliances: { powerWatt: number; quantity: number; dailyUsageHours: number }[]) {
  const applianceTotal = appliances.reduce((sum, app) => sum + applianceMonthlyKwh(app), 0);
  return applianceTotal > 0 ? applianceTotal : fallbackExpectedKwh(type);
}

function buildComparison(current: EntryLite, baseline?: { usageKwh: number; costIdr: number } | null): ComparisonOutput {
  return {
    baselineKwh: baseline?.usageKwh ?? null,
    baselineCostIdr: baseline?.costIdr ?? null,
    kwhChangePct: pctChange(current.usageKwh, baseline?.usageKwh),
    costChangePct: pctChange(current.costIdr, baseline?.costIdr),
  };
}

function calculateEnergyScore(input: {
  actualKwh: number;
  expectedKwh: number;
  previousKwhChangePct: number | null;
  threeMonthKwhChangePct: number | null;
}) {
  const ratio = input.expectedKwh > 0 ? input.actualKwh / input.expectedKwh : 1;
  let score = 92;
  if (ratio > 1) score -= Math.min(42, (ratio - 1) * 48);
  if (input.threeMonthKwhChangePct && input.threeMonthKwhChangePct > 0) score -= Math.min(26, input.threeMonthKwhChangePct * 0.45);
  if (input.previousKwhChangePct && input.previousKwhChangePct > 0) score -= Math.min(12, input.previousKwhChangePct * 0.2);
  if (ratio < 0.9 && (!input.threeMonthKwhChangePct || input.threeMonthKwhChangePct <= 5)) score += 4;
  return Math.round(clamp(score, 20, 100));
}

function determineUsageStatus(input: {
  energyScore: number;
  applianceGapPct: number | null;
  previousKwhChangePct: number | null;
  threeMonthKwhChangePct: number | null;
}): UsageStatusLabel {
  const strongestKwhRise = Math.max(input.previousKwhChangePct ?? 0, input.threeMonthKwhChangePct ?? 0);
  if (strongestKwhRise > 30 || input.energyScore < 55) return 'Boros';
  if (strongestKwhRise > 15 || input.energyScore < 72 || (input.applianceGapPct ?? 0) > 25) return 'Perlu Dicek';
  if (input.energyScore >= 88 && strongestKwhRise <= 5) return 'Efisien';
  return 'Normal';
}

function riskFromStatus(status: UsageStatusLabel) {
  if (status === 'Boros') return RiskLevel.HIGH;
  if (status === 'Perlu Dicek') return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

function formatPeriod(month: number, year: number) {
  return (monthNames[month - 1] ?? 'Bulan ' + month) + ' ' + year;
}

function formatKwh(value: number) {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kWh';
}

function formatRupiah(value: number) {
  return 'Rp' + Math.round(value).toLocaleString('id-ID');
}

function buildInsightsAndAnomalies(input: {
  current: EntryLite;
  previousComparison: ComparisonOutput;
  threeMonthComparison: ComparisonOutput;
  expectedKwh: number;
  applianceGapPct: number | null;
  appliances: { name: string; powerWatt: number; quantity: number; dailyUsageHours: number }[];
}) {
  const insights: string[] = [];
  const anomalies: { description: string; severity: RiskLevel; usageKwh?: number; expectedKwh?: number }[] = [];
  const threeRise = input.threeMonthComparison.kwhChangePct ?? 0;
  const previousRise = input.previousComparison.kwhChangePct ?? 0;
  const costRise = input.previousComparison.costChangePct ?? 0;
  
  if (threeRise > 30) {
    anomalies.push({ description: 'Pemakaian kWh naik ' + threeRise + '% dibanding rata-rata 3 bulan terakhir. Status pemakaian masuk kategori Boros.', severity: RiskLevel.HIGH, usageKwh: input.current.usageKwh, expectedKwh: input.threeMonthComparison.baselineKwh ?? undefined });
  } else if (threeRise > 15) {
    anomalies.push({ description: 'Pemakaian kWh naik ' + threeRise + '% dibanding rata-rata 3 bulan terakhir. Perlu cek jadwal operasional dan alat berdaya besar.', severity: RiskLevel.MEDIUM, usageKwh: input.current.usageKwh, expectedKwh: input.threeMonthComparison.baselineKwh ?? undefined });
  }
  if (previousRise > 30) {
    anomalies.push({ description: 'Pemakaian melonjak ' + previousRise + '% dibanding bulan sebelumnya.', severity: RiskLevel.HIGH, usageKwh: input.current.usageKwh, expectedKwh: input.previousComparison.baselineKwh ?? undefined });
  } else if (previousRise > 15) {
    insights.push('Pemakaian naik ' + previousRise + '% dibanding bulan sebelumnya. Cek apakah ada tambahan alat, jam operasional, atau order meningkat.');
  }
  if (costRise > 20 && previousRise < 5) {
    anomalies.push({ description: 'Biaya listrik naik ' + costRise + '%, tetapi kWh hanya berubah ' + previousRise + '%. Periksa kemungkinan perubahan tarif, salah input, denda, pajak, atau biaya tambahan.', severity: RiskLevel.MEDIUM, usageKwh: input.current.usageKwh, expectedKwh: input.previousComparison.baselineKwh ?? undefined });
  }

  // Appliance gap insights
  if (input.applianceGapPct !== null && input.applianceGapPct > 25) {
    anomalies.push({ description: 'Pemakaian aktual ' + formatKwh(input.current.usageKwh) + ' lebih tinggi ' + input.applianceGapPct + '% dari estimasi peralatan terdaftar. Ada indikasi alat menyala lebih lama, alat belum tercatat, atau efisiensi alat menurun.', severity: input.applianceGapPct > 50 ? RiskLevel.HIGH : RiskLevel.MEDIUM, usageKwh: input.current.usageKwh, expectedKwh: input.expectedKwh });
    insights.push('Pemakaian aktual lebih tinggi dari estimasi alat yang tercatat. Ada kemungkinan alat belum tercatat atau jam pakai berubah.');
  } else if (input.applianceGapPct !== null && input.applianceGapPct < -30) {
    insights.push('Estimasi peralatan lebih tinggi dari pemakaian aktual. Periksa apakah ada alat yang sudah tidak aktif atau jam pakai perlu diperbarui.');
  }

  // Top appliance check candidate logic
  let highestAppliance = null;
  let maxApplianceKwh = 0;
  let totalApplianceKwh = 0;
  for (const app of input.appliances || []) {
    const kwh = (app.powerWatt * app.quantity * app.dailyUsageHours * 30) / 1000;
    totalApplianceKwh += kwh;
    if (kwh > maxApplianceKwh) {
      maxApplianceKwh = kwh;
      highestAppliance = app;
    }
  }

  if (highestAppliance && totalApplianceKwh > 0) {
    const share = (maxApplianceKwh / totalApplianceKwh) * 100;
    if (share > 30) {
      insights.push(`${highestAppliance.name} menjadi kandidat alat yang perlu dicek karena estimasi pemakaiannya paling besar (${share.toFixed(0)}% dari total estimasi alat).`);
    }
  }

  if (insights.length === 0 && anomalies.length === 0) {
    insights.push('Pemakaian listrik relatif stabil terhadap data pembanding yang tersedia.');
  }

  return { insights, anomalies };
}

function findApplianceName(appliances: { name: string }[], keywords: string[]) {
  const found = appliances.find((app) => keywords.some((keyword) => app.name.toLowerCase().includes(keyword)));
  return found?.name;
}

function makeRecommendation(input: GeneratedRecommendation): GeneratedRecommendation {
  return input;
}

function buildBusinessFallbackRecommendations(input: {
  businessType: BusinessType;
  appliances: { name: string }[];
  tariff: number;
  potentialSavingsIdr: number;
}): GeneratedRecommendation[] {
  const baseSaving = Math.max(25000, input.potentialSavingsIdr);
  const coldName = findApplianceName(input.appliances, ['freezer', 'chiller', 'showcase', 'cold', 'kulkas']);
  const laundryHeatName = findApplianceName(input.appliances, ['dryer', 'pengering', 'setrika', 'boiler']);
  const lightingName = findApplianceName(input.appliances, ['lampu', 'lighting', 'led', 'neon']);
  const acName = findApplianceName(input.appliances, ['ac', 'air conditioner', 'pendingin ruangan']);
  const recommendations: GeneratedRecommendation[] = [];

  if (input.businessType === BusinessType.LAUNDRY) {
    recommendations.push(makeRecommendation({
      title: 'Optimalkan Beban Pengering dan Setrika',
      description: 'Atur batch pengeringan dan setrika agar alat panas tidak menyala kecil-kecil sepanjang hari.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.45),
      estimatedSavingsKwh: round1((baseSaving * 0.45) / input.tariff),
      difficulty: RecommendationDifficulty.EASY,
      priority: 'Tinggi',
      impact: 'Tinggi',
      reason: 'Usaha laundry biasanya boros pada alat pemanas seperti dryer, setrika, atau boiler. Rekomendasi ini memakai data alat terdaftar dan tagihan terakhir.',
      practicalSteps: ['Gabungkan cucian hingga kapasitas optimal sebelum dryer berjalan.', 'Jadwalkan setrika dalam batch besar, bukan berulang setiap order kecil.', 'Bersihkan filter dryer dan cek kemungkinan inefisiensi panas/uap.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: laundryHeatName,
    }));
  }

  if (input.businessType === BusinessType.COLD_STORAGE) {
    recommendations.push(makeRecommendation({
      title: 'Cek Gasket, Suhu, dan Kondensor Freezer',
      description: 'Pastikan freezer atau chiller rapat, suhu tidak terlalu rendah, dan kondensor bersih agar kompresor tidak bekerja berlebihan.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.5),
      estimatedSavingsKwh: round1((baseSaving * 0.5) / input.tariff),
      difficulty: RecommendationDifficulty.MEDIUM,
      priority: 'Tinggi',
      impact: 'Tinggi',
      reason: 'Cold storage memiliki beban pendingin menyala lama. Karet pintu kurang rapat, suhu terlalu rendah, atau kondensor kotor cepat menaikkan kWh.',
      practicalSteps: ['Lakukan tes selipan kertas pada gasket pintu.', 'Setel suhu sesuai standar produk, bukan paling dingin.', 'Bersihkan kondensor dan pastikan aliran udara tidak tertutup stok.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: coldName,
    }));
  }

  if (input.businessType === BusinessType.FNB) {
    recommendations.push(makeRecommendation({
      title: 'Atur Jadwal Rice Cooker, Kulkas, dan Kipas',
      description: 'Kurangi mode penghangat terlalu lama dan bersihkan kulkas/showcase agar alat kuliner tidak menyala boros.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.35),
      estimatedSavingsKwh: round1((baseSaving * 0.35) / input.tariff),
      difficulty: RecommendationDifficulty.EASY,
      priority: 'Sedang',
      impact: 'Sedang',
      reason: 'F&B sering memiliki beban warm rice cooker, kulkas, kipas, dan lampu yang berjalan lama.',
      practicalSteps: ['Batasi mode warm rice cooker di jam sepi.', 'Bersihkan karet pintu dan kondensor kulkas.', 'Matikan kipas atau lampu area kosong.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: coldName,
    }));
  }

  if (input.businessType === BusinessType.RETAIL) {
    recommendations.push(makeRecommendation({
      title: 'Optimalkan Lampu, Showcase, dan Pendingin Toko',
      description: 'Gunakan jadwal lampu per zona, cek showcase, dan atur AC/kipas agar area kosong tidak tetap memakai daya.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.35),
      estimatedSavingsKwh: round1((baseSaving * 0.35) / input.tariff),
      difficulty: RecommendationDifficulty.EASY,
      priority: 'Sedang',
      impact: 'Sedang',
      reason: 'Retail biasanya memiliki lampu display, showcase, dan pendingin ruangan yang menyala lama selama toko buka.',
      practicalSteps: ['Pasang timer lampu papan nama dan display.', 'Matikan lampu area gudang saat kosong.', 'Atur AC di 24-26 derajat dan bersihkan filter rutin.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: lightingName ?? acName,
    }));
  }

  if (lightingName && recommendations.length < 3) {
    recommendations.push(makeRecommendation({
      title: 'Kurangi Beban Penerangan',
      description: 'Optimalkan jadwal nyala lampu dan ganti lampu lama ke LED jika masih ada.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.2),
      estimatedSavingsKwh: round1((baseSaving * 0.2) / input.tariff),
      difficulty: RecommendationDifficulty.EASY,
      priority: 'Sedang',
      impact: 'Sedang',
      reason: 'Lampu yang menyala lama memberi penghematan cepat karena perubahan jadwal dan LED mudah dilakukan.',
      practicalSteps: ['Buat zona lampu untuk area depan, gudang, dan luar.', 'Matikan lampu papan nama setelah jam ramai selesai.', 'Ganti lampu non-LED yang masih tersisa.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: lightingName,
    }));
  }

  if (acName && recommendations.length < 4) {
    recommendations.push(makeRecommendation({
      title: 'Rawat dan Jadwalkan AC atau Pendingin Ruangan',
      description: 'Bersihkan filter, atur suhu nyaman, dan gunakan timer agar AC tidak menyala tanpa kebutuhan.',
      estimatedSavingsIdr: Math.round(baseSaving * 0.25),
      estimatedSavingsKwh: round1((baseSaving * 0.25) / input.tariff),
      difficulty: RecommendationDifficulty.MEDIUM,
      priority: 'Sedang',
      impact: 'Sedang',
      reason: 'AC atau pendingin ruangan yang filter/kondensornya kotor membuat kompresor bekerja lebih lama.',
      practicalSteps: ['Bersihkan filter AC minimal 2-4 minggu sekali.', 'Atur suhu 24-26 derajat saat ruangan ramai.', 'Gunakan timer agar AC mati sebelum jam tutup.'],
      disclaimer: SAVINGS_DISCLAIMER,
      triggerApplianceName: acName,
    }));
  }

  return recommendations;
}

function buildRecommendations(input: {
  businessType: BusinessType;
  appliances: { id: string; name: string; powerWatt: number; quantity: number; dailyUsageHours: number }[];
  entries: EntryLite[];
  currentMonth: number;
  currentYear: number;
  tariff: number;
  potentialSavingsIdr: number;
}): GeneratedRecommendation[] {
  const classified = classifyApplianceEfficiency({
    businessType: input.businessType,
    appliances: input.appliances,
    electricityEntries: input.entries,
    currentMonth: input.currentMonth,
    currentYear: input.currentYear,
  });

  const reasoned = buildRecommendationReasoning({
    businessType: input.businessType,
    appliances: classified,
  }).map((rec): GeneratedRecommendation => ({
    title: rec.title,
    description: rec.reason,
    estimatedSavingsIdr: rec.estimatedSavingIdr,
    estimatedSavingsKwh: rec.estimatedSavingKwh,
    difficulty: rec.difficulty as RecommendationDifficulty,
    priority: rec.priority,
    impact: rec.impact,
    reason: rec.reason,
    practicalSteps: rec.practicalSteps,
    disclaimer: rec.disclaimer,
    triggerApplianceName: rec.triggerApplianceName,
  }));

  const fallback = buildBusinessFallbackRecommendations({
    businessType: input.businessType,
    appliances: input.appliances,
    tariff: input.tariff,
    potentialSavingsIdr: input.potentialSavingsIdr,
  });

  // Dynamically add top appliance optimization recommendation if appliances exist
  let topAppliance = null;
  let maxApplianceKwh = 0;
  for (const app of input.appliances || []) {
    const kwh = (app.powerWatt * app.quantity * app.dailyUsageHours * 30) / 1000;
    if (kwh > maxApplianceKwh) {
      maxApplianceKwh = kwh;
      topAppliance = app;
    }
  }

  const customRecs: GeneratedRecommendation[] = [];
  if (topAppliance) {
    customRecs.push({
      title: `Optimalkan penggunaan ${topAppliance.name}`,
      description: `${topAppliance.name} memiliki estimasi pemakaian terbesar berdasarkan daya, jumlah unit, dan jam pakai yang Anda masukkan.`,
      estimatedSavingsIdr: Math.round(input.potentialSavingsIdr * 0.25),
      estimatedSavingsKwh: round1((input.potentialSavingsIdr * 0.25) / input.tariff),
      difficulty: RecommendationDifficulty.EASY,
      priority: 'Tinggi',
      impact: 'Tinggi',
      reason: `${topAppliance.name} memiliki estimasi pemakaian terbesar berdasarkan daya, jumlah unit, dan jam pakai yang Anda masukkan.`,
      practicalSteps: [
        'Atur jadwal pemakaian batch',
        'Kurangi jam idle',
        'Cek perawatan alat',
        'Pertimbangkan alat yang lebih efisien jika sering digunakan'
      ],
      disclaimer: 'Analisis ini bersifat perkiraan/indikasi awal saja dan memerlukan verifikasi manual.',
      triggerApplianceName: topAppliance.name,
    });
  }

  const byTitle = new Map<string, GeneratedRecommendation>();
  for (const rec of [...customRecs, ...reasoned, ...fallback]) {
    if (!byTitle.has(rec.title)) byTitle.set(rec.title, rec);
  }
  return Array.from(byTitle.values()).slice(0, 6);
}

async function syncRecommendations(businessId: string, recommendations: GeneratedRecommendation[]) {
  const activeTitles = recommendations.map((rec) => rec.title);
  for (const rec of recommendations) {
    const existing = await db.recommendation.findFirst({
      where: { businessId, title: rec.title, source: ANALYSIS_SOURCE },
      select: { id: true, isImplemented: true },
    });

    const data = {
      title: rec.title,
      description: rec.description,
      estimatedSavingsIdr: rec.estimatedSavingsIdr,
      estimatedSavingsKwh: rec.estimatedSavingsKwh,
      difficulty: rec.difficulty,
      priority: rec.priority,
      impact: rec.impact,
      reason: rec.reason,
      practicalSteps: rec.practicalSteps,
      disclaimer: rec.disclaimer,
      source: ANALYSIS_SOURCE,
      triggerApplianceName: rec.triggerApplianceName,
    };

    if (existing) {
      await db.recommendation.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await db.recommendation.create({
        data: { businessId, ...data, isImplemented: false },
      });
    }
  }

  await db.recommendation.deleteMany({
    where: {
      businessId,
      source: ANALYSIS_SOURCE,
      isImplemented: false,
      title: { notIn: activeTitles.length > 0 ? activeTitles : ['__none__'] },
    },
  });
}

async function createAnalysisNotifications(input: {
  userId: string;
  businessId: string;
  period: string;
  usageStatus: UsageStatusLabel;
  anomaliesCount: number;
  predictedCostIdr: number;
  currentCostIdr: number;
  recommendationsCount: number;
}) {
  if (input.anomaliesCount > 0 || input.usageStatus === 'Boros') {
    await createNotificationIfMissing({
      userId: input.userId,
      businessId: input.businessId,
      type: NotificationType.USAGE_SPIKE,
      title: 'Lonjakan pemakaian terdeteksi',
      message: 'Analisis ' + input.period + ' menemukan pola pemakaian yang perlu dicek. Lihat halaman anomali dan rekomendasi.',
    });
  }

  if (input.predictedCostIdr > input.currentCostIdr * 1.1) {
    await createNotificationIfMissing({
      userId: input.userId,
      businessId: input.businessId,
      type: NotificationType.BILL_PREDICTION_UP,
      title: 'Prediksi tagihan naik',
      message: 'Prediksi periode berikutnya sekitar ' + formatRupiah(input.predictedCostIdr) + '. Angka ini estimasi, bukan tagihan resmi PLN.',
    });
  }

  if (input.recommendationsCount > 0) {
    await createNotificationIfMissing({
      userId: input.userId,
      businessId: input.businessId,
      type: NotificationType.RECOMMENDATION_READY,
      title: 'Rekomendasi baru tersedia',
      message: 'Ada ' + input.recommendationsCount + ' rekomendasi hemat listrik untuk periode ' + input.period + '.',
    });
  }

  await createNotificationIfMissing({
    userId: input.userId,
    businessId: input.businessId,
    type: NotificationType.REPORT_READY,
    title: 'Laporan bulanan siap',
    message: 'Ringkasan laporan ' + input.period + ' sudah tersimpan dan dapat diunduh sebagai PDF saat dibutuhkan.',
  });
}

export async function runElectricityAnalysis(
  businessId: string,
  month: number,
  year: number,
  actualUsageKwh: number,
  actualCostIdr: number
): Promise<AnalysisOutput> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      type: true,
      userId: true,
      appliances: {
        where: { usageStatus: 'ACTIVE' },
        select: { id: true, name: true, powerWatt: true, quantity: true, dailyUsageHours: true },
      },
    },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const current: EntryLite = { month, year, usageKwh: actualUsageKwh, costIdr: actualCostIdr };
  const allEntries = await db.electricityEntry.findMany({
    where: { businessId },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { month: true, year: true, usageKwh: true, costIdr: true },
  });

  const currentIndex = periodIndex(current);
  const previousEntries = allEntries.filter((entry) => periodIndex(entry) < currentIndex);
  const previousEntry = previousEntries.at(-1) ?? null;
  const lastThree = previousEntries.slice(-3);
  const threeMonthAverageKwh = average(lastThree.map((entry) => entry.usageKwh));
  const threeMonthAverageCostIdr = average(lastThree.map((entry) => entry.costIdr));
  const previousComparison = buildComparison(current, previousEntry);
  const threeMonthAverageComparison = buildComparison(
    current,
    threeMonthAverageKwh && threeMonthAverageCostIdr
      ? { usageKwh: threeMonthAverageKwh, costIdr: threeMonthAverageCostIdr }
      : null
  );

  const applianceEstimateKwh = round1(expectedMonthlyKwh(business.type, business.appliances));
  const applianceGapPct = pctChange(actualUsageKwh, applianceEstimateKwh);
  const avgDailyKwh = round1(actualUsageKwh / 30);
  const carbonKg = round1(actualUsageKwh * 0.85);
  const tariff = actualUsageKwh > 0 ? actualCostIdr / actualUsageKwh : DEFAULT_TARIFF_IDR;
  const energyScore = calculateEnergyScore({
    actualKwh: actualUsageKwh,
    expectedKwh: applianceEstimateKwh,
    previousKwhChangePct: previousComparison.kwhChangePct,
    threeMonthKwhChangePct: threeMonthAverageComparison.kwhChangePct,
  });
  const usageStatus = determineUsageStatus({
    energyScore,
    applianceGapPct,
    previousKwhChangePct: previousComparison.kwhChangePct,
    threeMonthKwhChangePct: threeMonthAverageComparison.kwhChangePct,
  });
  const { insights, anomalies } = buildInsightsAndAnomalies({
    current,
    previousComparison,
    threeMonthComparison: threeMonthAverageComparison,
    expectedKwh: applianceEstimateKwh,
    applianceGapPct,
    appliances: business.appliances,
  });

  const trendPct = previousComparison.kwhChangePct ?? threeMonthAverageComparison.kwhChangePct ?? 2;
  const trend = 1 + clamp(trendPct / 100, -0.2, 0.2);
  const predictedKwh = round1(actualUsageKwh * trend);
  const predictedCostIdr = Math.round(predictedKwh * tariff);

  let savingFactor = 0.06;
  if (usageStatus === 'Boros') savingFactor = 0.2;
  else if (usageStatus === 'Perlu Dicek') savingFactor = 0.14;
  else if (usageStatus === 'Normal') savingFactor = 0.09;
  const potentialSavingsIdr = Math.round(actualCostIdr * savingFactor);
  const recommendations = buildRecommendations({
    businessType: business.type,
    appliances: business.appliances,
    entries: allEntries,
    currentMonth: month,
    currentYear: year,
    tariff,
    potentialSavingsIdr,
  });

  const riskLevel = riskFromStatus(usageStatus);
  const period = formatPeriod(month, year);

  await db.analysisResult.upsert({
    where: { businessId_year_month: { businessId, year, month } },
    update: {
      totalUsageKwh: actualUsageKwh,
      totalCostIdr: actualCostIdr,
      avgDailyKwh,
      carbonKg,
      efficiencyScore: energyScore,
      previousMonthUsageKwh: previousComparison.baselineKwh,
      previousMonthCostIdr: previousComparison.baselineCostIdr,
      previousMonthKwhChangePct: previousComparison.kwhChangePct,
      previousMonthCostChangePct: previousComparison.costChangePct,
      threeMonthAverageKwh,
      threeMonthAverageCostIdr,
      threeMonthKwhChangePct: threeMonthAverageComparison.kwhChangePct,
      threeMonthCostChangePct: threeMonthAverageComparison.costChangePct,
      applianceEstimateKwh,
      applianceGapPct,
      usageStatusLabel: usageStatus,
      insights,
      estimatedSavingsIdr: potentialSavingsIdr,
      disclaimer: DISCLAIMER,
    },
    create: {
      businessId,
      month,
      year,
      totalUsageKwh: actualUsageKwh,
      totalCostIdr: actualCostIdr,
      avgDailyKwh,
      carbonKg,
      efficiencyScore: energyScore,
      previousMonthUsageKwh: previousComparison.baselineKwh,
      previousMonthCostIdr: previousComparison.baselineCostIdr,
      previousMonthKwhChangePct: previousComparison.kwhChangePct,
      previousMonthCostChangePct: previousComparison.costChangePct,
      threeMonthAverageKwh,
      threeMonthAverageCostIdr,
      threeMonthKwhChangePct: threeMonthAverageComparison.kwhChangePct,
      threeMonthCostChangePct: threeMonthAverageComparison.costChangePct,
      applianceEstimateKwh,
      applianceGapPct,
      usageStatusLabel: usageStatus,
      insights,
      estimatedSavingsIdr: potentialSavingsIdr,
      disclaimer: DISCLAIMER,
    },
  });

  const existingAnomalies = await db.anomaly.findMany({
    where: { businessId, month, year },
    select: { description: true },
  });
  const existingDescriptions = new Set(existingAnomalies.map((item) => item.description));
  const newAnomalies = anomalies.filter((item) => !existingDescriptions.has(item.description));

  if (newAnomalies.length > 0) {
    await db.anomaly.createMany({
      data: newAnomalies.map((anomaly) => ({
        businessId,
        month,
        year,
        description: anomaly.description,
        severity: anomaly.severity,
        usageKwh: anomaly.usageKwh,
        expectedKwh: anomaly.expectedKwh,
      })),
    });
  }

  await syncRecommendations(businessId, recommendations);

  const summary = [
    'Laporan bulanan ' + business.name + ' periode ' + period + '.',
    'Pemakaian tercatat ' + formatKwh(actualUsageKwh) + ' dengan estimasi biaya ' + formatRupiah(actualCostIdr) + '.',
    'Energy Score ' + energyScore + '/100 dengan status ' + usageStatus + '.',
    anomalies.length > 0 ? 'Terdeteksi ' + anomalies.length + ' anomali/peringatan pemakaian.' : 'Tidak ada anomali besar yang terdeteksi.',
    'Potensi penghematan indikatif sekitar ' + formatRupiah(potentialSavingsIdr) + ' per bulan jika rekomendasi dijalankan.',
    DISCLAIMER,
  ].join(' ');

  await db.monthlyReport.upsert({
    where: { businessId_year_month: { businessId, year, month } },
    update: {
      status: ReportStatus.GENERATED,
      summary,
      totalKwh: actualUsageKwh,
      totalCostIdr: actualCostIdr,
      energyScore,
      disclaimer: DISCLAIMER,
    },
    create: {
      businessId,
      month,
      year,
      status: ReportStatus.GENERATED,
      summary,
      totalKwh: actualUsageKwh,
      totalCostIdr: actualCostIdr,
      energyScore,
      disclaimer: DISCLAIMER,
    },
  });

  await createAnalysisNotifications({
    userId: business.userId,
    businessId,
    period,
    usageStatus,
    anomaliesCount: anomalies.length,
    predictedCostIdr,
    currentCostIdr: actualCostIdr,
    recommendationsCount: recommendations.length,
  });

  return {
    currentKwh: actualUsageKwh,
    currentCost: actualCostIdr,
    previousMonthComparison: previousComparison,
    threeMonthAverageComparison,
    anomalies: anomalies.map((anomaly) => ({ description: anomaly.description, severity: anomaly.severity })),
    energyScore,
    usageStatus,
    insights,
    estimatedSavings: potentialSavingsIdr,
    disclaimer: DISCLAIMER,
    efficiencyScore: energyScore,
    avgDailyKwh,
    carbonKg,
    predictedKwh,
    predictedCostIdr,
    riskLevel,
    potentialSavingsIdr,
    anomaliesCount: anomalies.length,
  };
}
