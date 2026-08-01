import type {
  OutcomeDataQualityCode,
  OutcomeDirection,
  OverallOutcomeCode,
} from '@/server/db/schema/outcomes';

export const OUTCOME_DIRECTION_LABELS: Record<OutcomeDirection, string> = {
  LOWER: 'Lebih rendah',
  SIMILAR: 'Serupa',
  HIGHER: 'Lebih tinggi',
  UNAVAILABLE: 'Data belum tersedia',
};

export const OUTCOME_DATA_QUALITY_LABELS: Record<OutcomeDataQualityCode, string> = {
  USAGE_COMPLETE: 'Data biaya dan pemakaian tersedia',
  TARIFF_CONTEXT_ONLY: 'Data biaya dan tarif tersedia',
  COST_ONLY: 'Evaluasi berdasarkan biaya saja',
};

export const OVERALL_OUTCOME_LABELS: Record<OverallOutcomeCode, string> = {
  POSITIVE_SIGNAL: 'Ada sinyal perbaikan',
  NO_CLEAR_CHANGE: 'Belum ada perubahan berarti',
  NEGATIVE_SIGNAL: 'Ada sinyal kenaikan',
  MIXED_SIGNAL: 'Hasil perubahan campuran',
  INCONCLUSIVE: 'Belum dapat disimpulkan',
};
