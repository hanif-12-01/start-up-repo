import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  auditProductionDatabase,
  type AuditConnectionFactory,
} from '../../scripts/ai-production-readonly-audit-lib';
import { applyAllForwardMigrations } from '../helpers/migrations';

const { Client, Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DISPOSABLE_DATABASE_URL_REQUIRED');
const readerRole = 'ai06b1_readonly_test';

function roleFactory(role: string): AuditConnectionFactory {
  return (connectionString: string) => {
    const client = new Client({ connectionString });
    return {
      async connect() {
        await client.connect();
        await client.query(`SET ROLE ${role}`);
      },
      async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
        const result = await client.query(text, values as unknown[] | undefined);
        return { rows: result.rows as Row[] };
      },
      end: () => client.end(),
    };
  };
}

describe('AI-06B.1 disposable role enforcement', () => {
  const admin = new Pool({ connectionString: dbUrl });

  beforeAll(async () => {
    await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await applyAllForwardMigrations(admin);
    await admin.query(`DROP ROLE IF EXISTS ${readerRole}`);
    await admin.query(`CREATE ROLE ${readerRole} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
    await admin.query(`GRANT CONNECT ON DATABASE ${JSON.stringify(new URL(dbUrl).pathname.slice(1))} TO ${readerRole}`);
    await admin.query(`GRANT USAGE ON SCHEMA public TO ${readerRole}`);
    await admin.query(`GRANT SELECT ON TABLE business, electricity_bill, ai_shadow_forecast, ai_shadow_enrollment TO ${readerRole}`);
  });

  afterAll(async () => {
    await admin.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${readerRole}`);
    await admin.query(`REVOKE USAGE ON SCHEMA public FROM ${readerRole}`);
    await admin.query(`REVOKE CONNECT ON DATABASE ${JSON.stringify(new URL(dbUrl).pathname.slice(1))} FROM ${readerRole}`);
    await admin.query(`DROP ROLE IF EXISTS ${readerRole}`);
    await admin.end();
  });

  it('passes with a dedicated read-only role and returns reproducible full schema signatures', async () => {
    const result = await auditProductionDatabase(dbUrl, {
      allowLocalForTests: true,
      connectionFactory: roleFactory(readerRole),
    });
    expect(result.transactionReadOnly).toBe(true);
    expect(result.writePrivilegesAbsent).toBe(true);
    expect(result.schemaFingerprintReproducible).toBe(true);
    expect(result.first.migration.states).toEqual({
      '0011_ai_shadow_integration': 'APPLIED',
      '0012_ai_shadow_evidence_integrity': 'APPLIED',
      '0013_ai_shadow_prospective_reachability': 'APPLIED',
      '0014_ai_shadow_enrollment': 'APPLIED',
    });
    expect(result.first.migration.exactMissingMigrations).toEqual([]);
    expect(result.first.evidence).toMatchObject({ aggregateState: 'AVAILABLE', totalRows: 0 });
    expect(result.first.enrollment).toMatchObject({ aggregateState: 'AVAILABLE', totalRows: 0 });
    expect(result.first.privacy).toEqual({
      aggregateOnly: true, entityLevelOutput: false, connectionSecretIncluded: false,
    });
  });

  it('rejects the disposable database owner because it has write privileges', async () => {
    await expect(auditProductionDatabase(dbUrl, { allowLocalForTests: true }))
      .rejects.toMatchObject({ code: 'PRODUCTION_AUDIT_ROLE_TOO_PRIVILEGED' });
  });
});
