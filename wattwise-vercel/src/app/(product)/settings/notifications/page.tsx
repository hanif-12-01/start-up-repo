import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/product/SettingsTabs';
import { SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { getUserSettings } from '@/server/services/workspace.service';
import { updatePreferencesAction } from '../actions';

export const dynamic = 'force-dynamic';
export default async function NotificationSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await getOptionalSession(); if (!session?.user) redirect('/login'); const settings = await getUserSettings(session.user.id); const query = await searchParams; const prefs = settings.preferences;
  const toggles = [['billAlerts', 'Peringatan perubahan tagihan', 'Tampilkan pengingat ketika perubahan biaya harian perlu ditinjau.', prefs.billAlerts], ['monthlyDigest', 'Ringkasan bulanan', 'Siapkan preferensi ringkasan laporan bulanan pada akun.', prefs.monthlyDigest], ['actionReminders', 'Pengingat Rencana Hemat', 'Ingatkan tindakan yang sedang berjalan atau menunggu evaluasi.', prefs.actionReminders]] as const;
  return <WorkspacePage><WorkspaceHeader eyebrow="Pengaturan akun" title="Notifikasi" description="Pilih jenis pengingat yang relevan. Preferensi ini tersimpan di akun; pengiriman eksternal hanya aktif jika kanal resmi tersedia." /><SettingsTabs active="/settings/notifications" />{query.saved && <div role="status" className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Preferensi notifikasi berhasil disimpan.</div>}<SoftCard><form action={updatePreferencesAction} className="space-y-4"><input type="hidden" name="appearance" value={prefs.appearance} />{toggles.map(([name, title, description, checked]) => <label key={name} className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[var(--border)] p-4 hover:bg-[var(--primary-soft)]"><span><strong className="block text-sm text-[var(--foreground)]">{title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span></span><input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-5 w-5 accent-emerald-600" /></label>)}<button className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700">Simpan Preferensi</button></form></SoftCard></WorkspacePage>;
}
