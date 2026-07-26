import { z } from 'zod';
import { DIAGNOSTIC_ANSWER_CODES } from '@/server/db/schema/diagnostics';
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

export type StartDiagnosticInput = z.infer<typeof startDiagnosticSchema>;
export type AnswerDiagnosticInput = z.infer<typeof answerDiagnosticSchema>;
export type GenerateDiagnosticCandidatesInput = z.infer<
  typeof generateDiagnosticCandidatesSchema
>;
