import { z } from 'zod';

export const measurementIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, 'ID tidak valid');
export const measurementTimestampSchema = z.iso.datetime({ offset: true })
  .refine(value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).getUTCFullYear() >= 1
    && new Date(value).getUTCFullYear() <= 9999,
  'Timestamp wajib memiliki zona eksplisit dan presisi maksimal milidetik');
const timezoneSchema = z.enum(['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']);
const text = (max: number) => z.string().trim().min(1).max(max);

export const createMeasurementSourceSchema = z.object({
  businessId: measurementIdSchema,
  name: text(120),
  sourceType: z.enum(['METER', 'SENSOR', 'DOCUMENT', 'USER_ESTIMATE']),
  measurementBoundary: z.enum(['WHOLE_SITE', 'SUBMETER', 'UNKNOWN']),
  provenanceKey: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/, 'Identitas sumber wajib stabil'),
  description: text(1000).optional(),
}).strict();

function offsetMatches(value: string, timezone: string) {
  const supplied = value.endsWith('Z') ? '+00:00' : value.slice(-6);
  // -00:00 means unknown local offset, not verified UTC provenance.
  if (supplied === '-00:00') return false;
  const actual = new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(value)).find(part => part.type === 'timeZoneName')?.value;
  return supplied === (actual === 'GMT' ? '+00:00' : actual?.replace('GMT', ''));
}

export const createEnergyMeasurementSchema = z.object({
  businessId: measurementIdSchema,
  measurementSourceId: measurementIdSchema,
  periodStart: measurementTimestampSchema,
  periodEnd: measurementTimestampSchema,
  sourceTimezone: timezoneSchema,
  energyKwh: z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/, 'kWh harus desimal 0–999999999999.999, maksimal 3 digit pecahan'),
  unit: z.literal('kWh'),
  measurementKind: z.literal('INTERVAL_ENERGY'),
  measurementMethod: z.enum(['MANUAL', 'CSV_IMPORT', 'SENSOR']),
  consumptionBasis: z.enum(['MEASURED', 'ESTIMATED']),
  qualityStatus: z.enum(['RECORDED', 'NEEDS_REVIEW']),
  provenanceReference: text(240),
  notes: text(1000).optional(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.periodEnd) <= Date.parse(value.periodStart)) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Akhir interval harus setelah awal [start,end)' });
  }
  for (const field of ['periodStart', 'periodEnd'] as const) {
    if (measurementTimestampSchema.safeParse(value[field]).success && !offsetMatches(value[field], value.sourceTimezone)) {
      context.addIssue({ code: 'custom', path: [field], message: 'Offset timestamp tidak sesuai zona sumber' });
    }
  }
  if (value.consumptionBasis === 'ESTIMATED' && value.qualityStatus !== 'NEEDS_REVIEW') {
    context.addIssue({ code: 'custom', path: ['qualityStatus'], message: 'Estimasi wajib ditandai NEEDS_REVIEW' });
  }
});

export const listMeasurementsSchema = z.object({
  businessId: measurementIdSchema,
  measurementSourceId: measurementIdSchema.optional(),
  periodStart: measurementTimestampSchema.optional(),
  periodEnd: measurementTimestampSchema.optional(),
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).max(100000).default(0),
}).strict().superRefine((value, context) => {
  if (value.periodStart && value.periodEnd && Date.parse(value.periodEnd) <= Date.parse(value.periodStart)) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Rentang filter tidak valid' });
  }
});

export type CreateMeasurementSourceInput = z.infer<typeof createMeasurementSourceSchema>;
export type CreateEnergyMeasurementInput = z.infer<typeof createEnergyMeasurementSchema>;
export type ListMeasurementsInput = z.infer<typeof listMeasurementsSchema>;
