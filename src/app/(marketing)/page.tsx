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
} from "lucide-react";
import { segmenTarget } from "@/lib/mock-data";

export default function LandingPage() {
  const fitur = [
    {
      title: "Input tagihan listrik manual",
      icon: <FileText className="h-5 w-5" />,
      desc: "Isi nama usaha, jenis usaha, peralatan, tagihan, dan kWh dengan formulir sederhana.",
    },
    {
      title: "Dashboard konsumsi listrik",
      icon: <Zap className="h-5 w-5" />,
      desc: "Pantau tagihan, kWh, status pemakaian, dan potensi hemat dalam satu layar.",
    },
    {
      title: "Prediksi tagihan bulanan",
      icon: <TrendingUp className="h-5 w-5" />,
      desc: "Ketahui perkiraan biaya sebelum tagihan keluar agar kas usaha lebih siap.",
    },
    {
      title: "Deteksi pemakaian tidak normal",
      icon: <AlertTriangle className="h-5 w-5" />,
      desc: "Dapatkan peringatan jika pemakaian listrik naik tidak wajar.",
    },
    {
      title: "Rekomendasi hemat listrik",
      icon: <Lightbulb className="h-5 w-5" />,
      desc: "Saran praktis sesuai jenis usaha, tanpa istilah teknis yang membingungkan.",
    },
    {
      title: "Simulasi penghematan rupiah",
      icon: <TrendingDown className="h-5 w-5" />,
      desc: "Hitung potensi hemat bulanan dan tahunan dalam Rupiah.",
    },
    {
      title: "Laporan PDF sederhana",
      icon: <FileText className="h-5 w-5" />,
      desc: "Ringkasan bulanan untuk bahan evaluasi pemakaian listrik usaha.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-brand-ink">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white shadow-soft">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div>
              <span className="text-xl font-bold">
                WattWise <span className="text-brand-green">AI</span>
              </span>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                PLN ICE Startup
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#masalah" className="transition hover:text-brand-green">
              Masalah
            </a>
            <a href="#solusi" className="transition hover:text-brand-green">
              Solusi
            </a>
            <a href="#fitur" className="transition hover:text-brand-green">
              Fitur
            </a>
            <a href="#target" className="transition hover:text-brand-green">
              UMKM
            </a>
            <a href="#pln" className="transition hover:text-brand-green">
              PLN ICE
            </a>
          </nav>

          <Link href="/dashboard" className="btn-primary px-4 py-2 shadow-soft">
            Coba Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#dcfce7,transparent_38%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-greenSoft px-3.5 py-1 text-xs font-semibold text-brand-greenDark">
                <span className="h-2 w-2 rounded-full bg-brand-green" />
                Asisten hemat listrik untuk UMKM Indonesia
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                WattWise AI
                <br />
                <span className="text-brand-green">Listrik Lebih Cerdas, Biaya Lebih Terkendali</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
                Pantau pemakaian listrik, prediksi tagihan bulanan, temukan pemakaian tidak normal,
                dan dapatkan saran hemat yang mudah dilakukan oleh pemilik UMKM.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/dashboard" className="btn-primary px-6 py-3 text-base shadow-soft">
                  Coba Demo Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#fitur" className="btn-outline px-6 py-3 text-base">
                  Lihat Fitur
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-[430px] rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
                <div className="absolute -right-4 -top-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-yellowSoft text-yellow-700 shadow-soft">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-xs font-semibold text-slate-500">Notifikasi WattWise AI</span>
                  <span className="text-[10px] text-slate-400">10 menit lalu</span>
                </div>
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Lonjakan Pemakaian Terdeteksi</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Pemakaian listrik Laundry Berkah naik <strong>18%</strong> dibanding rata-rata
                      minggu lalu. Periksa mesin pengering dan setrika.
                    </p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-brand-greenSoft p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-brand-greenDark">
                    <span>Potensi hemat</span>
                    <span className="text-sm">Rp180.000/bulan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="masalah" className="border-y border-slate-200/60 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="section-title">Masalah yang Sering Dialami UMKM</h2>
              <p className="mt-4 text-lg text-slate-500">
                Banyak pemilik usaha baru sadar ada pemborosan listrik setelah tagihan naik di akhir bulan.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                ["Buta pemakaian harian", "Tidak tahu kapan listrik paling boros digunakan."],
                ["Tagihan sulit diprediksi", "Arus kas usaha terganggu karena biaya listrik tidak terencana."],
                ["Saran hemat tidak jelas", "Tips terlalu umum dan tidak sesuai jenis usaha."],
              ].map(([title, desc], i) => (
                <div key={title} className="card border-t-4 border-t-brand-yellow">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand-yellowSoft text-yellow-700">
                    {i === 0 ? <AlertTriangle className="h-5 w-5" /> : i === 1 ? <TrendingUp className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solusi" className="bg-white py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-brand-green">
                Solusi WattWise AI
              </p>
              <h2 className="mt-3 section-title">Asisten listrik yang mudah dipahami pemilik usaha</h2>
              <p className="mt-4 leading-relaxed text-slate-500">
                WattWise AI mengubah data tagihan dan kWh menjadi grafik, prediksi, peringatan, dan
                saran hemat yang sederhana.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Membantu UMKM membaca pola tagihan listrik",
                  "Memberi peringatan saat pemakaian naik tidak wajar",
                  "Mengubah saran hemat menjadi estimasi Rupiah",
                  "Tetap bisa dipakai dengan input tagihan manual",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                    <span className="text-sm font-semibold text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 md:p-8">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">WattWise AI Engine</h3>
                  <p className="text-xs text-slate-400">Analisis pola pemakaian usaha</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-green">
                    Target hemat
                  </p>
                  <p className="mt-1 text-lg font-extrabold">Rupiah & kWh</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                    Input sekarang
                  </p>
                  <p className="mt-1 text-lg font-extrabold">Manual dulu</p>
                  <p className="mt-1 text-xs text-slate-400">Siap integrasi IoT/AMI di masa depan</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="border-y border-slate-200/60 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="section-title">Fitur Utama</h2>
              <p className="mt-4 text-lg text-slate-500">
                Dibuat sederhana agar nyaman digunakan pemilik UMKM non-teknis.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fitur.map((f) => (
                <div key={f.title} className="card transition hover:shadow-soft">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand-greenSoft text-brand-greenDark">
                    {f.icon}
                  </div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="target" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="section-title">Cocok untuk Banyak Jenis UMKM</h2>
              <p className="mt-4 text-lg text-slate-500">
                Mulai dari kuliner, laundry, toko kecil, sampai kos-kosan di Purwokerto dan kota lain.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {segmenTarget.map((s) => (
                <div key={s.nama} className="card flex items-center gap-4 bg-slate-50">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-brand-green shadow-card">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{s.nama}</h3>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pln" className="relative overflow-hidden bg-brand-ink py-16 text-white sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#15803d66,transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
            <div className="lg:col-span-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-green">
                Relevansi PLN ICE
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Mendukung smart energy management untuk UMKM
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                WattWise AI mendukung Artificial Intelligence for Energy Systems, demand-side
                management, sustainability, green innovation, dan literasi listrik UMKM.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  ["AI for Energy", "Menganalisis pola beban dan memprediksi biaya listrik."],
                  ["Demand-Side Management", "Mendorong pemakaian alat besar di waktu yang lebih hemat."],
                  ["Sustainability", "Mengurangi pemborosan listrik dari kebiasaan operasional harian."],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green/20 text-brand-green">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{title}</h3>
                      <p className="mt-1 text-xs text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-700/60 bg-slate-800/55 p-6 md:p-8 lg:col-span-6">
              <h3 className="border-b border-slate-700 pb-4 text-lg font-bold">
                Peta jalan integrasi
              </h3>
              <div className="mt-5 space-y-4 text-xs leading-relaxed text-slate-300">
                <p><strong>Fase 1:</strong> input manual tagihan dan data operasional UMKM.</p>
                <p><strong>Fase 2:</strong> mockup notifikasi WhatsApp/email dan laporan otomatis.</p>
                <p><strong>Fase 3:</strong> integrasi IoT, smart meter, atau AMI untuk data lebih real-time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-brand-green px-6 py-12 text-center text-white shadow-soft md:px-12 md:py-16">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Mulai Pantau Listrik Usaha Anda
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-brand-greenSoft">
                Coba demo interaktif WattWise AI dan lihat bagaimana UMKM bisa mengendalikan biaya listrik.
              </p>
              <div className="mt-8">
                <Link href="/dashboard" className="btn bg-white px-8 py-3 text-base font-bold text-brand-green hover:bg-brand-greenSoft">
                  Mulai Pantau Listrik Usaha Anda
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
        <p>© 2026 WattWise AI. Prototipe frontend untuk PLN ICE Startup Competition.</p>
      </footer>
    </div>
  );
}