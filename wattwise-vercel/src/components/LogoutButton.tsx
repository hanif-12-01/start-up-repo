'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/server/auth/client';

export function LogoutButton({
  className,
  label = 'Keluar (Logout)',
}: {
  className?: string;
  label?: string;
} = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authClient.signOut();
      if (res?.error) {
        setErrorMessage('Gagal keluar. Coba lagi.');
        setLoading(false);
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch {
      setErrorMessage('Gagal keluar. Coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={
          className ??
          'px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md text-sm font-medium text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50'
        }
      >
        {loading ? 'Keluar...' : label}
      </button>
      {errorMessage && (
        <p role="status" className="text-xs font-semibold text-rose-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
