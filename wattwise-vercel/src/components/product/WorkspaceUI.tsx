import Link from 'next/link';

export function WorkspacePage({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f7f9f4] px-4 py-6 text-slate-900 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl space-y-7">{children}</div></main>;
}

export function WorkspaceHeader({ eyebrow, title, description, actions }: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-emerald-900/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-emerald-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function BusinessSelector({ businesses, selectedId, route }: {
  businesses: Array<{ id: string; name: string }>;
  selectedId: string;
  route: string;
}) {
  if (businesses.length < 2) return null;
  return (
    <form action={route} method="get" className="flex items-end gap-2 rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Usaha aktif</span>
        <select name="businessId" defaultValue={selectedId} className="min-w-48 rounded-lg border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Pilih</button>
    </form>
  );
}

export function SoftCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-[0_18px_45px_-32px_rgba(6,78,59,0.35)] sm:p-6 ${className}`}>{children}</section>;
}

export function EmptyState({ icon, title, description, href, action }: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-emerald-50/50 px-5 py-9 text-center">
      <span aria-hidden="true" className="text-3xl">{icon}</span>
      <h2 className="mt-3 text-lg font-extrabold text-emerald-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      {href && action && <Link href={href} className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">{action}</Link>}
    </div>
  );
}

export const primaryButton = 'inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-900/15 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2';
export const secondaryButton = 'inline-flex items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2';
