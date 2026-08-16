import { describe, it, expect } from 'vitest';
import { DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } from '@/components/auth/DemoAccessCard';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('JURY-DEMO-03 — Public Demo Access Card on Login', () => {
  it('CASE 1: Demo email default matches canonical dedicated demo account', () => {
    expect(DEMO_ACCOUNT_EMAIL).toBe('wattwise.jury.demo@example.com');
  });

  it('CASE 2: Public demo password default meets minimum 8-character password requirement', () => {
    expect(typeof DEMO_ACCOUNT_PASSWORD).toBe('string');
    expect(DEMO_ACCOUNT_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it('CASE 3: Login and DemoAccessCard source code contains safe wording and no forbidden internal technical leaks', () => {
    const cardFilePath = join(process.cwd(), 'src', 'components', 'auth', 'DemoAccessCard.tsx');
    const cardContent = readFileSync(cardFilePath, 'utf8');

    const loginFilePath = join(process.cwd(), 'src', 'app', '(auth)', 'login', 'page.tsx');
    const loginContent = readFileSync(loginFilePath, 'utf8');

    // Forbidden internal technical leak checks
    expect(cardContent).not.toMatch(/H01_02|H03_05|H06_12/i);
    expect(cardContent).not.toMatch(/onnx.*hash|wasm|sha256/i);
    expect(cardContent).not.toMatch(/dua model ai|model a|model b/i);

    // Required presentation copy checks
    expect(cardContent).toContain('Coba akun demo WattWise');
    expect(cardContent).toContain('Data demo / sintetis');
    expect(cardContent).toContain('Gunakan akun demo');
    expect(cardContent).toContain('DEMO 01');
    expect(cardContent).toContain('DEMO 02');
    expect(cardContent).toContain('DEMO 03');
    expect(cardContent).toContain('Prediksi AI N-BEATS');

    // Login page embeds DemoAccessCard and maintains standard authClient submission
    expect(loginContent).toContain('<DemoAccessCard');
    expect(loginContent).toContain('authClient.signIn.email');
  });
});
