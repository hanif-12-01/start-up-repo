'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/server/auth/client';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Mohon isi semua bidang yang diperlukan.');
      return;
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    setLoading(true);

    try {
      const res = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        setError(res.error.message || 'Pendaftaran gagal. Silakan coba lagi.');
        setLoading(false);
      } else {
        router.push('/plan');
      }
    } catch {
      setError('Terjadi kesalahan pada sistem. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <PageReveal className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
        <Reveal direction="down">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-400">WattWise AI</h1>
            <p className="text-sm text-slate-400">Daftar akun baru untuk memulai pemantauan energi.</p>
          </div>
        </Reveal>

        {error && (
          <Reveal direction="up" duration={0.2}>
            <div role="alert" className="p-3 bg-red-950/80 border border-red-800 rounded-md text-sm text-red-200">
              {error}
            </div>
          </Reveal>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Reveal direction="up" delay={0.05}>
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="Nama Anda"
              />
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.1}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="nama@perusahaan.com"
              />
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.15}>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Kata Sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="Minimal 8 karakter"
              />
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.2}>
            <InteractiveMotion>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Daftar Akun'}
              </button>
            </InteractiveMotion>
          </Reveal>
        </form>

        <Reveal direction="up" delay={0.25}>
          <div className="text-center text-xs text-slate-400">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline font-medium">
              Masuk di sini
            </Link>
          </div>
        </Reveal>
      </PageReveal>
    </main>
  );
}
