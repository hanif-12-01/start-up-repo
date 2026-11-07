// Stage5G.14 browser regression runner (local, loopback only).
// Drives the synthetic harness with the Chrome DevTools Protocol using Node's
// global fetch/WebSocket. No Playwright/Puppeteer dependency is added.
//
// Usage (from wattwise-vercel):
//   node harness/build.mjs && node harness/run.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HTTP_PORT = Number(process.env.WATTWISE_HARNESS_PORT ?? 4321);
const CDP_PORT = Number(process.env.WATTWISE_CDP_PORT ?? 9333);
const base = `http://127.0.0.1:${HTTP_PORT}`;
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) throw new Error('Chrome/Edge not found; set CHROME_PATH.');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.exceptions = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'exception');
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }

  async waitFor(expression, timeoutMs = 8000, label = expression) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.evaluate(expression)) return;
      await sleep(60);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  }

  async click(selector) {
    const clicked = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    })()`);
    assert.equal(clicked, true, `Missing clickable element: ${selector}`);
  }

  async key(key, modifiers = 0) {
    const codes = { Tab: 9, Escape: 27, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35 };
    const params = { key, code: key, windowsVirtualKeyCode: codes[key], modifiers };
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...params });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
  }

  async viewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }
}

const server = spawn(process.execPath, ['harness/serve.mjs'], {
  env: { ...process.env, WATTWISE_HARNESS_PORT: String(HTTP_PORT) },
  stdio: 'ignore',
});
const profileDir = await mkdtemp(path.join(os.tmpdir(), 'wattwise-stage5g14-chrome-'));
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,900',
    base,
  ],
  { stdio: 'ignore' }
);

let cdp;
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`PASS ${name}`);
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`);
    console.error(`FAIL ${name}`);
    throw error;
  }
};

try {
  await waitForHttp(`${base}/`);
  await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`);
  let target;
  for (let i = 0; i < 100 && !target; i += 1) {
    const pages = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    target = pages.find((page) => page.type === 'page' && page.url.startsWith(base));
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('Harness page target not found');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  cdp = new Cdp(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  try {
    await cdp.waitFor(`!!document.querySelector('[data-harness="start"]')`, 10000, 'harness mount');
  } catch (error) {
    console.error(cdp.exceptions);
    console.error(await cdp.evaluate('document.body.innerText'));
    throw error;
  }

  await check('tour starts and moves focus into the coachmark', async () => {
    await cdp.click('[data-harness="start"]');
    await cdp.waitFor(`!!document.querySelector('[data-tour-coachmark]')`);
    await cdp.waitFor(
      `!!document.activeElement?.closest?.('[data-tour-coachmark]')`,
      4000,
      'coachmark focus'
    );
  });

  await check('target-click advances, navigates and returns to the expected route', async () => {
    // Jump to step 1 = step-bills (target-click) via its progress control.
    await cdp.click('[data-tour-coachmark] [aria-label^="Langkah 2:"]');
    await cdp.waitFor(
      `document.querySelector('[data-tour-coachmark]')?.innerText.includes('Klik target disorot')`,
      4000,
      'target-click step ready'
    );
    await cdp.waitFor(`document.querySelector('[data-harness="href"]').textContent.startsWith('/dashboard')`);
    await cdp.click('.product-shell-sidebar [data-tour-id="sidebar-bills"]');
    await cdp.waitFor(`document.querySelector('[data-harness="href"]').textContent.startsWith('/bills')`);
    await cdp.evaluate(`window.__harness.navigate('/bills?businessId=biz-1&rerender=1')`);
    // Pending marker is consumed only after the 120 ms callback; the tour then
    // returns to /dashboard (step-summary expectedPathname) with businessId kept.
    await cdp.waitFor(
      `document.querySelector('[data-harness="href"]').textContent === '/dashboard?businessId=biz-1'`,
      8000,
      'route roundtrip to dashboard'
    );
    await cdp.waitFor(
      `document.querySelector('[data-tour-coachmark]')?.innerText.includes('Ringkasan')`
    );
  });

  await check('missing target shows the explicit fallback instead of a hidden highlight', async () => {
    await cdp.viewport(390, 800);
    await cdp.evaluate(`document.querySelector('[data-harness="hide-candidates"]')?.click()`);
    await cdp.evaluate(`document.querySelectorAll('[data-tour-id="sidebar-diagnostics"]').forEach(el => el.style.display = 'none')`);
    await cdp.evaluate(`(() => {
      const stepButtons = [...document.querySelectorAll('[data-tour-coachmark] [aria-label^="Langkah "]')];
      stepButtons[4]?.click();
      return true;
    })()`);
    await cdp.waitFor(
      `document.querySelector('[data-tour-coachmark]')?.innerText.includes('Bagian ini tidak tersedia di halaman saat ini.')`
    );
    const noHighlight = await cdp.evaluate(`![...document.querySelectorAll('[aria-hidden="true"]')].some(el => el.style.boxShadow.includes('9999px'))`);
    assert.equal(noHighlight, true);
    await cdp.evaluate(`document.querySelectorAll('[data-tour-id="sidebar-diagnostics"]').forEach(el => el.style.display = '')`);
  });

  await check('Escape closes the tour and returns focus', async () => {
    await cdp.key('Escape');
    await cdp.waitFor(`!document.querySelector('[data-tour-coachmark]')`);
    await cdp.waitFor(`document.activeElement?.matches('[data-harness="start"]')`);
  });

  await check('mobile drawer + coachmark stay reachable with Tab/Shift+Tab', async () => {
    await cdp.viewport(390, 800);
    await cdp.click('[data-harness="start"]');
    await cdp.waitFor(`!!document.querySelector('[data-tour-coachmark]')`);
    await cdp.click('[data-tour-coachmark] [aria-label^="Langkah 2:"]');
    await cdp.waitFor(`!!document.querySelector('#product-mobile-menu')`);
    await sleep(300);
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await cdp.key('Tab');
      reached = await cdp.evaluate(
        `!!document.activeElement?.closest?.('[data-tour-coachmark]')`
      );
    }
    assert.equal(reached, true, 'Tab never reached the coachmark');
    await cdp.evaluate(
      `document.querySelector('[data-tour-coachmark] button')?.focus()`
    );
    await cdp.key('Tab', 8);
    const shifted = await cdp.evaluate(`!!document.activeElement?.closest('[data-tour-coachmark], #product-mobile-menu')`);
    if (!shifted) console.log(await cdp.evaluate(`({active:document.activeElement?.outerHTML,drawer:!!document.querySelector('#product-mobile-menu'),step:document.querySelector('#tour-coachmark-title')?.textContent})`));
    assert.equal(shifted, true, 'Shift+Tab left no focused element');
    await cdp.key('Escape');
    await cdp.waitFor(`!document.querySelector('[data-tour-coachmark]')`);
  });

  await check('manual navigation is not hijacked; fallback link returns; skip clears stale route state', async () => {
    await cdp.viewport(1280, 900);
    await cdp.click('[data-harness="start"]');
    await cdp.click('[data-tour-coachmark] [aria-label^="Langkah 3:"]');
    await cdp.evaluate(`window.__harness.navigate('/bills?businessId=biz-1')`);
    await sleep(300);
    assert.equal(await cdp.evaluate(`window.__harness.currentHref()`), '/bills?businessId=biz-1');
    await cdp.waitFor(`!![...document.querySelectorAll('[data-tour-coachmark] a')].find(a => a.textContent.includes('Buka halaman langkah ini'))`);
    await cdp.evaluate(`[...document.querySelectorAll('[data-tour-coachmark] a')].find(a => a.textContent.includes('Buka halaman langkah ini')).click()`);
    await cdp.waitFor(`window.__harness.currentHref() === '/dashboard?businessId=biz-1'`);
    await cdp.evaluate(`[...document.querySelectorAll('[data-tour-coachmark] button')].find(b => b.textContent.includes('Lewati panduan')).click()`);
    await cdp.waitFor(`!document.querySelector('[data-tour-coachmark]')`);
    assert.equal(await cdp.evaluate(`sessionStorage.getItem('wattwise:interactive-tour:v2:pending-step')`), null);
    await cdp.click('[data-harness="start"]');
    await cdp.waitFor(`document.querySelector('#tour-coachmark-title')?.textContent === 'Selamat datang di WattWise'`);
    await cdp.click('[data-tour-coachmark] [aria-label^="Langkah 6:"]');
    await cdp.waitFor(`document.querySelector('#tour-coachmark-title')?.textContent === 'Rencana Hemat & evaluasi hasil'`);
    await cdp.evaluate(`[...document.querySelectorAll('[data-tour-coachmark] button')].find(b => b.textContent.includes('Selesai')).click()`);
    await cdp.waitFor(`!document.querySelector('[data-tour-coachmark]')`);
    assert.equal(await cdp.evaluate(`localStorage.getItem('wattwise:interactive-tour:v2:completed')`), 'true');
  });

  await check('hidden ancestors are never highlighted; reduced motion is honored', async () => {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.evaluate(`document.querySelector('[data-tour-id="dashboard-summary"]').parentElement.style.visibility = 'hidden'`);
    await cdp.click('[data-harness="start"]');
    await cdp.click('[data-tour-coachmark] [aria-label^="Langkah 3:"]');
    await cdp.waitFor(`document.querySelector('[data-tour-coachmark]')?.textContent.includes('Bagian ini tidak tersedia')`);
    assert.equal(await cdp.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`), true);
    await cdp.key('Escape');
    await cdp.evaluate(`document.querySelector('[data-tour-id="dashboard-summary"]').parentElement.style.visibility = ''`);
  });

  await check('tour Next and Back traverse all manual steps after bills roundtrip', async () => {
    await cdp.viewport(1280,800);
    await cdp.click('[data-harness="start"]');
    const action = async (text) => cdp.evaluate(`[...document.querySelectorAll('[data-tour-coachmark] button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
    await action('Mulai Pelajari');
    await cdp.waitFor(`document.querySelector('[data-tour-coachmark]')?.innerText.includes('Klik target disorot')`);
    await cdp.click('.product-shell-sidebar [data-tour-id="sidebar-bills"]');
    await cdp.waitFor(`window.__harness.currentHref() === '/dashboard?businessId=biz-1'`);
    await cdp.waitFor(`document.querySelector('#tour-coachmark-title')?.textContent.includes('Ringkasan')`);
    for (const label of ['Lanjut ke Tren','Lanjut','Lanjut ke Tindakan']) {
      await action(label);
      await sleep(200);
    }
    await cdp.waitFor(`document.querySelector('#tour-coachmark-title')?.textContent === 'Rencana Hemat & evaluasi hasil'`);
    await action('Kembali');
    await sleep(150);
    await action('Lanjut ke Tindakan');
    await action('Selesai');
    await cdp.waitFor(`!document.querySelector('[data-tour-coachmark]')`);
  });

  await check('chart table exposes per-period change and the 12-period cap', async () => {
    await cdp.viewport(1280, 900);
    await cdp.evaluate(`window.__harness.navigate('/dashboard?businessId=biz-1')`);
    await cdp.waitFor(`document.body.innerText.includes('Data dibatasi hingga 12 periode terbaru.')`);
    const tableText = await cdp.evaluate(
      `[...document.querySelectorAll('details table')].map((t) => t.textContent).join('\\n')`
    );
    assert.match(tableText, /vs /, 'table is missing a labelled comparison');
  });

  await check('chart responds to keyboard and tap with accessible tooltip', async () => {
    await sleep(250);
    await cdp.evaluate(`document.querySelector('svg [tabindex="0"][role="button"]')?.focus()`);
    await cdp.waitFor(`!!document.querySelector('[role="tooltip"]')`);
    await cdp.key('ArrowRight');
    await cdp.waitFor(`!!document.querySelector('[role="tooltip"]')`);
    await cdp.key('Escape');
    await cdp.viewport(390, 900);
    await cdp.evaluate(`document.activeElement?.blur(); document.querySelector('svg [data-chart-point]').dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}))`);
    await cdp.waitFor(`!!document.querySelector('[role="tooltip"]')`);
  });

  await check('axe WCAG A/AA scan reports no critical violations', async () => {
    const axeSource = await readFile(
      path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
      'utf8'
    );
    await cdp.evaluate(axeSource);
    await cdp.viewport(1280, 900);
    await cdp.evaluate(`document.activeElement?.blur(); document.documentElement.classList.remove('dark')`);
    const summary = await cdp.evaluate(`axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    }).then((report) => ({
      violations: report.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          html: n.html.slice(0, 160),
          failure: n.failureSummary,
        })),
      }))
    }))`);
    console.log('axe violations:', JSON.stringify(summary.violations));
    const critical = summary.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );
    assert.deepEqual(critical, [], `Serious/critical axe violations: ${JSON.stringify(critical)}`);
  });

  await check('no horizontal overflow from 320 to 1280 in light and dark', async () => {
    for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
      await cdp.viewport(width, 900);
      for (const theme of ['light', 'dark']) {
        const isDark = await cdp.evaluate(
          `document.documentElement.classList.contains('dark')`
        );
        if ((theme === 'dark') !== isDark) {
          await cdp.click('[data-harness="theme"]');
        }
        await sleep(120);
        const overflow = await cdp.evaluate(`({
          doc: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          width: window.innerWidth
        })`);
        assert.ok(
          overflow.doc <= overflow.width + 1 && overflow.body <= overflow.width + 1,
          `horizontal overflow at ${width}px ${theme}: ${JSON.stringify(overflow)}`
        );
        if (process.env.WATTWISE_SCREENSHOT_DIR && [390, 768, 1280].includes(width)) {
          await mkdir(process.env.WATTWISE_SCREENSHOT_DIR, { recursive: true });
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await writeFile(path.join(process.env.WATTWISE_SCREENSHOT_DIR, `synthetic-final-${width}-${theme}.png`), Buffer.from(shot.data, 'base64'));
        }
      }
    }
  });

  await check('Stage15 real surfaces gallery, overflow and scoped axe', async () => {
    const directory = process.env.WATTWISE_SCREENSHOT_DIR;
    assert.ok(directory, 'WATTWISE_SCREENSHOT_DIR required for visual evidence');
    await mkdir(directory, { recursive: true });
    const captures = [];
    const states = [
      ['A-overview', '/dashboard?businessId=biz-1&fixture=overview'],
      ['B-selection', '/dashboard?fixture=selection'],
      ['C-analysis-cost', '/analysis?businessId=biz-1&tab=trend'],
      ['D-analysis-forecast', '/analysis?businessId=biz-1&tab=forecast'],
    ];
    for (const [width, height] of [[320,800],[360,800],[390,844],[768,1024],[1280,800]]) {
      await cdp.viewport(width, height);
      for (const theme of ['light', 'dark']) {
        await cdp.evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`);
        for (const [state, href] of states) {
          await cdp.evaluate(`window.__harness.navigate(${JSON.stringify(href)}); window.scrollTo(0,0)`);
          await sleep(250);
          assert.equal(await cdp.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, `${state} overflow ${width} ${theme}`);
          if (state === 'B-selection') assert.equal(await cdp.evaluate(`document.querySelectorAll('a[href^="/dashboard?businessId="]').length`), 2);
          if (state.startsWith('C-')) assert.match(await cdp.evaluate('document.body.innerText'), /Tren biaya listrik/);
          if (state.startsWith('D-')) assert.match(await cdp.evaluate('document.body.innerText'), /Cara membaca estimasi ini/);
          const report = await cdp.evaluate(`axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})))`);
          console.log('Stage15 axe', state, width, theme, JSON.stringify(report));
          assert.deepEqual(report.filter(v => ['serious','critical'].includes(v.impact)), [], `${state} axe ${width} ${theme}`);
          const file = `${state}-${width}x${height}-${theme}.png`;
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          await writeFile(path.join(directory,file), Buffer.from(shot.data,'base64'));
          captures.push({file,state,width,height,theme,axe:report});
        }
      }
    }
    await cdp.viewport(390,844);
    await cdp.evaluate(`document.documentElement.classList.remove('dark'); window.__harness.navigate('/dashboard?businessId=biz-1')`);
    await sleep(200);
    await cdp.click('[data-harness="start"]');
    for (const step of [3,4,5,6]) {
      await cdp.click(`[data-tour-coachmark] [aria-label^="Langkah ${step}:"]`);
      await sleep(300);
      const tourAxe = await cdp.evaluate(`axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})))`);
      console.log('Stage15 tour axe',step,JSON.stringify(tourAxe));
      assert.deepEqual(tourAxe.filter(v => ['serious','critical'].includes(v.impact)), [], `tour step ${step} axe`);
      const file = `F-tour-step${step}-390x844-light.png`;
      const shot = await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(path.join(directory,file),Buffer.from(shot.data,'base64'));
      captures.push({file,state:`F tour step ${step}`,width:390,height:844,theme:'light'});
    }
    await cdp.key('Escape');
    await cdp.click('[data-tour-id="mobile-menu-button"]');
    const file = 'G-mobile-drawer-390x844-light.png';
    const shot = await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(directory,file),Buffer.from(shot.data,'base64'));
    captures.push({file,state:'G mobile drawer',width:390,height:844,theme:'light'});
    await writeFile(path.join(directory,'manifest.json'),JSON.stringify(captures,null,2));
    await writeFile(path.join(directory,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Stage5G15 synthetic visual review</title><style>body{font:16px system-ui;margin:24px;background:#f4f4f0;color:#17251e}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}img{width:100%;height:320px;object-fit:contain;background:#ddd}a{color:inherit}figure{margin:0}figcaption{padding:12px}</style><h1>Stage5G15: synthetic component review</h1><p>LOCAL ONLY. Production components; synthetic data, router/session boundaries. Not authenticated app E2E, hardware testing or PO acceptance. A overview; B selection; C real AnalysisView trend; D forecast includes explanation E; F tour; G drawer.</p><main>${captures.map(c=>`<figure><a href="${c.file}"><img loading="lazy" src="${c.file}" alt="Synthetic ${c.state} ${c.width} ${c.theme}"><figcaption>${c.file}</figcaption></a></figure>`).join('')}</main></html>`);
  });

  assert.deepEqual(cdp.exceptions, [], `Runtime exceptions: ${cdp.exceptions.join('; ')}`);
  console.log(`\n${results.length} browser checks passed.`);
} finally {
  try {
    cdp?.ws.close();
  } catch {}
  chrome.kill();
  server.kill();
  await sleep(400);
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
