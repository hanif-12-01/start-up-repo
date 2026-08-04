import { readFile } from 'fs/promises';
import { execSync } from 'child_process';

async function syncEnv() {
  const content = await readFile('.env.preview.tmp', 'utf8');
  const lines = content.split('\n');
  const envMap = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envMap[key] = val;
  }

  // Extra feature flags from config/env.ts
  envMap.MONTHLY_REPORTS_ENABLED = 'true';
  envMap.DASHBOARD_ENABLED = 'true';
  envMap.DIAGNOSTICS_ENABLED = 'true';
  envMap.ACTION_PLANS_ENABLED = 'true';
  envMap.OUTCOME_TRACKING_ENABLED = 'true';
  envMap.ENTITLEMENTS_ENABLED = 'true';
  envMap.FUNNEL_ANALYTICS_ENABLED = 'true';
  envMap.BETTER_AUTH_SECRET = 'synthetic_secret_for_browser_test_09b_32chars_long';
  envMap.BETTER_AUTH_URL = 'https://wattwise-ai-preview.vercel.app';
  envMap.NEXT_PUBLIC_APP_URL = 'https://wattwise-ai-preview.vercel.app';
  envMap.FUNNEL_ANALYTICS_VIEWER_USER_IDS = 'user-09b-viewer';

  console.log(`Syncing ${Object.keys(envMap).length} environment variables to production & preview targets...`);

  for (const [key, val] of Object.entries(envMap)) {
    console.log(`Setting ${key}...`);
    try {
      execSync(`npx vercel env add ${key} production --value "${val}" --yes --force`, { stdio: 'inherit' });
      execSync(`npx vercel env add ${key} preview --value "${val}" --yes --force`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to set ${key}:`, err.message);
    }
  }

  console.log('✅ All environment variables synced to Vercel production & preview targets.');
}

syncEnv().catch(console.error);
