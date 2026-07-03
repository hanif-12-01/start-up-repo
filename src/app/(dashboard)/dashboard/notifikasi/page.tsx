import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Bell, CheckCircle2, Info } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/ui/common';
import { getActiveBusinessId } from '@/services/business';
import { getNotificationsForUser, getUnreadNotificationCount } from '@/services/notification';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/app/actions/notification';

export const dynamic = 'force-dynamic';

const typeLabels: Record<string, string> = {
  INPUT_MISSING: 'Input bulan ini belum diisi',
  USAGE_SPIKE: 'Lonjakan pemakaian',
  BILL_PREDICTION_UP: 'Prediksi tagihan naik',
  RECOMMENDATION_READY: 'Rekomendasi tersedia',
  REPORT_READY: 'Laporan siap',
};

export default async function NotifikasiPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const businessId = await getActiveBusinessId(session.user.id);
  if (!businessId) redirect('/onboarding');

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(session.user.id, businessId),
    getUnreadNotificationCount(session.user.id, businessId),
  ]);

  return (
    <div className='max-w-4xl space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <PageHeader
          title='Pusat Notifikasi'
          subtitle='Pantau peringatan dan panduan terbaru untuk usaha aktif Anda.'
        />
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button className='btn-outline mt-1' type='submit'>
              <CheckCircle2 className='h-4 w-4' />
              Tandai Semua Dibaca
            </button>
          </form>
        )}
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='card flex items-center gap-4'>
          <div className='grid h-11 w-11 place-items-center rounded-xl bg-brand-greenSoft text-brand-green'>
            <Bell className='h-5 w-5' />
          </div>
          <div>
            <p className='text-xs font-semibold text-slate-500'>Belum dibaca</p>
            <p className='text-2xl font-extrabold text-brand-ink'>{unreadCount}</p>
          </div>
        </div>
        <div className='card text-sm leading-relaxed text-slate-500'>
          <strong className='text-brand-ink'>Hanya di dalam aplikasi.</strong> Notifikasi ini dibuat dari event analisis, anomali, rekomendasi, dan laporan di database. Tidak ada email, WhatsApp, atau push notification eksternal.
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className='card flex flex-col items-center gap-3 py-12 text-center'>
          <div className='grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400'>
            <Info className='h-7 w-7' />
          </div>
          <h2 className='font-bold text-brand-ink'>Belum Ada Notifikasi</h2>
          <p className='max-w-md text-sm text-slate-500'>Notifikasi akan muncul setelah Anda mengisi data listrik, menjalankan analisis, atau membuat laporan bulanan.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {notifications.map((item) => (
            <article key={item.id} className={'card border ' + (item.isRead ? 'border-slate-100 bg-white' : 'border-brand-green/20 bg-brand-greenSoft/40')}>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <span className='badge bg-slate-100 text-slate-600'>{typeLabels[item.type] ?? item.type}</span>
                  <h2 className='mt-2 text-base font-bold text-brand-ink'>{item.title}</h2>
                  <p className='mt-1 text-sm leading-relaxed text-slate-600'>{item.message}</p>
                  <p className='mt-2 text-xs font-medium text-slate-400'>{item.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {!item.isRead && (
                  <form action={markNotificationReadAction}>
                    <input type='hidden' name='id' value={item.id} />
                    <button className='btn-outline shrink-0' type='submit'>Tandai Dibaca</button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
