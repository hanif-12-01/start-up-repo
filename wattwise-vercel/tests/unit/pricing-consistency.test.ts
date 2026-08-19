import { describe, it, expect } from 'vitest';
import { rupiah } from '@/lib/format';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PRICING-CONSISTENCY-01 — Pricing Unit Tests', () => {
  it('CASE 1: Indonesian Rupiah formatter formats 49000 and 149000 properly', () => {
    const formatted49k = rupiah.format(49000).replace(/\s/g, ' ');
    const formatted149k = rupiah.format(149000).replace(/\s/g, ' ');
    expect(formatted49k).toMatch(/Rp\s?49\.000/);
    expect(formatted149k).toMatch(/Rp\s?149\.000/);
  });

  it('CASE 2: Forward migration 0011 contains exact locked pilot prices', () => {
    const migrationPath = join(process.cwd(), 'drizzle', 'migrations', '0011_pilot_pricing_consistency.sql');
    const migrationContent = readFileSync(migrationPath, 'utf8');

    expect(migrationContent).toContain("SET \"price_amount\" = 49000");
    expect(migrationContent).toContain("WHERE \"code\" = 'PRO'");
    expect(migrationContent).toContain("SET \"price_amount\" = 149000");
    expect(migrationContent).toContain("WHERE \"code\" = 'BUSINESS'");
  });

  it('CASE 3: Rollback migration 0011 restores 99000 and 249000', () => {
    const rollbackPath = join(process.cwd(), 'drizzle', 'rollbacks', '0011_pilot_pricing_consistency_rollback.sql');
    const rollbackContent = readFileSync(rollbackPath, 'utf8');

    expect(rollbackContent).toContain("SET \"price_amount\" = 99000");
    expect(rollbackContent).toContain("WHERE \"code\" = 'PRO'");
    expect(rollbackContent).toContain("SET \"price_amount\" = 249000");
    expect(rollbackContent).toContain("WHERE \"code\" = 'BUSINESS'");
  });

  it('CASE 4: Historical migration 0009 is preserved without modification', () => {
    const mig0009Path = join(process.cwd(), 'drizzle', 'migrations', '0009_product_parity.sql');
    const content0009 = readFileSync(mig0009Path, 'utf8');
    expect(content0009).toContain("('PRO', 'Pro', 99000, 'IDR', 'monthly')");
    expect(content0009).toContain("('BUSINESS', 'Business', 249000, 'IDR', 'monthly')");
  });

  it('CASE 5: Active product UI uses canonical billing data and does not hardcode old pricing', () => {
    const plansPagePath = join(process.cwd(), 'src', 'app', '(product)', 'plans', 'page.tsx');
    const plansPageContent = readFileSync(plansPagePath, 'utf8');

    expect(plansPageContent).not.toContain('99.000');
    expect(plansPageContent).not.toContain('249.000');
    expect(plansPageContent).not.toContain('99000');
    expect(plansPageContent).not.toContain('249000');
    expect(plansPageContent).toContain('plan.priceAmount');
    expect(plansPageContent).toContain('rupiah.format(plan.priceAmount)');
  });

  it('CASE 6: Static source guard — plan.service.ts does NOT contain runtime pricing mutation logic', () => {
    const planServicePath = join(process.cwd(), 'src', 'server', 'services', 'plan.service.ts');
    const planServiceContent = readFileSync(planServicePath, 'utf8');

    expect(planServiceContent).not.toContain('ensureCanonicalBillingPlans');
    expect(planServiceContent).not.toContain('UPDATE billing_plan');
    expect(planServiceContent).not.toContain('update(billingPlan)');
  });
});
