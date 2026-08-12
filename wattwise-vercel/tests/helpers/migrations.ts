import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

const FORWARD_DIRECTORY = join(process.cwd(), 'drizzle', 'migrations');
const ROLLBACK_DIRECTORY = join(process.cwd(), 'drizzle', 'rollbacks');
const SQL_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

export function listForwardMigrationNames(): string[] {
  return readdirSync(FORWARD_DIRECTORY)
    .filter((name) => SQL_FILE.test(name))
    .sort((left, right) => left.localeCompare(right));
}

export function readForwardMigration(name: string): string {
  if (!SQL_FILE.test(name)) throw new Error(`Invalid forward migration name: ${name}`);
  return readFileSync(join(FORWARD_DIRECTORY, name), 'utf8');
}

export function readRollbackMigration(name: string): string {
  if (!SQL_FILE.test(name)) throw new Error(`Invalid rollback migration name: ${name}`);
  return readFileSync(join(ROLLBACK_DIRECTORY, name), 'utf8');
}

export async function applyAllForwardMigrations(pool: pg.Pool): Promise<string[]> {
  // Suites rebuild parent tables independently; remove the newest dependent table first.
  await pool.query('DROP TABLE IF EXISTS ai_shadow_enrollment CASCADE');
  await pool.query('DROP TABLE IF EXISTS ai_shadow_forecast CASCADE');
  const names = listForwardMigrationNames();
  for (const name of names) {
    await pool.query(readForwardMigration(name));
  }
  return names;
}
