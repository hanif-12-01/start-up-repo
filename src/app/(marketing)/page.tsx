import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  Utensils,
  Shirt,
  Store,
  Printer,
  Snowflake,
  Bed,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const fitur = [
    {
      title: "Perkiraan Tagihan Bulan Depan",
      icon: <TrendingUp className="h-5 w-5" />,
      desc: "Bukan tagihan resmi PLN, tetapi perkiraan berdasarkan data yang Anda input.",
    },
    {
      title: "Pendapatan & Listrik",
      icon: <Zap className="h-5 w-5" />,
      desc: "Lihat berapa persen pendapatan bulanan terserap untuk listrik.",
    },
    {
      title: "Pemakaian Perlu Dicek",
      icon: <AlertTriangle className="h-5 w-5" />,
      desc: "WattWise memberi indikasi awal jika pemakaian terlihat tidak wajar.",
    },
    {
      title: "Rekomendasi Hemat yang Praktis",
      icon: <Lightbulb className="h-5 w-5" />,
      desc: "Saran sederhana yang bisa dilakukan pemilik kos atau usaha.",
    },
    {
      title: "Estimasi Simulatif Peralatan",
      icon: <TrendingDown className="h-5 w-5" />,
      desc: "Perkiraan dari daya alat dan jam pakai, bukan pengukuran sensor.",
    },
    {
      title: "Laporan Internal",
      icon: <FileText className="h-5 w-5" />,
      desc: "Ringkasan bulanan untuk evaluasi pribadi atau tim.",
    },
  ];

  const stats = [
    { angka: "18%", label: "Rata-rata potensi hemat tagihan" },
    { angka: "Rp180rb", label: "Estimasi hemat per bulan" },
    { angka: "7+", label: "Target segmen & properti" },
    { angka: "0", label: "Perangkat IoT mahal dibutuhkan" },
  ];

  const targetSegments = [
    { nama: "Kos-kosan", ikon: "bed", desc: "Penginapan & properti sewa kecil" },
    { nama: "Kontrakan", ikon: "bed", desc: "Rumah sewa harian/bulanan/tahunan" },
    { nama: "Properti kecil / ruko", ikon: "store", desc: "Ruko, kios, atau properti komersial kecil" },
    { nama: "Laundry", ikon: "shirt", desc: "Jasa cuci, kering, dan setrika pakaian" },
    { nama: "Warung / F&B", ikon: "utensils", desc: "Warung makan, kafe, depot kuliner padat energi" },
    { nama: "Frozen food / cold storage", ikon: "snowflake", desc: "Freezer penyimpanan makanan beku" },
    { nama: "Minimarket / toko kecil", ikon: "store", desc: "Toko kelontong, retail dengan mesin showcase" },
  ];

  const getUmkmIcon = (iconName: string) => {
    switch (iconName) {
      case "utensils":
        return <Utensils className="h-5 w-5" />;
      case "shirt":
        return <Shirt className="h-5 w-5" />;
      case "store":
        return <Store className="h-5 w-5" />;
      case "printer":
        return <Printer className="h-5 w-5" />;
      case "snowflake":
        return <Snowflake className="h-5 w-5" />;
      case "bed":
        return <Bed className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-emerald-100 selection:text-emerald-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">
                WattWise <span className="gradient-text">AI</span>
              </span>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                PLN ICE Startup
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-slate-500 md:flex">
            <a href="#masalah" className="transition hover:text-emerald-600">Masalah</a>
            <a href="#cara-kerja" className="transition hover:text-emerald-600">Cara Kerja</a>
            <a href="#untuk-siapa" className="transition hover:text-emerald-600">Untuk Siapa</a>
            <a href="#fitur" className="transition hover:text-emerald-600">Fitur</a>
            <a href="#preview" className="transition hover:text-emerald-600">Demo</a>
            <a href="#roadmap" className="transition hover:text-emerald-600">Roadmap</a>
          </nav>

          <Link
            href="/login?callbackUrl=/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/30"
          >
            Coba Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden mesh-soft">
          {/* floating glow blobs */}
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl animate-float-slow" />
          <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl animate-float-slow [animation-delay:2s]" />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/70 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                SaaS electricity cost intelligence untuk kos, properti kecil, dan UMKM padat energi
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                Listrik Lebih Cerdas,
                <br />
                Cash Flow Lebih <span className="gradient-text">Terkendali</span>
              </h1>
              <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-500">
                WattWise AI membantu pemilik kos, pengelola properti kecil, dan UMKM padat energi memahami biaya listrik, memperkirakan tagihan bulan depan, dan melihat dampaknya ke pendapatan tanpa perlu paham istilah teknis.
              </p>
              
              <p className="mt-4 text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-550 shrink-0" />
                Mulai dari input manual. Tanpa alat tambahan. Tanpa integrasi resmi PLN.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  href="/login?callbackUrl=/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/35"
                >
                  Coba Demo Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#cara-kerja" className="btn-outline px-7 py-3.5 text-sm">
                  Lihat Cara Kerjanya
                </a>
              </div>
            </div>

            {/* Browser mockup */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-emerald-400/20 to-teal-300/20 blur-2xl" />
              <div className="relative mx-auto max-w-[460px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-emerald-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="w-48 truncate rounded-md border border-slate-200/60 bg-white px-3 py-0.5 text-center text-[10px] font-bold text-slate-400">
                    app.wattwise.ai/dashboard
                  </div>
                  <div className="w-10" />
                </div>

                <div className="bg-slate-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Properti Terdaftar</p>
                      <h3 className="text-xs font-bold text-slate-800">Kos Melati Purwokerto</h3>
                    </div>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700">Properti Efisien</span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Perkiraan Tagihan</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-800">Rp1.450.000</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600">
                        <TrendingDown className="h-2 w-2" /> -8.2% bulan ini
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Peluang Hemat</p>
                      <p className="mt-1 text-sm font-extrabold text-emerald-600">Rp240.000</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-semibold text-slate-400">Estimasi Simulatif</span>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[9px] font-bold text-slate-500">Tren Beban Listrik (kWh)</p>
                      <span className="text-[8px] font-bold text-slate-400">6 bulan terakhir</span>
                    </div>
                    <div className="flex h-16 w-full items-end">
                      <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible">
                        <path d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2 L100,30 L0,30 Z" fill="url(#grad)" opacity="0.12" />
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#ffffff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/70 p-3 shadow-sm">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-600">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-[10px] font-bold text-rose-950">Pemakaian malam hari perlu dicek</h4>
                      <p className="mt-0.5 text-[9px] font-semibold leading-relaxed text-slate-500">
                        Kemungkinan terkait lampu koridor, pompa air, atau alat yang menyala lebih lama dari biasanya. Perlu verifikasi manual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- STATS BAR ---- */}
          <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-200/50 shadow-sm md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-white/80 px-5 py-6 text-center backdrop-blur">
                  <p className="text-2xl font-extrabold gradient-text sm:text-3xl">{s.angka}</p>
                  <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ MASALAH ============ */}
        <section id="masalah" className="border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow border-amber-200/70 bg-amber-50/80 text-amber-700">Beban Listrik</span>
              <h2 className="mt-4 section-title">Masalah yang Sering Dialami Pemilik Kos dan Usaha Padat Energi</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                Pemilik kos, pengelola properti kecil, dan pelaku usaha padat energi seringkali kesulitan mengontrol biaya listrik harian karena tidak adanya pemetaan konsumsi.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { title: "Tagihan naik, tapi tidak tahu kenapa", desc: "Pemilik baru sadar saat tagihan keluar, sementara penyebabnya belum jelas.", icon: <AlertTriangle className="h-5 w-5" />, tone: "bg-amber-50 text-amber-600" },
                { title: "Pendapatan masuk, tapi listrik terasa menggerus", desc: "Sulit melihat berapa persen pendapatan bulanan habis untuk listrik.", icon: <TrendingUp className="h-5 w-5" />, tone: "bg-rose-50 text-rose-600" },
                { title: "Saran hemat terlalu umum", desc: "Tips hemat listrik sering tidak sesuai dengan kondisi kos, kontrakan, laundry, warung, atau properti kecil.", icon: <HelpCircle className="h-5 w-5" />, tone: "bg-slate-100 text-slate-600" },
              ].map((m) => (
                <div key={m.title} className="glow-card">
                  <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${m.tone}`}>{m.icon}</div>
                  <h3 className="text-base font-bold text-slate-800">{m.title}</h3>
                  <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ USER PERSONAS ============ */}
        <section id="untuk-siapa" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <span className="eyebrow">Pengguna WattWise</span>
              <h2 className="mt-4 section-title">Dibuat agar mudah dipahami dua tipe pengguna</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                WattWise dirancang dengan pendekatan berimbang untuk pengguna awam maupun yang memiliki latar belakang teknis.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="glow-card p-8 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 font-display">Ibu Kos / Pemilik UMKM yang gaptek</h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  Tidak perlu paham kWh, cash flow, atau model AI. WattWise menjelaskan dengan bahasa sederhana: tagihan naik, sisa pendapatan, dan langkah yang perlu dicek.
                </p>
              </div>

              <div className="glow-card p-8 border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 font-display">Teknisi / pengelola listrik yang butuh kontrol biaya</h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  Untuk pengguna yang paham listrik, WattWise menampilkan asumsi, tren, perbandingan bulan sebelumnya, dan estimasi simulatif agar hasilnya bisa dipercaya.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CARA KERJA ============ */}
        <section id="cara-kerja" className="border-t border-slate-100 bg-slate-50/60 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <span className="eyebrow">Alur Sistem</span>
              <h2 className="mt-4 section-title">Cara Kerja WattWise AI dalam 4 Langkah</h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">
                Proses pengolahan data manual sederhana menjadi arahan hemat daya praktis siap tindak untuk properti Anda.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Visualisasi riwayat tagihan dan kWh secara interaktif.",
                  "Peringatan pemakaian di atas rata-rata normal.",
                  "Klasifikasi status efisiensi peralatan (Boros, Normal, Efisien).",
                  "Input data praktis tanpa perlu perangkat IoT mahal.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[13px] font-semibold leading-relaxed text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-xl shadow-emerald-900/5 md:p-8">
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="flex items-center gap-4 border-b border-slate-200/60 pb-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">WattWise Pola Pembacaan</h3>
                  <p className="text-[10px] font-bold text-slate-400">Proses Pengolahan Informasi Listrik</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { n: "1", t: "Masukkan data listrik", d: "Input tagihan/token/kWh atau meter reading secara manual.", tone: "bg-blue-50 text-blue-600 border-blue-100" },
                  { n: "2", t: "Tambahkan pendapatan", d: "Bisa angka pasti, range, atau lewati dulu.", tone: "bg-amber-50 text-amber-600 border-amber-100" },
                  { n: "3", t: "WattWise membaca pola", d: "Sistem membandingkan bulan ini, bulan sebelumnya, rata-rata, dan data peralatan yang Anda input.", tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                  { n: "4", t: "Dapatkan arahan", d: "Lihat perkiraan biaya listrik, rasio listrik terhadap pendapatan, dan kemungkinan hal yang perlu dicek.", tone: "bg-teal-50 text-teal-600 border-teal-100", active: true },
                ].map((p, i) => (
                  <div key={p.n}>
                    <div className={`flex items-center gap-3.5 rounded-xl border p-3.5 shadow-sm ${p.active ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200/60 bg-white"}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-[11px] font-extrabold ${p.tone}`}>{p.n}</span>
                      <div>
                        <h4 className={`text-xs font-bold ${p.active ? "text-emerald-950" : "text-slate-800"}`}>{p.t}</h4>
                        <p className={`mt-0.5 text-[10px] font-semibold ${p.active ? "text-emerald-700" : "text-slate-400"}`}>{p.d}</p>
                      </div>
                    </div>
                    {i < 3 && <div className="mx-auto my-1 h-3.5 w-0.5 bg-slate-200" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ FITUR ============ */}
        <section id="fitur" className="border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Fitur Unggulan</span>
              <h2 className="mt-4 section-title">Dirancang Sederhana untuk Pemilik Properti &amp; Usaha</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                Semua fitur dioptimalkan agar tidak membingungkan pengguna non-teknis, dengan fokus pada pengendalian biaya operasional.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fitur.map((f) => (
                <div key={f.title} className="glow-card">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SEKTOR KOS & PROPERTI ============ */}
        <section id="untuk-siapa" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Kesesuaian Sektor</span>
              <h2 className="mt-4 section-title">Fokus Awal: Kos dan Properti Kecil</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                Analisis WattWise AI menyesuaikan diri dengan pola beban listrik khas properti sewa dan usaha padat energi.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {targetSegments.map((s) => (
                <div key={s.nama} className="group flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-emerald-200/70 hover:shadow-md hover:shadow-emerald-900/5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white">
                    {getUmkmIcon(s.ikon)}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">{s.nama}</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PREVIEW DASHBOARD ============ */}
        <section id="preview" className="border-t border-slate-100 bg-slate-50/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="eyebrow">Antarmuka Nyata</span>
              <h2 className="mt-4 section-title">Lihat Tampilan Dashboard WattWise AI</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                Panel pemantauan listrik yang siap membantu properti dan usaha Anda menekan inefisiensi biaya operasional.
              </p>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-emerald-400/15 to-teal-300/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-emerald-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="w-64 truncate rounded-md border border-slate-200/60 bg-white px-3 py-0.5 text-center text-[10px] font-bold text-slate-400">
                    app.wattwise.ai/dashboard/anomali
                  </div>
                  <div className="w-10" />
                </div>

                <div className="grid grid-cols-12 md:h-[480px]">
                  <div className="col-span-3 hidden flex-col gap-4 border-r border-slate-100 bg-slate-50/40 p-4 md:flex">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Zap className="h-4 w-4 fill-current" /></span>
                      <span className="text-xs font-extrabold">WattWise AI</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        { l: "Ringkasan Listrik", a: false },
                        { l: "Input Listrik", a: false },
                        { l: "Perkiraan Tagihan", a: false },
                        { l: "Pemakaian Perlu Dicek", a: true },
                        { l: "Saran Rekomendasi", a: false },
                        { l: "Laporan Bulanan", a: false },
                      ].map((it, idx) => (
                        <div key={idx} className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${it.a ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-transparent text-slate-400 hover:bg-slate-50"}`}>
                          {it.l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-12 overflow-y-auto bg-slate-50/20 p-6 md:col-span-9">
                    <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800">Pemakaian Perlu Dicek</h3>
                        <p className="text-[10px] font-semibold text-slate-400">Tinjauan ketidakwajaran penggunaan daya properti kos Anda.</p>
                      </div>
                      <span className="rounded-md border border-slate-200/50 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">Juli 2026</span>
                    </div>

                    <div className="mb-4 flex gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-100 bg-white text-rose-600">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-rose-950">Pemakaian malam hari perlu dicek</h4>
                        <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-slate-500">
                          Kemungkinan terkait lampu koridor, pompa air, atau alat yang menyala lebih lama dari biasanya. Perlu verifikasi manual.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-emerald-600">
                          <Lightbulb className="h-4 w-4" />
                          <h4 className="text-xs font-bold text-slate-800">Saran Tindakan Hemat</h4>
                        </div>
                        <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
                          Batasi penggunaan pompa air di malam hari dan nyalakan lampu koridor menggunakan sensor cahaya otomatis.
                        </p>
                        <div className="mt-4 rounded-lg bg-emerald-50 p-2 text-center text-[10px] font-bold text-emerald-700">
                          Potensi hemat: Rp180.000 / bulan
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
                        <div>
                          <h4 className="mb-1 text-xs font-bold text-slate-800">Rangkuman Pemeriksaan</h4>
                          <p className="text-[10px] font-semibold leading-relaxed text-slate-400">Data pemakaian abnormal ini didasarkan pada selisih 18.2% di atas pola acuan standar.</p>
                        </div>
                        <Link href="/login?callbackUrl=/dashboard" className="btn-primary mt-4 self-end px-3 py-2 text-[10px]">
                          Lihat Selengkapnya
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ MISI PLN / ROADMAP ============ */}
        <section id="roadmap" className="relative overflow-hidden bg-slate-900 py-20 text-white sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.20),transparent_38%)]" />
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center rounded-full border border-emerald-800/60 bg-emerald-950 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                Misi PLN ICE Startup
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Mendukung Transisi Energi &amp; Efisiensi Pengguna Listrik
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-400">
                WattWise AI selaras dengan pilar PLN ICE (Innovation, Clean Energy, and Technology Exchange)—platform digital pemantauan energi di sisi konsumen (Demand-Side Management) demi penghematan berkelanjutan.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  { title: "AI for Energy Efficiency", desc: "Membaca pola pemakaian dan memperkirakan tagihan bulanan untuk mencegah kebocoran finansial." },
                  { title: "Demand-Side Management", desc: "Edukasi operasional peralatan daya besar ke luar waktu beban puncak (peak load hours)." },
                  { title: "Sustainability untuk Properti", desc: "Mendukung bisnis hemat karbon melalui pengurangan sisa energi tidak terpakai." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold leading-none text-white">{item.title}</h3>
                      <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-6 md:p-8 lg:col-span-6">
              <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
              <h3 className="border-b border-slate-800 pb-4 text-base font-bold text-white">Peta Jalan Integrasi WattWise AI</h3>
              <div className="mt-6 space-y-5 text-xs font-medium leading-relaxed text-slate-300">
                {[
                  { f: "Phase 1 / MVP", t: "Input Manual, Dashboard, Perkiraan & Gating (Sekarang):", d: " Analisis berbasis input manual, dashboard biaya, proyeksi tagihan, metrik pendapatan & listrik, indikasi pemakaian tidak wajar, rekomendasi hemat, laporan internal, pembatasan fitur (gating), trial Pro, dan iklan AdSense khusus Paket Gratis." },
                  { f: "Phase 2", t: "WhatsApp Reminder, Otomatisasi PDF, Payment Gateway & OCR:", d: " Pengingat catat data otomatis lewat WhatsApp, generate PDF otomatis, gerbang pembayaran digital untuk upgrade instan, serta scan tagihan fisik PLN dengan teknologi OCR." },
                  { f: "Phase 3", t: "Simulasi IoT, Demo Smart Plug & Enterprise Dashboard:", d: " Integrasi unit smart plug untuk pembacaan simulatif, dashboard perbandingan cabang, dan konsol tata kelola multi-lokasi berskala besar." },
                ].map((p) => (
                  <div key={p.f} className="flex gap-3">
                    <span className="h-5 shrink-0 rounded-lg border border-emerald-800/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">{p.f}</span>
                    <p><strong className="text-white">{p.t}</strong>{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 py-14 text-center text-white shadow-2xl shadow-emerald-600/20 md:px-12 md:py-16">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
              <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl font-display">
                Mulai pahami biaya listrik tanpa perlu jadi ahli teknologi
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-emerald-50">
                Coba demo WattWise AI untuk melihat bagaimana data tagihan sederhana bisa berubah menjadi arahan yang mudah dipahami.
              </p>
              <div className="relative mt-8">
                <Link
                  href="/login?callbackUrl=/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-extrabold text-emerald-700 shadow-lg transition-all hover:scale-[1.02] hover:bg-emerald-50"
                >
                  Coba Demo Sekarang
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs font-medium text-slate-400">
        <p>© 2026 WattWise AI. Prototipe Frontend untuk PLN ICE Startup Competition.</p>
      </footer>
    </div>
  );
}
