import { PrismaClient, BusinessType, UsageStatus, RiskLevel, RecommendationDifficulty, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.adClick.deleteMany();
  await prisma.adImpression.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.subscription.deleteMany();

  await prisma.payment.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.authAttempt.deleteMany();
  await prisma.notification.deleteMany();
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
      description: 'Untuk user baru dan edukasi pasar',
      priceIdr: 0,
      billingCycle: 'monthly',
      features: [
        '1 bisnis/properti',
        'Input listrik manual',
        'Input pendapatan bulanan',
        'Prediksi kWh dasar',
        'Estimasi tagihan dasar',
        'Rasio listrik terhadap pendapatan',
        'Rekomendasi AI terbatas',
        'Histori 1–3 bulan',
      ],
    },
  });

  const trialPlan = await prisma.plan.create({
    data: {
      code: 'PRO_TRIAL',
      name: 'Pro Trial',
      description: 'Akses uji coba fitur premium Pro selama 30 hari',
      priceIdr: 0,
      billingCycle: 'monthly',
      features: [
        'Uji coba gratis 30 hari',
        'Sampai 3 bisnis/properti',
        'Semua fitur Pro terbuka',
        'Anomaly detection & AI',
        'Rekomendasi AI detail',
        'Laporan PDF bulanan',
      ],
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      code: 'PRO_UMKM',
      name: 'Pro',
      description: 'Untuk UMKM/kos yang serius',
      priceIdr: 149000,
      billingCycle: 'monthly',
      features: [
        'Sampai 3 bisnis/properti',
        'Semua fitur analitik',
        'Anomaly detection',
        'Rekomendasi detail',
        'Laporan PDF',
        'Histori 12 bulan',
        'Potensi penghematan rupiah',
        'Reminder input data',
        'Simulasi IoT/demo',
      ],
    },
  });

  const businessPlan = await prisma.plan.create({
    data: {
      code: 'BUSINESS',
      name: 'Business',
      description: 'Untuk multi-properti/multi-cabang',
      priceIdr: 449000,
      billingCycle: 'monthly',
      features: [
        'Sampai 50 bisnis/properti',
        'Semua fitur Pro',
        'Dashboard agregat',
        'Laporan per lokasi',
        'Multi-user/admin',
        'Export massal',
        'Prioritas support',
        'Fitur komparasi antar lokasi',
      ],
    },
  });

  const enterprisePlan = await prisma.plan.create({
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
      memberships: {
        create: {
          userId: user.id,
          role: 'BUSINESS_OWNER',
          status: 'ACTIVE',
        }
      }
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
      memberships: {
        create: {
          userId: user.id,
          role: 'BUSINESS_OWNER',
          status: 'ACTIVE',
        }
      }
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
      planId: businessPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // 1. FREE USER: free@wattwise.id
  const freeUser = await prisma.user.create({
    data: {
      email: 'free@wattwise.id',
      name: 'Hendra Wijaya (Free)',
      password: hashedPassword,
    },
  });
  await prisma.subscription.create({
    data: {
      userId: freeUser.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  const freeBiz = await prisma.business.create({
    data: {
      name: 'Kopi Seduh UMKM',
      type: BusinessType.FNB,
      address: 'Jl. Melati No. 12, Purwokerto',
      powerVA: 2200,
      operatingHours: '10:00 - 22:00',
      userId: freeUser.id,
      memberships: {
        create: { userId: freeUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });
  await prisma.appliance.createMany({
    data: [
      { name: 'Mesin Espresso', powerWatt: 1200, quantity: 1, dailyUsageHours: 6, businessId: freeBiz.id },
      { name: 'Kulkas Showcase', powerWatt: 180, quantity: 1, dailyUsageHours: 24, businessId: freeBiz.id },
      { name: 'Lampu LED Toko', powerWatt: 15, quantity: 8, dailyUsageHours: 12, businessId: freeBiz.id }
    ]
  });
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: freeBiz.id, month: 4, year: 2026, usageKwh: 180.2, costIdr: 261290 },
      { businessId: freeBiz.id, month: 5, year: 2026, usageKwh: 195.5, costIdr: 283475 }
    ]
  });
  await prisma.analysisResult.create({
    data: {
      businessId: freeBiz.id, month: 5, year: 2026, totalUsageKwh: 195.5, totalCostIdr: 283475, efficiencyScore: 78.0
    }
  });

  // 2. TRIAL USER: trial@wattwise.id
  const trialUser = await prisma.user.create({
    data: {
      email: 'trial@wattwise.id',
      name: 'Adi Saputra (Trial)',
      password: hashedPassword,
    },
  });
  await prisma.subscription.create({
    data: {
      userId: trialUser.id,
      planId: trialPlan.id,
      status: 'TRIAL_ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  
  // Business 1 (6+ months history to trigger LSTM)
  const trialBiz1 = await prisma.business.create({
    data: {
      name: 'Pangkas Rambut Rapi',
      type: BusinessType.RETAIL,
      address: 'Jl. Sudirman No. 12',
      powerVA: 3500,
      userId: trialUser.id,
      memberships: {
        create: { userId: trialUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });
  await prisma.appliance.createMany({
    data: [
      { name: 'Hair Dryer', powerWatt: 800, quantity: 2, dailyUsageHours: 4, businessId: trialBiz1.id },
      { name: 'AC 1 PK', powerWatt: 750, quantity: 1, dailyUsageHours: 10, businessId: trialBiz1.id },
      { name: 'Lampu LED', powerWatt: 10, quantity: 10, dailyUsageHours: 12, businessId: trialBiz1.id }
    ]
  });
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: trialBiz1.id, month: 12, year: 2025, usageKwh: 340.5, costIdr: 493725 },
      { businessId: trialBiz1.id, month: 1, year: 2026, usageKwh: 355.2, costIdr: 515040 },
      { businessId: trialBiz1.id, month: 2, year: 2026, usageKwh: 330.0, costIdr: 478500 },
      { businessId: trialBiz1.id, month: 3, year: 2026, usageKwh: 360.4, costIdr: 522580 },
      { businessId: trialBiz1.id, month: 4, year: 2026, usageKwh: 380.0, costIdr: 551000 },
      { businessId: trialBiz1.id, month: 5, year: 2026, usageKwh: 450.5, costIdr: 653225 }
    ]
  });
  await prisma.analysisResult.create({
    data: {
      businessId: trialBiz1.id, month: 5, year: 2026, totalUsageKwh: 450.5, totalCostIdr: 653225, efficiencyScore: 65.0
    }
  });
  await prisma.anomaly.create({
    data: {
      businessId: trialBiz1.id, month: 5, year: 2026, description: 'Beban AC naik 20% karena filter tersumbat debu.', severity: RiskLevel.MEDIUM, usageKwh: 450.5, expectedKwh: 400.0, isResolved: false
    }
  });
  await prisma.recommendation.create({
    data: {
      businessId: trialBiz1.id, title: 'Bersihkan AC Berkala', description: 'Bersihkan filter AC untuk menghemat listrik.', estimatedSavingsIdr: 50000, difficulty: RecommendationDifficulty.EASY, isImplemented: false
    }
  });

  // Business 2 (4 months history to trigger Gradient Boosting)
  const trialBiz2 = await prisma.business.create({
    data: {
      name: 'Martabak Legenda',
      type: BusinessType.FNB,
      address: 'Jl. Merdeka No. 44',
      powerVA: 2200,
      userId: trialUser.id,
      memberships: {
        create: { userId: trialUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });
  await prisma.appliance.createMany({
    data: [
      { name: 'Kulkas Bahan', powerWatt: 200, quantity: 1, dailyUsageHours: 24, businessId: trialBiz2.id },
      { name: 'Mixer Adonan', powerWatt: 400, quantity: 1, dailyUsageHours: 2, businessId: trialBiz2.id }
    ]
  });
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: trialBiz2.id, month: 2, year: 2026, usageKwh: 155.0, costIdr: 224750 },
      { businessId: trialBiz2.id, month: 3, year: 2026, usageKwh: 162.4, costIdr: 235480 },
      { businessId: trialBiz2.id, month: 4, year: 2026, usageKwh: 170.0, costIdr: 246500 },
      { businessId: trialBiz2.id, month: 5, year: 2026, usageKwh: 185.5, costIdr: 268975 }
    ]
  });
  await prisma.analysisResult.create({
    data: {
      businessId: trialBiz2.id, month: 5, year: 2026, totalUsageKwh: 185.5, totalCostIdr: 268975, efficiencyScore: 82.0
    }
  });

  // Business 3 (2 months history)
  const trialBiz3 = await prisma.business.create({
    data: {
      name: 'Laundry Kilat',
      type: BusinessType.LAUNDRY,
      address: 'Jl. Gatsu No. 5',
      powerVA: 3500,
      userId: trialUser.id,
      memberships: {
        create: { userId: trialUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });
  await prisma.appliance.createMany({
    data: [
      { name: 'Mesin Cuci Standard', powerWatt: 1000, quantity: 1, dailyUsageHours: 5, businessId: trialBiz3.id }
    ]
  });
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: trialBiz3.id, month: 4, year: 2026, usageKwh: 140.0, costIdr: 203000 },
      { businessId: trialBiz3.id, month: 5, year: 2026, usageKwh: 152.0, costIdr: 220400 }
    ]
  });
  await prisma.analysisResult.create({
    data: {
      businessId: trialBiz3.id, month: 5, year: 2026, totalUsageKwh: 152.0, totalCostIdr: 220400, efficiencyScore: 88.0
    }
  });

  // 3. PRO USER: pro@wattwise.id
  const proUser = await prisma.user.create({
    data: {
      email: 'pro@wattwise.id',
      name: 'Siti Aminah (Pro)',
      password: hashedPassword,
    },
  });
  await prisma.subscription.create({
    data: {
      userId: proUser.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  const proBiz = await prisma.business.create({
    data: {
      name: 'Resto Padang Selera',
      type: BusinessType.FNB,
      address: 'Jl. Pahlawan No. 9',
      powerVA: 5500,
      userId: proUser.id,
      memberships: {
        create: { userId: proUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });
  await prisma.appliance.createMany({
    data: [
      { name: 'Magic Com Besar', powerWatt: 1000, quantity: 2, dailyUsageHours: 8, businessId: proBiz.id },
      { name: 'Kulkas Penyimpanan', powerWatt: 250, quantity: 2, dailyUsageHours: 24, businessId: proBiz.id }
    ]
  });
  await prisma.electricityEntry.createMany({
    data: [
      { businessId: proBiz.id, month: 12, year: 2025, usageKwh: 520.0, costIdr: 754000 },
      { businessId: proBiz.id, month: 1, year: 2026, usageKwh: 545.2, costIdr: 790540 },
      { businessId: proBiz.id, month: 2, year: 2026, usageKwh: 510.0, costIdr: 739500 },
      { businessId: proBiz.id, month: 3, year: 2026, usageKwh: 530.4, costIdr: 769080 },
      { businessId: proBiz.id, month: 4, year: 2026, usageKwh: 550.0, costIdr: 797500 },
      { businessId: proBiz.id, month: 5, year: 2026, usageKwh: 580.5, costIdr: 841725 }
    ]
  });
  await prisma.analysisResult.create({
    data: {
      businessId: proBiz.id, month: 5, year: 2026, totalUsageKwh: 580.5, totalCostIdr: 841725, efficiencyScore: 76.0
    }
  });

  // 4. ENTERPRISE USER: enterprise@wattwise.id
  // === BUSINESS USER: business@wattwise.id ===
  const businessUser = await prisma.user.create({
    data: {
      email: 'business@wattwise.id',
      name: 'Budi Santoso (Business)',
      password: hashedPassword,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: businessUser.id,
      planId: businessPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Duplicate businesses for business@wattwise.id
  const laundry2 = await prisma.business.create({
    data: {
      name: 'Laundry Berkah Cabang Timur',
      type: BusinessType.LAUNDRY,
      address: 'Jl. Ahmad Yani No. 120, Purwokerto',
      powerVA: 5500,
      operatingHours: '08:00 - 20:00 (12 Jam)',
      userId: businessUser.id,
      memberships: {
        create: { userId: businessUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });

  const frozen2 = await prisma.business.create({
    data: {
      name: 'Frozen Jaya Cabang Baturaden',
      type: BusinessType.COLD_STORAGE,
      address: 'Jl. Raya Baturaden No. 8, Baturaden',
      powerVA: 11000,
      operatingHours: '24 Jam Non-Stop',
      userId: businessUser.id,
      memberships: {
        create: { userId: businessUser.id, role: 'BUSINESS_OWNER', status: 'ACTIVE' }
      }
    },
  });

  // Add appliances and bills to Business demo account
  await prisma.appliance.createMany({
    data: [
      { name: 'Mesin Cuci Front Load', powerWatt: 1200, quantity: 2, dailyUsageHours: 8, usageStatus: UsageStatus.ACTIVE, businessId: laundry2.id },
      { name: 'Mesin Pengering', powerWatt: 2200, quantity: 1, dailyUsageHours: 6, usageStatus: UsageStatus.ACTIVE, businessId: laundry2.id },
      { name: 'Walk-in Freezer', powerWatt: 3800, quantity: 1, dailyUsageHours: 24, usageStatus: UsageStatus.ACTIVE, businessId: frozen2.id }
    ]
  });

  await prisma.electricityEntry.createMany({
    data: [
      { businessId: laundry2.id, month: 4, year: 2026, usageKwh: 450.0, costIdr: 652500 },
      { businessId: laundry2.id, month: 5, year: 2026, usageKwh: 480.0, costIdr: 696000 },
      { businessId: frozen2.id, month: 4, year: 2026, usageKwh: 2800.0, costIdr: 4060000 },
      { businessId: frozen2.id, month: 5, year: 2026, usageKwh: 2950.0, costIdr: 4277500 }
    ]
  });

  await prisma.analysisResult.createMany({
    data: [
      { businessId: laundry2.id, month: 5, year: 2026, totalUsageKwh: 480.0, totalCostIdr: 696000, efficiencyScore: 82.0 },
      { businessId: frozen2.id, month: 5, year: 2026, totalUsageKwh: 2950.0, totalCostIdr: 4277500, efficiencyScore: 78.5 }
    ]
  });

  // === ENTERPRISE USER: enterprise@wattwise.id ===
  const enterpriseUser = await prisma.user.create({
    data: {
      email: 'enterprise@wattwise.id',
      name: 'Rudi Hermawan (Enterprise)',
      password: hashedPassword,
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

  // Helper to seed varied data for Enterprise locations
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

  // Seed 10 locations for enterprise@wattwise.id
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
  
  // Seed Ad Campaigns
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await prisma.adCampaign.createMany({
    data: [
      {
        title: "Solusi Panel Surya untuk Ritel & F&B",
        description: "Hemat tagihan listrik hingga 40% dengan sistem solar panel pintar. Khusus UMKM, dapatkan cicilan 0%!",
        targetUrl: "https://www.google.com/search?q=solar+panel+umkm",
        placement: "dashboard_bottom",
        targetSegment: "UMKM",
        isActive: true,
        startDate: oneMonthAgo,
        endDate: oneYearLater,
      },
      {
        title: "Asuransi Properti Kos & Ruko Syariah",
        description: "Lindungi bangunan kos dan ruko Anda dari korsleting listrik, kebakaran, dan banjir. Premi mulai Rp 50rb/bulan.",
        targetUrl: "https://www.google.com/search?q=asuransi+kos",
        placement: "report_preview",
        targetSegment: "KOS",
        isActive: true,
        startDate: oneMonthAgo,
        endDate: oneYearLater,
      },
      {
        title: "Dapatkan WattWise Pro - Hemat 30% Tagihan",
        description: "Aktifkan analisis LSTM dan deteksi anomali real-time sekarang juga. Dapatkan garansi penghematan tagihan listrik!",
        targetUrl: "/dashboard/harga-paket",
        placement: "recommendation_bottom",
        targetSegment: "ALL",
        isActive: true,
        startDate: oneMonthAgo,
        endDate: oneYearLater,
      },
      {
        title: "Promo Smart Gateway IoT Phase 3",
        description: "Instalasi smart power meter gateway untuk monitoring konsumsi listrik otomatis per kamar. Diskon pemasangan 20%.",
        targetUrl: "https://www.google.com/search?q=smart+meter+iot",
        placement: "pricing_page",
        targetSegment: "ALL",
        isActive: true,
        startDate: oneMonthAgo,
        endDate: oneYearLater,
      },
    ],
  });

  console.log('Seed completed: Laundry Berkah + Frozen Jaya Purwokerto + Plans + Demo Accounts + Ads (MSME Demo Ready)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });