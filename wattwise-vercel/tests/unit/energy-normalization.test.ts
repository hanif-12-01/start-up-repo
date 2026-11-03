import { describe, expect, it } from 'vitest';
import { computeNormalization } from '@/server/services/energy-normalization.service';

describe('computeNormalization (Unit)', () => {
  const sampleProduction = {
    id: 'prod-1',
    processName: 'Laundry kiloan',
    outputUnit: 'kg',
    outputQuantity: '200',
    periodStart: new Date('2026-11-01T00:00:00Z'),
    periodEnd: new Date('2026-11-08T00:00:00Z'),
  };

  const sampleMeasurements = [
    {
      id: 'm-1',
      measurementSourceId: 'source-1',
      sourceName: 'Meter Induk PLN',
      sourceType: 'METER',
      measurementBoundary: 'WHOLE_SITE',
      periodStart: new Date('2026-11-01T00:00:00Z'),
      periodEnd: new Date('2026-11-08T00:00:00Z'),
      energyKwh: '120.000',
      consumptionBasis: 'MEASURED',
      qualityStatus: 'RECORDED',
    },
  ];

  it('calculates valid energy intensity for clean whole-site measurement', () => {
    const res = computeNormalization(sampleProduction, sampleMeasurements);
    expect(res.status).toBe('VALID');
    expect(res.statusLabel).toBe('Valid untuk Perbandingan');
    expect(res.energy?.totalKwh).toBe('120');
    expect(res.energy?.coveragePercent).toBe(100);
    expect(res.intensity?.kwhPerUnit).toBe('0.600');
    expect(res.intensity?.formatted).toBe('0,60');
    expect(res.intensity?.unitLabel).toBe('kWh/kg');
    expect(res.boundaryNote).toContain('meter seluruh usaha');
    expect(res.boundaryNote).toContain('tidak menunjukkan efisiensi khusus untuk mesin tertentu');
    expect(res.caveats).toHaveLength(0);
  });

  it('marks status as NEEDS_REVIEW when energy measurement contains estimated basis', () => {
    const estimatedMeasurements = [
      {
        ...sampleMeasurements[0],
        consumptionBasis: 'ESTIMATED',
        qualityStatus: 'NEEDS_REVIEW',
      },
    ];
    const res = computeNormalization(sampleProduction, estimatedMeasurements);
    expect(res.status).toBe('NEEDS_REVIEW');
    expect(res.statusLabel).toBe('Perlu Pemeriksaan');
    expect(res.energy?.hasEstimated).toBe(true);
    expect(res.caveats.some((c) => c.includes('perkiraan (estimasi)'))).toBe(true);
    expect(res.intensity?.kwhPerUnit).toBe('0.600');
  });

  it('marks status as NEEDS_REVIEW when measurement boundary is UNKNOWN', () => {
    const unknownBoundary = [
      {
        ...sampleMeasurements[0],
        measurementBoundary: 'UNKNOWN',
      },
    ];
    const res = computeNormalization(sampleProduction, unknownBoundary);
    expect(res.status).toBe('NEEDS_REVIEW');
    expect(res.caveats.some((c) => c.includes('UNKNOWN'))).toBe(true);
  });

  it('handles submeter boundary with appropriate label and note', () => {
    const submeterMeasurements = [
      {
        ...sampleMeasurements[0],
        measurementBoundary: 'SUBMETER',
        sourceName: 'Submeter Mesin Cuci',
      },
    ];
    const res = computeNormalization(sampleProduction, submeterMeasurements);
    expect(res.status).toBe('VALID');
    expect(res.boundaryNote).toContain('meter bagian (submeter)');
  });

  it('prevents division by zero when outputQuantity is 0', () => {
    const zeroProduction = {
      ...sampleProduction,
      outputQuantity: '0',
    };
    const res = computeNormalization(zeroProduction, sampleMeasurements);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.intensity).toBeUndefined();
    expect(res.guidance).toContain('Hasil produksi 0 tidak dapat digunakan');
  });

  it('rejects invalid or negative output quantities', () => {
    const invalidProduction = {
      ...sampleProduction,
      outputQuantity: '-50',
    };
    const res = computeNormalization(invalidProduction, sampleMeasurements);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.intensity).toBeUndefined();
    expect(res.guidance).toContain('tidak valid');
  });

  it('returns INSUFFICIENT_DATA when no energy measurements exist', () => {
    const res = computeNormalization(sampleProduction, []);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.intensity).toBeUndefined();
    expect(res.guidance).toContain('Belum ada catatan pemakaian listrik');
  });

  it('returns INSUFFICIENT_DATA when energy coverage is incomplete (<95%)', () => {
    // Only 3 days of energy out of 7 days
    const partialMeasurements = [
      {
        ...sampleMeasurements[0],
        periodEnd: new Date('2026-11-04T00:00:00Z'),
        energyKwh: '50.000',
      },
    ];
    const res = computeNormalization(sampleProduction, partialMeasurements);
    expect(res.status).toBe('INSUFFICIENT_DATA');
    expect(res.energy?.coveragePercent).toBeLessThan(95);
    expect(res.guidance).toContain('Catatan listrik baru mencakup');
  });

  it('sums multiple contiguous non-overlapping intervals correctly', () => {
    const contiguousMeasurements = [
      {
        ...sampleMeasurements[0],
        id: 'm-1',
        periodStart: new Date('2026-11-01T00:00:00Z'),
        periodEnd: new Date('2026-11-04T00:00:00Z'),
        energyKwh: '60.000',
      },
      {
        ...sampleMeasurements[0],
        id: 'm-2',
        periodStart: new Date('2026-11-04T00:00:00Z'),
        periodEnd: new Date('2026-11-08T00:00:00Z'),
        energyKwh: '60.000',
      },
    ];
    const res = computeNormalization(sampleProduction, contiguousMeasurements);
    expect(res.status).toBe('VALID');
    expect(res.energy?.totalKwh).toBe('120');
    expect(res.energy?.recordCount).toBe(2);
    expect(res.intensity?.kwhPerUnit).toBe('0.600');
  });

  it('handles multiple sources by grouping and picking the dominant source or selectedSourceId', () => {
    const multiSourceMeasurements = [
      ...sampleMeasurements,
      {
        id: 'm-sub',
        measurementSourceId: 'source-sub',
        sourceName: 'Submeter Pengering',
        sourceType: 'METER',
        measurementBoundary: 'SUBMETER',
        periodStart: new Date('2026-11-01T00:00:00Z'),
        periodEnd: new Date('2026-11-08T00:00:00Z'),
        energyKwh: '40.000',
        consumptionBasis: 'MEASURED',
        qualityStatus: 'RECORDED',
      },
    ];

    // Explicitly requesting the submeter
    const resSub = computeNormalization(sampleProduction, multiSourceMeasurements, 'source-sub');
    expect(resSub.status).toBe('VALID');
    expect(resSub.energy?.sourceName).toBe('Submeter Pengering');
    expect(resSub.energy?.totalKwh).toBe('40');
    expect(resSub.intensity?.kwhPerUnit).toBe('0.200');

    // Without specifying, handles multiple sources with caution
    const resAuto = computeNormalization(sampleProduction, multiSourceMeasurements);
    expect(resAuto.caveats.some((c) => c.includes('lebih dari satu sumber'))).toBe(true);
  });
});
