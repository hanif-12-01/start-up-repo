"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { activateProTrialAction } from "@/app/actions/subscription";
import { Sparkles, Zap, Award, Crown, Check, X, Key, Copy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaketDemoClientProps {
  currentPlanCode: string;
  trialActive: boolean;
}

export default function PaketDemoClient({ currentPlanCode, trialActive }: PaketDemoClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleActivateTrial = async () => {
    setLoading(true);
    try {
      const res = await activateProTrialAction();
      if (res.success) {
        toast("Masa Pro Trial 30 hari berhasil diaktifkan!", "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal mengaktifkan Pro Trial.", "error");
      }
    } catch {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    toast(`${type} berhasil disalin ke clipboard!`, "success");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Current Active Plan Card */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-0">
        <div>
          <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Status Akun Anda</span>
          <h3 className="text-xl font-extrabold flex items-center gap-2 mt-1 font-display">
            Paket Aktif:{" "}
            <span className="text-indigo-400">
              {currentPlanCode === "FREE"
                ? "Gratis"
                : currentPlanCode === "PRO_TRIAL"
                ? trialActive
                  ? "Pro Trial 30 Hari (Aktif)"
                  : "Pro Trial 30 Hari (Kedaluwarsa)"
                : currentPlanCode === "PRO_UMKM"
                ? "Pro"
                : currentPlanCode === "BUSINESS"
                ? "Business"
                : "Enterprise/Custom"}
            </span>
          </h3>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed font-semibold">
            {currentPlanCode === "FREE" && "Anda saat ini memiliki batas 1 properti/usaha dan histori terbatas. Aktifkan Pro Trial untuk mencoba fitur analitik AI penuh."}
            {currentPlanCode === "PRO_TRIAL" && trialActive && "Anda saat ini menikmati fitur premium secara gratis selama 30 hari."}
            {currentPlanCode === "PRO_TRIAL" && !trialActive && "Masa uji coba Pro Anda telah berakhir. Akun diturunkan ke Paket Gratis."}
            {currentPlanCode === "PRO_UMKM" && "Selamat! Anda berlangganan paket Pro dengan akses penuh."}
            {currentPlanCode === "ENTERPRISE" && "Selamat! Anda masuk sebagai akun Enterprise."}
          </p>
        </div>

        {currentPlanCode === "FREE" && (
          <button
            onClick={handleActivateTrial}
            disabled={loading}
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-6 shadow-md shadow-indigo-500/20 text-sm font-bold shrink-0 self-start md:self-auto flex items-center gap-2 rounded-xl"
          >
            {loading ? "Memproses..." : "Aktifkan Pro Trial 30 Hari"} <Sparkles className="h-4 w-4 animate-pulse" />
          </button>
        )}
      </div>

      {/* Grid of demo cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FREE plan card */}
        <div className={cn(
          "card p-6 border rounded-2xl flex flex-col justify-between relative overflow-hidden",
          currentPlanCode === "FREE" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
        )}>
          {currentPlanCode === "FREE" && (
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-extrabold uppercase py-1 px-4 rounded-bl-xl tracking-wider">
              Aktif
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">Paket Gratis</h3>
                <span className="text-[11px] text-slate-400 font-semibold">FREE</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
              Fitur dasar untuk pemantauan mandiri UMKM kecil. Penting agar insight tagihan dasar tidak terkunci.
            </p>

            {/* Credential Block */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Key className="h-3 w-3" /> Akun Demo
              </span>
              <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-slate-150">
                <span className="truncate text-slate-600">free@wattwise.id</span>
                <button
                  onClick={() => copyToClipboard("free@wattwise.id", "Email free")}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">Password: <span className="font-mono text-slate-600 font-semibold">password123</span></div>
            </div>

            {/* Features lists */}
            <ul className="mt-6 space-y-2.5 text-xs text-slate-600 font-semibold">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Maksimal 1 properti/bisnis</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Input tagihan listrik bulanan manual</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Input data pendapatan bulanan (UMKM)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Prediksi kWh & estimasi tagihan dasar</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Rasio listrik terhadap pendapatan</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-slate-400">Rekomendasi AI (Terbatas top 1-2)</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-slate-400">Deteksi anomali detail & penjelasan</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-slate-400">Laporan bulanan PDF export</span>
              </li>
            </ul>
          </div>
        </div>

        {/* PRO TRIAL plan card */}
        <div className={cn(
          "card p-6 border rounded-2xl flex flex-col justify-between relative overflow-hidden",
          currentPlanCode === "PRO_TRIAL" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"
        )}>
          {currentPlanCode === "PRO_TRIAL" && (
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-extrabold uppercase py-1 px-4 rounded-bl-xl tracking-wider">
              {trialActive ? "Aktif" : "Selesai"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-indigo-800 text-base leading-tight flex items-center gap-1">
                  Pro Trial
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full uppercase tracking-wider font-extrabold">30 Hari</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">PRO_TRIAL</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
              Mencoba seluruh fitur premium secara gratis selama 30 hari. Sangat cocok untuk menguji model AI penuh.
            </p>

            {/* Credential Block */}
            <div className="mt-4 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-600 flex items-center gap-1">
                <Key className="h-3 w-3" /> Akun Demo
              </span>
              <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-indigo-150">
                <span className="truncate text-slate-600">trial@wattwise.id</span>
                <button
                  onClick={() => copyToClipboard("trial@wattwise.id", "Email trial")}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">Password: <span className="font-mono text-slate-600 font-semibold">password123</span></div>
            </div>

            {/* Features lists */}
            <ul className="mt-6 space-y-2.5 text-xs text-slate-600 font-semibold">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Maksimal 3 properti/bisnis</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Prediksi kWh dengan Model Estimasi Adaptif (Hybrid AI Decision Support)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Deteksi anomali AI & penyebab detail</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Rekomendasi AI detail & praktis</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Laporan PDF bulanan (export/preview)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Simulasi pengingat input data</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Simulasi integrasi IoT/Demo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* PRO plan card */}
        <div className={cn(
          "card p-6 border rounded-2xl flex flex-col justify-between relative overflow-hidden",
          currentPlanCode === "PRO_UMKM" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
        )}>
          {currentPlanCode === "PRO_UMKM" && (
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-extrabold uppercase py-1 px-4 rounded-bl-xl tracking-wider">
              Aktif
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">Paket Pro</h3>
                <span className="text-[11px] text-slate-400 font-semibold">PRO (Simulated Paid)</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
              Untuk UMKM atau pengelola properti yang ingin analisis listrik
              lebih lengkap hingga 3 bisnis/properti.
            </p>

            {/* Credential Block */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Key className="h-3 w-3" /> Akun Demo
              </span>
              <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-slate-150">
                <span className="truncate text-slate-600">pro@wattwise.id</span>
                <button
                  onClick={() => copyToClipboard("pro@wattwise.id", "Email pro")}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">Password: <span className="font-mono text-slate-600 font-semibold">password123</span></div>
            </div>

            <ul className="mt-6 space-y-2 text-[11px] text-slate-600 font-semibold">
              {[
                "Maksimal 3 bisnis/properti",
                "Mode Kos/Properti dan UMKM",
                "Profil lengkap",
                "Input listrik manual lengkap",
                "Input pendapatan: angka pasti, range, atau skip",
                "Prediksi pemakaian listrik lengkap",
                "Estimasi tagihan listrik lengkap",
                "Cash flow impact lengkap",
                "Rasio listrik terhadap pendapatan lengkap",
                "Sisa pendapatan setelah listrik lengkap",
                "Energy Waste Score aktif",
                "Anomaly detection aktif",
                "Rekomendasi AI detail",
                "Estimasi potensi hemat",
                "Histori data 12 bulan",
                "Laporan bulanan lengkap",
                "Export PDF",
                "Reminder simulasi",
                "Preview/demo AIoT",
                "Standard support",
              ].map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            {/* Limitations */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Belum termasuk (Enterprise)
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-500">
                {[
                  "Dashboard agregat multi-cabang",
                  "Bulk PDF",
                  "Multi-user/admin (belum tersedia atau sangat terbatas)",
                ].map((label) => (
                  <li key={label} className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <span className="text-[11px] text-slate-400 font-extrabold italic">
              Harga final akan disesuaikan setelah validasi bisnis.
            </span>
          </div>
        </div>

        {/* BUSINESS plan card */}
        <div className={cn(
          "card p-6 border rounded-2xl flex flex-col justify-between relative overflow-hidden",
          currentPlanCode === "BUSINESS" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200"
        )}>
          {currentPlanCode === "BUSINESS" && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-extrabold uppercase py-1 px-4 rounded-bl-xl tracking-wider">
              Aktif
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">Paket Bisnis</h3>
                <span className="text-[11px] text-slate-400 font-semibold">BUSINESS (Simulated)</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
              Untuk pemilik banyak kos, cabang, atau properti yang membutuhkan
              pemantauan listrik multi-lokasi.
            </p>

            {/* Credential Block */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Key className="h-3 w-3" /> Akun Demo
              </span>
              <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-slate-150">
                <span className="truncate text-slate-600">business@wattwise.id</span>
                <button
                  onClick={() => copyToClipboard("business@wattwise.id", "Email business")}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">Password: <span className="font-mono text-slate-600 font-semibold">password123</span></div>
            </div>

            <ul className="mt-6 space-y-2 text-[11px] text-slate-600 font-semibold">
              {[
                "Maksimal 50 bisnis/properti",
                "Semua fitur Pro",
                "Dashboard agregat",
                "Perbandingan antar properti/cabang",
                "Multi-user/admin",
                "Role Owner, Admin, Staff",
                "Histori data 24 bulan+",
                "Laporan bulanan lengkap",
                "Bulk PDF report",
                "Export PDF",
                "Advanced anomaly detection",
                "Rekomendasi AI detail dan multi-lokasi",
                "Reminder dengan quota lebih besar",
                "Full IoT simulation / IoT-ready dashboard",
                "Priority support",
              ].map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Cocok untuk
              </p>
              <p className="text-[11px] text-slate-600">
                Banyak kos, cabang, atau properti.
              </p>
            </div>

            {/* Limitations */}
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Batasan MVP
              </p>
              <ul className="space-y-1 text-[11px] text-slate-500">
                {[
                  "Real AIoT hardware integration belum aktif",
                  "Real payment gateway belum aktif",
                  "WhatsApp automation belum aktif",
                  "Semua fitur IoT masih simulasi/demo untuk MVP",
                ].map((label) => (
                  <li key={label} className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <span className="text-[11px] text-slate-400 font-extrabold italic">
              Harga final akan disesuaikan setelah kebutuhan jumlah lokasi divalidasi.
            </span>
          </div>
        </div>

        {/* ENTERPRISE plan card */}
        <div className={cn(
          "card p-6 border rounded-2xl flex flex-col justify-between relative overflow-hidden",
          currentPlanCode === "ENTERPRISE" ? "border-amber-600 ring-2 ring-amber-600/20" : "border-slate-200"
        )}>
          {currentPlanCode === "ENTERPRISE" && (
            <div className="absolute top-0 right-0 bg-amber-600 text-white text-[9px] font-extrabold uppercase py-1 px-4 rounded-bl-xl tracking-wider">
              Aktif
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-700">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">Paket Enterprise</h3>
                <span className="text-[11px] text-slate-400 font-semibold">ENTERPRISE (Custom)</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
              Untuk organisasi, pengelola properti besar, partner, atau pilot multi-lokasi yang membutuhkan konfigurasi khusus.
            </p>

            {/* Credential Block */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Key className="h-3 w-3" /> Akun Demo
              </span>
              <div className="flex items-center justify-between text-xs font-mono bg-white p-2 rounded-lg border border-slate-150">
                <span className="truncate text-slate-600">enterprise@wattwise.id</span>
                <button
                  onClick={() => copyToClipboard("enterprise@wattwise.id", "Email enterprise")}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400 font-bold">Password: <span className="font-mono text-slate-600 font-semibold">password123</span></div>
            </div>

            <ul className="mt-6 space-y-2 text-[11px] text-slate-600 font-semibold">
              {[
                "Jumlah bisnis/properti custom, lebih dari 50",
                "Harga Enterprise bersifat custom dan disesuaikan",
                "Custom onboarding khusus organisasi",
                "Custom dashboard dengan widget interaktif",
                "Roadmap integrasi IoT & API",
                "Custom report bulanan & perbandingan lengkap",
                "Advanced role management (Owner, Admin, Staff, Finance, Viewer)",
                "Dedicated support manager",
                "SLA dapat ditambahkan pada tahap berikutnya",
                "Sensor/AIoT pilot roadmap",
                "API access roadmap",
              ].map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                Keterbatasan Demo
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Integrasi IoT/API masih berada pada roadmap dan pilot. Sensor/AIoT belum terhubung ke hardware real pada MVP ini. SLA detail akan ditentukan pada tahap pilot. Batas bisnis/properti mengikuti kontrak Enterprise (ditampilkan beberapa lokasi contoh untuk demo).
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-2">
            <button
              onClick={() => router.push("/dashboard/enterprise")}
              className="btn bg-amber-600 hover:bg-amber-700 text-white py-2 text-xs font-bold rounded-xl"
            >
              Diskusikan Kebutuhan Enterprise
            </button>
            <span className="text-[10px] text-slate-400 text-center font-semibold">
              Atau hubungi tim WattWise di sales@wattwise.id
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
