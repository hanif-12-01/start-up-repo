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

  it('revalidates demo 125.5 kWh / 250 kg = 0.502 with source identity', () => {
    const result = computeNormalization({ ...sampleProduction, outputQuantity: '250' }, [{ ...sampleMeasurements[0], energyKwh: '125.500' }]);
    expect(result.status).toBe('VALID');
    expect(result.intensity?.kwhPerUnit).toBe('0.502');
    expect(result.intensity?.formatted).toBe('0,502');
    expect(result.energy?.sourceId).toBe('source-1');
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

  // --- REGRESSION REPRODUCTION TESTS FOR FINDINGS A, B, C, D, E ---

  describe('Finding A: Unsafe Automatic Source Selection', () => {
    it('does NOT silently pick a submeter with more records over a whole-site meter; requires explicit selection', () => {
      // 1 whole-site record covering full period vs 2 submeter records
      const measurements = [
        {
          id: 'm-whole-1',
          measurementSourceId: 'source-whole',
          sourceName: 'Meter Induk PLN',
          sourceType: 'METER',
          measurementBoundary: 'WHOLE_SITE',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '100.000',
          consumptionBasis: 'MEASURED',
          qualityStatus: 'RECORDED',
        },
        {
          id: 'm-sub-1',
          measurementSourceId: 'source-sub',
          sourceName: 'Submeter Cuci',
          sourceType: 'METER',
          measurementBoundary: 'SUBMETER',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-04T00:00:00Z'),
          energyKwh: '20.000',
          consumptionBasis: 'MEASURED',
          qualityStatus: 'RECORDED',
        },
        {
          id: 'm-sub-2',
          measurementSourceId: 'source-sub',
          sourceName: 'Submeter Cuci',
          sourceType: 'METER',
          measurementBoundary: 'SUBMETER',
          periodStart: new Date('2026-11-04T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '20.000',
          consumptionBasis: 'MEASURED',
          qualityStatus: 'RECORDED',
        },
      ];

      // When no source is selected, do NOT guess or pick submeter just because it has 2 records.
      // Must require explicit selection or return guidance
      const res = computeNormalization(sampleProduction, measurements);
      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance).toContain('Ada beberapa sumber listrik');
      expect(res.guidance).toContain('Pilih sumber');
    });

    it('allows valid normalization when user explicitly selects a source among multiple', () => {
      const measurements = [
        {
          id: 'm-whole-1',
          measurementSourceId: 'source-whole',
          sourceName: 'Meter Induk PLN',
          sourceType: 'METER',
          measurementBoundary: 'WHOLE_SITE',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '100.000',
          consumptionBasis: 'MEASURED',
          qualityStatus: 'RECORDED',
        },
        {
          id: 'm-sub-1',
          measurementSourceId: 'source-sub',
          sourceName: 'Submeter Cuci',
          sourceType: 'METER',
          measurementBoundary: 'SUBMETER',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '40.000',
          consumptionBasis: 'MEASURED',
          qualityStatus: 'RECORDED',
        },
      ];

      const resWhole = computeNormalization(sampleProduction, measurements, 'source-whole');
      expect(resWhole.status).toBe('VALID');
      expect(resWhole.energy?.sourceName).toBe('Meter Induk PLN');
      expect(resWhole.energy?.totalKwh).toBe('100');
      expect(resWhole.intensity?.kwhPerUnit).toBe('0.500');

      const resSub = computeNormalization(sampleProduction, measurements, 'source-sub');
      expect(resSub.status).toBe('VALID');
      expect(resSub.energy?.sourceName).toBe('Submeter Cuci');
      expect(resSub.energy?.totalKwh).toBe('40');
      expect(resSub.intensity?.kwhPerUnit).toBe('0.200');
    });
  });

  describe('Finding B: Unsafe Summing of Partially Overlapping Measurements', () => {
    it('rejects measurements that extend beyond production end without verified alignment', () => {
      // Production: Nov 1 to Nov 8 (7 days). Measurement: Nov 1 to Nov 10 (9 days, 150 kWh)
      const extendedMeasurements = [
        {
          ...sampleMeasurements[0],
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-10T00:00:00Z'),
          energyKwh: '150.000',
        },
      ];
      const res = computeNormalization(sampleProduction, extendedMeasurements);
      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance).toContain('Periode catatan listrik belum cocok dengan periode hasil usaha');
    });

    it('rejects measurements that extend before production start', () => {
      // Production: Nov 1 to Nov 8. Measurement: Oct 28 to Nov 8 (11 days, 180 kWh)
      const earlyMeasurements = [
        {
          ...sampleMeasurements[0],
          periodStart: new Date('2026-10-28T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '180.000',
        },
      ];
      const res = computeNormalization(sampleProduction, earlyMeasurements);
      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance).toContain('Periode catatan listrik belum cocok dengan periode hasil usaha');
    });
  });

  describe('Finding C: 95% - 99.9% Permissive Coverage Rejection', () => {
    it('rejects incomplete coverage even when coverage is 95% or higher (e.g. missing 8 hours in a 7-day period)', () => {
      // 7 days = 168 hours. Missing 8 hours = 160 hours = 95.2% coverage.
      const incompleteMeasurements = [
        {
          ...sampleMeasurements[0],
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-07T16:00:00Z'), // Ends 8 hours early
          energyKwh: '115.000',
        },
      ];
      const res = computeNormalization(sampleProduction, incompleteMeasurements);
      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance).toContain('belum lengkap mencakup seluruh periode operasional');
    });

    it('rejects a gap in the middle between intervals even if coverage is >98%', () => {
      // Interval 1: Nov 1 00:00 to Nov 4 00:00 (72h)
      // Gap: Nov 4 00:00 to Nov 4 02:00 (2h missing out of 168h = 98.8% coverage)
      // Interval 2: Nov 4 02:00 to Nov 8 00:00 (94h)
      const gapMeasurements = [
        {
          ...sampleMeasurements[0],
          id: 'm-1',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-04T00:00:00Z'),
          energyKwh: '50.000',
        },
        {
          ...sampleMeasurements[0],
          id: 'm-2',
          periodStart: new Date('2026-11-04T02:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '65.000',
        },
      ];
      const res = computeNormalization(sampleProduction, gapMeasurements);
      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance?.toLowerCase()).toContain('terdapat jeda waktu');
    });
  });

  describe('Finding D: Overlapping Intervals Double Counting', () => {
    it('rejects overlapping intervals within the same source and does NOT publish an inflated intensity KPI', () => {
      // Interval 1: Nov 1 to Nov 5 (60 kWh)
      // Interval 2: Nov 4 to Nov 8 (60 kWh) -> Overlaps by 24h!
      const overlappingMeasurements = [
        {
          ...sampleMeasurements[0],
          id: 'm-1',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-05T00:00:00Z'),
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
      const res = computeNormalization(sampleProduction, overlappingMeasurements);
      expect(res.status).toBe('NEEDS_REVIEW');
      expect(res.intensity).toBeUndefined(); // Zero tolerance for published double-counted ratio!
      expect(res.guidance).toContain('Terdapat catatan listrik yang saling tumpang tindih');
    });

    it('rejects duplicate intervals', () => {
      const duplicateMeasurements = [
        {
          ...sampleMeasurements[0],
          id: 'm-1',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '120.000',
        },
        {
          ...sampleMeasurements[0],
          id: 'm-2',
          periodStart: new Date('2026-11-01T00:00:00Z'),
          periodEnd: new Date('2026-11-08T00:00:00Z'),
          energyKwh: '120.000',
        },
      ];
      const res = computeNormalization(sampleProduction, duplicateMeasurements);
      expect(res.status).toBe('NEEDS_REVIEW');
      expect(res.intensity).toBeUndefined();
      expect(res.guidance).toContain('Terdapat catatan listrik yang saling tumpang tindih');
    });
  });

  describe('Finding E & Multi-Zone Alignment', () => {
    it('correctly handles timestamps across timezones (WIB/UTC) when exact instants match', () => {
      // Production: Nov 1 00:00 WIB to Nov 8 00:00 WIB
      // In UTC: 2026-10-31T17:00:00Z to 2026-11-07T17:00:00Z
      const wibProduction = {
        ...sampleProduction,
        periodStart: new Date('2026-10-31T17:00:00Z'),
        periodEnd: new Date('2026-11-07T17:00:00Z'),
      };
      const wibMeasurements = [
        {
          ...sampleMeasurements[0],
          periodStart: new Date('2026-10-31T17:00:00Z'),
          periodEnd: new Date('2026-11-07T17:00:00Z'),
          energyKwh: '120.000',
        },
      ];
      const res = computeNormalization(wibProduction, wibMeasurements);
      expect(res.status).toBe('VALID');
      expect(res.energy?.totalKwh).toBe('120');
      expect(res.intensity?.kwhPerUnit).toBe('0.600');
    });
  });
});
