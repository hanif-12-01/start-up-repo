import { z } from 'zod';
import { measurementIdSchema, measurementTimestampSchema } from './measurements';

export const operationalIdSchema = measurementIdSchema;

export const createOperationalProcessSchema = z.object({
  businessId: operationalIdSchema,
  name: z.string().trim().min(1, 'Nama aktivitas usaha wajib diisi').max(120, 'Nama aktivitas maksimal 120 karakter'),
  outputUnit: z.string().trim().min(1, 'Satuan hasil wajib diisi').max(30, 'Satuan hasil maksimal 30 karakter'),
  description: z.string().trim().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
}).strict();

export const createProductionRecordSchema = z.object({
  businessId: operationalIdSchema,
  operationalProcessId: operationalIdSchema,
  periodStart: measurementTimestampSchema,
  periodEnd: measurementTimestampSchema,
  outputQuantity: z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/, 'Jumlah hasil harus berupa angka non-negatif desimal 0–999999999999.999, maksimal 3 digit pecahan'),
  notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.periodEnd) <= Date.parse(value.periodStart)) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Waktu selesai harus setelah waktu mulai [start,end)' });
  }
});

export const listProductionRecordsSchema = z.object({
  businessId: operationalIdSchema,
  operationalProcessId: operationalIdSchema.optional(),
  periodStart: measurementTimestampSchema.optional(),
  periodEnd: measurementTimestampSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).max(100000).default(0),
}).strict().superRefine((value, context) => {
  if (value.periodStart && value.periodEnd && Date.parse(value.periodEnd) <= Date.parse(value.periodStart)) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Rentang waktu filter tidak valid' });
  }
});

export type CreateOperationalProcessInput = z.infer<typeof createOperationalProcessSchema>;
export type CreateProductionRecordInput = z.infer<typeof createProductionRecordSchema>;
export type ListProductionRecordsInput = z.infer<typeof listProductionRecordsSchema>;
