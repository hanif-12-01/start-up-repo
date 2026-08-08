'use client';

import { useSyncExternalStore } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';

type Appearance = 'SYSTEM' | 'LIGHT' | 'DARK';

const emptySubscribe = () => () => {};

function getThemeSnapshot(): Appearance {
  if (typeof window === 'undefined') return 'SYSTEM';
  return (localStorage.getItem('ww-theme') as Appearance | null) || 'SYSTEM';
}

function getMountedSnapshot(): boolean {
  return typeof window !== 'undefined';
}

function getServerSnapshot(): Appearance {
  return 'SYSTEM';
}

function getServerMountedSnapshot(): boolean {
  return false;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const mounted = useSyncExternalStore(emptySubscribe, getMountedSnapshot, getServerMountedSnapshot);
  const theme = useSyncExternalStore(emptySubscribe, getThemeSnapshot, getServerSnapshot);

  const changeTheme = (next: Appearance) => {
    localStorage.setItem('ww-theme', next);
    document.cookie = `ww-theme=${encodeURIComponent(next)}; path=/; max-age=31536000; SameSite=Lax`;
    const dark = next === 'DARK' || (next === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.themePreference = next;
    window.dispatchEvent(new Event('storage'));
  };

  if (!mounted) return <div className={`h-8 w-24 rounded-lg bg-[var(--surface-muted)] ${className}`} aria-hidden="true" />;

  return (
    <div role="radiogroup" aria-label="Pilih tema tampilan" className={`inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 ${className}`}>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'LIGHT'}
        title="Tema terang"
        aria-label="Tema terang"
        onClick={() => changeTheme('LIGHT')}
        className={`rounded-lg p-1.5 transition-colors ${theme === 'LIGHT' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'DARK'}
        title="Tema gelap"
        aria-label="Tema gelap"
        onClick={() => changeTheme('DARK')}
        className={`rounded-lg p-1.5 transition-colors ${theme === 'DARK' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'SYSTEM'}
        title="Ikuti sistem"
        aria-label="Ikuti sistem"
        onClick={() => changeTheme('SYSTEM')}
        className={`rounded-lg p-1.5 transition-colors ${theme === 'SYSTEM' ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
      >
        <Laptop className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
