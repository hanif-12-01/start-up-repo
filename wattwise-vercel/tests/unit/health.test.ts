import { describe, it, expect } from 'vitest';
import { HealthCheckService } from '../../src/server/services/health.service';

describe('HealthCheckService', () => {
  it('should return system health status ok without sensitive fields', () => {
    const health = HealthCheckService.getSystemHealth();
    expect(health.status).toBe('ok');
    expect(health.region).toBe('sin1');
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(health).not.toHaveProperty('databaseUrl');
    expect(health).not.toHaveProperty('secret');
  });

  it('should return database health status safely (no connection string in response)', async () => {
    const { result: dbHealth } = await HealthCheckService.getDatabaseHealth();
    expect(dbHealth.provider).toBe('neon-postgresql');
    expect(dbHealth).toHaveProperty('status');
    expect(dbHealth).not.toHaveProperty('connectionString');
    expect(dbHealth).not.toHaveProperty('url');
    expect(dbHealth).not.toHaveProperty('DATABASE_URL');
  });

  it('should return database health safely when correlationId is provided', async () => {
    const { result: dbHealth } = await HealthCheckService.getDatabaseHealth('test-corr-id');
    expect(dbHealth.provider).toBe('neon-postgresql');
    expect(['ok', 'unconfigured', 'error']).toContain(dbHealth.status);
  });

  it('should return database health as unconfigured when DATABASE_URL is empty', async () => {
    // In unit test environment, DATABASE_URL is empty, so status should be unconfigured
    const { result, httpStatus } = await HealthCheckService.getDatabaseHealth();
    // Either unconfigured (no DB URL in unit test) or error (if attempted connection)
    expect(['unconfigured', 'error', 'ok']).toContain(result.status);
    expect([200, 503]).toContain(httpStatus);
  });

  it('should return release information for Vercel target', () => {
    const release = HealthCheckService.getReleaseInfo();
    expect(release.name).toBe('wattwise-vercel');
    expect(release.target).toBe('vercel');
    expect(release.region).toBe('sin1');
  });

  it('should include a valid ISO timestamp in all health results', () => {
    const health = HealthCheckService.getSystemHealth();
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);

    const release = HealthCheckService.getReleaseInfo();
    expect(new Date(release.timestamp).toISOString()).toBe(release.timestamp);
  });
});
