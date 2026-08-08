import Link from 'next/link';
import { Bell, Palette, ShieldCheck, UserRound } from 'lucide-react';

const tabs = [
  ['/settings/profile', UserRound, 'Profil'],
  ['/settings/notifications', Bell, 'Notifikasi'],
  ['/settings/security', ShieldCheck, 'Keamanan'],
  ['/settings/appearance', Palette, 'Tampilan'],
] as const;

export function SettingsTabs({ active }: { active: string }) {
  return <nav aria-label="Navigasi pengaturan" className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">{tabs.map(([href, Icon, label]) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${active === href ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--foreground)]'}`}><Icon className="h-4 w-4" aria-hidden="true"/>{label}</Link>)}</nav>;
}
