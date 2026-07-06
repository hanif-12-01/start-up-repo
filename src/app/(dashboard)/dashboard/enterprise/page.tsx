import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserPlan } from "@/services/subscription";
import { canAccessFeature, FEATURE_KEYS } from "@/lib/plan-entitlements";
import { 
  Building2, 
  Users2, 
  FileCheck2, 
  HelpCircle, 
  MapPin, 
  TrendingDown, 
  Cpu, 
  ShieldCheck, 
  HelpCircle as SupportIcon, 
  Compass, 
  ArrowRight,
  TrendingUp,
  LineChart
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EnterprisePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Verify Enterprise Plan
  const { plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  
  if (planCode !== "ENTERPRISE" && !canAccessFeature(FEATURE_KEYS.CUSTOM_ONBOARDING, planCode)) {
    redirect("/dashboard");
  }

  // Get count of user's businesses/locations
  const businesses = await db.business.findMany({
    where: { userId: session.user.id },
    include: {
      electricityEntries: {
        orderBy: { month: "desc" },
        take: 1
      }
    }
  });

  const totalLocations = businesses.length;
  
  // Calculate mock or real aggregated statistics
  const totalPowerVA = businesses.reduce((acc, curr) => acc + (curr.powerVA || 0), 0);
  const activeLocationsCount = businesses.length;
  
  // Mock roadmap features for simulator purposes
  const roadmapStatus = {
    iotPilot: "Ready to Pilot",
    apiAccess: "In Progress (V1 Sandbox Active)",
    customSla: "Active (Gold SLA Tier)",
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-block rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200 uppercase tracking-wider">
            Enterprise Control Center
          </span>
          <h1 className="text-2xl font-black text-brand-ink mt-1">Dashboard Pemantauan &amp; Entitlement</h1>
          <p className="text-slate-500 text-sm">
            Halaman konsol khusus Paket Enterprise untuk mengelola multi-lokasi skala besar.
          </p>
        </div>
        <Link 
          href="/dashboard/enterprise/onboarding" 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
        >
          <span>Mulai Simulasi Onboarding</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cabang / Lokasi</span>
            <Building2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-ink">{totalLocations}</span>
            <span className="text-xs font-bold text-emerald-600">Bypass Limit Enabled (&gt;50)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Daya Terpasang</span>
            <Cpu className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-ink">{(totalPowerVA / 1000).toFixed(1)} kVA</span>
            <span className="text-xs text-slate-400">Total Akumulatif</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akses API &amp; Integrasi</span>
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-3">
            <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 border border-indigo-200">
              SANDBOX_ACTIVE
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Endpoints: /v1/energy/aggregate</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tingkat Support &amp; SLA</span>
            <SupportIcon className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 border border-amber-200">
              DEDICATED 24/7 (SLA 99.9%)
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Account Manager: Budi Santoso</p>
          </div>
        </div>
      </div>

      {/* Aggregate Widgets and Branch comparison preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Branch Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-brand-ink">Daftar Cabang & Pemantauan Tagihan Terakhir</h2>
              <p className="text-xs text-slate-400">Total {totalLocations} properti terdaftar pada akun Anda.</p>
            </div>
            <span className="text-xs font-bold text-slate-500">Urut berdasarkan Entri Terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5">Nama Cabang</th>
                  <th className="py-2.5">Tipe</th>
                  <th className="py-2.5 text-right">Daya</th>
                  <th className="py-2.5 text-right">Tagihan Terakhir</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Belum ada cabang terdaftar. Gunakan simulasi onboarding untuk mengisi data dummy lokasi.
                    </td>
                  </tr>
                ) : (
                  businesses.slice(0, 10).map((b) => {
                    const lastEntry = b.electricityEntries[0];
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-bold text-brand-ink">{b.name}</td>
                        <td className="py-3 text-[10px] uppercase font-bold">{b.type}</td>
                        <td className="py-3 text-right">{b.powerVA} VA</td>
                        <td className="py-3 text-right font-semibold">
                          {lastEntry 
                            ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(lastEntry.costIdr)
                            : "N/A"
                          }
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {businesses.length > 10 && (
            <p className="text-[10px] text-center text-slate-400 font-semibold pt-2">
              + Menampilkan 10 dari total {totalLocations} properti. Gunakan Business Switcher di sebelah kiri untuk melihat detail per properti.
            </p>
          )}
        </div>

        {/* Enterprise Entitlement and Roadmap Status */}
        <div className="rounded-2xl border border-slate-200/85 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-brand-ink">Status Fitur Enterprise</h2>
            <p className="text-xs text-slate-400">Integrasi custom &amp; status kelayakan uji coba pilot IoT.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-emerald-500" /> IoT Pilot Roadmap
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                  {roadmapStatus.iotPilot}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pemasangan unit IoT Gateway pada panel utama fasa 3. Memantau daya aktif/reaktif secara real-time.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-500" /> Integrasi API Listrik
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                  {roadmapStatus.apiAccess}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sinkronisasi data pemakaian listrik bulanan secara otomatis dengan Enterprise ERP Internal.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-amber-500" /> SLA &amp; Support Khusus
                </span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200">
                  {roadmapStatus.customSla}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Jaminan waktu penyelesaian kendala &lt; 2 jam, didukung Technical Account Manager khusus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Custom Role Management dan Reports Simulation */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-brand-ink">Custom Role Management (Advanced)</h2>
              <p className="text-xs text-slate-400">Pembagian otorisasi multi-role untuk departemen keuangan dan analis.</p>
            </div>
            <Users2 className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Role: Finance Manager</span>
                <span className="text-[10px] text-slate-400">Akses hanya input biaya tagihan &amp; cashflow eksternal</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Role: Corporate Viewer</span>
                <span className="text-[10px] text-slate-400">Akses read-only seluruh visualisasi cabang</span>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between pb-1 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Role: Technical Specialist</span>
                <span className="text-[10px] text-slate-400">Konfigurasi batasan peralatan & anomali spesifik</span>
              </div>
              <span className="rounded bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-400 border border-slate-200 uppercase">
                Inactive
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-brand-ink">Custom Reports &amp; Audit Listrik</h2>
              <p className="text-xs text-slate-400">Unduh laporan audit konsolidasi khusus untuk dewan direksi.</p>
            </div>
            <FileCheck2 className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Laporan Audit Emisi Karbon Q1-2026</span>
                <span className="text-[10px] text-slate-400">Format: Excel & PDF Audit standard ESG</span>
              </div>
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                Unduh (.XLSX)
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Rangkuman Rekomendasi Efisiensi Lintas Cabang</span>
                <span className="text-[10px] text-slate-400">Identifikasi potensi penghematan multi-properti</span>
              </div>
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                Unduh (.PDF)
              </button>
            </div>
            <div className="flex items-center justify-between pb-1 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Laporan Konsolidasi Finansial Energi Bulanan</span>
                <span className="text-[10px] text-slate-400">Rasio biaya energi terhadap profitabilitas multi-lokasi</span>
              </div>
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                Unduh (.PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}