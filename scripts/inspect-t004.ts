// Stub `server-only` before imports
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
import { calculateHistoryStats } from "../src/lib/prediction";

async function main() {
  const biz = await db.business.findFirst({
    where: { name: "PLN_TEST_T004" },
    include: { electricityEntries: { orderBy: [{ year: "desc" }, { month: "desc" }] } }
  });

  if (!biz) {
    console.log("PLN_TEST_T004 not found!");
    return;
  }

  console.log(`Business: ${biz.name} (${biz.id}) type: ${biz.type}`);
  console.log("Entries:", biz.electricityEntries.map(e => `${e.month}/${e.year}: ${e.usageKwh} kWh`));

  const stats = calculateHistoryStats(biz.electricityEntries);
  console.log("Stats calculated:", stats);
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
