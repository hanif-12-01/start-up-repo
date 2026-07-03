"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function LaporanPdfButton({ month, year }: { month?: number; year?: number }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
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
    <button onClick={handleDownload} disabled={loading} className="btn-primary">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? "Mengunduh..." : "Unduh Laporan PDF"}
    </button>
  );
}
