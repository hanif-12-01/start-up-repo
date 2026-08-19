import { describe, it, expect } from 'vitest';
import { PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD } from '@/server/services/public-demo-provisioning.service';

describe('Public Demo Provisioning Constants & Contract', () => {
  it('has valid email and minimum password length', () => {
    expect(PUBLIC_DEMO_EMAIL).toBe('wattwise.jury.demo@example.com');
    expect(PUBLIC_DEMO_PASSWORD).toBe('password123');
    expect(PUBLIC_DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
});
