"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import type { UiCashflow } from "@/services/cashflow";
import {
  approveCashflow,
  deleteCashflow,
  rejectCashflow,
} from "@/app/actions/cashflow";
import { useToast } from "@/components/ui/toast";
import { formatRupiah, cn } from "@/lib/utils";

const DIRECTION_LABEL: Record<UiCashflow["direction"], string> = {
  IN: "Kas Masuk",
  OUT: "Kas Keluar",
};

const TYPE_LABEL: Record<UiCashflow["type"], string> = {
  SALES: "Penjualan",
  SERVICE_INCOME: "Jasa / Layanan",
  OTHER_INCOME: "Pemasukan Lain",
  ELECTRICITY_BILL: "Tagihan Listrik",
  RAW_MATERIAL: "Bahan Baku",
  SALARY: "Gaji Karyawan",
  RENT: "Sewa Tempat",
  WATER: "Air",
  INTERNET: "Internet",
  MAINTENANCE: "Perawatan",
  TRANSPORT: "Transportasi",
  OTHER_EXPENSE: "Pengeluaran Lain",
};

const SOURCE_LABEL: Record<UiCashflow["source"], string> = {
  MANUAL: "Manual",
  AUTO_ELECTRICITY: "Otomatis dari Listrik",
  AUTO_PREDICTION: "Otomatis dari Prediksi",
  IMPORT: "Import",
};

const STATUS_LABEL: Record<UiCashflow["status"], string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Menunggu Persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const STATUS_TONE: Record<UiCashflow["status"], string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200/60",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200/60",
};

function formatTanggal(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(d),
  );
}

export function CashflowTable({
  cashflows,
  onMutate,
}: {
  cashflows: UiCashflow[];
  onMutate?: () => void;
}) {
  if (cashflows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-10 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Belum ada transaksi cashflow
        </p>
        <p className="mt-1 max-w-md text-xs text-slate-500">
          Tambahkan kas masuk atau kas keluar pertama Anda lewat formulir di
          samping.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Desktop / tablet: proper table */}
      <div className="hidden md:block">
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Arah / Kategori</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashflows.map((cf) => (
                <Row key={cf.id} cf={cf} onMutate={onMutate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="divide-y divide-slate-100 md:hidden">
        {cashflows.map((cf) => (
          <CardRow key={cf.id} cf={cf} onMutate={onMutate} />
        ))}
      </div>
    </div>
  );
}

function Row({ cf, onMutate }: { cf: UiCashflow; onMutate?: () => void }) {
  return (
    <tr className="text-[13px] text-slate-700">
      <td className="whitespace-nowrap px-4 py-3 font-semibold">
        {formatTanggal(cf.occurredAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {cf.direction === "IN" ? (
            <ArrowDownCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {DIRECTION_LABEL[cf.direction]}
            </p>
            <p className="truncate text-xs font-semibold text-slate-700">
              {TYPE_LABEL[cf.type]}
            </p>
          </div>
        </div>
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums",
          cf.direction === "IN" ? "text-emerald-700" : "text-rose-700",
        )}
      >
        {cf.direction === "IN" ? "+" : "-"} {formatRupiah(cf.amountIdr)}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "badge whitespace-nowrap",
            STATUS_TONE[cf.status],
          )}
        >
          {STATUS_LABEL[cf.status]}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-slate-500">
        {SOURCE_LABEL[cf.source]}
      </td>
      <td className="max-w-[220px] px-4 py-3 text-[12px] text-slate-500">
        <p className="truncate" title={cf.description ?? undefined}>
          {cf.description || "—"}
        </p>
        {cf.referenceNo && (
          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Ref: {cf.referenceNo}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <RowActions cf={cf} onMutate={onMutate} />
      </td>
    </tr>
  );
}

function CardRow({
  cf,
  onMutate,
}: {
  cf: UiCashflow;
  onMutate?: () => void;
}) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {cf.direction === "IN" ? (
              <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 text-rose-600" />
            )}
            <span className="text-xs font-bold text-slate-700">
              {TYPE_LABEL[cf.type]}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {formatTanggal(cf.occurredAt)} · {SOURCE_LABEL[cf.source]}
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-extrabold tabular-nums",
            cf.direction === "IN" ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {cf.direction === "IN" ? "+" : "-"} {formatRupiah(cf.amountIdr)}
        </p>
      </div>

      {cf.description && (
        <p className="text-xs text-slate-500">{cf.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className={cn("badge", STATUS_TONE[cf.status])}>
          {STATUS_LABEL[cf.status]}
        </span>
        <RowActions cf={cf} onMutate={onMutate} />
      </div>
    </div>
  );
}

function RowActions({
  cf,
  onMutate,
}: {
  cf: UiCashflow;
  onMutate?: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function doApprove() {
    startTransition(async () => {
      const res = await approveCashflow(cf.id);
      toast(res.message, res.success ? "success" : "error");
      if (res.success) onMutate?.();
    });
  }

  function doReject() {
    const reason = rejectReason.trim();
    if (reason === "") {
      toast("Alasan penolakan wajib diisi.", "error");
      return;
    }
    startTransition(async () => {
      const res = await rejectCashflow(cf.id, reason);
      toast(res.message, res.success ? "success" : "error");
      if (res.success) {
        setRejectOpen(false);
        setRejectReason("");
        onMutate?.();
      }
    });
  }

  function doDelete() {
    startTransition(async () => {
      const res = await deleteCashflow(cf.id);
      toast(res.message, res.success ? "success" : "error");
      if (res.success) {
        setConfirmDelete(false);
        onMutate?.();
      }
    });
  }

  const canApproveReject = cf.status === "PENDING_APPROVAL";

  if (rejectOpen) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Alasan penolakan"
          className="input h-8 min-w-[180px] px-2 py-1 text-xs"
          maxLength={200}
          disabled={pending}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn-outline h-7 px-2 py-0 text-[11px]"
            onClick={() => {
              setRejectOpen(false);
              setRejectReason("");
            }}
            disabled={pending}
          >
            Batal
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-rose-600 px-2 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            onClick={doReject}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Tolak
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">
          Yakin hapus?
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn-outline h-7 px-2 py-0 text-[11px]"
            onClick={() => setConfirmDelete(false)}
            disabled={pending}
          >
            Batal
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-rose-600 px-2 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            onClick={doDelete}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Hapus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canApproveReject && (
        <>
          <button
            type="button"
            title="Setujui"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            onClick={doApprove}
            disabled={pending}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Setujui</span>
          </button>
          <button
            type="button"
            title="Tolak"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            onClick={() => setRejectOpen(true)}
            disabled={pending}
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Tolak</span>
          </button>
        </>
      )}
      <button
        type="button"
        title="Hapus (soft delete)"
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        onClick={() => setConfirmDelete(true)}
        disabled={pending}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Hapus</span>
      </button>
    </div>
  );
}
