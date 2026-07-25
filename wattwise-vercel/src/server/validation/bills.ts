import { z } from 'zod';

export const MAX_BILL_AMOUNT_RUPIAH = 9_223_372_036_854_775_807n;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const calendarDateSchema = z
  .string()
  .min(1, 'Tanggal wajib diisi')
  .refine(isCalendarDate, 'Tanggal tidak valid');

const amountSchema = z
  .string()
  .regex(/^\d+$/, 'Total tagihan hanya boleh berisi angka tanpa Rp, titik, atau koma')
  .transform((value) => BigInt(value))
  .refine((value) => value <= MAX_BILL_AMOUNT_RUPIAH, 'Total tagihan melebihi batas yang didukung');

function optionalDecimalSchema(label: string, maximum: number, decimalPlaces: number) {
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${decimalPlaces}})?$`);
  return z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z
      .string()
      .regex(pattern, `${label} harus berupa angka non-negatif dengan pemisah desimal titik`)
      .refine((value) => {
        const [whole] = value.split('.');
        return BigInt(whole) <= BigInt(maximum);
      }, `${label} melebihi batas yang didukung`)
      .transform((value) => {
        const [whole, fraction] = value.split('.');
        const canonicalWhole = BigInt(whole).toString();
        return fraction ? `${canonicalWhole}.${fraction}` : canonicalWhole;
      })
      .optional()
  );
}

export const createBillSchema = z
  .object({
    periodStart: calendarDateSchema,
    periodEnd: calendarDateSchema,
    totalAmountRupiah: amountSchema,
    kwh: optionalDecimalSchema('Pemakaian kWh', 1_000_000_000, 3),
    tariffRupiahPerKwh: optionalDecimalSchema('Tarif per kWh', 1_000_000_000, 2),
    notes: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? undefined : value),
      z.string().trim().max(1000, 'Catatan maksimal 1.000 karakter').optional()
    ),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.periodStart > value.periodEnd) {
      context.addIssue({
        code: 'custom',
        path: ['periodEnd'],
        message: 'Tanggal akhir harus sama dengan atau setelah tanggal mulai',
      });
    }
  });

export type CreateBillInput = z.infer<typeof createBillSchema>;
