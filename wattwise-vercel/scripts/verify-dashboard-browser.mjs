import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const APP_URL = process.env.BROWSER_APP_URL || 'http://127.0.0.1:3107';
const CHROME_PATH =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = Number(process.env.CDP_PORT || '9237');
const EVIDENCE_DIR = resolve('..', 'docs', 'evidence', 'it-diag-07a');
const USER_EMAIL = 'it-diag-07a-browser@example.test';

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });

async function applyMigrations() {
  const directory = resolve('drizzle', 'migrations');
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  for (const name of names) {
    await pool.query(await readFile(join(directory, name), 'utf8'));
  }
  return names;
}

async function waitFor(url, retries = 60) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function registerBrowserUser() {
  const response = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_URL },
    body: JSON.stringify({
      name: 'Browser Evidence IT-DIAG-07A',
      email: USER_EMAIL,
      password: 'Synthetic-browser-password-07A!',
    }),
  });
  if (!response.ok) throw new Error(`Sign-up failed: ${response.status} ${await response.text()}`);
  const setCookie = response.headers.get('set-cookie');
  const cookie = setCookie?.match(/(?:^|,\s*)(wattwise\.session_token)=([^;]+)/);
  if (!cookie) throw new Error(`Session cookie missing from sign-up response: ${setCookie}`);
  const user = await pool.query('SELECT id FROM "user" WHERE email = $1', [USER_EMAIL]);
  if (!user.rows[0]) throw new Error('Registered user missing from local database');
  return { userId: user.rows[0].id, cookieName: cookie[1], cookieValue: cookie[2] };
}

async function signInBrowserUser() {
  const response = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_URL },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: 'Synthetic-browser-password-07A!',
    }),
  });
  if (!response.ok) throw new Error(`Sign-in failed: ${response.status} ${await response.text()}`);
  const setCookie = response.headers.get('set-cookie');
  const cookie = setCookie?.match(/(?:^|,\s*)(wattwise\.session_token)=([^;]+)/);
  if (!cookie) throw new Error('Session cookie missing from sign-in response');
  const user = await pool.query('SELECT id FROM "user" WHERE email = $1', [USER_EMAIL]);
  return { userId: user.rows[0].id, cookieName: cookie[1], cookieValue: cookie[2] };
}

const businessIds = {
  noBill: 'browser-business-no-bill',
  oneBill: 'browser-business-one-bill',
  comparison: 'browser-business-comparison',
  questionnaire: 'browser-business-questionnaire',
  candidate: 'browser-business-candidate',
  inspection: 'browser-business-inspection',
  inspectionCompleted: 'browser-business-inspection-completed',
  plannedAction: 'browser-business-planned-action',
  action: 'browser-business-action',
  waitingEvaluation: 'browser-business-waiting-evaluation',
  eligibleOutcome: 'browser-business-eligible-outcome',
  closureEligible: 'browser-business-closure-eligible',
  closed: 'browser-business-closed',
  outsider: 'browser-business-outsider',
};

const baseline = (currentBillId, previousBillId) => ({
  sourceBillId: currentBillId,
  comparisonBillId: previousBillId,
  periodStart: '2026-02-01',
  periodEnd: '2026-02-28',
  inclusiveDays: 28,
  totalCostRupiah: '3200000',
  costPerDayRupiah: '114286',
  totalKwhMilliKwh: '320000',
  kwhPerDayMilliKwh: '11429',
  tariffRupiahPerKwh: '1500.00',
  comparisonPeriodStart: '2026-01-01',
  comparisonPeriodEnd: '2026-01-31',
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
  capturedAt: '2026-03-02T00:00:00.000Z',
});

async function seedDomain(userId) {
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, onboarding_completed_at)
     VALUES ('browser-plan', $1, 'FREE', now())`,
    [userId]
  );
  const names = [
    [businessIds.noBill, 'Kos Tanpa Tagihan'],
    [businessIds.oneBill, 'Kos Satu Tagihan'],
    [businessIds.comparison, 'Kos Siap Dibandingkan'],
    [businessIds.questionnaire, 'Kos Pertanyaan'],
    [businessIds.candidate, 'Kos Kandidat'],
    [businessIds.inspection, 'Kos Pemeriksaan'],
    [businessIds.inspectionCompleted, 'Kos Pemeriksaan Selesai'],
    [businessIds.plannedAction, 'Kos Rencana Direncanakan'],
    [businessIds.action, 'Kos Rencana Hemat'],
    [businessIds.waitingEvaluation, 'Kos Menunggu Tagihan Evaluasi'],
    [businessIds.eligibleOutcome, 'Kos Siap Evaluasi'],
    [businessIds.closureEligible, 'Kos Siap Ditutup'],
    [businessIds.closed, 'Kos Sesi Selesai'],
  ];
  for (let index = 0; index < names.length; index += 1) {
    const [id, name] = names[index];
    await pool.query(
      `INSERT INTO business (
         id, user_id, name, business_type, segment, electrical_system, created_at
       ) VALUES ($1, $2, $3, 'KOS_PROPERTY', 'KOS', 'ALL_IN', $4)`,
      [id, userId, name, `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`]
    );
  }
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified)
     VALUES ('browser-outsider-user', 'Tenant Lain', 'tenant-lain@example.test', false)`
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system)
     VALUES ($1, 'browser-outsider-user', 'Usaha Tenant Lain', 'KOS_PROPERTY', 'KOS', 'ALL_IN')`,
    [businessIds.outsider]
  );

  const withBills = names.slice(1).map(([id]) => id);
  for (const businessId of withBills) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, '2026-01-01', '2026-01-31', 2900000, 290.000, 1500.00,
                 '2026-02-01', '2026-02-01')`,
      [`${businessId}-previous`, businessId]
    );
  }
  for (const businessId of withBills.slice(1)) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, '2026-02-01', '2026-02-28', 3200000, 320.000, 1500.00,
                 '2026-03-01', '2026-03-01')`,
      [`${businessId}-current`, businessId]
    );
  }

  const sessionStates = [
    [businessIds.questionnaire, 'browser-session-questionnaire', 'COLLECTING_CONTEXT'],
    [businessIds.candidate, 'browser-session-candidate', 'ANALYZED'],
    [businessIds.inspection, 'browser-session-inspection', 'INSPECTION_IN_PROGRESS'],
    [businessIds.inspectionCompleted, 'browser-session-inspection-completed', 'INSPECTION_IN_PROGRESS'],
    [businessIds.plannedAction, 'browser-session-planned-action', 'INSPECTION_IN_PROGRESS'],
    [businessIds.action, 'browser-session-action', 'INSPECTION_IN_PROGRESS'],
    [businessIds.waitingEvaluation, 'browser-session-waiting-evaluation', 'INSPECTION_IN_PROGRESS'],
    [businessIds.eligibleOutcome, 'browser-session-eligible-outcome', 'INSPECTION_IN_PROGRESS'],
    [businessIds.closureEligible, 'browser-session-closure-eligible', 'INSPECTION_IN_PROGRESS'],
    [businessIds.closed, 'browser-session-closed', 'CLOSED'],
  ];
  for (const [businessId, sessionId, status] of sessionStates) {
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id, segment_code,
         status, rule_version, questionnaire_completed_at, closed_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, $6,
                 CASE WHEN $5 IN ('ANALYZED','INSPECTION_IN_PROGRESS','CLOSED') THEN now() ELSE NULL END,
                 CASE WHEN $5 = 'CLOSED' THEN now() ELSE NULL END)`,
      [
        sessionId,
        businessId,
        `${businessId}-current`,
        `${businessId}-previous`,
        status,
        'KOS_CONTEXT_V1',
      ]
    );
  }

  const candidateStates = [
    [businessIds.candidate, 'browser-session-candidate', 'browser-candidate-candidate'],
    [businessIds.inspection, 'browser-session-inspection', 'browser-candidate-inspection'],
    [businessIds.inspectionCompleted, 'browser-session-inspection-completed', 'browser-candidate-inspection-completed'],
    [businessIds.plannedAction, 'browser-session-planned-action', 'browser-candidate-planned-action'],
    [businessIds.action, 'browser-session-action', 'browser-candidate-action'],
    [businessIds.waitingEvaluation, 'browser-session-waiting-evaluation', 'browser-candidate-waiting-evaluation'],
    [businessIds.eligibleOutcome, 'browser-session-eligible-outcome', 'browser-candidate-eligible-outcome'],
    [businessIds.closureEligible, 'browser-session-closure-eligible', 'browser-candidate-closure-eligible'],
    [businessIds.closed, 'browser-session-closed', 'browser-candidate-closed'],
  ];
  for (const [, sessionId, candidateId] of candidateStates) {
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version, candidate_type,
         rule_version, title, rank, internal_score, evidence_level, explanation,
         supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'SPECIAL_ACTIVITY', 1, 'OPERATIONAL',
                 'DIAG_CANDIDATE_RULE_V1', 'Kegiatan di luar rutinitas', 1, 88,
                 'MODERATE', 'Aktivitas yang dicatat perlu diperiksa; urutan ini bukan bukti penyebab.',
                 '[]'::jsonb, '[]'::jsonb)`,
      [candidateId, sessionId]
    );
  }

  await pool.query(
    `INSERT INTO inspection_plan (
       id, business_id, diagnostic_candidate_id, inspection_code, inspection_version,
       rule_version, title, status, result_code, completed_at
     ) VALUES
       ('browser-inspection-active', $1, 'browser-candidate-inspection',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'IN_PROGRESS', NULL, NULL),
       ('browser-inspection-inspection-completed', $2, 'browser-candidate-inspection-completed',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-planned-action', $3, 'browser-candidate-planned-action',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-action', $4, 'browser-candidate-action',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-waiting-evaluation', $5, 'browser-candidate-waiting-evaluation',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-eligible-outcome', $6, 'browser-candidate-eligible-outcome',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-closure-eligible', $7, 'browser-candidate-closure-eligible',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02'),
       ('browser-inspection-closed', $8, 'browser-candidate-closed',
        'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Periksa kegiatan di luar rutinitas',
        'COMPLETED', 'FOUND', '2026-03-02')`,
    [
      businessIds.inspection,
      businessIds.inspectionCompleted,
      businessIds.plannedAction,
      businessIds.action,
      businessIds.waitingEvaluation,
      businessIds.eligibleOutcome,
      businessIds.closureEligible,
      businessIds.closed,
    ]
  );
  await pool.query(
    `INSERT INTO inspection_item (
       id, plan_id, item_code, item_version, instruction_snapshot, safety_level,
       result_options_json, sort_order, status
     ) VALUES ('browser-inspection-item', 'browser-inspection-active', 'SPECIAL_EVENT', 1,
       'Catat kegiatan yang terlihat tanpa membongkar perangkat.', 'SAFE_OBSERVATION',
       '["FOUND","NOT_FOUND","UNKNOWN","NEEDS_HELP"]'::jsonb, 1, 'PENDING')`
  );

  const actionStates = [
    { key: 'plannedAction', suffix: 'planned-action', status: 'PLANNED', startedAt: null, completedAt: null },
    { key: 'action', suffix: 'action', status: 'IN_PROGRESS', startedAt: '2026-03-03T00:00:00Z', completedAt: null },
    { key: 'waitingEvaluation', suffix: 'waiting-evaluation', status: 'COMPLETED', startedAt: '2026-03-03T00:00:00Z', completedAt: '2026-03-31T00:00:00Z' },
    { key: 'eligibleOutcome', suffix: 'eligible-outcome', status: 'COMPLETED', startedAt: '2026-03-03T00:00:00Z', completedAt: '2026-03-31T00:00:00Z' },
    { key: 'closureEligible', suffix: 'closure-eligible', status: 'COMPLETED', startedAt: '2026-03-03T00:00:00Z', completedAt: '2026-03-31T00:00:00Z' },
    { key: 'closed', suffix: 'closed', status: 'COMPLETED', startedAt: '2026-03-03T00:00:00Z', completedAt: '2026-03-31T00:00:00Z' },
  ];
  for (const state of actionStates) {
    const businessId = businessIds[state.key];
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code,
         action_version, rule_version, title_snapshot, description_snapshot,
         reason_snapshot, steps_snapshot_json, inspection_result_snapshot,
         baseline_snapshot_json, status, review_mode, planned_start_date,
         started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'LOG_SPECIAL_ACTIVITY', 1, 'ACTION_PLAN_RULE_V1',
         'Catat kegiatan di luar rutinitas', 'Catat perubahan aktivitas secara aman.',
         'Hasil observasi tersimpan memerlukan pencatatan lanjutan.',
         '[{"stepCode":"LOG","instruction":"Catat aktivitas tanpa membongkar perangkat.","order":1}]'::jsonb,
         'FOUND', $5::jsonb, $6, 'NEXT_ELIGIBLE_BILL', '2026-03-03', $7, $8)`,
      [
        `browser-action-${state.suffix}`,
        businessId,
        `browser-candidate-${state.suffix}`,
        `browser-inspection-${state.suffix}`,
        JSON.stringify(baseline(`${businessId}-current`, `${businessId}-previous`)),
        state.status,
        state.startedAt,
        state.completedAt,
      ]
    );
  }

  for (const state of [
    { key: 'eligibleOutcome', suffix: 'eligible-outcome' },
    { key: 'closureEligible', suffix: 'closure-eligible' },
    { key: 'closed', suffix: 'closed' },
  ]) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, '2026-04-01', '2026-04-30',
         2800000, 280.000, 1500.00, '2026-05-01', '2026-05-01')`,
      [`browser-business-${state.suffix}-follow-up`, businessIds[state.key]]
    );
  }
  const followUp = (suffix) => ({
    billId: `browser-business-${suffix}-follow-up`,
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    inclusiveDays: 30,
    totalCostRupiah: '2800000',
    costPerDay: { numerator: '2800000', denominatorDays: '30' },
    totalKwhMilliKwh: '280000',
    kwhPerDay: { numerator: '280000', denominatorDays: '30' },
    tariffRupiahPerKwh: '1500.00',
    capturedAt: '2026-05-01T00:00:00.000Z',
  });
  const comparison = {
    baselineNormalizedCost: { numerator: '3200000', denominatorDays: '28' },
    followUpNormalizedCost: { numerator: '2800000', denominatorDays: '30' },
    baselineNormalizedUsage: { numerator: '320000', denominatorDays: '28' },
    followUpNormalizedUsage: { numerator: '280000', denominatorDays: '30' },
    costDeltaBps: '-1833',
    usageDeltaBps: '-1833',
    tariffDeltaBps: '0',
    costDirection: 'LOWER',
    usageDirection: 'LOWER',
    tariffDirection: 'SIMILAR',
    dataQualityCode: 'USAGE_COMPLETE',
    overallOutcomeCode: 'POSITIVE_SIGNAL',
  };
  const explanation = {
    paragraphs: [
      'Biaya dan pemakaian per hari tercatat lebih rendah pada tagihan evaluasi.',
      'Perbandingan ini menunjukkan perubahan data dan tidak membuktikan penyebabnya.',
    ],
    disclaimer: 'Hasil ini bukan jaminan penghematan dan tidak membuktikan hubungan sebab-akibat.',
  };
  for (const state of [
    { key: 'closureEligible', suffix: 'closure-eligible' },
    { key: 'closed', suffix: 'closed' },
  ]) {
    const businessId = businessIds[state.key];
    await pool.query(
      `INSERT INTO action_outcome_evaluation (
         id, business_id, diagnostic_session_id, action_plan_id, baseline_bill_id,
         follow_up_bill_id, rule_version, similarity_band_bps,
         evaluation_eligible_after_date, baseline_snapshot_json, follow_up_snapshot_json,
         comparison_snapshot_json, cost_direction, usage_direction, tariff_direction,
         data_quality_code, overall_outcome_code, explanation_snapshot_json, evaluated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'OUTCOME_EVALUATION_RULE_V1', 500,
         '2026-03-31', $7::jsonb, $8::jsonb, $9::jsonb, 'LOWER', 'LOWER', 'SIMILAR',
         'USAGE_COMPLETE', 'POSITIVE_SIGNAL', $10::jsonb, '2026-05-01')`,
      [
        `browser-outcome-${state.suffix}`,
        businessId,
        `browser-session-${state.suffix}`,
        `browser-action-${state.suffix}`,
        `${businessId}-current`,
        `browser-business-${state.suffix}-follow-up`,
        JSON.stringify(baseline(`${businessId}-current`, `${businessId}-previous`)),
        JSON.stringify(followUp(state.suffix)),
        JSON.stringify(comparison),
        JSON.stringify(explanation),
      ]
    );
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    this.ws = new WebSocket(webSocketUrl);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((resolveOpen, reject) => {
      this.ws.addEventListener('open', resolveOpen, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
          else pending.resolve(message.result);
        }
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
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

async function waitForDocument(cdp, expectedUrl, expectedText) {
  let latest = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `({ ready: document.readyState, text: document.body?.innerText || '', url: location.href })`,
      returnByValue: true,
    });
    latest = result.result.value;
    if (
      result.result.value?.ready === 'complete' &&
      result.result.value?.url?.startsWith(expectedUrl) &&
      (!expectedText || result.result.value?.text?.includes(expectedText))
    ) {
      return result.result.value;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(
    `Document did not become ready for ${expectedText || expectedUrl}; latest: ${JSON.stringify(latest)}`
  );
}

async function runBrowser(cookie) {
  const profile = resolve('..', '.tmp-it-diag-07a-chrome');
  await rm(profile, { recursive: true, force: true });
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  try {
    await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const pageInfo = await (
      await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json();
    const cdp = new CdpClient(pageInfo.webSocketDebuggerUrl);
    await cdp.open();
    const consoleMessages = [];
    const exceptions = [];
    const serverErrors = [];
    cdp.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error' || event.type === 'warning') {
        consoleMessages.push(event.args.map((arg) => arg.value || arg.description || '').join(' '));
      }
    });
    cdp.on('Runtime.exceptionThrown', (event) => exceptions.push(event.exceptionDetails.text));
    cdp.on('Network.responseReceived', (event) => {
      if (event.response.status >= 500) serverErrors.push(`${event.response.status} ${event.response.url}`);
    });
    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Network.enable'),
      cdp.send('Log.enable'),
    ]);
    const cookieResult = await cdp.send('Network.setCookie', {
      name: cookie.cookieName,
      value: decodeURIComponent(cookie.cookieValue),
      url: APP_URL,
      httpOnly: true,
      sameSite: 'Lax',
    });
    if (!cookieResult.success) throw new Error('Failed to set authenticated session cookie');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    const results = [];
    async function visit(path, expectedText, viewport = { width: 1280, height: 900 }, screenshot) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 768,
      });
      const targetUrl = `${APP_URL}${path}`;
      await cdp.send('Page.navigate', { url: targetUrl });
      const documentState = await waitForDocument(cdp, APP_URL, expectedText);
      const text = documentState.text;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      if (expectedText && !text.includes(expectedText)) {
        throw new Error(
          `${path} did not contain expected text: ${expectedText}; actual URL: ${documentState.url}; text: ${text.slice(0, 240)}`
        );
      }
      const audit = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const root = document.documentElement;
          const primary = document.querySelector('[aria-labelledby="next-action-title"] a, [aria-labelledby="next-action-title"] button');
          if (primary) primary.focus();
          const style = primary ? getComputedStyle(primary) : null;
          return {
            url: location.pathname + location.search,
            title: document.title,
            width: innerWidth,
            scrollWidth: root.scrollWidth,
            horizontalOverflow: root.scrollWidth > innerWidth,
            focusedPrimary: primary ? document.activeElement === primary : null,
            focusOutline: style ? style.outlineStyle + ' ' + style.outlineWidth : null,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            bodyTextLength: document.body.innerText.length,
          };
        })()`,
        returnByValue: true,
      });
      if (audit.result.value.horizontalOverflow) throw new Error(`Horizontal overflow at ${path}`);
      if (audit.result.value.focusedPrimary === false) throw new Error(`Primary action cannot receive focus at ${path}`);
      if (!audit.result.value.reducedMotion) throw new Error(`Reduced motion not emulated at ${path}`);
      if (screenshot) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 3000));
        const capture = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(join(EVIDENCE_DIR, screenshot), Buffer.from(capture.data, 'base64'));
      }
      results.push({ path, expectedText, ...audit.result.value });
    }

    const dashboardScenarios = [
      [businessIds.noBill, 'Tambah Tagihan Pertama'],
      [businessIds.oneBill, 'Tambah Tagihan Pembanding'],
      [businessIds.comparison, 'Cek Kenaikan'],
      [businessIds.questionnaire, 'Lanjutkan Cek Kenaikan'],
      [businessIds.candidate, 'Mulai Pemeriksaan'],
      [businessIds.inspection, 'Lanjutkan Pemeriksaan'],
      [businessIds.inspectionCompleted, 'Buat Rencana Hemat'],
      [businessIds.plannedAction, 'Mulai Rencana Hemat'],
      [businessIds.action, 'Lanjutkan Rencana Hemat'],
      [businessIds.waitingEvaluation, 'Tambah Tagihan Evaluasi'],
      [businessIds.eligibleOutcome, 'Evaluasi Hasil'],
      [businessIds.closureEligible, 'Tutup Sesi Cek Kenaikan'],
      [businessIds.closed, 'Lihat Ringkasan Sesi'],
    ];
    for (const [businessId, label] of dashboardScenarios) {
      await visit(`/dashboard?businessId=${businessId}`, label);
    }
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      await visit(
        `/dashboard?businessId=${businessIds.closed}`,
        'Ada sinyal perbaikan',
        viewport,
        `dashboard-${viewport.width}x${viewport.height}.png`
      );
    }

    const routes = [
      [`/bills?businessId=${businessIds.comparison}`, 'Tagihan listrik'],
      [`/bills/new?businessId=${businessIds.comparison}`, 'Masukkan tagihan listrik'],
      ['/diagnostics/browser-session-questionnaire', 'Kumpulkan konteks periode'],
      ['/diagnostics/browser-session-candidate/results', 'Bagian yang perlu dicek'],
      ['/diagnostics/browser-session-inspection/inspections/browser-inspection-active', 'Periksa kegiatan di luar rutinitas'],
      ['/diagnostics/browser-session-action/actions/browser-action-action', 'Sedang Dijalankan'],
      ['/diagnostics/browser-session-closed/actions/browser-action-closed/outcome', 'Ada sinyal perbaikan'],
      ['/', 'WattWise'],
      ['/register', 'Kos Tanpa Tagihan'],
      ['/login', 'Kos Tanpa Tagihan'],
      ['/plan', 'Kos Tanpa Tagihan'],
      ['/onboarding', 'Kos Tanpa Tagihan'],
      ['/businesses/new', 'Kos Tanpa Tagihan'],
      ['/setup', 'Setup selesai'],
    ];
    for (const [path, expected] of routes) await visit(path, expected);

    await visit(`/dashboard?businessId=${businessIds.outsider}`, '404');
    if (serverErrors.length) throw new Error(`HTTP 5xx responses: ${serverErrors.join('; ')}`);
    const relevantConsole = consoleMessages.filter((message) =>
      /hydration|react|gsap|error|warning/i.test(message)
    );
    if (exceptions.length || relevantConsole.length) {
      throw new Error(
        `Browser console failures: ${JSON.stringify({ exceptions, relevantConsole })}`
      );
    }
    cdp.close();
    return { results, consoleMessages, exceptions, serverErrors };
  } finally {
    chrome.kill();
    await Promise.race([
      new Promise((resolveExit) => chrome.once('exit', resolveExit)),
      new Promise((resolveDelay) => setTimeout(resolveDelay, 3000)),
    ]);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(profile, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 4) console.warn(`Temporary Chrome profile cleanup deferred: ${error.message}`);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
      }
    }
  }
}

async function main() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await waitFor(`${APP_URL}/api/health`);
  const reuseSeed = process.env.BROWSER_REUSE_SEED === 'true';
  const migrations = reuseSeed ? [] : await applyMigrations();
  const browserUser = reuseSeed ? await signInBrowserUser() : await registerBrowserUser();
  if (!reuseSeed) await seedDomain(browserUser.userId);
  const browser = await runBrowser(browserUser);
  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    appUrl: APP_URL,
    migrations,
    viewports: ['360x800', '768x1024', '1280x900'],
    checks: browser.results,
    consoleMessages: browser.consoleMessages,
    exceptions: browser.exceptions,
    http5xx: browser.serverErrors,
    secretsRedacted: true,
  };
  await writeFile(join(EVIDENCE_DIR, 'browser-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        routes: report.checks.length,
        screenshots: report.viewports.length,
        consoleWarnings: report.consoleMessages.length,
        exceptions: report.exceptions.length,
        http5xx: report.http5xx.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
