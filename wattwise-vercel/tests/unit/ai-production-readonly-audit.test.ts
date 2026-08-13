import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ProductionAuditError,
  auditProductionDatabase,
  validateAuditTarget,
  type AuditConnection,
} from '../../scripts/ai-production-readonly-audit-lib';

function fakeConnection(options: { writePrivilege?: boolean } = {}) {
  const statements: string[] = [];
  const connection: AuditConnection = {
    async connect() {},
    async end() {},
    async query<Row extends Record<string, unknown>>(text: string) {
      statements.push(text);
      if (text.includes('ai06b1:identity')) {
        return { rows: [{
          database_name: 'production_safe', current_role: 'audit_reader',
          transaction_read_only: true, server_version: '17.0',
        }] as unknown as Row[] };
      }
      if (text.includes('ai06b1:privileges')) {
        return { rows: [
          'business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment',
        ].map((table_name) => ({
          table_name, present: table_name === 'business', can_select: true,
          can_insert: options.writePrivilege && table_name === 'business',
          can_update: false, can_delete: false, can_truncate: false,
        })) as unknown as Row[] };
      }
      if (text.includes('ai06b1:columns')) {
        return { rows: [{
          table_name: 'business', column_name: 'id', data_type: 'text',
          is_nullable: 'NO', column_default: null,
        }] as unknown as Row[] };
      }
      return { rows: [] };
    },
  };
  return { connection, statements };
}

describe('AI-06B.1 production read-only auditor', () => {
  it('rejects local production targets unless explicitly enabled for disposable tests', () => {
    expect(() => validateAuditTarget('postgresql://audit@127.0.0.1:5432/prod'))
      .toThrowError(new ProductionAuditError('PRODUCTION_DATABASE_IDENTITY_REJECTED_LOCAL_TARGET'));
    expect(validateAuditTarget(
      'postgresql://audit@127.0.0.1:5432/disposable', true
    ).providerCandidate).toBe('UNKNOWN');
  });

  it('uses explicit read-only transactions twice and emits no connection secret', async () => {
    const created = [fakeConnection(), fakeConnection()];
    let index = 0;
    const secretUrl = 'postgresql://db.example.test/prod';
    const result = await auditProductionDatabase(secretUrl, {
      connectionFactory: () => created[index++].connection,
    });
    expect(result.transactionReadOnly).toBe(true);
    expect(result.writePrivilegesAbsent).toBe(true);
    expect(result.schemaFingerprintReproducible).toBe(true);
    expect(JSON.stringify(result)).not.toContain(secretUrl);
    expect(JSON.stringify(result)).not.toContain('db.example.test');
    for (const item of created) {
      expect(item.statements[0]).toBe('BEGIN READ ONLY');
      expect(item.statements).toContain("SET LOCAL statement_timeout = '8000ms'");
      expect(item.statements.at(-1)).toBe('ROLLBACK');
      expect(item.statements.every((statement) => (
        /^(BEGIN READ ONLY|SET LOCAL statement_timeout|ROLLBACK)/.test(statement) ||
        statement.includes('ai06b1:')
      ))).toBe(true);
    }
  });

  it('fails closed before schema collection when the role has write privilege', async () => {
    const created = fakeConnection({ writePrivilege: true });
    await expect(auditProductionDatabase(
      'postgresql://db.example.test/prod',
      { connectionFactory: () => created.connection }
    )).rejects.toMatchObject({ code: 'PRODUCTION_AUDIT_ROLE_TOO_PRIVILEGED' });
    expect(created.statements.some((statement) => statement.includes('ai06b1:columns'))).toBe(false);
    expect(created.statements.at(-1)).toBe('ROLLBACK');
  });

  it('keeps the operator SQL path catalog-only and free of mutating statements', () => {
    const sql = readFileSync(resolve(
      process.cwd(), '..', 'docs', 'ml', 'ai-06', 'production-schema-readonly-audit.sql'
    ), 'utf8');
    const withoutStringLiterals = sql.replace(/'(?:''|[^'])*'/g, "''");
    expect(withoutStringLiterals).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|TRUNCATE|CALL)\b/i);
    expect(sql.split(';').map((statement) => statement.trim()).filter(Boolean)
      .every((statement) => /^(SELECT|WITH)\b/i.test(statement))).toBe(true);
    expect(sql).not.toMatch(/\b(business_id|request_id|actual_kwh|ml_prediction_kwh|transient_payload)\b/i);
    expect(sql).toMatch(/\binformation_schema\b/);
    expect(sql).toMatch(/\bpg_catalog\b/);
  });
});
