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
    businessId?: string;
    processId?: string;
    processName: string;
    outputUnit: string;
    outputQuantity: string;
    periodStart: string;
    periodEnd: string;
    durationDays: number;
  };
  energy?: {
    sourceId?: string;
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
  availableSources?: Array<{
    id: string;
    name: string;
    type: string;
    boundary: string;
    recordCount: number;
  }>;
}

export function computeNormalization(
  production: {
    id: string;
    businessId?: string;
    processId?: string;
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
      businessId: production.businessId,
      processId: production.processId,
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
  if (!Number.isFinite(outputNum) || outputNum <= 0) {
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

  // Group measurements by source
  const sourceGroups = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const list = sourceGroups.get(m.measurementSourceId) ?? [];
    list.push(m);
    sourceGroups.set(m.measurementSourceId, list);
  }

  const availableSources = Array.from(sourceGroups.entries()).map(([sId, recs]) => ({
    id: sId,
    name: recs[0].sourceName,
    type: recs[0].sourceType,
    boundary: recs[0].measurementBoundary,
    recordCount: recs.length,
  }));
  baseResult.availableSources = availableSources;

  let targetSourceId = selectedSourceId;
  if (!targetSourceId) {
    if (sourceGroups.size === 1) {
      targetSourceId = measurements[0].measurementSourceId;
    } else {
      // Finding A: Multiple sources exist; require explicit user selection.
      baseResult.status = 'INSUFFICIENT_DATA';
      baseResult.statusLabel = 'Data Belum Cukup';
      baseResult.guidance =
        'Ada beberapa sumber listrik pada periode ini. Pilih sumber yang ingin digunakan untuk perbandingan.';
      baseResult.caveats.push(
        'Terdapat lebih dari satu sumber listrik pada periode operasional ini.'
      );
      return baseResult;
    }
  }

  const selectedRecords = sourceGroups.get(targetSourceId) ?? [];
  if (!selectedRecords.length) {
    baseResult.guidance = 'Tidak ditemukan catatan listrik untuk sumber yang dipilih pada periode ini.';
    return baseResult;
  }

  // Sort chronologically
  selectedRecords.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());

  const firstRec = selectedRecords[0];
  const lastRec = selectedRecords[selectedRecords.length - 1];
  const firstStartMs = firstRec.periodStart.getTime();
  const lastEndMs = lastRec.periodEnd.getTime();

  let hasEstimated = false;
  let hasOverlap = false;
  let hasGap = false;
  let coveredMs = 0;
  let prevEndMs = firstStartMs;

  for (let i = 0; i < selectedRecords.length; i++) {
    const r = selectedRecords[i];
    const rStartMs = r.periodStart.getTime();
    const rEndMs = r.periodEnd.getTime();

    if (r.consumptionBasis === 'ESTIMATED' || r.qualityStatus === 'NEEDS_REVIEW') {
      hasEstimated = true;
    }

    if (i > 0) {
      if (rStartMs < prevEndMs) {
        hasOverlap = true;
      } else if (rStartMs > prevEndMs) {
        hasGap = true;
      }
    }

    const effStart = Math.max(rStartMs, prodStartMs);
    const effEnd = Math.min(rEndMs, prodEndMs);
    if (effEnd > effStart) {
      coveredMs += effEnd - effStart;
    }

    prevEndMs = Math.max(prevEndMs, rEndMs);
  }

  // Floor to prevent rounding up to 100% when coverage is incomplete
  const coveragePercent = Math.min(100, Math.floor((coveredMs / prodDurationMs) * 100));

  let totalMilliKwh = 0n;
  for (const r of selectedRecords) {
    const [whole = '0', frac = '0'] = r.energyKwh.split('.');
    const milliVal = BigInt(whole) * 1000n + BigInt(frac.padEnd(3, '0').slice(0, 3));
    totalMilliKwh += milliVal;
  }
  const totalKwhFloat = Number(totalMilliKwh) / 1000;
  const totalKwhStr = (Number(totalMilliKwh) / 1000).toFixed(3).replace(/\.?0+$/, '');

  baseResult.energy = {
    sourceId: targetSourceId,
    totalKwh: totalKwhStr || '0',
    sourceName: firstRec.sourceName,
    sourceType: firstRec.sourceType,
    measurementBoundary: firstRec.measurementBoundary,
    hasEstimated,
    coveragePercent,
    recordCount: selectedRecords.length,
  };

  // Boundary note
  if (firstRec.measurementBoundary === 'WHOLE_SITE') {
    baseResult.boundaryNote =
      'Pengukuran menggunakan meter seluruh usaha. Angka ini mencakup seluruh pemakaian listrik tempat usaha dan tidak menunjukkan efisiensi khusus untuk mesin tertentu.';
  } else if (firstRec.measurementBoundary === 'SUBMETER') {
    baseResult.boundaryNote = 'Pengukuran berasal dari meter bagian (submeter).';
  } else {
    baseResult.boundaryNote = 'Batas cakupan pengukuran belum terverifikasi.';
    baseResult.caveats.push('Cakupan meter tidak diketahui (UNKNOWN).');
  }

  if (hasEstimated) {
    baseResult.caveats.push(
      'Mengandung data perkiraan (estimasi) penggunaan listrik. Hasil bukan pembacaan meter murni.'
    );
  }

  // Finding B: Measurements extending beyond production window
  if (firstStartMs < prodStartMs || lastEndMs > prodEndMs) {
    baseResult.status = 'INSUFFICIENT_DATA';
    baseResult.statusLabel = 'Data Belum Cukup';
    baseResult.guidance = 'Periode catatan listrik belum cocok dengan periode hasil usaha.';
    baseResult.caveats.push('Rentang waktu catatan listrik melebihi batas periode operasional.');
    return baseResult;
  }

  // Finding D: Overlapping intervals double counting
  if (hasOverlap) {
    baseResult.status = 'NEEDS_REVIEW';
    baseResult.statusLabel = 'Perlu Pemeriksaan';
    baseResult.guidance =
      'Terdapat catatan listrik yang saling tumpang tindih. Periksa dan perbaiki interval pencatatan listrik.';
    baseResult.caveats.push('Terdapat interval pencatatan listrik yang bertumpang tindih.');
    return baseResult;
  }

  // Finding C: Gaps in the middle
  if (hasGap) {
    baseResult.status = 'INSUFFICIENT_DATA';
    baseResult.statusLabel = 'Data Belum Cukup';
    baseResult.guidance =
      'Terdapat jeda waktu pada catatan listrik di antara interval operasional. Lengkapi data agar berurutan tanpa jeda.';
    baseResult.caveats.push('Terdapat celah waktu (gap) di antara interval catatan listrik.');
    return baseResult;
  }

  // Finding C: Coverage must be complete (100% contiguous)
  if (firstStartMs > prodStartMs || lastEndMs < prodEndMs || coveragePercent < 100) {
    baseResult.status = 'INSUFFICIENT_DATA';
    baseResult.statusLabel = 'Data Belum Cukup';
    if (coveragePercent < 95) {
      baseResult.guidance = `Catatan listrik baru mencakup ${coveragePercent}% dari periode aktivitas. Tambahkan data listrik untuk sisa waktu agar perbandingan akurat.`;
    } else {
      baseResult.guidance =
        'Catatan listrik belum lengkap mencakup seluruh periode operasional. Diperlukan pencatatan penuh dari awal hingga akhir aktivitas.';
    }
    return baseResult;
  }

  // Certified Contiguous Normalization
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

  if (hasEstimated || firstRec.measurementBoundary === 'UNKNOWN') {
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
      processId: string;
      processName: string;
      outputUnit: string;
      outputQuantity: string;
      periodStart: Date;
      periodEnd: Date;
    }>(
      `SELECT r.id, r.business_id AS "businessId", p.id AS "processId", p.name AS "processName",
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
