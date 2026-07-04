"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { createCashflow } from "@/app/actions/cashflow";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Direction = "IN" | "OUT";

const TYPE_OPTIONS: Record<Direction, { value: string; label: string }[]> = {
  IN: [
    { value: "SALES", label: "Penjualan" },
    { value: "SERVICE_INCOME", label: "Jasa / Layanan" },
    { value: "OTHER_INCOME", label: "Pemasukan Lain" },
  ],
  OUT: [
    { value: "ELECTRICITY_BILL", label: "Tagihan Listrik" },
    { value: "RAW_MATERIAL", label: "Bahan Baku" },
    { value: "SALARY", label: "Gaji Karyawan" },
    { value: "RENT", label: "Sewa Tempat" },
    { value: "WATER", label: "Air" },
    { value: "INTERNET", label: "Internet" },
    { value: "MAINTENANCE", label: "Perawatan" },
    { value: "TRANSPORT", label: "Transportasi" },
    { value: "OTHER_EXPENSE", label: "Pengeluaran Lain" },
  ],
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CashflowForm({
  businessId,
  onSuccess,
}: {
  businessId: string;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [direction, setDirection] = useState<Direction>("IN");
  const [type, setType] = useState<string>("SALES");
  const [amount, setAmount] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(todayIso());
  const [description, setDescription] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo(() => TYPE_OPTIONS[direction], [direction]);

  function selectDirection(next: Direction) {
    setDirection(next);
    // Reset type ke opsi pertama jika direction ganti
    setType(TYPE_OPTIONS[next][0].value);
  }

  function validate(): string | null {
    const nominal = Number(amount);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      return "Nominal harus lebih dari Rp0.";
    }
    if (!occurredAt) return "Tanggal transaksi wajib diisi.";
    if (!type) return "Kategori wajib dipilih.";
    if (!direction) return "Arah kas wajib dipilih.";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const res = await createCashflow({
        businessId,
        direction,
        type: type as any,
        amountIdr: Number(amount),
        occurredAt: new Date(occurredAt).toISOString(),
        description: description.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
      });

      if (res.success) {
        toast(res.message, "success");
        // Reset form (kecuali direction/tanggal supaya cepat input berulang)
        setAmount("");
        setDescription("");
        setReferenceNo("");
        onSuccess?.();
      } else {
        setError(res.message);
        toast(res.message, "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">Catat Transaksi Baru</h3>
        <p className="mt-1 text-xs text-slate-500">
          Tambahkan kas masuk atau kas keluar bisnis Anda hari ini.
        </p>
      </div>

      {/* Direction */}
      <div>
        <label className="label">Arah Kas</label>
        <div className="grid grid-cols-2 gap-2">
          <DirectionPill
            active={direction === "IN"}
            onClick={() => selectDirection("IN")}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            label="Kas Masuk"
            tone="green"
          />
          <DirectionPill
            active={direction === "OUT"}
            onClick={() => selectDirection("OUT")}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            label="Kas Keluar"
            tone="red"
          />
        </div>
      </div>

      {/* Type */}
      <div>
        <label htmlFor="cashflow-type" className="label">
          Kategori
        </label>
        <select
          id="cashflow-type"
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={pending}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Amount + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cashflow-amount" className="label">
            Nominal (Rp)
          </label>
          <input
            id="cashflow-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="mis. 250000"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div>
          <label htmlFor="cashflow-date" className="label">
            Tanggal Transaksi
          </label>
          <input
            id="cashflow-date"
            type="date"
            className="input"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            disabled={pending}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="cashflow-desc" className="label">
          Deskripsi <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <input
          id="cashflow-desc"
          type="text"
          placeholder="mis. Penjualan siang ini"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          maxLength={200}
        />
      </div>

      {/* Reference No */}
      <div>
        <label htmlFor="cashflow-ref" className="label">
          No. Referensi <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <input
          id="cashflow-ref"
          type="text"
          placeholder="mis. Nota #012"
          className="input"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          disabled={pending}
          maxLength={100}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-3 text-sm"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
          </>
        ) : (
          "Simpan Transaksi"
        )}
      </button>
    </form>
  );
}

function DirectionPill({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "green" | "red";
}) {
  const activeTone =
    tone === "green"
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : "border-rose-500 bg-rose-50 text-rose-700";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all",
        active
          ? activeTone
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
