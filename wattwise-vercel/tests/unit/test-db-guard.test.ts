import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertDestructiveTestDb, getSafeTestDbUrl } from '../helpers/test-db-guard';

describe('Hard Destructive-Test Guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ALLOW_DESTRUCTIVE_TEST_DB = 'true';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('strictly rejects wattwise_dev database URL', () => {
    expect(() => {
      assertDestructiveTestDb('postgresql://user:pass@localhost:5439/wattwise_dev');
    }).toThrow(/forbidden database "wattwise_dev"/);
  });

  it('strictly rejects any database containing _dev', () => {
    expect(() => {
      assertDestructiveTestDb('postgresql://user:pass@localhost:5439/app_dev');
    }).toThrow(/forbidden database "app_dev"/);
  });

  it('strictly rejects default postgres database', () => {
    expect(() => {
      assertDestructiveTestDb('postgresql://user:pass@localhost:5439/postgres');
    }).toThrow(/forbidden database "postgres"/);
  });

  it('strictly rejects production databases', () => {
    expect(() => {
      assertDestructiveTestDb('postgresql://user:pass@ep-cool-prod.neon.tech/wattwise');
    }).toThrow(/not recognized as a test database/);
  });

  it('allows wattwise_test database', () => {
    const url = 'postgresql://wattwise_test_user:pass@127.0.0.1:5439/wattwise_test';
    expect(assertDestructiveTestDb(url)).toBe(url);
  });

  it('allows custom database ending with _test', () => {
    const url = 'postgresql://user:pass@localhost:5432/my_disposable_test';
    expect(assertDestructiveTestDb(url)).toBe(url);
  });

  it('rejects empty or undefined database URL', () => {
    expect(() => {
      assertDestructiveTestDb(undefined);
    }).toThrow(/No DATABASE_URL or TEST_DATABASE_URL/);
  });

  // TEST J: TEST_DATABASE_URL unset, DATABASE_URL = wattwise_dev -> ignores DATABASE_URL, returns dedicated fallback
  it('TEST J: getSafeTestDbUrl ignores development DATABASE_URL and uses wattwise_test fallback', () => {
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5439/wattwise_dev';
    const result = getSafeTestDbUrl();
    expect(result).toContain('/wattwise_test');
    expect(result).not.toContain('wattwise_dev');
  });

  // TEST K: TEST_DATABASE_URL = valid custom_test, DATABASE_URL = wattwise_dev -> returns TEST_DATABASE_URL
  it('TEST K: getSafeTestDbUrl uses TEST_DATABASE_URL over any development DATABASE_URL', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://user:pass@localhost:5439/custom_test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5439/wattwise_dev';
    expect(getSafeTestDbUrl()).toBe('postgresql://user:pass@localhost:5439/custom_test');
  });

  // TEST L: TEST_DATABASE_URL = wattwise_dev -> assertDestructiveTestDb rejects it
  it('TEST L: getSafeTestDbUrl rejects unsafe TEST_DATABASE_URL targeting wattwise_dev', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://user:pass@localhost:5439/wattwise_dev';
    expect(() => getSafeTestDbUrl()).toThrow(/forbidden database "wattwise_dev"/);
  });

  // TEST M: TEST_DATABASE_URL unset, DATABASE_URL = production URL -> production DATABASE_URL ignored, fallback used
  it('TEST M: getSafeTestDbUrl ignores production DATABASE_URL and uses wattwise_test fallback', () => {
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://prod_user:secret@prod.neon.tech/wattwise_production';
    const result = getSafeTestDbUrl();
    expect(result).toContain('/wattwise_test');
    expect(result).not.toContain('production');
  });
});
