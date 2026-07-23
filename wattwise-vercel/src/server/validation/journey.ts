import { z } from 'zod';
import { PLAN_TYPES, BUSINESS_TYPES, ELECTRICAL_SYSTEMS, BUSINESS_SEGMENTS } from '@/server/db/schema/journey';

export const selectPlanSchema = z.object({
  plan: z.enum(PLAN_TYPES),
});

export const createBusinessSchema = z.object({
  name: z.string().min(1, 'Nama usaha wajib diisi').max(120, 'Nama usaha maksimal 120 karakter'),
  businessType: z.enum(BUSINESS_TYPES, { message: 'Tipe usaha tidak valid' }),
  city: z.string().max(120, 'Kota maksimal 120 karakter').optional().default(''),
  segment: z.enum(BUSINESS_SEGMENTS, { message: 'Segmen tidak valid' }),
  electricalSystem: z.enum(ELECTRICAL_SYSTEMS, { message: 'Sistem listrik tidak valid' }),
  roomCount: z
    .number()
    .int('Jumlah kamar harus bilangan bulat')
    .min(0, 'Jumlah kamar tidak boleh negatif')
    .max(10000, 'Jumlah kamar maksimal 10.000')
    .optional(),
});
