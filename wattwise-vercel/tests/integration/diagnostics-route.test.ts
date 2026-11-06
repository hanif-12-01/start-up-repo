// In-memory route/service integration: real workspace authorization helper, no DB/network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import DiagnosticsPage from '@/app/(product)/diagnostics/page';
import AnalysisPage from '@/app/(product)/analysis/page';
import ErrorPage from '@/app/error';
import { env } from '@/config/env';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep } from '@/server/services/journey.service';
import { getWorkspaceContext, WorkspaceBusinessNotFoundError } from '@/server/services/workspace.service';
import { getDiagnosticOverviewReadModel } from '@/server/services/dashboard.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
vi.mock('@/server/auth/session', () => ({ getOptionalSession: vi.fn() }));
vi.mock('@/server/services/journey.service', () => ({ resolveJourneyStep: vi.fn(), getJourneyRedirect: () => '/setup' }));
vi.mock('@/server/services/workspace.service', async (original) => ({
  ...await original<typeof import('@/server/services/workspace.service')>(), getWorkspaceContext: vi.fn(),
}));
vi.mock('@/server/services/dashboard.service', () => ({ getDiagnosticOverviewReadModel: vi.fn() }));
vi.mock('@/server/services/product-analysis', () => ({ getProductAnalysisReadModel: vi.fn() }));
vi.mock('@/server/services/entitlement.service', () => ({ getUserEntitlements: vi.fn() }));
vi.mock('@/app/(product)/diagnostics/StartDiagnosticButton', () => ({ StartDiagnosticButton: () => createElement('button', null, 'Mulai Cek Kenaikan') }));
vi.mock('@/components/product/WorkspaceUI', () => ({
  WorkspacePage: ({ children }: { children: React.ReactNode }) => createElement('main', null, children),
  SoftCard: ({ children }: { children: React.ReactNode }) => createElement('section', null, children),
  WorkspaceHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => createElement('header', null, createElement('h1', null, title), actions),
  BusinessSelector: () => null, secondaryButton: '',
}));

const original = { ...env };
const context = { business: { id: 'owned', segment: 'KOS' }, businesses: [{ id: 'owned' }] };
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(env, { DASHBOARD_ENABLED: false, DIAGNOSTICS_ENABLED: true, SEGMENT_TEMPLATES_ENABLED: true });
  vi.mocked(getOptionalSession).mockResolvedValue({ user: { id: 'owner' } } as Awaited<ReturnType<typeof getOptionalSession>>);
  vi.mocked(resolveJourneyStep).mockResolvedValue('COMPLETE');
  vi.mocked(getWorkspaceContext).mockImplementation(async (user, businessId) => {
    if (user !== 'owner' || (businessId && businessId !== 'owned')) throw new WorkspaceBusinessNotFoundError();
    return context as Awaited<ReturnType<typeof getWorkspaceContext>>;
  });
  vi.mocked(getDiagnosticOverviewReadModel).mockResolvedValue({
    nextAction: { kind: 'START_DIAGNOSTIC', label: 'Cek Kenaikan', electricityBillId: 'bill' },
    candidateSummaries: [], actionPlanSummaries: [], latestDiagnosticSummary: null,
  } as unknown as Awaited<ReturnType<typeof getDiagnosticOverviewReadModel>>);
});
afterEach(() => Object.assign(env, original));
const render = async (businessId?: string | string[]) => renderToStaticMarkup(await DiagnosticsPage({ searchParams: Promise.resolve({ businessId }) }));

describe('Stage5G2 Diagnostics route', () => {
  it('keeps Analysis working with flags OFF and passes the authorized business into its diagnostic CTAs', async () => {
    env.DIAGNOSTICS_ENABLED = false;
    vi.mocked(getProductAnalysisReadModel).mockResolvedValue({ data: { business: context.business } } as Awaited<ReturnType<typeof getProductAnalysisReadModel>>);
    const element = await AnalysisPage({ searchParams: Promise.resolve({ businessId: 'owned' }) });
    expect(element.props.businessQuery).toBe('businessId=owned');
    expect(getProductAnalysisReadModel).toHaveBeenCalledWith('owner', 'owned');
    const source = readFileSync('src/components/analysis/AnalysisView.tsx', 'utf8');
    expect(source).toContain('href: `/diagnostics?${businessQuery}`');
    expect(source).toContain("btnText: 'Jalankan Cek Kenaikan'");
    expect(await render('owned')).toContain('Cek Kenaikan belum diaktifkan');
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it.each([undefined, 'owned'])('renders authorized context for businessId=%s with Dashboard OFF', async (id) => {
    expect(await render(id)).toContain('Mulai Cek Kenaikan');
    expect(getDiagnosticOverviewReadModel).toHaveBeenCalledWith('owner', 'owned');
  });
  it.each(['DIAGNOSTICS_ENABLED', 'SEGMENT_TEMPLATES_ENABLED'] as const)('renders a truthful unavailable state for %s OFF', async (flag) => {
    env[flag] = false;
    const html = await render('owned');
    expect(html).toContain('Cek Kenaikan belum diaktifkan');
    expect(html).toContain('/analysis?businessId=owned');
    expect(html).not.toContain('Mulai Cek Kenaikan');
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it('handles unsupported segments without pretending they have diagnostic rules', async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({ ...context, business: { ...context.business, segment: 'LAUNDRY' } } as Awaited<ReturnType<typeof getWorkspaceContext>>);
    expect(await render()).toContain('Cek Kenaikan mendalam belum tersedia untuk segmen ini');
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it.each(['foreign', 'missing', ['owned', 'foreign']])('rejects invalid/foreign businessId %s before overview reads', async (id) => {
    await expect(render(id)).rejects.toThrow('NOT_FOUND');
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it('redirects an absent session without reading tenant data', async () => {
    vi.mocked(getOptionalSession).mockResolvedValue(null);
    await expect(render('owned')).rejects.toThrow('REDIRECT:/login');
    expect(getWorkspaceContext).not.toHaveBeenCalled();
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it('retains onboarding authorization', async () => {
    vi.mocked(resolveJourneyStep).mockResolvedValue('BUSINESS');
    await expect(render()).rejects.toThrow('REDIRECT:/setup');
    expect(getDiagnosticOverviewReadModel).not.toHaveBeenCalled();
  });
  it('propagates unexpected errors to the existing safe retry boundary', async () => {
    vi.mocked(getDiagnosticOverviewReadModel).mockRejectedValue(new Error('PRIVATE_SYNTHETIC_DETAILS'));
    await expect(render('owned')).rejects.toThrow('PRIVATE_SYNTHETIC_DETAILS');
    const html = renderToStaticMarkup(createElement(ErrorPage, { error: new Error('PRIVATE_SYNTHETIC_DETAILS'), reset: () => {} }));
    expect(html).toContain('Terjadi kendala sistem');
    expect(html).toContain('Coba Lagi');
    expect(html).not.toContain('PRIVATE_SYNTHETIC_DETAILS');
  });
});
