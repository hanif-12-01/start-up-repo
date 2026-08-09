import { seedQaDemoAccount, checkQaDemoAccount, getDemoCredentials } from '../src/server/services/qa-demo-provisioning.service';

async function run() {
  const { email } = getDemoCredentials();
  console.log(`[QA Demo Seed] Starting QA Demo provisioning for configured email: ${email}`);

  try {
    const res = await seedQaDemoAccount();
    console.log(`[QA Demo Seed] SUCCESS: Demo account provisioned for configured QA_DEMO_EMAIL.`);
    console.log(`[QA Demo Seed] Summary: userId=${res.userId}, businessId=${res.businessId}, bills=${res.billCount}, revenue=${res.revenueCount}, appliances=${res.applianceCount}`);

    const check = await checkQaDemoAccount();
    console.log(`[QA Demo Seed] Readiness Check: ${check.ready ? 'READY' : 'NOT READY'}`);
    if (!check.ready) {
      console.error(`[QA Demo Seed] READINESS CHECK FAILED: ${check.reason || 'unknown reason'}`);
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error(`[QA Demo Seed] ERROR: ${(err as Error).message}`);
    process.exit(1);
  }
}

run();
