'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { fieldClass } from '@/components/product/WorkspaceUI';

export function PasswordInput({
  id,
  name = 'password',
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  describedBy,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  autoComplete: 'current-password' | 'new-password';
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} pr-12`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
