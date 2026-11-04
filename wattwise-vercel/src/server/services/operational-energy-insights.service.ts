import 'server-only';
import { requireUserId } from '@/server/auth/session';
import { getPool } from '@/server/db/client';
import { operationalIdSchema } from '@/server/validation/operational';
import {
  type NormalizationOutput,
  getEnergyNormalization,
} from './energy-normalization.service';

export type ComparisonStatus = 'COMPARISON_AVAILABLE' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA';

export interface OperationalComparisonResult {
  status: ComparisonStatus;
  statusLabel: string;
  hasComparison: boolean;
  processName?: string;
  outputUnit?: string;
  previousPeriod?: {
    recordId: string;
    periodStart: string;
    periodEnd: string;
    durationDays: number;
    energyKwh: number;
    outputQuantity: number;
    intensityKwhPerUnit: number;
    intensityFormatted: string;
  };
  currentPeriod?: {
    recordId: string;
    periodStart: string;
    periodEnd: string;
    durationDays: number;
    energyKwh: number;
    outputQuantity: number;
    intensityKwhPerUnit: number;
    intensityFormatted: string;
  };
  metrics?: {
    energyChangePercent: number;
    outputChangePercent: number;
    intensityChangePercent: number;
    energyTrend: 'UP' | 'DOWN' | 'STABLE';
    outputTrend: 'UP' | 'DOWN' | 'STABLE';
    intensityTrend: 'MORE_EFFICIENT' | 'LESS_EFFICIENT' | 'STABLE';
  };
  headline: string;
  explanation: string;
  boundaryNote: string;
  caveats: string[];
  suggestedAction: string;
}

export function compareNormalizedPeriods(
  prev: NormalizationOutput,
  curr: NormalizationOutput
): OperationalComparisonResult {
  const baseResult: OperationalComparisonResult = {
    status: 'INSUFFICIENT_DATA',
    statusLabel: 'Data Belum Cukup',
    hasComparison: false,
    processName: curr.production.processName || prev.production.processName,
    outputUnit: curr.production.outputUnit || prev.production.outputUnit,
    headline: 'Belum Cukup Data untuk Perbandingan',
    explanation: 'Dibutuhkan minimal dua periode aktivitas operasional dengan catatan listrik yang lengkap.',
    boundaryNote: '',
    caveats: [],
    suggestedAction: 'Lengkapi catatan operasional dan data listrik pada periode yang belum lengkap.',
  };

  // Eligibility check 1: Normalization statuses
  if (prev.status === 'INSUFFICIENT_DATA' || curr.status === 'INSUFFICIENT_DATA') {
    baseResult.explanation =
      'Salah satu atau kedua periode aktivitas belum memiliki data listrik yang lengkap untuk dihitung dengan aman.';
    baseResult.caveats.push('Periode perbandingan belum memenuhi syarat kelengkapan data listrik.');
    return baseResult;
  }

  // Eligibility check 2: Process and unit compatibility
  if (
    (prev.production.processId && curr.production.processId && prev.production.processId !== curr.production.processId) ||
    (prev.production.businessId && curr.production.businessId && prev.production.businessId !== curr.production.businessId) ||
    prev.production.processName !== curr.production.processName ||
    prev.production.outputUnit !== curr.production.outputUnit
  ) {
    baseResult.headline = 'Proses Usaha Berbeda';
    baseResult.explanation =
      'Perbandingan hanya dapat dilakukan untuk proses operasional dan satuan hasil usaha yang sama.';
    baseResult.suggestedAction = 'Pilih aktivitas dengan proses yang sama untuk membandingkan efisiensi energi.';
    return baseResult;
  }

  // Eligibility check 3: Energy and Intensity presence
  if (!prev.energy || !curr.energy || !prev.intensity || !curr.intensity) {
    baseResult.explanation = 'Rasio intensitas energi belum tersedia pada salah satu periode.';
    return baseResult;
  }

  const prevEnergy = Number(prev.energy.totalKwh);
  const currEnergy = Number(curr.energy.totalKwh);
  const prevOutput = Number(prev.production.outputQuantity);
  const currOutput = Number(curr.production.outputQuantity);
  const prevIntensity = prevEnergy / prevOutput;
  const currIntensity = currEnergy / currOutput;

  if (![prevEnergy, currEnergy, prevOutput, currOutput, prevIntensity, currIntensity].every(Number.isFinite) || prevOutput <= 0 || currOutput <= 0 || prevEnergy <= 0 || currEnergy < 0) {
    baseResult.explanation = 'Jumlah hasil produksi harus lebih besar dari 0 pada kedua periode.';
    return baseResult;
  }

  const previousStart = Date.parse(prev.production.periodStart);
  const previousEnd = Date.parse(prev.production.periodEnd);
  const currentStart = Date.parse(curr.production.periodStart);
  const currentEnd = Date.parse(curr.production.periodEnd);
  if (![previousStart, previousEnd, currentStart, currentEnd].every(Number.isFinite) || previousEnd <= previousStart || currentEnd <= currentStart || previousEnd > currentStart || previousEnd - previousStart !== currentEnd - currentStart) {
    baseResult.explanation = 'Pilih dua periode tanpa tumpang tindih dengan durasi yang sama.';
    return baseResult;
  }
  if (prev.energy.coveragePercent !== 100 || curr.energy.coveragePercent !== 100 || prev.energy.measurementBoundary === 'UNKNOWN' || curr.energy.measurementBoundary === 'UNKNOWN' || prev.energy.measurementBoundary !== curr.energy.measurementBoundary || (prev.energy.sourceId && curr.energy.sourceId && prev.energy.sourceId !== curr.energy.sourceId)) {
    baseResult.explanation = 'Perbandingan memerlukan sumber listrik dan cakupan meter yang sama serta catatan lengkap.';
    baseResult.caveats.push('Cakupan pengukuran berbeda atau belum dapat dibandingkan.');
    return baseResult;
  }

  // Metrics calculation
  const energyChangePercent = prevEnergy > 0 ? Number((((currEnergy - prevEnergy) / prevEnergy) * 100).toFixed(1)) : 0;
  const outputChangePercent = prevOutput > 0 ? Number((((currOutput - prevOutput) / prevOutput) * 100).toFixed(1)) : 0;
  const intensityChangePercent =
    prevIntensity > 0 ? Number((((currIntensity - prevIntensity) / prevIntensity) * 100).toFixed(1)) : 0;

  const energyTrend = energyChangePercent > 1 ? 'UP' : energyChangePercent < -1 ? 'DOWN' : 'STABLE';
  const outputTrend = outputChangePercent > 1 ? 'UP' : outputChangePercent < -1 ? 'DOWN' : 'STABLE';
  const intensityTrend =
    intensityChangePercent < -1 ? 'MORE_EFFICIENT' : intensityChangePercent > 1 ? 'LESS_EFFICIENT' : 'STABLE';

  // Boundary note
  const boundaryNote =
    curr.energy.measurementBoundary === 'WHOLE_SITE'
      ? 'Perbandingan berdasarkan meter seluruh tempat usaha, bukan pengukuran efisiensi mesin tertentu.'
      : 'Perbandingan berdasarkan meter sebagian lokasi; belum membuktikan efisiensi mesin atau proses tertentu.';

  const caveats: string[] = [];
  if (prev.energy.hasEstimated || curr.energy.hasEstimated) {
    caveats.push('Mengandung data perkiraan (estimasi) pemakaian listrik pada salah satu periode.');
  }
  if (prev.energy.measurementBoundary !== curr.energy.measurementBoundary) {
    caveats.push('Cakupan pengukuran berbeda antara kedua periode (meter seluruh usaha vs submeter).');
  }

  // Generate grounded explanation
  let headline = '';
  let explanation = '';
  let suggestedAction = '';

  const unit = curr.production.outputUnit;

  if (energyTrend === 'UP' && outputTrend === 'UP') {
    if (intensityTrend === 'MORE_EFFICIENT') {
      headline = 'Pemakaian Listrik Bertambah Sejalan dengan Kenaikan Produksi';
      explanation = `Pemakaian listrik naik ${Math.abs(energyChangePercent)}%, tetapi hasil produksi naik lebih tinggi yaitu ${Math.abs(outputChangePercent)}%. Listrik per ${unit} hasil produksi lebih hemat ${Math.abs(intensityChangePercent)}% dibanding periode sebelumnya.`;
      suggestedAction = 'Pertahankan pengaturan kerja dan beban produksi yang efisien ini.';
    } else if (intensityTrend === 'LESS_EFFICIENT') {
      headline = 'Kenaikan Listrik Melebihi Kenaikan Produksi';
      explanation = `Pemakaian listrik naik ${Math.abs(energyChangePercent)}% sementara hasil produksi hanya naik ${Math.abs(outputChangePercent)}%. Listrik per ${unit} meningkat ${Math.abs(intensityChangePercent)}%. Kondisi ini layak diperiksa.`;
      suggestedAction = 'Periksa apakah ada peralatan yang beroperasi lebih lama dari biasanya.';
    } else {
      headline = 'Kenaikan Pemakaian Listrik Sebanding dengan Hasil Produksi';
      explanation = `Pemakaian listrik naik ${Math.abs(energyChangePercent)}% seimbang dengan kenaikan hasil produksi (${Math.abs(outputChangePercent)}%). Efisiensi per ${unit} relatif stabil.`;
      suggestedAction = 'Pantau penggunaan listrik pada periode produksi berikutnya.';
    }
  } else if (energyTrend === 'UP' && (outputTrend === 'STABLE' || outputTrend === 'DOWN')) {
    headline = 'Pemakaian Listrik Meningkat Tanpa Kenaikan Produksi';
    const outputDesc = outputTrend === 'DOWN' ? `turun ${Math.abs(outputChangePercent)}%` : 'relatif sama';
    explanation = `Pemakaian listrik meningkat ${Math.abs(energyChangePercent)}% sementara hasil usaha ${outputDesc}. Konsumsi listrik per ${unit} meningkat ${Math.abs(intensityChangePercent)}%. Kondisi ini layak diperiksa.`;
    suggestedAction = 'Jalankan pemeriksaan pemakaian atau tinjau catatan jam operasional mesin.';
  } else if (energyTrend === 'DOWN' && (outputTrend === 'UP' || outputTrend === 'STABLE')) {
    headline = 'Efisiensi Penggunaan Listrik Meningkat';
    explanation = `Pemakaian listrik turun ${Math.abs(energyChangePercent)}% sementara hasil produksi ${outputTrend === 'UP' ? `meningkat ${Math.abs(outputChangePercent)}%` : 'tetap terjaga'}. Listrik per ${unit} menjadi lebih hemat ${Math.abs(intensityChangePercent)}%.`;
    suggestedAction = 'Jadikan pola operasional periode ini sebagai standar efisiensi usaha.';
  } else if (energyTrend === 'DOWN' && outputTrend === 'DOWN') {
    headline = 'Penurunan Pemakaian Listrik Sejalan dengan Aktivitas';
    explanation = `Pemakaian listrik turun ${Math.abs(energyChangePercent)}% seiring berkurangnya hasil produksi sebesar ${Math.abs(outputChangePercent)}%.`;
    suggestedAction = 'Perhatikan beban standby (beban diam) saat volume produksi sedang menurun.';
  } else if (intensityTrend !== 'STABLE') {
    headline = 'Pemakaian Listrik per Hasil Usaha Berubah';
    explanation = `Listrik per ${unit} ${intensityChangePercent > 0 ? 'naik' : 'turun'} ${Math.abs(intensityChangePercent)}%. Nilai ini mempertimbangkan perubahan hasil usaha, bukan total listrik saja.`;
    suggestedAction = 'Periksa perubahan hasil usaha dan kondisi operasional sebelum menyimpulkan penyebabnya.';
  } else {
    headline = 'Konsumsi Listrik dan Hasil Usaha Stabil';
    explanation = `Pemakaian listrik dan hasil produksi berada pada tingkat yang stabil dengan perubahan di bawah 1%.`;
    suggestedAction = 'Lanjutkan pencatatan berkala untuk memantau performa usaha.';
  }

  const isReview =
    prev.status === 'NEEDS_REVIEW' ||
    curr.status === 'NEEDS_REVIEW' ||
    prev.energy.measurementBoundary !== curr.energy.measurementBoundary;

  return {
    status: isReview ? 'NEEDS_REVIEW' : 'COMPARISON_AVAILABLE',
    statusLabel: isReview ? 'Perlu Pemeriksaan' : 'Perbandingan Tersedia',
    hasComparison: true,
    processName: curr.production.processName,
    outputUnit: curr.production.outputUnit,
    previousPeriod: {
      recordId: prev.production.id,
      periodStart: prev.production.periodStart,
      periodEnd: prev.production.periodEnd,
      durationDays: prev.production.durationDays,
      energyKwh: prevEnergy,
      outputQuantity: prevOutput,
      intensityKwhPerUnit: prevIntensity,
      intensityFormatted: prev.intensity.formatted,
    },
    currentPeriod: {
      recordId: curr.production.id,
      periodStart: curr.production.periodStart,
      periodEnd: curr.production.periodEnd,
      durationDays: curr.production.durationDays,
      energyKwh: currEnergy,
      outputQuantity: currOutput,
      intensityKwhPerUnit: currIntensity,
      intensityFormatted: curr.intensity.formatted,
    },
    metrics: {
      energyChangePercent,
      outputChangePercent,
      intensityChangePercent,
      energyTrend,
      outputTrend,
      intensityTrend,
    },
    headline,
    explanation,
    boundaryNote,
    caveats,
    suggestedAction,
  };
}

export async function getOperationalEnergyComparison(
  businessId: string,
  processId?: string
): Promise<{ ok: true; data: OperationalComparisonResult } | { ok: false; error: { code: string; message: string } }> {
  try {
    const userId = await requireUserId();
    operationalIdSchema.parse(businessId);
    if (processId) operationalIdSchema.parse(processId);

    const pool = getPool();

    // Verify user owns business
    const bizCheck = await pool.query<{ id: string }>(
      `SELECT id FROM business WHERE id = $1 AND user_id = $2 AND is_active`,
      [businessId, userId]
    );
    if (!bizCheck.rowCount) {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Akses usaha tidak diizinkan' } };
    }

    // Query 2 most recent production records for this business (and optional process)
    const recordsQuery = processId
      ? `SELECT id FROM production_record
         WHERE business_id = $1 AND operational_process_id = $2
         ORDER BY period_end DESC LIMIT 2`
      : `SELECT id FROM production_record
         WHERE business_id = $1
         ORDER BY period_end DESC LIMIT 2`;
    const params = processId ? [businessId, processId] : [businessId];

    const recordsRes = await pool.query<{ id: string }>(recordsQuery, params);

    if (!recordsRes.rowCount || recordsRes.rowCount < 2) {
      return {
        ok: true,
        data: {
          status: 'INSUFFICIENT_DATA',
          statusLabel: 'Data Belum Cukup',
          hasComparison: false,
          headline: 'Belum Cukup Data untuk Perbandingan',
          explanation:
            'Dibutuhkan minimal dua catatan aktivitas operasional untuk melihat perbandingan efisiensi energi antarkerja.',
          boundaryNote: '',
          caveats: [],
          suggestedAction: 'Tambahkan catatan aktivitas baru untuk periode lainnya di menu Aktivitas Usaha.',
        },
      };
    }

    const currentRecordId = recordsRes.rows[0].id;
    const previousRecordId = recordsRes.rows[1].id;

    const [currNorm, prevNorm] = await Promise.all([
      getEnergyNormalization(currentRecordId),
      getEnergyNormalization(previousRecordId),
    ]);

    if (!currNorm.ok || !prevNorm.ok) {
      return {
        ok: true,
        data: {
          status: 'INSUFFICIENT_DATA',
          statusLabel: 'Data Belum Cukup',
          hasComparison: false,
          headline: 'Data Normalisasi Tidak Tersedia',
          explanation: 'Tidak dapat menghitung perbandingan karena data salah satu periode tidak dapat dimuat.',
          boundaryNote: '',
          caveats: [],
          suggestedAction: 'Periksa catatan aktivitas operasional dan data listrik.',
        },
      };
    }

    const comparison = compareNormalizedPeriods(prevNorm.data, currNorm.data);
    return { ok: true, data: comparison };
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu' } };
    }
    return {
      ok: false,
      error: { code: 'COMPARISON_UNAVAILABLE', message: 'Gagal memproses perbandingan operasional' },
    };
  }
}
