import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductShell } from '@/components/product/ProductShell';

const state = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({ usePathname: () => '/analysis', useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => createElement('a', { href }, children) }));
vi.mock('@/components/LogoutButton', () => ({ LogoutButton: () => null }));
vi.mock('@/components/product/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/onboarding', () => ({
  BeginnerGuideProvider: ({ children }: { children: React.ReactNode }) => children,
  InteractiveGuideOverlay: () => null, GuideReplayButton: () => null,
}));

describe('Lokasi Aktif sidebar navigation', () => {
  it.each([
    ['', '/dashboard'],
    ['businessId=second', '/dashboard?businessId=second'],
    ['businessId=owned&businessId=foreign', '/dashboard'],
    ['businessId=%20%20', '/dashboard'],
    ['businessId=a%26b', '/dashboard?businessId=a%26b'],
  ])('keeps only one nonempty URL context for %s; server still authorizes it', (query, href) => {
    state.query = query;
    const html = renderToStaticMarkup(createElement(ProductShell, { businessCount: 2 } as Parameters<typeof ProductShell>[0], null));
    expect(html).toContain(`href="${href}">`);
    expect(html).toContain('Lokasi Aktif');
    expect(html).toContain('href="/portfolio"');
  });
});
