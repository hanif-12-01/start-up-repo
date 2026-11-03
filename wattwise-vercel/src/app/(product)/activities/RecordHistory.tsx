import Link from 'next/link';
import type { ProductionRecordItem } from '@/server/repositories/operational.repository';
import { formatDateTimeId } from '@/lib/operational-input';

export function RecordHistory({
  businessId,
  records,
  selectedId,
}: {
  businessId: string;
  records: ProductionRecordItem[];
  selectedId?: string;
}) {
  if (!records.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">
        Belum ada riwayat catatan aktivitas produksi. Masukkan catatan pertama Anda pada formulir di atas.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <ul className="divide-y divide-[var(--border)]">
        {records.map((r) => {
          const isSelected = r.id === selectedId;
          return (
            <li
              key={r.id}
              className={`flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isSelected ? 'bg-[var(--surface-muted)]/60 font-medium' : 'hover:bg-[var(--surface-muted)]/30'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--foreground)]">{r.processName}</span>
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
                    {r.outputQuantity} {r.outputUnit}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDateTimeId(r.periodStart)} — {formatDateTimeId(r.periodEnd)}
                </p>
                {r.notes && <p className="mt-1 text-xs text-[var(--muted)] italic">Catatan: {r.notes}</p>}
              </div>

              <div>
                <Link
                  href={`/activities?businessId=${businessId}&recordId=${r.id}`}
                  className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {isSelected ? 'Sedang Ditampilkan' : 'Lihat Analisis'}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
