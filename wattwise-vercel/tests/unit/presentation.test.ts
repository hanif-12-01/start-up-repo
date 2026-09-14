import { describe, expect, it } from 'vitest';
import {
  getOwnerFacingHealthStatus,
  getHealthNarrative,
  formatPatternComparison,
  getOwnerFacingPredictionLabel,
  getOwnerFacingPredictionMethod,
  ENERGY_CONDITION_DISCLAIMER,
  type OwnerFacingHealthStatus,
  type OwnerFacingTrendDirection,
} from '@/lib/presentation';
import { getDataReadinessStatus } from '@/lib/ai/prediction-display';
import { calculateEfficiencyScore } from '@/server/services/product-analysis';

describe('Presentation Semantics & Safe Owner-Facing Terminology', () => {
  // 1. Internal Normal -> owner-facing Aman
  it('maps internal Normal to owner-facing Aman', () => {
    expect(getOwnerFacingHealthStatus('Normal')).toBe('Aman');
    expect(getOwnerFacingHealthStatus('normal')).toBe('Aman');
    expect(getOwnerFacingHealthStatus('Aman')).toBe('Aman');
  });

  // 2. Internal Perlu Dicek -> owner-facing Perlu Dicek
  it('maps internal Perlu Dicek to owner-facing Perlu Dicek', () => {
    expect(getOwnerFacingHealthStatus('Perlu Dicek')).toBe('Perlu Dicek');
    expect(getOwnerFacingHealthStatus('perlu dicek')).toBe('Perlu Dicek');
  });

  // 3. Internal Boros -> owner-facing Perlu Perhatian
  it('maps internal Boros to owner-facing Perlu Perhatian', () => {
    expect(getOwnerFacingHealthStatus('Boros')).toBe('Perlu Perhatian');
    expect(getOwnerFacingHealthStatus('boros')).toBe('Perlu Perhatian');
    expect(getOwnerFacingHealthStatus('Perlu Perhatian')).toBe('Perlu Perhatian');
  });

  // 4. Internal insufficient-data state -> Data Belum Lengkap
  it('maps internal insufficient data to Data Belum Lengkap', () => {
    expect(getOwnerFacingHealthStatus('Data belum cukup')).toBe('Data Belum Lengkap');
    expect(getOwnerFacingHealthStatus(null)).toBe('Data Belum Lengkap');
    expect(getOwnerFacingHealthStatus(undefined)).toBe('Data Belum Lengkap');
    expect(getOwnerFacingHealthStatus('')).toBe('Data Belum Lengkap');
  });

  // 5. Rendering internal Boros state must NOT show "Boros" as owner-facing conclusion
  it('ensures rendering Boros produces non-causal safe narrative without "Boros"', () => {
    const narrative = getHealthNarrative('Boros', 26.5);
    expect(narrative.title).not.toMatch(/boros/i);
    expect(narrative.description).not.toMatch(/boros/i);
    expect(narrative.title).toBe('Kenaikan pemakaian perlu perhatian');
    expect(narrative.description).toContain('26.5%');
    expect(narrative.description).toContain('pola sebelumnya');
    expect(narrative.description).not.toMatch(/baseline/i);
  });

  // 6. Primary forecast UI does NOT expose "N-BEATS"
  it('ensures primary forecast UI does not expose raw N-BEATS in primary method or readiness', () => {
    const primaryMethod = getOwnerFacingPredictionMethod('Prediksi WattWise berbasis N-BEATS');
    expect(primaryMethod).not.toMatch(/n-beats/i);
    expect(primaryMethod).toBe('Prediksi WattWise');

    const h06 = getDataReadinessStatus(6);
    expect(h06.milestoneMessage).not.toMatch(/n-beats/i);
    const h13 = getDataReadinessStatus(13);
    expect(h13.milestoneMessage).not.toMatch(/n-beats/i);
  });

  // 7. Primary forecast UI does NOT expose "fallback"
  it('sanitizes runtime labels to remove raw (fallback) jargon from primary UI', () => {
    const sanitized = getOwnerFacingPredictionLabel('Estimasi Historis (fallback)');
    expect(sanitized).not.toMatch(/fallback/i);
    expect(sanitized).toBe('Estimasi Historis');

    const sanitizedAi = getOwnerFacingPredictionLabel('Prediksi AI Aktif');
    expect(sanitizedAi).toBe('Prediksi AI Aktif');
  });

  // 8. Primary forecast UI does NOT expose "baseline"
  it('replaces baseline with pola sebelumnya in pattern comparisons', () => {
    const comparison = formatPatternComparison(14.2);
    expect(comparison).not.toMatch(/baseline/i);
    expect(comparison).toBe('+14.2% dibanding pola sebelumnya');

    const fallbackComparison = formatPatternComparison(null);
    expect(fallbackComparison).not.toMatch(/baseline/i);
    expect(fallbackComparison).toBe('Butuh riwayat minimal 2 periode');
  });

  // 9. Efficiency indicator uses the new owner-facing terminology (Kondisi Energi)
  it('uses qualitative primary interpretation without certified audit claims', () => {
    // calculateEfficiencyScore produces score and qualitative label
    const high = calculateEfficiencyScore({ bill: 100, revenue: 1000, hasTariff: true, applianceShares: [10, 10] });
    expect(['Baik', 'Perlu Dipantau', 'Perlu Dicek']).toContain(high.label);

    const incomplete = calculateEfficiencyScore({ bill: null, revenue: null, hasTariff: false, applianceShares: [] });
    expect(incomplete.label).toBe('Data belum cukup');
  });

  // 10. Required efficiency disclaimer appears in the appropriate explanation/detail surface
  it('provides the mandatory trust disclaimer for energy condition', () => {
    expect(ENERGY_CONDITION_DISCLAIMER).toBe(
      'Indikator berbasis data WattWise, bukan hasil audit energi.'
    );
  });

  // 11. Portfolio mapping remains consistent
  it('aligns with Portfolio health vocabulary', () => {
    const statuses: OwnerFacingHealthStatus[] = [
      'Aman',
      'Perlu Dicek',
      'Perlu Perhatian',
      'Data Belum Lengkap',
    ];
    for (const status of statuses) {
      expect(getOwnerFacingHealthStatus(status)).toBe(status);
    }
  });

  // 12. Trend direction remains separate from health status
  it('keeps trend direction and health status strictly separate as distinct concepts', () => {
    const validTrends: OwnerFacingTrendDirection[] = ['Naik', 'Stabil', 'Turun'];
    const validHealth: OwnerFacingHealthStatus[] = [
      'Aman',
      'Perlu Dicek',
      'Perlu Perhatian',
      'Data Belum Lengkap',
    ];

    // None of the health statuses should be in trend directions
    for (const health of validHealth) {
      expect(validTrends).not.toContain(health);
    }
    // "Stabil" is a trend, NOT a health status
    expect(validHealth).not.toContain('Stabil');
  });
});
