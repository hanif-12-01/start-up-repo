'use server';
import { revalidatePath } from 'next/cache';
import { createMeasurementSource, createEnergyMeasurement } from '@/server/services/measurement.service';
import { energyError, energyIssue, manualInput } from '@/lib/energy-input';
import { csvTransportMaxBytes, csvRequestSchema } from '@/lib/energy-csv';
import { processEnergyCsv, type CsvRowResult } from '@/server/services/energy-csv';
import { requireUserId } from '@/server/auth/session';
import { isMeasurementPilotAllowed } from '@/server/services/measurement-access';

export type EnergyFormState = { error?: string; code?: string; issues?: { path: string; message: string }[]; success?: string };
export type CsvFormState = { error?: string; rows?: CsvRowResult[]; request?: string; imported?: boolean };

export async function energyCsvAction(_previous: CsvFormState, form: FormData): Promise<CsvFormState> {
  const raw = form.get('request');
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > csvTransportMaxBytes) return { error: 'File terlalu besar atau belum dapat dibaca. Gunakan file yang lebih kecil, lalu pilih kembali.' };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { error: 'Data impor tidak valid. Pilih ulang file.' }; }
  const parsed = csvRequestSchema.safeParse(data);
  if (!parsed.success) return { error: 'Ada informasi yang belum sesuai. Periksa pilihan sumber, zona waktu, dan kolom file; maksimal 100 catatan dan 128 KiB.' };
  try {
    const userId = await requireUserId();
    if (!isMeasurementPilotAllowed(userId, parsed.data.businessId)) return { error: energyError('MEASUREMENT_WRITE_DENIED') };
  } catch { return { error: 'Silakan masuk kembali sebelum mengimpor.' }; }
  const confirm = form.get('intent') === 'import';
  if (confirm && form.get('confirmed') !== 'yes') return { error: 'Centang persetujuan menyimpan catatan yang siap saja, lalu coba lagi.' };
  const rows = await processEnergyCsv(parsed.data, confirm);
  if (rows.some(r => r.status === 'SAVED')) revalidatePath('/energy');
  return { rows, request: raw, imported: confirm };
}

export async function createSourceAction(_previous: EnergyFormState, form: FormData): Promise<EnergyFormState> {
  const result = await createMeasurementSource({
    businessId: form.get('businessId'), name: form.get('name'), sourceType: form.get('sourceType'),
    measurementBoundary: form.get('measurementBoundary'), provenanceKey: form.get('provenanceKey'),
    ...(form.get('description') ? { description: form.get('description') } : {}),
  });
  if (!result.ok) return { error: energyError(result.error.code), code: result.error.code, issues: result.error.issues?.map(i => ({ ...i, message: energyIssue(i.path, i.message) })) };
  revalidatePath('/energy');
  return { success: 'Sumber pengukuran berhasil didaftarkan.' };
}

export async function createEnergyAction(_previous: EnergyFormState, form: FormData): Promise<EnergyFormState> {
  const parsed = manualInput(form);
  if (!parsed.success) return { error: 'Periksa data energi yang ditandai.', code: 'VALIDATION_ERROR', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: energyIssue(i.path.join('.'), i.message) })) };
  const result = await createEnergyMeasurement(parsed.data);
  if (!result.ok) return { error: energyError(result.error.code), code: result.error.code, issues: result.error.issues?.map(i => ({ ...i, message: energyIssue(i.path, i.message) })) };
  revalidatePath('/energy');
  return { success: 'Pengukuran berhasil disimpan. Periksa riwayat di bawah.' };
}
