import { describe, expect, it } from 'vitest';
import {
  createOperationalProcessSchema,
  createProductionRecordSchema,
  listProductionRecordsSchema,
} from '@/server/validation/operational';

describe('Operational Validation (Unit)', () => {
  describe('createOperationalProcessSchema', () => {
    it('accepts valid process payload', () => {
      const valid = {
        businessId: 'biz-123',
        name: 'Laundry Kiloan',
        outputUnit: 'kg',
        description: 'Pencucian pakaian harian',
      };
      const res = createOperationalProcessSchema.safeParse(valid);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('Laundry Kiloan');
        expect(res.data.outputUnit).toBe('kg');
      }
    });

    it('rejects empty name or output unit', () => {
      const invalid = {
        businessId: 'biz-123',
        name: '   ',
        outputUnit: '',
      };
      const res = createOperationalProcessSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects name or output unit exceeding max length', () => {
      const invalid = {
        businessId: 'biz-123',
        name: 'A'.repeat(121),
        outputUnit: 'B'.repeat(31),
      };
      const res = createOperationalProcessSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('createProductionRecordSchema', () => {
    it('accepts valid production record with ISO timestamp and decimal quantity', () => {
      const valid = {
        businessId: 'biz-123',
        operationalProcessId: 'proc-123',
        periodStart: '2026-11-01T00:00:00Z',
        periodEnd: '2026-11-08T00:00:00Z',
        outputQuantity: '250.5',
        notes: 'Minggu pertama November',
      };
      const res = createProductionRecordSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('accepts zero output quantity as valid recording', () => {
      const valid = {
        businessId: 'biz-123',
        operationalProcessId: 'proc-123',
        periodStart: '2026-11-01T00:00:00Z',
        periodEnd: '2026-11-08T00:00:00Z',
        outputQuantity: '0',
      };
      const res = createProductionRecordSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects negative output quantity', () => {
      const invalid = {
        businessId: 'biz-123',
        operationalProcessId: 'proc-123',
        periodStart: '2026-11-01T00:00:00Z',
        periodEnd: '2026-11-08T00:00:00Z',
        outputQuantity: '-10.5',
      };
      const res = createProductionRecordSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects excess fractional precision (more than 3 decimals)', () => {
      const invalid = {
        businessId: 'biz-123',
        operationalProcessId: 'proc-123',
        periodStart: '2026-11-01T00:00:00Z',
        periodEnd: '2026-11-08T00:00:00Z',
        outputQuantity: '10.5555',
      };
      const res = createProductionRecordSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects period where periodEnd <= periodStart', () => {
      const invalid = {
        businessId: 'biz-123',
        operationalProcessId: 'proc-123',
        periodStart: '2026-11-08T00:00:00Z',
        periodEnd: '2026-11-01T00:00:00Z',
        outputQuantity: '100',
      };
      const res = createProductionRecordSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Waktu selesai harus setelah waktu mulai');
      }
    });
  });

  describe('listProductionRecordsSchema', () => {
    it('applies defaults and validates limit and offset', () => {
      const res = listProductionRecordsSchema.safeParse({ businessId: 'biz-123' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(50);
        expect(res.data.offset).toBe(0);
      }
    });

    it('rejects inverted filter date ranges', () => {
      const res = listProductionRecordsSchema.safeParse({
        businessId: 'biz-123',
        periodStart: '2026-11-08T00:00:00Z',
        periodEnd: '2026-11-01T00:00:00Z',
      });
      expect(res.success).toBe(false);
    });
  });
});
