import { parseValidTariff } from '@/lib/tariff';

/**
 * Read-only derivations for the Dashboard-OFF active-location overview.
 * Uses only ordinary business/bill data; never calls the gated dashboard model.
 */

export interface OverviewBillInput {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: number | bigint | string;
  kwh: number | string | null;
  tariffRupiahPerKwh?: number | string | null;
}

export interface OverviewBusinessInput {
  id: string;
  name: string;
  segment: string;
  electricalSystem: string;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  roomCount?: number | null;
  occupiedRoomCount?: number | null;
  employeeCount?: number | null;
  operatingDaysPerMonth?: number | null;
  tariffRupiahPerKwh?: number | string | null;
  powerVa?: number | null;
  customerType?: string | null;
  meterType?: string | null;
}

export type ChangeState = 'CHANGE' | 'NO_PREVIOUS' | 'ZERO_PREVIOUS' | 'MISSING';

export interface MetricChange {
  state: ChangeState;
  percent: number | null;
  previousValue: number | null;
  previousPeriod: string | null;
}

export interface OverviewBillView extends OverviewBillInput {
  cost: number | null;
  usageKwh: number | null;
  tariff: number | null;
  costChange: MetricChange;
  kwhChange: MetricChange;
}

export interface OverviewCompleteness {
  periodCount: number;
  uniqueMonthCount: number;
  withKwh: number;
  withCost: number;
  withTariff: number;
  /** Owner-facing sentences about what is still missing. Never invents values. */
  gaps: string[];
}

export interface ActiveLocationOverviewModel {
  bills: OverviewBillView[];
  latest: OverviewBillView | null;
  previous: OverviewBillView | null;
  costChange: MetricChange;
  kwhChange: MetricChange;
  completeness: OverviewCompleteness;
  hasShortHistory: boolean;
  averageKwh: number | null;
}

const ELECTRICAL_SYSTEM_LABELS: Record<string, string> = {
  ALL_IN: 'Listrik termasuk sewa',
  TOKEN_PER_KAMAR: 'Token per kamar',
  SUB_METER: 'Sub-meter terpisah',
  PATUNGAN: 'Patungan',
  CAMPURAN: 'Campuran',
};

export const OPERATIONAL_AGE_NOT_RECORDED = 'Belum diisi';

export function describeElectricalSystem(value: string | null | undefined): string {
  if (!value) return OPERATIONAL_AGE_NOT_RECORDED;
  return ELECTRICAL_SYSTEM_LABELS[value] ?? value;
}

export function describeAddress(business: OverviewBusinessInput): string {
  const parts = [business.address, business.city, business.province]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(', ') : OPERATIONAL_AGE_NOT_RECORDED;
}

/**
 * Strict numeric parsing for billing values.
 * Blank strings, non-finite numbers and negatives are rejected instead of
 * silently becoming 0 (Number('') === 0 used to fabricate real-looking data).
 */
export function parseBillNumber(value: number | bigint | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  let parsed: number;
  if (typeof value === 'bigint') {
    parsed = Number(value);
  } else if (typeof value === 'number') {
    parsed = value;
  } else {
    const trimmed = value.trim();
    if (!trimmed) return null;
    parsed = Number(trimmed);
  }
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Tariff must be strictly positive: a 0 Rupiah/kWh tariff is not usable evidence. */
export function parseTariff(value: number | bigint | string | null | undefined): number | null {
  return parseValidTariff(typeof value === 'bigint' ? Number(value) : value);
}

function safePercent(current: number | null, previous: number | null): MetricChange {
  if (current === null) {
    return { state: 'MISSING', percent: null, previousValue: previous, previousPeriod: null };
  }
  if (previous === null) {
    return { state: 'NO_PREVIOUS', percent: null, previousValue: null, previousPeriod: null };
  }
  if (previous <= 0) {
    return { state: 'ZERO_PREVIOUS', percent: null, previousValue: previous, previousPeriod: null };
  }
  return {
    state: 'CHANGE',
    percent: Number((((current - previous) / previous) * 100).toFixed(1)),
    previousValue: previous,
    previousPeriod: null,
  };
}

export function buildActiveLocationOverview(
  business: OverviewBusinessInput,
  billRows: OverviewBillInput[]
): ActiveLocationOverviewModel {
  const businessTariff = parseTariff(business.tariffRupiahPerKwh);
  const bills = [...billRows]
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))
    .map((bill) => ({
      ...bill,
      cost: parseBillNumber(bill.totalAmountRupiah),
      usageKwh: parseBillNumber(bill.kwh),
      tariff: parseTariff(bill.tariffRupiahPerKwh) ?? businessTariff,
    }))
    .map<OverviewBillView>((bill, index, rows) => {
      const previous = rows[index + 1];
      return {
        ...bill,
        costChange: { ...safePercent(bill.cost, previous?.cost ?? null), previousPeriod: previous?.periodEnd ?? null },
        kwhChange: { ...safePercent(bill.usageKwh, previous?.usageKwh ?? null), previousPeriod: previous?.periodEnd ?? null },
      };
    });

  // The newest recorded period is always "latest", even when its values are
  // missing. An older bill is never presented as if it were the current month.
  const latest = bills[0] ?? null;
  const previous = bills[1] ?? null;
  const costChange = safePercent(latest?.cost ?? null, previous?.cost ?? null);
  const kwhChange = safePercent(latest?.usageKwh ?? null, previous?.usageKwh ?? null);

  if (costChange.previousPeriod === null) costChange.previousPeriod = previous?.periodEnd ?? null;
  if (kwhChange.previousPeriod === null) kwhChange.previousPeriod = previous?.periodEnd ?? null;

  const uniqueMonthCount = new Set(bills.map((bill) => bill.periodEnd.slice(0, 7))).size;
  const withKwh = bills.filter((bill) => bill.usageKwh !== null).length;
  const withCost = bills.filter((bill) => bill.cost !== null).length;
  const withTariff = bills.filter((bill) => bill.tariff !== null).length;

  const gaps: string[] = [];
  if (bills.length === 0) {
    gaps.push('Belum ada periode tagihan yang tercatat.');
  } else {
    if (withKwh < bills.length) gaps.push(`${bills.length - withKwh} periode belum berisi kWh.`);
    if (withCost < bills.length) gaps.push(`${bills.length - withCost} periode belum berisi nominal biaya.`);
    if (withTariff < bills.length) gaps.push(`${bills.length - withTariff} periode belum memiliki tarif valid.`);
  }

  return {
    bills,
    latest,
    previous,
    costChange,
    kwhChange,
    completeness: {
      periodCount: bills.length,
      uniqueMonthCount,
      withKwh,
      withCost,
      withTariff,
      gaps,
    },
    hasShortHistory: uniqueMonthCount < 3,
    averageKwh: withKwh ? bills.reduce((sum, bill) => sum + (bill.usageKwh ?? 0), 0) / withKwh : null,
  };
}

export type DiagnosticsReason = 'SUPPORTED' | 'DISABLED' | 'UNSUPPORTED_SEGMENT';

export interface DiagnosticsExposure {
  /** True only when the existing capability check allows the feature. */
  showLink: boolean;
  note: string;
}

/**
 * Presentation-only gate. The authoritative check is
 * `getDiagnosticCapability()` (DIAGNOSTICS_ENABLED + SEGMENT_TEMPLATES_ENABLED +
 * a supported segment catalog). This helper never invents eligibility and never
 * promises findings: a detected cost increase is context, not a requirement.
 */
export function describeDiagnosticsExposure(input: {
  available: boolean;
  reason: DiagnosticsReason;
  costIncreaseDetected: boolean;
  comparisonCount: number;
}): DiagnosticsExposure {
  if (!input.available) {
    return {
      showLink: false,
      note:
        input.reason === 'DISABLED'
          ? 'Cek Kenaikan belum diaktifkan pada paket ini.'
          : 'Cek Kenaikan mendalam belum tersedia untuk segmen usaha ini.',
    };
  }
  if (input.comparisonCount === 0) {
    return {
      showLink: true,
      note: 'Cek Kenaikan baru dapat membandingkan setelah tersedia minimal dua periode tagihan.',
    };
  }
  if (!input.costIncreaseDetected) {
    return {
      showLink: true,
      note: 'Belum ada indikasi kenaikan biaya harian di atas 15% dari data tagihan Anda.',
    };
  }
  return {
    showLink: true,
    note: 'Terdapat indikasi kenaikan biaya harian dari data tagihan. Cek Kenaikan membantu memeriksanya, tanpa menetapkan penyebab.',
  };
}
