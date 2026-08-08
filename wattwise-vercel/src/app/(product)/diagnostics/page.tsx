import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck,
  Gauge,
  ReceiptText,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  BusinessSelector,
  SoftCard,
  WorkspaceHeader,
  WorkspacePage,
  secondaryButton,
} from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { getDashboardReadModel } from '@/server/services/dashboard.service';
import { getDecisionSupport } from '@/server/services/workspace.service';
import { StartDiagnosticButton } from './StartDiagnosticButton';

export const dynamic = 'force-dynamic';

export default async function DiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[] }>;
}) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);

  const [workspaceData, dashboard] = await Promise.all([
    getDecisionSupport(userId, requestedBusinessId),
    getDashboardReadModel(userId, requestedBusinessId),
  ]);

  const businessQuery = `?businessId=${encodeURIComponent(workspaceData.business.id)}`;
  const { nextAction } = dashboard;

  const steps = [
    {
      number: '01',
      title: 'Perbandingan Tagihan',
      desc: 'Sistem membandingkan dua periode tagihan listrik untuk menghitung selisih biaya harian.',
      icon: ReceiptText,
    },
    {
      number: '02',
      title: 'Konteks Operasional',
      desc: 'Menjawab pertanyaan singkat seputar operasional, perubahan okupansi, atau penambahan alat.',
      icon: ClipboardList,
    },
    {
      number: '03',
      title: 'Indikasi Kandidat',
      desc: 'Mendapatkan maksimal 3 kandidat bagian atau peralatan yang paling relevan untuk dicek.',
      icon: Search,
    },
    {
      number: '04',
      title: 'Checklist Pemeriksaan',
      desc: 'Melakukan pemeriksaan mandiri di lokasi secara aman tanpa risiko kelistrikan.',
      icon: ShieldCheck,
    },
    {
      number: '05',
      title: 'Rencana Hemat & Evaluasi',
      desc: 'Menjalankan tindakan hemat sederhana dan mengevaluasinya pada tagihan bulan berikutnya.',
      icon: FileCheck,
    },
  ];

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Tindakan Terarah"
        title="Cek Kenaikan"
        description="Alur pemeriksaan terarah untuk membandingkan tagihan, menjawab pertanyaan operasional, dan mendeteksi pemicu lonjakan biaya listrik secara aman."
        actions={
          <BusinessSelector
            businesses={workspaceData.businesses}
            selectedId={workspaceData.business.id}
            route="/diagnostics"
          />
        }
      />

      {/* Main Status & Hero Card */}
      <SoftCard className="relative overflow-hidden border-emerald-900/15 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-xl">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300 backdrop-blur-md">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                Status Sesi Diagnostik
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {nextAction.label}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100/80">
              Cek Kenaikan menyusun alur evaluasi terstruktur berbasis perbandingan tagihan aktual dan konteks usaha Anda.
            </p>
          </div>
          <div>
            {nextAction.kind === 'START_DIAGNOSTIC' ? (
              <StartDiagnosticButton
                electricityBillId={nextAction.electricityBillId}
                resumable={false}
              />
            ) : (
              <Link
                href={nextAction.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-md transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <span>{nextAction.label}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </SoftCard>

      {/* Steps Breakdown */}
      <SoftCard>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--primary)]">
              Metodologi Diagnostik
            </p>
            <h2 className="mt-1 text-xl font-black">5 Tahap Perjalanan Cek Kenaikan</h2>
          </div>
          <Activity className="h-6 w-6 text-[var(--primary)]" aria-hidden="true" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.number}
                className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--primary)] hover:bg-[var(--surface)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[var(--primary)]">{st.number}</span>
                    <Icon className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">{st.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SoftCard>

      {/* Grid: Candidate Items & Action Plans */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Candidates */}
        <SoftCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--primary)]">
                Kandidat Pemeriksaan
              </p>
              <h2 className="mt-1 text-xl font-black">Bagian yang Perlu Dicek</h2>
            </div>
            <Search className="h-6 w-6 text-[var(--primary)]" aria-hidden="true" />
          </div>

          {dashboard.candidateSummaries.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Belum ada kandidat pemeriksaan aktif. Masukkan minimal 2 periode tagihan untuk menjalankan Cek Kenaikan.
              </p>
              <Link
                href={`/bills/new${businessQuery}`}
                className={`mt-4 ${secondaryButton}`}
              >
                Tambah Tagihan Baru
              </Link>
            </div>
          ) : (
            <ol className="mt-5 space-y-3">
              {dashboard.candidateSummaries.map((candidate) => (
                <li
                  key={`${candidate.rankLabel}-${candidate.title}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--primary)]">
                      {candidate.rankLabel}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--muted)]">
                      {candidate.inspectionStatusLabel}
                    </span>
                  </div>
                  <h3 className="mt-2 font-bold text-[var(--foreground)]">{candidate.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    {candidate.explanation}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SoftCard>

        {/* Action Plans */}
        <SoftCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--primary)]">
                Tindakan Berjalan
              </p>
              <h2 className="mt-1 text-xl font-black">Rencana Hemat Active</h2>
            </div>
            <CheckCircle2 className="h-6 w-6 text-[var(--primary)]" aria-hidden="true" />
          </div>

          {dashboard.actionPlanSummaries.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Belum ada Rencana Hemat yang dibuat. Rencana Hemat dapat ditentukan setelah menyelesaikan pemeriksaan kandidat.
              </p>
              <Link
                href={`/recommendations${businessQuery}`}
                className={`mt-4 ${secondaryButton}`}
              >
                Lihat Rekomendasi
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {dashboard.actionPlanSummaries.map((action) => (
                <article
                  key={action.title}
                  className="rounded-2xl border border-emerald-900/10 bg-[var(--primary-soft)] p-4"
                >
                  <h3 className="font-extrabold text-[var(--foreground)]">{action.title}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--primary)]">
                    {action.statusLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                    Mulai {action.plannedStartDate} · Evaluasi: {action.reviewTarget}
                  </p>
                </article>
              ))}
            </div>
          )}
        </SoftCard>
      </div>

      {/* Disclaimers Footer */}
      <footer className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-xs text-[var(--muted)] space-y-2">
        <p className="font-semibold text-[var(--foreground)]">
          Pedoman Keamanan & Disclaimer WattWise AI
        </p>
        <p>
          • <strong>Prediksi & Estimasi:</strong> Hasil perhitungan Cek Kenaikan bersifat perkiraan berdasarkan data tagihan yang diinput dan bukan tagihan resmi PLN atau pengganti PLN Mobile.
        </p>
        <p>
          • <strong>Pemeriksaan Lapangan:</strong> Lakukan pemeriksaan visual/fisik secara mandiri dan aman. Jangan menyentuh panel listrik utama atau kabel terkelupas tanpa tenaga ahli tersertifikasi.
        </p>
      </footer>
    </WorkspacePage>
  );
}
