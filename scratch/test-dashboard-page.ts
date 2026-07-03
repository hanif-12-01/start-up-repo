import { db } from "../src/lib/db";

async function main() {
  console.log("Simulating loading DashboardPage for a new business with no entries...");

  // Budi Santoso's new business: 'Test Laundry Cabang 3' (id was created in test-create, but we seeded so let's find the first business or create one with no entries)
  // Let's create a temporary business with no entries for Budi Santoso
  const user = await db.user.findFirst({ where: { email: "owner@wattwise.id" } });
  if (!user) throw new Error("User not found");

  const tempBusiness = await db.business.create({
    data: {
      name: "Temp Business No Entries",
      type: "LAUNDRY",
      address: "Jl. Temp 123",
      powerVA: 1300,
      operatingHours: "08:00 - 20:00",
      userId: user.id,
      appliances: {
        create: [
          {
            name: "Lampu",
            powerWatt: 10,
            quantity: 5,
            dailyUsageHours: 12,
          }
        ]
      }
    },
    include: {
      electricityEntries: true,
      dailyUsages: true,
      appliances: true,
      analysisResults: true,
      anomalies: true,
      recommendations: true,
    }
  });

  console.log("Created temp business:", tempBusiness.name);

  // Now, simulate the page logic
  const business = await db.business.findFirst({
    where: { id: tempBusiness.id, userId: user.id },
    select: {
      name: true,
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
        select: { month: true, year: true, usageKwh: true, costIdr: true },
      },
      dailyUsages: {
        orderBy: { date: "asc" },
        take: 14,
        select: { date: true, usageKwh: true },
      },
      appliances: {
        where: { usageStatus: "ACTIVE" },
        orderBy: { powerWatt: "desc" },
        select: { name: true, powerWatt: true, quantity: true, dailyUsageHours: true },
      },
      analysisResults: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { avgDailyKwh: true, efficiencyScore: true },
      },
      anomalies: {
        where: { isResolved: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { description: true },
      },
      recommendations: {
        where: { isImplemented: false },
        orderBy: { estimatedSavingsIdr: "desc" },
        select: { id: true, title: true, description: true, estimatedSavingsIdr: true },
      },
    },
  });

  if (!business) throw new Error("Business not found in query");

  console.log("Running page.tsx logic...");
  const entries = [...business.electricityEntries].reverse();
  const latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const analysis = business.analysisResults[0];
  const hasElectricityData = entries.length > 0;
  const isFirstMonthOnly = entries.length === 1;
  const hasTrendComparison = entries.length > 1;
  
  const hasAnomaly = hasElectricityData && business.anomalies.length > 0;
  const anomalyDesc = hasAnomaly ? business.anomalies[0].description : null;

  // Stat cards
  const tagihanBulanLalu = prev?.costIdr ?? 0;
  const kwhBulanIni = latest?.usageKwh ?? 0;

  let trend = 1.02;
  if (latest && prev && prev.usageKwh > 0) {
    const pct = (latest.usageKwh - prev.usageKwh) / prev.usageKwh;
    trend = 1 + Math.max(-0.2, Math.min(0.2, pct));
  }
  const avgTariff = latest && latest.usageKwh > 0 ? latest.costIdr / latest.usageKwh : 1450;
  const prediksiBulanIni = latest ? Math.round(latest.usageKwh * trend * avgTariff) : 0;

  const potensiHemat = business.recommendations.reduce(
    (sum, r) => sum + (r.estimatedSavingsIdr ?? 0),
    0
  );
  const energyScore = analysis?.efficiencyScore ?? 0;
  const kenaikanPersen = prev && prev.usageKwh > 0
    ? parseFloat((((kwhBulanIni - prev.usageKwh) / prev.usageKwh) * 100).toFixed(1))
    : 0;

  let statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros" | "Belum Ada Data" = "Aman";
  if (!hasElectricityData) {
    statusPemakaian = "Belum Ada Data";
  } else if (energyScore < 60) {
    statusPemakaian = "Boros";
  } else if (energyScore < 80) {
    statusPemakaian = "Perlu Perhatian";
  }

  const ringkasan = {
    tagihanBulanLalu,
    prediksiBulanIni,
    kwhBulanIni,
    potensiHemat,
    energyScore: Math.round(energyScore),
    statusPemakaian,
    kenaikanVsMingguLalu: Math.abs(kenaikanPersen),
    hasAnomaly,
    anomalyDesc,
    businessName: business.name,
    hasElectricityData,
    isFirstMonthOnly,
    hasTrendComparison,
  };

  console.log("Ringkasan built successfully:", ringkasan);

  // Clean up
  await db.business.delete({ where: { id: tempBusiness.id } });
  console.log("Cleaned up temp business.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
