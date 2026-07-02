"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ChevronLeft,
  DollarSign,
  User,
  CreditCard,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { simulatePaymentSuccessAction, cancelPaymentAction } from "@/actions/billing";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  invoiceNo: string;
  amountIdr: number;
  status: string;
  method: string | null;
  virtualAccount: string | null;
  createdAt: Date;
  planCode: string;
}

export default function InvoiceClient({
  payment,
  planName,
}: {
  payment: Payment;
  planName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const handleCopyVa = () => {
    if (payment.virtualAccount) {
      navigator.clipboard.writeText(payment.virtualAccount);
      setCopied(true);
      toast("Nomor Virtual Account disalin ke clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSimulatePayment = async () => {
    setLoadingPay(true);
    try {
      const res = await simulatePaymentSuccessAction(payment.id);
      if (res.ok) {
        toast("Simulasi pembayaran berhasil! Paket Anda kini aktif.", "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal memproses pembayaran.", "error");
      }
    } catch (e: any) {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoadingPay(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan tagihan ini?")) return;
    setLoadingCancel(true);
    try {
      const res = await cancelPaymentAction(payment.id);
      if (res.ok) {
        toast("Invoice berhasil dibatalkan.", "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal membatalkan invoice.", "error");
      }
    } catch (e: any) {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/billing")}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali ke Billing & Langganan
      </button>

      {/* Invoice Status Banner */}
      <div
        className={cn(
          "rounded-xl border p-4 flex items-start gap-3",
          payment.status === "SUCCESS" && "bg-emerald-50 border-emerald-100 text-emerald-800",
          payment.status === "PENDING" && "bg-amber-50/80 border-amber-100 text-amber-800",
          payment.status === "FAILED" && "bg-rose-50 border-rose-100 text-rose-800"
        )}
      >
        {payment.status === "SUCCESS" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        ) : payment.status === "PENDING" ? (
          <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className="font-bold text-sm">
            {payment.status === "SUCCESS" && "Pembayaran Berhasil"}
            {payment.status === "PENDING" && "Menunggu Pembayaran"}
            {payment.status === "FAILED" && "Tagihan Dibatalkan / Gagal"}
          </h3>
          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
            {payment.status === "SUCCESS" && "Terima kasih! Pembayaran Anda telah diterima dan paket berlangganan Anda sudah aktif."}
            {payment.status === "PENDING" && "Harap lakukan transfer ke nomor Virtual Account di bawah untuk mengaktifkan paket Anda."}
            {payment.status === "FAILED" && "Invoice ini tidak dapat digunakan lagi. Silakan lakukan checkout ulang."}
          </p>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="card border border-slate-200/80 p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">No. Invoice</p>
            <p className="text-sm font-bold text-slate-800">{payment.invoiceNo}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tanggal Dibuat</p>
            <p className="text-xs text-slate-600 font-medium">{formatDate(payment.createdAt)}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">Nama Paket:</span>
            <p className="text-slate-700 font-bold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> {planName}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold">Metode Pembayaran:</span>
            <p className="text-slate-700 font-bold flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Virtual Account (Simulasi)
            </p>
          </div>
        </div>

        {payment.status === "PENDING" && payment.virtualAccount && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
              Nomor Virtual Account (Mandiri / BCA)
            </p>
            <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
              <span className="font-mono text-base font-extrabold text-slate-800 tracking-wider">
                {payment.virtualAccount}
              </span>
              <button
                onClick={handleCopyVa}
                className="btn btn-outline p-1.5 bg-white border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition"
                title="Salin No. VA"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-[10px] text-slate-400 space-y-0.5 leading-relaxed">
              <p>&bull; Masukkan kode bank + nomor Virtual Account di atas pada menu transfer VA bank Anda.</p>
              <p>&bull; Batas waktu transfer: 24 jam semenjak tagihan dibuat.</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Pembayaran</span>
          <span className="text-lg font-extrabold text-slate-800">{formatCurrency(payment.amountIdr)}</span>
        </div>
      </div>

      {/* Simulated checkout actions */}
      {payment.status === "PENDING" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSimulatePayment}
            disabled={loadingPay || loadingCancel}
            className="flex-1 btn btn-primary py-2.5 font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            {loadingPay ? (
              <span className="inline-block animate-pulse">Memproses...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Simulasikan Pembayaran Berhasil
              </>
            )}
          </button>
          <button
            onClick={handleCancelPayment}
            disabled={loadingPay || loadingCancel}
            className="btn btn-outline border-rose-300 text-rose-700 hover:bg-rose-50/50 py-2.5 font-bold"
          >
            {loadingCancel ? "Membatalkan..." : "Batalkan Invoice"}
          </button>
        </div>
      )}
    </div>
  );
}
