import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Cpu, Radio, Timer, Wifi } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";

export const dynamic = "force-dynamic";

const highlights = [
  {
    label: "Pemantauan Harian Otomatis",
    desc: "Sensor AIoT membaca pemakaian listrik setiap hari tanpa perlu input manual — Anda tinggal lihat hasilnya.",
    icon: Timer,
  },
  {
    label: "Deteksi Alat Boros",
    desc: "Analisis pola konsumsi harian membantu menemukan alat yang paling berpotensi jadi biang boros energi.",
    icon: Radio,
  },
  {
    label: "Integrasi Nirkabel",
    desc: "Perangkat AIoT terhubung ke WattWise AI melalui WiFi/GSM — data listrik masuk otomatis ke dashboard usaha Anda.",
    icon: Wifi,
  },
];

export default async function AiotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/aiot");
  }

  return (
    <div>
      <PageHeader
        title="AIoT"
        subtitle="Sensor pintar untuk memantau pemakaian listrik harian dan mendeteksi alat boros — segera hadir."
      />

      {/* Hero coming-soon */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-52 w-52 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Cpu className="h-8 w-8" />
            </div>
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                Segera Hadir
              </span>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                Integrasi AIoT WattWise
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Integrasi AIoT akan digunakan untuk membaca pemakaian listrik
                harian dan membantu mendeteksi alat yang berpotensi boros. Fitur
                ini akan tersedia pada tahap berikutnya.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {highlights.map((h) => {
          const Icon = h.icon;
          return (
            <div key={h.label} className="card">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{h.label}</h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                {h.desc}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-700">Catatan:</strong> saat ini WattWise
        AI masih memakai input manual bulanan. Analisis rekomendasi hemat &
        prediksi tetap berjalan berdasarkan data yang Anda masukkan. AIoT akan
        melengkapi — bukan menggantikan — pencatatan yang sudah Anda lakukan.
      </div>
    </div>
  );
}
