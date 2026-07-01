"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Zap, Store, ArrowRight, LogOut } from "lucide-react";

export default function OnboardingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 border border-slate-100 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-brand-green text-white shadow-soft">
          <Zap className="h-8 w-8 fill-current" />
        </div>

        <h1 className="text-2xl font-bold text-brand-ink mb-2">
          Selamat Datang, {session?.user?.name?.split(" ")[0] || "Pengguna"}!
        </h1>

        <p className="text-slate-600 mb-8">
          Untuk mulai memantau dan menghemat listrik, mari siapkan profil usaha Anda terlebih dahulu.
        </p>

        <div className="bg-brand-blueSoft rounded-xl p-4 mb-8 text-left border border-blue-100 flex items-start gap-3">
          <Store className="h-5 w-5 text-brand-blue shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-brand-ink text-sm">Informasi Usaha</h3>
            <p className="text-xs text-slate-600 mt-1">
              Siapkan nama usaha, jenis usaha, dan lokasi untuk menyesuaikan rekomendasi dan analisis khusus untuk bisnis Anda.
            </p>
          </div>
        </div>

        {/* ponytail: placeholder — replace with full onboarding form when business creation API ready */}
        <Link
          href="/dashboard"
          className="flex w-full justify-center items-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-greenDark transition-all"
        >
          Mulai Atur Profil Usaha
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full justify-center items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-brand-ink transition-all"
          >
            <LogOut className="h-4 w-4" />
            Keluar dari Akun
          </button>
        </div>
      </div>
    </div>
  );
}