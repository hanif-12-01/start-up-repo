import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveBusinessId } from "@/services/business";
import { getCashFlowEntryForPeriod } from "@/services/cash-flow";
import {
  calculateBillAfterSavings,
  calculateElectricityRevenueRatio,
  calculatePotentialRemainingRevenueAfterSavings,
  calculateRemainingRevenueAfterElectricity,
  classifyElectricityRevenueRatio,
  type CashFlowBusinessType,
} from "@/lib/cash-flow";
import { safeError } from "@/lib/safe-log";
import { getUserPlan } from "@/services/subscription";

export const dynamic = "force-dynamic";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const businessTypeLabels: Record<string, string> = {
  LAUNDRY: "Laundry",
  FNB: "F&B / Kuliner",
  RETAIL: "Retail / Toko",
  MANUFACTURE: "Manufaktur / Produksi",
  COLD_STORAGE: "Cold Storage / Pendingin",
  OTHER: "Usaha Lainnya",
};

const severityLabels: Record<string, string> = {
  LOW: "Ringan",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
};

function fmtRp(v: number) {
  return "Rp" + Math.round(v).toLocaleString("id-ID");
}

function fmtKwh(v: number) {
  return v.toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " kWh";
}

function getUsageLabel(score?: number | null) {
  if (score == null) return "Belum Dinilai";
  if (score < 60) return "Boros / Risiko Tinggi";
  if (score < 80) return "Perlu Perhatian";
  return "Efisien";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeBusinessId = await getActiveBusinessId(session.user.id);
    if (!activeBusinessId) {
      return NextResponse.json({ error: "Profil usaha belum lengkap" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const entryWhere = month && year ? { month, year } : {};

    // Get specific entries or default latest
    const allEntries = await db.electricityEntry.findMany({
      where: { businessId: activeBusinessId, ...entryWhere },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const latestEntry = allEntries[0];
    let entryFilter: any = {};

    if (month && year && latestEntry) {
      const prevEntry = await db.electricityEntry.findFirst({
        where: {
          businessId: activeBusinessId,
          OR: [
            { year: { lt: year } },
            { year: year, month: { lt: month } }
          ]
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      const entryIds = [latestEntry.id];
      if (prevEntry) entryIds.push(prevEntry.id);
      entryFilter = { id: { in: entryIds } };
    } else {
      entryFilter = {};
    }

    const analysisWhere = month && year ? { month, year } : {};

    const business = await db.business.findFirst({
      where: { id: activeBusinessId, userId: session.user.id },
      include: {
        electricityEntries: {
          where: entryFilter,
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
        analysisResults: {
          where: analysisWhere,
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
        },
        anomalies: {
          orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        },
        recommendations: {
          where: { isImplemented: false },
          orderBy: [{ estimatedSavingsIdr: "desc" }, { createdAt: "desc" }],
          take: 3,
        },
        monthlyReports: {
          where: analysisWhere,
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Profil usaha belum lengkap" }, { status: 404 });
    }

    const latestEntryData = business.electricityEntries[0];
    const previousEntry = business.electricityEntries[1];
    const latestAnalysis = business.analysisResults[0];

    if (!latestEntryData || !latestAnalysis) {
      return NextResponse.json({ error: "Data laporan belum cukup" }, { status: 404 });
    }

    const period = `${monthNames[latestEntryData.month - 1]} ${latestEntryData.year}`;
    const currentAnomalies = business.anomalies.filter(
      (a) => a.month === latestEntryData.month && a.year === latestEntryData.year
    );
    const monthlySavings = business.recommendations.reduce(
      (sum, r) => sum + (r.estimatedSavingsIdr ?? 0), 0
    );
    const yearlySavings = monthlySavings * 12;
    const usageLabel = getUsageLabel(latestAnalysis.efficiencyScore);
    const predictedBill =
      previousEntry && previousEntry.usageKwh > 0
        ? Math.round(
            latestEntryData.costIdr *
              (1 + Math.max(-0.2, Math.min(0.2, (latestEntryData.usageKwh - previousEntry.usageKwh) / previousEntry.usageKwh)))
          )
        : Math.round(latestEntryData.costIdr * 1.02);

    // ── Cash flow analytics untuk periode yang sama ──
    // Defensif: kalau tabel CashFlowEntry belum di-migrate, treat as null.
    let cashFlowRevenue: number | null = null;
    try {
      const cf = await getCashFlowEntryForPeriod(
        activeBusinessId,
        latestEntryData.month,
        latestEntryData.year,
      );
      cashFlowRevenue = cf?.revenueIdr ?? null;
    } catch (e) {
      safeError("pdf.cashFlowLookup", e);
    }

    const businessTypeForRatio = business.type as CashFlowBusinessType;
    const ratioPercent =
      cashFlowRevenue !== null
        ? calculateElectricityRevenueRatio(cashFlowRevenue, latestEntryData.costIdr)
        : null;
    const ratioStatus = classifyElectricityRevenueRatio(ratioPercent, businessTypeForRatio);
    const remainingRevenueIdr =
      cashFlowRevenue !== null
        ? calculateRemainingRevenueAfterElectricity(cashFlowRevenue, latestEntryData.costIdr)
        : null;
    const estimatedBillAfterSavings = calculateBillAfterSavings(
      latestEntryData.costIdr,
      monthlySavings,
    );
    const potentialRemainingRevenueIdr =
      cashFlowRevenue !== null
        ? calculatePotentialRemainingRevenueAfterSavings(
            cashFlowRevenue,
            latestEntryData.costIdr,
            monthlySavings,
          )
        : null;

    // Check plan gating
    const { plan } = await getUserPlan(session.user.id);
    const planCode = plan?.code || "FREE";

    // --- Build PDF ---
    const { default: PDFDocument } = await import("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    const pdfReady = new Promise<Uint8Array>((resolve, reject) => {
      doc.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      });
      doc.on("error", reject);
    });

    const PAGE_W = doc.page.width;
    const M = 50; // margin
    const CW = PAGE_W - M * 2; // content width
    const GREEN = "#16a34a";
    const DARK = "#1e293b";
    const GRAY = "#64748b";

    // ── Header band ──
    doc.rect(0, 0, PAGE_W, 110).fill(GREEN);
    doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold")
      .text("WATTWISE AI", M, 30, { width: CW });
    doc.fontSize(18).text("Laporan Energi Bulanan", M, 48, { width: CW });
    doc.fontSize(10).font("Helvetica").fillColor("rgba(255,255,255,0.8)")
      .text("Listrik Cerdas untuk UMKM", M, 72, { width: CW });
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#ffffff")
      .text(`Periode: ${period}`, M, 88, { width: CW, align: "right" });

    doc.fillColor(DARK);
    let y = 130;

    // ── Helper fns ──
    function sectionTitle(title: string) {
      y += 8;
      doc.moveTo(M, y).lineTo(M + CW, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      y += 12;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(GREEN).text(title.toUpperCase(), M, y, { width: CW });
      y += 18;
    }

    function labelValue(label: string, value: string, indent = 0) {
      doc.fontSize(9.5).font("Helvetica").fillColor(GRAY).text(label, M + indent, y, { continued: true });
      doc.font("Helvetica-Bold").fillColor(DARK).text("  " + value);
      y += 16;
    }

    function checkPageBreak(needed: number) {
      if (y + needed > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }
    }

    // ── Profil Usaha ──
    sectionTitle("Profil Usaha");
    labelValue("Nama Usaha:", business.name);
    labelValue("Jenis Usaha:", businessTypeLabels[business.type] ?? business.type);
    labelValue("Lokasi:", business.address ?? "-");
    labelValue("Daya Terpasang:", business.powerVA ? `${business.powerVA} VA` : "-");
    labelValue("Jam Operasional:", business.operatingHours ?? "-");

    // ── Ringkasan Listrik ──
    checkPageBreak(120);
    sectionTitle("Ringkasan Listrik Bulanan");

    const summaryItems = [
      ["Total kWh", fmtKwh(latestEntryData.usageKwh)],
      ["Estimasi Tagihan", fmtRp(latestEntryData.costIdr)],
      ["Estimasi Tagihan Listrik", fmtRp(predictedBill)],
      ["Status Pemakaian", usageLabel + (latestAnalysis.efficiencyScore != null ? ` (Skor ${Math.round(latestAnalysis.efficiencyScore)}/100)` : "")],
    ];

    const colW = CW / 2;
    for (let i = 0; i < summaryItems.length; i += 2) {
      const row = summaryItems.slice(i, i + 2);
      row.forEach((item, j) => {
        const x = M + j * colW;
        doc.roundedRect(x, y, colW - 8, 44, 4).fillAndStroke("#f8fafc", "#e2e8f0");
        doc.fontSize(8).font("Helvetica").fillColor(GRAY).text(item[0], x + 10, y + 8);
        doc.fontSize(12).font("Helvetica-Bold").fillColor(DARK).text(item[1], x + 10, y + 23);
      });
      y += 52;
    }

    // ── Anomali ──
    checkPageBreak(80);
    sectionTitle("Deteksi Anomali");
    if (currentAnomalies.length === 0) {
      doc.fontSize(9.5).font("Helvetica").fillColor("#15803d")
        .text("✓ Tidak ada anomali aktif pada periode ini. Pemakaian listrik terpantau stabil.", M, y, { width: CW });
      y += 20;
    } else {
      for (const a of currentAnomalies) {
        checkPageBreak(50);
        const sevColor = a.severity === "HIGH" ? "#dc2626" : a.severity === "MEDIUM" ? "#ca8a04" : GRAY;
        doc.fontSize(8).font("Helvetica-Bold").fillColor(sevColor)
          .text(`RISIKO ${severityLabels[a.severity]}`, M, y, { width: CW });
        y += 13;
        doc.fontSize(9.5).font("Helvetica").fillColor(DARK)
          .text(a.description, M + 8, y, { width: CW - 8 });
        y += doc.heightOfString(a.description, { width: CW - 8 }) + 4;
        if (a.usageKwh && a.expectedKwh) {
          doc.fontSize(8).fillColor(GRAY)
            .text(`Tercatat ${fmtKwh(a.usageKwh)}, acuan normal ${fmtKwh(a.expectedKwh)}.`, M + 8, y, { width: CW - 8 });
          y += 14;
        }
        y += 6;
      }
    }

    // ── Rekomendasi ──
    checkPageBreak(100);
    sectionTitle("Tiga Rekomendasi Hemat Teratas");
    if (business.recommendations.length === 0) {
      doc.fontSize(9.5).font("Helvetica").fillColor(GRAY)
        .text("Belum ada rekomendasi aktif atau semua rekomendasi sudah diterapkan.", M, y, { width: CW });
      y += 20;
    } else {
      business.recommendations.forEach((r, i) => {
        checkPageBreak(60);
        doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
          .text(`${i + 1}. ${r.title}`, M, y, { width: CW });
        y += 15;
        doc.fontSize(9).font("Helvetica").fillColor(GRAY)
          .text(r.description, M + 12, y, { width: CW - 12 });
        y += doc.heightOfString(r.description, { width: CW - 12 }) + 4;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(GREEN)
          .text(`Potensi hemat: ${r.estimatedSavingsIdr ? fmtRp(r.estimatedSavingsIdr) : "bervariasi"}/bulan`, M + 12, y);
        y += 18;
      });
    }

    // ── Estimasi Hemat ──
    checkPageBreak(70);
    sectionTitle("Estimasi Penghematan");
    const savingsData = [
      ["Estimasi Hemat Bulanan", fmtRp(monthlySavings)],
      ["Estimasi Hemat Tahunan", fmtRp(yearlySavings)],
    ];
    savingsData.forEach((item, j) => {
      const x = M + j * colW;
      doc.roundedRect(x, y, colW - 8, 44, 4).fillAndStroke("#f0fdf4", "#bbf7d0");
      doc.fontSize(8).font("Helvetica").fillColor(GREEN).text(item[0], x + 10, y + 8);
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#15803d").text(item[1], x + 10, y + 23);
    });
    y += 56;

    // ── Analitik Pendapatan & Listrik ──
    checkPageBreak(160);
    sectionTitle("Analitik Pendapatan & Listrik");
    if (cashFlowRevenue === null) {
      doc
        .fontSize(9.5).font("Helvetica").fillColor(GRAY)
        .text(
          "Belum ada data pendapatan untuk periode ini. Isi pendapatan bulanan di menu dashboard agar rasio biaya listrik terhadap pendapatan dapat dihitung.",
          M, y, { width: CW, lineGap: 2 },
        );
      y += doc.heightOfString(
        "Belum ada data pendapatan untuk periode ini. Isi pendapatan bulanan di menu dashboard agar rasio biaya listrik terhadap pendapatan dapat dihitung.",
        { width: CW, lineGap: 2 },
      ) + 6;
    } else {
      labelValue("Pendapatan Bulan Ini:", fmtRp(cashFlowRevenue));
      labelValue("Tagihan Listrik:", fmtRp(latestEntryData.costIdr));
      labelValue(
        "Rasio Listrik terhadap Pendapatan:",
        `${ratioPercent!.toFixed(1)}% (${ratioStatus.label})`,
      );
      labelValue(
        "Sisa Pendapatan Setelah Listrik:",
        remainingRevenueIdr !== null ? fmtRp(remainingRevenueIdr) : "-",
      );
      labelValue("Potensi Hemat Bulanan:", fmtRp(monthlySavings));
      labelValue(
        "Estimasi Tagihan Setelah Hemat:",
        fmtRp(estimatedBillAfterSavings),
      );
      labelValue(
        "Potensi Sisa Pendapatan Setelah Hemat:",
        potentialRemainingRevenueIdr !== null
          ? fmtRp(potentialRemainingRevenueIdr)
          : "-",
      );
    }

    // Disclaimer analitik pendapatan (wajib dua baris ini per spesifikasi produk)
    checkPageBreak(70);
    y += 4;
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRAY);
    const cfDisc1 =
      "Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.";
    doc.text(cfDisc1, M, y, { width: CW, lineGap: 2 });
    y += doc.heightOfString(cfDisc1, { width: CW, lineGap: 2 }) + 4;
    const cfDisc2 =
      "Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.";
    doc.text(cfDisc2, M, y, { width: CW, lineGap: 2 });
    y += doc.heightOfString(cfDisc2, { width: CW, lineGap: 2 }) + 6;

    // ── Disclaimer ──
    checkPageBreak(60);
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    y += 12;
    doc.fontSize(7.5).font("Helvetica").fillColor(GRAY)
      .text(
        "Disclaimer: Laporan ini adalah estimasi berdasarkan data yang dimasukkan pengguna dan analisis WattWise AI. " +
        "Laporan ini bukan tagihan resmi PLN. Tagihan aktual dapat berbeda tergantung tarif PLN, pajak, biaya administrasi, " +
        "biaya lain, dan pemakaian listrik nyata di lapangan.",
        M, y, { width: CW, lineGap: 2 }
      );
    y += 40;

    // Footer
    doc.fontSize(7).font("Helvetica").fillColor("#94a3b8")
      .text(
        `Digenarasi oleh WattWise AI — ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
        M, doc.page.height - 40, { width: CW, align: "center" }
      );

    // Apply watermark on all pages if Gratis (FREE)
    if (planCode === "FREE") {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.save();
        doc.opacity(0.08);
        doc.fontSize(22);
        doc.font("Helvetica-Bold");
        doc.fillColor("#ef4444");
        doc.translate(doc.page.width / 2, doc.page.height / 2);
        doc.rotate(-30);
        doc.text("PRATINJAU DOKUMEN WATTWISE AI", -250, -25, {
          width: 500,
          align: "center",
        });
        doc.fontSize(12);
        doc.text("Upgrade ke Pro untuk Menghilangkan Watermark", -250, 5, {
          width: 500,
          align: "center",
        });
        doc.restore();
      }
    }

    doc.end();

    const pdfBuffer = await pdfReady;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan-WattWise-${period.replace(/\s/g, "-")}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    safeError("pdfGeneration", err);
    return NextResponse.json(
      { error: "Gagal membuat PDF" },
      { status: 500 }
    );
  }
}
