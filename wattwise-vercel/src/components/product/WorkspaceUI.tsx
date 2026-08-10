import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Info, ShieldAlert } from 'lucide-react';

export function WorkspacePage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto min-w-0 max-w-7xl space-y-7">{children}</div>
    </main>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--primary)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">{title}</h2>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Surface({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'muted' | 'elevated';
  className?: string;
}) {
  const bgClass =
    variant === 'muted'
      ? 'bg-[var(--surface-muted)]'
      : variant === 'elevated'
        ? 'bg-[var(--surface-elevated)] shadow-[var(--shadow-medium)]'
        : 'bg-[var(--surface)]';
  return (
    <section className={`min-w-0 rounded-2xl border border-[var(--border)] p-5 sm:p-6 ${bgClass} ${className}`}>
      {children}
    </section>
  );
}

export function SoftCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Surface variant="default" className={className}>{children}</Surface>;
}

export function MetricCard({
  label,
  value,
  secondary,
  icon: Icon,
  trend,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  secondary?: string;
  icon?: LucideIcon;
  trend?: { value: string; isPositive?: boolean; isNegative?: boolean };
  className?: string;
}) {
  return (
    <Surface variant="default" className={`flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-[var(--primary)] shrink-0" aria-hidden="true" />}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight tabular-nums sm:text-3xl text-[var(--foreground)]">
            {value}
          </span>
          {trend && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                trend.isNegative
                  ? 'bg-[var(--danger-surface)] text-[var(--danger)]'
                  : trend.isPositive
                    ? 'bg-[var(--success-surface)] text-[var(--success)]'
                    : 'bg-[var(--surface-muted)] text-[var(--muted)]'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
        {secondary && <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{secondary}</p>}
      </div>
    </Surface>
  );
}

export function StatusBadge({
  children,
  variant = 'neutral',
  size = 'md',
}: {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
}) {
  const variantStyles = {
    success: 'bg-[var(--success-surface)] text-[var(--success)] border-[var(--success-border)]',
    warning: 'bg-[var(--warning-surface)] text-[var(--warning)] border-[var(--warning-border)]',
    danger: 'bg-[var(--danger-surface)] text-[var(--danger)] border-[var(--danger-border)]',
    info: 'bg-[var(--info-surface)] text-[var(--info)] border-[var(--info-border)]',
    neutral: 'bg-[var(--surface-muted)] text-[var(--muted)] border-[var(--border)]',
    primary: 'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20',
  };
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-extrabold ${variantStyles[variant]} ${sizeStyles}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-5 py-9 text-center">
      <div className="flex justify-center">
        <Icon className="h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
      </div>
      <h2 className="mt-3 text-lg font-extrabold text-[var(--foreground)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      {href && action && (
        <Link
          href={href}
          className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

export function BusinessSelector({
  businesses,
  selectedId,
  route,
}: {
  businesses: Array<{ id: string; name: string }>;
  selectedId: string;
  route: string;
}) {
  if (businesses.length < 2) return null;
  return (
    <form action={route} method="get" className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Usaha aktif</span>
        <select
          name="businessId"
          defaultValue={selectedId}
          className="min-w-44 rounded-lg border border-[var(--border)] bg-[var(--control-background)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          {businesses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      >
        Pilih
      </button>
    </form>
  );
}

export function DataNotice({
  children,
  title = 'Catatan Transparansi Data',
  variant = 'info',
}: {
  children: React.ReactNode;
  title?: string;
  variant?: 'info' | 'warning';
}) {
  const Icon = variant === 'warning' ? ShieldAlert : Info;
  const variantStyles =
    variant === 'warning'
      ? 'border-[var(--warning-border)] bg-[var(--warning-surface)] text-[var(--warning)]'
      : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]';

  return (
    <aside className={`flex items-start gap-3 rounded-2xl border p-4 text-xs leading-5 ${variantStyles}`}>
      <Icon className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
      <div>
        <strong className="block font-bold text-[var(--foreground)]">{title}</strong>
        <p className="mt-1">{children}</p>
      </div>
    </aside>
  );
}

export const primaryButton =
  'inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-55';

export const secondaryButton =
  'inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55';

export const fieldClass =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--control-background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--focus-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/25 disabled:cursor-not-allowed disabled:bg-[var(--control-disabled)] disabled:opacity-70';

export const labelClass =
  'mb-1.5 block text-xs font-bold text-[var(--foreground)]';

export const helpTextClass = 'mt-1.5 text-xs leading-5 text-[var(--muted)]';

export const errorTextClass = 'mt-1.5 text-xs font-semibold text-[var(--danger)]';
