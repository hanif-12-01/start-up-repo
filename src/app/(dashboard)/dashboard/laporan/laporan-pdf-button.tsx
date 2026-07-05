"use client";

import { useState } from "react";
import { Download, Loader2, Lock } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export function LaporanPdfButton({
  month,
  year,
  planCode,
}: {
  month?: number;
  year?: number;
  planCode?: string;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isFree = planCode === "FREE";

  async function handleDownload() {
    if (isFree) {
      toast("Unduh laporan PDF terkunci. Silakan upgrade ke paket Pro.", "error");
      router.push("/dashboard/harga-paket");
      return;
    }

    setLoading(true);
    try {
      const urlParams = new URLSearchParams();
      if (month) urlParams.append("month", String(month));
      if (year) urlParams.append("year", String(year));
      const queryString = urlParams.toString();
      const endpoint = queryString ? `/api/laporan/pdf?${queryString}` : "/api/laporan/pdf";
      const res = await fetch(endpoint);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal mengunduh laporan PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
        "Laporan-WattWise.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Laporan PDF berhasil diunduh!", "success");
    } catch (err: any) {
      toast(err.message ?? "Gagal mengunduh laporan PDF", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={isFree ? "btn btn-outline border-slate-200 text-slate-400 bg-slate-50 cursor-pointer" : "btn-primary"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFree ? (
        <Lock className="h-4 w-4 text-slate-400" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? "Mengunduh..." : isFree ? "Unduh PDF (Premium)" : "Unduh Laporan PDF"}
    </button>
  );
}
