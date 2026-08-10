export const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const decimal = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/;

export function parseMonth(value: string): Date | null {
  const normalized = value.trim();
  const match = monthPattern.exec(normalized);
  if (!match) return null;

  const date = new Date(`${match[1]}-${match[2]}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMonth(value: string): string {
  const date = parseMonth(value);
  if (!date) return 'Periode tidak valid';

  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMonthCompact(value: string): string {
  const date = parseMonth(value);
  if (!date) return 'Periode';

  const month = date.toLocaleDateString('id-ID', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${month} ${String(date.getUTCFullYear()).slice(-2)}`;
}

export function businessSegmentLabel(segment: string): string {
  return {
    KOS: 'Kos & properti kecil',
    LAUNDRY: 'Laundry',
    FNB: 'Kuliner & F&B',
    RETAIL: 'Toko & retail',
    COLD_STORAGE: 'Cold storage',
    OTHER: 'Usaha lainnya',
  }[segment] ?? segment;
}
