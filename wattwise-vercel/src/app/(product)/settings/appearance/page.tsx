import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/product/SettingsTabs';
import { SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { getUserSettings } from '@/server/services/workspace.service';
import { AppearanceForm } from './AppearanceForm';

export const dynamic = 'force-dynamic';

export default async function AppearanceSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const [settings, query] = await Promise.all([getUserSettings(session.user.id), searchParams]);
  const prefs = settings.preferences;
  const appearance = prefs.appearance === 'LIGHT' || prefs.appearance === 'DARK' ? prefs.appearance : 'SYSTEM';
  return <WorkspacePage><WorkspaceHeader eyebrow="Pengaturan akun" title="Tampilan" description="Preferensi disimpan di akun dan disinkronkan ke cookie browser agar tema benar sejak render pertama tanpa kilatan warna."/><SettingsTabs active="/settings/appearance"/>{query.saved && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Preferensi tampilan berhasil disimpan.</div>}<SoftCard><AppearanceForm appearance={appearance} billAlerts={prefs.billAlerts} monthlyDigest={prefs.monthlyDigest} actionReminders={prefs.actionReminders}/></SoftCard></WorkspacePage>;
}
