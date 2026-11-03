import 'server-only';
import { csvMeasurement, type CsvRequest } from '@/lib/energy-csv';
import { energyError, energyIssue } from '@/lib/energy-input';
import { createEnergyMeasurement, listEnergyMeasurements, listMeasurementSources } from './measurement.service';

export type CsvRowResult = { row: number; energyKwh: string; periodStart: string; periodEnd: string; basis: string; reference: string; status: 'READY' | 'INVALID' | 'SAVED' | 'FAILED'; message: string };

export async function processEnergyCsv(request: CsvRequest, confirm: boolean): Promise<CsvRowResult[]> {
  const sources = await listMeasurementSources(request.businessId);
  const source = sources.ok ? sources.data.find(s => s.id === request.measurementSourceId && s.isActive) : undefined;
  const parsed = request.rows.map(row => csvMeasurement(request, row));
  const results: CsvRowResult[] = parsed.map((value, i) => ({ row: i + 2, energyKwh: request.rows[i][request.mapping.energyKwh], periodStart: request.rows[i][request.mapping.periodStart], periodEnd: request.rows[i][request.mapping.periodEnd], basis: request.rows[i][request.mapping.consumptionBasis], reference: request.rows[i][request.mapping.provenanceReference],
    status: !source || !value.success || (source.sourceType === 'USER_ESTIMATE' && value.data.consumptionBasis !== 'ESTIMATED') ? 'INVALID' : 'READY',
    message: !source ? 'Sumber aktif tidak tersedia untuk usaha ini. Pilih sumber lain.' : !value.success ? value.error.issues.map(i => energyIssue(i.path.join('.'), i.message)).join('; ') : source.sourceType === 'USER_ESTIMATE' && value.data.consumptionBasis !== 'ESTIMATED' ? energyError('SOURCE_BASIS_MISMATCH') : 'Siap disimpan',
  }));
  // ponytail: at most100 rows; quadratic in-file comparison stays bounded. Use interval sweep for larger approved batches.
  for (let i = 0; i < parsed.length; i++) for (let j = i + 1; j < parsed.length; j++) {
    const a = parsed[i]; const b = parsed[j];
    if (!a.success || !b.success) continue;
    if (Date.parse(a.data.periodStart) < Date.parse(b.data.periodEnd) && Date.parse(a.data.periodEnd) > Date.parse(b.data.periodStart)) {
      const exact = Date.parse(a.data.periodStart) === Date.parse(b.data.periodStart) && Date.parse(a.data.periodEnd) === Date.parse(b.data.periodEnd);
      for (const index of [i, j]) { results[index].status = 'INVALID'; results[index].message = exact ? 'Periode ini tercantum lebih dari sekali dalam file. Sisakan satu catatan yang benar.' : 'Waktu pemakaian bertumpang tindih dengan catatan lain dalam file. Periksa waktu mulai dan selesai.'; }
    }
  }
  // Complete preflight before any write; existing DB constraints remain authoritative for races.
  for (let i = 0; i < parsed.length; i++) {
    const value = parsed[i]; if (!value.success || results[i].status !== 'READY') continue;
    const existing = await listEnergyMeasurements({ businessId: request.businessId, measurementSourceId: request.measurementSourceId, periodStart: value.data.periodStart, periodEnd: value.data.periodEnd, limit: 1, offset: 0 });
    if (!existing.ok || existing.data.length) { results[i].status = 'INVALID'; results[i].message = !existing.ok ? energyError(existing.error.code) : energyError(existing.data.some(m => m.periodStart.getTime() === Date.parse(value.data.periodStart) && m.periodEnd.getTime() === Date.parse(value.data.periodEnd)) ? 'DUPLICATE_INTERVAL' : 'OVERLAPPING_INTERVAL'); }
  }
  if (confirm) for (let i = 0; i < parsed.length; i++) {
    const value = parsed[i]; if (!value.success || results[i].status !== 'READY') continue;
    const saved = await createEnergyMeasurement(value.data);
    results[i].status = saved.ok ? 'SAVED' : 'FAILED'; results[i].message = saved.ok ? 'Tersimpan' : energyError(saved.error.code);
  }
  return results;
}
