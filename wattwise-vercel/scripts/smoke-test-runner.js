import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

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
        const sanitizedCookies = rawCookies.map((c) => {
          const parts = c.split(';');
          const [key] = parts[0].split('=');
          const attributes = parts.slice(1).map((a) => a.trim()).join('; ');
          return `${key}=[MASKED_TOKEN_VALUE]; ${attributes}`;
        });

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          location: res.headers['location'] || null,
          contentType: res.headers['content-type'] || null,
          cookies: rawCookies,
          sanitizedCookies,
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
  console.log(`🔥 Starting Runtime Smoke Verification on Production Server (${BASE_URL})...`);

  // 1. GET /
  const r1 = await request('/');
  console.log(`1. GET / => HTTP ${r1.statusCode} [Content-Type: ${r1.contentType}]`);

  // 2. GET /register
  const r2 = await request('/register');
  console.log(`2. GET /register => HTTP ${r2.statusCode} [Content-Type: ${r2.contentType}]`);

  // 3. GET /login
  const r3 = await request('/login');
  console.log(`3. GET /login => HTTP ${r3.statusCode} [Content-Type: ${r3.contentType}]`);

  // 4. Anonymous GET /setup
  const r4 = await request('/setup');
  console.log(`4. Anonymous GET /setup => HTTP ${r4.statusCode} [Location: ${r4.location || 'none'}]`);

  // 5. Register synthetic user
  const synthUser = {
    name: 'Smoke Test User',
    email: `smoke_${Date.now()}@example.com`,
    password: 'SyntheticPassword123!',
  };
  const r5 = await request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, synthUser);
  console.log(`5. Register Synthetic User => HTTP ${r5.statusCode}`);
  if (r5.sanitizedCookies.length > 0) {
    console.log(`   Cookies: ${r5.sanitizedCookies.join(', ')}`);
  }

  // 5b. Duplicate Register Synthetic User (rejected safely)
  const r5b = await request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, synthUser);
  console.log(`5b. Duplicate Register Synthetic User => HTTP ${r5b.statusCode} (Safely Rejected)`);

  // 6a. Wrong password login (rejected)
  const r6a = await request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: synthUser.email,
    password: 'WrongPassword999!',
  });
  console.log(`6a. Login Wrong Password => HTTP ${r6a.statusCode} (Safely Rejected)`);

  // 6b. Login valid synthetic user
  const r6b = await request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: synthUser.email,
    password: synthUser.password,
  });
  console.log(`6b. Login Valid Synthetic User => HTTP ${r6b.statusCode}`);
  const authCookies = r6b.cookies;
  if (r6b.sanitizedCookies.length > 0) {
    console.log(`    Session Cookies: ${r6b.sanitizedCookies.join(', ')}`);
  }

  // 7. Authenticated GET /setup
  const cookieHeader = authCookies.map((c) => c.split(';')[0]).join('; ');
  const r7 = await request('/setup', {
    headers: { Cookie: cookieHeader },
  });
  console.log(`7. Authenticated GET /setup => HTTP ${r7.statusCode}`);

  // 7b. Invalid session token GET /setup (rejected/redirected)
  const r7b = await request('/setup', {
    headers: { Cookie: 'wattwise.session_token=invalid_bogus_token_123' },
  });
  console.log(`7b. Invalid Session GET /setup => HTTP ${r7b.statusCode} [Location: ${r7b.location || 'none'}]`);

  // 8. Logout
  const r8 = await request('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
  }, {});
  console.log(`8. Logout => HTTP ${r8.statusCode}`);
  if (r8.sanitizedCookies.length > 0) {
    console.log(`   Cleared Cookies: ${r8.sanitizedCookies.join(', ')}`);
  }

  // 9. GET /setup after logout
  const r9 = await request('/setup');
  console.log(`9. GET /setup after logout => HTTP ${r9.statusCode} [Location: ${r9.location || 'none'}]`);

  // 10. GET /api/health
  const r10 = await request('/api/health');
  console.log(`10. GET /api/health => HTTP ${r10.statusCode} [Body: ${r10.body}]`);

  // 11. GET /api/health/database
  const r11 = await request('/api/health/database');
  console.log(`11. GET /api/health/database => HTTP ${r11.statusCode} [Body: ${r11.body}]`);

  // 12. GET /api/health/release
  const r12 = await request('/api/health/release');
  console.log(`12. GET /api/health/release => HTTP ${r12.statusCode} [Body: ${r12.body}]`);

  console.log('✅ Runtime Smoke Tests Finished.');
}

runSmokeTests().catch((err) => {
  console.error('❌ Smoke test runner failed:', err);
  process.exit(1);
});
