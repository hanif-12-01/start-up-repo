'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap, useGSAP } from '@/lib/motion/gsap';
import { Activity, ArrowRight, BarChart3, Bolt, Building2, Check, ClipboardCheck, Compass, FileQuestion, LockKeyhole, ReceiptText, RefreshCw, Search, ShieldCheck, Store, WashingMachine, WifiOff, Wrench } from 'lucide-react';

const story = [
  { number: '01', Icon: ReceiptText, title: 'Catat', text: 'Masukkan tagihan yang sudah Anda punya. kWh, watt alat, dan sensor tidak wajib untuk memulai.' },
  { number: '02', Icon: BarChart3, title: 'Pahami', text: 'Bandingkan biaya per hari dan konteks periode agar perubahan lebih mudah dibaca.' },
  { number: '03', Icon: Search, title: 'Tentukan prioritas', text: 'Lihat maksimal tiga kandidat yang layak diperiksa, lengkap dengan alasan dan keterbatasannya.' },
  { number: '04', Icon: ClipboardCheck, title: 'Tindak lanjuti', text: 'Gunakan pemeriksaan aman, buat Rencana Hemat, lalu evaluasi hasil pada periode berikutnya.' },
];

const benefits = [
  ['Lebih cepat memahami perubahan', 'Ringkasan biaya harian membantu membedakan perubahan periode dari kenaikan biaya tercatat.'],
  ['Tidak berhenti di grafik', 'Setiap analisis diarahkan ke pemeriksaan, tindakan, dan evaluasi yang bisa dilanjutkan.'],
  ['Cocok untuk pengguna nonteknis', 'Pertanyaan memakai bahasa sehari-hari dan selalu menerima jawaban “Tidak tahu”.'],
  ['Data usaha tetap terpisah', 'Setiap bisnis berada dalam ruang data pemiliknya dan tidak dicampur dengan tenant lain.'],
];

const personas = [
  [Building2, 'Kos & properti kecil', 'Pantau perubahan tagihan area bersama, kamar all-in, pompa air, atau fasilitas operasional.'],
  [WashingMachine, 'Laundry & UMKM padat energi', 'Hubungkan biaya listrik dengan ritme operasional, pendapatan, dan alat yang perlu ditinjau.'],
  [Store, 'Toko, kuliner & usaha berdaya tinggi', 'Susun catatan bulanan, indikasi perubahan, dan rencana pemeriksaan dalam satu alur.'],
];

function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-lg text-white shadow-lg shadow-emerald-900/20"><Bolt className="h-5 w-5"/></span>
      <span className="text-lg font-black tracking-[-0.03em] text-emerald-950">WattWise AI</span>
    </span>
  );
}

function ProductPreview() {
  return (
    <div data-landing-visual className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="overflow-hidden rounded-[2rem] border border-emerald-900/15 bg-[#f8fbf6] shadow-[0_35px_90px_-35px_rgba(6,78,59,0.45)]">
        <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#edf4e8] px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900"><Bolt className="h-4 w-4" aria-hidden="true"/> Dashboard tindakan</div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-emerald-700">Contoh tampilan produk</span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-7">
          <div className="space-y-3 rounded-2xl bg-emerald-700 p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Langkah berikutnya</p>
            <p className="text-xl font-black leading-tight">Masukkan tagihan periode terbaru</p>
            <p className="text-xs leading-5 text-emerald-100">WattWise memilih satu tindakan utama berdasarkan progres data Anda.</p>
            <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-emerald-800">Lanjutkan pencatatan</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-4">
              <ReceiptText className="h-5 w-5 text-emerald-600" aria-hidden="true"/>
              <p className="mt-3 text-[10px] font-bold uppercase text-slate-600">Tagihan terbaru</p>
              <p className="mt-1 font-extrabold text-emerald-950">Menunggu data Anda</p>
            </div>
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-4">
              <Search className="h-5 w-5 text-emerald-600" aria-hidden="true"/>
              <p className="mt-3 text-[10px] font-bold uppercase text-slate-600">Bagian yang dicek</p>
              <p className="mt-1 font-extrabold text-emerald-950">Maksimal 3 kandidat</p>
            </div>
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 sm:col-span-2">
              <div className="flex items-end gap-2" aria-hidden="true">
                {[34, 48, 41, 65, 54, 72].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-emerald-500/70" style={{ height }} />)}
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">Perbandingan biaya tercatat per periode</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTimeline
          .from('[data-hero-copy] > *', { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.08 })
          .from('[data-landing-visual]', { y: 34, scale: 0.97, autoAlpha: 0, duration: 0.8 }, '-=0.42');
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
          gsap.from(element, {
            y: 28,
            autoAlpha: 0,
            duration: 0.65,
            ease: 'power2.out',
            scrollTrigger: { trigger: element, start: 'top 84%', once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>('[data-story-card]').forEach((card, index) => {
          gsap.from(card, {
            x: index % 2 === 0 ? -24 : 24,
            autoAlpha: 0,
            duration: 0.55,
            scrollTrigger: { trigger: card, start: 'top 86%', once: true },
          });
        });
      });
      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="landing-theme-root overflow-hidden bg-[#f7f9f4] text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-900/10 bg-[#f7f9f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="WattWise AI beranda" className="rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"><BrandMark /></Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 lg:flex">
            {[['Produk', '#produk'], ['Cara Kerja', '#cara-kerja'], ['Manfaat', '#manfaat'], ['Untuk Siapa', '#untuk-siapa'], ['Transparansi', '#transparansi']].map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-bold text-slate-600 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {!authenticated && <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50">Masuk</Link>}
            <Link href={primaryHref} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800">{primaryLabel}</Link>
          </div>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="landing-mobile-menu" className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm font-extrabold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:hidden">Menu</button>
        </div>
        {menuOpen && (
          <nav id="landing-mobile-menu" aria-label="Navigasi seluler" className="border-t border-emerald-900/10 bg-[#f7f9f4] px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[['Produk', '#produk'], ['Cara Kerja', '#cara-kerja'], ['Manfaat', '#manfaat'], ['Untuk Siapa', '#untuk-siapa'], ['Transparansi', '#transparansi']].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50">{label}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-emerald-900/10 pt-3">
                {!authenticated && <Link href="/login" className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-center text-sm font-bold text-emerald-950">Masuk</Link>}
                <Link href={primaryHref} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-center text-sm font-extrabold text-white">{primaryLabel}</Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pb-28">
          <div className="absolute left-1/2 top-0 -z-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr]">
            <div data-hero-copy>
              <p className="inline-flex rounded-full border border-emerald-700/20 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800">Untuk kos, properti kecil & UMKM</p>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.05em] text-emerald-950 sm:text-5xl lg:text-6xl">Tagihan naik bukan akhir cerita. <span className="text-emerald-600">Ketahui apa yang perlu dilakukan.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">WattWise mengubah catatan tagihan dan konteks usaha menjadi langkah pemeriksaan yang lebih mudah dipahami—tanpa mewajibkan sensor atau pengetahuan kelistrikan.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">{primaryLabel}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true"/></Link>
                <a href="#cara-kerja" className="inline-flex items-center justify-center rounded-2xl border border-emerald-900/15 bg-white px-6 py-3.5 text-sm font-extrabold text-emerald-950 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Lihat Cara Kerja</a>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-600">Mulai dari tagihan yang Anda punya · tanpa perangkat tambahan · hasil berupa estimasi dan bantuan pengambilan keputusan.</p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section aria-label="Prinsip kepercayaan produk" className="border-y border-emerald-900/10 bg-[#edf4e8] px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 text-center text-xs font-bold text-emerald-950/75 sm:grid-cols-2 lg:grid-cols-4">
            <p className="flex items-center justify-center gap-2"><ReceiptText className="h-4 w-4"/>Input manual yang sederhana</p><p className="flex items-center justify-center gap-2"><WifiOff className="h-4 w-4"/>Tidak memerlukan sensor</p><p className="flex items-center justify-center gap-2"><Compass className="h-4 w-4"/>Estimasi dijelaskan transparan</p><p className="flex items-center justify-center gap-2"><LockKeyhole className="h-4 w-4"/>Data usaha terisolasi</p>
          </div>
        </section>

        <section id="produk" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Masalah yang kami bantu rapikan</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-emerald-950 sm:text-4xl">Lebih dari pencatat tagihan biasa.</h2><p className="mt-4 text-base leading-7 text-slate-600">Pemilik usaha tidak hanya membutuhkan angka. Mereka membutuhkan konteks, prioritas, dan langkah yang aman untuk dilanjutkan.</p></div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[[Activity, 'Biaya berubah', 'Bandingkan periode dan biaya harian agar angka nominal tidak menyesatkan.'], [FileQuestion, 'Penyebab belum jelas', 'Kumpulkan konteks usaha dan susun kandidat, tanpa menyatakan penyebab pasti.'], [Wrench, 'Tidak tahu harus mengecek apa', 'Ikuti pemeriksaan observasional yang aman dan mudah dipahami.'], [RefreshCw, 'Sulit melihat hasil', 'Bandingkan periode berikutnya dengan baseline dan catat konteks perubahannya.']].map(([Icon, title, text]) => { const Visual = Icon as typeof Activity; return <article key={String(title)} data-reveal className="rounded-3xl border border-emerald-900/10 bg-white p-6"><Visual className="h-6 w-6 text-emerald-600" aria-hidden="true"/><h3 className="mt-4 font-extrabold text-emerald-950">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p></article>; })}
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-24 bg-emerald-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">Cara kerja WattWise</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Satu alur dari tagihan menuju tindakan.</h2><p className="mt-4 text-emerald-100/75">Tidak ada dashboard yang penuh angka tanpa arah. Setiap tahap membantu Anda memahami apa yang bisa dilakukan berikutnya.</p></div>
            <div className="mt-12 grid gap-4 lg:grid-cols-4">
              {story.map((item) => <article key={item.number} data-story-card className="rounded-3xl border border-emerald-300/15 bg-white/5 p-6 backdrop-blur"><div className="flex items-center justify-between"><item.Icon className="h-6 w-6 text-emerald-300" aria-hidden="true"/><span className="text-xs font-black text-emerald-300">{item.number}</span></div><h3 className="mt-6 text-xl font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-emerald-50/70">{item.text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="manfaat" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div data-reveal><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Manfaat praktis</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-emerald-950 sm:text-4xl">Dibuat untuk keputusan bulanan yang lebih tenang.</h2><p className="mt-4 text-base leading-7 text-slate-600">WattWise membantu merapikan data dan perhatian Anda. Bukan menjanjikan hasil yang tidak bisa dipastikan.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">{benefits.map(([title, text], index) => <article key={title} data-reveal className="rounded-3xl border border-emerald-900/10 bg-white p-6"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-800">{index + 1}</span><h3 className="mt-4 font-extrabold text-emerald-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
          </div>
        </section>

        <section id="untuk-siapa" className="scroll-mt-24 bg-[#edf4e8] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl"><div data-reveal className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Untuk siapa</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-emerald-950 sm:text-4xl">Untuk pengelola yang dekat dengan operasional.</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{personas.map(([Icon, title, text]) => { const Visual = Icon as typeof Building2; return <article key={String(title)} data-reveal className="rounded-3xl border border-emerald-900/10 bg-[#f9fbf7] p-7"><Visual className="h-7 w-7 text-emerald-600" aria-hidden="true"/><h3 className="mt-5 text-xl font-black text-emerald-950">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{String(text)}</p></article>; })}</div></div>
        </section>

        <section id="transparansi" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div data-reveal className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-emerald-900/10 bg-white p-7 shadow-[0_30px_80px_-45px_rgba(6,78,59,0.4)] md:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div><ShieldCheck className="h-8 w-8 text-emerald-600" aria-hidden="true"/><p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Transparansi sejak awal</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-emerald-950">Anda tetap memegang keputusan.</h2></div>
            <ul className="grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              {['Hasil bergantung pada data yang Anda masukkan.', 'Estimasi bukan tagihan resmi atau audit energi.', 'Kandidat bukan pernyataan penyebab atau alat rusak.', 'Pemeriksaan alat tetap dilakukan secara manual dan aman.', 'Tidak ada pengukuran real-time tanpa sensor.', 'WattWise bukan aplikasi resmi dan tidak berafiliasi dengan PLN.'].map((item) => <li key={item} className="flex gap-2 rounded-2xl bg-emerald-50/70 p-4"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true"/>{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div data-reveal className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-emerald-700 px-6 py-12 text-center text-white shadow-2xl shadow-emerald-900/20 sm:px-10 lg:py-16">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-200">Mulai tanpa perangkat tambahan</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">Ubah tagihan bulan ini menjadi langkah yang lebih jelas.</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-emerald-100 sm:text-base">Free untuk pencatatan dasar. Pro Trial membuka alur software lengkap selama masa percobaan—tanpa kartu dan tanpa pembayaran nyata.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={primaryHref} className="rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-emerald-800 hover:bg-emerald-50">{primaryLabel}</Link>{!authenticated && <Link href="/login" className="rounded-2xl border border-emerald-200/40 px-6 py-3.5 text-sm font-extrabold text-white hover:bg-emerald-800">Masuk ke Akun</Link>}</div>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-900/10 bg-[#edf4e8] px-4 py-8 sm:px-6"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><BrandMark /><p className="max-w-xl text-xs leading-5 text-emerald-900/80">WattWise AI membantu diagnosis awal dan pengendalian biaya listrik berdasarkan data pengguna. Bukan pengganti PLN Mobile, alat ukur resmi, atau audit energi profesional.</p><div className="flex gap-4 text-xs font-bold text-emerald-800"><Link href="/login">Masuk</Link><Link href="/register">Daftar</Link></div></div></footer>
    </div>
  );
}
