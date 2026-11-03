import 'server-only';
import { requireUserId } from '@/server/auth/session';
import { getPool } from '@/server/db/client';
import { operationalIdSchema } from '@/server/validation/operational';

export type NormalizationStatus = 'VALID' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA';

export interface NormalizationOutput {
  status: NormalizationStatus;
  statusLabel: string;
  production: {
    id: string;
    processName: string;
    outputUnit: string;
    outputQuantity: string;
    periodStart: string;
    periodEnd: string;
    durationDays: number;
  };
  energy?: {
    totalKwh: string;
    sourceName: string;
    sourceType: string;
    measurementBoundary: string;
    hasEstimated: boolean;
    coveragePercent: number;
    recordCount: number;
  };
  intensity?: {
    kwhPerUnit: string;
    formatted: string;
    unitLabel: string;
  };
  boundaryNote: string;
  caveats: string[];
  guidance?: string;
}

export function computeNormalization(
  production: {
    id: string;
    processName: string;
    outputUnit: string;
    outputQuantity: string;
    periodStart: Date;
    periodEnd: Date;
  },
  measurements: Array<{
    id: string;
    measurementSourceId: string;
    sourceName: string;
    sourceType: string;
    measurementBoundary: string;
    periodStart: Date;
    periodEnd: Date;
    energyKwh: string;
    consumptionBasis: string;
    qualityStatus: string;
  }>,
  selectedSourceId?: string
): NormalizationOutput {
  const prodStartMs = production.periodStart.getTime();
  const prodEndMs = production.periodEnd.getTime();
  const prodDurationMs = prodEndMs - prodStartMs;
  const durationDays = Math.max(1, Math.round(prodDurationMs / (24 * 3600 * 1000)));

  const baseResult: NormalizationOutput = {
    status: 'INSUFFICIENT_DATA',
    statusLabel: 'Data Belum Cukup',
    production: {
      id: production.id,
      processName: production.processName,
      outputUnit: production.outputUnit,
      outputQuantity: production.outputQuantity,
      periodStart: production.periodStart.toISOString(),
      periodEnd: production.periodEnd.toISOString(),
      durationDays,
    },
    boundaryNote: '',
    caveats: [],
  };

  const outputNum = Number(production.outputQuantity);
  if (Number.isNaN(outputNum) || outputNum <= 0) {
    baseResult.guidance =
      outputNum === 0
        ? 'Hasil produksi 0 tidak dapat digunakan untuk membagi pemakaian listrik.'
        : 'Jumlah hasil produksi tidak valid.';
    return baseResult;
  }

  if (!measurements.length) {
    baseResult.guidance =
      'Belum ada catatan pemakaian listrik yang tercatat pada periode aktivitas ini. Masukkan data listrik di menu Data Energi.';
    return baseResult;
  }

  // Filter or pick source
  const sourceGroups = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const list = sourceGroups.get(m.measurementSourceId) ?? [];
    list.push(m);
    sourceGroups.set(m.measurementSourceId, list);
  }

  let targetSourceId = selectedSourceId;
  if (!targetSourceId) {
    if (sourceGroups.size === 1) {
      targetSourceId = measurements[0].measurementSourceId;
    } else {
      // Pick whole-site or the source with highest coverage
      let bestSourceId = measurements[0].measurementSourceId;
      let maxCount = 0;
      for (const [sId, group] of sourceGroups.entries()) {
        if (group.length > maxCount) {
          maxCount = group.length;
          bestSourceId = sId;
        }
      }
      targetSourceId = bestSourceId;
      baseResult.caveats.push(
        'Terdapat lebih dari satu sumber listrik pada periode ini. Menggunakan sumber dengan catatan terbanyak.'
      );
    }
  }

  const selectedRecords = sourceGroups.get(targetSourceId) ?? [];
  if (!selectedRecords.length) {
    baseResult.guidance = 'Tidak ditemukan catatan listrik untuk sumber yang dipilih pada periode ini.';
    return baseResult;
  }

  // Check temporal coverage & overlap
  selectedRecords.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());

  let totalMilliKwh = 0n;
  let coveredMs = 0;
  let hasEstimated = false;
  let hasOverlap = false;
  let prevEndMs = 0;

  for (const r of selectedRecords) {
    const rStartMs = r.periodStart.getTime();
    const rEndMs = r.periodEnd.getTime();

    // Check overlap with previous interval
    if (prevEndMs > 0 && rStartMs < prevEndMs) {
      hasOverlap = true;
    }
    prevEndMs = Math.max(prevEndMs, rEndMs);

    // Compute effective overlap with production window
    const effectiveStart = Math.max(rStartMs, prodStartMs);
    const effectiveEnd = Math.min(rEndMs, prodEndMs);
    if (effectiveEnd > effectiveStart) {
      coveredMs += effectiveEnd - effectiveStart;
    }

    // Accumulate energy safely as milli-kWh (scale 3)
    const [whole = '0', frac = '0'] = r.energyKwh.split('.');
    const milliVal = BigInt(whole) * 1000n + BigInt(frac.padEnd(3, '0').slice(0, 3));
    totalMilliKwh += milliVal;

    if (r.consumptionBasis === 'ESTIMATED' || r.qualityStatus === 'NEEDS_REVIEW') {
      hasEstimated = true;
    }
  }

  const coveragePercent = Math.min(100, Math.round((coveredMs / prodDurationMs) * 100));
  const primaryRecord = selectedRecords[0];

  const totalKwhFloat = Number(totalMilliKwh) / 1000;
  const totalKwhStr = (Number(totalMilliKwh) / 1000).toFixed(3).replace(/\.?0+$/, '');

  baseResult.energy = {
    totalKwh: totalKwhStr || '0',
    sourceName: primaryRecord.sourceName,
    sourceType: primaryRecord.sourceType,
    measurementBoundary: primaryRecord.measurementBoundary,
    hasEstimated,
    coveragePercent,
    recordCount: selectedRecords.length,
  };

  // Boundary note
  if (primaryRecord.measurementBoundary === 'WHOLE_SITE') {
    baseResult.boundaryNote =
      'Pengukuran menggunakan meter seluruh usaha. Angka ini mencakup seluruh pemakaian listrik tempat usaha dan tidak menunjukkan efisiensi khusus untuk mesin tertentu.';
  } else if (primaryRecord.measurementBoundary === 'SUBMETER') {
    baseResult.boundaryNote = 'Pengukuran berasal dari meter bagian (submeter).';
  } else {
    baseResult.boundaryNote = 'Batas cakupan pengukuran belum terverifikasi.';
    baseResult.caveats.push('Cakupan meter tidak diketahui (UNKNOWN).');
  }

  if (hasOverlap) {
    baseResult.caveats.push('Terdapat interval pencatatan listrik yang bertumpang tindih.');
  }

  if (hasEstimated) {
    baseResult.caveats.push(
      'Mengandung data perkiraan (estimasi) penggunaan listrik. Hasil bukan pembacaan meter murni.'
    );
  }

  // If coverage is under 95%, data is insufficient
  if (coveragePercent < 95) {
    baseResult.status = 'INSUFFICIENT_DATA';
    baseResult.statusLabel = 'Data Belum Cukup';
    baseResult.guidance = `Catatan listrik baru mencakup ${coveragePercent}% dari periode aktivitas. Tambahkan data listrik untuk sisa waktu agar perbandingan akurat.`;
    return baseResult;
  }

  // Calculate intensity: kWh / output
  const intensityVal = totalKwhFloat / outputNum;
  const intensityStr = intensityVal.toFixed(3);
  const formattedIntensity = intensityVal.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  baseResult.intensity = {
    kwhPerUnit: intensityStr,
    formatted: formattedIntensity,
    unitLabel: `kWh/${production.outputUnit}`,
  };

  if (hasEstimated || hasOverlap || primaryRecord.measurementBoundary === 'UNKNOWN') {
    baseResult.status = 'NEEDS_REVIEW';
    baseResult.statusLabel = 'Perlu Pemeriksaan';
  } else {
    baseResult.status = 'VALID';
    baseResult.statusLabel = 'Valid untuk Perbandingan';
  }

  return baseResult;
}

export async function getEnergyNormalization(
  productionRecordId: string,
  selectedSourceId?: string
): Promise<{ ok: true; data: NormalizationOutput } | { ok: false; error: { code: string; message: string } }> {
  try {
    const userId = await requireUserId();
    operationalIdSchema.parse(productionRecordId);
    if (selectedSourceId) operationalIdSchema.parse(selectedSourceId);

    const pool = getPool();

    // 1. Fetch production record with business ownership
    const prodRes = await pool.query<{
      id: string;
      businessId: string;
      processName: string;
      outputUnit: string;
      outputQuantity: string;
      periodStart: Date;
      periodEnd: Date;
    }>(
      `SELECT r.id, r.business_id AS "businessId", p.name AS "processName",
              p.output_unit AS "outputUnit", r.output_quantity::text AS "outputQuantity",
              r.period_start AS "periodStart", r.period_end AS "periodEnd"
       FROM production_record r
       JOIN operational_process p ON p.id = r.operational_process_id AND p.business_id = r.business_id
       JOIN business b ON b.id = r.business_id
       WHERE r.id = $1 AND b.user_id = $2 AND b.is_active`,
      [productionRecordId, userId]
    );

    if (!prodRes.rowCount) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Catatan produksi tidak ditemukan' } };
    }

    const prod = prodRes.rows[0];

    // 2. Fetch overlapping energy measurements for the same business
    const energyRes = await pool.query<{
      id: string;
      measurementSourceId: string;
      sourceName: string;
      sourceType: string;
      measurementBoundary: string;
      periodStart: Date;
      periodEnd: Date;
      energyKwh: string;
      consumptionBasis: string;
      qualityStatus: string;
    }>(
      `SELECT m.id, m.measurement_source_id AS "measurementSourceId", s.name AS "sourceName",
              s.source_type AS "sourceType", s.measurement_boundary AS "measurementBoundary",
              m.period_start AS "periodStart", m.period_end AS "periodEnd",
              m.energy_kwh::text AS "energyKwh", m.consumption_basis AS "consumptionBasis",
              m.quality_status AS "qualityStatus"
       FROM energy_measurement m
       JOIN measurement_source s ON s.id = m.measurement_source_id AND s.business_id = m.business_id
       WHERE m.business_id = $1
         AND m.period_start < $3
         AND m.period_end > $2
       ORDER BY m.period_start ASC`,
      [prod.businessId, prod.periodStart, prod.periodEnd]
    );

    const result = computeNormalization(prod, energyRes.rows, selectedSourceId);
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu' } };
    }
    return {
      ok: false,
      error: { code: 'NORMALIZATION_UNAVAILABLE', message: 'Penghitungan normalisasi belum dapat diproses' },
    };
  }
}
