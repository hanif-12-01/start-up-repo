import type { BillRecord } from '@/server/repositories/bill.repository';

const MILLISECONDS_PER_DAY = 86_400_000;
const KWH_SCALE = 3;

export interface RupiahMetric {
  current: bigint;
  previous: bigint;
  difference: bigint;
  percentage: string | null;
}

export interface DecimalMetric {
  current: string;
  previous: string;
  difference: string;
  percentage: string | null;
}

export interface BillComparison {
  currentDays: number;
  previousDays: number;
  totalCost: RupiahMetric;
  dailyCost: RupiahMetric;
  totalKwh: DecimalMetric | null;
  dailyKwh: DecimalMetric | null;
  wording: {
    title: string;
    detail: string;
  };
}

function dateToEpochDay(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY;
}

export function inclusivePeriodDays(periodStart: string, periodEnd: string): number {
  return dateToEpochDay(periodEnd) - dateToEpochDay(periodStart) + 1;
}

export function periodsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string
): boolean {
  return firstStart <= secondEnd && firstEnd >= secondStart;
}

export function selectPreviousBill(
  current: Pick<BillRecord, 'businessId' | 'periodStart'>,
  candidates: BillRecord[]
): BillRecord | null {
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.businessId === current.businessId && candidate.periodEnd < current.periodStart
      )
      .sort(
        (left, right) =>
          right.periodEnd.localeCompare(left.periodEnd) ||
          right.periodStart.localeCompare(left.periodStart) ||
          right.id.localeCompare(left.id)
      )[0] ?? null
  );
}

function divideRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Denominator must be positive');
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * ((absolute + denominator / 2n) / denominator);
}

function formatScaled(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  if (scale === 0) return `${sign}${absolute}`;
  const digits = absolute.toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

function decimalToScaled(value: string, scale: number): bigint {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const scaled =
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0');
  return negative ? -scaled : scaled;
}

function percentageChange(difference: bigint, previous: bigint): string | null {
  if (previous === 0n) return null;
  const percentageTenths = divideRound(difference * 1000n, previous);
  return formatScaled(percentageTenths, 1);
}

function rupiahMetric(current: bigint, previous: bigint): RupiahMetric {
  const difference = current - previous;
  return {
    current,
    previous,
    difference,
    percentage: percentageChange(difference, previous),
  };
}

function decimalMetric(currentScaled: bigint, previousScaled: bigint): DecimalMetric {
  const difference = currentScaled - previousScaled;
  return {
    current: formatScaled(currentScaled, KWH_SCALE),
    previous: formatScaled(previousScaled, KWH_SCALE),
    difference: formatScaled(difference, KWH_SCALE),
    percentage: percentageChange(difference, previousScaled),
  };
}

function safeWording(dailyCostDifference: bigint, dailyKwhDifference: bigint | null) {
  if (dailyCostDifference > 0n) {
    if (dailyKwhDifference === null) {
      return {
        title: 'Biaya harian tercatat naik',
        detail:
          'Data kWh belum lengkap untuk membandingkan pemakaian. Periksa rincian tarif, periode, dan catatan tagihan sebelum menarik kesimpulan.',
      };
    }
    if (dailyKwhDifference > 0n) {
      return {
        title: 'Biaya dan kWh per hari tercatat naik',
        detail:
          'Keduanya bergerak naik setelah panjang periode dinormalisasi. Catatan ini menunjukkan perubahan data, bukan memastikan penyebabnya.',
      };
    }
    return {
      title: 'Biaya harian naik tanpa kenaikan kWh per hari yang searah',
      detail:
        'Periksa rincian tarif dan komponen tagihan. Data ini belum cukup untuk memastikan penyebab perubahan.',
    };
  }

  if (dailyCostDifference < 0n) {
    return {
      title: 'Biaya harian tercatat turun',
      detail:
        dailyKwhDifference === null
          ? 'Data kWh belum lengkap, jadi ringkasan ini hanya membandingkan biaya per hari.'
          : 'Bandingkan juga perubahan kWh per hari untuk memahami pola data tanpa menganggapnya sebagai diagnosis.',
    };
  }

  return {
    title: 'Biaya harian tercatat tetap',
    detail:
      dailyKwhDifference === null
        ? 'Data kWh belum lengkap, sehingga belum tersedia pembanding pemakaian.'
        : 'Biaya per hari tidak berubah setelah normalisasi periode; kWh per hari ditampilkan sebagai pembanding terpisah.',
  };
}

export function compareBills(current: BillRecord, previous: BillRecord): BillComparison {
  const currentDays = inclusivePeriodDays(current.periodStart, current.periodEnd);
  const previousDays = inclusivePeriodDays(previous.periodStart, previous.periodEnd);
  const totalCost = rupiahMetric(current.totalAmountRupiah, previous.totalAmountRupiah);
  const dailyCost = rupiahMetric(
    divideRound(current.totalAmountRupiah, BigInt(currentDays)),
    divideRound(previous.totalAmountRupiah, BigInt(previousDays))
  );

  const currentKwh = current.kwh === null ? null : decimalToScaled(current.kwh, KWH_SCALE);
  const previousKwh = previous.kwh === null ? null : decimalToScaled(previous.kwh, KWH_SCALE);
  const totalKwh =
    currentKwh === null || previousKwh === null ? null : decimalMetric(currentKwh, previousKwh);
  const currentDailyKwh =
    currentKwh === null ? null : divideRound(currentKwh, BigInt(currentDays));
  const previousDailyKwh =
    previousKwh === null ? null : divideRound(previousKwh, BigInt(previousDays));
  const dailyKwh =
    currentDailyKwh === null || previousDailyKwh === null
      ? null
      : decimalMetric(currentDailyKwh, previousDailyKwh);

  return {
    currentDays,
    previousDays,
    totalCost,
    dailyCost,
    totalKwh,
    dailyKwh,
    wording: safeWording(
      dailyCost.difference,
      dailyKwh === null ? null : decimalToScaled(dailyKwh.difference, KWH_SCALE)
    ),
  };
}
