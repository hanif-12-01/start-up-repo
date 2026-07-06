import { PrismaClient, BusinessType, UsageStatus, RiskLevel, RecommendationDifficulty, ReportStatus } from "@prisma/client";
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

  // === SEED ENTERPRISE DEMO FOR ROBUSTNESS ===
  console.log("Seeding enterprise@wattwise.id demo account...");
  
  let enterprisePlan = await prisma.plan.findUnique({
    where: { code: 'ENTERPRISE' }
  });
  if (!enterprisePlan) {
    enterprisePlan = await prisma.plan.create({
      data: {
        code: 'ENTERPRISE',
        name: 'Enterprise',
        description: 'Untuk lebih dari 50 bisnis/properti',
        priceIdr: 0,
        billingCycle: 'custom',
        features: [
          'Harga custom',
          'Onboarding khusus',
          'Kebutuhan integrasi/IoT lanjutan',
          'Support khusus',
          'Unlimited bisnis/properti',
        ],
      }
    });
  }

  const oldEnterpriseUser = await prisma.user.findUnique({
    where: { email: 'enterprise@wattwise.id' }
  });
  if (oldEnterpriseUser) {
    const entBizs = await prisma.business.findMany({
      where: { userId: oldEnterpriseUser.id },
      select: { id: true }
    });
    const entBizIds = entBizs.map(b => b.id);
    if (entBizIds.length > 0) {
      await prisma.cashflow.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.predictionResult.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.electricityEntry.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.businessMembership.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.cashFlowEntry.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.analysisResult.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.anomaly.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.recommendation.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.monthlyReport.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.dailyUsage.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.appliance.deleteMany({ where: { businessId: { in: entBizIds } } });
      await prisma.business.deleteMany({ where: { id: { in: entBizIds } } });
    }
    await prisma.subscription.deleteMany({ where: { userId: oldEnterpriseUser.id } });
    await prisma.user.delete({ where: { id: oldEnterpriseUser.id } });
  }

  const entPassword = await bcrypt.hash('password123', 10);
  const enterpriseUser = await prisma.user.create({
    data: {
      email: 'enterprise@wattwise.id',
      name: 'Rudi Hermawan (Enterprise)',
      password: entPassword,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: enterpriseUser.id,
      planId: enterprisePlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const seedEnterpriseLocation = async (
    name: string,
    type: BusinessType,
    address: string,
    powerVA: number,
    operatingHours: string,
    monthsCount: number,
    status: 'Aman' | 'Perlu Dicek' | 'Boros'
  ) => {
    const business = await prisma.business.create({
      data: {
        name,
        type,
        address,
        powerVA,
        operatingHours,
        userId: enterpriseUser.id,
        memberships: {
          create: { userId: enterpriseUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
        }
      }
    });

    const appliances = [];
    if (type === BusinessType.LAUNDRY) {
      appliances.push(
        { name: 'Mesin Cuci Industrial', powerWatt: 1500, quantity: 2, dailyUsageHours: 8, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Mesin Pengering Gas/Listrik', powerWatt: 300, quantity: 2, dailyUsageHours: 6, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Setrika Uap Listrik', powerWatt: 1200, quantity: 2, dailyUsageHours: 5, usageStatus: UsageStatus.ACTIVE, businessId: business.id }
      );
    } else if (type === BusinessType.COLD_STORAGE) {
      appliances.push(
        { name: 'Walk-in Cold Storage Room', powerWatt: 4500, quantity: 1, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Chest Freezer Box', powerWatt: 300, quantity: 3, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: business.id }
      );
    } else if (type === BusinessType.FNB) {
      appliances.push(
        { name: 'Showcase Chiller', powerWatt: 250, quantity: 2, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Mesin Kopi Espresso', powerWatt: 1500, quantity: 1, dailyUsageHours: 6, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Rice Cooker Besar', powerWatt: 800, quantity: 1, dailyUsageHours: 4, usageStatus: UsageStatus.ACTIVE, businessId: business.id }
      );
    } else if (type === BusinessType.RETAIL) {
      appliances.push(
        { name: 'Showcase Minuman', powerWatt: 280, quantity: 3, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'AC Showroom 2 PK', powerWatt: 1500, quantity: 1, dailyUsageHours: 12, usageStatus: UsageStatus.ACTIVE, businessId: business.id }
      );
    } else {
      appliances.push(
        { name: 'AC Split 1 PK', powerWatt: 750, quantity: 4, dailyUsageHours: 10, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Pemanas Air Listrik (Water Heater)', powerWatt: 1000, quantity: 2, dailyUsageHours: 3, usageStatus: UsageStatus.ACTIVE, businessId: business.id },
        { name: 'Lampu Penerangan Lorong', powerWatt: 15, quantity: 20, dailyUsageHours: 12, usageStatus: UsageStatus.ACTIVE, businessId: business.id }
      );
    }
    await prisma.appliance.createMany({ data: appliances });

    const entries = [];
    const baseUsage = type === BusinessType.COLD_STORAGE ? 5000 : type === BusinessType.LAUNDRY ? 600 : type === BusinessType.FNB ? 400 : 300;
    const startMonth = 5;
    const startYear = 2026;
    
    for (let i = 0; i < monthsCount; i++) {
      let m = startMonth - i;
      let y = startYear;
      if (m <= 0) {
        m = 12 + m;
        y = startYear - 1;
      }

      let multiplier = 1.0 + Math.sin(m) * 0.1;
      if (status === 'Boros') {
        multiplier += 0.15 + (i === 0 ? 0.25 : 0.05);
      } else if (status === 'Perlu Dicek') {
        multiplier += 0.08 + (i === 0 ? 0.12 : 0.0);
      } else {
        multiplier -= 0.05;
      }
      
      const usageKwh = parseFloat((baseUsage * multiplier).toFixed(2));
      const costIdr = Math.round(usageKwh * 1450);
      entries.push({ month: m, year: y, usageKwh, costIdr, businessId: business.id });
    }

    entries.reverse();
    await prisma.electricityEntry.createMany({ data: entries });

    const latestEntry = entries[entries.length - 1];
    let score = 85.0;
    if (status === 'Boros') score = 55.4;
    else if (status === 'Perlu Dicek') score = 71.2;

    await prisma.analysisResult.create({
      data: {
        businessId: business.id,
        month: 5,
        year: 2026,
        totalUsageKwh: latestEntry.usageKwh,
        totalCostIdr: latestEntry.costIdr,
        avgDailyKwh: latestEntry.usageKwh / 30,
        carbonKg: latestEntry.usageKwh * 0.78,
        efficiencyScore: score,
      }
    });

    if (status === 'Boros') {
      await prisma.anomaly.create({
        data: {
          businessId: business.id,
          month: 5,
          year: 2026,
          description: `Lonjakan drastis konsumsi energi terdeteksi pada peralatan ${appliances[0].name}. Indikasi pemborosan daya standby atau kebocoran arus listrik.`,
          severity: RiskLevel.HIGH,
          usageKwh: latestEntry.usageKwh,
          expectedKwh: latestEntry.usageKwh * 0.75,
          isResolved: false
        }
      });

      await prisma.recommendation.create({
        data: {
          businessId: business.id,
          title: `Optimalkan Siklus Daya ${appliances[0].name}`,
          description: `Gunakan smart timer switch atau matikan total unit saat di luar jam operasional. Estimasi penghematan hingga Rp 250.000 per bulan.`,
          estimatedSavingsIdr: 250000,
          difficulty: RecommendationDifficulty.EASY,
          isImplemented: false
        }
      });
    } else if (status === 'Perlu Dicek') {
      await prisma.anomaly.create({
        data: {
          businessId: business.id,
          month: 5,
          year: 2026,
          description: `Efisiensi AC ruangan/showcase menurun. Konsumsi kWh berada di batas atas ambang batas normal.`,
          severity: RiskLevel.MEDIUM,
          usageKwh: latestEntry.usageKwh,
          expectedKwh: latestEntry.usageKwh * 0.9,
          isResolved: false
        }
      });

      await prisma.recommendation.create({
        data: {
          businessId: business.id,
          title: `Servis AC dan Pembersihan Filter`,
          description: `Lakukan pembersihan unit AC indoor & outdoor serta pemeriksaan freon untuk mengembalikan efisiensi kompresor.`,
          estimatedSavingsIdr: 95000,
          difficulty: RecommendationDifficulty.EASY,
          isImplemented: false
        }
      });
    }

    await prisma.recommendation.create({
      data: {
        businessId: business.id,
        title: `Ganti ke Penerangan LED Hemat Energi`,
        description: `Ganti lampu pijar/TL lama dengan lampu LED hemat daya.`,
        estimatedSavingsIdr: 35000,
        difficulty: RecommendationDifficulty.EASY,
        isImplemented: status === 'Aman'
      }
    });

    const predictedUsageKwh = parseFloat((latestEntry.usageKwh * 0.97).toFixed(2));
    const predictedCostIdr = Math.round(predictedUsageKwh * 1450);
    const methodUsed = monthsCount >= 6 ? 'LSTM_PROTOTYPE' : monthsCount >= 3 ? 'TABULAR_UMKM_V1' : 'RULE_BASED';
    const confidence = monthsCount >= 6 ? 'HIGH' : monthsCount >= 3 ? 'MEDIUM' : 'LOW';

    await prisma.predictionResult.create({
      data: {
        businessId: business.id,
        month: 5,
        year: 2026,
        predictedForMonth: 6,
        predictedForYear: 2026,
        predictedUsageKwh,
        predictedCostIdr,
        trendDirection: 'TURUN',
        trendPercent: -3.0,
        confidenceLevel: confidence,
        confidenceReason: `Prediksi berdasarkan ${monthsCount} bulan data historis dengan kecenderungan stabil.`,
        method: methodUsed,
        explanation: `Perkiraan pemakaian bulan depan sekitar ${predictedUsageKwh} kWh dengan biaya Rp ${predictedCostIdr.toLocaleString('id-ID')}.`,
        disclaimer: 'Prediksi bersifat estimasi simulasi.',
        modelVersion: 'v1.0.0-demo'
      }
    });

    await prisma.monthlyReport.create({
      data: {
        businessId: business.id,
        month: 5,
        year: 2026,
        status: ReportStatus.GENERATED,
        summary: `Laporan Bulanan untuk ${name} (Mei 2026). Efisiensi energi berstatus ${status} dengan skor ${score}/100.`,
      }
    });
  };

  await seedEnterpriseLocation("Kos Melati Purwokerto", BusinessType.OTHER, "Jl. Melati No. 88, Purwokerto", 5500, "24 Jam", 12, "Boros");
  await seedEnterpriseLocation("Kos Anggrek Sokaraja", BusinessType.OTHER, "Jl. Anggrek No. 12, Sokaraja", 5500, "24 Jam", 12, "Aman");
  await seedEnterpriseLocation("Kos Mawar Baturaden", BusinessType.OTHER, "Jl. Mawar No. 4, Baturaden", 3500, "24 Jam", 4, "Aman");
  await seedEnterpriseLocation("Laundry Cabang Utama", BusinessType.LAUNDRY, "Jl. Jend Sudirman No. 20", 11000, "08:00 - 21:00", 12, "Perlu Dicek");
  await seedEnterpriseLocation("Laundry Cabang Timur", BusinessType.LAUNDRY, "Jl. Gatot Subroto No. 45", 5500, "08:00 - 20:00", 2, "Aman");
  await seedEnterpriseLocation("Frozen Food Timur", BusinessType.COLD_STORAGE, "Kawasan Industri Sokaraja Blok A", 22000, "24 Jam", 12, "Boros");
  await seedEnterpriseLocation("Frozen Food Barat", BusinessType.COLD_STORAGE, "Jl. Patimura No. 11", 16500, "24 Jam", 12, "Aman");
  await seedEnterpriseLocation("Warung Kopi Cabang Barat", BusinessType.FNB, "Jl. Pemuda No. 77", 4400, "09:00 - 23:00", 12, "Aman");
  await seedEnterpriseLocation("Minimarket Selatan", BusinessType.RETAIL, "Jl. Wahid Hasyim No. 9", 11000, "07:00 - 22:00", 12, "Perlu Dicek");
  await seedEnterpriseLocation("Properti Campuran Utara", BusinessType.OTHER, "Jl. Raden Patah No. 3", 6600, "24 Jam", 12, "Aman");

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
