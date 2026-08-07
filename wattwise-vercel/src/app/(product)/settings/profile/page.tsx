import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/product/SettingsTabs';
import { SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { getUserSettings } from '@/server/services/workspace.service';
import { updateProfileAction } from '../actions';

export const dynamic = 'force-dynamic';
export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await getOptionalSession(); if (!session?.user) redirect('/login');
  const settings = await getUserSettings(session.user.id); const query = await searchParams;
  return <WorkspacePage><WorkspaceHeader eyebrow="Pengaturan akun" title="Profil Anda" description="Perbarui nama yang ditampilkan di ruang kerja WattWise. Alamat email tetap menjadi identitas login Anda." /><SettingsTabs active="/settings/profile" />{query.saved && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Profil berhasil diperbarui.</div>}<div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><SoftCard><h2 className="text-lg font-black text-emerald-950">Informasi profil</h2><form action={updateProfileAction} className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Nama lengkap</span><input name="name" required minLength={2} maxLength={100} defaultValue={settings.profile?.name} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 focus:ring-2 focus:ring-emerald-500" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Alamat email</span><input disabled value={settings.profile?.email ?? ''} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-slate-500" /></label><button className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700">Simpan Profil</button></form></SoftCard><SoftCard><span aria-hidden="true" className="text-3xl">👋</span><h2 className="mt-4 text-lg font-black text-emerald-950">Ruang kerja yang lebih personal</h2><p className="mt-2 text-sm leading-6 text-slate-600">Nama profil digunakan pada navigasi dan konteks akun. Data usaha, tagihan, dan diagnosis tidak berubah saat nama diperbarui.</p></SoftCard></div></WorkspacePage>;
}
