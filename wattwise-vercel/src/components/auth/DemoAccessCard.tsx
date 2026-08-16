'use client';

import { useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export const DEMO_ACCOUNT_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_EMAIL || 'wattwise.jury.demo@example.com';
export const DEMO_ACCOUNT_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'password123';

export function DemoAccessCard({
  onFillCredentials,
  disabled = false,
}: {
  onFillCredentials: (email: string, password: string) => void;
  disabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section
      id="demo-access-card"
      aria-labelledby="demo-access-title"
      className="mt-6 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-muted)]/70 p-4 sm:p-5 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <h2 id="demo-access-title" className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">
            Coba akun demo WattWise
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
          Data demo / sintetis
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        Jelajahi alur WattWise menggunakan data usaha sintetis yang telah disiapkan untuk demonstrasi.
      </p>

      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--control-background)]/80 p-3 text-[11px] leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">3 tahap histori usaha tersedia:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>
            <span className="font-medium text-[var(--foreground)]">DEMO 01</span> — Usaha Baru · 2 Bulan (estimasi historis)
          </li>
          <li>
            <span className="font-medium text-[var(--foreground)]">DEMO 02</span> — Histori Berkembang · 5 Bulan (estimasi historis)
          </li>
          <li>
            <span className="font-medium text-[var(--foreground)]">DEMO 03</span> — Prediksi AI · 6 Bulan (Prediksi AI N-BEATS)
          </li>
        </ul>
      </div>

      <div className="mt-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--control-background)] px-3 py-2">
          <span className="shrink-0 font-medium text-[var(--muted)]">Email:</span>
          <code id="demo-email-display" className="truncate font-mono text-xs font-semibold text-[var(--foreground)] select-all">
            {DEMO_ACCOUNT_EMAIL}
          </code>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--control-background)] px-3 py-2">
          <span className="shrink-0 font-medium text-[var(--muted)]">Kata sandi:</span>
          <div className="flex items-center gap-2">
            <code id="demo-password-display" className="font-mono text-xs font-semibold text-[var(--foreground)]">
              {showPassword ? DEMO_ACCOUNT_PASSWORD : '••••••••••••'}
            </code>
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              aria-label={showPassword ? 'Sembunyikan kata sandi demo' : 'Tampilkan kata sandi demo'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tampilkan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        id="btn-use-demo-account"
        disabled={disabled}
        onClick={() => onFillCredentials(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD)}
        className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3.5 py-2.5 text-xs font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Gunakan akun demo
      </button>

      <p className="mt-2.5 text-center text-[11px] leading-4 text-[var(--muted)]">
        Data pada akun demo dapat digunakan untuk eksplorasi fitur dan tidak mewakili usaha nyata.
      </p>
    </section>
  );
}
