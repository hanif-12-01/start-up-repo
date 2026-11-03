import { describe, expect, it } from 'vitest';
import { compareNormalizedPeriods } from '@/server/services/operational-energy-insights.service';
import type { NormalizationOutput } from '@/server/services/energy-normalization.service';

describe('Operational Energy Insights (Unit)', () => {
  const periodA: NormalizationOutput = {
    status: 'VALID',
    statusLabel: 'Valid untuk Perbandingan',
    production: {
      id: 'prod-a',
      processName: 'Laundry Kiloan',
      outputUnit: 'kg',
      outputQuantity: '200',
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-10-08T00:00:00.000Z',
      durationDays: 7,
    },
    energy: {
      totalKwh: '120',
      sourceName: 'Meter Induk PLN',
      sourceType: 'METER',
      measurementBoundary: 'WHOLE_SITE',
      hasEstimated: false,
      coveragePercent: 100,
      recordCount: 1,
    },
    intensity: {
      kwhPerUnit: '0.600',
      formatted: '0,60',
      unitLabel: 'kWh/kg',
    },
    boundaryNote: 'Meter seluruh usaha',
    caveats: [],
  };

  const periodB: NormalizationOutput = {
    status: 'VALID',
    statusLabel: 'Valid untuk Perbandingan',
    production: {
      id: 'prod-b',
      processName: 'Laundry Kiloan',
      outputUnit: 'kg',
      outputQuantity: '250',
      periodStart: '2026-10-08T00:00:00.000Z',
      periodEnd: '2026-10-15T00:00:00.000Z',
      durationDays: 7,
    },
    energy: {
      totalKwh: '132',
      sourceName: 'Meter Induk PLN',
      sourceType: 'METER',
      measurementBoundary: 'WHOLE_SITE',
      hasEstimated: false,
      coveragePercent: 100,
      recordCount: 1,
    },
    intensity: {
      kwhPerUnit: '0.528',
      formatted: '0,53',
      unitLabel: 'kWh/kg',
    },
    boundaryNote: 'Meter seluruh usaha',
    caveats: [],
  };

  it('correctly compares two valid periods where production growth exceeds energy increase (Case 1)', () => {
    // Energy: 120 -> 132 (+10%)
    // Output: 200 -> 250 (+25%)
    // Intensity: 0.600 -> 0.528 (-12% = MORE_EFFICIENT)
    const res = compareNormalizedPeriods(periodA, periodB);

    expect(res.status).toBe('COMPARISON_AVAILABLE');
    expect(res.hasComparison).toBe(true);
    expect(res.metrics?.energyChangePercent).toBe(10);
    expect(res.metrics?.outputChangePercent).toBe(25);
    expect(res.metrics?.intensityChangePercent).toBe(-12);
    expect(res.metrics?.intensityTrend).toBe('MORE_EFFICIENT');
    expect(res.headline).toContain('Pemakaian Listrik Bertambah Sejalan dengan Kenaikan Produksi');
    expect(res.explanation).toContain('lebih hemat 12%');
    expect(res.boundaryNote).toContain('seluruh tempat usaha');
  });

  it('detects when energy increases without corresponding production output (Case 2)', () => {
    // Energy: 100 -> 120 (+20%)
    // Output: 200 -> 200 (0% = STABLE)
    // Intensity: 0.500 -> 0.600 (+20% = LESS_EFFICIENT)
    const baseA: NormalizationOutput = {
      ...periodA,
      energy: { ...periodA.energy!, totalKwh: '100' },
      intensity: { ...periodA.intensity!, kwhPerUnit: '0.500' },
    };
    const baseB: NormalizationOutput = {
      ...periodB,
      production: { ...periodB.production, outputQuantity: '200' },
      energy: { ...periodB.energy!, totalKwh: '120' },
      intensity: { ...periodB.intensity!, kwhPerUnit: '0.600' },
    };

    const res = compareNormalizedPeriods(baseA, baseB);
    expect(res.status).toBe('COMPARISON_AVAILABLE');
    expect(res.metrics?.energyChangePercent).toBe(20);
    expect(res.metrics?.outputChangePercent).toBe(0);
    expect(res.metrics?.intensityTrend).toBe('LESS_EFFICIENT');
    expect(res.headline).toContain('Pemakaian Listrik Meningkat Tanpa Kenaikan Produksi');
    expect(res.explanation).toContain('relatif sama');
  });

  it('detects when energy decreases while production increases (Case 3)', () => {
    // Energy: 120 -> 100 (-16.7%)
    // Output: 200 -> 220 (+10%)
    const baseA = { ...periodA };
    const baseB: NormalizationOutput = {
      ...periodB,
      production: { ...periodB.production, outputQuantity: '220' },
      energy: { ...periodB.energy!, totalKwh: '100' },
      intensity: { ...periodB.intensity!, kwhPerUnit: '0.455' },
    };

    const res = compareNormalizedPeriods(baseA, baseB);
    expect(res.status).toBe('COMPARISON_AVAILABLE');
    expect(res.metrics?.energyTrend).toBe('DOWN');
    expect(res.metrics?.outputTrend).toBe('UP');
    expect(res.metrics?.intensityTrend).toBe('MORE_EFFICIENT');
    expect(res.headline).toContain('Efisiensi Penggunaan Listrik Meningkat');
  });

  it('rejects comparison when process names or output units do not match', () => {
    const diffProcess: NormalizationOutput = {
      ...periodB,
      production: {
        ...periodB.production,
        processName: 'Dry Cleaning',
        outputUnit: 'pcs',
      },
    };

    const res = compareNormalizedPeriods(periodA, diffProcess);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.hasComparison).toBe(false);
    expect(res.headline).toBe('Proses Usaha Berbeda');
  });

  it('rejects comparison when either period has INSUFFICIENT_DATA normalization', () => {
    const incompleteA: NormalizationOutput = {
      ...periodA,
      status: 'INSUFFICIENT_DATA',
      intensity: undefined,
    };

    const res = compareNormalizedPeriods(incompleteA, periodB);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.hasComparison).toBe(false);
  });

  it('flags NEEDS_REVIEW when either period contains estimated energy', () => {
    const estimatedA: NormalizationOutput = {
      ...periodA,
      status: 'NEEDS_REVIEW',
      energy: {
        ...periodA.energy!,
        hasEstimated: true,
      },
    };

    const res = compareNormalizedPeriods(estimatedA, periodB);
    expect(res.status).toBe('NEEDS_REVIEW');
    expect(res.hasComparison).toBe(true);
    expect(res.caveats.some((c) => c.includes('perkiraan (estimasi)'))).toBe(true);
  });

  it('flags caveat when measurement boundaries differ between periods', () => {
    const submeterB: NormalizationOutput = {
      ...periodB,
      energy: {
        ...periodB.energy!,
        measurementBoundary: 'SUBMETER',
        sourceName: 'Submeter Cuci',
      },
    };

    const res = compareNormalizedPeriods(periodA, submeterB);
    expect(res.status).toBe('NEEDS_REVIEW');
    expect(res.caveats.some((c) => c.includes('Cakupan pengukuran berbeda'))).toBe(true);
  });
});
