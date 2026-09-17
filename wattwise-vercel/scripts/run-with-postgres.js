import { execSync } from 'child_process';
import { resolve } from 'path';
import pg from 'pg';

const { Pool } = pg;
const CONTAINER_NAME = 'wattwise-disposable-postgres';
const NETWORK_NAME = 'wattwise-test-network';
const PORT = '5439';
const DB_NAME = 'wattwise_test';
const USER = 'wattwise_test_user';
const PASS = 'synthetic_test_password_01b';
const DB_URL_HOST = `postgresql://${USER}:${PASS}@127.0.0.1:${PORT}/${DB_NAME}`;

async function waitForDb(dbUrl, maxRetries = 30) {
  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 1000,
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await pool.query('SELECT 1;');
      if (res) {
        await pool.end();
        return;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await pool.end();
  throw new Error('Database container failed to become ready in time.');
}

async function isDbReachable(dbUrl) {
  const pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 1000,
  });
  try {
    const res = await pool.query('SELECT 1;');
    await pool.end();
    return Boolean(res);
  } catch {
    await pool.end();
    return false;
  }
}

async function main() {
  // CRITICAL SAFETY RULE: Never use process.env.DATABASE_URL (which points to wattwise_dev in dev).
  // Only accept an explicit TEST_DATABASE_URL if provided.
  const rawTestDbUrl = process.env.TEST_DATABASE_URL;
  let startedContainer = false;
  let startedNetwork = false;
  let activeDbUrl = '';

  if (rawTestDbUrl) {
    console.log('ℹ️ Using explicit TEST_DATABASE_URL provided by environment.');
    activeDbUrl = rawTestDbUrl;
  } else {
    // Check if the local development container wattwise-postgres already provides wattwise_test
    const localTestAvailable = await isDbReachable(DB_URL_HOST);
    if (localTestAvailable) {
      console.log('ℹ️ Local test database (wattwise_test) is already reachable on port 5439.');
      activeDbUrl = DB_URL_HOST;
    } else {
      console.log('🚀 Starting disposable PostgreSQL container on host...');
      try {
        execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
      } catch {}
      try {
        execSync(`docker network rm ${NETWORK_NAME}`, { stdio: 'ignore' });
      } catch {}

      try {
        execSync(`docker network create ${NETWORK_NAME}`, { stdio: 'ignore' });
        startedNetwork = true;
      } catch {}

      try {
        execSync(
          `docker run -d --name ${CONTAINER_NAME} --network ${NETWORK_NAME} -p ${PORT}:5432 -e POSTGRES_USER=${USER} -e POSTGRES_PASSWORD=${PASS} -e POSTGRES_DB=${DB_NAME} postgres:16-alpine`,
          { stdio: 'inherit' }
        );
        startedContainer = true;
        activeDbUrl = DB_URL_HOST;
      } catch (err) {
        console.error('Failed to start Docker PostgreSQL container:', err.message);
        process.exit(1);
      }
    }
  }

  // Pre-execution Hard Guard: Verify activeDbUrl is an authorized TEST database
  const activeDbName = activeDbUrl.split('/').pop()?.split('?')[0]?.toLowerCase();
  if (
    activeDbName === 'wattwise_dev' ||
    activeDbName?.includes('_dev') ||
    activeDbName?.includes('prod') ||
    (!activeDbName?.endsWith('_test') && activeDbName !== 'wattwise_test')
  ) {
    console.error(`\n❌ [FATAL TEST GUARD] Integration runner refused to execute!`);
    console.error(`Database "${activeDbName}" is NOT an isolated test database!`);
    console.error(`Destructive integration tests cannot run against development or production databases.`);
    console.error(`Target database must end with "_test" (e.g. wattwise_test).\n`);
    process.exit(1);
  }

  try {
    console.log('⏳ Waiting for PostgreSQL database to be ready...');
    await waitForDb(activeDbUrl);
    console.log('✅ PostgreSQL database ready.');

    const vitestPath = resolve(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');
    const extraArgsIndex = process.argv.indexOf('--');
    const customCommand = extraArgsIndex !== -1 ? process.argv.slice(extraArgsIndex + 1).join(' ') : null;
    const command = customCommand || `"${process.execPath}" "${vitestPath}" run tests/integration --no-file-parallelism`;

    console.log(`▶ Executing: ${command}`);
    const env = {
      ...process.env,
      DATABASE_URL: activeDbUrl,
      TEST_DATABASE_URL: activeDbUrl,
      ALLOW_DESTRUCTIVE_TEST_DB: 'true',
      NODE_ENV: 'test',
      DASHBOARD_ENABLED: 'true',
      DIAGNOSTICS_ENABLED: 'true',
      ACTION_PLANS_ENABLED: 'true',
      OUTCOME_TRACKING_ENABLED: 'true',
      SEGMENT_TEMPLATES_ENABLED: 'true',
    };

    execSync(command, { env, stdio: 'inherit', shell: true });
    console.log('✅ Integration test command executed successfully.');
  } catch (err) {
    console.error('❌ Integration runner error:', err.message);
    process.exitCode = 1;
  } finally {
    if (startedContainer) {
      console.log('🧹 Cleaning up disposable PostgreSQL container...');
      try {
        execSync(`docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' });
        console.log('✅ Cleanup complete.');
      } catch {
        console.warn('⚠️ Container cleanup warning.');
      }
    }
    if (startedNetwork) {
      try {
        execSync(`docker network rm ${NETWORK_NAME}`, { stdio: 'ignore' });
      } catch {
        console.warn('Disposable network cleanup warning.');
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
