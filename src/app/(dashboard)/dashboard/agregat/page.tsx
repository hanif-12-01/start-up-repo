import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  Building2,
  DollarSign,
  Info,
  Store,
  Zap,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/services/subscription";
import { canAccessFeature, isTrialActive, FEATURE_KEYS } from "@/lib/plan-entitlements";
import { PageHeader, StatCard } from "@/components/ui/common";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";
import { formatKwh, formatRupiah, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const businessTypeLabel: Record<string, string> = {
  LAUNDRY: "Laundry",
  FNB: "F&B / Kuliner",
  RETAIL: "Retail / Toko",
  MANUFACTURE: "Manufaktur",
  COLD_STORAGE: "Cold Storage",
  OTHER: "Lainnya",
};

function statusFromScore(score: number | null | undefined): {
  label: "Aman" | "Perlu Dicek" | "Boros" | "Belum Ada";
  tone: string;
} {
  if (score == null) return { label: "Belum Ada", tone: "bg-slate-50 text-slate-500 border-slate-200/60" };
  if (score < 60) return { label: "Boros", tone: "bg-rose-50 text-rose-700 border-rose-200/60" };
  if (score < 80) return { label: "Perlu Dicek", tone: "bg-amber-50 text-amber-700 border-amber-200/60" };
  return { label: "Aman", tone: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
}

export default async function AgregatDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/agregat");

  const { subscription, plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  const trialActive = subscription ? isTrialActive(subscription) : false;

  if (!canAccessFeature(FEATURE_KEYS.DASHBOARD_AGGREGATE, planCode, trialActive)) {
    return (
      <div>
        <PageHeader
          title="Dashboard Agregat"
          subtitle="Pantau ringkasan listrik, biaya, dan risiko dari seluruh bisnis/properti dalam satu tempat."
        />
        <UpgradeCta
          title="Dashboard Agregat Terkunci"
          description="Dashboard agregat multi-cabang tersedia untuk Paket Bisnis."
          requiredTier="Paket Bisnis"
          buttonText="Lihat Paket Bisnis"
          href="/dashboard/paket-demo"
        />
      </div>
    );
  }

  // Fetch semua business milik user + data ringkasan (nol prediksi/analisis berat).
  const businesses = await db.business.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { usageKwh: true, costIdr: true, month: true, year: true },
      },
      analysisResults: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { efficiencyScore: true },
      },
      recommendations: {
        where: { isImplemented: false },
        orderBy: { estimatedSavingsIdr: "desc" },
        take: 3,
        select: { id: true, title: true, estimatedSavingsIdr: true, priority: true },
      },
      predictionResults: {
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { method: true, modelVersion: true },
      },
    },
  });

  if (businesses.length === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard Agregat"
          subtitle="Pantau ringkasan listrik, biaya, dan risiko dari seluruh bisnis/properti dalam satu tempat."
        />
        <div className="card flex flex-col items-center justify-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Belum ada bisnis/properti</h3>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Belum cukup data untuk dashboard agregat. Tambahkan input listrik di
            beberapa lokasi terlebih dahulu.
          </p>
          <Link href="/dashboard/tambah-usaha" className="btn-primary mt-4 px-4 py-2 text-xs">
            Tambah Bisnis/Properti
          </Link>
        </div>
      </div>
    );
  }

  // Agregasi metrik
  let totalKwh = 0;
  let totalCost = 0;
  let totalSavings = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let needCheckCount = 0;

  const rows = businesses.map((b) => {
    const latest = b.electricityEntries[0];
    const score = b.analysisResults[0]?.efficiencyScore ?? null;
    const savings = b.recommendations.reduce((s, r) => s + (r.estimatedSavingsIdr ?? 0), 0);
    const status = statusFromScore(score);
    if (latest) {
      totalKwh += latest.usageKwh;
      totalCost += latest.costIdr;
    }
    totalSavings += savings;
    if (score != null) {
      scoreSum += score;
      scoreCount += 1;
    }
    if (status.label === "Perlu Dicek" || status.label === "Boros") needCheckCount += 1;
    return {
      id: b.id,
      name: b.name,
      typeLabel: businessTypeLabel[b.type] ?? b.type,
      latestKwh: latest?.usageKwh ?? null,
      latestCost: latest?.costIdr ?? null,
      score,
      savings,
      status,
      model: b.predictionResults[0]?.method ?? null,
      modelVersion: b.predictionResults[0]?.modelVersion ?? null,
      topRecs: b.recommendations,
    };
  });

  const avgScore = scoreCount > 0 ? scoreSum / scoreCount : null;

  // Top 3 lokasi dengan potensi lonjakan terbesar (memakai savings sebagai proxy prioritas)
  const topFocus = [...rows]
    .filter((r) => r.status.label !== "Aman" && r.status.label !== "Belum Ada")
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 3);

  // Rekomendasi multi-lokasi: flatten top saving per bisnis
  const multiLocationRecs = rows
    .flatMap((r) =>
      r.topRecs.map((rec) => ({
        recId: rec.id,
        title: rec.title,
        estimatedSavingsIdr: rec.estimatedSavingsIdr ?? 0,
        priority: rec.priority ?? "sedang",
        businessName: r.name,
      })),
    )
    .sort((a, b) => b.estimatedSavingsIdr - a.estimatedSavingsIdr)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard Agregat"
        subtitle="Pantau ringkasan listrik, biaya, dan risiko dari seluruh bisnis/properti dalam satu tempat."
      />

      {/* Ringkasan agregat 6 StatCard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Bisnis/Properti"
          value={String(rows.length)}
          helper="Aktif di akun Anda"
          tone="blue"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Total Pemakaian (bulan terakhir)"
          value={formatKwh(totalKwh)}
          helper="Akumulasi semua lokasi"
          tone="yellow"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Total Estimasi Tagihan Listrik"
          value={formatRupiah(totalCost)}
          helper="Berdasarkan input terakhir"
          tone="slate"
          icon={<BadgeDollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Total Potensi Hemat"
          value={formatRupiah(totalSavings)}
          helper="Sum semua rekomendasi aktif"
          tone="green"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Lokasi Perlu Dicek"
          value={`${needCheckCount} lokasi`}
          helper="Skor efisiensi di bawah 80"
          tone={needCheckCount > 0 ? "red" : "green"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Rata-rata Energy Waste Score"
          value={avgScore != null ? `${Math.round(avgScore)}/100` : "-"}
          helper="Skor efisiensi rata-rata lokasi"
          tone={avgScore == null ? "slate" : avgScore >= 80 ? "green" : avgScore >= 60 ? "yellow" : "red"}
          icon={<Store className="h-5 w-5" />}
        />
      </div>

      {/* Perbandingan Antar Properti/Cabang */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Perbandingan Antar Properti/Cabang
            </h2>
            <p className="text-xs text-slate-500">
              Ringkasan pemakaian, estimasi tagihan listrik, dan status per lokasi.
            </p>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3 text-right">Pemakaian kWh</th>
                  <th className="px-4 py-3 text-right">Estimasi Tagihan</th>
                  <th className="px-4 py-3 text-center">Energy Waste Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Potensi Hemat</th>
                  <th className="px-4 py-3">Model AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="text-[13px] text-slate-700 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {r.typeLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {r.latestKwh != null ? formatKwh(r.latestKwh) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {r.latestCost != null ? formatRupiah(r.latestCost) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center font-bold tabular-nums">
                      {r.score != null ? Math.round(r.score) + "/100" : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn("badge", r.status.tone)}>{r.status.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {r.savings > 0 ? formatRupiah(r.savings) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                      {r.model ? `${r.model}${r.modelVersion ? " · " + r.modelVersion : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Advanced anomaly summary */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-800">Indikasi Anomali (Advanced)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Berdasarkan input manual dan pola historis. Bukan diagnosis pasti.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-700">Aman</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-800">
                {rows.filter((r) => r.status.label === "Aman").length}
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-700/80">lokasi</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-[10px] font-bold uppercase text-amber-700">Perlu Dicek</p>
              <p className="mt-1 text-xl font-extrabold text-amber-800">
                {rows.filter((r) => r.status.label === "Perlu Dicek").length}
              </p>
              <p className="mt-0.5 text-[10px] text-amber-700/80">lokasi</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <p className="text-[10px] font-bold uppercase text-rose-700">Boros</p>
              <p className="mt-1 text-xl font-extrabold text-rose-800">
                {rows.filter((r) => r.status.label === "Boros").length}
              </p>
              <p className="mt-0.5 text-[10px] text-rose-700/80">lokasi</p>
            </div>
          </div>

          {topFocus.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Top 3 Lokasi Perlu Perhatian
              </p>
              <ul className="space-y-1.5">
                {topFocus.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{r.name}</span>
                    <span className={cn("badge", r.status.tone)}>{r.status.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Rekomendasi Multi-Lokasi */}
        <div className="card">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-800">Rekomendasi Multi-Lokasi</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Agregat saran hemat dengan estimasi potensi hemat tertinggi dari semua lokasi.
            </p>
          </div>
          {multiLocationRecs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Belum ada rekomendasi aktif untuk seluruh lokasi.
            </p>
          ) : (
            <ul className="space-y-3">
              {multiLocationRecs.map((rec) => (
                <li
                  key={rec.recId}
                  className="rounded-xl border border-slate-100 bg-slate-50/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{rec.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Lokasi: <strong>{rec.businessName}</strong>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {rec.estimatedSavingsIdr > 0
                        ? formatRupiah(rec.estimatedSavingsIdr) + "/bln"
                        : "bervariasi"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="space-y-1 text-[11px] leading-relaxed text-slate-600">
          <p>
            Estimasi tagihan listrik ditampilkan berdasarkan input manual pengguna dan
            perkiraan WattWise AI — bukan tagihan resmi PLN.
          </p>
          <p>
            Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain
            seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
          </p>
        </div>
      </div>
    </div>
  );
}
