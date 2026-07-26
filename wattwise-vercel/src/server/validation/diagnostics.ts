import { z } from 'zod';
import { DIAGNOSTIC_ANSWER_CODES } from '@/server/db/schema/diagnostics';
import { INSPECTION_ANSWER_CODES } from '@/server/db/schema/inspections';
import { KOS_QUESTION_CODES } from '@/server/services/diagnostic-question-catalog';

const resourceId = z.string().trim().min(1).max(128);

export const startDiagnosticSchema = z
  .object({
    electricityBillId: resourceId,
  })
  .strict();

export const answerDiagnosticSchema = z
  .object({
    sessionId: resourceId,
    questionCode: z.enum(KOS_QUESTION_CODES),
    questionVersion: z.coerce.number().int().positive(),
    answerCode: z.enum(DIAGNOSTIC_ANSWER_CODES),
  })
  .strict();

export const generateDiagnosticCandidatesSchema = z
  .object({
    sessionId: resourceId,
  })
  .strict();

export const startInspectionSchema = z
  .object({
    candidateId: resourceId,
  })
  .strict();

export const answerInspectionItemSchema = z
  .object({
    sessionId: resourceId,
    planId: resourceId,
    itemId: resourceId,
    answerCode: z.enum(INSPECTION_ANSWER_CODES),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const completeInspectionSchema = z
  .object({
    sessionId: resourceId,
    planId: resourceId,
  })
  .strict();

export type StartDiagnosticInput = z.infer<typeof startDiagnosticSchema>;
export type AnswerDiagnosticInput = z.infer<typeof answerDiagnosticSchema>;
export type GenerateDiagnosticCandidatesInput = z.infer<
  typeof generateDiagnosticCandidatesSchema
>;
export type StartInspectionInput = z.infer<typeof startInspectionSchema>;
export type AnswerInspectionItemInput = z.infer<
  typeof answerInspectionItemSchema
>;
export type CompleteInspectionInput = z.infer<typeof completeInspectionSchema>;
