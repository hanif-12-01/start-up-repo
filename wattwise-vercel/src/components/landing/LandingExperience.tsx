'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap, useGSAP } from '@/lib/motion/gsap';
import { ThemeToggle } from '@/components/product/ThemeToggle';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bolt,
  Building2,
  Check,
  CheckCircle2,
  ChartSpline,
  ClipboardCheck,
  Compass,
  FileQuestion,
  FileText,
  Gauge,
  LockKeyhole,
  Menu,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
  WashingMachine,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const steps = [
  {
    number: '01',
    Icon: ReceiptText,
    title: 'Catat tagihan',
    text: 'Masukkan tagihan yang Anda punya. kWh, watt alat, dan sensor tidak wajib untuk memulai.',
  },
  {
    number: '02',
    Icon: BarChart3,
    title: 'Pahami perubahan',
    text: 'Bandingkan biaya per hari dan konteks periode agar angka nominal tidak menyesatkan.',
  },
  {
    number: '03',
    Icon: Search,
    title: 'Temukan prioritas',
    text: 'Lihat maksimal tiga kandidat yang layak diperiksa, lengkap dengan alasan dan keterbatasannya.',
  },
  {
    number: '04',
    Icon: ClipboardCheck,
    title: 'Tindak lanjuti',
    text: 'Ikuti pemeriksaan aman, buat Rencana Hemat, dan evaluasi hasil pada periode berikutnya.',
  },
];

const problems = [
  [Activity, 'Biaya periode ini berbeda', 'Bandingkan biaya harian agar perubahan nominal tidak menyesatkan.'],
  [FileQuestion, 'Penyebab belum jelas', 'Kumpulkan konteks usaha dan susun kandidat tanpa menyatakan penyebab pasti.'],
  [Wrench, 'Tidak tahu harus mengecek apa', 'Ikuti pemeriksaan observasional yang aman dan mudah dipahami.'],
  [RefreshCw, 'Sulit melihat hasil nyata', 'Bandingkan periode berikutnya dengan baseline dan catat perubahan konteksnya.'],
] as const;

const benefits = [
  ['Lebih cepat memahami perubahan', 'Ringkasan biaya harian membantu membedakan perubahan periode dari kenaikan biaya tercatat.'],
  ['Tidak berhenti di grafik', 'Setiap analisis diarahkan ke pemeriksaan, tindakan, dan evaluasi yang bisa dilanjutkan.'],
  ['Cocok untuk pengguna nonteknis', 'Pertanyaan memakai bahasa sehari-hari dan selalu menerima jawaban "Tidak tahu".'],
  ['Data usaha tetap terpisah', 'Setiap bisnis berada dalam ruang data pemiliknya dan tidak dicampur dengan tenant lain.'],
] as const;

const personas = [
  {
    Icon: Building2,
    title: 'Kos & properti kecil',
    text: 'Pantau perubahan tagihan area bersama, kamar all-in, pompa air, dan fasilitas operasional lainnya.',
    tag: 'Properti',
  },
  {
    Icon: WashingMachine,
    title: 'Laundry & UMKM padat energi',
    text: 'Hubungkan biaya listrik dengan ritme operasional, pendapatan, dan alat yang perlu ditinjau.',
    tag: 'UMKM',
  },
  {
    Icon: Store,
    title: 'Toko, kuliner & usaha berdaya tinggi',
    text: 'Susun catatan bulanan, indikasi perubahan, dan rencana pemeriksaan dalam satu alur kerja.',
    tag: 'Usaha',
  },
] as const;

const capabilities = [
  [ChartSpline, 'Analisis tren tagihan', 'Bandingkan periode, estimasi biaya harian, dan identifikasi perubahan pola.'],
  [TriangleAlert, 'Deteksi anomali', 'Kenali perubahan pemakaian yang perlu perhatian berdasarkan data Anda.'],
  [Gauge, 'Proyeksi pemakaian', 'Estimasi tagihan bulan berikutnya berdasarkan tren historis yang tercatat.'],
  [Search, 'Kandidat peralatan', 'Lihat maksimal tiga peralatan yang layak diperiksa, dengan alasan dan batasannya.'],
  [ClipboardCheck, 'Panduan pemeriksaan', 'Ikuti langkah observasional aman untuk memeriksa peralatan kandidat.'],
  [FileText, 'Laporan bulanan', 'Unduh ringkasan analisis dan rekomendasi tindakan dalam format yang mudah dibaca.'],
] as const;

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function BrandMark({ invert = false }: { invert?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-subtle)]"
      >
        <Bolt className="h-4.5 w-4.5" />
      </span>
      <span
        className={`text-base font-black tracking-[-0.03em] ${
          invert ? 'text-white' : 'text-[var(--foreground)]'
        }`}
      >
        WattWise AI
      </span>
    </span>
  );
}

function ProductPreview() {
  const bars = [34, 48, 41, 65, 54, 72, 60];
  return (
    <div data-landing-visual className="relative mx-auto w-full max-w-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[var(--primary)]/15 blur-3xl"
      />
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-medium)]">
        {/* Preview header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
            <Bolt className="h-3.5 w-3.5" aria-hidden="true" />
            WattWise AI
          </div>
          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
            Contoh tampilan
          </span>
        </div>

        {/* Priority action */}
        <div className="border-b border-[var(--border)] bg-[var(--primary)] p-5 text-[var(--primary-foreground)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
            Langkah prioritas
          </p>
          <p className="mt-2 text-base font-black leading-snug">
            Masukkan tagihan periode terbaru
          </p>
          <p className="mt-1.5 text-xs leading-5 opacity-80">
            WattWise memilih satu tindakan utama berdasarkan progres data Anda.
          </p>
          <span className="mt-3 inline-flex rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20">
            Tambah tagihan
          </span>
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)]">
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Tagihan terakhir
            </p>
            <p className="mt-1.5 text-sm font-black text-[var(--foreground)]">Belum ada data</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Kandidat
            </p>
            <p className="mt-1.5 text-sm font-black text-[var(--foreground)]">Maks. 3 peralatan</p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-5 py-4">
          <div className="flex items-end gap-1.5" aria-hidden="true" style={{ height: 56 }}>
            {bars.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-sm bg-[var(--chart-series-primary)]/65"
                style={{ height: h * 0.75 }}
              />
            ))}
          </div>
          <p className="mt-2.5 text-[10px] font-semibold text-[var(--muted)]">
            Perbandingan biaya per periode (estimasi)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────────── */

export function LandingExperience({ authenticated }: { authenticated: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = authenticated ? '/dashboard' : '/register';
  const primaryLabel = authenticated ? 'Buka Dashboard' : 'Mulai Gratis';

  useGSAP(
    () => {
      if (!root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: no-preference)', () => {
        // Hero entrance — stagger child elements
        const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTimeline
          .from('[data-hero-copy] > *', { y: 20, autoAlpha: 0, duration: 0.65, stagger: 0.07 })
          .from('[data-landing-visual]', { y: 28, autoAlpha: 0, duration: 0.7 }, '-=0.4');

        // Section reveals — y + opacity only (no x drift)
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 20,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          });
        });

        // Step cards — staggered group reveal
        const stepCards = gsap.utils.toArray<HTMLElement>('[data-step-card]');
        if (stepCards.length) {
          ScrollTrigger.create({
            trigger: stepCards[0],
            start: 'top 85%',
            once: true,
            onEnter: () => {
              gsap.from(stepCards, {
                y: 20,
                autoAlpha: 0,
                duration: 0.55,
                stagger: 0.1,
                ease: 'power2.out',
              });
            },
          });
        }

        // Capability items — stagger
        const capItems = gsap.utils.toArray<HTMLElement>('[data-cap-item]');
        if (capItems.length) {
          ScrollTrigger.create({
            trigger: capItems[0],
            start: 'top 88%',
            once: true,
            onEnter: () => {
              gsap.from(capItems, {
                y: 16,
                autoAlpha: 0,
                duration: 0.45,
                stagger: 0.07,
                ease: 'power2.out',
              });
            },
          });
        }

        // Persona cards — stagger
        const personaCards = gsap.utils.toArray<HTMLElement>('[data-persona-card]');
        if (personaCards.length) {
          ScrollTrigger.create({
            trigger: personaCards[0],
            start: 'top 88%',
            once: true,
            onEnter: () => {
              gsap.from(personaCards, {
                y: 20,
                autoAlpha: 0,
                duration: 0.55,
                stagger: 0.1,
                ease: 'power2.out',
              });
            },
          });
        }
      });

      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="landing-theme-root overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="WattWise AI beranda"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <BrandMark />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-7 lg:flex">
            {(
              [
                ['Cara Kerja', '#cara-kerja'],
                ['Fitur', '#fitur'],
                ['Untuk Siapa', '#untuk-siapa'],
                ['Transparansi', '#transparansi'],
              ] as [string, string][]
            ).map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            {!authenticated && (
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Masuk
              </Link>
            )}
            <Link
              href={primaryHref}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {primaryLabel}
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <nav
            id="landing-mobile-menu"
            aria-label="Navigasi seluler"
            className="border-t border-[var(--border)] bg-[var(--background)] px-4 pb-5 pt-3 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-0.5">
              {(
                [
                  ['Cara Kerja', '#cara-kerja'],
                  ['Fitur', '#fitur'],
                  ['Untuk Siapa', '#untuk-siapa'],
                  ['Transparansi', '#transparansi'],
                ] as [string, string][]
              ).map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary-soft)]"
                >
                  {label}
                </a>
              ))}
              <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
                {!authenticated && (
                  <Link
                    href="/login"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--foreground)]"
                  >
                    Masuk
                  </Link>
                )}
                <Link
                  href={primaryHref}
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-bold text-[var(--primary-foreground)]"
                >
                  {primaryLabel}
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pb-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div data-hero-copy>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Untuk kos, properti kecil &amp; UMKM
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.045em] text-[var(--foreground)] sm:text-5xl lg:text-[3.25rem]">
                Pahami kenapa biaya listrik berubah.{' '}
                <span className="text-[var(--primary)]">Tahu apa yang perlu dilakukan.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">
                WattWise membantu usaha memahami perubahan biaya listrik berdasarkan data yang
                mereka masukkan, menemukan bagian yang perlu diperiksa, dan menyusun tindakan hemat
                berikutnya.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                >
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                >
                  Lihat Cara Kerja
                </a>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                Mulai dari tagihan yang Anda punya. Tanpa perangkat tambahan. Hasil berupa estimasi
                dan bantuan pengambilan keputusan.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* ── TRUST STRIP ─────────────────────────────────────────────────────── */}
        <section aria-label="Prinsip kepercayaan produk" className="border-y border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 text-center text-xs font-semibold text-[var(--muted)] sm:grid-cols-2 lg:grid-cols-4">
            <p className="flex items-center justify-center gap-2">
              <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
              Input manual yang sederhana
            </p>
            <p className="flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              Tidak memerlukan sensor
            </p>
            <p className="flex items-center justify-center gap-2">
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              Estimasi dijelaskan transparan
            </p>
            <p className="flex items-center justify-center gap-2">
              <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
              Data usaha terisolasi
            </p>
          </div>
        </section>

        {/* ── MASALAH / PRODUK ─────────────────────────────────────────────────── */}
        {/* Variance: asymmetric split — left sticky heading + right numbered list */}
        <section id="produk" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Masalah yang kami bantu rapikan
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
                Lebih dari pencatat tagihan biasa.
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-7 text-[var(--muted)]">
                Pemilik usaha membutuhkan konteks, prioritas, dan langkah yang aman untuk
                dilanjutkan. Bukan sekadar angka.
              </p>
            </div>
            <ol className="space-y-5">
              {problems.map(([Icon, title, text], i) => {
                const Visual = Icon as typeof Activity;
                return (
                  <li
                    key={title}
                    data-reveal
                    className="flex gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Visual className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-1 font-bold text-[var(--foreground)]">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── CARA KERJA ───────────────────────────────────────────────────────── */}
        {/* Variance: full-bleed dark band with 4-step sequential story */}
        <section
          id="cara-kerja"
          className="scroll-mt-24 bg-[var(--landing-inverse)] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Cara kerja WattWise
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Satu alur dari tagihan menuju tindakan.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--landing-inverse-muted)]">
                Tidak ada dashboard penuh angka tanpa arah. Setiap tahap membantu memahami apa yang
                bisa dilakukan berikutnya.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((item) => (
                <article
                  key={item.number}
                  data-step-card
                  className="rounded-2xl border border-white/8 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between">
                    <item.Icon className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                    <span className="text-[11px] font-black tabular-nums text-[var(--primary)]">
                      {item.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-base font-black leading-snug">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[var(--landing-inverse-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── MANFAAT ──────────────────────────────────────────────────────────── */}
        {/* Variance: asymmetric split — left heading, right frameless benefit list */}
        <section id="manfaat" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div data-reveal>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Manfaat praktis
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
                Dibuat untuk keputusan bulanan yang lebih tenang.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                WattWise membantu merapikan data dan perhatian Anda. Bukan menjanjikan hasil yang
                tidak bisa dipastikan.
              </p>
            </div>
            <ul className="space-y-0 divide-y divide-[var(--border)]">
              {benefits.map(([title, text]) => (
                <li key={title} data-reveal className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FITUR / KAPABILITAS ───────────────────────────────────────────────── */}
        {/* Variance: editorial 3-col grid of compact capability items */}
        <section id="fitur" className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--surface-muted)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Kemampuan produk
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
                Satu platform. Alur analisis yang lengkap.
              </h2>
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(([Icon, title, text]) => {
                const Visual = Icon as typeof ChartSpline;
                return (
                  <div key={title} data-cap-item className="flex gap-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Visual className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--foreground)]">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── UNTUK SIAPA ───────────────────────────────────────────────────────── */}
        {/* Variance: full-bleed dark section — same depth as "Cara Kerja", visually cohesive */}
        <section
          id="untuk-siapa"
          className="scroll-mt-24 bg-[var(--landing-inverse)] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Untuk siapa
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Untuk pengelola yang dekat dengan operasional.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--landing-inverse-muted)]">
                WattWise dirancang untuk usaha yang mengelola tagihan listrik secara langsung dan
                ingin memahami perubahan biaya tanpa perlu menjadi ahli kelistrikan.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {personas.map((item) => {
                const Visual = item.Icon as typeof Building2;
                return (
                  <article
                    key={item.title}
                    data-persona-card
                    className="rounded-2xl border border-white/8 bg-white/5 p-7 transition-colors hover:bg-white/8"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-[var(--primary)]">
                        <Visual className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-6 text-[var(--landing-inverse-muted)]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TRANSPARANSI ─────────────────────────────────────────────────────── */}
        {/* Variance: contained card on light background — compositional contrast with dark sections */}
        <section id="transparansi" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div
            data-reveal
            className="mx-auto grid max-w-7xl gap-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-8 md:p-10 lg:grid-cols-[5fr_7fr]"
          >
            <div>
              <ShieldCheck className="h-8 w-8 text-[var(--primary)]" aria-hidden="true" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Transparansi sejak awal
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
                Anda tetap memegang keputusan.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                WattWise adalah alat bantu analisis, bukan sistem diagnosis otomatis. Setiap hasil
                perlu diverifikasi oleh pengguna.
              </p>
            </div>
            <ul className="grid gap-2.5 text-sm leading-6 text-[var(--muted)] sm:grid-cols-2">
              {[
                'Hasil bergantung pada data yang Anda masukkan.',
                'Estimasi bukan tagihan resmi atau audit energi.',
                'Kandidat bukan pernyataan penyebab atau alat rusak.',
                'Pemeriksaan alat tetap dilakukan secara manual dan aman.',
                'Tidak ada pengukuran real-time tanpa sensor.',
                'WattWise bukan aplikasi resmi dan tidak berafiliasi dengan PLN.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div
            data-reveal
            className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[var(--primary)] px-8 py-14 text-center text-[var(--primary-foreground)] lg:py-20"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              Mulai tanpa perangkat tambahan
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              Ubah tagihan bulan ini menjadi langkah yang lebih jelas.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 opacity-80 sm:text-base">
              Free untuk pencatatan dasar. Pro Trial membuka alur analisis lengkap selama masa
              percobaan, tanpa kartu dan tanpa pembayaran nyata.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="rounded-xl bg-[var(--primary-foreground)] px-6 py-3 text-sm font-bold text-[var(--primary)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primary)]"
              >
                {primaryLabel}
              </Link>
              {!authenticated && (
                <Link
                  href="/login"
                  className="rounded-xl border border-white/30 px-6 py-3 text-sm font-bold transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primary)]"
                >
                  Masuk ke Akun
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand + description */}
          <div className="flex max-w-sm flex-col gap-3">
            <BrandMark />
            <p className="text-xs leading-6 text-[var(--muted)]">
              WattWise AI membantu diagnosis awal dan pengendalian biaya listrik berdasarkan data
              pengguna. Bukan pengganti PLN Mobile, alat ukur resmi, atau audit energi profesional.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-semibold text-[var(--foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Daftar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
