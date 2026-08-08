import { getOptionalSession } from '@/server/auth/session';
import {
  getMonthlyReportReadModel,
  MonthlyReportBusinessNotFoundError,
  MonthlyReportHistoryGatedError,
  MonthlyReportMonthError,
} from '@/server/services/monthly-report.service';

export const sanitizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  const trimmed = text.replace(/^[\s\x00-\x1F]+/, '');
  const guarded = /^[=+\-@\t\r\n]/.test(trimmed) ? `'${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
};

export const formatCsvRow = (values: unknown[]): string =>
  values.map(sanitizeCell).join(',');

export const sanitizeFilename = (businessName: string, month: string): string => {
  const safeName = businessName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'usaha';
  return `wattwise-laporan-${safeName}-${month}.csv`;
};

export async function GET(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const businessId = url.searchParams.get('businessId') || undefined;
  const month = url.searchParams.get('month') || undefined;

  try {
    const report = await getMonthlyReportReadModel(
      session.user.id,
      businessId,
      month
    );

    const lines: string[] = [
      formatCsvRow(['WattWise AI - Laporan Listrik Usaha']),
      formatCsvRow(['Usaha', report.businessSummary.name]),
      formatCsvRow(['Segmen', report.businessSummary.segment]),
      formatCsvRow(['Periode Laporan', report.monthLabel]),
      formatCsvRow(['Bulan', report.reportMonth]),
      formatCsvRow(['Kelengkapan Data', report.reportCompleteness.label]),
      formatCsvRow(['Waktu Dibuat', report.generatedAtPresentation]),
      '',
      formatCsvRow(['1. RINGKASAN TAGIHAN BULAN INI']),
      formatCsvRow(['Jumlah Tagihan', report.monthSummary.billCount]),
      formatCsvRow(['Total Biaya', report.monthSummary.totalCost]),
      formatCsvRow(['Periode Tercatat', report.monthSummary.recordedPeriods]),
      formatCsvRow(['Total kWh', report.monthSummary.totalKwh ?? 'Belum lengkap']),
      formatCsvRow(['Catatan Kelengkapan', report.monthSummary.dataCompletenessNote]),
      '',
      formatCsvRow(['2. DAFTAR TAGIHAN TERCATAT']),
      formatCsvRow(['Periode', 'Hari', 'Biaya', 'Biaya per Hari', 'kWh', 'Tarif', 'Tagihan Utama']),
      ...report.billSummaries.map((bill) =>
        formatCsvRow([
          bill.period,
          bill.inclusiveDays,
          bill.totalCost,
          bill.costPerDay,
          bill.kwh ?? 'Tidak diisi',
          bill.tariff ?? 'Tidak diisi',
          bill.isPrimary ? 'Ya' : 'Tidak',
        ])
      ),
    ];

    if (report.billComparisonSummary) {
      lines.push(
        '',
        formatCsvRow(['3. PERBANDINGAN TAGIHAN UTAMA']),
        formatCsvRow(['Ringkasan', report.billComparisonSummary.title]),
        formatCsvRow(['Detail', report.billComparisonSummary.detail]),
        formatCsvRow(['Biaya Harian Utama', report.billComparisonSummary.currentDailyCost]),
        formatCsvRow(['Biaya Harian Sebelumnya', report.billComparisonSummary.previousDailyCost]),
        formatCsvRow(['Arah Pemakaian', report.billComparisonSummary.usageDirection ?? 'Data belum lengkap']),
        formatCsvRow(['Konteks Tarif', report.billComparisonSummary.tariffContext])
      );
    }

    if (report.diagnosticSummary) {
      lines.push(
        '',
        formatCsvRow(['4. PERJALANAN CEK KENAIKAN']),
        formatCsvRow(['Status', report.diagnosticSummary.statusLabel]),
        formatCsvRow(['Dimulai', report.diagnosticSummary.startedAt]),
        formatCsvRow(['Tagihan Sumber', report.diagnosticSummary.sourcePeriod]),
        formatCsvRow(['Selesai', report.diagnosticSummary.closedAt ?? 'Belum selesai'])
      );
    }

    if (report.candidateSummaries.length > 0) {
      lines.push(
        '',
        formatCsvRow(['5. BAGIAN YANG PERLU DICEK']),
        formatCsvRow(['Prioritas', 'Judul', 'Penjelasan', 'Status Pemeriksaan']),
        ...report.candidateSummaries.map((c) =>
          formatCsvRow([c.rankLabel, c.title, c.explanation, c.inspectionState])
        )
      );
    }

    if (report.inspectionSummaries.length > 0) {
      lines.push(
        '',
        formatCsvRow(['6. HASIL PEMERIKSAAN']),
        formatCsvRow(['Judul', 'Status', 'Hasil', 'Waktu Selesai']),
        ...report.inspectionSummaries.map((ins) =>
          formatCsvRow([
            ins.title,
            ins.statusLabel,
            ins.resultLabel ?? '-',
            ins.completedAt ?? '-',
          ])
        )
      );
    }

    if (report.actionPlanSummaries.length > 0) {
      lines.push(
        '',
        formatCsvRow(['7. RENCANA HEMAT']),
        formatCsvRow(['Judul', 'Status', 'Rencana Mulai', 'Dimulai', 'Diperbarui', 'Evaluasi']),
        ...report.actionPlanSummaries.map((act) =>
          formatCsvRow([
            act.title,
            act.statusLabel,
            act.plannedStartDate,
            act.startedAt ?? '-',
            act.finishedAt ?? '-',
            act.reviewTarget,
          ])
        )
      );
    }

    if (report.outcomeSummaries.length > 0) {
      lines.push(
        '',
        formatCsvRow(['8. EVALUASI HASIL']),
        formatCsvRow(['Hasil', 'Penjelasan', 'Periode', 'Perubahan Biaya', 'Perubahan kWh', 'Waktu Evaluasi']),
        ...report.outcomeSummaries.map((out) =>
          formatCsvRow([
            out.overallOutcomeLabel,
            out.safeExplanation,
            `${out.baselinePeriod} -> ${out.followUpPeriod}`,
            out.costDirection,
            out.usageDirection ?? 'Data belum tersedia',
            out.evaluatedAt,
          ])
        )
      );
    }

    lines.push(
      '',
      formatCsvRow(['CATATAN DAN SANGGAHAN']),
      ...report.safeCaveats.map((caveat) => formatCsvRow([caveat]))
    );

    const filename = sanitizeFilename(
      report.businessSummary.name,
      report.reportMonth
    );

    return new Response(`\uFEFF${lines.join('\r\n')}`, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof MonthlyReportHistoryGatedError) {
      return new Response('Laporan di luar riwayat paket.', { status: 403 });
    }
    if (
      error instanceof MonthlyReportBusinessNotFoundError ||
      error instanceof MonthlyReportMonthError
    ) {
      return new Response('Laporan tidak ditemukan atau bulan tidak valid.', {
        status: 404,
      });
    }
    return new Response('Laporan tidak tersedia.', { status: 404 });
  }
}
