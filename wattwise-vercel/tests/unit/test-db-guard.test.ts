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

  it('getSafeTestDbUrl throws if DATABASE_URL is set to wattwise_dev', () => {
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5439/wattwise_dev';
    expect(() => getSafeTestDbUrl()).toThrow(/forbidden database "wattwise_dev"/);
  });

  it('getSafeTestDbUrl uses TEST_DATABASE_URL over DATABASE_URL when safe', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://user:pass@localhost:5439/custom_test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5439/wattwise_dev';
    expect(getSafeTestDbUrl()).toBe('postgresql://user:pass@localhost:5439/custom_test');
  });
});
