"use client";

import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { paketHarga } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function HargaPage() {
  const { toast } = useToast();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Pilih Paket Sesuai Kebutuhan"
        subtitle="Mulai dari gratis untuk usaha kecil, hingga fitur lengkap untuk memantau beberapa lokasi sekaligus."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {paketHarga.map((paket) => (
          <div
            key={paket.nama}
            className={cn(
              "card relative flex flex-col justify-between transition hover:shadow-soft",
              paket.populer && "border-brand-green ring-2 ring-brand-green/10"
            )}
          >
            {paket.badge && (
              <div className="absolute -top-3 left-1/2 w-max -translate-x-1/2 rounded-full bg-brand-green px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-soft">
                {paket.badge}
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-500">{paket.nama}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-brand-ink">
                  {paket.harga}
                </span>
                <span className="mb-1 text-sm font-medium text-slate-500">{paket.hargaSub}</span>
              </div>

              <ul className="mt-6 space-y-4">
                {paket.fitur.map((fitur) => (
                  <li key={fitur} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span className="text-slate-600">{fitur}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() =>
                toast(
                  `Terima kasih! Anda memilih Paket ${paket.nama}. Sistem pembayaran akan tersedia pada versi berikutnya.`,
                  "info"
                )
              }
              className={cn("mt-8 w-full", paket.populer ? "btn-primary" : "btn-outline")}
            >
              {paket.harga === "Rp0" ? "Pakai Gratis" : "Pilih Paket"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}