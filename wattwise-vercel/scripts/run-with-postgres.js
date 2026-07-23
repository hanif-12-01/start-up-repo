import { execSync } from 'child_process';
import pg from 'pg';

const { Pool } = pg;
const CONTAINER_NAME = 'wattwise-disposable-postgres';
const PORT = '5439';
const DB_NAME = 'wattwise_test';
const USER = 'postgres';
const PASS = 'testpass';
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

async function main() {
  const existingDbUrl = process.env.DATABASE_URL;
  let startedContainer = false;
  let activeDbUrl = existingDbUrl;

  if (!existingDbUrl) {
    console.log('🚀 Starting disposable PostgreSQL container on host...');
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
    } catch {}

    try {
      execSync(
        `docker run -d --name ${CONTAINER_NAME} -p ${PORT}:5432 -e POSTGRES_PASSWORD=${PASS} -e POSTGRES_DB=${DB_NAME} postgres:16-alpine`,
        { stdio: 'inherit' }
      );
      startedContainer = true;
      activeDbUrl = DB_URL_HOST;
    } catch (err) {
      console.error('Failed to start Docker PostgreSQL container:', err.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️ Using existing DATABASE_URL provided by environment.');
  }

  try {
    console.log('⏳ Waiting for PostgreSQL database to be ready...');
    await waitForDb(activeDbUrl);
    console.log('✅ PostgreSQL database ready.');

    let rawCmd = process.argv.slice(2).join(' ');
    if (!rawCmd) {
      rawCmd = 'vitest run tests/integration';
    }

    let command = rawCmd;
    if (process.platform === 'win32') {
      command = `npm.cmd exec vitest -- run tests/integration --no-file-parallelism`;
    } else {
      command = `${rawCmd} --no-file-parallelism`;
    }

    console.log(`▶ Executing: ${command}`);
    const env = { ...process.env, DATABASE_URL: activeDbUrl };

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
  }
}

main();
