"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchActiveBusinessAction } from "@/app/actions/business";
import { Briefcase, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Business {
  id: string;
  name: string;
}

interface BusinessSwitcherProps {
  businesses: Business[];
  activeBusinessId: string;
}

export function BusinessSwitcher({ businesses, activeBusinessId }: BusinessSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  const handleSelect = (businessId: string) => {
    setIsOpen(false);
    if (businessId === activeBusinessId) return;

    setErrorMsg("");
    startTransition(async () => {
      try {
        const res = await switchActiveBusinessAction(businessId);
        if (res.success) {
          router.refresh();
        } else {
          setErrorMsg(res.error || "Gagal mengganti usaha.");
        }
      } catch (err) {
        setErrorMsg("Terjadi kesalahan koneksi.");
      }
    });
  };

  if (businesses.length === 0) {
    return (
      <div className="rounded-xl bg-yellow-50 p-3 text-xs text-yellow-700">
        Belum ada usaha terdaftar.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        Usaha aktif: <span className="text-brand-ink">{activeBusiness?.name}</span>
      </p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-brand-ink shadow-sm hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-green/20"
      >
        <div className="flex items-center gap-2 truncate">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-green" />
          ) : (
            <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="truncate">{activeBusiness?.name || "Pilih Usaha"}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {errorMsg && (
        <p className="mt-1 text-[10px] text-red-500 font-medium">{errorMsg}</p>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <ul className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
            {businesses.map((business) => (
              <li key={business.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(business.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all",
                    business.id === activeBusinessId
                      ? "bg-brand-greenSoft text-brand-greenDark"
                      : "text-slate-600 hover:bg-slate-50 hover:text-brand-ink"
                  )}
                >
                  <span className="truncate">{business.name}</span>
                  {business.id === activeBusinessId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 ml-2" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}