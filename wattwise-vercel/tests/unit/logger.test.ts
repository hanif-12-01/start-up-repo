import { describe, it, expect } from 'vitest';
import { logger, generateCorrelationId, sanitizeCorrelationId, redactValue } from '../../src/server/logger';

describe('logger', () => {
  it('should generate valid correlation IDs in UUID v4 format', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should sanitize incoming correlation IDs safely', () => {
    expect(sanitizeCorrelationId('custom-id-123')).toBe('custom-id-123');
    expect(sanitizeCorrelationId('   valid-id   ')).toBe('valid-id');
    // Reject invalid chars (e.g. script injection attempt)
    const invalid = sanitizeCorrelationId('<script>alert(1)</script>');
    expect(invalid).not.toContain('<script>');
    expect(invalid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/i);
    // Reject oversized ID
    const longId = 'a'.repeat(100);
    const sanitizedLong = sanitizeCorrelationId(longId);
    expect(sanitizedLong.length).toBeLessThanOrEqual(64);
  });

  it('should automatically redact sensitive keys in context objects', () => {
    expect(redactValue('password', 'secret123')).toBe('[REDACTED]');
    expect(redactValue('token', 'session-tok-123')).toBe('[REDACTED]');
    expect(redactValue('authorization', 'Bearer xyz')).toBe('[REDACTED]');
    expect(redactValue('DATABASE_URL', 'postgresql://user:pass@host/db')).toBe('[REDACTED]');
    expect(redactValue('email', 'user@example.com')).toBe('[REDACTED]');
    expect(redactValue('phone', '08123456789')).toBe('[REDACTED]');
    expect(redactValue('questionnaireNotes', 'confidential notes')).toBe('[REDACTED]');
    expect(redactValue('sqlParams', ['param1', 'param2'])).toBe('[REDACTED]');
  });

  it('should recursively redact nested objects', () => {
    const nested = {
      user: {
        id: 'u-123',
        email: 'secret@example.com',
        nestedSecret: {
          password: 'pass',
        },
      },
      safeField: 'hello',
    };
    const redacted = redactValue('context', nested) as typeof nested;
    expect(redacted.user.id).toBe('u-123');
    expect(redacted.user.email).toBe('[REDACTED]');
    expect(redacted.user.nestedSecret.password).toBe('[REDACTED]');
    expect(redacted.safeField).toBe('hello');
  });

  it('should not throw when logging an error without context', () => {
    expect(() => logger.error('test error', new Error('boom'))).not.toThrow();
  });
});
