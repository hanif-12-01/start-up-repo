import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database...");
  const users = await prisma.user.findMany({
    include: {
      businesses: true,
    },
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));

  const plans = await prisma.plan.findMany();
  console.log("Plans in DB:", JSON.stringify(plans, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
