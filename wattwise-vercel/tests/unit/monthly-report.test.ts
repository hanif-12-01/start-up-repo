import { describe, expect, it } from 'vitest';
import {
  resolveReportCompleteness,
} from '@/server/services/monthly-report.service';
import {
  monthInTimeZone,
  reportMonthBoundaries,
  reportMonthSchema,
  resolveReportMonth,
} from '@/server/validation/monthly-report';

describe('IT-DIAG-07B monthly report month contract', () => {
  it.each(['2026-01', '2026-08'])('accepts strict YYYY-MM value %s', (month) => {
    expect(reportMonthSchema.parse(month)).toBe(month);
  });

  it.each(['2026-8', '26-08', '2026-13', 'teks bebas', '2026-00'])(
    'rejects invalid month value %s',
    (month) => {
      expect(() => reportMonthSchema.parse(month)).toThrow();
    }
  );

  it('rejects a month after the current report timezone month', () => {
    expect(() =>
      resolveReportMonth({
        requestedMonth: '2026-09',
        latestBillPeriodEnd: '2026-08-31',
        now: new Date('2026-08-03T00:00:00.000Z'),
      })
    ).toThrow('REPORT_MONTH_IN_FUTURE');
  });

  it('defaults to the latest bill period_end month and otherwise to current month', () => {
    const now = new Date('2026-08-03T00:00:00.000Z');
    expect(
      resolveReportMonth({ latestBillPeriodEnd: '2026-07-31', now })
    ).toBe('2026-07');
    expect(resolveReportMonth({ latestBillPeriodEnd: null, now })).toBe('2026-08');
  });

  it('builds date-only half-open month boundaries without calendar proration', () => {
    expect(reportMonthBoundaries('2026-08')).toEqual({
      monthStart: '2026-08-01',
      nextMonthStart: '2026-09-01',
    });
    expect(reportMonthBoundaries('2026-12')).toEqual({
      monthStart: '2026-12-01',
      nextMonthStart: '2027-01-01',
    });
  });

  it('uses the supplied authoritative timezone instead of browser state', () => {
    const instant = new Date('2026-08-01T00:30:00.000Z');
    expect(monthInTimeZone(instant, 'Asia/Jakarta')).toBe('2026-08');
    expect(monthInTimeZone(instant, 'Pacific/Honolulu')).toBe('2026-07');
  });
});

describe('IT-DIAG-07B report completeness precedence', () => {
  it.each([
    [{ hasBill: false, sessionStatus: null, actionStatuses: [], outcomeCount: 0 }, 'NO_BILL'],
    [{ hasBill: true, sessionStatus: null, actionStatuses: [], outcomeCount: 0 }, 'BILL_ONLY'],
    [{ hasBill: true, sessionStatus: 'ANALYZED', actionStatuses: [], outcomeCount: 0 }, 'DIAGNOSTIC_IN_PROGRESS'],
    [{ hasBill: true, sessionStatus: 'INSPECTION_IN_PROGRESS', actionStatuses: ['PLANNED'], outcomeCount: 0 }, 'ACTION_IN_PROGRESS'],
    [{ hasBill: true, sessionStatus: 'INSPECTION_IN_PROGRESS', actionStatuses: ['IN_PROGRESS'], outcomeCount: 0 }, 'ACTION_IN_PROGRESS'],
    [{ hasBill: true, sessionStatus: 'INSPECTION_IN_PROGRESS', actionStatuses: ['COMPLETED'], outcomeCount: 0 }, 'WAITING_EVALUATION'],
    [{ hasBill: true, sessionStatus: 'INSPECTION_IN_PROGRESS', actionStatuses: ['COMPLETED'], outcomeCount: 1 }, 'EVALUATED'],
    [{ hasBill: true, sessionStatus: 'CLOSED', actionStatuses: ['COMPLETED'], outcomeCount: 1 }, 'SESSION_CLOSED'],
  ] as const)('resolves %s as %s', (input, expected) => {
    expect(resolveReportCompleteness(input)).toBe(expected);
  });
});
