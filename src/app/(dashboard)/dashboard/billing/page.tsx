import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPlan } from "@/services/subscription";
import Link from "next/link";
import { PageHeader } from "@/components/ui/common";
import { CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { cancelSubscriptionAction } from "@/actions/billing";

export const metadata = {
  title: "Billing & Langganan - WattWise AI",
  description: "Kelola langganan dan riwayat pembayaran WattWise AI Anda.",
};

export default async function BillingDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Get subscription
  const { subscription, plan } = await getUserPlan(userId);

  // Get payments history
  const payments = await db.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
    }).format(date);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Billing & Langganan"
          subtitle="Pantau status paket aktif, kelola detail tagihan, dan lihat riwayat pembayaran."
        />
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {plan && plan.code !== "FREE" && (
            <form action={async () => {
              "use server";
              await cancelSubscriptionAction();
            }}>
              <button
                type="submit"
                className="btn btn-outline text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold py-2.5 px-4 flex items-center gap-1.5"
              >
                Batalkan Paket
              </button>
            </form>
          )}
          <Link
            href="/dashboard/harga-paket"
            className="btn btn-primary text-xs font-bold py-2.5 px-4 flex items-center gap-1.5"
          >
            Upgrade / Ubah Paket <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="card border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.01),transparent_40%)] p-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-emerald-500" /> Informasi Langganan
        </h2>
        {plan ? (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Paket Saat Ini</p>
              <p className="text-lg font-bold text-slate-800">{plan.name}</p>
              <p className="text-xs text-slate-500">{plan.description}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status Langganan</p>
              <div className="flex items-center gap-1.5">
                {subscription?.status === "ACTIVE" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700">Aktif</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-bold text-amber-700">{subscription?.status}</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Masa Berlaku Hingga</p>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                {subscription?.endsAt ? formatDate(subscription.endsAt) : "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Anda belum memiliki paket aktif. Silakan pilih paket langganan.</p>
        )}
      </div>

      {/* Invoice History Table */}
      <div className="card border border-slate-200/80 p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Riwayat Pembayaran</h2>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Belum ada riwayat pembayaran untuk akun Anda.
          </div>
        ) : (
          <>
            {/* Desktop and Tablet Landscape View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">No. Invoice</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">{payment.invoiceNo}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {payment.method === "VIRTUAL_ACCOUNT" ? "Virtual Account" : payment.method}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{formatCurrency(payment.amountIdr)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          {payment.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Berhasil
                            </span>
                          ) : payment.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold text-amber-700">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 font-semibold text-rose-700">
                              <AlertTriangle className="h-3 w-3" /> {payment.status === "FAILED" ? "Gagal" : payment.status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dashboard/billing/${payment.id}`}
                          className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                        >
                          Detail Invoice &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile and Tablet Portrait Cards View */}
            <div className="lg:hidden space-y-3.5">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-slate-100 p-4 space-y-3 hover:border-slate-200 transition-colors bg-white shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {payment.invoiceNo}
                    </span>
                    <div>
                      {payment.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Berhasil
                        </span>
                      ) : payment.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> {payment.status === "FAILED" ? "Gagal" : payment.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-500 border-t border-slate-50 pt-2.5">
                    <div>
                      <p className="font-semibold text-slate-400">TANGGAL</p>
                      <p className="mt-0.5 font-medium text-slate-700">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400">METODE</p>
                      <p className="mt-0.5 font-medium text-slate-700">
                        {payment.method === "VIRTUAL_ACCOUNT" ? "Virtual Account" : payment.method || "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-semibold text-slate-400">TOTAL</p>
                      <p className="mt-0.5 text-xs font-extrabold text-slate-800">{formatCurrency(payment.amountIdr)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-2.5 flex justify-end">
                    <Link
                      href={`/dashboard/billing/${payment.id}`}
                      className="w-full text-center sm:w-auto btn btn-outline py-1.5 px-3.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Detail Invoice &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
