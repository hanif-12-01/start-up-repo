import { describe, expect, it } from 'vitest';
import {
  INSPECTION_CATALOG,
  INSPECTION_RULE_VERSION,
  findInspectionDefinition,
} from '@/server/services/inspection-catalog';
import { resolveInspectionResult } from '@/server/services/inspection-result-resolver';
import {
  INSPECTION_ANSWER_LABELS,
  INSPECTION_SAFETY_LABELS,
} from '@/server/services/inspection-presentation';

describe('guided inspection catalog', () => {
  it('maps exactly the five accepted inspectable candidate contracts', () => {
    expect(
      INSPECTION_CATALOG.map((definition) => definition.candidateCode).sort()
    ).toEqual([
      'BILL_ADMINISTRATION_CHANGE',
      'NEW_ELECTRICAL_APPLIANCE',
      'OCCUPANCY_INCREASE',
      'SPECIAL_ACTIVITY',
      'WATER_SYSTEM_CHANGE',
    ]);
    expect(
      findInspectionDefinition({
        candidateCode: 'INFORMATION_COMPLETENESS',
        candidateVersion: 1,
        candidateRuleVersion: 'DIAG_CANDIDATE_RULE_V1',
      })
    ).toBeNull();
    expect(
      INSPECTION_CATALOG.some((definition) =>
        ['AC', 'AIR_CONDITIONER', 'AIR_CONDITIONING'].includes(
          definition.candidateCode
        )
      )
    ).toBe(false);
  });

  it('is centralized, versioned, ordered, and internally unique', () => {
    expect(new Set(INSPECTION_CATALOG.map((item) => item.code)).size).toBe(
      INSPECTION_CATALOG.length
    );
    for (const definition of INSPECTION_CATALOG) {
      expect(definition.ruleVersion).toBe(INSPECTION_RULE_VERSION);
      expect(definition.version).toBe(1);
      expect(definition.items.length).toBeGreaterThan(0);
      expect(
        definition.items.map((item) => item.sortOrder)
      ).toEqual(definition.items.map((_, index) => index + 1));
      expect(new Set(definition.items.map((item) => item.code)).size).toBe(
        definition.items.length
      );
      for (const item of definition.items) {
        expect(item.version).toBe(1);
        expect(item.resultOptions.length).toBeGreaterThan(0);
      }
    }
  });

  it('contains only observation-safe instructions and an explicit hazard stop path', () => {
    const allText = INSPECTION_CATALOG.flatMap((definition) => [
      definition.introduction,
      definition.completionCopy,
      ...definition.items.map((item) => item.instruction),
    ])
      .join(' ')
      .toLocaleLowerCase('id-ID');
    const unsafeImperatives = [
      'silakan buka panel',
      'bukalah panel',
      'bongkarlah perangkat',
      'silakan sentuh instalasi',
      'ukur tegangan',
      'ukur arus',
      'gunakan multimeter',
      'ganti kabel',
      'perbaiki perangkat',
      'matikan mcb',
      'nyalakan perangkat yang rusak',
    ];
    for (const phrase of unsafeImperatives) {
      expect(allText).not.toContain(phrase);
    }

    for (const definition of INSPECTION_CATALOG) {
      const hazard = definition.items.find(
        (item) => item.safetyLevel === 'PROFESSIONAL_REQUIRED'
      );
      expect(hazard).toBeDefined();
      expect(hazard?.instruction).toContain('jangan menyentuh atau membongkar');
      expect(hazard?.instruction).toContain('Hentikan pemeriksaan');
      expect(hazard?.instruction).toContain('teknisi yang kompeten');
      expect(hazard?.resultOptions).toContain('NEEDS_HELP');
      expect(hazard?.resultOptions).not.toContain('FOUND');
    }
  });

  it('keeps the exact user-facing answer and safety labels', () => {
    expect(INSPECTION_ANSWER_LABELS).toEqual({
      FOUND: 'Ditemukan Masalah',
      NOT_FOUND: 'Tidak Ditemukan',
      UNKNOWN: 'Tidak Tahu',
      NEEDS_HELP: 'Butuh Bantuan',
    });
    expect(INSPECTION_SAFETY_LABELS).toEqual({
      SAFE_OBSERVATION: 'Aman untuk diamati',
      PROFESSIONAL_REQUIRED: 'Hentikan dan minta bantuan',
    });
  });
});

describe('inspection aggregate result', () => {
  it('gives NEEDS_HELP the highest precedence', () => {
    expect(
      resolveInspectionResult(['FOUND', 'NOT_FOUND', 'NEEDS_HELP', 'UNKNOWN'])
    ).toBe('NEEDS_HELP');
  });

  it('returns FOUND when found and no help is needed', () => {
    expect(resolveInspectionResult(['UNKNOWN', 'FOUND', 'NOT_FOUND'])).toBe(
      'FOUND'
    );
  });

  it('returns NOT_FOUND only when every answer is NOT_FOUND', () => {
    expect(resolveInspectionResult(['NOT_FOUND', 'NOT_FOUND'])).toBe(
      'NOT_FOUND'
    );
  });

  it('uses UNKNOWN for the remaining mixed or unknown cases', () => {
    expect(resolveInspectionResult(['NOT_FOUND', 'UNKNOWN'])).toBe('UNKNOWN');
    expect(resolveInspectionResult(['UNKNOWN'])).toBe('UNKNOWN');
  });

  it('rejects an empty aggregate input', () => {
    expect(() => resolveInspectionResult([])).toThrow(
      'requires at least one answer'
    );
  });
});
