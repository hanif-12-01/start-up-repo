import { PrismaClient, BusinessType, UsageStatus } from "@prisma/client";

const db = new PrismaClient();

export interface OnboardingInput {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
  appliances: {
    name: string;
    powerWatt: number;
    quantity: number;
    dailyUsageHours: number;
  }[];
}

async function simulateCreateOnboardingBusiness(userId: string, input: OnboardingInput) {
  try {
    console.log("Simulating db.business.create...");
    const business = await db.business.create({
      data: {
        name: input.name,
        type: input.type,
        address: input.address,
        powerVA: input.powerVA,
        operatingHours: input.operatingHours,
        userId: userId,
        appliances: {
          create: input.appliances.map((app) => ({
            name: app.name,
            powerWatt: app.powerWatt,
            quantity: app.quantity,
            dailyUsageHours: app.dailyUsageHours,
            usageStatus: UsageStatus.ACTIVE,
          })),
        },
      },
    });

    console.log("Business created successfully in DB:", business);
    return { success: true, businessId: business.id };
  } catch (error: any) {
    console.error("Error creating business:", error);
    return { success: false, error: error.message };
  }
}

async function main() {
  const userId = "be1dc50a-326c-49b7-9149-5565fa950092"; // Budi Santoso's real ID
  const result = await simulateCreateOnboardingBusiness(userId, {
    name: "Toko Baru Budi",
    type: BusinessType.RETAIL,
    address: "Jl. Baru No. 100",
    powerVA: 2200,
    operatingHours: "08:00 - 22:00",
    appliances: [
      {
        name: "Lampu Toko Baru",
        powerWatt: 10,
        quantity: 5,
        dailyUsageHours: 14,
      }
    ]
  });
  console.log("Result:", result);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
