import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import { readDashboardSnapshot } from '@/server/repositories/dashboard.repository';
import { getUserEntitlements } from '@/server/services/entitlement.service';
import {
  DashboardUnavailableError,
  getDashboardReadModel,
  getDiagnosticOverviewReadModel,
} from '@/server/services/dashboard.service';

vi.mock('@/server/repositories/dashboard.repository', () => ({ readDashboardSnapshot: vi.fn() }));
vi.mock('@/server/services/entitlement.service', () => ({ getUserEntitlements: vi.fn() }));

const original = { ...env };
beforeEach(() => {
  vi.resetAllMocks();
  env.DASHBOARD_ENABLED = false;
  env.DIAGNOSTICS_ENABLED = true;
  env.SEGMENT_TEMPLATES_ENABLED = true;
  vi.mocked(getUserEntitlements).mockResolvedValue({
    plan: 'FREE', isTrialExpired: false, trialEndsAt: null,
    usage: { businessCount: 1 }, limits: { maxBusinesses: 1 },
  } as Awaited<ReturnType<typeof getUserEntitlements>>);
  vi.mocked(readDashboardSnapshot).mockResolvedValue({
    business: { id: 'owned', name: 'Synthetic', segment: 'KOS', updatedAt: new Date('2026-01-01') },
    businesses: [{ id: 'owned', name: 'Synthetic' }], bills: [], diagnostic: null,
  } as unknown as Awaited<ReturnType<typeof readDashboardSnapshot>>);
});
afterEach(() => Object.assign(env, original));

describe('diagnostic overview is independent of the Dashboard feature gate', () => {
  it('parses absent flags as OFF rather than enabling a feature implicitly', async () => {
    vi.stubEnv('DIAGNOSTICS_ENABLED', undefined);
    vi.stubEnv('SEGMENT_TEMPLATES_ENABLED', undefined);
    vi.stubEnv('DASHBOARD_ENABLED', undefined);
    vi.resetModules();
    try {
      const fresh = await import('@/config/env');
      expect(fresh.env.DIAGNOSTICS_ENABLED).toBe(false);
      expect(fresh.env.SEGMENT_TEMPLATES_ENABLED).toBe(false);
      expect(fresh.env.DASHBOARD_ENABLED).toBe(false);
    } finally { vi.unstubAllEnvs(); }
  });
  it('reproduces the old Dashboard exception; diagnostic overview works with no bills', async () => {
    await expect(getDashboardReadModel('user', 'owned')).rejects.toBeInstanceOf(DashboardUnavailableError);
    expect(readDashboardSnapshot).not.toHaveBeenCalled();
    const view = await getDiagnosticOverviewReadModel('user', 'owned');
    expect(readDashboardSnapshot).toHaveBeenCalledWith('user', 'owned');
    expect(view.nextAction).toMatchObject({ kind: 'LINK', label: 'Tambah Tagihan Pertama' });
    expect(view.candidateSummaries).toEqual([]);
    expect(view.latestDiagnosticSummary).toBeNull();
  });

  it('requests a comparison for one bill, starts only with two eligible bills', async () => {
    const snapshot = await vi.mocked(readDashboardSnapshot)('user');
    const bill = { id: 'latest', periodStart: '2026-02-01', periodEnd: '2026-02-28', totalAmountRupiah: 1500000n, kwh: null, updatedAt: new Date('2026-03-01') };
    vi.mocked(readDashboardSnapshot).mockResolvedValue({ ...snapshot, bills: [bill] } as Awaited<ReturnType<typeof readDashboardSnapshot>>);
    expect((await getDiagnosticOverviewReadModel('user', 'owned')).nextAction).toMatchObject({ label: 'Tambah Tagihan Pembanding' });
    vi.mocked(readDashboardSnapshot).mockResolvedValue({ ...snapshot, bills: [bill, { ...bill, id: 'previous', periodStart: '2026-01-01', periodEnd: '2026-01-31', totalAmountRupiah: 1000000n }] } as Awaited<ReturnType<typeof readDashboardSnapshot>>);
    expect((await getDiagnosticOverviewReadModel('user', 'owned')).nextAction).toEqual({ kind: 'START_DIAGNOSTIC', label: 'Cek Kenaikan', electricityBillId: 'latest' });
  });

  it.each(['DIAGNOSTICS_ENABLED', 'SEGMENT_TEMPLATES_ENABLED'] as const)('keeps %s OFF gated without reading data', async (flag) => {
    env[flag] = false;
    await expect(getDiagnosticOverviewReadModel('user', 'owned')).rejects.toThrow('Pemeriksaan kenaikan belum tersedia.');
    expect(readDashboardSnapshot).not.toHaveBeenCalled();
  });

  it('does not turn repository failures into empty/fabricated results', async () => {
    vi.mocked(readDashboardSnapshot).mockRejectedValue(new Error('synthetic failure'));
    await expect(getDiagnosticOverviewReadModel('user', 'owned')).rejects.toThrow('synthetic failure');
  });
});
