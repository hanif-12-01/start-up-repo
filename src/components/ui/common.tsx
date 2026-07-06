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
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-amber-50 text-amber-600",
    slate: "bg-slate-50 text-slate-600",
    red: "bg-rose-50 text-rose-600",
  };

  const cardBorders = {
    green: "border-t-4 border-t-emerald-500/80 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_40%)]",
    blue: "border-t-4 border-t-blue-500/80 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent_40%)]",
    yellow: "border-t-4 border-t-amber-500/80 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.03),transparent_40%)]",
    slate: "border-t-4 border-t-slate-400/80 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.03),transparent_40%)]",
    red: "border-t-4 border-t-rose-500/80 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.03),transparent_40%)]",
  };

  return (
    <div className={cn("card card-hover flex flex-col gap-3 relative overflow-hidden", cardBorders[tone])}>
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-semibold text-slate-400 tracking-wide uppercase">{label}</span>
        {icon && (
          <span className={cn("grid h-9 w-9 place-items-center rounded-xl transition-all duration-300 hover:scale-105", tones[tone])}>{icon}</span>
        )}
      </div>
      <div className="my-1">
        <p className="text-2xl font-extrabold tracking-tight text-slate-800 md:text-[1.85rem] leading-none">{value}</p>
        {badge && <div className="mt-2"><StatusBadge status={badge} /></div>}
        {sub}
      </div>
      {helper && <p className="text-[11px] leading-relaxed text-slate-400 font-medium mt-auto border-t border-slate-100/50 pt-2">{helper}</p>}
    </div>
  );
}

/* ---------- StatusBadge ---------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Normal: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    Aman: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    Rendah: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    Mudah: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    "Perlu Dicek": "bg-amber-50 text-amber-700 border-amber-200/50",
    "Perlu Perhatian": "bg-amber-50 text-amber-700 border-amber-200/50",
    Sedang: "bg-amber-50 text-amber-700 border-amber-200/50",
    Perawatan: "bg-amber-50 text-amber-700 border-amber-200/50",
    Boros: "bg-rose-50 text-rose-700 border-rose-200/50",
    Tinggi: "bg-rose-50 text-rose-700 border-rose-200/50",
    Lanjutan: "bg-rose-50 text-rose-700 border-rose-200/50",
    "Tidak Aktif": "bg-slate-50 text-slate-500 border-slate-200/60",
    "Belum Ada Data": "bg-slate-50 text-slate-500 border-slate-200/60",
  };
  return <span className={cn("badge", map[status] ?? "bg-slate-50 text-slate-500 border-slate-200/60")}>{status}</span>;
}

/* ---------- PageHeader ---------- */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 border-b border-slate-200/40 pb-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 md:text-3xl leading-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-3xl text-sm text-slate-400 font-medium leading-relaxed">{subtitle}</p>}
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
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm animate-[fadeIn_.15s_ease]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}