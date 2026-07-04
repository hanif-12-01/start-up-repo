import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Info, PlusCircle, UserCheck, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";
import { formatKwh, formatRupiah } from "@/lib/utils";
import { LaporanPdfButton } from "./laporan-pdf-button";
import { CsvExportButton } from "@/components/csv-export-button";
import {
  getLaporanDataForBusiness,
  getMonthlyReportsForBusiness,
  getActiveBusinessId,
} from "@/services/business";
import { getCashFlowEntryForPeriod } from "@/services/cash-flow";
import {
  calculateBillAfterSavings,
  calculateElectricityRevenueRatio,
  calculatePotentialRemainingRevenueAfterSavings,
  calculateRemainingRevenueAfterElectricity,
  classifyElectricityRevenueRatio,
  type CashFlowBusinessType,
} from "@/lib/cash-flow";

export const dynamic = "force-dynamic";

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const businessTypeLabels: Record<string, string> = {
  LAUNDRY: "Laundry",
  FNB: "F&B / Kuliner",
  RETAIL: "Retail / Toko",
  MANUFACTURE: "Manufaktur / Prosedur",
  COLD_STORAGE: "Cold Storage / Pendingin",
  OTHER: "Usaha Lainnya",
};

const severityLabels: Record<string, string> = {
  LOW: "Ringan",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
};

function getUsageStatus(score?: number | null) {
  if (score == null) return { label: "Belum Dinilai", className: "border-slate-200 bg-slate-50 text-slate-600" };
  if (score < 60) return { label: "Boros / Risiko Tinggi", className: "border-red-100 bg-red-50 text-red-700" };
  if (score < 80) return { label: "Perlu Perhatian", className: "border-yellow-100 bg-brand-yellowSoft text-yellow-800" };
  return { label: "Efisien", className: "border-green-100 bg-green-50 text-green-700" };
}

function EmptyState({
  icon,
  title,
  message,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Laporan Bulanan Listrik" subtitle="Pratinjau Laporan berbasis data usaha dan pemakaian listrik terbaru." />
      <div className="card flex flex-col items-center gap-4 py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-greenSoft text-brand-green">{icon}</div>
        <h2 className="text-lg font-bold text-brand-ink">{title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-slate-500">{message}</p>
        <Link href={href} className="btn-primary mt-2">
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default async function LaporanPage({ searchParams }: { searchParams?: { month?: string; year?: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const monthParam = searchParams?.month ? Number(searchParams.month) : undefined;
  const yearParam = searchParams?.year ? Number(searchParams.year) : undefined;
  const selectedMonth = monthParam && monthParam >= 1 && monthParam <= 12 ? monthParam : undefined;
  const selectedYear = yearParam && yearParam >= 2020 ? yearParam : undefined;

  const business = await getLaporanDataForBusiness(session.user.id, selectedMonth, selectedYear);

  if (!business) {
    return (
      <EmptyState
        icon={<UserCheck className="h-7 w-7" />}
        title="Profil Usaha Belum Lengkap"
        message="Lengkapi profil usaha terlebih dahulu agar WattWise AI dapat membuat laporan bulanan yang sesuai dengan jenis usaha, daya listrik, dan jam operasional Anda."
        href="/onboarding"
        cta="Lengkapi Profil Usaha"
      />
    );
  }

  const latestEntry = business.electricityEntries[0];
  const previousEntry = business.electricityEntries[1];
  const latestAnalysis = business.analysisResults[0];

  if (!latestEntry || !latestAnalysis) {
    return (
      <EmptyState
        icon={<PlusCircle className="h-7 w-7" />}
        title="Data Laporan Belum Cukup"
        message="WattWise AI memerlukan profil usaha dan minimal satu input data listrik untuk membuat pratinjau laporan bulanan. Silakan isi data pemakaian listrik terlebih dahulu."
        href="/dashboard/input"
        cta="Input Data Listrik"
      />
    );
  }

  const period = `${monthNames[latestEntry.month - 1]} ${latestEntry.year}`;
  const currentAnomalies = business.anomalies.filter((item) => item.month === latestEntry.month && item.year === latestEntry.year);
  const monthlySavings = business.recommendations.reduce((sum, item) => sum + (item.estimatedSavingsIdr ?? 0), 0);
  const yearlySavings = monthlySavings * 12;
  const usageStatus = getUsageStatus(latestAnalysis.efficiencyScore);
  const predictedBill =
    previousEntry && previousEntry.usageKwh > 0
      ? Math.round(latestEntry.costIdr * (1 + Math.max(-0.2, Math.min(0.2, (latestEntry.usageKwh - previousEntry.usageKwh) / previousEntry.usageKwh))))
      : Math.round(latestEntry.costIdr * 1.02);
  const generatedAt =
    business.monthlyReports[0]?.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) ??
    new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // Cash flow analytics untuk periode yang sama dengan latestEntry — defensif
  // terhadap CashFlowEntry belum di-migrate (fallback ke null / "belum ada data").
  const activeBusinessId = await getActiveBusinessId(session.user.id);
  let cashFlowRevenue: number | null = null;
  if (activeBusinessId) {
    try {
      const cf = await getCashFlowEntryForPeriod(
        activeBusinessId,
        latestEntry.month,
        latestEntry.year,
      );
      cashFlowRevenue = cf?.revenueIdr ?? null;
    } catch {
      cashFlowRevenue = null;
    }
  }
  const cfBusinessType = business.type as CashFlowBusinessType;
  const cfRatioPercent =
    cashFlowRevenue !== null
      ? calculateElectricityRevenueRatio(cashFlowRevenue, latestEntry.costIdr)
      : null;
  const cfRatioStatus = classifyElectricityRevenueRatio(cfRatioPercent, cfBusinessType);
  const cfRemainingIdr =
    cashFlowRevenue !== null
      ? calculateRemainingRevenueAfterElectricity(cashFlowRevenue, latestEntry.costIdr)
      : null;
  const cfBillAfterSavings = calculateBillAfterSavings(latestEntry.costIdr, monthlySavings);
  const cfPotentialRemainingIdr =
    cashFlowRevenue !== null
      ? calculatePotentialRemainingRevenueAfterSavings(
          cashFlowRevenue,
          latestEntry.costIdr,
          monthlySavings,
        )
      : null;

  const allReportHistory = await getMonthlyReportsForBusiness(session.user.id);
  const reportHistory = allReportHistory.filter((report) => {
    const monthMatches = selectedMonth ? report.month === selectedMonth : true;
    const yearMatches = selectedYear ? report.year === selectedYear : true;
    return monthMatches && yearMatches;
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Laporan Bulanan Listrik"
        subtitle="Pratinjau profesional untuk melihat pemakaian, risiko, rekomendasi, dan potensi hemat usaha Anda."
      />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green">Laporan Tersedia</span>
          <h2 className="text-lg font-bold text-brand-ink">Laporan Periode {period}</h2>
          <p className="text-xs text-slate-500">Dibuat otomatis pada {generatedAt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LaporanPdfButton month={latestEntry.month} year={latestEntry.year} />
          <CsvExportButton type="electricity" label="Ekspor Riwayat CSV" />
        </div>
      </div>

      <section className='card space-y-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h2 className='text-lg font-bold text-brand-ink'>Riwayat Laporan</h2>
            <p className='text-sm text-slate-500'>Filter dan unduh ulang laporan bulanan untuk usaha aktif.</p>
          </div>
          <form method='GET' className='flex flex-wrap gap-2'>
            <select name='month' defaultValue={selectedMonth ?? ''} className='select w-36'>
              <option value=''>Semua Bulan</option>
              {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <input name='year' defaultValue={selectedYear ?? ''} className='input w-28' placeholder='Tahun' />
            <button className='btn-outline' type='submit'>Filter</button>
          </form>
        </div>

        {reportHistory.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>Belum ada laporan tersimpan.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-slate-100 text-sm'>
              <thead className='bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400'>
                <tr><th className='px-4 py-3'>Periode</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'>kWh</th><th className='px-4 py-3'>Biaya</th><th className='px-4 py-3'>Skor</th><th className='px-4 py-3 text-right'>Aksi</th></tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {reportHistory.map((report) => (
                  <tr key={report.id} className='hover:bg-slate-50/60'>
                    <td className='px-4 py-3 font-semibold text-brand-ink'>{monthNames[report.month - 1]} {report.year}</td>
                    <td className='px-4 py-3 text-slate-600'>{report.status}</td>
                    <td className='px-4 py-3 text-slate-600'>{report.totalKwh != null ? formatKwh(report.totalKwh) : '-'}</td>
                    <td className='px-4 py-3 text-slate-600'>{report.totalCostIdr != null ? formatRupiah(report.totalCostIdr) : '-'}</td>
                    <td className='px-4 py-3 text-slate-600'>{report.energyScore != null ? Math.round(report.energyScore) + '/100' : '-'}</td>
                    <td className='px-4 py-3'><div className='flex justify-end'><span className="text-slate-400 text-xs">Tersedia di atas</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden !p-0">
        <div className="bg-gradient-to-r from-brand-green to-brand-blue p-8 text-white md:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                <Zap className="h-8 w-8 fill-current" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">WattWise AI</p>
                <h1 className="mt-1 text-2xl font-extrabold">Pratinjau Laporan Energi Bulanan</h1>
                <p className="mt-1 text-sm text-white/75">Listrik Cerdas untuk UMKM</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 text-left sm:text-right">
              <p className="text-xs font-bold uppercase text-white/70">Periode</p>
              <p className="text-lg font-extrabold">{period}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-8 md:p-10">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profil Usaha</h3>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-500">
                  Nama Usaha: <strong className="text-brand-ink">{business.name}</strong>
                </p>
                <p className="text-slate-500">
                  Jenis Usaha: <strong className="text-brand-ink">{businessTypeLabels[business.type] ?? business.type}</strong>
                </p>
                <p className="text-slate-500">
                  Lokasi: <strong className="text-brand-ink">{business.address ?? "-"}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Spesifikasi Listrik</h3>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-500">
                  Daya Terpasang: <strong className="text-brand-ink">{business.powerVA ? `${business.powerVA} VA` : "-"}</strong>
                </p>
                <p className="text-slate-500">
                  Jam Operasional: <strong className="text-brand-ink">{business.operatingHours ?? "-"}</strong>
                </p>
                <p className="text-slate-500">
                  Sumber Data: <strong className="text-brand-ink">Database WattWise AI</strong>
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Listrik Bulanan</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold text-slate-500">Total kWh</p>
                <p className="mt-2 text-xl font-extrabold text-brand-ink">{formatKwh(latestEntry.usageKwh)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold text-slate-500">Estimasi Tagihan Bulanan</p>
                <p className="mt-2 text-xl font-extrabold text-brand-ink">{formatRupiah(latestEntry.costIdr)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold text-slate-500">Prediksi Tagihan</p>
                <p className="mt-2 text-xl font-extrabold text-brand-ink">{formatRupiah(predictedBill)}</p>
              </div>
              <div className={`rounded-2xl border p-5 ${usageStatus.className}`}>
                <p className="text-xs font-semibold">Status Pemakaian</p>
                <p className="mt-2 text-sm font-extrabold uppercase">{usageStatus.label}</p>
                {latestAnalysis.efficiencyScore != null && <p className="mt-1 text-xs">Skor {Math.round(latestAnalysis.efficiencyScore)}/100</p>}
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Deteksi Anomali</h3>
            {currentAnomalies.length === 0 ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-green-100 bg-green-50 p-5 text-green-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Tidak ada anomali aktif pada periode ini. Pemakaian listrik terpantau stabil.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {currentAnomalies.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 rounded-2xl border p-5 ${
                      item.severity === "HIGH"
                        ? "border-red-100 bg-red-50 text-red-900"
                        : item.severity === "MEDIUM"
                          ? "border-yellow-100 bg-brand-yellowSoft text-yellow-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Risiko {severityLabels[item.severity]}</p>
                      <p className="mt-1 text-sm font-medium leading-relaxed">{item.description}</p>
                      {item.usageKwh && item.expectedKwh && (
                        <p className="mt-2 text-xs opacity-80">
                          Tercatat {formatKwh(item.usageKwh)}, acuan normal {formatKwh(item.expectedKwh)}.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border-t border-slate-100 pt-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tiga Rekomendasi Hemat Teratas</h3>
            {business.recommendations.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                Belum ada rekomendasi aktif atau semua rekomendasi sudah diterapkan.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {business.recommendations.map((item, index) => (
                  <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-100 p-5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-greenSoft text-sm font-extrabold text-brand-greenDark">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-brand-ink">{item.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
                      <span className="mt-3 inline-flex rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        Potensi hemat {item.estimatedSavingsIdr ? formatRupiah(item.estimatedSavingsIdr) : "bervariasi"}/bulan
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">Estimasi Hemat Bulanan</p>
                <p className="mt-2 text-2xl font-extrabold text-green-700">{formatRupiah(monthlySavings)}</p>
              </div>
              <div className="rounded-2xl border border-brand-green/20 bg-brand-greenSoft p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-greenDark">Estimasi Hemat Tahunan</p>
                <p className="mt-2 text-2xl font-extrabold text-brand-greenDark">{formatRupiah(yearlySavings)}</p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Analitik Pendapatan & Listrik
            </h3>
            {cashFlowRevenue === null ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Belum ada data pendapatan untuk periode ini. Isi pendapatan bulanan di menu dashboard agar rasio biaya listrik terhadap pendapatan dapat dihitung.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold text-slate-500">Pendapatan Bulan Ini</p>
                    <p className="mt-2 text-xl font-extrabold text-brand-ink">
                      {formatRupiah(cashFlowRevenue)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold text-slate-500">Tagihan Listrik</p>
                    <p className="mt-2 text-xl font-extrabold text-brand-ink">
                      {formatRupiah(latestEntry.costIdr)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl border p-5 ${
                      cfRatioStatus.severity === 1
                        ? "border-green-100 bg-green-50 text-green-800"
                        : cfRatioStatus.severity === 2
                          ? "border-yellow-100 bg-brand-yellowSoft text-yellow-900"
                          : cfRatioStatus.severity >= 3
                            ? "border-red-100 bg-red-50 text-red-800"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <p className="text-xs font-semibold">Rasio Listrik terhadap Pendapatan</p>
                    <p className="mt-2 text-xl font-extrabold">
                      {cfRatioPercent !== null ? `${cfRatioPercent.toFixed(1)}%` : "-"}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider">
                      {cfRatioStatus.label}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold text-slate-500">Sisa Pendapatan Setelah Listrik</p>
                    <p
                      className={`mt-2 text-xl font-extrabold ${
                        cfRemainingIdr !== null && cfRemainingIdr < 0
                          ? "text-red-700"
                          : "text-brand-ink"
                      }`}
                    >
                      {cfRemainingIdr !== null ? formatRupiah(cfRemainingIdr) : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                    <p className="text-xs font-semibold text-green-700">Potensi Hemat Bulanan</p>
                    <p className="mt-2 text-xl font-extrabold text-green-700">
                      {formatRupiah(monthlySavings)}
                    </p>
                    <p className="mt-1 text-[11px] text-green-800/80">
                      Estimasi tagihan setelah hemat: {formatRupiah(cfBillAfterSavings)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-green/20 bg-brand-greenSoft p-5">
                    <p className="text-xs font-semibold text-brand-greenDark">
                      Potensi Sisa Pendapatan Setelah Hemat
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-brand-greenDark">
                      {cfPotentialRemainingIdr !== null
                        ? formatRupiah(cfPotentialRemainingIdr)
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="space-y-1 text-[11px] leading-relaxed text-slate-600">
                    <p>
                      Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
                    </p>
                    <p>
                      Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>

          <footer className="flex gap-3 border-t border-slate-100 pt-7 text-[11px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              <strong>Disclaimer:</strong> Laporan ini adalah estimasi berdasarkan data yang dimasukkan pengguna dan analisis WattWise AI. Laporan ini bukan tagihan resmi PLN.
              Tagihan aktual dapat berbeda tergantung tarif PLN, pajak, biaya administrasi, biaya lain, dan pemakaian listrik nyata di lapangan.
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
