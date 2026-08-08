'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { updateAppearanceAction } from '../actions';

type Appearance = 'SYSTEM' | 'LIGHT' | 'DARK';

const choices = [
  { value: 'SYSTEM', Icon: Laptop, title: 'Ikuti perangkat', text: 'Berubah otomatis mengikuti preferensi sistem operasi.' },
  { value: 'LIGHT', Icon: Sun, title: 'Terang nyaman', text: 'Latar netral terang dengan aksen hijau menengah.' },
  { value: 'DARK', Icon: Moon, title: 'Gelap', text: 'Palet gelap penuh dengan kontras dan fokus yang tetap jelas.' },
] as const;

function applyTheme(preference: Appearance) {
  localStorage.setItem('ww-theme', preference);
  const dark = preference === 'DARK'
    || (preference === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.themePreference = preference;
}

export function AppearanceForm({
  appearance,
  billAlerts,
  monthlyDigest,
  actionReminders,
}: {
  appearance: Appearance;
  billAlerts: boolean;
  monthlyDigest: boolean;
  actionReminders: boolean;
}) {
  return (
    <form
      action={updateAppearanceAction}
      onChange={(event) => {
        const input = event.nativeEvent.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (input.name === 'appearance') applyTheme(input.value as Appearance);
      }}
    >
      <input type="hidden" name="billAlerts" value={String(billAlerts)} />
      <input type="hidden" name="monthlyDigest" value={String(monthlyDigest)} />
      <input type="hidden" name="actionReminders" value={String(actionReminders)} />
      <fieldset>
        <legend className="sr-only">Pilih tema</legend>
        <div className="grid gap-4 md:grid-cols-3">
          {choices.map(({ value, Icon, title, text }) => (
            <label key={value} className="cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-soft)]">
              <input type="radio" name="appearance" value={value} defaultChecked={appearance === value} className="sr-only" />
              <Icon className="h-6 w-6 text-[var(--primary)]" />
              <strong className="mt-4 block">{title}</strong>
              <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="mt-6 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-white hover:bg-[var(--primary-hover)]">
        Simpan Tampilan
      </button>
    </form>
  );
}
