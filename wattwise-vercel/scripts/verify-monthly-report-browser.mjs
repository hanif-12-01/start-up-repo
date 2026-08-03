import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const APP_URL = process.env.BROWSER_APP_URL || 'http://127.0.0.1:3108';
const CHROME_PATH =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = Number(process.env.CDP_PORT || '9238');
const EVIDENCE_DIR = resolve('..', 'docs', 'evidence', 'it-diag-07b');
const USER_EMAIL = 'it-diag-07b-browser@example.test';

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });

async function waitFor(url, retries = 180) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

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

async function registerBrowserUser() {
  const response = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_URL },
    body: JSON.stringify({
      name: 'Browser Evidence IT-DIAG-07B',
      email: USER_EMAIL,
      password: 'Synthetic-browser-password-07B!',
    }),
  });
  if (!response.ok) throw new Error(`Sign-up failed: ${response.status}`);
  const cookie = response.headers
    .get('set-cookie')
    ?.match(/(?:^|,\s*)(wattwise\.session_token)=([^;]+)/);
  if (!cookie) throw new Error('Session cookie missing from sign-up response');
  const user = await pool.query('SELECT id FROM "user" WHERE email = $1', [USER_EMAIL]);
  if (!user.rows[0]) throw new Error('Registered browser user was not persisted');
  return { userId: user.rows[0].id, cookieName: cookie[1], cookieValue: cookie[2] };
}

async function signInBrowserUser() {
  const response = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_URL },
    body: JSON.stringify({
      email: USER_EMAIL,
      password: 'Synthetic-browser-password-07B!',
    }),
  });
  if (!response.ok) throw new Error(`Sign-in failed: ${response.status}`);
  const cookie = response.headers
    .get('set-cookie')
    ?.match(/(?:^|,\s*)(wattwise\.session_token)=([^;]+)/);
  if (!cookie) throw new Error('Session cookie missing from sign-in response');
  return { cookieName: cookie[1], cookieValue: cookie[2] };
}

const businessIds = {
  noBill: 'report-browser-no-bill',
  billOnly: 'report-browser-bill-only',
  diagnostic: 'report-browser-diagnostic',
  action: 'report-browser-action',
  evaluated: 'report-browser-evaluated',
  closed: 'report-browser-closed',
  outsider: 'report-browser-outsider',
};

const baseline = (businessId) => ({
  sourceBillId: `${businessId}-primary`,
  comparisonBillId: `${businessId}-previous`,
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
  capturedAt: '2026-09-01T00:00:00.000Z',
});

async function seedDomain(userId) {
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, onboarding_completed_at)
     VALUES ('report-browser-plan', $1, 'FREE', now())`,
    [userId]
  );
  const ownedBusinesses = [
    [businessIds.noBill, 'Laundry Tanpa Tagihan', 'LAUNDRY'],
    [businessIds.billOnly, 'Laundry Ringkas', 'LAUNDRY'],
    [businessIds.diagnostic, 'Dapur Cek Kenaikan', 'FNB'],
    [businessIds.action, 'Minimarket Rencana Berjalan', 'RETAIL'],
    [businessIds.evaluated, 'Frozen Food Evaluasi', 'COLD_STORAGE'],
    [businessIds.closed, 'Bengkel Sesi Selesai', 'OTHER'],
  ];
  for (let index = 0; index < ownedBusinesses.length; index += 1) {
    const [id, name, segment] = ownedBusinesses[index];
    await pool.query(
      `INSERT INTO business (
         id, user_id, name, business_type, segment, electrical_system, created_at
       ) VALUES ($1, $2, $3, 'OTHER', $4, 'ALL_IN', $5)`,
      [id, userId, name, segment, `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`]
    );
  }
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified)
     VALUES ('report-browser-outsider-user', 'Tenant Lain', 'report-outsider@example.test', false)`
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system)
     VALUES ($1, 'report-browser-outsider-user', 'Usaha Tenant Lain', 'OTHER', 'OTHER', 'ALL_IN')`,
    [businessIds.outsider]
  );

  for (const [businessId] of ownedBusinesses.slice(1)) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES
         ($1, $3, '2026-07-01', '2026-07-31', 2900000, 290.000, 1500.00,
          '2026-08-01', '2026-08-01'),
         ($2, $3, '2026-08-01', '2026-08-31', 3200000, 320.000, 1500.00,
          '2026-09-01', '2026-09-01')`,
      [`${businessId}-previous`, `${businessId}-primary`, businessId]
    );
  }

  const journeyBusinesses = [
    [businessIds.diagnostic, 'ANALYZED'],
    [businessIds.action, 'INSPECTION_IN_PROGRESS'],
    [businessIds.evaluated, 'INSPECTION_IN_PROGRESS'],
    [businessIds.closed, 'CLOSED'],
  ];
  for (const [businessId, status] of journeyBusinesses) {
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id, segment_code,
         status, rule_version, questionnaire_completed_at, closed_at, created_at
       ) SELECT $1, $2, $3, $4, segment, $5, 'REPORT_BROWSER_RULE_V1', now(),
                CASE WHEN $5 = 'CLOSED' THEN now() ELSE NULL END,
                '2026-09-01T00:00:00Z'
           FROM business WHERE id = $2`,
      [
        `${businessId}-session`,
        businessId,
        `${businessId}-primary`,
        `${businessId}-previous`,
        status,
      ]
    );
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version, candidate_type,
         rule_version, title, rank, internal_score, evidence_level, explanation,
         supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'SPECIAL_ACTIVITY', 1, 'OPERATIONAL',
                 'REPORT_BROWSER_CANDIDATE_V1', 'Jadwal operasional berubah', 1, 92,
                 'MODERATE', 'Data tercatat menunjukkan jadwal layak diperiksa; ini bukan diagnosis.',
                 '["internal"]'::jsonb, '[]'::jsonb)`,
      [`${businessId}-candidate`, `${businessId}-session`]
    );
  }

  for (const businessId of [businessIds.action, businessIds.evaluated, businessIds.closed]) {
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code, inspection_version,
         rule_version, title, status, result_code, started_at, completed_at
       ) VALUES ($1, $2, $3, 'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1',
                 'Pemeriksaan jadwal operasional', 'COMPLETED', 'FOUND',
                 '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z')`,
      [`${businessId}-inspection`, businessId, `${businessId}-candidate`]
    );
    const status = businessId === businessIds.action ? 'IN_PROGRESS' : 'COMPLETED';
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code,
         action_version, rule_version, title_snapshot, description_snapshot,
         reason_snapshot, steps_snapshot_json, inspection_result_snapshot,
         baseline_snapshot_json, status, review_mode, planned_start_date,
         started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'LOG_SPECIAL_ACTIVITY', 1, 'ACTION_PLAN_RULE_V1',
                 'Catat jadwal operasional', 'Catat perubahan secara aman.',
                 'Hasil pengamatan telah tersimpan.', '["Catat jadwal"]'::jsonb,
                 'FOUND', $5::jsonb, $6, 'NEXT_ELIGIBLE_BILL', '2026-09-02',
                 '2026-09-02T00:00:00Z',
                 CASE WHEN $6 = 'COMPLETED'
                      THEN '2026-09-30T00:00:00Z'::timestamptz
                      ELSE NULL::timestamptz END)`,
      [
        `${businessId}-action`,
        businessId,
        `${businessId}-candidate`,
        `${businessId}-inspection`,
        JSON.stringify(baseline(businessId)),
        status,
      ]
    );
  }

  for (const businessId of [businessIds.evaluated, businessIds.closed]) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, '2026-10-01', '2026-10-31', 2800000, 280.000, 1500.00,
                 '2026-11-01', '2026-11-01')`,
      [`${businessId}-follow-up`, businessId]
    );
    await pool.query(
      `INSERT INTO action_outcome_evaluation (
         id, business_id, diagnostic_session_id, action_plan_id, baseline_bill_id,
         follow_up_bill_id, rule_version, similarity_band_bps,
         evaluation_eligible_after_date, baseline_snapshot_json, follow_up_snapshot_json,
         comparison_snapshot_json, cost_direction, usage_direction, tariff_direction,
         data_quality_code, overall_outcome_code, explanation_snapshot_json, evaluated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'OUTCOME_EVALUATION_RULE_V1', 500,
                 '2026-09-30', $7::jsonb, $8::jsonb, $9::jsonb,
                 'LOWER', 'LOWER', 'SIMILAR', 'USAGE_COMPLETE', 'POSITIVE_SIGNAL',
                 $10::jsonb, '2026-11-01T00:00:00Z')`,
      [
        `${businessId}-outcome`,
        businessId,
        `${businessId}-session`,
        `${businessId}-action`,
        `${businessId}-primary`,
        `${businessId}-follow-up`,
        JSON.stringify(baseline(businessId)),
        JSON.stringify({
          billId: `${businessId}-follow-up`,
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
          inclusiveDays: 31,
          totalCostRupiah: '2800000',
          costPerDay: { numerator: '2800000', denominatorDays: '31' },
          totalKwhMilliKwh: '280000',
          kwhPerDay: { numerator: '280000', denominatorDays: '31' },
          tariffRupiahPerKwh: '1500.00',
          capturedAt: '2026-11-01T00:00:00.000Z',
        }),
        JSON.stringify({
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
        }),
        JSON.stringify({
          title: 'Ada sinyal perbaikan',
          paragraphs: ['Biaya dan pemakaian tercatat lebih rendah.'],
          disclaimer: 'Perubahan tidak membuktikan penyebab.',
        }),
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
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
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

async function waitForDocument(cdp, expectedText) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `({ ready: document.readyState, text: document.body?.innerText || '', url: location.href })`,
      returnByValue: true,
    });
    const value = result.result.value;
    if (value?.ready === 'complete' && value?.text?.includes(expectedText)) return value;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Document did not contain expected text: ${expectedText}`);
}

async function runBrowser(cookie) {
  const profile = resolve('..', '.tmp-it-diag-07b-chrome');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    }
  }
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
    ]);
    const cookieResult = await cdp.send('Network.setCookie', {
      name: cookie.cookieName,
      value: decodeURIComponent(cookie.cookieValue),
      url: APP_URL,
      httpOnly: true,
      sameSite: 'Lax',
    });
    if (!cookieResult.success) throw new Error('Failed to set browser session cookie');

    const results = [];
    async function visit(path, expectedText, viewport = { width: 1280, height: 900 }, screenshot) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 768,
      });
      await cdp.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await cdp.send('Page.navigate', { url: `${APP_URL}${path}` });
      const documentState = await waitForDocument(cdp, expectedText);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      const audit = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const root = document.documentElement;
          const printButton = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Cetak Laporan'));
          if (printButton) printButton.focus();
          return {
            url: location.pathname + location.search,
            width: innerWidth,
            horizontalOverflow: root.scrollWidth > innerWidth,
            focusedPrintButton: printButton ? document.activeElement === printButton : null,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            bodyTextLength: document.body.innerText.length,
          };
        })()`,
        returnByValue: true,
      });
      if (audit.result.value.horizontalOverflow) throw new Error(`Horizontal overflow at ${path}`);
      if (!audit.result.value.reducedMotion) throw new Error(`Reduced motion was not active at ${path}`);
      if (
        path.startsWith('/reports/') &&
        expectedText !== '404' &&
        !audit.result.value.focusedPrintButton
      ) {
        throw new Error(`Print button could not receive keyboard focus at ${path}`);
      }
      if (screenshot) {
        const capture = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(join(EVIDENCE_DIR, screenshot), Buffer.from(capture.data, 'base64'));
      }
      results.push({ path, expectedText, ...audit.result.value, finalUrl: documentState.url });
    }

    await visit(`/dashboard?businessId=${businessIds.billOnly}`, 'Lihat Laporan Bulanan');
    const scenarios = [
      [businessIds.noBill, 'Belum ada data tagihan'],
      [businessIds.billOnly, 'Ringkasan tagihan tersedia'],
      [businessIds.diagnostic, 'Cek Kenaikan sedang berjalan'],
      [businessIds.action, 'Rencana Hemat sedang berjalan'],
      [businessIds.evaluated, 'Evaluasi hasil tersedia'],
      [businessIds.closed, 'Perjalanan Cek Kenaikan selesai'],
    ];
    for (const [businessId, expected] of scenarios) {
      await visit(`/reports/monthly?businessId=${businessId}&month=2026-08`, expected);
    }
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      await visit(
        `/reports/monthly?businessId=${businessIds.closed}&month=2026-08`,
        'Perubahan sebelum dan sesudah tidak membuktikan',
        viewport,
        `monthly-report-${viewport.width}x${viewport.height}.png`
      );
    }

    await cdp.send('Emulation.setEmulatedMedia', { media: 'screen' });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
    const printSetup = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.__reportPrintCalled = false;
        const originalPrint = window.print;
        Object.defineProperty(window, 'print', {
          configurable: true,
          value: () => { window.__reportPrintCalled = true; },
        });
        const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Cetak Laporan'));
        const rect = button?.getBoundingClientRect();
        return {
          buttonFound: Boolean(button),
          printOverridden: window.print !== originalPrint,
          x: rect ? rect.left + rect.width / 2 : null,
          y: rect ? rect.top + rect.height / 2 : null,
        };
      })()`,
      returnByValue: true,
    });
    if (!printSetup.result.value.buttonFound || printSetup.result.value.x === null) {
      throw new Error('Print button coordinates were not available');
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: printSetup.result.value.x,
      y: printSetup.result.value.y,
      button: 'left',
      clickCount: 1,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: printSetup.result.value.x,
      y: printSetup.result.value.y,
      button: 'left',
      clickCount: 1,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    const printCalled = await cdp.send('Runtime.evaluate', {
      expression: 'window.__reportPrintCalled === true',
      returnByValue: true,
    });
    await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
    const printLayout = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return {
          controlsHidden: [...document.querySelectorAll('.report-print-hide')].every((node) => getComputedStyle(node).display === 'none'),
          titleRetained: text.includes('Laporan Listrik Usaha'),
          businessRetained: text.includes('Bengkel Sesi Selesai'),
          monthRetained: text.includes('Agustus 2026'),
          caveatRetained: text.includes('tidak membuktikan'),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      })()`,
      returnByValue: true,
    });
    const printAudit = {
      ...printLayout.result.value,
      buttonFound: printSetup.result.value.buttonFound,
      printOverridden: printSetup.result.value.printOverridden,
      printCalled: printCalled.result.value,
    };
    if (!Object.values(printAudit).every((value) => value === true || value === false)) {
      throw new Error('Print audit returned an invalid shape');
    }
    if (
      !printAudit.controlsHidden ||
      !printAudit.titleRetained ||
      !printAudit.businessRetained ||
      !printAudit.monthRetained ||
      !printAudit.caveatRetained ||
      printAudit.horizontalOverflow ||
      !printAudit.buttonFound ||
      !printAudit.printOverridden ||
      !printAudit.printCalled
    ) {
      throw new Error(`Print audit failed: ${JSON.stringify(printAudit)}`);
    }

    const quickRoutes = [
      [`/bills?businessId=${businessIds.closed}`, 'Tagihan listrik'],
      [`/bills/new?businessId=${businessIds.closed}`, 'Masukkan tagihan listrik'],
      ['/diagnostics/report-browser-closed-session/results', 'Bagian yang perlu dicek'],
      [`/diagnostics/${businessIds.closed}-session/inspections/${businessIds.closed}-inspection`, 'Pemeriksaan jadwal operasional'],
      [`/diagnostics/${businessIds.closed}-session/actions/${businessIds.closed}-action`, 'Tindakan Selesai'],
      [`/diagnostics/${businessIds.closed}-session/actions/${businessIds.closed}-action/outcome`, 'Ada sinyal perbaikan'],
      ['/', 'WattWise'],
      ['/register', 'Laundry Tanpa Tagihan'],
      ['/login', 'Laundry Tanpa Tagihan'],
      ['/plan', 'Laundry Tanpa Tagihan'],
      ['/onboarding', 'Laundry Tanpa Tagihan'],
      ['/businesses/new', 'Laundry Tanpa Tagihan'],
      ['/setup', 'Setup selesai'],
    ];
    for (const [path, expected] of quickRoutes) await visit(path, expected);
    await visit(`/reports/monthly?businessId=${businessIds.outsider}&month=2026-08`, '404');

    if (serverErrors.length) throw new Error(`HTTP 5xx: ${serverErrors.join('; ')}`);
    const relevantConsole = consoleMessages.filter((message) =>
      /hydration|react|gsap|uncaught|error/i.test(message)
    );
    if (exceptions.length || relevantConsole.length) {
      throw new Error(`Browser console failure: ${JSON.stringify({ exceptions, relevantConsole })}`);
    }
    cdp.close();
    return { results, printAudit, consoleMessages, exceptions, serverErrors };
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
        if (attempt === 4) {
          console.warn(`Temporary Chrome profile cleanup deferred: ${error.message}`);
        }
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
    appRuntime: 'node:24-slim',
    harnessRuntime: process.version,
    appUrl: APP_URL,
    migrations,
    viewports: ['360x800', '768x1024', '1280x900'],
    checks: browser.results,
    printAudit: browser.printAudit,
    consoleMessages: browser.consoleMessages,
    exceptions: browser.exceptions,
    http5xx: browser.serverErrors,
    secretsRedacted: true,
  };
  await writeFile(
    join(EVIDENCE_DIR, 'browser-evidence.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(
    JSON.stringify({
      status: 'PASS',
      routes: report.checks.length,
      screenshots: report.viewports.length,
      print: report.printAudit,
      consoleWarnings: report.consoleMessages.length,
      exceptions: report.exceptions.length,
      http5xx: report.http5xx.length,
    })
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
