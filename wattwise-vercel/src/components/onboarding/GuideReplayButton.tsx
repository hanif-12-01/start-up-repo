'use client';

import { BookOpen } from 'lucide-react';
import { useBeginnerGuide } from './BeginnerGuideContext';

export function GuideReplayButton({
  className = '',
  label = 'Panduan Interaktif',
  closeMenu,
}: {
  className?: string;
  label?: string;
  closeMenu?: () => void;
}) {
  const { startTour } = useBeginnerGuide();

  const handleClick = () => {
    if (closeMenu) closeMenu();
    startTour(0);
  };

  return (
    <button
      type="button"
      data-tour-id="sidebar-guide"
      onClick={handleClick}
      aria-label="Buka panduan interaktif"
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all ${className}`}
    >
      <BookOpen
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]"
      />
      <span>{label}</span>
    </button>
  );
}