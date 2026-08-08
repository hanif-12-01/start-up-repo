import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cdpPort = Number(process.env.IT_PRODUCT_12_CDP_PORT ?? '9223');
const baseUrl = process.env.IT_PRODUCT_12_BASE_URL ?? 'http://127.0.0.1:3000';
const evidenceDir = path.resolve('docs/evidence/it-product-12');
const timeoutMs = 20_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectToPage() {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
  const targets = await response.json();
  const target = targets.find((candidate) => candidate.type === 'page');
  if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target is available.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  return { send, socket, exceptions };
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const { send, socket, exceptions } = await connectToPage();
  const results = [];
  const mark = (label) => console.log(`[browser] ${label}`);
  await send('Network.clearBrowserCookies');
  await send('Network.clearBrowserCache');
  await send('Storage.clearDataForOrigin', { origin: baseUrl, storageTypes: 'local_storage' });
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };

  const waitFor = async (expression, label) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${label}.`);
  };

  const navigate = async (pathname) => {
    await send('Page.navigate', { url: `${baseUrl}${pathname}` });
    await waitFor('document.readyState === "complete"', `${pathname} to load`);
    await sleep(400);
    await evaluate('scrollTo(0, 0)');
    const url = await evaluate('location.href');
    if (!url.startsWith(baseUrl)) throw new Error(`Unexpected origin after navigating to ${pathname}: ${url}`);
    return url;
  };

  const screenshot = async (name, fullPage = true) => {
    const capture = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: fullPage,
    });
    await writeFile(path.join(evidenceDir, name), Buffer.from(capture.data, 'base64'));
  };

  const assertText = async (text, label) => {
    const present = await evaluate(`document.body.innerText.toLocaleLowerCase('id').includes(${JSON.stringify(text.toLocaleLowerCase('id'))})`);
    if (!present) throw new Error(`Missing ${label}: ${text}`);
    results.push({ check: label, status: 'PASS' });
  };

  const clickByText = async (tag, text) => {
    const clicked = await evaluate(`(() => {
      const target = [...document.querySelectorAll(${JSON.stringify(tag)})]
        .find((element) => element.textContent.includes(${JSON.stringify(text)}));
      if (!target) return false;
      target.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not find ${tag} containing ${text}.`);
  };

  const setValue = async (selector, value) => {
    const updated = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      const prototype = element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!updated) throw new Error(`Could not set ${selector}.`);
  };

  await navigate('/');
  mark('landing desktop loaded');
  await assertText('Tagihan naik bukan akhir cerita', 'landing value proposition');
  await screenshot('landing-desktop.png', false);
  results.push({ check: 'landing desktop screenshot', status: 'PASS' });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate('/');
  mark('landing mobile loaded');
  await assertText('WattWise AI', 'mobile landing identity');
  await screenshot('landing-mobile.png', false);
  results.push({ check: 'landing mobile screenshot', status: 'PASS' });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await navigate('/register');
  mark('registration loaded');
  await waitFor('Object.keys(document.querySelector("form") ?? {}).some((key) => key.startsWith("__react"))', 'React registration hydration');
  results.push({ check: 'registration hydration', status: 'PASS' });
  const email = `it-product-12-${Date.now()}@example.test`;
  await setValue('input[name="name"]', 'Pengguna Uji IT Product 12');
  await setValue('input[name="email"]', email);
  await setValue('input[name="password"]', 'WattWise!2026Local');
  await clickByText('button', 'Daftar Akun');
  await sleep(1_500);
  console.log('[browser] registration state', await evaluate(`JSON.stringify({
    pathname: location.pathname,
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
    button: [...document.querySelectorAll('button')].find((element) => element.textContent.includes('Daftar'))?.textContent?.trim() ?? null
  })`));
  await waitFor('location.pathname !== "/register"', 'registration redirect');
  await waitFor('location.pathname === "/plan"', 'plan selection route');
  mark('registration completed');
  results.push({ check: 'registration and auth session', status: 'PASS' });

  await clickByText('button', 'Pro Trial');
  await waitFor('location.pathname === "/onboarding"', 'onboarding route');
  await clickByText('button', 'Saya Mengerti');
  await waitFor('location.pathname === "/businesses/new"', 'business creation route');

  await setValue('input[name="name"]', 'Toko Uji Hijau');
  await setValue('select[name="businessType"]', 'RETAIL');
  await setValue('select[name="segment"]', 'RETAIL');
  await setValue('select[name="electricalSystem"]', 'ALL_IN');
  await setValue('input[name="city"]', 'Bandung');
  await clickByText('button', 'Simpan Profil Usaha');
  await waitFor('location.pathname === "/dashboard"', 'dashboard route');
  await sleep(1_000);
  console.log('[browser] dashboard state', await evaluate(`JSON.stringify({
    pathname: location.pathname,
    text: document.body.innerText.slice(0, 600)
  })`));
  await waitFor(
    'document.body.innerText.toLocaleLowerCase("id").includes("dashboard kendali biaya")',
    'dashboard content',
  );
  mark('onboarding completed');
  await assertText('DASHBOARD KENDALI BIAYA', 'dashboard summary');
  await screenshot('dashboard.png');
  results.push({ check: 'onboarding through dashboard', status: 'PASS' });

  await navigate('/analysis');
  mark('analysis loaded');
  await assertText('Pusat Analisis', 'analysis center');
  await assertText('Simulator', 'analysis simulator tab');
  await screenshot('analysis.png');

  await navigate('/plans');
  mark('plans loaded');
  await assertText('Paket Saya', 'plan management');
  await assertText('Sandbox saja', 'sandbox billing disclosure');
  await screenshot('plans.png');

  await navigate('/bills/new');
  mark('bill input loaded');
  await assertText('Bantu baca foto meter', 'browser-local meter OCR');
  await assertText('tidak diunggah', 'OCR privacy disclosure');
  await screenshot('bill-ocr.png');

  await navigate('/settings/appearance');
  mark('appearance loaded');
  const darkSelected = await evaluate(`(() => {
    const input = document.querySelector('input[name="appearance"][value="DARK"]');
    if (!input) return false;
    input.click();
    return true;
  })()`);
  if (!darkSelected) throw new Error('Dark appearance radio was not available.');
  await clickByText('button', 'Simpan Tampilan');
  await waitFor('document.documentElement.classList.contains("dark") && document.documentElement.dataset.themePreference === "DARK"', 'dark theme application');
  await screenshot('appearance-dark.png');
  results.push({ check: 'persisted dark appearance', status: 'PASS' });

  await navigate('/dashboard');
  await waitFor('document.documentElement.classList.contains("dark")', 'dark dashboard');
  await waitFor('document.body.innerText.includes("DASHBOARD KENDALI BIAYA")', 'dark dashboard content');
  await sleep(1_000);
  await screenshot('dashboard-dark.png');
  results.push({ check: 'dashboard dark theme', status: 'PASS' });

  await navigate('/');
  await waitFor('document.documentElement.classList.contains("dark")', 'dark landing');
  await assertText('Tagihan naik bukan akhir cerita', 'dark landing content');
  await screenshot('landing-dark.png', false);
  results.push({ check: 'landing dark theme', status: 'PASS' });

  const responsiveRoutes = [
    '/',
    '/dashboard',
    '/analysis',
    '/bills',
    '/revenue',
    '/appliances',
    '/businesses',
    '/reports/monthly',
    '/plans',
    '/settings/appearance',
  ];
  for (const viewport of [
    { width: 360, height: 800, mobile: true },
    { width: 768, height: 1024, mobile: true },
    { width: 1280, height: 900, mobile: false },
    { width: 1440, height: 900, mobile: false },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', {
      ...viewport,
      deviceScaleFactor: 1,
    });
    for (const route of responsiveRoutes) {
      await navigate(route);
      const noOverflow = await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');
      if (!noOverflow) throw new Error(`Horizontal overflow at ${viewport.width}px on ${route}.`);
    }
    results.push({ check: `responsive routes at ${viewport.width}x${viewport.height}`, status: 'PASS' });
  }

  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate('/dashboard');
  await clickByText('button', 'Menu');
  await waitFor('document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded") === "true"', 'mobile navigation drawer');
  await assertText('Paket Saya', 'mobile navigation content');
  results.push({ check: 'mobile navigation drawer', status: 'PASS' });

  if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join('; ')}`);
  results.push({ check: 'uncaught browser exceptions', status: 'PASS' });

  const report = {
    verifiedAt: new Date().toISOString(),
    baseUrl,
    syntheticAccount: email,
    results,
  };
  await writeFile(path.join(evidenceDir, 'browser-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  socket.close();
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
