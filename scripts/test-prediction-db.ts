// Stub `server-only` before imports.
{
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;
}

import { db } from "../src/lib/db";
import { generatePrediction } from "../src/services/prediction";

async function main() {
  console.log("Checking DB connections...");
  const business = await db.business.findFirst({
    include: {
      electricityEntries: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!business) {
    console.log("No business found in database. Please run seed or register a user.");
    return;
  }

  console.log(`Found business: ${business.name} (${business.id})`);
  const latestEntry = business.electricityEntries[0];
  if (!latestEntry) {
    console.log("No electricity entry found for this business.");
    return;
  }

  console.log(`Latest entry: ${latestEntry.month}/${latestEntry.year} - ${latestEntry.usageKwh} kWh`);

  console.log("Generating prediction...");
  const prediction = await generatePrediction({
    businessId: business.id,
    month: latestEntry.month,
    year: latestEntry.year,
    userId: business.userId,
  });

  console.log("Prediction result:");
  console.log(JSON.stringify(prediction, null, 2));

  // Verify that it is saved in the DB
  const saved = await db.predictionResult.findFirst({
    where: {
      businessId: business.id,
      month: latestEntry.month,
      year: latestEntry.year,
    },
  });

  if (saved) {
    console.log("SUCCESS: Prediction result successfully saved to database!");
  } else {
    console.error("ERROR: Prediction result was not saved.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
