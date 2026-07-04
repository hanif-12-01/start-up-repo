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

async function main() {
  console.log("=== VERIFYING PREDICTION RESULTS IN DB ===");

  const predictions = await db.predictionResult.findMany({
    include: {
      business: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  console.log(`Found ${predictions.length} prediction results:`);
  for (const pred of predictions) {
    console.log("-----------------------------------------");
    console.log(`Business Name      : ${pred.business.name}`);
    console.log(`Business ID        : ${pred.businessId}`);
    console.log(`Period             : ${pred.month}/${pred.year} (Predicted for ${pred.predictedForMonth}/${pred.predictedForYear})`);
    console.log(`Method             : ${pred.method}`);
    console.log(`Model Version      : ${pred.modelVersion}`);
    console.log(`Predicted Usage    : ${pred.predictedUsageKwh} kWh`);
    console.log(`Predicted Cost     : Rp ${pred.predictedCostIdr.toLocaleString("id-ID")}`);
    console.log(`Trend              : ${pred.trendDirection} (${pred.trendPercent}%)`);
    console.log(`Confidence Level   : ${pred.confidenceLevel}`);
    console.log(`Confidence Reason  : ${pred.confidenceReason}`);
    console.log(`Explanation        : ${pred.explanation}`);
    console.log(`Disclaimer         : ${pred.disclaimer}`);
    console.log(`Created At         : ${pred.createdAt.toISOString()}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
