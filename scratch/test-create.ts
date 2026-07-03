import { db } from "../src/lib/db";
import { BusinessType, UsageStatus } from "@prisma/client";

async function main() {
  console.log("Simulating business creation...");
  try {
    const business = await db.business.create({
      data: {
        name: "Test Laundry Cabang 3",
        type: BusinessType.LAUNDRY,
        address: "Jl. Test No. 123",
        powerVA: 1300,
        operatingHours: "08:00 - 20:00",
        userId: "5a4e4e39-7ac6-48fe-a4cc-26a6823abed8",
        appliances: {
          create: [
            {
              name: "Mesin Cuci Test",
              powerWatt: 350,
              quantity: 2,
              dailyUsageHours: 8,
              usageStatus: UsageStatus.ACTIVE,
            }
          ],
        },
      },
    });
    console.log("Business created successfully!", business);
  } catch (error) {
    console.error("Error creating business:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
