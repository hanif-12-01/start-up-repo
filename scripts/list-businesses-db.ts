import { db } from "../src/lib/db";

async function main() {
  const businesses = await db.business.findMany({
    select: { id: true, name: true, type: true }
  });
  console.log(`Found ${businesses.length} businesses:`);
  console.log(businesses);
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
