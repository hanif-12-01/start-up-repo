import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  parseValidTariff,
  resolveTariffContext,
  getOwnerFacingTariffLabel,
} from '@/lib/tariff';
import { predictUsage, type UsageSample } from '@/server/services/product-analysis';
import { deriveDisplayedPrediction } from '@/lib/ai/prediction-display';
import { Simulator } from '@/app/(product)/predictions/Simulator';
import { createBillSchema } from '@/server/validation/bills';
import { createBusinessSchema } from '@/server/validation/journey';

describe('Tariff Safety P0 — "Unknown tariff is safer than an invented tariff"', () => {
  const sample = (period: string, usageKwh: number, tariff: number | null = null): UsageSample => ({
    period,
    usageKwh,
    tariff,
    billAmount: usageKwh * (tariff ?? 0),
  });

  // 1. business-profile tariff wins over latest-bill tariff
  it('1. business-profile tariff wins over latest-bill tariff', () => {
    const context = resolveTariffContext({
      businessTariff: '1700.00',
      latestBillTariff: '1600.00',
    });
    expect(context.value).toBe(1700);
    expect(context.source).toBe('BUSINESS_PROFILE');
    expect(getOwnerFacingTariffLabel(context)).toContain('dari profil usaha');
    expect(getOwnerFacingTariffLabel(context)).toContain('1.700');
  });

  // 2. latest-bill tariff is used when business-profile tariff is missing
  it('2. latest-bill tariff is used when business-profile tariff is missing', () => {
    const context = resolveTariffContext({
      businessTariff: null,
      latestBillTariff: '1600.00',
    });
    expect(context.value).toBe(1600);
    expect(context.source).toBe('LATEST_BILL');
    expect(getOwnerFacingTariffLabel(context)).toContain('dari tagihan terakhir');
    expect(getOwnerFacingTariffLabel(context)).toContain('1.600');
  });

  // 3. both missing: tariff = null / UNKNOWN
  it('3. both missing: tariff = null / UNKNOWN', () => {
    const context = resolveTariffContext({
      businessTariff: null,
      latestBillTariff: null,
    });
    expect(context.value).toBeNull();
    expect(context.source).toBe('UNKNOWN');
    expect(getOwnerFacingTariffLabel(context)).toBe('Tarif belum tersedia');
  });

  // 4. zero tariff is not treated as a valid known tariff
  it('4. zero tariff is not treated as a valid known tariff', () => {
    expect(parseValidTariff(0)).toBeNull();
    expect(parseValidTariff('0')).toBeNull();
    expect(parseValidTariff('0.00')).toBeNull();

    const context = resolveTariffContext({
      businessTariff: '0',
      latestBillTariff: 0,
    });
    expect(context.value).toBeNull();
    expect(context.source).toBe('UNKNOWN');
  });

  // 5. negative tariff is not treated as valid
  it('5. negative tariff is not treated as valid', () => {
    expect(parseValidTariff(-100)).toBeNull();
    expect(parseValidTariff('-1444.70')).toBeNull();

    const context = resolveTariffContext({
      businessTariff: '-500',
      latestBillTariff: '-100',
    });
    expect(context.value).toBeNull();
    expect(context.source).toBe('UNKNOWN');
  });

  // 6. invalid/non-finite tariff does not create a Rupiah estimate
  it('6. invalid/non-finite tariff does not create a Rupiah estimate', () => {
    expect(parseValidTariff('')).toBeNull();
    expect(parseValidTariff('   ')).toBeNull();
    expect(parseValidTariff('abc')).toBeNull();
    expect(parseValidTariff(NaN)).toBeNull();
    expect(parseValidTariff(Infinity)).toBeNull();
    expect(parseValidTariff(-Infinity)).toBeNull();

    const result = predictUsage([sample('2026-01', 100), sample('2026-02', 120)], null);
    expect(result.estimatedBill).toBeNull();
  });

  // 7. deterministic prediction: valid kWh prediction + null tariff -> estimatedBill = null
  it('7. deterministic prediction: valid kWh prediction + null tariff -> estimatedBill = null', () => {
    const history = [
      sample('2026-01', 100),
      sample('2026-02', 120),
      sample('2026-03', 140),
    ];
    const result = predictUsage(history, null);
    expect(result.hasPrediction).toBe(true);
    expect(result.predictedUsageKwh).toBeGreaterThan(0);
    expect(result.estimatedBill).toBeNull();
  });

  // 8. N-BEATS/displayed prediction: valid predicted kWh + null tariff -> estimatedBill = null
  it('8. N-BEATS/displayed prediction: valid predicted kWh + null tariff -> estimatedBill = null', () => {
    const deterministic = predictUsage([sample('2026-01', 100), sample('2026-02', 110)], null);
    const displayed = deriveDisplayedPrediction(deterministic, 125.5, null, 6, 'nbeats');

    expect(displayed.hasPrediction).toBe(true);
    expect(displayed.predictedUsageKwh).toBe(125.5);
    expect(displayed.estimatedBill).toBeNull();
  });

  // 9. Simulator with null default tariff: tariff field starts empty
  it('9. Simulator with null default tariff: tariff field starts empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 1_000_000,
        defaultTariff: null,
        applianceOptions: [{ name: 'AC 1 PK', powerWatts: 800 }],
      })
    );

    // Value in tariff input must be empty string, not '1444.7'
    expect(html).toContain('placeholder="Belum ada tarif"');
    expect(html).toContain('placeholder="Belum ada tarif" class="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--foreground)]" value=""');
    expect(html).not.toContain('value="1444.7"');
  });

  // 10. Simulator with null tariff: kWh calculation remains available
  it('10. Simulator with null tariff: kWh calculation remains available', () => {
    const html = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 1_000_000,
        defaultTariff: null,
        applianceOptions: [{ name: 'AC 1 PK', powerWatts: 1000 }],
      })
    );

    // 1000W * 8h * 1unit * 30d / 1000 = 240 kWh/bulan
    expect(html).toContain('240');
    expect(html).toContain('kWh/bulan');
  });

  // 11. Simulator with null tariff: additional Rupiah cost is unavailable, NOT Rp0
  it('11. Simulator with null tariff: additional Rupiah cost is unavailable, NOT Rp0', () => {
    const html = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 1_000_000,
        defaultTariff: null,
        applianceOptions: [{ name: 'AC 1 PK', powerWatts: 500 }],
      })
    );

    expect(html).toContain('Masukkan tarif untuk menghitung estimasi biaya');
    expect(html).not.toContain('Rp0');
    expect(html).not.toContain('Rp 0');
  });

  // 12. Simulator with null tariff: total Rupiah estimate is unavailable
  it('12. Simulator with null tariff: total Rupiah estimate is unavailable', () => {
    const html = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 1_000_000,
        defaultTariff: null,
        applianceOptions: [{ name: 'AC 1 PK', powerWatts: 500 }],
      })
    );

    expect(html).toContain('Masukkan tarif untuk menghitung estimasi total');
    expect(html).not.toContain('Rp1.000.000');
  });

  // 13. manually entering a valid simulation tariff: Rupiah estimates appear
  it('13. with a valid tariff: Rupiah estimates appear in Simulator', () => {
    const html = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 500_000,
        defaultTariff: 1500,
        applianceOptions: [{ name: 'Kulkas', powerWatts: 100 }],
      })
    );

    // 100W * 8h * 1 * 30 / 1000 = 24 kWh * 1500 = Rp36.000
    // Total = 500.000 + 36.000 = Rp536.000
    expect(html).toContain('36.000');
    expect(html).toContain('536.000');
    expect(html).not.toContain('Masukkan tarif untuk menghitung estimasi biaya');
  });

  // 14. clearing manual tariff logic: parseValidTariff returns null on empty string
  it('14. clearing manual tariff returns null and removes Rupiah estimates', () => {
    expect(parseValidTariff('')).toBeNull();
    expect(parseValidTariff('   ')).toBeNull();

    const htmlCleared = renderToStaticMarkup(
      React.createElement(Simulator, {
        baseBill: 500_000,
        defaultTariff: null,
        applianceOptions: [{ name: 'Kulkas', powerWatts: 100 }],
      })
    );
    expect(htmlCleared).toContain('Masukkan tarif untuk menghitung estimasi biaya');
  });

  // 15. Simulator manual tariff does not invoke a server persistence action
  it('15. Simulator manual tariff does not invoke server persistence or mutate profile', () => {
    const simulatorPath = join(process.cwd(), 'src', 'app', '(product)', 'predictions', 'Simulator.tsx');
    const simulatorCode = readFileSync(simulatorPath, 'utf8');

    // Verify it is a client component without server actions or DB calls
    expect(simulatorCode).toContain("'use client'");
    expect(simulatorCode).not.toContain('updateBusiness');
    expect(simulatorCode).not.toContain('server/db');
    expect(simulatorCode).not.toContain('action=');
    expect(simulatorCode).not.toContain('fetch(');
  });

  // 16. AnalysisView no longer contains `tariff ?? 1444.7` or equivalent real-user hardcoded fallback
  it('16. AnalysisView no longer contains tariff ?? 1444.7 or equivalent real-user fallback', () => {
    const analysisViewPath = join(process.cwd(), 'src', 'components', 'analysis', 'AnalysisView.tsx');
    const content = readFileSync(analysisViewPath, 'utf8');

    expect(content).not.toContain('1444.7');
    expect(content).not.toContain('1444');
    expect(content).toContain('defaultTariff={tariff}');
  });

  // 17. unknown tariff does not prevent valid kWh forecast presentation
  it('17. unknown tariff does not prevent valid kWh forecast presentation', () => {
    const history = [
      sample('2026-01', 200),
      sample('2026-02', 220),
      sample('2026-03', 240),
    ];
    const prediction = predictUsage(history, null);

    expect(prediction.hasPrediction).toBe(true);
    expect(prediction.predictedUsageKwh).toBe(251.67);
    expect(prediction.estimatedBill).toBeNull();
  });

  // 18. business setup tariff remains optional
  it('18. business setup tariff remains optional in validation schema', () => {
    const validNoTariff = createBusinessSchema.safeParse({
      name: 'Warung Kopi Sejahtera',
      businessType: 'FNB',
      segment: 'FNB',
      electricalSystem: 'ALL_IN',
    });
    expect(validNoTariff.success).toBe(true);
    if (validNoTariff.success) {
      expect(validNoTariff.data.tariffRupiahPerKwh).toBeUndefined();
    }
  });

  // 19. bill tariff remains optional
  it('19. bill tariff remains optional in validation schema', () => {
    const validNoTariffBill = createBillSchema.safeParse({
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      totalAmountRupiah: '1500000',
    });
    expect(validNoTariffBill.success).toBe(true);
    if (validNoTariffBill.success) {
      expect(validNoTariffBill.data.tariffRupiahPerKwh).toBeUndefined();
    }
  });

  // 20. demo fixture tariff does not become a real-user fallback
  it('20. demo fixture tariff does not become a real-user fallback', () => {
    // Normal user context with missing tariffs must resolve to UNKNOWN
    const normalUserContext = resolveTariffContext({
      businessTariff: undefined,
      latestBillTariff: undefined,
    });
    expect(normalUserContext.value).toBeNull();
    expect(normalUserContext.source).toBe('UNKNOWN');

    // Confirm that product-analysis getProductAnalysisReadModel source uses resolveTariffContext
    const productAnalysisPath = join(process.cwd(), 'src', 'server', 'services', 'product-analysis.ts');
    const productAnalysisCode = readFileSync(productAnalysisPath, 'utf8');
    expect(productAnalysisCode).toContain('resolveTariffContext');
  });
});
