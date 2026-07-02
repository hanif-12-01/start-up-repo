"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/* ---------- StatCard ---------- */
export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "green",
  sub,
  badge,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  tone?: "green" | "blue" | "yellow" | "slate" | "red";
  sub?: ReactNode;
  badge?: string;
}) {
  const tones = {
    green: "bg-brand-greenSoft text-brand-greenDark",
    blue: "bg-brand-blueSoft text-brand-blue",
    yellow: "bg-brand-yellowSoft text-yellow-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon && (
          <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}>{icon}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-brand-ink md:text-[1.75rem]">{value}</p>
        {badge && <StatusBadge status={badge} />}
        {sub}
      </div>
      {helper && <p className="text-xs leading-relaxed text-slate-400">{helper}</p>}
    </div>
  );
}

/* ---------- StatusBadge ---------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Normal: "bg-brand-greenSoft text-brand-greenDark",
    Aman: "bg-brand-greenSoft text-brand-greenDark",
    Rendah: "bg-brand-greenSoft text-brand-greenDark",
    Mudah: "bg-brand-greenSoft text-brand-greenDark",
    "Perlu Dicek": "bg-brand-yellowSoft text-yellow-700",
    "Perlu Perhatian": "bg-brand-yellowSoft text-yellow-700",
    Sedang: "bg-brand-yellowSoft text-yellow-700",
    Boros: "bg-red-50 text-red-600",
    Tinggi: "bg-red-50 text-red-600",
    Lanjutan: "bg-red-50 text-red-600",
    "Belum Ada Data": "bg-slate-100 text-slate-600",
  };
  return <span className={cn("badge", map[status] ?? "bg-slate-100 text-slate-600")}>{status}</span>;
}

/* ---------- PageHeader ---------- */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-ink md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4 animate-[fadeIn_.15s_ease]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}