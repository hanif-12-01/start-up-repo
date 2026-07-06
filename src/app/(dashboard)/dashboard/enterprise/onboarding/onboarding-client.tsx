"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users2, 
  Database, 
  FileSpreadsheet, 
  Cpu, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 1,
    title: "Pemetaan Jumlah Lokasi",
    desc: "Mendata seluruh properti, kos-kosan, atau cabang usaha secara hierarkis.",
    icon: Building2,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Pada tahap ini, tim account manager WattWise membantu memetakan lokasi dan kapasitas daya listrik terpasang (VA) pada masing-masing cabang. Batas 50 properti dari Paket Bisnis akan di-bypass penuh.
        </p>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-800">Status Simulasi Pemetaan:</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500">
            <div>Jumlah Cabang Terdaftar: <span className="text-brand-ink">10 Lokasi</span></div>
            <div>Batas Akun Enterprise: <span className="text-emerald-600">Bypass / Sesuai Kontrak</span></div>
            <div>Daya Akumulatif: <span className="text-brand-ink">110.000 VA</span></div>
            <div>Status Pemetaan: <span className="text-emerald-600 font-bold flex items-center gap-1">● SELESAI</span></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Konfigurasi Role Pengguna",
    desc: "Pembagian otorisasi akses tim seperti Finance, Viewer, Admin, dan Owner.",
    icon: Users2,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Mengelompokkan pengguna ke dalam departemen keuangan, pengawas operasional cabang, dan manajer teknis.
        </p>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Hak Akses (Simulasi):</span>
          <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <strong>Finance Manager</strong>: Input data nominal pendapatan dan melihat cashflow.
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <strong>Corporate Viewer</strong>: Read-only visualisasi dashboard seluruh cabang.
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong>Branch Admin</strong>: Mengelola data listrik harian/bulanan di lokasi tertentu.
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Import Data Historis",
    desc: "Migrasi data tagihan listrik 12-24 bulan terakhir dari format spreadsheet.",
    icon: Database,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          WattWise AI membutuhkan histori data pemakaian kWh untuk mengaktifkan prediksi LSTM secara optimal. Kami menyediakan template spreadsheet import khusus.
        </p>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/20 text-xs text-indigo-800">
          <Info className="h-4 w-4 shrink-0" />
          <span>Histori data 10 lokasi demo (6 - 12 bulan) telah berhasil dimasukkan secara otomatis.</span>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Setup Format Laporan Custom",
    desc: "Menyesuaikan format laporan bulanan untuk jajaran direksi / ESG.",
    icon: FileSpreadsheet,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Sesuaikan layout laporan bulanan, penambahan logo perusahaan, emisi karbon yang dihasilkan, serta prioritas anomali per lokasi untuk kepentingan meeting manajemen.
        </p>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700">Template Terpilih:</span>
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
            ESG & Cost Optimization Summary
          </span>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Pilot AIoT / API Sandboxing",
    desc: "Integrasi sandbox API eksternal dan uji coba pemasangan smart plug.",
    icon: Cpu,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Menyiapkan infrastruktur uji coba perangkat keras IoT pada 1-2 lokasi pilot. Sandbox API siap digunakan untuk integrasi ke ERP internal.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-100 text-amber-850 rounded-xl text-xs flex gap-2">
          <Cpu className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <h5 className="font-bold text-[11px] uppercase tracking-wider">Status Pilot (MVP):</h5>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
              Uji coba ini bersifat simulasi visual di dashboard. Modul API menggunakan server sandbox dummy.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Pelatihan Admin & Staff",
    desc: "Bimbingan operasional penggunaan dashboard bagi staff cabang.",
    icon: GraduationCap,
    details: (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-600">
          WattWise menyelenggarakan webinar pelatihan terpandu agar staff lapangan dapat melakukan pencatatan secara tertib dan memahami rekomendasi anomali AI.
        </p>
        <div className="flex justify-between items-center text-xs border border-emerald-100 bg-emerald-50/20 p-3 rounded-xl">
          <span className="font-semibold text-slate-700">Jadwal Pelatihan:</span>
          <span className="text-emerald-700 font-bold">Terjadwal (Webinar Zoom)</span>
        </div>
      </div>
    )
  }
];

export default function OnboardingClient() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1, 2, 3]);

  const handleNext = () => {
    if (activeStep < STEPS.length) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      if (!completedSteps.includes(nextStep)) {
        setCompletedSteps(prev => [...prev, nextStep]);
      }
    } else {
      router.push("/dashboard/enterprise");
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const currentStepData = STEPS.find(s => s.id === activeStep)!;
  const StepIcon = currentStepData.icon;

  return (
    <div className="grid gap-6 md:grid-cols-12 mt-6">
      {/* Sidebar Stepper */}
      <div className="md:col-span-4 space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
          Tahapan Onboarding
        </span>
        {STEPS.map((s) => {
          const sIcon = s.icon;
          const Icon = sIcon;
          const isCurrent = s.id === activeStep;
          const isDone = completedSteps.includes(s.id);

          return (
            <button
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                isCurrent 
                  ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/10 shadow-xs" 
                  : isDone
                  ? "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  : "border-slate-100 bg-white hover:bg-slate-50"
              )}
            >
              <div 
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg border",
                  isCurrent 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : isDone
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                    : "bg-slate-100 border-slate-200 text-slate-400"
                )}
              >
                {isDone && !isCurrent ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-bold leading-snug", isCurrent ? "text-slate-800 font-extrabold" : "text-slate-500")}>
                  {s.id}. {s.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-snug">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Contents */}
      <div className="md:col-span-8 card border-slate-200/80 p-6 flex flex-col justify-between min-h-[400px]">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <StepIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[9px] font-black text-brand-green uppercase tracking-widest leading-none">
                Langkah {currentStepData.id} dari {STEPS.length}
              </span>
              <h2 className="text-lg font-black text-brand-ink leading-tight mt-1">
                {currentStepData.title}
              </h2>
            </div>
          </div>

          <div className="min-h-[200px]">
            {currentStepData.details}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-6">
          <button
            onClick={handleBack}
            disabled={activeStep === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all bg-slate-50/50 hover:bg-slate-50 border border-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-xl bg-brand-green hover:bg-brand-greenDark px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
          >
            <span>{activeStep === STEPS.length ? "Selesaikan Onboarding" : "Lanjut Langkah Berikutnya"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info Warning */}
      <div className="md:col-span-12 card flex items-start gap-3 border-amber-100 bg-amber-50/30">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="text-xs leading-relaxed text-slate-650 font-medium">
          <p className="font-bold text-amber-800">Simulasi Custom Onboarding</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Semua tahapan di atas disimulasikan untuk kepentingan demonstrasi. Hubungi sales@wattwise.id untuk melakukan onboarding riil pada organisasi Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
