/**
 * Centralized Presentation Semantics Adapter for WattWise AI
 *
 * Provides authoritative owner-facing mapping, safe decision-support terminology,
 * and progressive disclosure helpers without altering underlying analytical calculations,
 * mathematical anomaly thresholds, or internal domain contracts.
 */

export type OwnerFacingHealthStatus =
  | 'Aman'
  | 'Perlu Dicek'
  | 'Perlu Perhatian'
  | 'Data Belum Lengkap';

export type OwnerFacingTrendDirection = 'Naik' | 'Stabil' | 'Turun';

export const ENERGY_CONDITION_DISCLAIMER =
  'Indikator berbasis data WattWise, bukan hasil audit energi.';

/**
 * Maps internal anomaly or health status to authoritative owner-facing status.
 *
 * Internal:
 * - 'Normal' -> 'Aman'
 * - 'Perlu Dicek' -> 'Perlu Dicek'
 * - 'Boros' -> 'Perlu Perhatian'
 * - 'Data belum cukup' / null / undefined -> 'Data Belum Lengkap'
 */
export function getOwnerFacingHealthStatus(
  internalStatus: string | null | undefined
): OwnerFacingHealthStatus {
  if (!internalStatus) return 'Data Belum Lengkap';

  const normalized = internalStatus.trim().toLowerCase();
  if (normalized === 'normal' || normalized === 'aman') {
    return 'Aman';
  }
  if (normalized === 'perlu dicek' || normalized === 'perlu_dicek') {
    return 'Perlu Dicek';
  }
  if (
    normalized === 'boros' ||
    normalized === 'perlu perhatian' ||
    normalized === 'perlu_perhatian'
  ) {
    return 'Perlu Perhatian';
  }
  return 'Data Belum Lengkap';
}

/**
 * Returns safe, non-causal Indonesian narrative for usage changes.
 * Avoids any claim that an increase equals waste or equipment failure.
 */
export function getHealthNarrative(
  internalStatus: string | null | undefined,
  differencePercent: number | null | undefined
): {
  title: string;
  description: string;
} {
  const status = getOwnerFacingHealthStatus(internalStatus);
  const diffStr =
    typeof differencePercent === 'number' && Number.isFinite(differencePercent)
      ? `${differencePercent >= 0 ? '+' : ''}${differencePercent.toFixed(1)}%`
      : null;

  switch (status) {
    case 'Perlu Perhatian':
      return {
        title: 'Kenaikan pemakaian perlu perhatian',
        description: diffStr
          ? `Terdeteksi kenaikan pemakaian signifikan sebesar ${diffStr} dibanding pola sebelumnya.`
          : 'Terdeteksi kenaikan pemakaian yang cukup besar dibanding pola sebelumnya.',
      };
    case 'Perlu Dicek':
      return {
        title: 'Pemakaian perlu ditinjau',
        description: diffStr
          ? `Terdeteksi kenaikan pemakaian sebesar ${diffStr} dibanding pola sebelumnya.`
          : 'Terdeteksi kenaikan pemakaian di atas pola wajar sebelumnya.',
      };
    case 'Aman':
      return {
        title: 'Pemakaian dalam rentang wajar',
        description: 'Pemakaian listrik berada dalam batas pola penggunaan yang teratur.',
      };
    case 'Data Belum Lengkap':
    default:
      return {
        title: 'Riwayat data belum lengkap',
        description: 'Tambahkan tagihan bulanan secara berkala untuk membentuk pola pemakaian yang akurat.',
      };
  }
}

/**
 * Returns safe comparison text against previous pattern (replaces "vs baseline").
 */
export function formatPatternComparison(
  differencePercent: number | null | undefined
): string {
  if (
    differencePercent === null ||
    differencePercent === undefined ||
    !Number.isFinite(differencePercent)
  ) {
    return 'Butuh riwayat minimal 2 periode';
  }
  const sign = differencePercent >= 0 ? '+' : '';
  return `${sign}${differencePercent.toFixed(1)}% dibanding pola sebelumnya`;
}

/**
 * Sanitizes runtime prediction status labels for primary UI.
 * Strips technical tokens like '(fallback)' or raw model names.
 */
export function getOwnerFacingPredictionLabel(label: string | null | undefined): string {
  if (!label) return 'Estimasi Historis';
  return label
    .replace(/\s*\((?:fallback|n-beats|wma)\)/gi, '')
    .trim();
}

/**
 * Returns owner-friendly primary prediction method wording.
 * Keeps internal technical model details behind progressive disclosure.
 */
export function getOwnerFacingPredictionMethod(method: string | null | undefined): string {
  if (!method) return 'Belum tersedia';
  if (method.toLowerCase().includes('n-beats') || method.toLowerCase().includes('lightgbm')) {
    return 'Prediksi WattWise';
  }
  if (method.toLowerCase().includes('baseline')) {
    return 'Estimasi berdasarkan data yang tersedia';
  }
  return method;
}

