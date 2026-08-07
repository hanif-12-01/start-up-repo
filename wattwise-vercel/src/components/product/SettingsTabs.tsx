import Link from 'next/link';

const tabs = [
  ['/settings/profile', '👤', 'Profil'],
  ['/settings/notifications', '🔔', 'Notifikasi'],
  ['/settings/security', '🔐', 'Keamanan'],
  ['/settings/appearance', '🎨', 'Tampilan'],
];

export function SettingsTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Navigasi pengaturan" className="flex gap-2 overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white p-2">
      {tabs.map(([href, icon, label]) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${active === href ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-950'}`}><span aria-hidden="true" className="mr-2">{icon}</span>{label}</Link>)}
    </nav>
  );
}
