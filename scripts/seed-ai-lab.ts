// Mock 'server-only' to prevent it from throwing an error in tsx/ts-node
import Module from "module";
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments as any);
};

// Now import the rest dynamically using require to avoid hoisting
const { PrismaClient, BusinessType } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { generatePrediction } = require("../src/services/prediction");

const prisma = new PrismaClient();

async function main() {
  console.log("=== MEMULAI SEEDING AI LAB DEMO SCENARIOS ===");

  // 1. Cari atau buat demo user owner@wattwise.id
  let user = await prisma.user.findUnique({
    where: { email: "owner@wattwise.id" },
  });

  if (!user) {
    console.log("- Membuat user owner@wattwise.id baru...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    user = await prisma.user.create({
      data: {
        email: "owner@wattwise.id",
        name: "Budi Santoso",
        password: hashedPassword,
      },
    });
  } else {
    console.log("- User owner@wattwise.id ditemukan.");
  }

  // Definisikan skenario bisnis
  const scenarios = [
    {
      name: "Warung Pemula AI Demo",
      type: BusinessType.FNB,
      powerVA: 2200,
      operatingHours: "08:00 - 20:00 (12 Jam)",
      expectedMethod: "RULE_BASED",
      entries: [
        { month: 4, year: 2026, usageKwh: 210, costIdr: 310000 },
        { month: 5, year: 2026, usageKwh: 225, costIdr: 330000 },
      ],
    },
    {
      name: "Kedai Kopi AI Demo",
      type: BusinessType.FNB,
      powerVA: 2200,
      operatingHours: "08:00 - 20:00 (12 Jam)",
      expectedMethod: "TABULAR_UMKM_V1",
      entries: [
        { month: 2, year: 2026, usageKwh: 390, costIdr: 570000 },
        { month: 3, year: 2026, usageKwh: 410, costIdr: 600000 },
        { month: 4, year: 2026, usageKwh: 435, costIdr: 635000 },
        { month: 5, year: 2026, usageKwh: 455, costIdr: 665000 },
      ],
    },
    {
      name: "Laundry LSTM AI Demo",
      type: BusinessType.LAUNDRY,
      powerVA: 5500,
      operatingHours: "08:00 - 20:00 (12 Jam)",
      expectedMethod: "LSTM_PROTOTYPE",
      entries: [
        { month: 10, year: 2025, usageKwh: 610, costIdr: 890000 },
        { month: 11, year: 2025, usageKwh: 630, costIdr: 920000 },
        { month: 12, year: 2025, usageKwh: 660, costIdr: 960000 },
        { month: 1, year: 2026, usageKwh: 690, costIdr: 1000000 },
        { month: 2, year: 2026, usageKwh: 720, costIdr: 1045000 },
        { month: 3, year: 2026, usageKwh: 750, costIdr: 1090000 },
        { month: 4, year: 2026, usageKwh: 780, costIdr: 1135000 },
        { month: 5, year: 2026, usageKwh: 810, costIdr: 1180000 },
      ],
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\nProcessing business scenario: ${scenario.name}...`);

    // 2. Upsert business
    let business = await prisma.business.findFirst({
      where: { name: scenario.name, userId: user.id },
    });

    if (business) {
      console.log(`- Bisnis ${scenario.name} sudah ada. Memperbarui profil...`);
      business = await prisma.business.update({
        where: { id: business.id },
        data: {
          type: scenario.type,
          powerVA: scenario.powerVA,
          operatingHours: scenario.operatingHours,
        },
      });
    } else {
      console.log(`- Membuat bisnis ${scenario.name} baru...`);
      business = await prisma.business.create({
        data: {
          name: scenario.name,
          type: scenario.type,
          powerVA: scenario.powerVA,
          operatingHours: scenario.operatingHours,
          userId: user.id,
        },
      });
    }

    // 3. Pastikan membership terbuat
    const membership = await prisma.businessMembership.findFirst({
      where: { businessId: business.id, userId: user.id },
    });

    if (!membership) {
      console.log(`- Membuat membership owner untuk ${scenario.name}...`);
      await prisma.businessMembership.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: "BUSINESS_OWNER",
          status: "ACTIVE",
        },
      });
    }

    // 4. Bersihkan data listrik lama untuk bisnis ini
    console.log(`- Menghapus entri listrik & prediksi lama untuk ${scenario.name}...`);
    await prisma.predictionResult.deleteMany({
      where: { businessId: business.id },
    });
    await prisma.electricityEntry.deleteMany({
      where: { businessId: business.id },
    });

    // 5. Masukkan entri listrik baru
    console.log(`- Memasukkan ${scenario.entries.length} data pemakaian listrik historis...`);
    for (const entry of scenario.entries) {
      await prisma.electricityEntry.create({
        data: {
          businessId: business.id,
          month: entry.month,
          year: entry.year,
          usageKwh: entry.usageKwh,
          costIdr: entry.costIdr,
        },
      });
    }

    // 6. Jalankan generatePrediction secara riil
    console.log(`- Menjalankan generatePrediction untuk Mei 2026...`);
    const prediction = await generatePrediction({
      businessId: business.id,
      month: 5,
      year: 2026,
      userId: user.id,
    });

    if (!prediction) {
      throw new Error(`Gagal menghasilkan prediksi untuk bisnis ${scenario.name}`);
    }

    console.log(`- Prediksi berhasil dihasilkan.`);
    console.log(`  * Metode Terpilih: ${prediction.method}`);
    console.log(`  * Estimasi Tagihan: Rp ${prediction.predictedCostIdr.toLocaleString("id-ID")}`);
    console.log(`  * Prediksi Pemakaian: ${prediction.predictedUsageKwh} kWh`);

    // 7. Validasi asersi metode model
    if (prediction.method !== scenario.expectedMethod) {
      console.error(`[ERR] Mismatch pada bisnis: ${scenario.name}`);
      console.error(`  - Data historis: ${scenario.entries.length} bulan`);
      console.error(`  - Metode aktual: ${prediction.method}`);
      console.error(`  - Metode yang diharapkan: ${scenario.expectedMethod}`);
      throw new Error(`Model routing mismatch untuk ${scenario.name}`);
    } else {
      console.log(`[OK] Asersi sukses! Metode terpilih '${prediction.method}' sesuai skenario.`);
    }
  }

  console.log("\n=== SEEDING & PREDIKSI AI LAB BERHASIL SELESAI ===");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seeding AI Lab:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
