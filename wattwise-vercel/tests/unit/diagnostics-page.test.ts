import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '@/config/env';
import { getDiagnosticCapability } from '@/server/services/diagnostic-capability';
import { resolveDashboardNextAction } from '@/server/services/dashboard-next-action';

describe('Diagnostics Page & Capability Routing', () => {
  const originalDiagnosticsEnabled = env.DIAGNOSTICS_ENABLED;
  const originalTemplatesEnabled = env.SEGMENT_TEMPLATES_ENABLED;

  beforeEach(() => {
    env.DIAGNOSTICS_ENABLED = true;
    env.SEGMENT_TEMPLATES_ENABLED = true;
  });

  afterEach(() => {
    env.DIAGNOSTICS_ENABLED = originalDiagnosticsEnabled;
    env.SEGMENT_TEMPLATES_ENABLED = originalTemplatesEnabled;
  });

  const diagnosticsPagePath = join(
    process.cwd(),
    'src',
    'app',
    '(product)',
    'diagnostics',
    'page.tsx'
  );
  const pageContent = readFileSync(diagnosticsPagePath, 'utf8');

  it('verifies diagnostics page file imports getDiagnosticCapability', () => {
    expect(pageContent).toContain(
      "import { getDiagnosticCapability } from '@/server/services/diagnostic-capability';"
    );
  });

  it('verifies diagnostics page contains the required safe capability notice copy', () => {
    expect(pageContent).toContain(
      'Cek Kenaikan mendalam belum tersedia untuk segmen ini'
    );
    expect(pageContent).toContain(
      'Anda tetap dapat menggunakan Analisis, Proyeksi, dan Rekomendasi WattWise berdasarkan data usaha yang sudah dicatat.'
    );
    expect(pageContent).toContain('Lihat Analisis');
    expect(pageContent).toContain('Kembali ke Dashboard');
  });

  it('verifies diagnostics page conditionally hides StartDiagnosticButton for unsupported segments without session', () => {
    expect(pageContent).toContain(
      '!capability.available && !dashboard.latestDiagnosticSummary'
    );
    expect(pageContent).toContain('isUnsupportedWithoutSession ? (');
  });

  it('preserves business ID query in unsupported analysis fallback link', () => {
    expect(pageContent).toContain('href={`/analysis${businessQuery}`}');
    expect(pageContent).toContain('href={`/dashboard${businessQuery}`}');
  });

  it('evaluates capability correctly for KOS vs non-KOS segments', () => {
    const kosCap = getDiagnosticCapability('KOS');
    expect(kosCap.available).toBe(true);

    const fnbCap = getDiagnosticCapability('FNB');
    expect(fnbCap.available).toBe(false);

    const laundryCap = getDiagnosticCapability('LAUNDRY');
    expect(laundryCap.available).toBe(false);

    const retailCap = getDiagnosticCapability('RETAIL');
    expect(retailCap.available).toBe(false);

    const coldCap = getDiagnosticCapability('COLD_STORAGE');
    expect(coldCap.available).toBe(false);

    const otherCap = getDiagnosticCapability('OTHER');
    expect(otherCap.available).toBe(false);
  });

  it('routes KOS nextAction to START_DIAGNOSTIC and FNB to LINK with preserved businessId', () => {
    const kosNextAction = resolveDashboardNextAction({
      businessId: 'kos-1',
      latestBillId: 'bill-latest',
      hasEligibleComparison: true,
      diagnosticAvailable: getDiagnosticCapability('KOS').available,
      session: null,
    });
    expect(kosNextAction).toEqual({
      kind: 'START_DIAGNOSTIC',
      label: 'Cek Kenaikan',
      electricityBillId: 'bill-latest',
    });

    const fnbNextAction = resolveDashboardNextAction({
      businessId: 'fnb-1',
      latestBillId: 'bill-latest',
      hasEligibleComparison: true,
      diagnosticAvailable: getDiagnosticCapability('FNB').available,
      session: null,
    });
    expect(fnbNextAction).toEqual({
      kind: 'LINK',
      label: 'Lihat Analisis',
      href: '/analysis?businessId=fnb-1',
    });
  });
});
