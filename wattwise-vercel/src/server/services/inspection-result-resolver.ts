import type { InspectionAnswerCode } from '@/server/db/schema/inspections';

export function resolveInspectionResult(
  answers: ReadonlyArray<InspectionAnswerCode>
): InspectionAnswerCode {
  if (answers.length === 0) {
    throw new Error('Inspection result requires at least one answer');
  }
  if (answers.includes('NEEDS_HELP')) return 'NEEDS_HELP';
  if (answers.includes('FOUND')) return 'FOUND';
  if (answers.every((answer) => answer === 'NOT_FOUND')) return 'NOT_FOUND';
  return 'UNKNOWN';
}
