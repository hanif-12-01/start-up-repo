import { env } from '@/config/env';
import type { DiagnosticAnswerCode } from '@/server/db/schema/diagnostics';
import {
  findDiagnosticCandidatesForUser,
  insertDiagnosticCandidates,
  loadDiagnosticCandidates,
  markDiagnosticSessionAnalyzed,
  type DiagnosticCandidateRecord,
} from '@/server/repositories/diagnostic-candidate.repository';
import {
  advanceDiagnosticSession,
  createOrGetDiagnosticSession,
  findDiagnosticSessionForUser,
  insertDiagnosticAnswer,
  inspectDiagnosticEntry,
  withLockedDiagnosticSession,
  type DiagnosticSessionContext,
} from '@/server/repositories/diagnostic.repository';
import {
  getDiagnosticCatalog,
  KOS_DIAGNOSTIC_RULE_VERSION,
  resolveKosQuestionnaire,
  type DiagnosticQuestion,
} from '@/server/services/diagnostic-question-catalog';
import { DIAGNOSTIC_CANDIDATE_RULE_VERSION } from '@/server/services/diagnostic-candidate-catalog';
import { generateDiagnosticCandidates } from '@/server/services/diagnostic-candidate-generator';

export {
  getDiagnosticCapability,
  type DiagnosticCapability,
} from '@/server/services/diagnostic-capability';

export class DiagnosticsUnavailableError extends Error {
  constructor(message = 'Pemeriksaan kenaikan belum tersedia.') {
    super(message);
    this.name = 'DiagnosticsUnavailableError';
  }
}

export class DiagnosticBillNotFoundError extends Error {
  constructor() {
    super('Tagihan tidak ditemukan.');
    this.name = 'DiagnosticBillNotFoundError';
  }
}

export class DiagnosticComparisonRequiredError extends Error {
  constructor() {
    super('Tambahkan satu periode pembanding sebelum memulai pemeriksaan.');
    this.name = 'DiagnosticComparisonRequiredError';
  }
}

export class DiagnosticSessionNotFoundError extends Error {
  constructor() {
    super('Sesi pemeriksaan tidak ditemukan.');
    this.name = 'DiagnosticSessionNotFoundError';
  }
}

export class DiagnosticQuestionMismatchError extends Error {
  constructor() {
    super('Pertanyaan ini bukan langkah aktif pada sesi pemeriksaan.');
    this.name = 'DiagnosticQuestionMismatchError';
  }
}

export class DiagnosticAnswerImmutableError extends Error {
  constructor() {
    super('Jawaban yang sudah disimpan tidak dapat diubah dalam sesi ini.');
    this.name = 'DiagnosticAnswerImmutableError';
  }
}

export class DiagnosticSessionNotCollectingError extends Error {
  constructor() {
    super('Sesi ini tidak menerima jawaban questionnaire baru.');
    this.name = 'DiagnosticSessionNotCollectingError';
  }
}

export class DiagnosticCandidateGenerationNotReadyError extends Error {
  constructor(message = 'Selesaikan questionnaire sebelum melihat bagian yang perlu dicek.') {
    super(message);
    this.name = 'DiagnosticCandidateGenerationNotReadyError';
  }
}

export type DiagnosticEntryState =
  | { kind: 'DISABLED'; message: string }
  | { kind: 'BILL_NOT_FOUND' }
  | { kind: 'COMPARISON_REQUIRED'; message: string }
  | { kind: 'UNSUPPORTED_SEGMENT'; message: string }
  | { kind: 'READY'; sessionId: string | null };

export interface DiagnosticQuestionnaireView {
  session: DiagnosticSessionContext;
  nextQuestion: DiagnosticQuestion | null;
  answeredCount: number;
  maximumQuestionCount: number;
  completed: boolean;
}

export interface DiagnosticCandidateResultsView {
  session: DiagnosticSessionContext;
  candidates: DiagnosticCandidateRecord[];
}

function diagnosticsEnabled() {
  return env.DIAGNOSTICS_ENABLED && env.SEGMENT_TEMPLATES_ENABLED;
}

function resolveView(session: DiagnosticSessionContext): DiagnosticQuestionnaireView {
  const catalog = getDiagnosticCatalog(session.segmentCode, session.ruleVersion);
  if (!catalog || session.segmentCode !== 'KOS') {
    throw new DiagnosticsUnavailableError(
      'Questionnaire untuk segmen ini belum tersedia.'
    );
  }
  const state = resolveKosQuestionnaire(session.answers);
  return {
    session,
    nextQuestion: state.nextQuestion,
    answeredCount: state.answeredCount,
    maximumQuestionCount: state.maximumQuestionCount,
    completed: state.completed,
  };
}

function assertCandidateInputIsRecognized(session: DiagnosticSessionContext) {
  const catalog = getDiagnosticCatalog(session.segmentCode, session.ruleVersion);
  if (!catalog || session.segmentCode !== 'KOS') {
    throw new DiagnosticsUnavailableError(
      'Katalog kandidat untuk segmen atau versi questionnaire ini belum tersedia.'
    );
  }
  const questionnaire = resolveKosQuestionnaire(session.answers);
  const eligibleKeys = new Set(
    questionnaire.questions.map(
      (question) => `${question.code}:${question.version}`
    )
  );
  const storedAnswersAreRecognized =
    session.answers.length === questionnaire.answeredCount &&
    session.answers.every((answer) =>
      eligibleKeys.has(`${answer.questionCode}:${answer.questionVersion}`)
    );
  if (
    !questionnaire.completed ||
    !session.questionnaireCompletedAt ||
    !storedAnswersAreRecognized
  ) {
    throw new DiagnosticCandidateGenerationNotReadyError();
  }
  return questionnaire;
}

export async function getDiagnosticEntryState(
  userId: string,
  electricityBillId: string
): Promise<DiagnosticEntryState> {
  if (!diagnosticsEnabled()) {
    return { kind: 'DISABLED', message: 'Pemeriksaan kenaikan belum diaktifkan.' };
  }
  const entry = await inspectDiagnosticEntry(
    userId,
    electricityBillId,
    KOS_DIAGNOSTIC_RULE_VERSION
  );
  if (entry.kind === 'BILL_NOT_FOUND') return entry;
  if (entry.kind === 'COMPARISON_REQUIRED') {
    return {
      kind: entry.kind,
      message: 'Tambahkan periode pembanding sebelum memulai pemeriksaan.',
    };
  }
  if (entry.kind === 'UNSUPPORTED_SEGMENT') {
    return {
      kind: entry.kind,
      message: 'Questionnaire untuk segmen ini belum tersedia.',
    };
  }
  return entry;
}

export async function startDiagnosticSession(
  userId: string,
  electricityBillId: string
): Promise<DiagnosticQuestionnaireView> {
  if (!diagnosticsEnabled()) throw new DiagnosticsUnavailableError();
  const result = await createOrGetDiagnosticSession(
    userId,
    electricityBillId,
    KOS_DIAGNOSTIC_RULE_VERSION
  );
  if (result.kind === 'BILL_NOT_FOUND') throw new DiagnosticBillNotFoundError();
  if (result.kind === 'COMPARISON_REQUIRED') throw new DiagnosticComparisonRequiredError();
  if (result.kind === 'UNSUPPORTED_SEGMENT') {
    throw new DiagnosticsUnavailableError('Questionnaire untuk segmen ini belum tersedia.');
  }
  return resolveView(result.session);
}

export async function getDiagnosticQuestionnaire(
  userId: string,
  sessionId: string
): Promise<DiagnosticQuestionnaireView | null> {
  if (!diagnosticsEnabled()) throw new DiagnosticsUnavailableError();
  const session = await findDiagnosticSessionForUser(userId, sessionId);
  return session ? resolveView(session) : null;
}

export async function answerDiagnosticQuestion(
  userId: string,
  input: {
    sessionId: string;
    questionCode: string;
    questionVersion: number;
    answerCode: DiagnosticAnswerCode;
  }
): Promise<DiagnosticQuestionnaireView> {
  if (!diagnosticsEnabled()) throw new DiagnosticsUnavailableError();

  const result = await withLockedDiagnosticSession(
    userId,
    input.sessionId,
    async (client, session) => {
      if (session.status !== 'DRAFT' && session.status !== 'COLLECTING_CONTEXT') {
        throw new DiagnosticSessionNotCollectingError();
      }
      if (
        !getDiagnosticCatalog(session.segmentCode, session.ruleVersion) ||
        session.segmentCode !== 'KOS'
      ) {
        throw new DiagnosticsUnavailableError(
          'Questionnaire untuk segmen ini belum tersedia.'
        );
      }

      const existing = session.answers.find(
        (answer) =>
          answer.questionCode === input.questionCode &&
          answer.questionVersion === input.questionVersion
      );
      if (existing) {
        if (existing.answerCode !== input.answerCode) {
          throw new DiagnosticAnswerImmutableError();
        }
        return resolveView(session);
      }

      const before = resolveKosQuestionnaire(session.answers);
      if (
        before.nextQuestion?.code !== input.questionCode ||
        before.nextQuestion.version !== input.questionVersion
      ) {
        throw new DiagnosticQuestionMismatchError();
      }

      const saved = await insertDiagnosticAnswer(client, input);
      if (!saved.inserted && saved.answer.answerCode !== input.answerCode) {
        throw new DiagnosticAnswerImmutableError();
      }
      const answers = [...session.answers, saved.answer];
      const after = resolveKosQuestionnaire(answers);
      await advanceDiagnosticSession(client, session.id, after.completed);
      return resolveView({
        ...session,
        status: session.status === 'DRAFT' ? 'COLLECTING_CONTEXT' : session.status,
        questionnaireCompletedAt:
          after.completed && !session.questionnaireCompletedAt
            ? new Date()
            : session.questionnaireCompletedAt,
        answers,
      });
    }
  );

  if (!result) throw new DiagnosticSessionNotFoundError();
  return result;
}

export async function generateCandidatesForDiagnosticSession(
  userId: string,
  sessionId: string
): Promise<DiagnosticCandidateResultsView> {
  if (!diagnosticsEnabled()) throw new DiagnosticsUnavailableError();

  const result = await withLockedDiagnosticSession(
    userId,
    sessionId,
    async (client, session) => {
      if (session.status === 'ANALYZED') {
        return {
          session,
          candidates: await loadDiagnosticCandidates(
            client,
            session.id,
            DIAGNOSTIC_CANDIDATE_RULE_VERSION
          ),
        };
      }
      if (session.status !== 'COLLECTING_CONTEXT') {
        throw new DiagnosticCandidateGenerationNotReadyError();
      }

      const questionnaire = assertCandidateInputIsRecognized(session);
      const candidates = generateDiagnosticCandidates({
        answers: session.answers,
        eligibleQuestionCount: questionnaire.questions.length,
        currentBill: session.currentBill,
        comparisonBill: session.comparisonBill,
      });
      await insertDiagnosticCandidates(client, session.id, candidates);
      await markDiagnosticSessionAnalyzed(client, session.id);
      const stored = await loadDiagnosticCandidates(
        client,
        session.id,
        DIAGNOSTIC_CANDIDATE_RULE_VERSION
      );
      return {
        session: { ...session, status: 'ANALYZED' as const },
        candidates: stored,
      };
    }
  );

  if (!result) throw new DiagnosticSessionNotFoundError();
  return result;
}

export async function getDiagnosticCandidateResults(
  userId: string,
  sessionId: string
): Promise<DiagnosticCandidateResultsView | null> {
  if (!diagnosticsEnabled()) throw new DiagnosticsUnavailableError();
  const session = await findDiagnosticSessionForUser(userId, sessionId);
  if (!session) return null;
  if (
    session.status !== 'ANALYZED' &&
    session.status !== 'INSPECTION_IN_PROGRESS' &&
    session.status !== 'CLOSED'
  ) {
    throw new DiagnosticCandidateGenerationNotReadyError();
  }
  const candidates = await findDiagnosticCandidatesForUser(
    userId,
    sessionId,
    DIAGNOSTIC_CANDIDATE_RULE_VERSION
  );
  if (candidates === null) return null;
  return { session, candidates };
}
