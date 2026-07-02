import { PrismaClient, BusinessType, UsageStatus, RiskLevel, RecommendationDifficulty, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.subscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.authAttempt.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.analysisResult.deleteMany();
  await prisma.appliance.deleteMany();
  await prisma.dailyUsage.deleteMany();
  await prisma.electricityEntry.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // Create default Plans
  const freePlan = await prisma.plan.create({
    data: {
      code: 'FREE',
      name: 'Gratis',
      description: 'Paket dasar untuk UMKM pemula',
      priceIdr: 0,
      billingCycle: 'monthly',
      features: ['1 usaha', 'dashboard dasar', 'input data listrik manual', 'rekomendasi dasar'],
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      code: 'PRO_UMKM',
      name: 'Pro UMKM',
      description: 'Fitur lengkap untuk optimasi energi optimal',
      priceIdr: 150000,
      billingCycle: 'monthly',
      features: ['multi-usaha', 'prediksi tagihan', 'appliance efficiency classifier', 'rekomendasi hemat lanjutan', 'laporan PDF'],
    },
  });

  const businessPlan = await prisma.plan.create({
    data: {
      code: 'BUSINESS',
      name: 'Business',
      description: 'Solusi terlengkap skala cabang & prioritas support',
      priceIdr: 450000,
      billingCycle: 'monthly',
      features: ['multi-cabang', 'export CSV', 'laporan bulanan', 'prioritas support', 'fitur pilot lanjutan'],
    },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Demo user (login: owner@wattwise.id / password123)
  const user = await prisma.user.create({
    data: {
      email: 'owner@wattwise.id',
      name: 'Budi Santoso',
      password: hashedPassword,
    },
  });

  // === BUSINESS 1: Laundry Berkah ===
  const laundry = await prisma.business.create({
    data: {
      name: 'Laundry Berkah',
      type: BusinessType.LAUNDRY,
      address: 'Jl. Ahmad Yani No. 45, Purwokerto',
      powerVA: 5500,
      operatingHours: '08:00 - 20:00 (12 Jam)',
      userId: user.id,
    },
  });

  // === BUSINESS 2: Frozen Jaya Purwokerto ===
  const frozen = await prisma.business.create({
    data: {
      name: 'Frozen Jaya Purwokerto',
      type: BusinessType.COLD_STORAGE,
      address: 'Jl. Jenderal Soedirman No. 102, Purwokerto',
      powerVA: 16500,
      operatingHours: '24 Jam Non-Stop',
      userId: user.id,
    },
  });

  // ==========================================
  // LAUNDRY BERKAH
  // ==========================================

  // Appliances
  await prisma.appliance.createMany({
    data: [
      { name: 'Mesin Cuci Front Load A', powerWatt: 1200, quantity: 2, dailyUsageHours: 8, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Mesin Cuci Front Load B', powerWatt: 1500, quantity: 2, dailyUsageHours: 6, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Mesin Pengering (Dryer) Gas+Listrik', powerWatt: 250, quantity: 3, dailyUsageHours: 7, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Setrika Uap Listrik Boiler', powerWatt: 1500, quantity: 2, dailyUsageHours: 5, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'AC Ruangan Lobby', powerWatt: 750, quantity: 1, dailyUsageHours: 10, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
      { name: 'Pompa Air Jetpump', powerWatt: 500, quantity: 1, dailyUsageHours: 4, usageStatus: UsageStatus.ACTIVE, businessId: laundry.id },
    ],
  });

  // 6 Months electricity bills (Dec 2025 - May 2026), ~Rp 1.450/kWh
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: laundry.id, month: 12, year: 2025, usageKwh: 580.5, costIdr: 841725 },
      { businessId: laundry.id, month: 1, year: 2026, usageKwh: 610.2, costIdr: 884790 },
      { businessId: laundry.id, month: 2, year: 2026, usageKwh: 590.0, costIdr: 855500 },
      { businessId: laundry.id, month: 3, year: 2026, usageKwh: 640.4, costIdr: 928580 },
      { businessId: laundry.id, month: 4, year: 2026, usageKwh: 680.0, costIdr: 986000 },
      { businessId: laundry.id, month: 5, year: 2026, usageKwh: 810.5, costIdr: 1175225 },
    ],
  });

  // 14 Days daily usage (May 1-14, 2026) with anomaly spike on May 8-10
  const laundryDaily = [];
  const baseLaundryUsage = 23;
  for (let i = 1; i <= 14; i++) {
    let multiplier = 1.0 + (Math.random() - 0.5) * 0.15;
    if (i >= 8 && i <= 10) multiplier = 1.45; // Anomaly: boiler leak
    const usage = parseFloat((baseLaundryUsage * multiplier).toFixed(2));
    laundryDaily.push({
      businessId: laundry.id,
      date: new Date(2026, 4, i),
      usageKwh: usage,
      costIdr: Math.round(usage * 1450),
    });
  }
  await prisma.dailyUsage.createMany({ data: laundryDaily });

  // Latest analysis (May 2026)
  await prisma.analysisResult.create({
    data: {
      businessId: laundry.id,
      month: 5,
      year: 2026,
      totalUsageKwh: 810.5,
      totalCostIdr: 1175225,
      avgDailyKwh: 26.15,
      carbonKg: 632.19,
      efficiencyScore: 58.4,
    },
  });

  // 5 Anomalies
  await prisma.anomaly.createMany({
    data: [
      {
        businessId: laundry.id, month: 12, year: 2025,
        description: 'Deteksi standby power tinggi pada malam hari (22:00 - 06:00). Terbaca beban statis 350 Watt terus menerus.',
        severity: RiskLevel.LOW, usageKwh: 580.5, expectedKwh: 550.0, isResolved: true,
      },
      {
        businessId: laundry.id, month: 1, year: 2026,
        description: 'Lonjakan beban kejut (surge) sesaat ketika semua mesin cuci dan pengering menyala bersamaan jam 13:00-15:00.',
        severity: RiskLevel.MEDIUM, usageKwh: 610.2, expectedKwh: 570.0, isResolved: true,
      },
      {
        businessId: laundry.id, month: 3, year: 2026,
        description: 'Penggunaan pompa air aktif di luar jam operasional (pukul 23:30). Potensi kebocoran pipa atau keran tidak tertutup.',
        severity: RiskLevel.MEDIUM, usageKwh: 640.4, expectedKwh: 600.0, isResolved: true,
      },
      {
        businessId: laundry.id, month: 5, year: 2026,
        description: 'Lonjakan konsumsi drastis 19% dari bulan lalu. Terdeteksi kebocoran elemen pemanas listrik pada boiler setrika uap.',
        severity: RiskLevel.HIGH, usageKwh: 810.5, expectedKwh: 680.0, isResolved: false,
      },
      {
        businessId: laundry.id, month: 5, year: 2026,
        description: 'Ketidakseimbangan beban fasa terdeteksi pada panel listrik utama. Beban AC lobby melonjak — indikasi filter kotor atau freon bocor.',
        severity: RiskLevel.HIGH, usageKwh: 810.5, expectedKwh: 780.0, isResolved: false,
      },
    ],
  });

  // 5 Recommendations
  await prisma.recommendation.createMany({
    data: [
      {
        businessId: laundry.id,
        title: 'Servis Boiler Setrika Uap',
        description: 'Perbaiki elemen pemanas boiler setrika yang bocor arus. Dapat menghemat biaya listrik bulanan hingga Rp 150.000.',
        estimatedSavingsIdr: 150000, difficulty: RecommendationDifficulty.MEDIUM, isImplemented: false,
      },
      {
        businessId: laundry.id,
        title: 'Atur Shift Penggunaan Mesin Cuci',
        description: 'Hindari menyalakan semua mesin cuci bersamaan dengan dryer. Berikan jeda 10 menit antar mesin untuk menurunkan beban puncak.',
        estimatedSavingsIdr: 85000, difficulty: RecommendationDifficulty.EASY, isImplemented: true,
      },
      {
        businessId: laundry.id,
        title: 'Gunakan Smart Plug untuk Dispenser dan AC',
        description: 'Jadwalkan pemutusan aliran listrik otomatis pada dispenser air dan AC lobby saat toko tutup pukul 20:00.',
        estimatedSavingsIdr: 45000, difficulty: RecommendationDifficulty.EASY, isImplemented: false,
      },
      {
        businessId: laundry.id,
        title: 'Pasang Sensor Otomatis Pompa Air',
        description: 'Gunakan otomatis radar air yang presisi untuk mencegah pompa terus menyala saat tandon air sudah penuh.',
        estimatedSavingsIdr: 60000, difficulty: RecommendationDifficulty.MEDIUM, isImplemented: false,
      },
      {
        businessId: laundry.id,
        title: 'Investasi AC Inverter untuk Ruang Tunggu',
        description: 'Ganti AC standard 1 PK dengan AC Inverter. Konsumsi daya turun hingga 40% setelah suhu ruangan stabil.',
        estimatedSavingsIdr: 110000, difficulty: RecommendationDifficulty.HARD, isImplemented: false,
      },
    ],
  });

  // Monthly report (May 2026)
  await prisma.monthlyReport.create({
    data: {
      businessId: laundry.id, month: 5, year: 2026,
      status: ReportStatus.GENERATED,
      summary: 'Laporan Laundry Berkah (Mei 2026): Total pemakaian 810.5 kWh (+19.2% MoM), tagihan Rp 1.175.225. Anomali kritis: kebocoran elemen boiler setrika uap pada 8-10 Mei. Potensi penghematan Rp 450.000/bulan dengan menerapkan 5 rekomendasi WattWise.',
      pdfUrl: '/reports/laundry-berkah-2026-05.pdf',
    },
  });

  // ==========================================
  // FROZEN JAYA PURWOKERTO
  // ==========================================

  // Appliances
  await prisma.appliance.createMany({
    data: [
      { name: 'Walk-in Freezer Cold Room', powerWatt: 3800, quantity: 1, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Chest Freezer Box Besar', powerWatt: 350, quantity: 4, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Chest Freezer Box Sedang', powerWatt: 220, quantity: 4, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'AC Unit Kantor & Showroom', powerWatt: 1100, quantity: 2, dailyUsageHours: 12, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Lampu LED Penerangan Area', powerWatt: 20, quantity: 15, dailyUsageHours: 14, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
      { name: 'Sistem CCTV & Server Kasir', powerWatt: 300, quantity: 2, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen.id },
    ],
  });

  // 6 Months electricity bills (Dec 2025 - May 2026)
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: frozen.id, month: 12, year: 2025, usageKwh: 4300.0, costIdr: 6235000 },
      { businessId: frozen.id, month: 1, year: 2026, usageKwh: 4420.5, costIdr: 6409725 },
      { businessId: frozen.id, month: 2, year: 2026, usageKwh: 4180.0, costIdr: 6061000 },
      { businessId: frozen.id, month: 3, year: 2026, usageKwh: 4490.8, costIdr: 6511660 },
      { businessId: frozen.id, month: 4, year: 2026, usageKwh: 4620.0, costIdr: 6699000 },
      { businessId: frozen.id, month: 5, year: 2026, usageKwh: 5350.2, costIdr: 7757790 },
    ],
  });

  // 14 Days daily usage (May 1-14, 2026) with anomaly spike on May 4-7
  const frozenDaily = [];
  const baseFrozenUsage = 150;
  for (let i = 1; i <= 14; i++) {
    let multiplier = 1.0 + (Math.random() - 0.5) * 0.08;
    if (i >= 4 && i <= 7) multiplier = 1.35; // Gasket leak days
    const usage = parseFloat((baseFrozenUsage * multiplier).toFixed(2));
    frozenDaily.push({
      businessId: frozen.id,
      date: new Date(2026, 4, i),
      usageKwh: usage,
      costIdr: Math.round(usage * 1450),
    });
  }
  await prisma.dailyUsage.createMany({ data: frozenDaily });

  // Latest analysis (May 2026)
  await prisma.analysisResult.create({
    data: {
      businessId: frozen.id,
      month: 5,
      year: 2026,
      totalUsageKwh: 5350.2,
      totalCostIdr: 7757790,
      avgDailyKwh: 172.59,
      carbonKg: 4173.16,
      efficiencyScore: 68.2,
    },
  });

  // 5 Anomalies
  await prisma.anomaly.createMany({
    data: [
      {
        businessId: frozen.id, month: 12, year: 2025,
        description: 'Kondensor unit cold room tersumbat debu tebal, menyebabkan kompresor bekerja 20% lebih lama untuk mencapai suhu target.',
        severity: RiskLevel.MEDIUM, usageKwh: 4300.0, expectedKwh: 4000.0, isResolved: true,
      },
      {
        businessId: frozen.id, month: 1, year: 2026,
        description: 'Tegangan listrik drop di bawah 200V selama 3 hari berturut-turut, memicu kenaikan arus pada motor kompresor.',
        severity: RiskLevel.HIGH, usageKwh: 4420.5, expectedKwh: 4200.0, isResolved: true,
      },
      {
        businessId: frozen.id, month: 3, year: 2026,
        description: 'Suhu AC showroom diset terlalu rendah (16°C). Menarik daya berlebih dan tidak efisien.',
        severity: RiskLevel.LOW, usageKwh: 4490.8, expectedKwh: 4300.0, isResolved: true,
      },
      {
        businessId: frozen.id, month: 5, year: 2026,
        description: 'Kerusakan karet segel pintu (gasket) Walk-in Freezer. Udara dingin bocor keluar, kompresor aktif 24 jam penuh tanpa siklus istirahat.',
        severity: RiskLevel.HIGH, usageKwh: 5350.2, expectedKwh: 4620.0, isResolved: false,
      },
      {
        businessId: frozen.id, month: 5, year: 2026,
        description: 'Penumpukan bunga es (frosting) tebal pada evaporator cold room. Defrost otomatis tidak berjalan optimal, freon terindikasi rendah.',
        severity: RiskLevel.HIGH, usageKwh: 5350.2, expectedKwh: 5000.0, isResolved: false,
      },
    ],
  });

  // 5 Recommendations
  await prisma.recommendation.createMany({
    data: [
      {
        businessId: frozen.id,
        title: 'Ganti Gasket Pintu Walk-in Freezer',
        description: 'Ganti karet pintu yang telah mengeras dan robek agar kedap udara. Potensi penghematan Rp 450.000/bulan.',
        estimatedSavingsIdr: 450000, difficulty: RecommendationDifficulty.EASY, isImplemented: false,
      },
      {
        businessId: frozen.id,
        title: 'Jadwalkan Pembersihan Kondensor Bulanan',
        description: 'Semprot unit kondensor outdoor dengan air bertekanan sedang sebulan sekali untuk menjaga pelepasan panas tetap optimal.',
        estimatedSavingsIdr: 350000, difficulty: RecommendationDifficulty.MEDIUM, isImplemented: true,
      },
      {
        businessId: frozen.id,
        title: 'Optimalkan Defrost Cycle Controller',
        description: 'Atur ulang jadwal defrost cycle dari 4 kali sehari menjadi 2 kali berdasarkan akumulasi es aktual.',
        estimatedSavingsIdr: 180000, difficulty: RecommendationDifficulty.MEDIUM, isImplemented: false,
      },
      {
        businessId: frozen.id,
        title: 'Instalasi Strip Curtain Tambahan',
        description: 'Pasang tirai plastik fleksibel pada pintu cold storage untuk menghalangi pertukaran udara saat pintu dibuka.',
        estimatedSavingsIdr: 250000, difficulty: RecommendationDifficulty.EASY, isImplemented: false,
      },
      {
        businessId: frozen.id,
        title: 'Pasang Automatic Voltage Stabilizer (AVS)',
        description: 'Gunakan stabilizer kapasitas besar khusus untuk unit cold room guna melindungi kompresor dari fluktuasi tegangan PLN.',
        estimatedSavingsIdr: 200000, difficulty: RecommendationDifficulty.HARD, isImplemented: false,
      },
    ],
  });

  // Monthly report (May 2026)
  await prisma.monthlyReport.create({
    data: {
      businessId: frozen.id, month: 5, year: 2026,
      status: ReportStatus.GENERATED,
      summary: 'Laporan Frozen Jaya (Mei 2026): Konsumsi melonjak ke 5.350,2 kWh (+15.8% MoM), tagihan Rp 7.757.790. Anomali utama: gasket walk-in freezer rusak sejak 4 Mei, kompresor bekerja ekstra keras. Penggantian gasket diestimasikan memotong pemborosan Rp 450.000/bulan.',
      pdfUrl: '/reports/frozen-jaya-2026-05.pdf',
    },
  });

  // Default Subscription for Budi Santoso
  await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('Seed completed: Laundry Berkah + Frozen Jaya Purwokerto + Plans (MSME Demo Ready)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });