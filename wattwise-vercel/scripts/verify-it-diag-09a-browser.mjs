import { spawn, execFileSync, execSync } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const CONTAINER_NAME = 'wattwise-disposable-postgres';
const NETWORK_NAME = 'wattwise-test-network-09a';
const PG_PORT = '5439';
const DB_NAME = 'wattwise_test';
const DB_USER = 'wattwise_test_user';
const DB_PASS = 'synthetic_test_password_01b';
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${PG_PORT}/${DB_NAME}`;

const APP_PORT = 3001;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const CDP_PORT = 9222;
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = resolve('..', 'docs', 'evidence', 'it-diag-09a');
const PROFILE_DIR = resolve('..', '.tmp-it-diag-09a-chrome');
const NEXT_CLI = resolve('node_modules', 'next', 'dist', 'bin', 'next');
const REQUIRED_EVIDENCE_FILES = [
  'dashboard-360x800.png',
  'dashboard-768x1024.png',
  'dashboard-1280x900.png',
  'monthly-report-print.png',
  'analytics-viewer.png',
  'product-browser-evidence.json',
];

const USERS = {
  owner: {
    userId: 'user-09a-owner',
    email: 'it-diag-09a-owner@example.test',
    name: 'Synthetic Owner User',
    sessionToken: 'token-09a-owner-session',
  },
  free: {
    userId: 'user-09a-free',
    email: 'it-diag-09a-free@example.test',
    name: 'Synthetic Free User',
    sessionToken: 'token-09a-free-session',
  },
  analyticsViewer: {
    userId: 'user-09a-analytics-viewer',
    email: 'it-diag-09a-analytics-viewer@example.test',
    name: 'Synthetic Analytics Viewer',
    sessionToken: 'token-09a-viewer-session',
  },
  nonViewer: {
    userId: 'user-09a-nonviewer',
    email: 'it-diag-09a-nonviewer@example.test',
    name: 'Synthetic Non Viewer',
    sessionToken: 'token-09a-nonviewer-session',
  },
};

let pool = null;
let nextProcess = null;
let chromeProcess = null;
let startedContainer = false;
let startedNetwork = false;
let cleanupCompleted = false;
let runEvidenceDir = null;

function applicationEnv(viewerUserId = '') {
  return {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(APP_PORT),
    DATABASE_URL,
    BETTER_AUTH_SECRET: 'synthetic_secret_for_browser_test_09a_32chars_long',
    BETTER_AUTH_URL: APP_URL,
    NEXT_PUBLIC_APP_URL: APP_URL,
    DASHBOARD_ENABLED: 'true',
    MONTHLY_REPORTS_ENABLED: 'true',
    DIAGNOSTICS_ENABLED: 'true',
    ACTION_PLANS_ENABLED: 'true',
    OUTCOME_TRACKING_ENABLED: 'true',
    SEGMENT_TEMPLATES_ENABLED: 'true',
    ENTITLEMENTS_ENABLED: 'true',
    FUNNEL_ANALYTICS_ENABLED: 'true',
    FUNNEL_ANALYTICS_VIEWER_USER_IDS: viewerUserId,
  };
}

async function waitFor(url, predicate, retries = 180, interval = 500) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (await predicate(response)) return response;
    } catch {}
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function buildProductionApplication(viewerUserId) {
  console.log('Building a fresh Next.js production bundle with Node', process.version);
  execFileSync(process.execPath, [NEXT_CLI, 'build'], {
    cwd: process.cwd(),
    env: applicationEnv(viewerUserId),
    stdio: 'inherit',
  });
}

async function setupPostgres() {
  console.log('🚀 Starting disposable PostgreSQL 16 container...');
  try { execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' }); } catch {}
  try { execSync(`docker network rm ${NETWORK_NAME}`, { stdio: 'ignore' }); } catch {}

  execSync(`docker network create ${NETWORK_NAME}`, { stdio: 'ignore' });
  startedNetwork = true;

  execSync(
    `docker run -d --name ${CONTAINER_NAME} --network ${NETWORK_NAME} -p ${PG_PORT}:5432 -e POSTGRES_USER=${DB_USER} -e POSTGRES_PASSWORD=${DB_PASS} -e POSTGRES_DB=${DB_NAME} postgres:16-alpine`,
    { stdio: 'inherit' }
  );
  startedContainer = true;

  pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2000 });
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await pool.query('SELECT 1;');
      if (res) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
  console.log('✅ PostgreSQL container ready.');
}

async function applyMigrations() {
  console.log('📦 Applying Drizzle migrations...');
  const directory = resolve('drizzle', 'migrations');
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  for (const name of names) {
    const sqlContent = await readFile(join(directory, name), 'utf8');
    await pool.query(sqlContent);
  }
  console.log(`✅ ${names.length} migrations applied successfully.`);
  return names;
}

async function seedData() {
  console.log('🌱 Seeding synthetic domain users & sessions directly...');

  for (const u of Object.values(USERS)) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (id) DO UPDATE SET name = $2, email = $3`,
      [u.userId, u.name, u.email]
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO "session" (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET expires_at = $4`,
      [`sess-${u.userId}`, u.userId, u.sessionToken, expiresAt]
    );
  }

  // 1. Owner Plan: PRO_TRIAL
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-owner-09a', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now())
     ON CONFLICT (user_id) DO UPDATE SET plan = 'PRO_TRIAL', trial_starts_at = now(), trial_ends_at = now() + interval '30 days', onboarding_completed_at = now()`,
    [USERS.owner.userId]
  );

  // Owner Businesses
  const ownerBusinesses = [
    ['biz-09a-laundry', 'Laundry Tanpa Tagihan', 'LAUNDRY'],
    ['biz-09a-fnb', 'Dapur Cek Kenaikan', 'FNB'],
    ['biz-09a-closed', 'Bengkel Sesi Selesai', 'OTHER'],
  ];
  for (let i = 0; i < ownerBusinesses.length; i++) {
    const [id, name, segment] = ownerBusinesses[i];
    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active, created_at)
       VALUES ($1, $2, $3, 'OTHER', $4, 'ALL_IN', true, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, USERS.owner.userId, name, segment, `2026-01-0${i + 1}T00:00:00Z`]
    );
  }

  // Bills for owner businesses
  for (const [bizId] of ownerBusinesses) {
    await pool.query(
      `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, created_at, updated_at)
       VALUES
         ($1, $3, '2026-07-01', '2026-07-31', 2900000, 290.000, 1500.00, '2026-08-01', '2026-08-01'),
         ($2, $3, '2026-08-01', '2026-08-31', 3200000, 320.000, 1500.00, '2026-09-01', '2026-09-01')
       ON CONFLICT (id) DO NOTHING`,
      [`${bizId}-prev`, `${bizId}-curr`, bizId]
    );
  }

  // Questionnaire session (COLLECTING_CONTEXT) for biz-09a-laundry
  await pool.query(
    `INSERT INTO diagnostic_session (
       id, business_id, electricity_bill_id, comparison_bill_id, segment_code, status, rule_version, created_at
     ) VALUES ('session-09a-questionnaire', 'biz-09a-laundry', 'biz-09a-laundry-curr', 'biz-09a-laundry-prev', 'LAUNDRY', 'COLLECTING_CONTEXT', 'RULE_V1', '2026-09-01T00:00:00Z')
     ON CONFLICT (id) DO NOTHING`
  );

  // Session, Candidate, Inspection, Action, Outcome for biz-09a-fnb & biz-09a-closed
  const sessionConfigs = [
    ['biz-09a-fnb', 'session-09a-fnb', 'INSPECTION_IN_PROGRESS'],
    ['biz-09a-closed', 'session-09a-closed', 'CLOSED'],
  ];

  for (const [bizId, sessionId, status] of sessionConfigs) {
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id, segment_code, status, rule_version, questionnaire_completed_at, closed_at, created_at
       ) VALUES ($1, $2, $3, $4, 'FNB', $5, 'RULE_V1', now(), CASE WHEN $5 = 'CLOSED' THEN now() ELSE NULL END, '2026-09-01T00:00:00Z')
       ON CONFLICT (id) DO NOTHING`,
      [sessionId, bizId, `${bizId}-curr`, `${bizId}-prev`, status]
    );

    const candidateId = `cand-09a-${bizId}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version, candidate_type, rule_version, title, rank, internal_score, evidence_level, explanation, supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'SPECIAL_ACTIVITY', 1, 'OPERATIONAL', 'CAND_RULE_V1', 'Jadwal operasional berubah', 1, 90, 'MODERATE', 'Aktivitas terpantau meningkat.', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [candidateId, sessionId]
    );

    const inspectionId = `insp-09a-${bizId}`;
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code, inspection_version, rule_version, title, status, result_code, started_at, completed_at
       ) VALUES ($1, $2, $3, 'SPECIAL_ACTIVITY_REVIEW', 1, 'INSP_RULE_V1', 'Pemeriksaan operasional', 'COMPLETED', 'FOUND', '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z')
       ON CONFLICT (id) DO NOTHING`,
      [inspectionId, bizId, candidateId]
    );

    const actionId = `act-09a-${bizId}`;
    const baselineJson = JSON.stringify({
      sourceBillId: `${bizId}-curr`,
      comparisonBillId: `${bizId}-prev`,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      inclusiveDays: 31,
      totalCostRupiah: '3200000',
      costPerDayRupiah: '103226',
      totalKwhMilliKwh: '320000',
      kwhPerDayMilliKwh: '10323',
      tariffRupiahPerKwh: '1500.00',
      comparisonPeriodStart: '2026-07-01',
      comparisonPeriodEnd: '2026-07-31',
      comparisonInclusiveDays: 31,
      comparisonTotalCostRupiah: '2900000',
      comparisonCostPerDayRupiah: '93548',
      comparisonTotalKwhMilliKwh: '290000',
      comparisonKwhPerDayMilliKwh: '9355',
      candidateCode: 'SPECIAL_ACTIVITY',
      candidateVersion: 1,
      inspectionCode: 'SPECIAL_ACTIVITY_REVIEW',
      inspectionVersion: 1,
      inspectionResultCode: 'FOUND',
      capturedAt: '2026-09-01T01:00:00.000Z',
    });

    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code, action_version, rule_version, title_snapshot, description_snapshot, reason_snapshot, steps_snapshot_json, inspection_result_snapshot, baseline_snapshot_json, status, review_mode, planned_start_date, started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'LOG_SPECIAL_ACTIVITY', 1, 'ACT_RULE_V1', 'Rencana Catat Operasional', 'Catat jadwal peralatan listrik.', 'Hasil pengamatan.', '["Langkah 1"]'::jsonb, 'FOUND', $5::jsonb, $6, 'NEXT_ELIGIBLE_BILL', '2026-09-02', '2026-09-02T00:00:00Z', CASE WHEN $6 = 'COMPLETED' THEN '2026-09-30T00:00:00Z'::timestamptz ELSE NULL END)
       ON CONFLICT (id) DO NOTHING`,
      [actionId, bizId, candidateId, inspectionId, baselineJson, status === 'CLOSED' ? 'COMPLETED' : 'IN_PROGRESS']
    );

    if (status === 'CLOSED') {
      const followUpBillId = `${bizId}-follow-up`;
      await pool.query(
        `INSERT INTO electricity_bill (
           id, business_id, period_start, period_end, total_amount_rupiah,
           kwh, tariff_rupiah_per_kwh, created_at, updated_at
         ) VALUES (
           $1, $2, '2026-10-01', '2026-10-31', 2800000,
           280.000, 1500.00, '2026-11-01', '2026-11-01'
         ) ON CONFLICT (id) DO NOTHING`,
        [followUpBillId, bizId]
      );

      const baselineSnapshot = JSON.parse(baselineJson);
      const followUpSnapshot = {
        billId: followUpBillId,
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        inclusiveDays: 31,
        totalCostRupiah: '2800000',
        costPerDay: { numerator: '2800000', denominatorDays: '31' },
        totalKwhMilliKwh: '280000',
        kwhPerDay: { numerator: '280000', denominatorDays: '31' },
        tariffRupiahPerKwh: '1500.00',
        capturedAt: '2026-11-01T00:00:00.000Z',
      };
      const comparisonSnapshot = {
        baselineNormalizedCost: { numerator: '3200000', denominatorDays: '31' },
        followUpNormalizedCost: { numerator: '2800000', denominatorDays: '31' },
        costDeltaBps: '-1250',
        costDirection: 'LOWER',
        baselineNormalizedUsage: { numerator: '320000', denominatorDays: '31' },
        followUpNormalizedUsage: { numerator: '280000', denominatorDays: '31' },
        usageDeltaBps: '-1250',
        usageDirection: 'LOWER',
        baselineTariffRupiahPerKwh: '1500.00',
        followUpTariffRupiahPerKwh: '1500.00',
        tariffDeltaBps: '0',
        tariffDirection: 'SIMILAR',
        dataQualityCode: 'USAGE_COMPLETE',
        overallOutcomeCode: 'POSITIVE_SIGNAL',
        similarityBandBps: '500',
      };
      const explanationSnapshot = {
        title: 'Ada sinyal perbaikan',
        paragraphs: [
          'Data periode evaluasi tercatat lebih rendah dibandingkan kondisi sebelum tindakan.',
          'Perubahan ini tidak membuktikan bahwa tindakan merupakan satu-satunya penyebab.',
        ],
        disclaimer: 'Evaluasi membandingkan data sebelum dan sesudah tindakan tanpa menetapkan sebab.',
      };

      await pool.query(
        `INSERT INTO action_outcome_evaluation (
           id, business_id, diagnostic_session_id, action_plan_id,
           baseline_bill_id, follow_up_bill_id, rule_version,
           similarity_band_bps, evaluation_eligible_after_date,
           baseline_snapshot_json, follow_up_snapshot_json,
           comparison_snapshot_json, cost_direction, usage_direction,
           tariff_direction, data_quality_code, overall_outcome_code,
           explanation_snapshot_json, evaluated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'OUTCOME_EVALUATION_RULE_V1',
           500, '2026-09-30', $7::jsonb, $8::jsonb, $9::jsonb,
           'LOWER', 'LOWER', 'SIMILAR', 'USAGE_COMPLETE',
           'POSITIVE_SIGNAL', $10::jsonb, '2026-11-01T00:00:00Z'
         ) ON CONFLICT (id) DO NOTHING`,
        [
          `outcome-09a-${bizId}`,
          bizId,
          sessionId,
          actionId,
          `${bizId}-curr`,
          followUpBillId,
          JSON.stringify(baselineSnapshot),
          JSON.stringify(followUpSnapshot),
          JSON.stringify(comparisonSnapshot),
          JSON.stringify(explanationSnapshot),
        ]
      );
    }
  }

  // 2. Free User Plan: FREE
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-free-09a', $1, 'FREE', NULL, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET plan = 'FREE', trial_starts_at = NULL, trial_ends_at = NULL, onboarding_completed_at = now()`,
    [USERS.free.userId]
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
     VALUES ('biz-09a-free-1', $1, 'Toko Sembako Hemat', 'OTHER', 'RETAIL', 'ALL_IN', true)
     ON CONFLICT (id) DO NOTHING`,
    [USERS.free.userId]
  );
  await pool.query(
    `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh)
     VALUES
       ('bill-free-prev', 'biz-09a-free-1', '2026-07-01', '2026-07-31', 1500000, 150.000, 1500.00),
       ('bill-free-curr', 'biz-09a-free-1', '2026-08-01', '2026-08-31', 1600000, 160.000, 1500.00)
     ON CONFLICT (id) DO NOTHING`
  );

  // 3. Analytics Viewer Plan: PRO_TRIAL
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-viewer-09a', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now())
     ON CONFLICT (user_id) DO UPDATE SET plan = 'PRO_TRIAL', trial_starts_at = now(), trial_ends_at = now() + interval '30 days', onboarding_completed_at = now()`,
    [USERS.analyticsViewer.userId]
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
     VALUES ('biz-09a-viewer-1', $1, 'Usaha Analytics Viewer', 'OTHER', 'FNB', 'ALL_IN', true)
     ON CONFLICT (id) DO NOTHING`,
    [USERS.analyticsViewer.userId]
  );

  // 4. Non-Viewer Plan: PRO_TRIAL
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-nonviewer-09a', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now())
     ON CONFLICT (user_id) DO UPDATE SET plan = 'PRO_TRIAL', trial_starts_at = now(), trial_ends_at = now() + interval '30 days', onboarding_completed_at = now()`,
    [USERS.nonViewer.userId]
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
     VALUES ('biz-09a-nonviewer-1', $1, 'Usaha Non-Viewer', 'OTHER', 'RETAIL', 'ALL_IN', true)
     ON CONFLICT (id) DO NOTHING`,
    [USERS.nonViewer.userId]
  );

  console.log('✅ Synthetic domain users, sessions, and data seeded successfully.');
}

function spawnNextServer(viewerUserId = '') {
  return spawn(process.execPath, [NEXT_CLI, 'start', '-p', String(APP_PORT)], {
    env: applicationEnv(viewerUserId),
    cwd: process.cwd(),
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

class CdpClient {
  constructor(webSocketUrl) {
    this.ws = new WebSocket(webSocketUrl);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result);
        return;
      }
      for (const listener of this.listeners.get(msg.method) || []) listener(msg.params);
    });
  }

  on(method, listener) {
    const list = this.listeners.get(method) || [];
    list.push(listener);
    this.listeners.set(method, list);
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function waitForDocument(cdp, expectedText = '') {
  let lastValue = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `({ ready: document.readyState, text: document.body?.innerText || '', url: location.href })`,
      returnByValue: true,
    });
    lastValue = result.result?.value;
    if (lastValue?.ready === 'complete') {
      if (!expectedText || lastValue?.text?.includes(expectedText)) {
        return lastValue;
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Document did not reach the expected state for ${expectedText || 'page'}; ` +
      `last URL was ${lastValue?.url || 'unknown'}`
  );
}

async function runProductBrowserRegression() {
  console.log('🌐 Starting Chrome CDP browser regression test runner...');
  try { await rm(PROFILE_DIR, { recursive: true, force: true }); } catch {}

  chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await waitFor(
    `http://127.0.0.1:${CDP_PORT}/json/version`,
    (response) => response.status === 200,
    120,
    250
  );
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
  const pageTarget = targets.find(
    (target) => target.type === 'page' && target.url === 'about:blank'
  );
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('Chrome did not expose the disposable about:blank page target');
  }
  const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await cdp.open();

  const consoleErrors = [];
  const cspViolations = [];
  const networkFailures = [];
  const http5xxErrors = [];
  const documentResponses = [];
  const documentRedirects = [];

  cdp.on('Runtime.consoleAPICalled', (event) => {
    const text = event.args.map((arg) => arg.value || arg.description || '').join(' ');
    if (event.type === 'error') {
      consoleErrors.push(text);
    }
    if (/content security policy|csp/i.test(text)) {
      cspViolations.push(text);
    }
  });

  cdp.on('Runtime.exceptionThrown', (event) => {
    consoleErrors.push(event.exceptionDetails.text);
  });

  cdp.on('Network.responseReceived', (event) => {
    if (event.type === 'Document') {
      documentResponses.push({
        status: event.response.status,
        url: event.response.url,
      });
    }
    if (event.response.status >= 500) {
      http5xxErrors.push(`${event.response.status} ${event.response.url}`);
    }
  });

  cdp.on('Network.requestWillBeSent', (event) => {
    if (event.type === 'Document' && event.redirectResponse) {
      documentRedirects.push({
        status: event.redirectResponse.status,
        from: event.redirectResponse.url,
        to: event.request.url,
      });
    }
  });

  cdp.on('Network.loadingFailed', (event) => {
    if (!(event.canceled && event.errorText === 'net::ERR_ABORTED')) {
      networkFailures.push(event.errorText);
    }
  });

  cdp.on('Log.entryAdded', (event) => {
    const text = event.entry?.text || '';
    if (/content security policy|violat(?:e|ion).*csp/i.test(text)) {
      cspViolations.push(text);
    }
  });

  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
    cdp.send('Log.enable'),
  ]);

  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });

  async function setSessionUser(userConfig) {
    const cookieResult = await cdp.send('Network.setCookie', {
      name: 'wattwise.session_token',
      value: userConfig.sessionToken,
      url: APP_URL,
      httpOnly: true,
      sameSite: 'Lax',
    });
    if (!cookieResult.success) throw new Error(`Failed to set session cookie for ${userConfig.email}`);
  }

  function redactRoute(path) {
    return path
      .replace(/businessId=[^&]+/g, 'businessId=[REDACTED]')
      .replace(/session-09a-[^/?&]+/g, '[SESSION]')
      .replace(/insp-09a-[^/?&]+/g, '[INSPECTION]')
      .replace(/act-09a-[^/?&]+/g, '[ACTION]');
  }

  async function inspectInitialResponse(path, userConfig) {
    const headers = userConfig
      ? { cookie: `wattwise.session_token=${userConfig.sessionToken}` }
      : {};
    const response = await fetch(`${APP_URL}${path}`, {
      headers,
      redirect: 'manual',
    });
    const locationHeader = response.headers.get('location');
    return {
      status: response.status,
      location: locationHeader
        ? new URL(locationHeader, APP_URL).pathname
        : null,
    };
  }

  async function visitFlow({
    code,
    flowName,
    path,
    evidenceRoute = redactRoute(path),
    userConfig,
    expectedText,
    expectedStatus = 200,
    expectedFinalStatus = expectedStatus,
    expectedFinalPath = new URL(path, APP_URL).pathname,
    expectedRedirectPath = null,
    viewport = { width: 1280, height: 900 },
    screenshotFilename = null,
    emulatePrint = false,
    verifyAnalyticsPrivacy = false,
  }) {
    console.log(`  -> Flow [${code}]: ${flowName} (${evidenceRoute})...`);
    const initialResponse = await inspectInitialResponse(path, userConfig);
    const allowedInitialStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!allowedInitialStatuses.includes(initialResponse.status)) {
      throw new Error(
        `${code}: expected initial HTTP ${allowedInitialStatuses.join('/')} but received ${initialResponse.status}`
      );
    }
    if (expectedRedirectPath && initialResponse.location !== expectedRedirectPath) {
      throw new Error(
        `${code}: expected redirect to ${expectedRedirectPath} but received ${initialResponse.location || 'none'}`
      );
    }

    if (userConfig) await setSessionUser(userConfig);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 768,
    });
    await cdp.send('Emulation.setEmulatedMedia', {
      media: emulatePrint ? 'print' : 'screen',
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    const metricStart = {
      console: consoleErrors.length,
      csp: cspViolations.length,
      network: networkFailures.length,
      http5xx: http5xxErrors.length,
      responses: documentResponses.length,
      redirects: documentRedirects.length,
    };

    await cdp.send('Page.navigate', { url: `${APP_URL}${path}` });
    const documentState = await waitForDocument(cdp, expectedText);
    await new Promise((r) => setTimeout(r, 300));

    const flowResponses = documentResponses.slice(metricStart.responses);
    const finalResponse = flowResponses.at(-1);
    if (!finalResponse || finalResponse.status !== expectedFinalStatus) {
      throw new Error(
        `${code}: expected final document HTTP ${expectedFinalStatus} but received ${finalResponse?.status ?? 'none'}`
      );
    }
    const finalPath = new URL(documentState.url).pathname;
    if (finalPath !== expectedFinalPath) {
      throw new Error(`${code}: expected final path ${expectedFinalPath} but reached ${finalPath}`);
    }

    const audit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.documentElement;
        const bodyText = document.body?.innerText || '';
        const nextAction = document.querySelector('[aria-labelledby="next-action-title"]');
        const primaryCta = nextAction?.querySelector('a[href], button') || document.querySelector('main a[href], main button');
        if (primaryCta instanceof HTMLElement) primaryCta.focus();
        const ctaRect = primaryCta?.getBoundingClientRect();
        const focusStyle = primaryCta ? getComputedStyle(primaryCta) : null;
        const selector = document.querySelector('select[name="businessId"]');
        const selectorRect = selector?.getBoundingClientRect();
        const printHiddenNodes = [...document.querySelectorAll('.report-print-hide')];
        const reportRoot = document.querySelector('.report-print-root');
        const forbiddenAnalyticsValues = ${JSON.stringify([
          ...Object.values(USERS).flatMap((user) => [user.userId, user.email, user.sessionToken]),
          'biz-09a-laundry',
          'biz-09a-fnb',
          'biz-09a-closed',
          'biz-09a-free-1',
          'biz-09a-viewer-1',
          'biz-09a-nonviewer-1',
        ])};
        return {
          pathname: location.pathname,
          horizontalOverflow: root.scrollWidth > innerWidth,
          hasContent: bodyText.trim().length > 0,
          contentLength: bodyText.length,
          expectedContentVisible: bodyText.includes(${JSON.stringify(expectedText)}),
          primaryCtaVisible: !ctaRect || (ctaRect.left >= 0 && ctaRect.right <= innerWidth && ctaRect.width > 0),
          businessSelectorReadable: !selectorRect || (selectorRect.width >= 160 && selectorRect.left >= 0 && selectorRect.right <= innerWidth),
          nativeVerticalScrolling: root.scrollHeight > innerHeight && getComputedStyle(root).overflowY !== 'hidden',
          visibleKeyboardFocus: !primaryCta || (
            document.activeElement === primaryCta &&
            ((focusStyle?.outlineStyle !== 'none' && parseFloat(focusStyle?.outlineWidth || '0') > 0) || focusStyle?.boxShadow !== 'none')
          ),
          reducedMotionMatched: matchMedia('(prefers-reduced-motion: reduce)').matches,
          runningAnimationCount: document.getAnimations().filter((animation) => animation.playState === 'running').length,
          printContentVisible: !reportRoot || getComputedStyle(reportRoot).display !== 'none',
          printControlsHidden: printHiddenNodes.length === 0 || printHiddenNodes.every((node) => getComputedStyle(node).display === 'none'),
          analyticsHasForbiddenValue: forbiddenAnalyticsValues.some((value) => bodyText.includes(value)),
          analyticsSuppressionVisible: bodyText.includes('Privasi Data Segmen Diaktifkan'),
        };
      })()`,
      returnByValue: true,
    });
    const auditValue = audit.result.value;
    if (!auditValue.expectedContentVisible || !auditValue.hasContent) {
      throw new Error(`${code}: expected content was not visible`);
    }
    if (emulatePrint && (!auditValue.printContentVisible || !auditValue.printControlsHidden || auditValue.contentLength < 200)) {
      throw new Error(`${code}: print output was blank or interactive controls remained visible`);
    }
    if (verifyAnalyticsPrivacy && (auditValue.analyticsHasForbiddenValue || !auditValue.analyticsSuppressionVisible)) {
      throw new Error(`${code}: analytics privacy or segment suppression assertion failed`);
    }

    const perFlowCounts = {
      consoleErrors: consoleErrors.length - metricStart.console,
      cspViolations: cspViolations.length - metricStart.csp,
      failedNetworkRequests: networkFailures.length - metricStart.network,
      unexpected5xx: http5xxErrors.length - metricStart.http5xx,
    };
    if (Object.values(perFlowCounts).some((count) => count !== 0)) {
      throw new Error(`${code}: browser diagnostics were not clean: ${JSON.stringify(perFlowCounts)}`);
    }

    let screenshot = null;
    if (screenshotFilename) {
      const capture = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: emulatePrint,
      });
      screenshot = screenshotFilename;
      await writeFile(join(runEvidenceDir, screenshotFilename), Buffer.from(capture.data, 'base64'));
    }

    return {
      code,
      flowName,
      route: evidenceRoute,
      status: initialResponse.status,
      expected: `HTTP ${allowedInitialStatuses.join('/')} and visible content: ${expectedText}`,
      actual: `Initial HTTP ${initialResponse.status}; final HTTP ${finalResponse.status}; final route ${finalPath}; expected content visible`,
      result: 'PASS',
      screenshot,
      redirects: [
        ...(initialResponse.location ? [`${initialResponse.status} -> ${initialResponse.location}`] : []),
        ...documentRedirects.slice(metricStart.redirects).map((redirect) => {
          const from = new URL(redirect.from).pathname;
          const to = new URL(redirect.to).pathname;
          return `${redirect.status} ${from} -> ${to}`;
        }),
      ],
      ...perFlowCounts,
      audit: auditValue,
    };
  }

  const flows = [];

  // Flow 1: LOGIN
  flows.push(await visitFlow({
    code: 'LOGIN',
    flowName: 'login',
    path: '/login',
    userConfig: null,
    expectedText: 'Masuk ke akun WattWise Anda.',
  }));

  // Flow 2: DASHBOARD
  flows.push(await visitFlow({
    code: 'DASHBOARD',
    flowName: 'dashboard',
    path: '/dashboard?businessId=biz-09a-laundry',
    userConfig: USERS.owner,
    expectedText: 'Laundry Tanpa Tagihan',
  }));

  // Flow 3: BUSINESS_SELECTOR
  flows.push(await visitFlow({
    code: 'BUSINESS_SELECTOR',
    flowName: 'business selector',
    path: '/dashboard?businessId=biz-09a-fnb',
    userConfig: USERS.owner,
    expectedText: 'Dapur Cek Kenaikan',
  }));

  // Flow 4: BILL_INPUT
  flows.push(await visitFlow({
    code: 'BILL_INPUT',
    flowName: 'bill input',
    path: '/bills/new?businessId=biz-09a-laundry',
    userConfig: USERS.owner,
    expectedText: 'Masukkan tagihan listrik',
  }));

  // Flow 5: BILL_COMPARISON
  flows.push(await visitFlow({
    code: 'BILL_COMPARISON',
    flowName: 'bill comparison',
    path: '/bills?businessId=biz-09a-laundry',
    userConfig: USERS.owner,
    expectedText: 'Tagihan listrik',
  }));

  // Flow 6: DIAGNOSTIC_QUESTIONNAIRE
  flows.push(await visitFlow({
    code: 'DIAGNOSTIC_QUESTIONNAIRE',
    flowName: 'diagnostic questionnaire',
    path: '/diagnostics/session-09a-questionnaire',
    userConfig: USERS.owner,
    expectedText: 'Kumpulkan konteks periode',
  }));

  // Flow 7: CANDIDATE_RESULT
  flows.push(await visitFlow({
    code: 'CANDIDATE_RESULT',
    flowName: 'candidate result',
    path: '/diagnostics/session-09a-fnb/results',
    userConfig: USERS.owner,
    expectedText: 'Bagian yang perlu dicek',
  }));

  // Flow 8: GUIDED_INSPECTION
  flows.push(await visitFlow({
    code: 'GUIDED_INSPECTION',
    flowName: 'guided inspection',
    path: '/diagnostics/session-09a-fnb/inspections/insp-09a-biz-09a-fnb',
    userConfig: USERS.owner,
    expectedText: 'Pemeriksaan operasional',
  }));

  // Flow 9: ACTION_PLAN
  flows.push(await visitFlow({
    code: 'ACTION_PLAN',
    flowName: 'Rencana Hemat',
    path: '/diagnostics/session-09a-fnb/actions/act-09a-biz-09a-fnb',
    userConfig: USERS.owner,
    expectedText: 'Rencana Catat Operasional',
  }));

  // Flow 10: OUTCOME_EVALUATION
  flows.push(await visitFlow({
    code: 'OUTCOME_EVALUATION',
    flowName: 'outcome evaluation',
    path: '/diagnostics/session-09a-closed/actions/act-09a-biz-09a-closed/outcome',
    userConfig: USERS.owner,
    expectedText: 'Arah Perubahan',
  }));

  // Flow 11: SESSION_CLOSURE
  flows.push(await visitFlow({
    code: 'SESSION_CLOSURE',
    flowName: 'session closure',
    path: '/diagnostics/session-09a-closed/actions/act-09a-biz-09a-closed/outcome',
    userConfig: USERS.owner,
    expectedText: 'Sesi Cek Kenaikan Selesai',
  }));

  // Flow 12: MONTHLY_REPORT
  flows.push(await visitFlow({
    code: 'MONTHLY_REPORT',
    flowName: 'monthly report',
    path: '/reports/monthly?businessId=biz-09a-laundry',
    userConfig: USERS.owner,
    expectedText: 'Laporan Listrik Usaha',
  }));

  // Flow 13: MONTHLY_REPORT_PRINT
  flows.push(await visitFlow({
    code: 'MONTHLY_REPORT_PRINT',
    flowName: 'monthly report print',
    path: '/reports/monthly?businessId=biz-09a-laundry',
    userConfig: USERS.owner,
    expectedText: 'Laporan Listrik Usaha',
    screenshotFilename: 'monthly-report-print.png',
    emulatePrint: true,
  }));

  // Flow 14: BUSINESS_LIMIT_DENIAL
  flows.push(await visitFlow({
    code: 'BUSINESS_LIMIT_DENIAL',
    flowName: 'business limit entitlement denial',
    path: '/businesses/new',
    userConfig: USERS.free,
    expectedText: 'Toko Sembako Hemat',
    expectedStatus: [303, 307, 308],
    expectedFinalStatus: 200,
    expectedFinalPath: '/dashboard',
    expectedRedirectPath: '/dashboard',
  }));

  // Flow 15: REPORT_HISTORY_DENIAL
  flows.push(await visitFlow({
    code: 'REPORT_HISTORY_DENIAL',
    flowName: 'report history entitlement denial',
    path: '/reports/monthly?businessId=biz-09a-free-1&month=2025-01',
    userConfig: USERS.free,
    expectedStatus: 404,
    expectedText: '404',
  }));

  // Flow 16: ANALYTICS_VIEWER
  flows.push(await visitFlow({
    code: 'ANALYTICS_VIEWER',
    flowName: 'internal analytics allowlisted viewer',
    path: '/internal/analytics/funnel?segment=LAUNDRY',
    userConfig: USERS.analyticsViewer,
    expectedText: 'Privasi Data Segmen Diaktifkan',
    screenshotFilename: 'analytics-viewer.png',
    verifyAnalyticsPrivacy: true,
  }));

  // Flow 17: ANALYTICS_NON_VIEWER
  flows.push(await visitFlow({
    code: 'ANALYTICS_NON_VIEWER',
    flowName: 'internal analytics non-viewer safe not-found',
    path: '/internal/analytics/funnel?segment=LAUNDRY',
    userConfig: USERS.nonViewer,
    expectedStatus: 404,
    expectedText: '404',
  }));

  // Flow 18: HEALTH_LIVE
  const liveRes = await fetch(`${APP_URL}/api/health/live`);
  const liveBody = await liveRes.json();
  if (liveRes.status !== 200 || liveBody.status !== 'live') {
    throw new Error(`HEALTH_LIVE failed with HTTP ${liveRes.status}`);
  }
  flows.push({
    code: 'HEALTH_LIVE',
    route: '/api/health/live',
    status: liveRes.status,
    expected: 'HTTP 200 - {"status":"live"}',
    actual: `HTTP ${liveRes.status} and live status confirmed`,
    result: 'PASS',
    screenshot: null,
    redirects: [],
    consoleErrors: 0,
    cspViolations: 0,
    failedNetworkRequests: 0,
    unexpected5xx: 0,
  });

  // Flow 19: HEALTH_READY
  const readyRes = await fetch(`${APP_URL}/api/health/ready`);
  const readyBody = await readyRes.json();
  if (readyRes.status !== 200 || readyBody.status !== 'ready' || readyBody.database !== 'ok') {
    throw new Error(`HEALTH_READY failed with HTTP ${readyRes.status}`);
  }
  flows.push({
    code: 'HEALTH_READY',
    route: '/api/health/ready',
    status: readyRes.status,
    expected: 'HTTP 200 - {"status":"ready","database":"ok"}',
    actual: `HTTP ${readyRes.status}; readiness and database checks confirmed`,
    result: 'PASS',
    screenshot: null,
    redirects: [],
    consoleErrors: 0,
    cspViolations: 0,
    failedNetworkRequests: 0,
    unexpected5xx: 0,
  });

  // SECTION 6: Responsive Verification for authenticated dashboard
  const responsive = [];
  for (const vp of [
    { width: 360, height: 800, filename: 'dashboard-360x800.png' },
    { width: 768, height: 1024, filename: 'dashboard-768x1024.png' },
    { width: 1280, height: 900, filename: 'dashboard-1280x900.png' },
  ]) {
    const item = await visitFlow({
      code: `RESPONSIVE_${vp.width}x${vp.height}`,
      flowName: `responsive dashboard ${vp.width}x${vp.height}`,
      path: '/dashboard?businessId=biz-09a-laundry',
      userConfig: USERS.owner,
      expectedText: 'Laundry Tanpa Tagihan',
      viewport: { width: vp.width, height: vp.height },
      screenshotFilename: vp.filename,
    });
    const responsiveChecks = {
      noHorizontalOverflow: !item.audit.horizontalOverflow,
      primaryCtaNotClipped: item.audit.primaryCtaVisible,
      businessSelectorReadable: item.audit.businessSelectorReadable,
      nativeVerticalScrolling: item.audit.nativeVerticalScrolling,
      visibleKeyboardFocus: item.audit.visibleKeyboardFocus,
      reducedMotionBehavior:
        item.audit.reducedMotionMatched && item.audit.runningAnimationCount === 0,
    };
    if (Object.values(responsiveChecks).some((passed) => !passed)) {
      throw new Error(
        `RESPONSIVE_${vp.width}x${vp.height}: ${JSON.stringify(responsiveChecks)}`
      );
    }
    responsive.push({
      viewport: `${vp.width}x${vp.height}`,
      route: '/dashboard?businessId=[REDACTED]',
      ...responsiveChecks,
      screenshot: vp.filename,
      result: 'PASS',
    });
  }

  cdp.close();
  return {
    flows,
    responsive,
    consoleErrors,
    cspViolations,
    networkFailures,
    http5xxErrors,
  };
}

async function terminateDisposableProcess(child) {
  if (!child || child.exitCode !== null) return;
  const pid = child.pid;
  if (process.platform === 'win32' && pid) {
    try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); } catch {}
  } else {
    try { child.kill('SIGTERM'); } catch {}
  }
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3000)),
  ]);
  if (child.exitCode === null) {
    try { child.kill('SIGKILL'); } catch {}
  }
}

async function removeChromeProfile() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(PROFILE_DIR, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    }
  }
  throw new Error('Chrome profile cleanup failed');
}

async function cleanupResources() {
  if (cleanupCompleted) return;
  await terminateDisposableProcess(chromeProcess);
  chromeProcess = null;
  await terminateDisposableProcess(nextProcess);
  nextProcess = null;
  if (pool) {
    try { await pool.end(); } finally { pool = null; }
  }
  if (startedContainer) {
    try { execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' }); } finally {
      startedContainer = false;
    }
  }
  if (startedNetwork) {
    try { execSync(`docker network rm ${NETWORK_NAME}`, { stdio: 'ignore' }); } finally {
      startedNetwork = false;
    }
  }
  await removeChromeProfile();
  cleanupCompleted = true;
}

async function promoteEvidenceAtomically(evidence) {
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  const forbiddenValues = [
    DATABASE_URL,
    DB_PASS,
    ...Object.values(USERS).flatMap((user) => [
      user.userId,
      user.email,
      user.sessionToken,
    ]),
    'biz-09a-laundry',
    'biz-09a-fnb',
    'biz-09a-closed',
    'biz-09a-free-1',
    'biz-09a-viewer-1',
    'biz-09a-nonviewer-1',
  ];
  if (forbiddenValues.some((value) => serialized.includes(value)) || /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(serialized)) {
    throw new Error('Machine-readable evidence privacy scan failed');
  }

  await writeFile(join(runEvidenceDir, 'product-browser-evidence.json'), serialized);
  for (const name of REQUIRED_EVIDENCE_FILES) {
    const source = join(runEvidenceDir, name);
    const metadata = await stat(source);
    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error(`Evidence file is missing or empty: ${name}`);
    }
  }
  for (const name of REQUIRED_EVIDENCE_FILES) {
    const destination = join(EVIDENCE_DIR, name);
    await rm(destination, { force: true });
    await rename(join(runEvidenceDir, name), destination);
  }
  await rm(runEvidenceDir, { recursive: true, force: true });
  runEvidenceDir = null;
}

async function main() {
  const startedAt = new Date().toISOString();
  await mkdir(EVIDENCE_DIR, { recursive: true });
  runEvidenceDir = join(EVIDENCE_DIR, `.run-${Date.now()}`);
  await mkdir(runEvidenceDir, { recursive: true });
  await setupPostgres();
  const migrationNames = await applyMigrations();
  await seedData();
  buildProductionApplication(USERS.analyticsViewer.userId);

  console.log(`🚀 Launching Next.js server with analytics viewer ID ${USERS.analyticsViewer.userId}...`);
  nextProcess = spawnNextServer(USERS.analyticsViewer.userId);
  nextProcess.stdout?.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`));
  nextProcess.stderr?.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));
  await waitFor(
    `${APP_URL}/api/health/ready`,
    async (response) => {
      if (response.status !== 200) return false;
      const body = await response.json();
      return body.status === 'ready' && body.database === 'ok';
    }
  );
  console.log('✅ Next.js production server ready.');

  // Run Product Browser Regression
  const regression = await runProductBrowserRegression();

  // Verify CSP policy response header on /login
  const loginHeadRes = await fetch(`${APP_URL}/login`);
  const cspHeader = loginHeadRes.headers.get('content-security-policy') || '';
  if (!cspHeader.includes("default-src 'self'")) {
    throw new Error('CSP response header was missing or incomplete');
  }
  if (
    regression.flows.some((flow) => flow.result !== 'PASS') ||
    regression.consoleErrors.length !== 0 ||
    regression.cspViolations.length !== 0 ||
    regression.networkFailures.length !== 0 ||
    regression.http5xxErrors.length !== 0
  ) {
    throw new Error('Browser regression aggregate checks failed');
  }

  await cleanupResources();

  const completedAt = new Date().toISOString();
  const printFlow = regression.flows.find((flow) => flow.code === 'MONTHLY_REPORT_PRINT');
  const analyticsViewerFlow = regression.flows.find((flow) => flow.code === 'ANALYTICS_VIEWER');
  const analyticsNonViewerFlow = regression.flows.find((flow) => flow.code === 'ANALYTICS_NON_VIEWER');

  const jsonEvidence = {
    captureMechanism: 'Chrome CDP (headless mode via Node.js)',
    runtime: 'Fresh Next.js production build and server exercised sequentially through Chrome CDP',
    nodeVersion: process.version,
    databaseRuntime: 'PostgreSQL 16 Alpine disposable container',
    productionStartBehavior: {
      freshBuild: true,
      directNodeProcess: true,
      port: APP_PORT,
      healthyEndpoint: '/api/health/ready',
      healthyBeforeBrowser: true,
    },
    databaseSetup: {
      migrationCount: migrationNames.length,
      seededOnce: true,
      disposable: true,
    },
    overallResult: 'PASS',
    startedAt,
    completedAt,
    consoleErrorCount: regression.consoleErrors.length,
    cspViolationCount: regression.cspViolations.length,
    unexpectedNetworkFailureCount: regression.networkFailures.length,
    unexpected5xxCount: regression.http5xxErrors.length,
    flows: regression.flows.map((f) => ({
      code: f.code,
      route: f.route,
      status: f.status,
      expected: f.expected,
      actual: f.actual,
      result: f.result,
      screenshot: f.screenshot || null,
      redirects: f.redirects,
      consoleErrors: f.consoleErrors,
      cspViolations: f.cspViolations,
      failedNetworkRequests: f.failedNetworkRequests,
      unexpected5xx: f.unexpected5xx,
    })),
    responsive: regression.responsive,
    printVerification: {
      route: '/reports/monthly?businessId=[REDACTED]',
      status: 200,
      mediaEmulated: 'print',
      screenshot: 'monthly-report-print.png',
      reportContentVisible: printFlow?.audit.printContentVisible === true,
      navigationAndControlsHidden: printFlow?.audit.printControlsHidden === true,
      nonBlank: (printFlow?.audit.contentLength || 0) >= 200,
      result: 'PASS',
    },
    analyticsVerification: {
      allowlistedViewer: {
        route: '/internal/analytics/funnel?segment=LAUNDRY',
        status: 200,
        funnelRendered: true,
        piiExposed: analyticsViewerFlow?.audit.analyticsHasForbiddenValue === true,
        rawIdsExposed: analyticsViewerFlow?.audit.analyticsHasForbiddenValue === true,
        segmentSuppressionVisible: analyticsViewerFlow?.audit.analyticsSuppressionVisible === true,
        screenshot: 'analytics-viewer.png',
        result: 'PASS',
      },
      nonViewer: {
        route: '/internal/analytics/funnel?segment=LAUNDRY',
        status: analyticsNonViewerFlow?.status,
        result: 'PASS',
      },
    },
    healthVerification: {
      live: { route: '/api/health/live', status: 200, result: 'PASS' },
      ready: { route: '/api/health/ready', status: 200, result: 'PASS' },
    },
    cleanup: 'PASS',
    cleanupVerification: {
      browserClosed: true,
      applicationStopped: true,
      databaseContainerRemoved: true,
      dockerNetworkRemoved: true,
      chromeProfileRemoved: true,
    },
  };

  await promoteEvidenceAtomically(jsonEvidence);
  console.log('✅ Evidence JSON generated at docs/evidence/it-diag-09a/product-browser-evidence.json');
}

main()
  .catch(async (err) => {
    console.error('❌ Browser regression failed:', err);
    process.exitCode = 1;
    try { await cleanupResources(); } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    if (runEvidenceDir) {
      try { await rm(runEvidenceDir, { recursive: true, force: true }); } catch {}
      runEvidenceDir = null;
    }
  })
  .finally(async () => {
    console.log('🧹 Cleaning up browser, Next.js server, and Docker container...');
    if (chromeProcess) {
      try { chromeProcess.kill(); } catch {}
    }
    if (nextProcess) {
      try { nextProcess.kill(); } catch {}
    }
    if (pool) {
      try { await pool.end(); } catch {}
    }
    if (startedContainer) {
      try { execSync(`docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' }); } catch {}
    }
    if (startedNetwork) {
      try { execSync(`docker network rm ${NETWORK_NAME}`, { stdio: 'ignore' }); } catch {}
    }
    console.log('✅ Cleanup complete.');
  });
