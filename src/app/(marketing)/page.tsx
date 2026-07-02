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
  Info,
  ChevronRight,
  Calendar,
  Sparkles,
} from "lucide-react";
import { segmenTarget } from "@/lib/mock-data";

export default function LandingPage() {
  const fitur = [
    {
      title: "Input Listrik Sederhana",
      icon: <FileText className="h-5 w-5" />,
      desc: "Isi nama usaha, peralatan utama, tagihan, dan kWh dengan formulir ringkas tanpa pusing.",
    },
    {
      title: "Dashboard Real-time",
      icon: <Zap className="h-5 w-5" />,
      desc: "Pantau total tagihan, kWh, status efisiensi pemakaian, dan estimasi hemat dalam satu layar.",
    },
    {
      title: "Prediksi Tagihan Akurat",
      icon: <TrendingUp className="h-5 w-5" />,
      desc: "Ketahui perkiraan pengeluaran biaya listrik sebelum tagihan PLN terbit agar kas usaha aman.",
    },
    {
      title: "Deteksi Kebocoran Energi",
      icon: <AlertTriangle className="h-5 w-5" />,
      desc: "Dapatkan peringatan instan jika pemakaian alat listrik tertentu naik tidak wajar secara anomali.",
    },
    {
      title: "Rekomendasi Hemat Pintar",
      icon: <Lightbulb className="h-5 w-5" />,
      desc: "Saran hemat operasional sesuai jenis usaha Anda tanpa menggunakan istilah teknis yang rumit.",
    },
    {
      title: "Kalkulator Potensi Rupiah",
      icon: <TrendingDown className="h-5 w-5" />,
      desc: "Simulasikan persentase pemotongan beban dan ketahui potensi hemat kas bulanan & tahunan.",
    },
  ];

  // Helper to map mockup icons dynamically
  const getUmkmIcon = (iconName: string) => {
    switch (iconName) {
      case "utensils":
        return <Utensils className="h-5 w-5 text-emerald-600" />;
      case "shirt":
        return <Shirt className="h-5 w-5 text-emerald-600" />;
      case "store":
        return <Store className="h-5 w-5 text-emerald-600" />;
      case "printer":
        return <Printer className="h-5 w-5 text-emerald-600" />;
      case "snowflake":
        return <Snowflake className="h-5 w-5 text-emerald-600" />;
      case "bed":
        return <Bed className="h-5 w-5 text-emerald-600" />;
      default:
        return <Users className="h-5 w-5 text-emerald-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 selection:bg-emerald-100 selection:text-emerald-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white shadow-md shadow-emerald-500/10">
              <Zap className="h-5.5 w-5.5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">
                WattWise <span className="text-brand-green">AI</span>
              </span>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                PLN ICE Startup
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-[13px] font-bold text-slate-500 md:flex">
            <a href="#masalah" className="transition hover:text-brand-green">
              Masalah
            </a>
            <a href="#solusi" className="transition hover:text-brand-green">
              Solusi
            </a>
            <a href="#fitur" className="transition hover:text-brand-green">
              Fitur Utama
            </a>
            <a href="#target" className="transition hover:text-brand-green">
              Sektor UMKM
            </a>
            <a href="#demo-preview" className="transition hover:text-brand-green">
              Preview Aplikasi
            </a>
            <a href="#pln" className="transition hover:text-brand-green">
              Misi PLN ICE
            </a>
          </nav>

          <Link href="/login?callbackUrl=/dashboard" className="btn-primary px-4.5 py-2 text-xs shadow-sm hover:scale-[1.02] transition-all">
            Coba Demo
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white py-16 sm:py-24 border-b border-slate-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,252,231,0.45),transparent_40%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/50 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                Asisten Hemat Listrik Pintar untuk UMKM Indonesia
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-slate-900 leading-[1.1]">
                WattWise <span className="text-emerald-600">AI</span>
                <br />
                <span className="text-slate-800 text-3xl sm:text-4xl md:text-5xl font-extrabold">Listrik Lebih Cerdas, Biaya Lebih Terkendali</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 font-medium">
                Bantu pelaku UMKM memantau pemakaian listrik, mendeteksi anomali pemborosan, 
                memprediksi beban tagihan bulanan, serta menyajikan rekomendasi hemat biaya operasional yang mudah dipahami.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/login?callbackUrl=/dashboard" className="btn-primary px-7 py-3.5 text-sm shadow-md hover:scale-[1.02] transition-all">
                  Coba Demo Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#fitur" className="btn-outline px-7 py-3.5 text-sm">
                  Pelajari Fitur
                </a>
              </div>
            </div>

            {/* High-Fidelity UI Mockup inside Hero */}
            <div className="lg:col-span-5 relative">
              <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-emerald-50/40 blur-3xl" />
              <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-blue-50/30 blur-2xl" />

              {/* Browser Frame Container */}
              <div className="relative mx-auto max-w-[460px] rounded-2xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
                {/* Browser Title Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="rounded-md bg-white border border-slate-200/60 px-3 py-0.5 text-[10px] font-bold text-slate-400 w-48 text-center truncate">
                    app.wattwise.ai/dashboard
                  </div>
                  <div className="w-10" />
                </div>

                {/* Simulated Dashboard Content */}
                <div className="p-5 bg-slate-50/40">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usaha Terdaftar</p>
                      <h3 className="text-xs font-bold text-slate-800">Berkah Laundry & Dry Clean</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700">Usaha Efisien</span>
                  </div>

                  {/* Two Mini Stat Cards */}
                  <div className="grid gap-3 grid-cols-2 mb-4">
                    <div className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Estimasi Tagihan</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-800">Rp1.450.000</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600">
                        <TrendingDown className="h-2 w-2" /> -8.2% bulan ini
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Potensi Hemat</p>
                      <p className="mt-1 text-sm font-extrabold text-emerald-600">Rp240.000</p>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[8px] font-semibold text-slate-400">
                        Saran WattWise AI
                      </span>
                    </div>
                  </div>

                  {/* Sparkline line graph mockup */}
                  <div className="rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-xs mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold text-slate-500">Tren Beban Listrik (kWh)</p>
                      <span className="text-[8px] font-bold text-slate-400">6 bulan terakhir</span>
                    </div>
                    {/* Simulated SVG Graph */}
                    <div className="h-16 w-full flex items-end">
                      <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                        <path
                          d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0,25 Q15,22 30,12 T60,20 T90,5 T100,2 L100,30 L0,30 Z"
                          fill="url(#grad)"
                          opacity="0.08"
                        />
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#ffffff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* Floating Notification */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 shadow-sm backdrop-blur-xs flex items-start gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-600 shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-[10px] font-bold text-rose-950">Lonjakan Pemakaian Terdeteksi</h4>
                      <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500 font-semibold">
                        Pengering laundry beroperasi 3.5 jam lebih lama dari acuan efisiensi normal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMS Dialami UMKM */}
        <section id="masalah" className="border-b border-slate-200/50 bg-slate-50/50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full">
                Masalah Operasional UMKM
              </span>
              <h2 className="mt-4 section-title">Mengapa Biaya Listrik UMKM Sering Bengkak?</h2>
              <p className="mt-4 text-base text-slate-500 font-medium leading-relaxed">
                Pelaku usaha kecil seringkali kesulitan mengontrol pengeluaran energi karena keterbatasan data dan tools pemantau.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Buta Pemakaian Harian",
                  desc: "Baru sadar ada pemborosan di akhir bulan setelah tagihan keluar dari PLN, tanpa tahu peralatan mana yang menjadi biang kerok.",
                  badgeColor: "border-t-4 border-t-amber-500/80",
                  icon: <AlertTriangle className="h-5 w-5" />,
                  tone: "bg-amber-50 text-amber-700"
                },
                {
                  title: "Tagihan Sulit Diprediksi",
                  desc: "Arus kas (cash flow) bulanan usaha sering terganggu karena kejutan nilai tagihan listrik yang naik mendadak di luar rencana.",
                  badgeColor: "border-t-4 border-t-rose-500/80",
                  icon: <TrendingUp className="h-5 w-5" />,
                  tone: "bg-rose-50 text-rose-700"
                },
                {
                  title: "Saran Hemat Terlalu Umum",
                  desc: "Banyak artikel saran hemat energi di internet yang terlalu rumit, menggunakan istilah teknis, atau tidak cocok dengan peralatan UMKM.",
                  badgeColor: "border-t-4 border-t-slate-400/80",
                  icon: <HelpCircle className="h-5 w-5" />,
                  tone: "bg-slate-100 text-slate-700"
                },
              ].map((m, i) => (
                <div key={m.title} className={`card ${m.badgeColor} hover:-translate-y-1 hover:shadow-md transition-all duration-300`}>
                  <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${m.tone} border border-black/5`}>
                    {m.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{m.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500 font-medium">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT HELPS - SOLUSI */}
        <section id="solusi" className="bg-white py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
                Solusi WattWise AI
              </span>
              <h2 className="mt-4 section-title">Pencatatan Manual yang Diubah Menjadi Insight Pintar</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 font-medium">
                WattWise AI memformulasikan data tagihan, tipe peralatan utama, dan jam pakai harian usaha Anda ke dalam model penghematan yang diproyeksikan dalam Rupiah dan kWh secara nyata.
              </p>
              
              <div className="mt-8 space-y-4">
                {[
                  "Visualisasi riwayat tagihan dan kWh secara interaktif.",
                  "Pendeteksian dini pemakaian anomali di atas rata-rata normal.",
                  "Klasifikasi status efisiensi peralatan (Boros, Normal, Efisien).",
                  "Formulir input data praktis tanpa instalasi perangkat IoT mahal.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Solusi Engine */}
            <div className="rounded-3xl border border-slate-200/70 bg-slate-50/50 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-emerald-500/5 blur-2xl" />
              <div className="flex items-center gap-4 border-b border-slate-200/60 pb-5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green text-white shadow-soft">
                  <Zap className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">WattWise AI Analysis Engine</h3>
                  <p className="text-[10px] font-bold text-slate-400">Transformasi Data Konsumsi Listrik</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Phase 1 */}
                <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-xs">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-[11px] font-extrabold text-blue-600 border border-blue-100">1</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Input Data Tagihan & Peralatan</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Pengguna memasukkan nominal tagihan dan profil daya alat utama.</p>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex justify-center -my-2">
                  <div className="h-4 w-0.5 bg-slate-200" />
                </div>
                {/* Phase 2 */}
                <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-xs">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-[11px] font-extrabold text-amber-600 border border-amber-100">2</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Analisis Beban & Klasifikasi Pola</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sistem membandingkan rata-rata jenis usaha dan jam operasional ideal.</p>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex justify-center -my-2">
                  <div className="h-4 w-0.5 bg-slate-200" />
                </div>
                {/* Phase 3 */}
                <div className="flex items-center gap-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-xs">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-[11px] font-extrabold text-emerald-600 border border-emerald-100">3</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Rekomendasi Hemat Listrik</h4>
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Saran aksi operasional keluar dengan estimasi Rupiah hemat per bulan.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES */}
        <section id="fitur" className="border-t border-slate-200/50 bg-slate-50/50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
                Fitur Unggulan
              </span>
              <h2 className="mt-4 section-title">Dirancang Sederhana Khusus Pemilik Usaha</h2>
              <p className="mt-4 text-base text-slate-500 font-medium leading-relaxed">
                Seluruh fitur dioptimalkan agar tidak membingungkan pengguna non-teknis, dengan fokus pada penghematan finansial operasional.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fitur.map((f) => (
                <div key={f.title} className="card card-hover bg-white flex flex-col justify-between">
                  <div>
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                      {f.icon}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">{f.desc}</p>
                  </div>
                  <div className="mt-4 border-t border-slate-100/80 pt-3 flex items-center text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">
                    Pelajari lebih lanjut <ChevronRight className="h-3 w-3 ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEKTOR TARGET UMKM */}
        <section id="target" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
                Kesesuaian Sektor
              </span>
              <h2 className="mt-4 section-title">Dapat Diterapkan di Berbagai Sektor UMKM</h2>
              <p className="mt-4 text-base text-slate-500 font-medium leading-relaxed">
                Algoritma analisis WattWise AI disesuaikan secara dinamis dengan pola beban listrik khas dari masing-masing jenis usaha.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {segmenTarget.map((s) => (
                <div key={s.nama} className="card card-hover flex items-center gap-4 bg-slate-50/50 border border-slate-200/40">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200/50 bg-white shadow-sm">
                    {getUmkmIcon(s.ikon)}
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800">{s.nama}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DETAILED DASHBOARD PREVIEW SECTION */}
        <section id="demo-preview" className="border-t border-slate-200/50 bg-slate-50/50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
                Antarmuka Nyata
              </span>
              <h2 className="mt-4 section-title">Lihat Tampilan Dashboard WattWise AI</h2>
              <p className="mt-4 text-base text-slate-500 font-medium leading-relaxed">
                Gambaran lengkap panel pemantauan listrik yang siap membantu usaha Anda menekan inefisiensi biaya operasional.
              </p>
            </div>

            {/* Detailed App Preview Mockup container */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden max-w-5xl mx-auto">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="rounded-md bg-white border border-slate-200/60 px-3 py-0.5 text-[10px] font-bold text-slate-400 w-64 text-center truncate">
                  app.wattwise.ai/dashboard/anomali
                </div>
                <div className="w-10" />
              </div>

              {/* Window Body Layout */}
              <div className="grid grid-cols-12 md:h-[480px]">
                {/* Left side nav bar mockup */}
                <div className="col-span-3 border-r border-slate-100 bg-slate-50/40 p-4 hidden md:flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-6 w-6 rounded-lg bg-emerald-600 text-white grid place-items-center"><Zap className="h-4.5 w-4.5 fill-current" /></span>
                    <span className="text-xs font-extrabold">WattWise AI</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { l: "Dashboard", a: false },
                      { l: "Input Listrik", a: false },
                      { l: "Prediksi Tagihan", a: false },
                      { l: "Deteksi Anomali", a: true },
                      { l: "Saran Rekomendasi", a: false },
                      { l: "Laporan Bulanan", a: false },
                    ].map((it, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-2 text-[11px] font-bold rounded-lg border ${
                          it.a
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "border-transparent text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {it.l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main panel content mockup */}
                <div className="col-span-12 md:col-span-9 p-6 overflow-y-auto bg-slate-50/20">
                  <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Deteksi Anomali Pemakaian</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Tinjauan ketidakwajaran penggunaan daya mesin operasional laundry.</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">Juli 2026</span>
                  </div>

                  {/* Warning banner */}
                  <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4 flex gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-white border border-rose-100 text-rose-600 shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-950">Indikasi Kebocoran Daya Terdeteksi</h4>
                      <p className="mt-0.5 text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Mesin pengering pakaian tipe gas-heater (1.200W) menunjukkan durasi nyala konstan 5 jam pada jam 21:00 - 02:00. 
                        Ini berada di luar rentang wajar jam tutup laundry.
                      </p>
                    </div>
                  </div>

                  {/* Recommendation action box */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-xs">
                      <div className="flex items-center gap-2 mb-2 text-emerald-600">
                        <Lightbulb className="h-4.5 w-4.5" />
                        <h4 className="text-xs font-bold text-slate-800">Saran Tindakan Hemat</h4>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-semibold">
                        Gunakan setrika uap dan kurangi pengering listrik di malam hari. 
                        Memindahkan 2 jam operasional ke pagi hari dapat memangkas tarif beban puncak.
                      </p>
                      <div className="mt-4 bg-emerald-50 rounded-lg p-2 text-center text-[10px] font-bold text-emerald-700">
                        Potensi hemat: Rp180.000 / bulan
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-xs flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-1">Rangkuman Anomali</h4>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Data pemakaian abnormal ini didasarkan pada selisih 18.2% di atas pola acuan standar.</p>
                      </div>
                      <Link href="/login?callbackUrl=/dashboard" className="btn-primary py-2 px-3 text-[10px] mt-4 self-end">
                        Lihat Selengkapnya
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RELEVANSI PLN ICE */}
        <section id="pln" className="relative overflow-hidden bg-slate-900 py-16 text-white sm:py-24 border-b border-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-3 py-1 rounded-full">
                Misi PLN ICE Startup
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
                Mendukung Transisi Energi dan Efisiensi UMKM
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 font-medium">
                WattWise AI selaras dengan pilar program PLN ICE (Innovation, Clean Energy, and Technology Exchange). 
                Kami mengusung platform digital pemantauan energi di sisi konsumen (Demand-Side Management) demi tercapainya penghematan berkelanjutan.
              </p>
              
              <div className="mt-8 space-y-5">
                {[
                  {
                    title: "AI for Energy Efficiency",
                    desc: "Menganalisis anomali beban daya dan memproyeksikan tagihan untuk mencegah kebocoran finansial."
                  },
                  {
                    title: "Demand-Side Management",
                    desc: "Edukasi operasional peralatan daya besar ke luar waktu beban puncak (peak load hours)."
                  },
                  {
                    title: "Sustainability untuk UMKM",
                    desc: "Mendukung bisnis ramah lingkungan dan hemat karbon melalui pengurangan sisa energi tidak terpakai."
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-800/40">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-none">{item.title}</h3>
                      <p className="mt-1.5 text-xs text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peta jalan roadmap */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 md:p-8 lg:col-span-6 relative overflow-hidden">
              <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-2xl" />
              <h3 className="border-b border-slate-800 pb-4 text-base font-bold text-white">
                Peta Jalan Integrasi WattWise AI
              </h3>
              
              <div className="mt-6 space-y-5 text-xs leading-relaxed text-slate-300 font-medium">
                <div className="flex gap-3">
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800/40 h-5 shrink-0">Fase 1</span>
                  <p><strong>Input Manual & Rule-Based Analysis (Sekarang):</strong> Validasi MVP dengan pencatatan tagihan dan profil peralatan operasional utama UMKM.</p>
                </div>
                <div className="flex gap-3">
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800/40 h-5 shrink-0">Fase 2</span>
                  <p><strong>Notifikasi WhatsApp & Laporan Evaluasi PDF:</strong> Otomatisasi pengiriman peringatan anomali langsung ke ponsel pemilik usaha secara real-time.</p>
                </div>
                <div className="flex gap-3">
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800/40 h-5 shrink-0">Fase 3</span>
                  <p><strong>Integrasi IoT Smart Meter & AMI PLN:</strong> Konektivitas langsung ke kWh meter pintar (Advanced Metering Infrastructure) untuk pemantauan data tanpa input manual.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-12 text-center text-white shadow-xl shadow-emerald-600/10 md:px-12 md:py-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_40%)]" />
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Kendalikan Biaya Listrik Usaha Anda Hari Ini
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-emerald-100 font-medium">
                Coba demo interaktif dashboard WattWise AI. Deteksi kebocoran energi dan mulai tingkatkan profitabilitas operasional UMKM Anda.
              </p>
              <div className="mt-8">
                <Link href="/login?callbackUrl=/dashboard" className="btn bg-white px-8 py-3.5 text-sm font-extrabold text-emerald-700 hover:bg-emerald-50 hover:scale-[1.02] transition-all border-0 shadow-sm">
                  Coba Demo Sekarang
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 WattWise AI. Prototipe Frontend untuk PLN ICE Startup Competition.</p>
      </footer>
    </div>
  );
}