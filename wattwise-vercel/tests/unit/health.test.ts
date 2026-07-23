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

  it('should return database health status safely', async () => {
    const { result: dbHealth } = await HealthCheckService.getDatabaseHealth();
    expect(dbHealth.provider).toBe('neon-postgresql');
    expect(dbHealth).toHaveProperty('status');
    expect(dbHealth).not.toHaveProperty('connectionString');
  });

  it('should return release information for Vercel target', () => {
    const release = HealthCheckService.getReleaseInfo();
    expect(release.name).toBe('wattwise-vercel');
    expect(release.target).toBe('vercel');
    expect(release.region).toBe('sin1');
  });
});
