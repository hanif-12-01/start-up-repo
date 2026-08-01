import type { ActionPlanStatus } from '@/server/db/schema/action-plans';

export const ACTION_PLAN_STATUS_LABELS: Record<ActionPlanStatus, string> = {
  PLANNED: 'Direncanakan',
  IN_PROGRESS: 'Sedang Dijalankan',
  COMPLETED: 'Tindakan Selesai',
  CANCELLED: 'Dibatalkan',
};

export const ACTION_PLAN_COMPLETION_COPY =
  'Tindakan telah dicatat sebagai selesai. Dampaknya belum dapat ditentukan sampai tagihan berikutnya tersedia.';

export const ACTION_PLAN_CANCELLATION_COPY =
  'Rencana dibatalkan. Tidak ada hasil penghematan yang disimpulkan.';

export const ACTION_PLAN_DISCLAIMER =
  'Rencana ini dibuat dari data tagihan dan hasil pengamatan yang Anda masukkan. Rencana ini tidak menjamin besarnya penghematan dan bukan instruksi perbaikan kelistrikan.';
