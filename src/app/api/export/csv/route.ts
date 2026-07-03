import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBusinessId } from '@/services/business';

export const dynamic = 'force-dynamic';

const exportLabels: Record<string, string> = {
  electricity: 'riwayat-listrik',
};

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  const quote = String.fromCharCode(34);
  return quote + text.replaceAll(quote, quote + quote) + quote;
}

function buildCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse('\uFEFF' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=' + filename + '',
    },
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = await getActiveBusinessId(session.user.id);
  if (!businessId) {
    return NextResponse.json({ error: 'Usaha aktif tidak ditemukan' }, { status: 404 });
  }

  const type = new URL(req.url).searchParams.get('type') ?? 'electricity';
  const business = await db.business.findFirst({
    where: { id: businessId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!business) {
    return NextResponse.json({ error: 'Akses usaha tidak valid' }, { status: 403 });
  }

  if (type === 'electricity') {
    const rows = await db.electricityEntry.findMany({
      where: { businessId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { month: true, year: true, usageKwh: true, costIdr: true, createdAt: true },
    });
    const csv = buildCsv(['usaha', 'tahun', 'bulan', 'kwh', 'biaya_idr', 'dibuat_pada'], rows.map((row) => [business.name, row.year, row.month, row.usageKwh, row.costIdr, row.createdAt.toISOString()]));
    return csvResponse(csv, exportLabels.electricity + '.csv');
  }

  return NextResponse.json({ error: 'Ekspor CSV hanya tersedia untuk data angka (riwayat listrik). Laporan berisi karakter tidak diizinkan.' }, { status: 400 });
}
