import { rupiah } from '@/lib/format';

export type TariffSource = 'BUSINESS_PROFILE' | 'LATEST_BILL' | 'UNKNOWN';

export interface TariffContext {
  value: number | null;
  source: TariffSource;
}

/**
 * Validates and normalizes an input tariff.
 * A valid tariff must be a finite number strictly greater than 0.
 * Zero, negative values, empty strings, NaN, Infinity, and null/undefined
 * are all treated as unavailable (null).
 */
export function parseValidTariff(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Resolves the authoritative electricity tariff and its provenance.
 * Precedence:
 * 1. Valid business profile tariff
 * 2. Valid latest recorded bill tariff
 * 3. UNKNOWN (null)
 */
export function resolveTariffContext(input: {
  businessTariff?: unknown;
  latestBillTariff?: unknown;
}): TariffContext {
  const businessVal = parseValidTariff(input.businessTariff);
  if (businessVal !== null) {
    return {
      value: businessVal,
      source: 'BUSINESS_PROFILE',
    };
  }

  const billVal = parseValidTariff(input.latestBillTariff);
  if (billVal !== null) {
    return {
      value: billVal,
      source: 'LATEST_BILL',
    };
  }

  return {
    value: null,
    source: 'UNKNOWN',
  };
}

/**
 * Formats owner-facing tariff provenance copy.
 * Never exposes internal enums or claims verified PLN tariffs.
 */
export function getOwnerFacingTariffLabel(context: TariffContext): string {
  if (context.value === null || context.source === 'UNKNOWN') {
    return 'Tarif belum tersedia';
  }

  const formatted = rupiah.format(context.value);
  if (context.source === 'BUSINESS_PROFILE') {
    return `Tarif ${formatted}/kWh · dari profil usaha`;
  }
  if (context.source === 'LATEST_BILL') {
    return `Tarif ${formatted}/kWh · dari tagihan terakhir`;
  }
  return `Tarif ${formatted}/kWh`;
}
