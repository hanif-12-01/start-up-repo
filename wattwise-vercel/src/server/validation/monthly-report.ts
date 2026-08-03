import { z } from 'zod';

export const DEFAULT_REPORT_TIMEZONE = 'Asia/Jakarta';

export const reportMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Bulan laporan harus menggunakan format YYYY-MM');

export interface ReportMonthBoundaries {
  monthStart: string;
  nextMonthStart: string;
}

export function monthInTimeZone(
  value: Date,
  timeZone = DEFAULT_REPORT_TIMEZONE
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
    })
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}`;
}

export function reportMonthBoundaries(month: string): ReportMonthBoundaries {
  const acceptedMonth = reportMonthSchema.parse(month);
  const [year, monthNumber] = acceptedMonth.split('-').map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    monthStart: `${acceptedMonth}-01`,
    nextMonthStart: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export function resolveReportMonth(input: {
  requestedMonth?: string;
  latestBillPeriodEnd: string | null;
  now: Date;
  timeZone?: string;
}): string {
  const currentMonth = monthInTimeZone(
    input.now,
    input.timeZone ?? DEFAULT_REPORT_TIMEZONE
  );
  if (input.requestedMonth !== undefined) {
    const requestedMonth = reportMonthSchema.parse(input.requestedMonth);
    if (requestedMonth > currentMonth) {
      throw new Error('REPORT_MONTH_IN_FUTURE');
    }
    return requestedMonth;
  }
  if (input.latestBillPeriodEnd) {
    return reportMonthSchema.parse(input.latestBillPeriodEnd.slice(0, 7));
  }
  return currentMonth;
}
