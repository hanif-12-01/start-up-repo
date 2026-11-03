import { describe, expect, it } from 'vitest';
import { csvColumns, csvMapping, csvMaxBytes, csvMeasurement, csvRequestSchema, csvTemplate, parseEnergyCsv } from '@/lib/energy-csv';
const header = csvColumns.join(',');
const row = '2026-01-01T00:00:00+07:00,2026-01-02T00:00:00+07:00,0.001,MEASURED,note,kWh,INTERVAL_ENERGY,"catatan, lengkap"';
describe('Energy CSV parser and strict mapping', () => {
  it('distinguishes an empty downloaded template from duplicate titles and incomplete rows', () => {
    expect(() => parseEnergyCsv(csvTemplate)).toThrow('File belum berisi data listrik. Tambahkan minimal satu catatan.');
    expect(() => parseEnergyCsv(header+'\n')).toThrow('File belum berisi data listrik.');
    expect(() => parseEnergyCsv('a,a,b,c,d,e,f\n1,2,3,4,5,6,7')).toThrow('Format file belum sesuai.');
    expect(() => parseEnergyCsv(header+'\n1,2')).toThrow('Baris 2:');
  });
  it('accepts plain Indonesian columns without asking for internal constants; never guesses basis', () => {
    const parsed = parseEnergyCsv(csvTemplate+'2026-01-01T00:00:00+07:00,2026-01-02T00:00:00+07:00,12.5,Perkiraan penggunaan,catatan-1,\n');
    const request = csvRequestSchema.parse({ businessId: 'b', measurementSourceId: 's', sourceTimezone: 'Asia/Jakarta', ...parsed, mapping: csvMapping(parsed.headers) });
    expect(csvMeasurement(request, parsed.rows[0])).toMatchObject({ success: true, data: { unit: 'kWh', measurementKind: 'INTERVAL_ENERGY', consumptionBasis: 'ESTIMATED', qualityStatus: 'NEEDS_REVIEW', provenanceReference: 'catatan-1' } });
    expect(csvMeasurement(request, parsed.rows[0].map((v, i) => i === 3 ? '' : v)).success).toBe(false);
    expect(csvMeasurement(request, parsed.rows[0].map((v, i) => i === 2 ? '12,5' : v)).success).toBe(false);
  });
  it('supports UTF-8 BOM, CRLF, quotes, commas/newlines/escaped quotes', () => {
    const csv = parseEnergyCsv('\uFEFF'+header+'\r\n'+row+'\r\n'); expect(csv.rows[0][7]).toBe('catatan, lengkap');
    expect(parseEnergyCsv(header+'\n'+row.replace('catatan, lengkap', 'baris\n""dua""')).rows[0][7]).toBe('baris\n"dua"');
  });
  it.each(['', 'a,a,b,c,d,e,f\n1,2,3,4,5,6,7', 'a;b;c', header+'\n1,2', header+'\n"unclosed', header+'\n'+row+'x', header+'\n\0', header+'\n\uFFFD'])('rejects malformed format %j', text => expect(() => parseEnergyCsv(text)).toThrow());
  it('enforces file/row limits before processing', () => {
    expect(() => parseEnergyCsv('x'.repeat(csvMaxBytes + 1))).toThrow('128 KiB');
    expect(parseEnergyCsv(header+'\n'+Array(100).fill(row).join('\n')).rows).toHaveLength(100);
    expect(() => parseEnergyCsv(header+'\n'+Array(101).fill(row).join('\n'))).toThrow('100 baris');
  });
  it('maps actual columns; rejects cumulative/unit/decimal/offset misuse', () => {
    const parsed = parseEnergyCsv(header+'\n'+row);
    const request = csvRequestSchema.parse({ businessId: 'b', measurementSourceId: 's', sourceTimezone: 'Asia/Jakarta', ...parsed, mapping: Object.fromEntries(csvColumns.map((key, i) => [key, i])) });
    expect(csvMeasurement(request, parsed.rows[0])).toMatchObject({ success: true, data: { energyKwh: '0.001', measurementMethod: 'CSV_IMPORT' } });
    for (const [index, value] of [[2, '-1'], [2, '0.0001'], [5, 'Wh'], [6, 'CUMULATIVE'], [0, '2026-01-01T00:00:00Z']] as const) { const changed = [...parsed.rows[0]]; changed[index] = value; expect(csvMeasurement(request, changed).success).toBe(false); }
    expect(csvRequestSchema.safeParse({ ...request, mapping: { ...request.mapping, energyKwh: 0 } }).success).toBe(false);
  });
  it('separates bounded CSV content from JSON escaping overhead', () => {
    const rows = Array.from({ length: 100 }, () => row.replace('catatan, lengkap', '\t'.repeat(900)));
    const parsed = parseEnergyCsv(header+'\n'+rows.join('\n'));
    const request = { businessId: 'b', measurementSourceId: 's', sourceTimezone: 'Asia/Jakarta', ...parsed, mapping: Object.fromEntries(csvColumns.map((key, i) => [key, i])) };
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeGreaterThan(csvMaxBytes);
    expect(csvRequestSchema.safeParse(request).success).toBe(true);
    const large = { ...request, headers: Array.from({ length: 20 }, (_, i) => `h${i}`), rows: Array.from({ length: 100 }, () => Array(20).fill('x'.repeat(1000))) };
    expect(csvRequestSchema.safeParse(large).success).toBe(false);
  });
});
