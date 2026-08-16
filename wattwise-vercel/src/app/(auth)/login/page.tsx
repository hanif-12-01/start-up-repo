'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { DemoAccessCard } from '@/components/auth/DemoAccessCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  fieldClass,
  labelClass,
  primaryButton,
} from '@/components/product/WorkspaceUI';
import { authClient } from '@/server/auth/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email dan kata sandi belum lengkap. Isi keduanya, lalu coba masuk kembali.');
      return;
    }

    setLoading(true);
    try {
      const response = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.error) {
        setError('Kami tidak dapat masuk karena email atau kata sandi tidak cocok. Periksa kembali penulisannya, lalu coba lagi.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Layanan masuk tidak merespons. Periksa koneksi Anda, tunggu sebentar, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Selamat datang kembali"
      title="Masuk ke ruang kerja Anda"
      description="Lanjutkan pencatatan tagihan, tinjau perubahan biaya, dan lihat tindakan yang sedang berjalan."
    >
      {error && (
        <div id="login-error" role="alert" className="mb-5 flex gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] p-4 text-sm leading-6 text-[var(--danger)]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={loading}>
        <div>
          <label htmlFor="email" className={labelClass}>Alamat email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={loading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
            placeholder="nama@usaha.com"
            autoComplete="email"
            inputMode="email"
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>Kata sandi</label>
            <span className="mb-1.5 text-xs text-[var(--muted)]">Minimal 8 karakter</span>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            placeholder="Masukkan kata sandi"
            autoComplete="current-password"
            describedBy={error ? 'login-error' : undefined}
          />
        </div>

        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Memeriksa akun...' : 'Masuk ke WattWise'}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
        </button>
      </form>

      <DemoAccessCard onFillCredentials={handleFillDemoCredentials} disabled={loading} />

      <p className="mt-7 text-center text-sm text-[var(--muted)]">
        Belum memiliki akun?{' '}
        <Link href="/register" className="font-bold text-[var(--primary)] underline-offset-4 hover:underline">
          Buat akun gratis
        </Link>
      </p>
    </AuthShell>
  );
}
