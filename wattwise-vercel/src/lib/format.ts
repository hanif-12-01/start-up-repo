export const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const decimal = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});

export function formatMonth(value: string): string {
  return new Date(`${value.slice(0, 7)}-01T00:00:00.000Z`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
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
