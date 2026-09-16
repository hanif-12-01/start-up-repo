import { formatMonth, rupiah } from '@/lib/format';
import type { BillRecord } from '@/server/repositories/bill.repository';
import { compareBills, type BillComparison } from '@/server/services/bill-comparison.service';

/**
 * Splits an array of plotted items into contiguous segments of valid points.
 * A null/undefined value or non-finite number breaks the segment so that SVG paths
 * never connect across missing actual data points.
 */
export function buildContiguousTrendSegments<
  T extends { value: number | null; y: number | null; x: number }
>(items: T[]): (T & { value: number; y: number })[][] {
  const segments: (T & { value: number; y: number })[][] = [];
  let currentSegment: (T & { value: number; y: number })[] = [];

  for (const item of items) {
    if (item.value !== null && item.y !== null && Number.isFinite(item.value)) {
      currentSegment.push(item as T & { value: number; y: number });
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

export interface ElectricityCompleteness {
  totalPeriods: number;
  costCount: number;
  kwhCount: number;
  isCostComplete: boolean;
  isKwhComplete: boolean;
  hasMissingKwh: boolean;
  costLabel: string;
  kwhLabel: string;
}

/**
 * Factual data completeness counter.
 * Does NOT gamify or compute a "quality score / 100".
 */
export function buildElectricityCompleteness(
  bills: Array<{
    totalAmountRupiah?: bigint | number | null;
    kwh?: string | number | null;
  }>
): ElectricityCompleteness {
  const totalPeriods = bills.length;
  let costCount = 0;
  let kwhCount = 0;

  for (const bill of bills) {
    if (bill.totalAmountRupiah !== undefined && bill.totalAmountRupiah !== null) {
      costCount += 1;
    }
    if (bill.kwh !== undefined && bill.kwh !== null && String(bill.kwh).trim() !== '') {
      kwhCount += 1;
    }
  }

  const isCostComplete = totalPeriods > 0 && costCount === totalPeriods;
  const isKwhComplete = totalPeriods > 0 && kwhCount === totalPeriods;
  const hasMissingKwh = totalPeriods > 0 && kwhCount < totalPeriods;

  return {
    totalPeriods,
    costCount,
    kwhCount,
    isCostComplete,
    isKwhComplete,
    hasMissingKwh,
    costLabel: `${costCount} dari ${totalPeriods} periode`,
    kwhLabel: `${kwhCount} dari ${totalPeriods} periode`,
  };
}

export interface HighestCostContext {
  hasBills: boolean;
  isTie: boolean;
  highestBill: {
    id: string;
    periodEnd: string;
    periodLabel: string;
    amount: bigint;
    amountFormatted: string;
    isKwhMissing: boolean;
  } | null;
  wording: {
    title: string;
    subtitle: string;
    limitation?: string;
  } | null;
}

/**
 * Identifies the highest recorded cost period descriptively.
 * Handles ties neutrally without falsely crowning a unique single winner.
 * Explains limitation if kWh is missing on that period without causal speculation.
 */
export function findHighestRecordedCost(
  bills: Array<{
    id: string;
    periodEnd: string;
    totalAmountRupiah: bigint | number;
    kwh?: string | number | null;
  }>
): HighestCostContext {
  if (!bills.length) {
    return {
      hasBills: false,
      isTie: false,
      highestBill: null,
      wording: null,
    };
  }

  // Normalize amount to bigint
  const normalized = bills.map((b) => ({
    id: b.id,
    periodEnd: b.periodEnd,
    amount: typeof b.totalAmountRupiah === 'bigint' ? b.totalAmountRupiah : BigInt(b.totalAmountRupiah),
    isKwhMissing: b.kwh === null || b.kwh === undefined || String(b.kwh).trim() === '',
  }));

  // Find max amount
  let maxAmount = normalized[0].amount;
  for (const b of normalized) {
    if (b.amount > maxAmount) {
      maxAmount = b.amount;
    }
  }

  const highestBills = normalized.filter((b) => b.amount === maxAmount);
  const isTie = highestBills.length > 1;

  if (isTie) {
    return {
      hasBills: true,
      isTie: true,
      highestBill: null,
      wording: {
        title: 'Biaya tertinggi tercatat di beberapa periode',
        subtitle: `${highestBills.length} periode mencatat nominal tertinggi yang sama (${rupiah.format(maxAmount)}).`,
        limitation: highestBills.some((b) => b.isKwhMissing)
          ? 'Sebagian periode tidak memiliki data kWh, sehingga perbandingan pemakaian belum dapat dipastikan secara menyeluruh.'
          : undefined,
      },
    };
  }

  const highest = highestBills[0];
  const periodLabel = formatMonth(highest.periodEnd);
  const amountFormatted = rupiah.format(highest.amount);

  return {
    hasBills: true,
    isTie: false,
    highestBill: {
      id: highest.id,
      periodEnd: highest.periodEnd,
      periodLabel,
      amount: highest.amount,
      amountFormatted,
      isKwhMissing: highest.isKwhMissing,
    },
    wording: {
      title: 'Biaya tertinggi yang tercatat',
      subtitle: `${periodLabel} · ${amountFormatted}`,
      limitation: highest.isKwhMissing
        ? 'Pemakaian kWh pada periode ini belum tersedia, sehingga WattWise belum dapat menjelaskan perbedaan biaya dari sisi konsumsi listrik.'
        : undefined,
    },
  };
}

export interface ElectricityInsightBridge {
  hasComparison: boolean;
  periodTransition: string | null;
  costDirection: 'up' | 'down' | 'steady' | null;
  usageDirection: 'up' | 'down' | 'steady' | null;
  costLabel: string | null;
  usageLabel: string | null;
  title: string;
  detail: string;
  comparison: BillComparison | null;
}

/**
 * Deterministic insight bridge connecting Cost Signal and Usage Signal.
 * Reuses existing compareBills logic and strictly enforces non-causal language.
 */
export function buildElectricityInsightSummary(
  current: BillRecord | null,
  previous: BillRecord | null
): ElectricityInsightBridge {
  if (!current) {
    return {
      hasComparison: false,
      periodTransition: null,
      costDirection: null,
      usageDirection: null,
      costLabel: null,
      usageLabel: null,
      title: 'Belum ada data tagihan',
      detail: 'Catat tagihan listrik Anda untuk mulai memantau tren biaya dan pemakaian.',
      comparison: null,
    };
  }

  if (!previous) {
    return {
      hasComparison: false,
      periodTransition: formatMonth(current.periodEnd),
      costDirection: null,
      usageDirection: null,
      costLabel: rupiah.format(current.totalAmountRupiah),
      usageLabel: current.kwh !== null ? `${current.kwh} kWh` : 'kWh belum tersedia',
      title: 'Data periode pertama tercatat',
      detail: 'Tambahkan tagihan periode berikutnya untuk mulai membandingkan perubahan biaya dan pemakaian antarperiode.',
      comparison: null,
    };
  }

  const comparison = compareBills(current, previous);
  const periodTransition = `${formatMonth(previous.periodEnd)} → ${formatMonth(current.periodEnd)}`;

  // Cost direction
  const costDiff = comparison.totalCost.difference;
  const costPct = comparison.totalCost.percentage;
  const costDirection = costDiff > 0n ? 'up' : costDiff < 0n ? 'down' : 'steady';
  const costLabel =
    costDirection === 'up'
      ? `Biaya naik ${costPct ? `${costPct.replace('+', '')}%` : ''}`.trim()
      : costDirection === 'down'
      ? `Biaya turun ${costPct ? `${costPct.replace('-', '')}%` : ''}`.trim()
      : 'Biaya relatif stabil';

  // Usage direction
  let usageDirection: 'up' | 'down' | 'steady' | null = null;
  let usageLabel: string | null = null;

  if (comparison.totalKwh) {
    const kwhDiff = comparison.totalKwh.difference;
    const kwhPct = comparison.totalKwh.percentage;
    const isNegative = kwhDiff.startsWith('-');
    const isZero = kwhDiff === '0' || kwhDiff === '0.000';

    usageDirection = !isNegative && !isZero ? 'up' : isNegative ? 'down' : 'steady';
    usageLabel =
      usageDirection === 'up'
        ? `Pemakaian naik ${kwhPct ? `${kwhPct.replace('+', '')}%` : ''}`.trim()
        : usageDirection === 'down'
        ? `Pemakaian turun ${kwhPct ? `${kwhPct.replace('-', '')}%` : ''}`.trim()
        : 'Pemakaian relatif stabil';
  } else {
    usageLabel = 'Pemakaian belum dapat dibandingkan (kWh belum lengkap)';
  }

  // Synthesis wording
  let title = comparison.wording.title;
  let detail = comparison.wording.detail;

  if (comparison.totalKwh) {
    if (costDirection === 'up' && usageDirection === 'up') {
      title = 'Biaya dan pemakaian bergerak naik bersamaan';
      detail = 'Biaya dan pemakaian bergerak naik pada periode yang sama. Catatan ini menunjukkan perubahan data, bukan memastikan penyebabnya.';
    } else if (costDirection === 'down' && usageDirection === 'down') {
      title = 'Biaya dan pemakaian bergerak turun bersamaan';
      detail = 'Biaya dan pemakaian tercatat turun pada periode yang sama setelah data dinormalisasi.';
    } else if (costDirection === 'up' && usageDirection !== 'up') {
      title = 'Biaya naik tanpa kenaikan pemakaian yang searah';
      detail = 'Biaya tercatat meningkat sementara konsumsi energi tidak mengalami kenaikan serupa. Periksa rincian tarif atau komponen biaya lain sebelum menarik kesimpulan.';
    }
  } else {
    title = 'Biaya dapat dibandingkan, pemakaian belum tersedia';
    detail = 'Perubahan biaya dapat dianalisis antarperiode, tetapi pemakaian energi belum dapat dibandingkan karena data kWh salah satu periode belum tersedia.';
  }

  return {
    hasComparison: true,
    periodTransition,
    costDirection,
    usageDirection,
    costLabel,
    usageLabel,
    title,
    detail,
    comparison,
  };
}
