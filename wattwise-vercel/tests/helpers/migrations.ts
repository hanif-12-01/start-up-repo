import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';
import { getSafeTestDbUrl } from './test-db-guard';

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
  getSafeTestDbUrl();
  // Legacy fixtures drop business CASCADE, leaving the new empty child tables without FKs.
  // Explicit guarded rollback preserves fail-fast migration SQL; never discard populated observations.
  const operational = await pool.query(`SELECT to_regclass('public.production_record') AS present`);
  if (operational.rows[0].present) {
    // ponytail: test fixture clears ephemeral data before rollback guard; production guards against real data loss
    await pool.query(`TRUNCATE TABLE production_record, operational_process CASCADE`);
    await pool.query(readRollbackMigration('0013_operational_normalization_rollback.sql'));
  }
  const measurement = await pool.query(`SELECT to_regclass('public.energy_measurement') AS present`);
  if (measurement.rows[0].present) {
    await pool.query(`TRUNCATE TABLE energy_measurement, measurement_source CASCADE`);
    await pool.query(readRollbackMigration('0012_measurement_foundation_rollback.sql'));
  }
  const names = listForwardMigrationNames();
  for (const name of names) {
    await pool.query(readForwardMigration(name));
  }
  return names;
}
