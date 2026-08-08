import { z } from 'zod';
import { BUSINESS_TYPES, ELECTRICAL_SYSTEMS, BUSINESS_SEGMENTS } from '@/server/db/schema/journey';

export const selectPlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO_TRIAL']),
});

export const createBusinessSchema = z.object({
  name: z.string().min(1, 'Nama usaha wajib diisi').max(120, 'Nama usaha maksimal 120 karakter'),
  businessType: z.enum(BUSINESS_TYPES, { message: 'Tipe usaha tidak valid' }),
  city: z.string().max(120, 'Kota maksimal 120 karakter').optional().default(''),
  province: z.string().max(120).optional().default(''),
  address: z.string().max(500).optional().default(''),
  segment: z.enum(BUSINESS_SEGMENTS, { message: 'Segmen tidak valid' }),
  electricalSystem: z.enum(ELECTRICAL_SYSTEMS, { message: 'Sistem listrik tidak valid' }),
  roomCount: z
    .number()
    .int('Jumlah kamar harus bilangan bulat')
    .min(0, 'Jumlah kamar tidak boleh negatif')
    .max(10000, 'Jumlah kamar maksimal 10.000')
    .optional(),
  occupiedRoomCount: z.number().int().min(0).max(10000).optional(),
  employeeCount: z.number().int().min(0).max(100000).optional(),
  operatingDaysPerMonth: z.number().int().min(1).max(31).optional(),
  customerType: z.string().max(80).optional().default(''),
  powerVa: z.number().int().positive().max(100000000).optional(),
  tariffRupiahPerKwh: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(),
  paymentMethod: z.string().max(80).optional().default(''),
  meterType: z.string().max(80).optional().default(''),
  businessNotes: z.string().max(1000).optional().default(''),
  electricityNotes: z.string().max(1000).optional().default(''),
});
