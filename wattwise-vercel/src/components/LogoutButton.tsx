'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/server/auth/client';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      router.push('/login');
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md text-sm font-medium text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
    >
      {loading ? 'Keluar...' : 'Keluar (Logout)'}
    </button>
  );
}
