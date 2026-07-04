"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Scale,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/common";
import { formatRupiah } from "@/lib/utils";
import type {
  MonthlyCashflowSummary,
  UiCashflow,
} from "@/services/cashflow";
import { CashflowForm } from "@/components/cashflow/cashflow-form";
import { CashflowTable } from "@/components/cashflow/cashflow-table";

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function statusMeta(status: MonthlyCashflowSummary["cashFlowStatus"]) {
  switch (status) {
    case "SEHAT":
      return {
        label: "SEHAT",
        tone: "green" as const,
        helper: "Pemasukan mencukupi pengeluaran dengan sisa kas sehat.",
      };
    case "WASPADA":
      return {
        label: "WASPADA",
        tone: "yellow" as const,
        helper: "Kas positif tapi sisa kas tipis. Awasi pengeluaran.",
      };
    case "KRITIS":
      return {
        label: "KRITIS",
        tone: "red" as const,
        helper: "Pengeluaran melebihi pemasukan. Perlu tindakan segera.",
      };
  }
}

export default function CashflowClient({
  businessId,
  summary,
  cashflows,
}: {
  businessId: string;
  summary: MonthlyCashflowSummary;
  cashflows: UiCashflow[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const periode = `${BULAN_ID[summary.month - 1]} ${summary.year}`;
  const meta = statusMeta(summary.cashFlowStatus);
  const marginText =
    summary.marginPercent === null
      ? "—"
      : `${summary.marginPercent.toFixed(1)}%`;

  const pendingCount = cashflows.filter(
    (c) => c.status === "PENDING_APPROVAL",
  ).length;

  return (
    <div>
      <PageHeader
        title="Cashflow Bisnis"
        subtitle={`Ringkasan kas masuk dan keluar untuk periode ${periode}.`}
      />

      {pendingCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50 p-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              {pendingCount} transaksi menunggu persetujuan
            </h4>
            <p className="mt-0.5 text-xs text-amber-800">
              Cek daftar di bawah dan setujui atau tolak transaksi yang
              diinput staff.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Kas Masuk"
          value={formatRupiah(summary.totalIncomeIdr)}
          helper={`Sepanjang ${periode}`}
          tone="green"
          icon={<ArrowDownCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Total Kas Keluar"
          value={formatRupiah(summary.totalExpenseIdr)}
          helper={`Sepanjang ${periode}`}
          tone="red"
          icon={<ArrowUpCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Selisih Kas"
          value={
            (summary.netCashflowIdr >= 0 ? "" : "-") +
            formatRupiah(Math.abs(summary.netCashflowIdr))
          }
          helper="Kas Masuk − Kas Keluar"
          tone={summary.netCashflowIdr >= 0 ? "blue" : "red"}
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <StatCard
          label="Rasio Sisa Kas"
          value={marginText}
          helper={meta.helper}
          tone={meta.tone}
          icon={<Scale className="h-5 w-5" />}
          badge={meta.label}
        />
      </div>

      {/* Body: form + table */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <CashflowForm businessId={businessId} onSuccess={refresh} />
        </div>
        <div className="lg:col-span-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Daftar Transaksi
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Total: {cashflows.length} transaksi
            </p>
          </div>
          <CashflowTable cashflows={cashflows} onMutate={refresh} />
        </div>
      </div>
    </div>
  );
}
