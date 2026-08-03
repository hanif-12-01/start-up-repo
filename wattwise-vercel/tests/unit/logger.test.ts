import { describe, it, expect } from 'vitest';
import { logger, generateCorrelationId } from '../../src/server/logger';

describe('logger', () => {
  it('should generate valid correlation IDs in UUID v4 format', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should generate unique correlation IDs on each call', () => {
    const ids = Array.from({ length: 10 }, generateCorrelationId);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });

  it('should expose info, warn, error, debug methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should not throw when logging an error without context', () => {
    expect(() => logger.error('test error', new Error('boom'))).not.toThrow();
  });

  it('should not throw when logging with correlationId context', () => {
    const correlationId = generateCorrelationId();
    expect(() =>
      logger.info('test event', { correlationId, event: 'test.event', path: '/api/test' })
    ).not.toThrow();
  });

  it('should not expose secret fields on the logger object', () => {
    // The logger itself must not carry any state that includes secrets
    expect(logger).not.toHaveProperty('databaseUrl');
    expect(logger).not.toHaveProperty('secret');
    expect(logger).not.toHaveProperty('password');
  });
});
