import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import {
  ACTION_PLAN_CATALOG,
  type ActionDefinition,
} from '@/server/services/action-plan-catalog';

export interface ActionEligibilityInput {
  candidateCode: string;
  candidateVersion: number;
  candidateRuleVersion: string;
  inspectionRuleVersion: string;
  inspectionResult: InspectionAnswerCode;
}

export function resolveEligibleActions(
  input: ActionEligibilityInput
): ReadonlyArray<ActionDefinition> {
  if (input.inspectionResult === 'NOT_FOUND') return [];
  return ACTION_PLAN_CATALOG.filter(
    (definition) =>
      definition.candidateCodes.includes(input.candidateCode) &&
      definition.candidateVersion === input.candidateVersion &&
      definition.candidateRuleVersion === input.candidateRuleVersion &&
      definition.inspectionRuleVersion === input.inspectionRuleVersion &&
      definition.allowedInspectionResults.includes(input.inspectionResult)
  )
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.actionCode.localeCompare(right.actionCode)
    )
    .slice(0, 3);
}
