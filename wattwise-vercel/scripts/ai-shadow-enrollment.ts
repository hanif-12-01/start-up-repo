import { setShadowEnrollment } from '../src/server/repositories/ai-shadow-enrollment.repository';
import { getPool } from '../src/server/db/client';

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const action = process.argv.includes('--enroll') ? 'ENROLL'
    : process.argv.includes('--disable') ? 'DISABLE' : null;
  const businessId = argument('--business-id');
  const reason = argument('--reason');
  const dryRun = process.argv.includes('--dry-run');
  if (!action || !businessId || !reason) {
    throw new Error('Usage: --enroll|--disable --business-id <id> --reason <text> [--dry-run]');
  }
  const result = await setShadowEnrollment({ businessId, action, reason, dryRun });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'ENROLLMENT_FAILED'}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
  });
