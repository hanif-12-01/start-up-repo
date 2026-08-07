'use client';

import { useState } from 'react';
import { authClient } from '@/server/auth/client';

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setMessage('Kata sandi baru minimal 8 karakter dan konfirmasi harus sama.');
      return;
    }
    setPending(true);
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (result.error) {
      setMessage('Kata sandi lama tidak cocok atau perubahan tidak dapat diproses.');
      return;
    }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setMessage('Kata sandi berhasil diperbarui. Sesi lain telah dikeluarkan.');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</div>}
      <label className="block"><span className="mb-1.5 block text-xs font-bold">Kata sandi saat ini</span><input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 focus:ring-2 focus:ring-emerald-500" /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-bold">Kata sandi baru</span><input type="password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 focus:ring-2 focus:ring-emerald-500" /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-bold">Konfirmasi kata sandi</span><input type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-3 focus:ring-2 focus:ring-emerald-500" /></label>
      <button disabled={pending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">{pending ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</button>
    </form>
  );
}
