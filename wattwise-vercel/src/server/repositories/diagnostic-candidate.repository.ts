import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type {
  DiagnosticCandidateType,
  DiagnosticEvidenceLevel,
} from '@/server/db/schema/diagnostics';
import type { DiagnosticCandidateFactor } from '@/server/services/diagnostic-candidate-catalog';
import type { GeneratedDiagnosticCandidate } from '@/server/services/diagnostic-candidate-generator';

interface CandidateRow {
  id: string;
  diagnostic_session_id: string;
  candidate_code: string;
  candidate_version: number;
  candidate_type: DiagnosticCandidateType;
  rule_version: string;
  title: string;
  rank: number;
  internal_score: number;
  evidence_level: DiagnosticEvidenceLevel;
  explanation: string;
  supporting_factors_json: unknown;
  contradicting_factors_json: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface DiagnosticCandidateRecord {
  id: string;
  diagnosticSessionId: string;
  candidateCode: string;
  candidateVersion: number;
  candidateType: DiagnosticCandidateType;
  ruleVersion: string;
  title: string;
  rank: number;
  internalScore: number;
  evidenceLevel: DiagnosticEvidenceLevel;
  explanation: string;
  supportingFactors: DiagnosticCandidateFactor[];
  contradictingFactors: DiagnosticCandidateFactor[];
  createdAt: Date;
  updatedAt: Date;
}

function factorArray(value: unknown): DiagnosticCandidateFactor[] {
  if (!Array.isArray(value)) {
    throw new Error('Persisted diagnostic candidate factors must be an array');
  }
  return value as DiagnosticCandidateFactor[];
}

function mapCandidate(row: CandidateRow): DiagnosticCandidateRecord {
  return {
    id: row.id,
    diagnosticSessionId: row.diagnostic_session_id,
    candidateCode: row.candidate_code,
    candidateVersion: row.candidate_version,
    candidateType: row.candidate_type,
    ruleVersion: row.rule_version,
    title: row.title,
    rank: row.rank,
    internalScore: row.internal_score,
    evidenceLevel: row.evidence_level,
    explanation: row.explanation,
    supportingFactors: factorArray(row.supporting_factors_json),
    contradictingFactors: factorArray(row.contradicting_factors_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CANDIDATE_COLUMNS = `
  dc.id, dc.diagnostic_session_id, dc.candidate_code, dc.candidate_version,
  dc.candidate_type, dc.rule_version, dc.title, dc.rank, dc.internal_score,
  dc.evidence_level, dc.explanation, dc.supporting_factors_json,
  dc.contradicting_factors_json, dc.created_at, dc.updated_at
`;

export async function insertDiagnosticCandidates(
  client: PoolClient,
  sessionId: string,
  candidates: ReadonlyArray<GeneratedDiagnosticCandidate>
) {
  for (const candidate of candidates) {
    await client.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12::jsonb, $13::jsonb
       )`,
      [
        crypto.randomUUID(),
        sessionId,
        candidate.candidateCode,
        candidate.candidateVersion,
        candidate.candidateType,
        candidate.ruleVersion,
        candidate.title,
        candidate.rank,
        candidate.internalScore,
        candidate.evidenceLevel,
        candidate.explanation,
        JSON.stringify(candidate.supportingFactors),
        JSON.stringify(candidate.contradictingFactors),
      ]
    );
  }
}

export async function loadDiagnosticCandidates(
  client: PoolClient,
  sessionId: string,
  ruleVersion: string
): Promise<DiagnosticCandidateRecord[]> {
  const result = await client.query<CandidateRow>(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM diagnostic_candidate dc
      WHERE dc.diagnostic_session_id = $1
        AND dc.rule_version = $2
      ORDER BY dc.rank ASC, dc.candidate_code ASC`,
    [sessionId, ruleVersion]
  );
  return result.rows.map(mapCandidate);
}

export async function findDiagnosticCandidatesForUser(
  userId: string,
  sessionId: string,
  ruleVersion: string
): Promise<DiagnosticCandidateRecord[] | null> {
  const pool = getPool();
  const owned = await pool.query(
    `SELECT 1
       FROM diagnostic_session ds
       JOIN business b ON b.id = ds.business_id
      WHERE ds.id = $1 AND b.user_id = $2
      LIMIT 1`,
    [sessionId, userId]
  );
  if (!owned.rowCount) return null;

  const result = await pool.query<CandidateRow>(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM diagnostic_candidate dc
       JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
       JOIN business b ON b.id = ds.business_id
      WHERE dc.diagnostic_session_id = $1
        AND dc.rule_version = $2
        AND b.user_id = $3
      ORDER BY dc.rank ASC, dc.candidate_code ASC`,
    [sessionId, ruleVersion, userId]
  );
  return result.rows.map(mapCandidate);
}

export async function markDiagnosticSessionAnalyzed(
  client: PoolClient,
  sessionId: string
) {
  const result = await client.query(
    `UPDATE diagnostic_session
        SET status = 'ANALYZED',
            updated_at = now()
      WHERE id = $1
        AND status = 'COLLECTING_CONTEXT'`,
    [sessionId]
  );
  if (result.rowCount !== 1) {
    throw new Error('Diagnostic session could not transition to ANALYZED');
  }
}
