import { describe, expect, it } from 'vitest';
import {
  resolveDashboardNextAction,
  type DashboardNextActionInput,
} from '@/server/services/dashboard-next-action';

function input(
  overrides: Partial<DashboardNextActionInput> = {}
): DashboardNextActionInput {
  return {
    businessId: 'business-a',
    latestBillId: 'bill-current',
    hasEligibleComparison: true,
    session: null,
    ...overrides,
  };
}

function session(
  overrides: Partial<NonNullable<DashboardNextActionInput['session']>> = {}
): NonNullable<DashboardNextActionInput['session']> {
  return {
    id: 'session-a',
    status: 'INSPECTION_IN_PROGRESS',
    closureEligible: false,
    candidates: [],
    ...overrides,
  };
}

function candidate(
  overrides: Partial<
    NonNullable<DashboardNextActionInput['session']>['candidates'][number]
  > = {}
): NonNullable<DashboardNextActionInput['session']>['candidates'][number] {
  return {
    rank: 1,
    inspectable: true,
    inspection: null,
    ...overrides,
  };
}

function inspection(
  overrides: Partial<
    NonNullable<
      NonNullable<DashboardNextActionInput['session']>['candidates'][number]['inspection']
    >
  > = {}
) {
  return {
    id: 'inspection-a',
    status: 'COMPLETED' as const,
    actionEligible: true,
    actionPlan: null,
    ...overrides,
  };
}

function plan(
  overrides: Partial<
    NonNullable<
      NonNullable<
        NonNullable<DashboardNextActionInput['session']>['candidates'][number]['inspection']
      >['actionPlan']
    >
  > = {}
) {
  return {
    id: 'action-a',
    status: 'PLANNED' as const,
    hasEligibleEvaluationBill: false,
    hasOutcome: false,
    ...overrides,
  };
}

describe('IT-DIAG-07A deterministic next action', () => {
  it.each([
    [
      input({ latestBillId: null, hasEligibleComparison: false }),
      'Tambah Tagihan Pertama',
    ],
    [input({ hasEligibleComparison: false }), 'Tambah Tagihan Pembanding'],
    [input(), 'Cek Kenaikan'],
    [input({ session: session({ status: 'DRAFT' }) }), 'Lanjutkan Cek Kenaikan'],
    [
      input({ session: session({ status: 'COLLECTING_CONTEXT' }) }),
      'Lanjutkan Cek Kenaikan',
    ],
    [
      input({
        session: session({
          status: 'ANALYZED',
          candidates: [candidate()],
        }),
      }),
      'Mulai Pemeriksaan',
    ],
    [
      input({
        session: session({
          status: 'ANALYZED',
          candidates: [candidate({ inspectable: false })],
        }),
      }),
      'Lihat Hasil Cek Kenaikan',
    ],
    [
      input({
        session: session({
          candidates: [
            candidate({ inspection: inspection({ status: 'IN_PROGRESS' }) }),
          ],
        }),
      }),
      'Lanjutkan Pemeriksaan',
    ],
    [
      input({
        session: session({ candidates: [candidate({ inspection: inspection() })] }),
      }),
      'Buat Rencana Hemat',
    ],
    [
      input({
        session: session({
          candidates: [
            candidate({ inspection: inspection({ actionPlan: plan() }) }),
          ],
        }),
      }),
      'Mulai Rencana Hemat',
    ],
    [
      input({
        session: session({
          candidates: [
            candidate({
              inspection: inspection({ actionPlan: plan({ status: 'IN_PROGRESS' }) }),
            }),
          ],
        }),
      }),
      'Lanjutkan Rencana Hemat',
    ],
    [
      input({
        session: session({
          candidates: [
            candidate({
              inspection: inspection({
                actionPlan: plan({ status: 'COMPLETED' }),
              }),
            }),
          ],
        }),
      }),
      'Tambah Tagihan Evaluasi',
    ],
    [
      input({
        session: session({
          candidates: [
            candidate({
              inspection: inspection({
                actionPlan: plan({
                  status: 'COMPLETED',
                  hasEligibleEvaluationBill: true,
                }),
              }),
            }),
          ],
        }),
      }),
      'Evaluasi Hasil',
    ],
    [
      input({
        session: session({
          closureEligible: true,
          candidates: [
            candidate({
              inspection: inspection({
                actionPlan: plan({ status: 'COMPLETED', hasOutcome: true }),
              }),
            }),
          ],
        }),
      }),
      'Tutup Sesi Cek Kenaikan',
    ],
    [
      input({ session: session({ status: 'INSPECTION_IN_PROGRESS' }) }),
      'Lihat Perjalanan Cek Kenaikan',
    ],
    [input({ session: session({ status: 'CLOSED' }) }), 'Lihat Ringkasan Sesi'],
  ] as const)('returns exactly one primary action %#', (state, label) => {
    const action = resolveDashboardNextAction(state);
    expect(action.label).toBe(label);
    expect(Object.keys(action).filter((key) => key === 'label')).toHaveLength(1);
  });

  it('applies internal precedence independent of input ordering', () => {
    const activeInspection = candidate({
      rank: 2,
      inspection: inspection({ id: 'inspection-active', status: 'IN_PROGRESS' }),
    });
    const plannedAction = candidate({
      rank: 1,
      inspection: inspection({ actionPlan: plan() }),
    });
    const left = resolveDashboardNextAction(
      input({ session: session({ candidates: [plannedAction, activeInspection] }) })
    );
    const right = resolveDashboardNextAction(
      input({ session: session({ candidates: [activeInspection, plannedAction] }) })
    );
    expect(left).toEqual(right);
    expect(left.label).toBe('Lanjutkan Pemeriksaan');
  });

  it('uses server-selected business context in every bill action URL', () => {
    const action = resolveDashboardNextAction(
      input({
        businessId: 'usaha/dua',
        latestBillId: null,
        hasEligibleComparison: false,
      })
    );
    expect(action).toEqual({
      kind: 'LINK',
      label: 'Tambah Tagihan Pertama',
      href: '/bills/new?businessId=usaha%2Fdua',
    });
  });
});
