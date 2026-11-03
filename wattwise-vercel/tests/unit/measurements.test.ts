import { describe, expect, it } from 'vitest';
import { createEnergyMeasurementSchema, createMeasurementSourceSchema, listMeasurementsSchema } from '../../src/server/validation/measurements';

export const validMeasurement = {
  businessId: 'business-1', measurementSourceId: 'source-1',
  periodStart: '2026-01-01T00:00:00+07:00', periodEnd: '2026-01-02T00:00:00+07:00',
  sourceTimezone: 'Asia/Jakarta', energyKwh: '12.123', unit: 'kWh', measurementKind: 'INTERVAL_ENERGY',
  measurementMethod: 'MANUAL', consumptionBasis: 'MEASURED', qualityStatus: 'RECORDED', provenanceReference: 'logbook row 1',
};

describe('Phase01 strict measurement contract', () => {
  it.each(['0','0.001','12.123','999999999999.999'])('accepts exact decimal %s', energyKwh => {
    expect(createEnergyMeasurementSchema.parse({ ...validMeasurement, energyKwh }).energyKwh).toBe(energyKwh);
  });
  it.each(['-1','NaN','Infinity','-Infinity','1e3','1,2','1.0001','1000000000000','00','01.1','.1','1.',' 1','',null,NaN,Infinity,1])('rejects invalid decimal %s', energyKwh => {
    expect(createEnergyMeasurementSchema.safeParse({ ...validMeasurement, energyKwh }).success).toBe(false);
  });
  it.each([
    { periodStart: '2026-02-30T00:00:00+07:00' }, { periodStart: 'not a date' },
    { periodStart: '2026-01-01T00:00:00' }, { periodStart: '2026-01-01T00:00:00+25:00' },
    { periodStart: '2026-01-01T00:00:00Z' }, { periodStart: '2026-01-01T00:00:00.1234+07:00' },
    { periodEnd: validMeasurement.periodStart }, { periodEnd: '2025-01-01T00:00:00+07:00' },
    { sourceTimezone: 'Invalid/Zone' }, { sourceTimezone: 'UTC' },
    { unit: 'kW' }, { measurementKind: 'CUMULATIVE' }, { measurementMethod: 'UNKNOWN' },
    { measurementSourceId: '' }, { measurementSourceId: undefined }, { businessId: '../tenant' },
    { qualityStatus: 'VERIFIED' }, { provenanceReference: '' }, { provenanceReference: ' '.repeat(3) },
    { consumptionBasis: 'ESTIMATED' }, { notes: 'x'.repeat(1001) }, { userId: 'forged' },
  ])('rejects invalid trust-boundary input %j', changes => {
    const result = createEnergyMeasurementSchema.safeParse({ ...validMeasurement, ...changes });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toBeDefined();
  });
  it('accepts explicit UTC and non-Jakarta Indonesian zones', () => {
    for (const [sourceTimezone, zone] of [['UTC','Z'],['Asia/Makassar','+08:00'],['Asia/Jayapura','+09:00']]) {
      expect(createEnergyMeasurementSchema.safeParse({ ...validMeasurement, sourceTimezone,
        periodStart: `2026-01-01T00:00:00${zone}`, periodEnd: `2026-01-02T00:00:00${zone}` }).success).toBe(true);
    }
    expect(createEnergyMeasurementSchema.safeParse({ ...validMeasurement, sourceTimezone: 'UTC', periodStart: '2026-01-01T00:00:00-00:00', periodEnd:'2026-01-02T00:00:00Z' }).success).toBe(false);
  });
  it('keeps estimate distinct, requires review', () => {
    expect(createEnergyMeasurementSchema.parse({ ...validMeasurement, consumptionBasis: 'ESTIMATED', qualityStatus: 'NEEDS_REVIEW' }).consumptionBasis).toBe('ESTIMATED');
  });
  it('separates source identity from input method', () => {
    const source = { businessId:'business-1',name:'Main meter',sourceType:'METER',measurementBoundary:'WHOLE_SITE',provenanceKey:'meter-123' };
    expect(createMeasurementSourceSchema.parse(source)).toEqual(source);
    expect(createMeasurementSourceSchema.safeParse({ ...source, sourceType:'CSV_IMPORT' }).success).toBe(false);
    expect(createMeasurementSourceSchema.safeParse({ ...source, provenanceKey:'' }).success).toBe(false);
  });
  it('bounds list filters and rejects reversed ranges', () => {
    expect(listMeasurementsSchema.parse({businessId:'b'}).limit).toBe(100);
    expect(listMeasurementsSchema.safeParse({businessId:'b',limit:201}).success).toBe(false);
    expect(listMeasurementsSchema.safeParse({businessId:'b',periodStart:validMeasurement.periodEnd,periodEnd:validMeasurement.periodStart}).success).toBe(false);
  });
});
