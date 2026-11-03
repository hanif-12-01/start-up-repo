import { z } from 'zod';
import { createEnergyMeasurementSchema, measurementIdSchema } from '@/server/validation/measurements';

export const csvMaxRows = 100;
export const csvMaxBytes = 128 * 1024;
// JSON may escape one CSV character as six bytes; keep below Next's default1MiB action body.
export const csvTransportMaxBytes = csvMaxBytes * 6 + 4096;
export const csvColumns = ['periodStart', 'periodEnd', 'energyKwh', 'consumptionBasis', 'provenanceReference', 'unit', 'measurementKind', 'notes'] as const;
export const csvLabels: Record<typeof csvColumns[number], string> = { periodStart: 'Mulai pemakaian', periodEnd: 'Selesai pemakaian', energyKwh: 'Pemakaian listrik (kWh)', consumptionBasis: 'Asal angka pemakaian', provenanceReference: 'Nomor catatan atau dokumen', unit: 'Satuan (bila tercantum)', measurementKind: 'Jenis angka (bila tercantum)', notes: 'Catatan (opsional)' };
export const csvTemplate = 'Mulai pemakaian,Selesai pemakaian,Pemakaian listrik (kWh),Asal angka pemakaian,Nomor catatan atau dokumen,Catatan (opsional)\n';
export function csvMapping(headers: string[]) {
  return Object.fromEntries(csvColumns.map(key => [key, headers.findIndex(h => h === key || h === csvLabels[key])])) as CsvRequest['mapping'];
}

export function parseEnergyCsv(text: string) {
  if (new TextEncoder().encode(text).length > csvMaxBytes) throw new Error('File melebihi 128 KiB. Pecah file sebelum mengimpor.');
  if (text.includes('\0') || text.includes('\uFFFD')) throw new Error('File tidak dapat dibaca. Simpan ulang sebagai file .csv, lalu coba lagi.');
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const cellEnd = () => { row.push(cell); cell = ''; closed = false; if (row.length > 20) throw new Error('Maksimal 20 kolom.'); };
  const rowEnd = () => { cellEnd(); rows.push(row); row = []; if (rows.length > csvMaxRows + 1) throw new Error('Maksimal 100 baris data per impor.'); };
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',') cellEnd();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; rowEnd(); }
    else if (c === '"' && !cell && !closed) quoted = true;
     else { if (closed || c === '"') throw new Error(`Baris ${rows.length + 1}: format tulisan belum sesuai. Periksa tanda kutip atau gunakan contoh file WattWise.`); cell += c; }
    if (cell.length > 1000) throw new Error('Isi satu sel maksimal 1000 karakter.');
  }
  if (quoted) throw new Error(`Baris ${rows.length + 1}: ada tulisan dengan tanda kutip yang belum lengkap. Periksa kembali atau gunakan contoh file WattWise.`);
  if (cell || row.length || closed) rowEnd();
  const headers = rows.shift() ?? [];
  if (!text.trim()) throw new Error('File belum berisi data listrik. Tambahkan minimal satu catatan.');
  if (headers.some(h => !h.trim()) || new Set(headers.map(h => h.trim())).size !== headers.length) throw new Error('Format file belum sesuai. Gunakan contoh file WattWise, lalu coba lagi.');
  if (headers.length < 5) throw new Error('Ada informasi yang belum lengkap di file. Periksa contoh file WattWise.');
  if (!rows.length) throw new Error('File belum berisi data listrik. Tambahkan minimal satu catatan.');
  const incomplete = rows.findIndex(r => r.length !== headers.length);
  if (incomplete >= 0) throw new Error(`Baris ${incomplete + 2}: jumlah informasi belum sesuai dengan judul kolom. Lengkapi catatan mengikuti contoh file WattWise.`);
  return { headers, rows };
}

export const csvRequestSchema = z.object({
  businessId: measurementIdSchema, measurementSourceId: measurementIdSchema,
  sourceTimezone: z.enum(['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  headers: z.array(z.string().trim().min(1).max(1000)).min(5).max(20),
  rows: z.array(z.array(z.string().max(1000)).min(5).max(20)).min(1).max(csvMaxRows),
  mapping: z.object(Object.fromEntries(csvColumns.map(key => [key, ['notes', 'unit', 'measurementKind'].includes(key) ? z.number().int().min(-1).max(19) : z.number().int().min(0).max(19)])) as Record<typeof csvColumns[number], z.ZodNumber>).strict(),
}).strict().superRefine((data, ctx) => {
  const mapped = Object.values(data.mapping).filter(i => i >= 0);
  if (new Set(data.headers).size !== data.headers.length || new Set(mapped).size !== mapped.length || mapped.some(i => i >= data.headers.length) || data.rows.some(row => row.length !== data.headers.length)) ctx.addIssue({ code: 'custom', message: 'Pemetaan kolom tidak valid atau kolom berulang.' });
  const csv = [data.headers, ...data.rows].map(row => row.map(cell => /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell).join(',')).join('\n');
  if (new TextEncoder().encode(csv).length > csvMaxBytes) ctx.addIssue({ code: 'custom', message: 'Data CSV melebihi 128 KiB.' });
});
export type CsvRequest = z.infer<typeof csvRequestSchema>;
export function csvMeasurement(request: CsvRequest, row: string[]) {
  const value = (key: typeof csvColumns[number]) => row[request.mapping[key]] ?? '';
  const basis = ({ 'Hasil pembacaan meter': 'MEASURED', 'Perkiraan penggunaan': 'ESTIMATED' } as Record<string, string>)[value('consumptionBasis')] ?? value('consumptionBasis');
  return createEnergyMeasurementSchema.safeParse({ businessId: request.businessId, measurementSourceId: request.measurementSourceId, sourceTimezone: request.sourceTimezone,
    periodStart: value('periodStart'), periodEnd: value('periodEnd'), energyKwh: value('energyKwh'), consumptionBasis: basis,
    provenanceReference: value('provenanceReference'), unit: request.mapping.unit < 0 ? 'kWh' : value('unit'), measurementKind: request.mapping.measurementKind < 0 ? 'INTERVAL_ENERGY' : value('measurementKind'), measurementMethod: 'CSV_IMPORT',
    qualityStatus: basis === 'ESTIMATED' ? 'NEEDS_REVIEW' : 'RECORDED', ...(value('notes') ? { notes: value('notes') } : {}),
  });
}
