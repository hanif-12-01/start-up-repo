import { checkQaDemoAccount } from '../src/server/services/qa-demo-provisioning.service';

async function run() {
  console.log(`[QA Demo Check] Checking QA Demo Account readiness...`);

  try {
    const check = await checkQaDemoAccount();
    console.log(`[QA Demo Check] Status: ${check.ready ? 'READY' : 'NOT READY'}`);
    if (check.reason) {
      console.log(`[QA Demo Check] Reason: ${check.reason}`);
    }
    console.log(`[QA Demo Check] Details:`, JSON.stringify(check.details, null, 2));

    if (!check.ready) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`[QA Demo Check] ERROR: ${(err as Error).message}`);
    process.exit(1);
  }
}

run();
