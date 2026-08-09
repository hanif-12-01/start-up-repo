import { BadgeCheck, Building2, Check, Clock3, CreditCard, FlaskConical, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { requireUserId } from '@/server/auth/session';
import { getPlanCenter } from '@/server/services/plan.service';
import { primaryButton, secondaryButton, SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { cancelSubscriptionAction, createCheckoutAction, settlePaymentAction, startTrialAction } from './actions';
import { rupiah } from '@/lib/format';

export const dynamic = 'force-dynamic';
const features = {
  FREE: ['1 usaha aktif', '3 tagihan dan 3 pendapatan', '10 peralatan', 'Ringkasan analisis dasar'],
  PRO: ['3 usaha aktif', 'Riwayat dan analisis lengkap', 'Template peralatan', 'Laporan historis & cetak'],
  BUSINESS: ['50 usaha aktif', 'Seluruh fitur Pro', 'Portofolio skala tim', 'Riwayat laporan panjang'],
};

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ notice?: string; checkout?: string }> }) {
  const userId = await requireUserId();
  const [data, query] = await Promise.all([getPlanCenter(userId), searchParams]);
  const pending = query.checkout ? data.invoices.find((item) => item.id === query.checkout && item.paymentStatus === 'PENDING') : null;
  const notice = query.notice === 'trial-used' ? 'Masa uji coba sudah pernah digunakan.' : query.notice === 'trial-started' ? 'Pro Trial 30 hari berhasil dimulai.' : query.notice === 'success' ? 'Pembayaran simulasi berhasil dan paket diaktifkan.' : query.notice === 'failure' ? 'Pembayaran simulasi gagal; paket tidak berubah.' : query.notice === 'cancelled' ? 'Paket dikembalikan ke Gratis.' : query.notice ? 'Simulasi diperbarui.' : null;
  const noticeStyle = query.notice === 'failure'
    ? 'border-[var(--danger-border)] bg-[var(--danger-surface)] text-[var(--danger)]'
    : 'border-[var(--success-border)] bg-[var(--success-surface)] text-[var(--success)]';
  return <WorkspacePage>
    <WorkspaceHeader eyebrow="Paket & penggunaan" title="Paket Saya" description="Lihat paket aktif, batas penggunaan, dan riwayat transaksi simulasi. Tidak ada pembayaran nyata, kartu, atau provider eksternal pada build ini."/>
    {notice ? <div role="status" className={`rounded-2xl border p-4 text-sm font-semibold ${noticeStyle}`}>{notice}</div> : null}
    <section className="grid gap-4 md:grid-cols-4">
      <SoftCard><Leaf className="h-5 w-5 text-[var(--primary)]"/><p className="mt-3 text-xs font-bold uppercase text-[var(--muted)]">Paket aktif</p><p className="mt-1 text-2xl font-black">{data.entitlements.plan}</p></SoftCard>
      <SoftCard><Building2 className="h-5 w-5 text-[var(--primary)]"/><p className="mt-3 text-xs font-bold uppercase text-[var(--muted)]">Usaha aktif</p><p className="mt-1 text-2xl font-black">{data.entitlements.usage.businessCount}/{data.entitlements.limits.maxBusinesses}</p></SoftCard>
      <SoftCard><Clock3 className="h-5 w-5 text-[var(--primary)]"/><p className="mt-3 text-xs font-bold uppercase text-[var(--muted)]">Riwayat laporan</p><p className="mt-1 text-2xl font-black">{data.entitlements.limits.monthlyReportHistoryMonths} bulan</p></SoftCard>
      <SoftCard><ShieldCheck className="h-5 w-5 text-[var(--primary)]"/><p className="mt-3 text-xs font-bold uppercase text-[var(--muted)]">Mode billing</p><p className="mt-1 text-lg font-black">Sandbox saja</p></SoftCard>
    </section>
    {data.entitlements.plan === 'FREE' ? <SoftCard className="border-[var(--success-border)] bg-[var(--success-surface)]"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--success)]"/><h2 className="text-xl font-black">Coba Pro selama 30 hari</h2></div><p className="mt-2 text-sm text-[var(--muted)]">Sekali per akun, tanpa kartu dan tanpa pembayaran nyata.</p></div><form action={startTrialAction}><button className={primaryButton}>Mulai Pro Trial</button></form></div></SoftCard> : null}
    <section className="grid gap-5 lg:grid-cols-3">{data.plans.map((plan) => {
      const active = data.entitlements.plan === plan.code;
      return <SoftCard key={plan.code} className={active ? 'ring-2 ring-[var(--primary)]' : ''}>
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-[var(--primary)]">{plan.code}</p><h2 className="mt-1 text-2xl font-black">{plan.name}</h2></div>{active ? <BadgeCheck className="h-6 w-6 text-[var(--primary)]"/> : null}</div>
        <p className="mt-5 text-2xl font-black">{plan.priceAmount === 0n ? 'Gratis' : `${rupiah.format(plan.priceAmount)}/bulan`}</p>
        <ul className="mt-5 space-y-3 text-sm text-[var(--muted)]">{features[plan.code as keyof typeof features]?.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"/>{item}</li>)}</ul>
        {plan.code !== 'FREE' && !active ? <form action={createCheckoutAction} className="mt-6"><input type="hidden" name="planCode" value={plan.code}/><button className={`${secondaryButton} w-full`}><CreditCard className="mr-2 inline h-4 w-4"/>Pilih via Sandbox</button></form> : null}
      </SoftCard>;
    })}</section>
    {pending ? <SoftCard className="border-[var(--warning-border)]"><div className="flex items-start gap-3"><FlaskConical className="h-6 w-6 text-[var(--warning)]"/><div><h2 className="text-xl font-black">Checkout simulasi</h2><p className="mt-1 text-sm text-[var(--muted)]">Invoice {pending.invoiceNumber} · {pending.planCode} · {rupiah.format(pending.amount)}. Pilih hasil untuk menguji alur; tidak ada uang berpindah.</p></div></div><form action={settlePaymentAction} className="mt-5 flex flex-wrap gap-2"><input type="hidden" name="paymentId" value={pending.paymentId ?? ''}/><button name="outcome" value="success" className={primaryButton}>Simulasikan Berhasil</button><button name="outcome" value="failure" className="rounded-xl border border-[var(--danger-border)] px-4 py-2.5 text-sm font-bold text-[var(--danger)]">Simulasikan Gagal</button><button name="outcome" value="cancelled" className={secondaryButton}>Batalkan</button></form></SoftCard> : null}
    {data.entitlements.plan !== 'FREE' ? <SoftCard><form action={cancelSubscriptionAction} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Kembali ke paket Gratis</h2><p className="mt-1 text-sm text-[var(--muted)]">Data tetap tersimpan; akses mengikuti batas Gratis.</p></div><button className="rounded-xl border border-[var(--danger-border)] px-4 py-2.5 text-sm font-bold text-[var(--danger)]">Batalkan Paket Sandbox</button></form></SoftCard> : null}
  </WorkspacePage>;
}
