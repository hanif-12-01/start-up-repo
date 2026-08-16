import Link from 'next/link';
import { BarChart3, Zap, ShieldCheck } from 'lucide-react';
import { WattWiseLogo } from '@/components/WattWiseLogo';
import { ThemeToggle } from '@/components/product/ThemeToggle';

const benefits = [
  {
    icon: BarChart3,
    title: 'Ringkasan yang mudah dibaca',
    description: 'Ubah catatan tagihan menjadi konteks biaya yang dapat ditindaklanjuti.',
  },
  {
    icon: Zap,
    title: 'Mulai dari data yang Anda punya',
    description: 'Tidak memerlukan sensor atau perangkat khusus untuk memulai.',
  },
  {
    icon: ShieldCheck,
    title: 'Batas hasil dijelaskan',
    description: 'Setiap indikasi tetap perlu diperiksa dengan data dan kondisi usaha Anda.',
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--landing-inverse)] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div aria-hidden="true" className="absolute -right-20 top-12 h-72 w-72 rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <Link href="/" className="relative inline-flex w-fit items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-white">
          <WattWiseLogo size={40} />
          <span>
            <strong className="block text-lg font-extrabold tracking-tight">WattWise AI</strong>
            <span className="block text-xs text-[var(--landing-inverse-muted)]">Kendali biaya listrik usaha</span>
          </span>
        </Link>

        <div className="relative my-14 max-w-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
            Pendamping keputusan energi
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] xl:text-5xl">
            Pahami perubahan biaya. Tentukan langkah berikutnya.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--landing-inverse-muted)] xl:text-base">
            WattWise membantu UMKM menyusun tagihan, pendapatan, dan pemeriksaan sederhana dalam satu alur kerja yang jelas.
          </p>

          <ul className="mt-9 space-y-5">
            {benefits.map(({ icon: Icon, title: benefitTitle, description: benefitDescription }) => (
              <li key={benefitTitle} className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/8 text-[var(--primary)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-sm">{benefitTitle}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[var(--landing-inverse-muted)]">
                    {benefitDescription}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs leading-5 text-[var(--landing-inverse-muted)]">
          WattWise bukan aplikasi resmi PLN. Hasil disusun dari data yang Anda masukkan dan perlu verifikasi manual.
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold lg:hidden">
            <WattWiseLogo size={24} />
            WattWise AI
          </Link>
          <span className="hidden lg:block" />
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
