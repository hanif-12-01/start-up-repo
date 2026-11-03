import { listMeasurementsSchema } from '@/server/validation/measurements';
import { localTimestamp } from './energy-input';

export const historyPageSize = 20;
export function historyQuery(businessId: string, query: Record<string, string | string[] | undefined>) {
  const text = (key: string) => typeof query[key] === 'string' ? query[key] : '';
  const page = text('page') || '1';
  const zone = text('zone');
  return listMeasurementsSchema.safeParse({ businessId, limit: historyPageSize + 1,
    offset: /^[1-9]\d{0,3}$/.test(page) ? (Number(page) - 1) * historyPageSize : -1,
    ...(text('source') ? { measurementSourceId: text('source') } : {}),
    ...(text('from') ? { periodStart: localTimestamp(text('from'), zone) } : {}),
    ...(text('to') ? { periodEnd: localTimestamp(text('to'), zone) } : {}),
  });
}

export function historyHref(businessId: string, query: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams({ businessId, page: String(page) });
  for (const key of ['source', 'from', 'to', 'zone']) if (typeof query[key] === 'string' && query[key]) params.set(key, query[key]);
  return `/energy?${params}#history-title`;
}

export function sourceTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('id-ID', { timeZone, dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23' }).format(date);
}
