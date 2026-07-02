import { db } from "./db";
import { BusinessType, RiskLevel, RecommendationDifficulty, ReportStatus } from "@prisma/client";

export interface AnalysisOutput {
  efficiencyScore: number;
  avgDailyKwh: number;
  carbonKg: number;
  predictedKwh: number;
  predictedCostIdr: number;
  riskLevel: RiskLevel;
  potentialSavingsIdr: number;
  anomaliesCount: number;
}

export async function runElectricityAnalysis(
  businessId: string,
  month: number,
  year: number,
  actualUsageKwh: number,
  actualCostIdr: number
): Promise<AnalysisOutput> {
  // 1. Fetch business with active appliances
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      appliances: {
        where: { usageStatus: "ACTIVE" },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // 2. Calculate expected monthly usage from appliances
  let expectedMonthlyKwh = 0;
  if (business.appliances.length > 0) {
    const dailyKwh = business.appliances.reduce((acc, app) => {
      const appDaily = (app.powerWatt / 1000) * app.quantity * app.dailyUsageHours;
      return acc + appDaily;
    }, 0);
    expectedMonthlyKwh = dailyKwh * 30;
  } else {
    // Fallback baseline defaults if no appliances are registered
    switch (business.type) {
      case BusinessType.LAUNDRY:
        expectedMonthlyKwh = 750;
        break;
      case BusinessType.FNB:
        expectedMonthlyKwh = 500;
        break;
      case BusinessType.COLD_STORAGE:
        expectedMonthlyKwh = 1200;
        break;
      case BusinessType.RETAIL:
        expectedMonthlyKwh = 400;
        break;
      case BusinessType.MANUFACTURE:
        expectedMonthlyKwh = 950;
        break;
      default:
        expectedMonthlyKwh = 350;
    }
  }

  // 3. Compute efficiency score
  const ratio = actualUsageKwh / expectedMonthlyKwh;
  let score = 100;
  if (ratio <= 1.0) {
    score = 95 - ratio * 15; // 80 - 95 range
  } else if (ratio <= 1.5) {
    score = 80 - ((ratio - 1.0) / 0.5) * 30; // 50 - 80 range
  } else {
    score = 50 - ((ratio - 1.5) / 1.5) * 30; // down to 20 range
  }
  const efficiencyScore = Math.max(15, Math.min(100, Math.round(score)));

  const avgDailyKwh = actualUsageKwh / 30;
  const carbonKg = actualUsageKwh * 0.85; // rough standard for Java-Bali grid (0.85 kg CO2/kWh)

  // 4. Fetch historical electricity entry (previous month)
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const prevEntry = await db.electricityEntry.findUnique({
    where: {
      businessId_year_month: {
        businessId,
        year: prevYear,
        month: prevMonth,
      },
    },
  });

  // 5. Predict next month's usage & cost
  let trend = 1.02; // default: 2% growth
  if (prevEntry && prevEntry.usageKwh > 0) {
    const pctChange = (actualUsageKwh - prevEntry.usageKwh) / prevEntry.usageKwh;
    // Limit trend factor to prevent wild swings (-20% to +20%)
    trend = 1 + Math.max(-0.2, Math.min(0.2, pctChange));
  }

  const predictedKwh = actualUsageKwh * trend;
  const avgTariff = actualUsageKwh > 0 ? actualCostIdr / actualUsageKwh : 1500;
  const predictedCostIdr = Math.round(predictedKwh * avgTariff);

  // 6. Anomaly Detection
  // Clear previous anomalies for this month & year first
  await db.anomaly.deleteMany({
    where: {
      businessId,
      month,
      year,
    },
  });

  const anomalies: { description: string; severity: RiskLevel; usageKwh?: number; expectedKwh?: number }[] = [];

  // Rule A: Current usage exceeds expected usage from appliances
  if (ratio > 1.25) {
    const pct = Math.round((ratio - 1) * 100);
    anomalies.push({
      description: `Konsumsi listrik nyata (${actualUsageKwh.toFixed(0)} kWh) melebihi kapasitas estimasi peralatan terdaftar (${expectedMonthlyKwh.toFixed(0)} kWh) sebesar ${pct}%. Ada indikasi peralatan hidup melebihi jam operasional normal atau terjadi pemborosan daya.`,
      severity: ratio > 1.5 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
      usageKwh: actualUsageKwh,
      expectedKwh: expectedMonthlyKwh,
    });
  }

  // Rule B: Extreme month-on-month increase
  if (prevEntry && prevEntry.usageKwh > 0) {
    const pctChange = ((actualUsageKwh - prevEntry.usageKwh) / prevEntry.usageKwh) * 100;
    if (pctChange > 25) {
      anomalies.push({
        description: `Lonjakan pemakaian bulanan tidak wajar. Naik sebesar ${pctChange.toFixed(0)}% dibanding bulan lalu (${prevEntry.usageKwh.toFixed(0)} kWh).`,
        severity: RiskLevel.MEDIUM,
        usageKwh: actualUsageKwh,
        expectedKwh: prevEntry.usageKwh,
      });
    }
  }

  // Insert detected anomalies
  for (const anomaly of anomalies) {
    await db.anomaly.create({
      data: {
        businessId,
        month,
        year,
        description: anomaly.description,
        severity: anomaly.severity,
        usageKwh: anomaly.usageKwh,
        expectedKwh: anomaly.expectedKwh,
      },
    });
  }

  // Determine Risk Level
  let riskLevel: RiskLevel = RiskLevel.LOW;
  if (anomalies.some((a) => a.severity === RiskLevel.HIGH) || ratio > 1.4) {
    riskLevel = RiskLevel.HIGH;
  } else if (anomalies.some((a) => a.severity === RiskLevel.MEDIUM) || ratio > 1.15) {
    riskLevel = RiskLevel.MEDIUM;
  }

  // 7. Savings Potential and Recommendations
  // Delete unimplemented recommendations to keep the system tidy
  await db.recommendation.deleteMany({
    where: {
      businessId,
      isImplemented: false,
    },
  });

  let savingFactor = 0.05;
  if (efficiencyScore < 65) {
    savingFactor = 0.20;
  } else if (efficiencyScore < 80) {
    savingFactor = 0.12;
  }
  const potentialSavingsIdr = Math.round(actualCostIdr * savingFactor);

  const businessTypeRecs: Record<
    BusinessType,
    { title: string; description: string; pct: number; difficulty: RecommendationDifficulty }[]
  > = {
    [BusinessType.LAUNDRY]: [
      {
        title: "Penjadwalan Ulang Penggunaan Mesin Pengering",
        description: "Hindari mengoperasikan mesin pengering listrik pada jam beban puncak PLN (17.00 - 22.00). Alihkan beban besar ke pagi atau siang hari.",
        pct: 0.45,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Pencucian dengan Kapasitas Penuh (Full Load)",
        description: "Pastikan mesin cuci dijalankan hanya saat mencapai kapasitas maksimal agar menghemat siklus motor listrik dan air.",
        pct: 0.25,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Pemilihan Setrika Uap Boiler",
        description: "Pertimbangkan beralih ke setrika uap boiler berbahan bakar gas LPG jika volume cucian sangat besar untuk memotong konsumsi listrik setrika biasa.",
        pct: 0.30,
        difficulty: RecommendationDifficulty.HARD,
      },
    ],
    [BusinessType.FNB]: [
      {
        title: "Perawatan Kondensor Pendingin / Showcase",
        description: "Bersihkan debu pada kisi-kisi kondensor kulkas atau showcase minimarket/warung Anda setiap 3 bulan sekali. Debu tebal membuat kompresor bekerja 20% lebih lama.",
        pct: 0.40,
        difficulty: RecommendationDifficulty.MEDIUM,
      },
      {
        title: "Pengaturan Suhu Rice Cooker Efisien",
        description: "Nyalakan mode penghangat (warm) pada rice cooker secukupnya, hindari membiarkannya menyala nonstop selama 24 jam.",
        pct: 0.30,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Zonasi Lampu dan AC Ruang Makan",
        description: "Matikan lampu atau AC di area makan yang sedang kosong pada jam sepi pengunjung.",
        pct: 0.30,
        difficulty: RecommendationDifficulty.EASY,
      },
    ],
    [BusinessType.COLD_STORAGE]: [
      {
        title: "Inspeksi Karet Gasket Pintu Freezer",
        description: "Periksa kerapatan pintu cold storage/freezer box menggunakan tes selipan kertas. Gasket yang bocor menyedot konsumsi daya kompresor secara signifikan.",
        pct: 0.50,
        difficulty: RecommendationDifficulty.MEDIUM,
      },
      {
        title: "Pengaturan Jadwal Defrosting Malam Hari",
        description: "Atur timer pencairan bunga es otomatis (defrost) pada larut malam saat suhu lingkungan sekitar lebih dingin untuk efisiensi kompresor.",
        pct: 0.25,
        difficulty: RecommendationDifficulty.MEDIUM,
      },
      {
        title: "Pembatasan Buka-Tutup Pintu Cold Storage",
        description: "Terapkan disiplin kerja minimalisasi frekuensi dan durasi membuka pintu cold storage.",
        pct: 0.25,
        difficulty: RecommendationDifficulty.EASY,
      },
    ],
    [BusinessType.RETAIL]: [
      {
        title: "Gunakan Timer untuk Neon Box / Papan Nama",
        description: "Pasang timer analog murah pada sirkuit lampu papan nama toko agar mati otomatis pukul 23.00 malam.",
        pct: 0.35,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Atur Suhu AC Ruangan Min 24°C",
        description: "Atur remote AC ke suhu nyaman ideal 24°C - 25°C. Menyetel suhu AC ke 16°C di siang hari tidak mempercepat pendinginan, melainkan memboroskan kompresor.",
        pct: 0.45,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Beralih Total ke Lampu LED",
        description: "Ganti sisa lampu pijar atau TL halogen lama Anda dengan lampu LED hemat energi untuk penerangan display toko.",
        pct: 0.20,
        difficulty: RecommendationDifficulty.EASY,
      },
    ],
    [BusinessType.MANUFACTURE]: [
      {
        title: "Matikan Mesin Idle / Siaga",
        description: "Matikan mesin jahit listrik, motor penggerak, atau kompresor angin dari saklar utama saat jam istirahat karyawan.",
        pct: 0.50,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Optimalisasi Pencahayaan Alami (Sky Light)",
        description: "Gunakan beberapa lembar genteng kaca transparan di atap pabrik/bengkel untuk mengurangi lampu produksi di siang hari.",
        pct: 0.30,
        difficulty: RecommendationDifficulty.MEDIUM,
      },
      {
        title: "Perbaikan Kebocoran Sistem Kompresor Udara",
        description: "Cari dan tambal kebocoran udara pada selang kompresor. Kebocoran kecil memaksa motor kompresor berputar berulang kali tanpa digunakan.",
        pct: 0.20,
        difficulty: RecommendationDifficulty.MEDIUM,
      },
    ],
    [BusinessType.OTHER]: [
      {
        title: "Matikan Listrik Ruangan Kosong",
        description: "Biasakan mematikan AC dan lampu di ruangan yang tidak terpakai atau pasang motion sensor.",
        pct: 0.60,
        difficulty: RecommendationDifficulty.EASY,
      },
      {
        title: "Cabut Colokan Siaga (Standby Power)",
        description: "Gunakan stopkontak colokan saklar mandiri untuk memutus arus standby dispenser air, TV, printer, dan komputer di malam hari.",
        pct: 0.40,
        difficulty: RecommendationDifficulty.EASY,
      },
    ],
  };

  const recList = businessTypeRecs[business.type] || businessTypeRecs[BusinessType.OTHER];

  for (const rec of recList) {
    const estSaving = Math.round(potentialSavingsIdr * rec.pct);
    await db.recommendation.create({
      data: {
        businessId,
        title: rec.title,
        description: rec.description,
        estimatedSavingsIdr: estSaving,
        difficulty: rec.difficulty,
        isImplemented: false,
      },
    });
  }

  // 8. Generate Monthly Report Summary
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const formattedMonth = monthNames[month - 1] || month.toString();

  let summary = `Laporan bulanan ${business.name} periode ${formattedMonth} ${year}. `;
  summary += `Konsumsi listrik terdaftar sebesar ${actualUsageKwh.toFixed(0)} kWh dengan total tagihan Rp${actualCostIdr.toLocaleString("id-ID")}. `;
  summary += `Energy Score bisnis Anda adalah ${efficiencyScore}/100 dengan status risiko pemakaian ${
    riskLevel === RiskLevel.HIGH ? "TINGGI (Boros)" : riskLevel === RiskLevel.MEDIUM ? "SEDANG (Cukup Boros)" : "RENDAH (Efisien)"
  }. `;

  if (anomalies.length > 0) {
    summary += `Terdeteksi ${anomalies.length} anomali pemakaian. Silakan periksa daftar anomali pada dashboard Anda. `;
  } else {
    summary += `Pemakaian terpantau normal dan tidak ada anomali terdeteksi. `;
  }

  summary += `Rekomendasi tindakan hemat energi berpotensi mengurangi pengeluaran Anda hingga Rp${potentialSavingsIdr.toLocaleString("id-ID")} bulan ini.`;

  await db.monthlyReport.upsert({
    where: {
      businessId_year_month: {
        businessId,
        year,
        month,
      },
    },
    update: {
      status: ReportStatus.GENERATED,
      summary,
    },
    create: {
      businessId,
      year,
      month,
      status: ReportStatus.GENERATED,
      summary,
    },
  });

  return {
    efficiencyScore,
    avgDailyKwh,
    carbonKg,
    predictedKwh,
    predictedCostIdr,
    riskLevel,
    potentialSavingsIdr,
    anomaliesCount: anomalies.length,
  };
}