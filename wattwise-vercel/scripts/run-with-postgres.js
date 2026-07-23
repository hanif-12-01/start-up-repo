import { execSync } from 'child_process';
import pg from 'pg';

const { Pool } = pg;
const CONTAINER_NAME = 'wattwise-disposable-postgres';
const PORT = '5439';
const DB_NAME = 'wattwise_test';
const USER = 'postgres';
const PASS = 'testpass';
const DB_URL_HOST = `postgresql://${USER}:${PASS}@127.0.0.1:${PORT}/${DB_NAME}`;

async function waitForDb(maxRetries = 30) {
  const pool = new Pool({
    connectionString: DB_URL_HOST,
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
  console.log('🚀 Starting disposable PostgreSQL container...');

  // Ensure any previous test container is removed
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
  } catch {}

  // Run disposable PostgreSQL container
  try {
    execSync(
      `docker run -d --name ${CONTAINER_NAME} -p ${PORT}:5432 -e POSTGRES_PASSWORD=${PASS} -e POSTGRES_DB=${DB_NAME} postgres:16-alpine`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('Failed to start Docker PostgreSQL container:', err);
    process.exit(1);
  }

  try {
    console.log('⏳ Waiting for PostgreSQL container to be ready...');
    await waitForDb();
    console.log('✅ PostgreSQL container ready at 127.0.0.1:' + PORT);

    const command = process.platform === 'win32' ? 'npm.cmd exec vitest -- run tests/integration' : 'npm exec vitest -- run tests/integration';

    console.log(`▶ Executing: ${command}`);
    const env = { ...process.env, DATABASE_URL: DB_URL_HOST };

    execSync(command, { env, stdio: 'inherit', shell: true });
    console.log('✅ Command executed successfully.');
  } catch (err) {
    console.error('❌ Integration runner error:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Cleaning up disposable PostgreSQL container...');
    try {
      execSync(`docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' });
      console.log('✅ Cleanup complete.');
    } catch {
      console.warn('⚠️ Container cleanup warning.');
    }
  }
}

main();
