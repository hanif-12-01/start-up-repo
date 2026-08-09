import { resetQaDemoAccount, checkQaDemoAccount, getDemoCredentials } from '../src/server/services/qa-demo-provisioning.service';

async function run() {
  const { email } = getDemoCredentials();
  console.log(`[QA Demo Reset] Resetting QA Demo account to initial deterministic state for: ${email}`);

  try {
    await resetQaDemoAccount();
    console.log(`[QA Demo Reset] SUCCESS: Demo account reset completed for configured QA_DEMO_EMAIL.`);

    const check = await checkQaDemoAccount();
    console.log(`[QA Demo Reset] Readiness Check: ${check.ready ? 'READY' : 'NOT READY'}`);
  } catch (err) {
    console.error(`[QA Demo Reset] ERROR: ${(err as Error).message}`);
    process.exit(1);
  }
}

run();
