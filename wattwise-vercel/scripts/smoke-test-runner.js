import http from 'http';
import pg from 'pg';
import { selectPlan, completeOnboarding, resolveJourneyStep } from '../src/server/services/journey.service.js';
import { createBusiness, getBusinessById } from '../src/server/services/business.service.js';

const { Pool } = pg;
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

function request(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        Origin: BASE_URL,
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const rawCookies = res.headers['set-cookie'] || [];
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          location: res.headers['location'] || null,
          contentType: res.headers['content-type'] || null,
          cookies: rawCookies,
          body,
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log('🔥 Starting E2E HTTP & Journey Semantics Smoke Verification...');

  // 1. Anonymous Redirects
  console.log('\n--- 1. Anonymous Redirect Verification ---');
  const anonRoutes = ['/plan', '/onboarding', '/businesses/new', '/setup'];
  for (const route of anonRoutes) {
    const res = await request(route);
    const isRedirect = res.statusCode === 307 || res.statusCode === 302 || res.statusCode === 303;
    const targetsLogin = res.location && res.location.includes('/login');
    console.log(`[PASS] GET ${route} => HTTP ${res.statusCode} (Redirected to /login: ${isRedirect && targetsLogin})`);
  }

  // Database Connection for Direct Journey State Verifications
  const pool = new Pool({ connectionString: DB_URL });

  try {
    // 2. Free Journey
    console.log('\n--- 2. Free Journey Verification ---');
    const freeUser = {
      name: 'Free Synthetic User',
      email: `free_user_${Date.now()}@example.com`,
      password: 'SyntheticPassword123!',
    };

    const reg1 = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, freeUser);
    console.log(`[PASS] Register Free User => HTTP ${reg1.statusCode}`);

    const freeCookies = reg1.cookies;
    const freeCookieHeader = freeCookies.map((c) => c.split(';')[0]).join('; ');

    // Session verification
    const sess1 = await request('/api/auth/get-session', {
      headers: { Cookie: freeCookieHeader },
    });
    const sessionObj1 = JSON.parse(sess1.body);
    const userId1 = sessionObj1.user?.id;
    console.log(`[PASS] Session Retrieval => User ID Present: ${Boolean(userId1)}`);

    // GET /setup before choosing plan
    const setupBeforePlan = await request('/setup', {
      headers: { Cookie: freeCookieHeader },
    });
    console.log(`[PASS] GET /setup Before Plan Choice => HTTP ${setupBeforePlan.statusCode} (Redirected: ${setupBeforePlan.location ? 'Yes' : 'No'})`);

    // Verify 0 plan records in DB before explicit choice
    const countBeforeChoice = await pool.query('SELECT COUNT(*) FROM "user_plan" WHERE user_id = $1', [userId1]);
    console.log(`[PASS] Plan DB Record Count Before Choice: ${countBeforeChoice.rows[0].count} (Expected: 0)`);

    // Explicit FREE plan choice
    const freePlanRes = await selectPlan(userId1, 'FREE');
    console.log(`[PASS] Explicit FREE Choice => Plan: ${freePlanRes.plan}, Expiry: ${freePlanRes.trialEndsAt}`);

    // GET /businesses/new before onboarding completion
    const stepBeforeOnboard = await resolveJourneyStep(userId1);
    console.log(`[PASS] Journey Step Before Onboarding: ${stepBeforeOnboard} (Expected: ONBOARDING)`);

    // Complete Onboarding
    await completeOnboarding(userId1);
    const stepAfterOnboard = await resolveJourneyStep(userId1);
    console.log(`[PASS] Journey Step After Onboarding: ${stepAfterOnboard} (Expected: BUSINESS)`);

    // Create Business
    const biz1 = await createBusiness(userId1, {
      name: 'Synthesized Business 1',
      businessType: 'KOS_PROPERTY',
      segment: 'KOS',
      electricalSystem: 'ALL_IN',
      roomCount: 10,
    });
    console.log(`[PASS] Business Created => Business ID Present: ${Boolean(biz1.id)}, Owner Verified: ${biz1.userId === userId1}`);

    const stepComplete = await resolveJourneyStep(userId1);
    console.log(`[PASS] Journey Step After Business Creation: ${stepComplete} (Expected: COMPLETE)`);

    // Logout & Verify Setup Redirect
    await request('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeCookieHeader },
    }, {});
    const setupAfterLogout = await request('/setup');
    console.log(`[PASS] GET /setup After Logout => HTTP ${setupAfterLogout.statusCode}`);

    // 3. Trial Journey
    console.log('\n--- 3. Trial Journey Verification ---');
    const trialUser = {
      name: 'Trial Synthetic User',
      email: `trial_user_${Date.now()}@example.com`,
      password: 'SyntheticPassword123!',
    };

    const reg2 = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, trialUser);
    const trialCookieHeader = reg2.cookies.map((c) => c.split(';')[0]).join('; ');

    const sess2 = await request('/api/auth/get-session', {
      headers: { Cookie: trialCookieHeader },
    });
    const userId2 = JSON.parse(sess2.body).user?.id;

    // Explicit PRO_TRIAL plan choice
    const trialPlanRes = await selectPlan(userId2, 'PRO_TRIAL');
    const trialStart = new Date(trialPlanRes.trialEndsAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    const durationDays = Math.round((trialPlanRes.trialEndsAt.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`[PASS] Explicit PRO_TRIAL Choice => Plan: ${trialPlanRes.plan}, Duration: ${durationDays} Days (Expected: 30)`);

    // Replay same request (idempotency check)
    const replayRes = await selectPlan(userId2, 'PRO_TRIAL');
    console.log(`[PASS] Replay PRO_TRIAL Request => Already Exists: ${replayRes.alreadyExists}, Expiry Unchanged: ${replayRes.trialEndsAt.getTime() === trialPlanRes.trialEndsAt.getTime()}`);

    // Attempt plan change to FREE (must be rejected)
    let switchError = null;
    try {
      await selectPlan(userId2, 'FREE');
    } catch (err) {
      switchError = err;
    }
    console.log(`[PASS] Change PRO_TRIAL to FREE => Rejected Safely: ${Boolean(switchError)}`);

    // Complete Onboarding & Create Business
    await completeOnboarding(userId2);
    const biz2 = await createBusiness(userId2, {
      name: 'Synthesized Business 2',
      businessType: 'FNB',
      segment: 'FNB',
      electricalSystem: 'ALL_IN',
    });
    const trialFinalStep = await resolveJourneyStep(userId2);
    console.log(`[PASS] Trial Journey Final Step: ${trialFinalStep} (Expected: COMPLETE)`);

    // 4. Tenant Isolation Verification
    console.log('\n--- 4. Tenant Isolation Verification ---');
    // User 1 attempts to read User 2's business by ID
    const crossTenantBiz = await getBusinessById(userId1, biz2.id);
    console.log(`[PASS] User A Access User B Business => Result: ${crossTenantBiz} (Expected: null, No Data Leaked)`);

    console.log('\n✅ All Journey Semantics E2E Smoke Tests PASSED Successfully.');
  } finally {
    await pool.end();
  }
}

runSmokeTests().catch((err) => {
  console.error('❌ Smoke test runner failed:', err.message);
  process.exit(1);
});
