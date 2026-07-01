import { PrismaClient, BusinessType, UsageStatus, RiskLevel, RecommendationDifficulty, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean database (order matters for FK constraints)
  await prisma.monthlyReport.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.analysisResult.deleteMany();
  await prisma.appliance.deleteMany();
  await prisma.electricityEntry.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // Demo user
  const user = await prisma.user.create({
    data: {
      email: 'owner@wattwise.id',
      name: 'Budi Santoso',
    },
  });

  // Business 1: Laundry Berkah
  const laundry = await prisma.business.create({
    data: {
      name: 'Laundry Berkah',
      type: BusinessType.LAUNDRY,
      address: 'Jl. Ahmad Yani No. 45, Purwokerto',
      userId: user.id,
    },
  });

  // Business 2: Frozen Jaya Purwokerto
  const frozen = await prisma.business.create({
    data: {
      name: 'Frozen Jaya Purwokerto',
      type: BusinessType.COLD_STORAGE,
      address: 'Jl. Jenderal Soedirman No. 102, Purwokerto',
      userId: user.id,
    },
  });

  // --- Laundry Berkah ---
  await prisma.appliance.createMany({
    data: [
      { name: 'Mesin Cuci Front Load', powerWatt: 1200, quantity: 4, dailyUsageHours: 8, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Mesin Pengering (Dryer)', powerWatt: 2200, quantity: 3, dailyUsageHours: 6, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Setrika Uap Listrik', powerWatt: 1000, quantity: 2, dailyUsageHours: 5, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'AC Ruangan', powerWatt: 750, quantity: 1, dailyUsageHours: 10, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Mesin Cuci Cadangan', powerWatt: 1200, quantity: 1, dailyUsageHours: 0, usageStatus: UsageStatus.INACTIVE, businessId: laundry.id },
    ],
  });

  await prisma.electricityEntry.createMany({
    data: [
      { businessId: laundry.id, month: 3, year: 2026, usageKwh: 450.5, costIdr: 675750 },
      { businessId: laundry.id, month: 4, year: 2026, usageKwh: 520.0, costIdr: 780000 },
      { businessId: laundry.id, month: 5, year: 2026, usageKwh: 610.2, costIdr: 915300 },
    ],
  });

  await prisma.analysisResult.createMany({
    data: [
      { businessId: laundry.id, month: 3, year: 2026, totalUsageKwh: 450.5, totalCostIdr: 675750, avgDailyKwh: 14.53, carbonKg: 351.39, efficiencyScore: 85.0 },
      { businessId: laundry.id, month: 4, year: 2026, totalUsageKwh: 520.0, totalCostIdr: 780000, avgDailyKwh: 17.33, carbonKg: 405.6, efficiencyScore: 78.5 },
      { businessId: laundry.id, month: 5, year: 2026, totalUsageKwh: 610.2, totalCostIdr: 915300, avgDailyKwh: 19.68, carbonKg: 475.96, efficiencyScore: 62.0 },
    ],
  });

  await prisma.anomaly.create({
    data: {
      businessId: laundry.id,
      month: 5,
      year: 2026,
      description: 'Lonjakan konsumsi 17% dibanding April. Kemungkinan motor mesin cuci aus atau setrika boiler beroperasi berlebihan.',
      severity: RiskLevel.MEDIUM,
      usageKwh: 610.2,
      expectedKwh: 535.0,
      isResolved: false,
    },
  });

  await prisma.recommendation.createMany({
    data: [
      {
        businessId: laundry.id,
        title: 'Jadwalkan Setrika Uap di Jam Non-Puncak',
        description: 'Gunakan setrika uap di pagi hari (08:00-11:00) untuk menghindari beban puncak dan menekan biaya listrik.',
        estimatedSavingsIdr: 75000,
        difficulty: RecommendationDifficulty.EASY,
        isImplemented: true,
      },
      {
        businessId: laundry.id,
        title: 'Periksa Motor Mesin Cuci',
        description: 'Motor mesin cuci menarik arus 15% lebih tinggi dari rating normal. Jadwalkan pengecekan dan pelumasan.',
        estimatedSavingsIdr: 120000,
        difficulty: RecommendationDifficulty.MEDIUM,
        isImplemented: false,
      },
    ],
  });

  await prisma.monthlyReport.create({
    data: {
      businessId: laundry.id,
      month: 5,
      year: 2026,
      status: ReportStatus.GENERATED,
      summary: 'Laporan Mei: kenaikan konsumsi listrik signifikan +90.2 kWh. Perlu pengecekan motor mesin cuci.',
    },
  });

  // --- Frozen Jaya Purwokerto ---
  await prisma.appliance.createMany({
    data: [
      { name: 'Walk-in Freezer', powerWatt: 3500, quantity: 1, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Chest Freezer Box', powerWatt: 350, quantity: 6, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'AC Showroom', powerWatt: 1100, quantity: 2, dailyUsageHours: 12, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Lampu LED Toko', powerWatt: 18, quantity: 12, dailyUsageHours: 12, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
    ],
  });

  await prisma.electricityEntry.createMany({
    data: [
      { businessId: frozen.id, month: 3, year: 2026, usageKwh: 3800, costIdr: 5700000 },
      { businessId: frozen.id, month: 4, year: 2026, usageKwh: 3950, costIdr: 5925000 },
      { businessId: frozen.id, month: 5, year: 2026, usageKwh: 4800, costIdr: 7200000 },
    ],
  });

  await prisma.analysisResult.createMany({
    data: [
      { businessId: frozen.id, month: 3, year: 2026, totalUsageKwh: 3800, totalCostIdr: 5700000, avgDailyKwh: 122.58, carbonKg: 2964.0, efficiencyScore: 88.0 },
      { businessId: frozen.id, month: 4, year: 2026, totalUsageKwh: 3950, totalCostIdr: 5925000, avgDailyKwh: 131.67, carbonKg: 3081.0, efficiencyScore: 86.5 },
      { businessId: frozen.id, month: 5, year: 2026, totalUsageKwh: 4800, totalCostIdr: 7200000, avgDailyKwh: 154.84, carbonKg: 3744.0, efficiencyScore: 71.0 },
    ],
  });

  await prisma.anomaly.create({
    data: {
      businessId: frozen.id,
      month: 5,
      year: 2026,
      description: 'Lompatan konsumsi 850 kWh. Penurunan efisiensi kondensor walk-in freezer karena tumpukan debu dan cuaca panas.',
      severity: RiskLevel.HIGH,
      usageKwh: 4800,
      expectedKwh: 4050,
      isResolved: false,
    },
  });

  await prisma.recommendation.createMany({
    data: [
      {
        businessId: frozen.id,
        title: 'Bersihkan Kumparan Kondensor',
        description: 'Pembersihan debu pada kondensor walk-in freezer dapat mengurangi konsumsi hingga 12%.',
        estimatedSavingsIdr: 650000,
        difficulty: RecommendationDifficulty.MEDIUM,
        isImplemented: false,
      },
      {
        businessId: frozen.id,
        title: 'Ganti Strip Curtain Pintu Cold Room',
        description: 'Tirai plastik yang robek membiarkan udara panas masuk. Ganti untuk menjaga suhu ruangan.',
        estimatedSavingsIdr: 300000,
        difficulty: RecommendationDifficulty.EASY,
        isImplemented: false,
      },
    ],
  });

  await prisma.monthlyReport.create({
    data: {
      businessId: frozen.id,
      month: 5,
      year: 2026,
      status: ReportStatus.GENERATED,
      summary: 'Laporan Mei: beban puncak tinggi pada Cold Storage. Segera lakukan perawatan kondensor.',
    },
  });

  console.log('Seed completed: Laundry Berkah + Frozen Jaya Purwokerto');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });