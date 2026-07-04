import { PrismaClient } from "@prisma/client";
import {
  predictRidgeUmkm,
  MODEL_VERSION,
  DISCLAIMER,
} from "../src/lib/prediction/ridge-umkm-model";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const timeline = [
  { month: 7, year: 2025 },
  { month: 8, year: 2025 },
  { month: 9, year: 2025 },
  { month: 10, year: 2025 },
  { month: 11, year: 2025 },
  { month: 12, year: 2025 },
  { month: 1, year: 2026 },
  { month: 2, year: 2026 },
  { month: 3, year: 2026 },
  { month: 4, year: 2026 },
  { month: 5, year: 2026 },
  { month: 6, year: 2026 }
];

const types: string[] = [
  ...Array(10).fill("LAUNDRY"),
  ...Array(10).fill("FNB"),
  ...Array(10).fill("RETAIL"),
  ...Array(8).fill("COLD_STORAGE"),
  ...Array(7).fill("MANUFACTURE"),
  ...Array(5).fill("OTHER")
];

function getRealisticUsageKwh(type: string, month: number): number {
  let min = 250;
  let max = 900;
  switch (type) {
    case "LAUNDRY":
      min = 500; max = 1200;
      break;
    case "FNB":
      min = 400; max = 1000;
      break;
    case "RETAIL":
      min = 300; max = 900;
      break;
    case "COLD_STORAGE":
      min = 900; max = 2200;
      break;
    case "MANUFACTURE":
      min = 1000; max = 3000;
      break;
    default:
      min = 250; max = 900;
  }
  // Seasonal variation (sine wave modulation + small random noise)
  const mid = (min + max) / 2;
  const range = (max - min) / 2;
  const seasonFactor = Math.sin((2 * Math.PI * month) / 12);
  const noise = (Math.random() - 0.5) * 0.08; // +/- 4%
  let val = mid + range * seasonFactor * 0.7 * (1 + noise);
  
  // Clamp boundaries
  if (val < min) val = min;
  if (val > max) val = max;
  return parseFloat(val.toFixed(2));
}

function getSalesRevenue(type: string): number {
  switch (type) {
    case "LAUNDRY": return 20000000;
    case "FNB": return 55000000;
    case "RETAIL": return 35000000;
    case "COLD_STORAGE": return 180000000;
    case "MANUFACTURE": return 280000000;
    default: return 25000000;
  }
}

async function createManyInChunks<T>(
  label: string,
  items: T[],
  chunkSize: number,
  insertFn: (chunk: T[]) => Promise<any>
) {
  console.log(`Menyimpan ${items.length} ${label} dalam chunk berukuran ${chunkSize}...`);
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await insertFn(chunk);
    console.log(`- Berhasil menyimpan chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(items.length / chunkSize)}`);
  }
}

async function main() {
  // Strict Safety Check
  if (process.env.DEMO_SEED_CONFIRM !== "YES") {
    console.error("ERROR: Seeding data demo dibatalkan. Setel variabel lingkungan DEMO_SEED_CONFIRM=YES untuk melanjutkan.");
    console.log("Cara menjalankan (PowerShell):");
    console.log("  $env:DEMO_SEED_CONFIRM=\"YES\"; npm run db:seed:demo");
    console.log("Cara menjalankan (Bash/CMD/Linux):");
    console.log("  DEMO_SEED_CONFIRM=YES npm run db:seed:demo");
    process.exit(1);
  }

  console.log("=== MEMULAI SEED DATA DEMO UMKM ===");

  // 1. Cari demo user by email
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo-owner@wattwise.local" }
  });

  // 2. Cari demo businesses
  const demoBusinesses = await prisma.business.findMany({
    where: { name: { startsWith: "DEMO_UMKM_" } },
    select: { id: true }
  });
  const businessIds = demoBusinesses.map(b => b.id);

  // 3. Clean up existing demo data
  if (businessIds.length > 0) {
    console.log(`Ditemukan ${businessIds.length} bisnis demo lama. Memulai pembersihan data turunan...`);
    
    await prisma.cashflow.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.predictionResult.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.electricityEntry.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.businessMembership.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.cashFlowEntry.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.analysisResult.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.anomaly.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.recommendation.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.monthlyReport.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.dailyUsage.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.appliance.deleteMany({ where: { businessId: { in: businessIds } } });

    const businessDel = await prisma.business.deleteMany({
      where: { id: { in: businessIds } }
    });
    console.log(`- Berhasil menghapus ${businessDel.count} bisnis demo.`);
  }

  if (demoUser) {
    await prisma.user.delete({
      where: { id: demoUser.id }
    });
    console.log("- Berhasil menghapus user demo lama.");
  }
  
  console.log("cleanup selesai");

  // 4. Create demo user
  const hashedPassword = await bcrypt.hash("Demo12345!", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo-owner@wattwise.local",
      password: hashedPassword,
      name: "Demo Owner WattWise"
    }
  });
  console.log(`user dibuat: ${user.email}`);

  // 5. Pre-generate all businesses and memberships in memory
  const businessesToCreate: any[] = [];
  const membershipsToCreate: any[] = [];
  const businessMap: Array<{ id: string; type: string; name: string }> = [];

  for (let i = 0; i < 50; i++) {
    const type = types[i];
    const bName = `DEMO_UMKM_${type}_${i + 1}`;
    const bId = randomUUID();

    businessesToCreate.push({
      id: bId,
      name: bName,
      type: type,
      userId: user.id,
      powerVA: type === "COLD_STORAGE" || type === "MANUFACTURE" ? 6600 : 2200,
      operatingHours: "08:00 - 20:00"
    });

    membershipsToCreate.push({
      userId: user.id,
      businessId: bId,
      role: "BUSINESS_OWNER",
      status: "ACTIVE"
    });

    businessMap.push({ id: bId, type, name: bName });
  }

  // Insert Businesses & Memberships in chunks
  await createManyInChunks("Business", businessesToCreate, 50, (chunk) =>
    prisma.business.createMany({ data: chunk })
  );
  console.log("business dibuat");

  await createManyInChunks("BusinessMembership", membershipsToCreate, 50, (chunk) =>
    prisma.businessMembership.createMany({ data: chunk })
  );

  // 6. Pre-generate all other children tables in memory
  const electricityEntriesToCreate: any[] = [];
  const cashflowsToCreate: any[] = [];
  const cashFlowEntriesToCreate: any[] = [];
  const predictionResultsToCreate: any[] = [];

  for (const b of businessMap) {
    const createdEntries: any[] = [];

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const { month, year } = timeline[mIdx];
      const usageKwh = getRealisticUsageKwh(b.type, month);
      const costIdr = Math.round(usageKwh * 1444.70);
      const entryId = randomUUID();

      const entry = {
        id: entryId,
        businessId: b.id,
        month,
        year,
        usageKwh,
        costIdr
      };
      
      electricityEntriesToCreate.push(entry);
      createdEntries.push(entry);

      // AUTO_ELECTRICITY Cashflow
      cashflowsToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        direction: "OUT",
        type: "ELECTRICITY_BILL",
        amountIdr: BigInt(costIdr),
        occurredAt: new Date(year, month - 1, 28),
        month,
        year,
        source: "AUTO_ELECTRICITY",
        status: "APPROVED",
        createdById: user.id,
        sourceElectricityEntryId: entry.id
      });

      // Sales Revenue CashFlowEntry
      const baseRev = getSalesRevenue(b.type);
      const revNoise = 1 + (Math.random() - 0.5) * 0.12;
      const revenue = Math.round(baseRev * revNoise);

      cashFlowEntriesToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        month,
        year,
        revenueIdr: revenue,
        notes: "Demo data"
      });

      // Manual Sales Cashflow (IN)
      cashflowsToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        direction: "IN",
        type: "SALES",
        amountIdr: BigInt(revenue),
        occurredAt: new Date(year, month - 1, 10),
        month,
        year,
        source: "MANUAL",
        status: "APPROVED",
        createdById: user.id
      });

      // Manual Expense Cashflow (OUT - SALARY)
      const salaryExpense = Math.round(revenue * 0.22);
      cashflowsToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        direction: "OUT",
        type: "SALARY",
        amountIdr: BigInt(salaryExpense),
        occurredAt: new Date(year, month - 1, 25),
        month,
        year,
        source: "MANUAL",
        status: "APPROVED",
        createdById: user.id
      });

      // Manual Expense Cashflow (OUT - RAW_MATERIAL)
      const rawMaterialExpense = Math.round(revenue * 0.26);
      cashflowsToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        direction: "OUT",
        type: "RAW_MATERIAL",
        amountIdr: BigInt(rawMaterialExpense),
        occurredAt: new Date(year, month - 1, 27),
        month,
        year,
        source: "MANUAL",
        status: "APPROVED",
        createdById: user.id
      });
    }

    // Generate PredictionResults for Month index 3 to 12
    for (let mIdx = 2; mIdx < 12; mIdx++) {
      const currentEntry = createdEntries[mIdx];
      const prevEntry = createdEntries[mIdx - 1];
      const history = createdEntries.slice(0, mIdx + 1).reverse();

      const { month, year } = currentEntry;
      const predictedForMonth = month === 12 ? 1 : month + 1;
      const predictedForYear = month === 12 ? year + 1 : year;

      const latest_usage_kwh = currentEntry.usageKwh;
      const previous_usage_kwh = prevEntry.usageKwh;

      const avg3Count = Math.min(history.length, 3);
      const avg_3_month_usage_kwh = history.slice(0, avg3Count).reduce((sum, e) => sum + e.usageKwh, 0) / avg3Count;

      const avg6Count = Math.min(history.length, 6);
      const avg_6_month_usage_kwh = history.slice(0, avg6Count).reduce((sum, e) => sum + e.usageKwh, 0) / avg6Count;

      const trend_1_month = (latest_usage_kwh - previous_usage_kwh) / (previous_usage_kwh + 1e-5);
      const trend_3_month = (latest_usage_kwh - avg_3_month_usage_kwh) / (avg_3_month_usage_kwh + 1e-5);
      const avgTariff = currentEntry.costIdr / currentEntry.usageKwh;

      const typeMapping: Record<string, number> = {
        LAUNDRY: 0,
        FNB: 1,
        RETAIL: 2,
        MANUFACTURE: 3,
        COLD_STORAGE: 4,
        OTHER: 6,
      };
      const business_type_encoded = typeMapping[b.type] ?? 6;

      const month_sin = Math.sin((2 * Math.PI * month) / 12);
      const month_cos = Math.cos((2 * Math.PI * month) / 12);

      let rawPrediction = NaN;
      try {
        rawPrediction = predictRidgeUmkm({
          business_type_encoded,
          month,
          latest_usage_kwh,
          previous_usage_kwh,
          avg_3_month_usage_kwh,
          avg_6_month_usage_kwh,
          trend_1_month,
          trend_3_month,
          month_sin,
          month_cos,
          avg_tariff_idr_per_kwh: avgTariff,
        });
      } catch {
        rawPrediction = NaN;
      }

      const upperBound = latest_usage_kwh * 3;
      const lowerBound = latest_usage_kwh / 3;
      const modelOutputInvalid =
        !Number.isFinite(rawPrediction) ||
        rawPrediction < 10.0 ||
        rawPrediction > upperBound ||
        rawPrediction < lowerBound;

      let predictedUsageKwh = 0;
      let trendPercent = 0;
      let method = "RIDGE_UMKM_V1";
      let modelVersion: string | null = MODEL_VERSION;
      let confidenceLevel = "LOW";
      let confidenceReason = "";

      if (modelOutputInvalid) {
        const changePct = (latest_usage_kwh - previous_usage_kwh) / previous_usage_kwh;
        const fallbackTrendPercent = parseFloat((Math.max(-0.2, Math.min(0.2, changePct)) * 100).toFixed(1));
        const rawKwh = latest_usage_kwh * (1 + fallbackTrendPercent / 100);
        predictedUsageKwh = parseFloat(Math.max(10, rawKwh).toFixed(2));
        trendPercent = fallbackTrendPercent;
        method = "HYBRID_FALLBACK";
        modelVersion = `${MODEL_VERSION} → Rule-Based v1.0`;
        confidenceLevel = "LOW";
        confidenceReason = "Model utama menghasilkan output tidak wajar sehingga sistem beralih ke estimasi rule-based.";
      } else {
        predictedUsageKwh = parseFloat(Math.max(10, rawPrediction).toFixed(2));
        trendPercent = parseFloat((((predictedUsageKwh - latest_usage_kwh) / (latest_usage_kwh + 1e-5)) * 100).toFixed(1));
        
        const anomalyDeviation = avg_6_month_usage_kwh > 0
          ? Math.abs((latest_usage_kwh - avg_6_month_usage_kwh) / avg_6_month_usage_kwh) * 100
          : 0;
        const isAnomalous = anomalyDeviation > 40;
        const isKnownType = b.type !== "OTHER";

        if (history.length >= 6 && isKnownType && !isAnomalous) {
          confidenceLevel = "HIGH";
          confidenceReason = "Data historis lengkap (≥6 bulan), jenis usaha dikenali, dan pola pemakaian stabil tanpa anomali.";
        } else if (isAnomalous) {
          confidenceLevel = "LOW";
          confidenceReason = `Terdeteksi lonjakan pemakaian tidak wajar (deviasi ${anomalyDeviation.toFixed(0)}% dari rata-rata 6 bulan) — prediksi mungkin kurang akurat.`;
        } else if (!isKnownType) {
          confidenceLevel = "LOW";
          confidenceReason = "Jenis usaha 'Lainnya' belum dikenali penuh oleh model — hasil merupakan estimasi kasar.";
        } else {
          confidenceLevel = "MEDIUM";
          confidenceReason = "Data historis cukup (3–5 bulan) dan jenis usaha dikenali, namun belum optimal — sebaiknya lengkapi hingga 6 bulan.";
        }
      }

      const predictedCostIdr = Math.round(predictedUsageKwh * avgTariff);
      const trendDirection = Math.abs(trendPercent) < 1.0 ? "STABIL" : (trendPercent > 0 ? "NAIK" : "TURUN");

      const trendLabelId = trendDirection === "NAIK" ? "naik" : trendDirection === "TURUN" ? "turun" : "stabil";
      const formatRp = (n: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

      const trendPhrase = trendDirection === "STABIL"
        ? "pola pemakaian yang relatif stabil"
        : `pola pemakaian yang cenderung ${trendLabelId} ${Math.abs(trendPercent)}% dari bulan sebelumnya`;
      const methodPhrase = method === "HYBRID_FALLBACK"
        ? "estimasi cadangan (rule-based) karena model utama tidak stabil untuk data usaha Anda"
        : "model AI ringan yang menganalisis pola tagihan Anda";
      const explanation = `Perkiraan pemakaian bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan biaya ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai ${methodPhrase}, berdasarkan ${trendPhrase}.`;

      predictionResultsToCreate.push({
        id: randomUUID(),
        businessId: b.id,
        month,
        year,
        predictedForMonth,
        predictedForYear,
        predictedUsageKwh,
        predictedCostIdr,
        trendDirection,
        trendPercent,
        confidenceLevel,
        confidenceReason,
        method,
        explanation,
        disclaimer: DISCLAIMER,
        modelVersion
      });
    }
  }

  // Insert ElectricityEntries in chunks
  await createManyInChunks("ElectricityEntry", electricityEntriesToCreate, 50, (chunk) =>
    prisma.electricityEntry.createMany({ data: chunk })
  );
  console.log("electricity entries dibuat");

  // Insert CashFlowEntries in chunks
  await createManyInChunks("CashFlowEntry", cashFlowEntriesToCreate, 50, (chunk) =>
    prisma.cashFlowEntry.createMany({ data: chunk })
  );

  // Insert Cashflows in chunks of 50
  await createManyInChunks("Cashflow", cashflowsToCreate, 50, (chunk) =>
    prisma.cashflow.createMany({ data: chunk })
  );
  console.log("cashflow dibuat");

  // Insert PredictionResults in chunks of 50
  await createManyInChunks("PredictionResult", predictionResultsToCreate, 50, (chunk) =>
    prisma.predictionResult.createMany({ data: chunk })
  );
  console.log("prediction results dibuat");

  console.log("=== SEEDING BERHASIL SELESAI ===");
  console.log(`- Bisnis baru dibuat: ${businessesToCreate.length}`);
  console.log(`- Memberships baru dibuat: ${membershipsToCreate.length}`);
  console.log(`- ElectricityEntries baru dibuat: ${electricityEntriesToCreate.length}`);
  console.log(`- Cashflows baru dibuat: ${cashflowsToCreate.length}`);
  console.log(`- CashFlowEntries baru dibuat: ${cashFlowEntriesToCreate.length}`);
  console.log(`- PredictionResults baru dibuat: ${predictionResultsToCreate.length}`);
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seeding data demo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
