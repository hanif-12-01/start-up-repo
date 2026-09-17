/**
 * Hard Destructive-Test Guard
 * Ensures no integration test can execute DROP, TRUNCATE, or DELETE operations
 * against a development or production database.
 */
export function assertDestructiveTestDb(dbUrl: string | undefined): string {
  if (!dbUrl || typeof dbUrl !== 'string') {
    throw new Error(
      '[FATAL TEST GUARD] No DATABASE_URL or TEST_DATABASE_URL provided to integration test. Refusing to run in unsafe environment.'
    );
  }

  let dbName = '';
  try {
    const url = new URL(dbUrl);
    dbName = url.pathname.replace(/^\//, '').toLowerCase();
  } catch {
    const match = dbUrl.match(/\/([^/?#]+)(?:[?#]|$)/);
    dbName = match ? match[1].toLowerCase() : '';
  }

  // 1. Explicit prohibition of development and production databases
  if (
    dbName === 'wattwise_dev' ||
    dbName.includes('_dev') ||
    dbName.includes('prod') ||
    dbName === 'postgres'
  ) {
    throw new Error(
      `[FATAL TEST GUARD] Integration tests are attempting to run against forbidden database "${dbName}". Destructive test execution REFUSED to protect development/production data!`
    );
  }

  // 2. Strict requirement: database name must end with '_test' or equal 'wattwise_test'
  if (!dbName.endsWith('_test') && dbName !== 'wattwise_test') {
    throw new Error(
      `[FATAL TEST GUARD] Database "${dbName}" is not recognized as a test database (must end with "_test"). Destructive test execution REFUSED!`
    );
  }

  // 3. Authorization check
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TEST_DB === 'true';
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  if (!allowDestructive && !isTestEnv) {
    throw new Error(
      '[FATAL TEST GUARD] Destructive operations are not authorized. ALLOW_DESTRUCTIVE_TEST_DB=true or NODE_ENV=test is required.'
    );
  }

  return dbUrl;
}

export function getSafeTestDbUrl(): string {
  const dbUrl =
    process.env.TEST_DATABASE_URL ||
    'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';
  return assertDestructiveTestDb(dbUrl);
}
