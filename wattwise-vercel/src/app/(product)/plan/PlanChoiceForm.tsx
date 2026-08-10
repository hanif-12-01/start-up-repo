'use client';

import { useActionState } from 'react';
import { selectPlanAction } from './actions';
import { StaggerGroup } from '@/components/motion/StaggerGroup';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { Reveal } from '@/components/motion/Reveal';

export function PlanChoiceForm() {
  const [state, formAction, isPending] = useActionState(selectPlanAction, null);

  return (
    <div className="space-y-4">
      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="p-3 bg-[var(--danger-surface)]/80 border border-[var(--danger-border)] rounded-md text-sm text-[var(--danger)]">
            {state.error}
          </div>
        </Reveal>
      )}

      <StaggerGroup className="space-y-4">
        <form action={formAction}>
          <input type="hidden" name="plan" value="FREE" />
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className="w-full p-4 bg-[var(--surface)] border-2 border-[var(--border-strong)] hover:border-[var(--primary)] rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
            >
              <span className="block text-lg font-semibold text-[var(--foreground)]">Gratis</span>
              <span className="block text-sm text-[var(--muted)] mt-1">
                1 lokasi usaha, pencatatan dasar, dan pratinjau diagnosis.
              </span>
            </button>
          </InteractiveMotion>
        </form>

        <form action={formAction}>
          <input type="hidden" name="plan" value="PRO_TRIAL" />
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className="w-full p-4 bg-[var(--primary-soft)]/40 border-2 border-[var(--primary)]/60 hover:border-[var(--primary)] rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
            >
              <span className="block text-lg font-semibold text-[var(--primary)]">Pro Trial — 30 Hari</span>
              <span className="block text-sm text-[var(--muted)] mt-1">
                Fitur lengkap diagnosis, rencana hemat, dan laporan. Tanpa biaya, tanpa kartu kredit.
              </span>
              <span className="block text-xs text-[var(--muted)] mt-2">
                Trial hanya dapat digunakan satu kali dan tidak dapat diperpanjang.
              </span>
            </button>
          </InteractiveMotion>
        </form>
      </StaggerGroup>
    </div>
  );
}
