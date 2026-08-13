import { auditProductionDatabase, safeAuditError } from './ai-production-readonly-audit-lib';

async function main() {
  const connectionString = process.env.WATTWISE_PROD_READONLY_DATABASE_URL?.trim();
  if (!connectionString) throw new Error('WATTWISE_PROD_READONLY_DATABASE_URL_REQUIRED');
  const result = await auditProductionDatabase(connectionString);
  if (!result.schemaFingerprintReproducible) {
    throw new Error('PRODUCTION_SCHEMA_FINGERPRINT_NOT_REPRODUCIBLE');
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const known = error instanceof Error && error.message === 'WATTWISE_PROD_READONLY_DATABASE_URL_REQUIRED'
    ? error.message
    : safeAuditError(error);
  process.stderr.write(`${known}\n`);
  process.exitCode = 1;
});
