// Minimal in-memory stand-in for the Next.js router used by the browser harness.
// NOT production code; exists only so real production components can be rendered
// in a static page without a Next.js server or authenticated session.
import { useMemo, useSyncExternalStore } from 'react';

interface RouterState {
  pathname: string;
  search: string;
}

let state: RouterState = {
  pathname: '/dashboard',
  search: '?businessId=biz-1',
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function navigate(href: string) {
  const url = new URL(href, 'http://harness.local');
  state = { pathname: url.pathname, search: url.search };
  emit();
  window.scrollTo(0, 0);
}

export function currentHref(): string {
  return `${state.pathname}${state.search}`;
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => state.pathname,
    () => state.pathname
  );
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => state.search,
    () => state.search
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  const router = useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href),
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      refresh: () => {},
      prefetch: () => {},
    }),
    []
  );
  return router;
}

export function redirect(href: string): never {
  navigate(href);
  throw new Error(`HARNESS_REDIRECT:${href}`);
}

export function notFound(): never {
  throw new Error('HARNESS_NOT_FOUND');
}