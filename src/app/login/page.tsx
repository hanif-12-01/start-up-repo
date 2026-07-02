"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, AlertCircle, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Silakan isi semua kolom input");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError("Email atau password salah. Silakan periksa kembali.");
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch {
      setError("Terjadi kesalahan sistem. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow-soft rounded-2xl border border-slate-100 sm:px-10">
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-brand-ink">
            Alamat Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@tokomu.com"
            className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 text-brand-ink placeholder-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-brand-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full rounded-xl border border-slate-200 px-4 py-3 text-brand-ink placeholder-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 sm:text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center items-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-greenDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Memproses..." : "Masuk"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-6 text-center">
        <p className="text-sm text-brand-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-brand-green hover:underline">
            Daftar Gratis Sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white shadow-soft">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-brand-ink">
            WattWise <span className="text-brand-green">AI</span>
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold text-brand-ink tracking-tight">
          Masuk ke Akun Anda
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Kelola konsumsi listrik dan hemat biaya operasional UMKM Anda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white py-8 px-4 shadow-soft rounded-2xl border border-slate-100 sm:px-10 text-center text-sm text-slate-500 animate-pulse">
              Memuat form login...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}