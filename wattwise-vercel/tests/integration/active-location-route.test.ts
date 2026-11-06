// In-memory route integration; real feature gate and workspace-page guards, no PostgreSQL.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import DashboardPage from '@/app/(product)/dashboard/page';
import { env } from '@/config/env';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep } from '@/server/services/journey.service';
import { getWorkspaceContext, getDecisionSupport, WorkspaceBusinessNotFoundError, WorkspaceUnavailableError } from '@/server/services/workspace.service';
import { readDashboardSnapshot } from '@/server/repositories/dashboard.repository';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => createElement('a', { href }, children) }));
vi.mock('@/server/auth/session', () => ({ getOptionalSession: vi.fn() }));
vi.mock('@/server/services/journey.service', async (original) => ({
  ...await original<typeof import('@/server/services/journey.service')>(), resolveJourneyStep: vi.fn(),
}));
vi.mock('@/server/services/workspace.service', async (original) => ({
  ...await original<typeof import('@/server/services/workspace.service')>(), getWorkspaceContext: vi.fn(), getDecisionSupport: vi.fn(),
}));
vi.mock('@/server/repositories/dashboard.repository', () => ({ readDashboardSnapshot: vi.fn() }));
vi.mock('@/server/services/product-analysis', () => ({ getProductAnalysisReadModel: vi.fn() }));
vi.mock('@/server/services/entitlement.service', () => ({ getUserEntitlements: vi.fn(async () => ({ plan: 'FREE', usage: { businessCount: 1 }, limits: { maxBusinesses: 1 } })) }));

const original = { ...env };
const owned = { id: 'owned', name: 'DEMO01', segment: 'FNB', isActive: true, updatedAt: new Date(), createdAt: new Date() };
const second = { ...owned, id: 'second', name: 'Lokasi kedua' };
let businesses = [owned];
const render = async (businessId?: string | string[]) => renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({ businessId }) }));
beforeEach(() => {
  vi.clearAllMocks();
  businesses = [owned];
  env.DASHBOARD_ENABLED = false;
  vi.mocked(getOptionalSession).mockResolvedValue({ user: { id: 'owner' } } as Awaited<ReturnType<typeof getOptionalSession>>);
  vi.mocked(resolveJourneyStep).mockResolvedValue('COMPLETE');
  vi.mocked(getWorkspaceContext).mockImplementation(async (userId, businessId) => {
    if (userId !== 'owner') throw new WorkspaceBusinessNotFoundError();
    if (!businesses.length) throw new WorkspaceUnavailableError();
    const business = businessId ? businesses.find(item => item.id === businessId) : businesses[0];
    if (!business) throw new WorkspaceBusinessNotFoundError();
    return { business, businesses } as Awaited<ReturnType<typeof getWorkspaceContext>>;
  });
  vi.mocked(readDashboardSnapshot).mockResolvedValue({ business: owned, businesses: [owned], bills: [], diagnostic: null } as Awaited<ReturnType<typeof readDashboardSnapshot>>);
});
afterEach(() => Object.assign(env, original));

describe('Stage5G9 active location', () => {
  it('reproduces completed FNB setup with Dashboard OFF without sending the user back to setup', async () => {
    const html = await render();
    expect(html).toContain('Ringkasan lokasi belum diaktifkan');
    expect(html).toContain('DEMO01');
    expect(html).toContain('/analysis?businessId=owned');
    expect(readDashboardSnapshot).not.toHaveBeenCalled();
    expect(getProductAnalysisReadModel).not.toHaveBeenCalled();
  });
  it('does not invent an operational-profile prerequisite for an existing business', async () => {
    // Fixture deliberately has no operating hours, floor area, appliances or bills.
    expect(await render('owned')).toContain('/analysis?businessId=owned');
  });
  it.each([undefined, '', '   '])('requires explicit multi-business selection for %s, not an arbitrary first location', async (id) => {
    businesses = [owned, second];
    const html = await render(id);
    expect(html).toContain('Pilih lokasi aktif');
    expect(html).toContain('Lokasi kedua');
    expect(html).not.toContain('/analysis?businessId=owned');
    expect(readDashboardSnapshot).not.toHaveBeenCalled();
  });
  it('preserves explicit second location in the selector and analysis link', async () => {
    businesses = [owned, second];
    const html = await render('second');
    expect(html).toContain('/analysis?businessId=second');
    expect(html).toContain('value="second" selected=""');
    expect(getWorkspaceContext).toHaveBeenCalledWith('owner', 'second');
  });
  it('renders no-active-business recovery without pretending setup is incomplete', async () => {
    businesses = [];
    expect(await render()).toContain('Belum ada lokasi aktif');
    expect(await render()).toContain('/businesses');
  });
  it.each(['foreign', 'missing', ' owned ', ['owned', 'second'], ['owned', 'owned']])('rejects invalid, foreign or repeated IDs %s even with Dashboard OFF', async (id) => {
    await expect(render(id)).rejects.toThrow('NOT_FOUND');
    expect(readDashboardSnapshot).not.toHaveBeenCalled();
    expect(getProductAnalysisReadModel).not.toHaveBeenCalled();
  });
  it.each(['PLAN', 'ONBOARDING', 'BUSINESS'] as const)('retains the real %s journey guard', async step => {
    vi.mocked(resolveJourneyStep).mockResolvedValue(step);
    const routes = { PLAN: '/plan', ONBOARDING: '/onboarding', BUSINESS: '/businesses/new' };
    await expect(render()).rejects.toThrow(`REDIRECT:${routes[step]}`);
    expect(getWorkspaceContext).not.toHaveBeenCalled();
  });
  it.each(['absent', 'expired'])('rejects %s sessions before any business read', async () => {
    vi.mocked(getOptionalSession).mockResolvedValue(null);
    await expect(render()).rejects.toThrow('REDIRECT:/login');
    expect(resolveJourneyStep).not.toHaveBeenCalled();
    expect(getWorkspaceContext).not.toHaveBeenCalled();
  });
  it('rejects a principal without ownership (no separate workspace membership model)', async () => {
    vi.mocked(getOptionalSession).mockResolvedValue({ user: { id: 'non-owner' } } as Awaited<ReturnType<typeof getOptionalSession>>);
    await expect(render('owned')).rejects.toThrow('NOT_FOUND');
  });
  it('propagates unexpected workspace failures instead of masking them as setup', async () => {
    vi.mocked(getWorkspaceContext).mockRejectedValueOnce(new Error('SYNTHETIC_DB_ERROR'));
    await expect(render()).rejects.toThrow('SYNTHETIC_DB_ERROR');
  });
  it('keeps the enabled dashboard and downstream reads on the same explicitly authorized ID', async () => {
    env.DASHBOARD_ENABLED = true;
    // Stop after the real dashboard model: no need to invent a full Analysis UI fixture.
    vi.mocked(getDecisionSupport).mockRejectedValueOnce(new Error('DOWNSTREAM_REACHED'));
    await expect(render('owned')).rejects.toThrow('DOWNSTREAM_REACHED');
    expect(readDashboardSnapshot).toHaveBeenCalledWith('owner', 'owned');
    expect(getDecisionSupport).toHaveBeenCalledWith('owner', 'owned');
    expect(getProductAnalysisReadModel).toHaveBeenCalledWith('owner', 'owned');
  });
  it('retains the sidebar route, query context, and no setup redirect loop', () => {
    const shell = readFileSync('src/components/product/ProductShell.tsx', 'utf8');
    expect(shell).toContain("href: '/dashboard', label: 'Lokasi Aktif'");
    expect(shell).toContain("searchParams.getAll('businessId')");
    const page = readFileSync('src/app/(product)/dashboard/page.tsx', 'utf8');
    expect(page).not.toContain("redirect('/setup')");
  });
});
