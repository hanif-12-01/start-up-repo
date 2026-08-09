'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  fieldClass,
  helpTextClass,
  labelClass,
  primaryButton,
} from '@/components/product/WorkspaceUI';
import { authClient } from '@/server/auth/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Data akun belum lengkap. Isi nama, email, dan kata sandi sebelum melanjutkan.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi terlalu pendek. Gunakan sedikitnya 8 karakter, lalu coba kembali.');
      return;
    }

    setLoading(true);
    try {
      const response = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.error) {
        const message = (response.error.message ?? '').toLocaleLowerCase('id');
        setError(
          message.includes('exist') || message.includes('registered') || message.includes('terdaftar')
            ? 'Email ini sudah terdaftar. Masuk dengan akun tersebut atau gunakan alamat email lain.'
            : 'Akun belum dapat dibuat. Periksa kembali data Anda, lalu coba lagi beberapa saat lagi.',
        );
        return;
      }
      router.push('/plan');
      router.refresh();
    } catch {
      setError('Layanan pendaftaran tidak merespons. Periksa koneksi Anda, tunggu sebentar, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Mulai tanpa perangkat tambahan"
      title="Buat ruang kerja WattWise"
      description="Daftarkan akun, pilih jenis usaha, lalu mulai dari satu tagihan listrik yang sudah Anda miliki."
    >
      {error && (
        <div id="register-error" role="alert" className="mb-5 flex gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] p-4 text-sm leading-6 text-[var(--danger)]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={loading}>
        <div>
          <label htmlFor="name" className={labelClass}>Nama lengkap</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            disabled={loading}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            placeholder="Nama Anda"
            autoComplete="name"
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

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
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Kata sandi</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            describedBy="password-help"
          />
          <p id="password-help" className={helpTextClass}>
            <Check className="mr-1 inline h-3.5 w-3.5 text-[var(--success)]" aria-hidden="true" />
            Gunakan sedikitnya 8 karakter yang mudah Anda ingat dan sulit ditebak.
          </p>
        </div>

        <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
          {loading ? 'Membuat akun...' : 'Buat akun dan lanjutkan'}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--muted)]">
        Sudah memiliki akun?{' '}
        <Link href="/login" className="font-bold text-[var(--primary)] underline-offset-4 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </AuthShell>
  );
}
