import { inclusivePeriodDays } from '@/server/services/bill-comparison.service';

export interface BaselineBillInput {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: bigint;
  kwh: string | null;
  tariffRupiahPerKwh: string | null;
}

export interface ActionPlanBaselineSnapshot {
  sourceBillId: string;
  comparisonBillId: string | null;
  periodStart: string;
  periodEnd: string;
  inclusiveDays: number;
  totalCostRupiah: string;
  costPerDayRupiah: string;
  totalKwhMilliKwh: string | null;
  kwhPerDayMilliKwh: string | null;
  tariffRupiahPerKwh: string | null;
  comparisonPeriodStart: string | null;
  comparisonPeriodEnd: string | null;
  comparisonInclusiveDays: number | null;
  comparisonTotalCostRupiah: string | null;
  comparisonCostPerDayRupiah: string | null;
  comparisonTotalKwhMilliKwh: string | null;
  comparisonKwhPerDayMilliKwh: string | null;
  candidateCode: string;
  candidateVersion: number;
  inspectionCode: string;
  inspectionVersion: number;
  inspectionResultCode: string;
  capturedAt: string;
}

function divideRound(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor;
}

function decimalToMilli(value: string | null): bigint | null {
  if (value === null) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0').slice(0, 3) || '0');
}

function billMetrics(bill: BaselineBillInput) {
  const days = inclusivePeriodDays(bill.periodStart, bill.periodEnd);
  const milliKwh = decimalToMilli(bill.kwh);
  return {
    days,
    totalCost: bill.totalAmountRupiah.toString(),
    dailyCost: divideRound(bill.totalAmountRupiah, BigInt(days)).toString(),
    totalMilliKwh: milliKwh?.toString() ?? null,
    dailyMilliKwh:
      milliKwh === null ? null : divideRound(milliKwh, BigInt(days)).toString(),
  };
}

export function buildActionPlanBaseline(input: {
  currentBill: BaselineBillInput;
  comparisonBill: BaselineBillInput | null;
  candidateCode: string;
  candidateVersion: number;
  inspectionCode: string;
  inspectionVersion: number;
  inspectionResultCode: string;
  capturedAt: Date;
}): ActionPlanBaselineSnapshot {
  const current = billMetrics(input.currentBill);
  const comparison = input.comparisonBill ? billMetrics(input.comparisonBill) : null;
  return {
    sourceBillId: input.currentBill.id,
    comparisonBillId: input.comparisonBill?.id ?? null,
    periodStart: input.currentBill.periodStart,
    periodEnd: input.currentBill.periodEnd,
    inclusiveDays: current.days,
    totalCostRupiah: current.totalCost,
    costPerDayRupiah: current.dailyCost,
    totalKwhMilliKwh: current.totalMilliKwh,
    kwhPerDayMilliKwh: current.dailyMilliKwh,
    tariffRupiahPerKwh: input.currentBill.tariffRupiahPerKwh,
    comparisonPeriodStart: input.comparisonBill?.periodStart ?? null,
    comparisonPeriodEnd: input.comparisonBill?.periodEnd ?? null,
    comparisonInclusiveDays: comparison?.days ?? null,
    comparisonTotalCostRupiah: comparison?.totalCost ?? null,
    comparisonCostPerDayRupiah: comparison?.dailyCost ?? null,
    comparisonTotalKwhMilliKwh: comparison?.totalMilliKwh ?? null,
    comparisonKwhPerDayMilliKwh: comparison?.dailyMilliKwh ?? null,
    candidateCode: input.candidateCode,
    candidateVersion: input.candidateVersion,
    inspectionCode: input.inspectionCode,
    inspectionVersion: input.inspectionVersion,
    inspectionResultCode: input.inspectionResultCode,
    capturedAt: input.capturedAt.toISOString(),
  };
}
