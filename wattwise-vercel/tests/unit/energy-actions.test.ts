import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ source: vi.fn(), energy: vi.fn(), refresh: vi.fn() }));
vi.mock('@/server/services/measurement.service', () => ({ createMeasurementSource: mocks.source, createEnergyMeasurement: mocks.energy }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
import { createSourceAction, createEnergyAction } from '@/app/(product)/energy/actions';
import { energyError } from '@/lib/energy-input';

describe('Energy source server action boundary', () => {
  beforeEach(() => vi.resetAllMocks());
  it('uses service, never trusts browser user identity, refreshes only success', async () => {
    mocks.source.mockResolvedValue({ ok: true, data: { id: 's' } });
    const form = new FormData();
    for (const [k, v] of Object.entries({ businessId: 'b', name: 'Meter', sourceType: 'METER', measurementBoundary: 'UNKNOWN', provenanceKey: 'meter', userId: 'attacker' })) form.set(k, v);
    expect(await createSourceAction({}, form)).toMatchObject({ success: expect.any(String) });
    expect(mocks.source).toHaveBeenCalledWith({ businessId: 'b', name: 'Meter', sourceType: 'METER', measurementBoundary: 'UNKNOWN', provenanceKey: 'meter' });
    expect(mocks.refresh).toHaveBeenCalledWith('/energy');
  });
  it.each(['UNAUTHENTICATED', 'MEASUREMENT_WRITE_DENIED', 'DUPLICATE_SOURCE', 'NOT_FOUND'])('retains safe service error %s', async code => {
    mocks.source.mockResolvedValue({ ok: false, error: { code, message: 'Tidak tersedia' } });
    expect(await createSourceAction({}, new FormData())).toMatchObject({ code, error: energyError(code) });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe('Manual energy action boundary', () => {
  beforeEach(() => vi.resetAllMocks());
  const input = () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ businessId: 'b', measurementSourceId: 's', periodStart: '2026-01-01T00:00', periodEnd: '2026-01-02T00:00', sourceTimezone: 'Asia/Jakarta', energyKwh: '12.345', consumptionBasis: 'ESTIMATED', provenanceReference: 'log-1', userId: 'attacker', unit: 'Wh', measurementKind: 'CUMULATIVE', measurementMethod: 'SENSOR', qualityStatus: 'RECORDED' })) form.set(key, value);
    return form;
  };
  it('fixes contract server-side, preserves decimals, refreshes success', async () => {
    mocks.energy.mockResolvedValue({ ok: true });
    expect(await createEnergyAction({}, input())).toHaveProperty('success');
    const [payload] = mocks.energy.mock.calls[0];
    expect(payload).toMatchObject({ unit: 'kWh', measurementKind: 'INTERVAL_ENERGY', measurementMethod: 'MANUAL', qualityStatus: 'NEEDS_REVIEW', energyKwh: '12.345', periodStart: '2026-01-01T00:00:00+07:00' });
    expect(payload).not.toHaveProperty('userId');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it('rejects malformed values without calling write service', async () => {
    const form = input(); form.set('energyKwh', '-1');
    expect(await createEnergyAction({}, form)).toMatchObject({ code: 'VALIDATION_ERROR', issues: [{ path: 'energyKwh', message: expect.any(String) }] });
    expect(mocks.energy).not.toHaveBeenCalled();
  });
  it.each(['UNAUTHENTICATED', 'MEASUREMENT_WRITE_DENIED', 'NOT_FOUND', 'DUPLICATE_INTERVAL', 'OVERLAPPING_INTERVAL', 'SOURCE_BASIS_MISMATCH'])('returns service error %s without refresh', async code => {
    mocks.energy.mockResolvedValue({ ok: false, error: { code, message: 'Tidak tersedia' } });
    expect(await createEnergyAction({}, input())).toMatchObject({ code, error: energyError(code) });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
