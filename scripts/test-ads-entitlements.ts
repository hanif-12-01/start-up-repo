import { PrismaClient } from "@prisma/client";
import { getEffectivePlan, shouldShowAds } from "../src/lib/ads";

const prisma = new PrismaClient();

async function runTests() {
  console.log("============================================================");
  console.log(" Ad & Entitlement Logic Validation Test");
  console.log("============================================================\n");

  const testCases = [
    { email: "free@wattwise.id", expectedPlan: "FREE", expectedAds: true },
    { email: "trial@wattwise.id", expectedPlan: "PRO", expectedAds: false },
    { email: "pro@wattwise.id", expectedPlan: "PRO", expectedAds: false },
    { email: "business@wattwise.id", expectedPlan: "BUSINESS", expectedAds: false },
    { email: "enterprise@wattwise.id", expectedPlan: "ENTERPRISE", expectedAds: false },
  ];

  let failedCount = 0;

  for (const tc of testCases) {
    const user = await prisma.user.findUnique({
      where: { email: tc.email },
    });

    if (!user) {
      console.error(`[ERROR] User dengan email ${tc.email} tidak ditemukan. Harap jalankan seed terlebih dahulu.`);
      failedCount++;
      continue;
    }

    const effectivePlan = await getEffectivePlan(user.id);
    const showAds = await shouldShowAds(user.id);

    const planPassed = effectivePlan === tc.expectedPlan;
    const adsPassed = showAds === tc.expectedAds;

    if (planPassed && adsPassed) {
      console.log(`[PASS] ${tc.email}: Effective Plan = ${effectivePlan}, Show Ads = ${showAds}`);
    } else {
      console.log(`[FAIL] ${tc.email}:`);
      console.log(`  Expected Plan: ${tc.expectedPlan}, Actual: ${effectivePlan} (${planPassed ? "PASS" : "FAIL"})`);
      console.log(`  Expected Ads: ${tc.expectedAds}, Actual: ${showAds} (${adsPassed ? "PASS" : "FAIL"})`);
      failedCount++;
    }
  }

  // Create temporary test users for Expired and Cancelled subscriptions
  console.log("\nTesting dynamic subscription state transitions...");
  
  const testUserEmail = `temp-test-${Date.now()}@wattwise.id`;
  const tempUser = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: "Temporary Test User",
      password: "test-password-123",
    },
  });

  const proPlan = await prisma.plan.findFirst({
    where: { code: "PRO_UMKM" },
  });

  if (proPlan) {
    // 1. Test ACTIVE state
    const subActive = await prisma.subscription.create({
      data: {
        userId: tempUser.id,
        planId: proPlan.id,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
      },
    });

    const activePlan = await getEffectivePlan(tempUser.id);
    const activeAds = await shouldShowAds(tempUser.id);
    if (activePlan === "PRO" && activeAds === false) {
      console.log("[PASS] Temp User (ACTIVE): Plan = PRO, Show Ads = false");
    } else {
      console.log(`[FAIL] Temp User (ACTIVE): Plan = ${activePlan}, Ads = ${activeAds}`);
      failedCount++;
    }

    // 2. Test EXPIRED state (endsAt in the past)
    await prisma.subscription.update({
      where: { id: subActive.id },
      data: {
        endsAt: new Date(Date.now() - 1000), // expired 1s ago
      },
    });

    const expiredPlan = await getEffectivePlan(tempUser.id);
    const expiredAds = await shouldShowAds(tempUser.id);
    if (expiredPlan === "FREE" && expiredAds === true) {
      console.log("[PASS] Temp User (EXPIRED): Plan = FREE, Show Ads = true");
    } else {
      console.log(`[FAIL] Temp User (EXPIRED): Plan = ${expiredPlan}, Ads = ${expiredAds}`);
      failedCount++;
    }

    // 3. Test CANCELLED state (status = CANCELLED)
    await prisma.subscription.update({
      where: { id: subActive.id },
      data: {
        status: "CANCELLED",
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const cancelledPlan = await getEffectivePlan(tempUser.id);
    const cancelledAds = await shouldShowAds(tempUser.id);
    if (cancelledPlan === "FREE" && cancelledAds === true) {
      console.log("[PASS] Temp User (CANCELLED): Plan = FREE, Show Ads = true");
    } else {
      console.log(`[FAIL] Temp User (CANCELLED): Plan = ${cancelledPlan}, Ads = ${cancelledAds}`);
      failedCount++;
    }
  }

  // Cleanup temporary test user
  await prisma.subscription.deleteMany({ where: { userId: tempUser.id } });
  await prisma.user.delete({ where: { id: tempUser.id } });

  console.log("\n============================================================");
  console.log(` Validation Summary: ${failedCount === 0 ? "SUCCESS" : "FAILED"}`);
  console.log("============================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
