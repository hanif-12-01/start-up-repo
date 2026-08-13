import { createHash } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

const AUDIT_TABLES = [
  'business',
  'electricity_bill',
  'ai_shadow_forecast',
  'ai_shadow_enrollment',
] as const;

const MIGRATIONS = [
  '0011_ai_shadow_integration',
  '0012_ai_shadow_evidence_integrity',
  '0013_ai_shadow_prospective_reachability',
  '0014_ai_shadow_enrollment',
] as const;

type MigrationName = typeof MIGRATIONS[number];
export type MigrationState = 'APPLIED' | 'NOT_APPLIED' | 'PARTIALLY_APPLIED' | 'AMBIGUOUS';

export class ProductionAuditError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'ProductionAuditError';
  }
}

export interface AuditQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  rows: Row[];
}

export interface AuditConnection {
  connect(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<AuditQueryResult<Row>>;
  end(): Promise<void>;
}

export type AuditConnectionFactory = (connectionString: string) => AuditConnection;

interface IdentityRow extends Record<string, unknown> {
  database_name: string;
  current_role: string;
  transaction_read_only: boolean;
  server_version: string;
}

interface PrivilegeRow extends Record<string, unknown> {
  table_name: string;
  present: boolean;
  can_select: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_truncate: boolean;
}

interface ColumnRow extends Record<string, unknown> {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ConstraintRow extends Record<string, unknown> {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  definition: string;
}

interface IndexRow extends Record<string, unknown> {
  table_name: string;
  index_name: string;
  definition: string;
}

export interface SafeDatabaseIdentity {
  databaseName: string;
  currentRole: string;
  serverVersion: string;
  transactionReadOnly: boolean;
  hostSha256: string;
  providerCandidate: 'NEON' | 'SUPABASE' | 'AWS_RDS' | 'GCP_CLOUD_SQL' | 'UNKNOWN';
  providerIdentityVerified: false;
}

export interface SafePrivilegeResult {
  tableName: string;
  present: boolean;
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
  truncate: boolean;
}

export interface MigrationClassification {
  states: Record<MigrationName, MigrationState>;
  exactMissingMigrations: MigrationName[] | null;
  exactForwardOrder: MigrationName[] | null;
  exactRollbackOrder: MigrationName[] | null;
  ambiguous: boolean;
}

export interface ReadonlyAuditSnapshot {
  auditTimestamp: string;
  identity: SafeDatabaseIdentity;
  writePrivilegesAbsent: boolean;
  privileges: SafePrivilegeResult[];
  schemaFingerprint: string;
  migration: MigrationClassification;
  schema: {
    columns: ColumnRow[];
    constraints: ConstraintRow[];
    indexes: IndexRow[];
  };
  evidence: {
    aiShadowForecastPresent: boolean;
    aggregateState: 'AVAILABLE' | 'NOT_AUTHORIZED_TO_QUERY' | 'NOT_PRESENT';
    totalRows: number | null;
    byStatus: Array<{ value: string | null; count: number }>;
    byProvenance: Array<{ value: string | null; count: number }>;
    byTemporalIntegrity: Array<{ value: string | null; count: number }>;
    byProspective: Array<{ value: string | null; count: number }>;
  };
  enrollment: {
    schemaPresent: boolean;
    aggregateState: 'AVAILABLE' | 'NOT_AUTHORIZED_TO_QUERY' | 'NOT_PRESENT';
    totalRows: number | null;
    byEnabled: Array<{ value: string | null; count: number }>;
    byApprovedProvenance: Array<{ value: string | null; count: number }>;
  };
  privacy: {
    aggregateOnly: true;
    entityLevelOutput: false;
    connectionSecretIncluded: false;
  };
}

export interface ReadonlyAuditResult {
  schemaVersion: '1.0';
  result: 'PASS';
  transactionReadOnly: true;
  writePrivilegesAbsent: true;
  schemaFingerprintReproducible: boolean;
  first: ReadonlyAuditSnapshot;
  secondAuditTimestamp: string;
  secondSchemaFingerprint: string;
}

const IDENTITY_SQL = `/* ai06b1:identity */
SELECT
  current_database()::text AS database_name,
  current_user::text AS current_role,
  current_setting('transaction_read_only')::boolean AS transaction_read_only,
  current_setting('server_version')::text AS server_version`;

const PRIVILEGES_SQL = `/* ai06b1:privileges */
WITH targets(table_name) AS (
  VALUES ('business'), ('electricity_bill'), ('ai_shadow_forecast'), ('ai_shadow_enrollment')
), resolved AS (
  SELECT table_name, to_regclass(format('%I.%I', 'public', table_name)) AS relation_oid
  FROM targets
)
SELECT
  table_name,
  relation_oid IS NOT NULL AS present,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'SELECT') END AS can_select,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'INSERT') END AS can_insert,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'UPDATE') END AS can_update,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'DELETE') END AS can_delete,
  CASE WHEN relation_oid IS NULL THEN false ELSE has_table_privilege(current_user, relation_oid, 'TRUNCATE') END AS can_truncate
FROM resolved
ORDER BY table_name`;

const COLUMNS_SQL = `/* ai06b1:columns */
SELECT
  table_name::text,
  column_name::text,
  data_type::text,
  is_nullable::text,
  column_default::text
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY table_name, ordinal_position`;

const CONSTRAINTS_SQL = `/* ai06b1:constraints */
SELECT
  relation.relname::text AS table_name,
  constraint_row.conname::text AS constraint_name,
  constraint_row.contype::text AS constraint_type,
  pg_get_constraintdef(constraint_row.oid, true)::text AS definition
FROM pg_catalog.pg_constraint constraint_row
JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
JOIN pg_catalog.pg_namespace namespace_row ON namespace_row.oid = relation.relnamespace
WHERE namespace_row.nspname = 'public'
  AND relation.relname IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY relation.relname, constraint_row.conname`;

const INDEXES_SQL = `/* ai06b1:indexes */
SELECT
  tablename::text AS table_name,
  indexname::text AS index_name,
  indexdef::text AS definition
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('business', 'electricity_bill', 'ai_shadow_forecast', 'ai_shadow_enrollment')
ORDER BY tablename, indexname`;

function hostProvider(hostname: string): SafeDatabaseIdentity['providerCandidate'] {
  const host = hostname.toLowerCase();
  if (host.endsWith('.neon.tech')) return 'NEON';
  if (host.includes('.supabase.co') || host.includes('.supabase.com')) return 'SUPABASE';
  if (host.includes('.rds.amazonaws.com')) return 'AWS_RDS';
  if (host.includes('.cloudsql.')) return 'GCP_CLOUD_SQL';
  return 'UNKNOWN';
}

export function validateAuditTarget(connectionString: string, allowLocalForTests = false) {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new ProductionAuditError('WATTWISE_PROD_READONLY_DATABASE_URL_INVALID');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname) {
    throw new ProductionAuditError('WATTWISE_PROD_READONLY_DATABASE_URL_INVALID');
  }
  const host = parsed.hostname.toLowerCase();
  if (!allowLocalForTests && ['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new ProductionAuditError('PRODUCTION_DATABASE_IDENTITY_REJECTED_LOCAL_TARGET');
  }
  return {
    hostSha256: createHash('sha256').update(host).digest('hex'),
    providerCandidate: hostProvider(host),
  };
}

function defaultFactory(connectionString: string): AuditConnection {
  return new Client({
    connectionString,
    application_name: 'wattwise_ai_production_readonly_audit',
    connectionTimeoutMillis: 5_000,
    statement_timeout: 8_000,
    query_timeout: 8_000,
  }) as unknown as AuditConnection;
}

function normalizedBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 't' || value === 1;
}

function normalizedCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new ProductionAuditError('PRODUCTION_AUDIT_INVALID_AGGREGATE');
  }
  return count;
}

export function assertSafePrivileges(rows: PrivilegeRow[]): SafePrivilegeResult[] {
  const normalized = AUDIT_TABLES.map((tableName) => {
    const row = rows.find((candidate) => candidate.table_name === tableName);
    if (!row) throw new ProductionAuditError('PRODUCTION_AUDIT_PRIVILEGE_RESULT_INCOMPLETE');
    return {
      tableName,
      present: normalizedBoolean(row.present),
      select: normalizedBoolean(row.can_select),
      insert: normalizedBoolean(row.can_insert),
      update: normalizedBoolean(row.can_update),
      delete: normalizedBoolean(row.can_delete),
      truncate: normalizedBoolean(row.can_truncate),
    };
  });
  if (normalized.some((item) => item.present && (item.insert || item.update || item.delete || item.truncate))) {
    throw new ProductionAuditError('PRODUCTION_AUDIT_ROLE_TOO_PRIVILEGED');
  }
  return normalized;
}

function hasColumn(columns: ColumnRow[], table: string, column: string) {
  return columns.some((item) => item.table_name === table && item.column_name === column);
}

function hasConstraint(
  constraints: ConstraintRow[],
  table: string,
  name: string,
  requiredFragments: string[] = []
) {
  const candidate = constraints.find((item) => item.table_name === table && item.constraint_name === name);
  return Boolean(candidate && requiredFragments.every((fragment) => candidate.definition.includes(fragment)));
}

function hasIndex(indexes: IndexRow[], table: string, name: string) {
  return indexes.some((item) => item.table_name === table && item.index_name === name);
}

function stateFor(values: boolean[]): MigrationState {
  if (values.every(Boolean)) return 'APPLIED';
  if (values.every((value) => !value)) return 'NOT_APPLIED';
  return 'PARTIALLY_APPLIED';
}

export function classifyMigrations(input: {
  columns: ColumnRow[];
  constraints: ConstraintRow[];
  indexes: IndexRow[];
}): MigrationClassification {
  const { columns, constraints, indexes } = input;
  const tablePresent = (table: string) => columns.some((item) => item.table_name === table);
  const baseForecastColumns = [
    'id', 'business_id', 'request_id', 'forecast_origin', 'target_period', 'data_provenance',
    'prospective_forecast', 'history_phase', 'history_fingerprint', 'transient_payload', 'mode',
    'status', 'deterministic_prediction_kwh', 'ml_prediction_kwh', 'ml_model', 'ml_model_version',
    'artifact_sha256', 'feature_schema_sha256', 'fallback_reason', 'inference_latency_ms',
    'actual_kwh', 'actual_kwh_source', 'actual_observed_at', 'absolute_error_ml',
    'absolute_error_deterministic', 'scored_at', 'claim_token', 'claimed_at', 'attempt_count',
    'next_attempt_at', 'created_at', 'updated_at',
  ];
  const enrollmentColumns = [
    'business_id', 'shadow_enabled', 'approved_provenance', 'enrolled_at', 'disabled_at',
    'enrollment_reason', 'created_at', 'updated_at',
  ];

  const rawStates: Record<MigrationName, MigrationState> = {
    '0011_ai_shadow_integration': stateFor([
      hasColumn(columns, 'business', 'data_provenance'),
      tablePresent('ai_shadow_forecast'),
      ...baseForecastColumns.map((column) => hasColumn(columns, 'ai_shadow_forecast', column)),
      hasConstraint(constraints, 'business', 'business_data_provenance_check'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_request_unique'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_mode_check'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_provenance_check'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_status_check'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_phase_check'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_actual_source_check'),
      constraints.some((item) => item.table_name === 'ai_shadow_forecast' && item.constraint_type === 'f' && item.definition.includes('business')),
      hasIndex(indexes, 'ai_shadow_forecast', 'ai_shadow_forecast_claim_idx'),
      hasIndex(indexes, 'ai_shadow_forecast', 'ai_shadow_forecast_business_target_idx'),
      hasIndex(indexes, 'ai_shadow_forecast', 'ai_shadow_forecast_real_evidence_idx'),
    ]),
    '0012_ai_shadow_evidence_integrity': stateFor([
      hasColumn(columns, 'ai_shadow_forecast', 'history_latest_period_end'),
      hasColumn(columns, 'ai_shadow_forecast', 'history_temporal_integrity'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_provenance_check', ['UNCLASSIFIED']),
    ]),
    '0013_ai_shadow_prospective_reachability': stateFor([
      hasColumn(columns, 'ai_shadow_forecast', 'target_outcome_unknown_at_forecast'),
      hasColumn(columns, 'ai_shadow_forecast', 'forecast_days_into_target'),
      hasConstraint(constraints, 'ai_shadow_forecast', 'ai_shadow_forecast_timing_check'),
    ]),
    '0014_ai_shadow_enrollment': stateFor([
      tablePresent('ai_shadow_enrollment'),
      ...enrollmentColumns.map((column) => hasColumn(columns, 'ai_shadow_enrollment', column)),
      hasConstraint(constraints, 'ai_shadow_enrollment', 'ai_shadow_enrollment_provenance_check'),
      hasConstraint(constraints, 'ai_shadow_enrollment', 'ai_shadow_enrollment_reason_check'),
      hasConstraint(constraints, 'ai_shadow_enrollment', 'ai_shadow_enrollment_state_check'),
      constraints.some((item) => item.table_name === 'ai_shadow_enrollment' && item.constraint_type === 'f' && item.definition.includes('business')),
      hasIndex(indexes, 'ai_shadow_enrollment', 'ai_shadow_enrollment_enabled_idx'),
    ]),
  };

  let gapFound = false;
  const states = { ...rawStates };
  for (const migration of MIGRATIONS) {
    const state = states[migration];
    if (state === 'NOT_APPLIED') gapFound = true;
    else if (gapFound && state === 'APPLIED') states[migration] = 'AMBIGUOUS';
  }
  const ambiguous = Object.values(states).some((state) => state === 'PARTIALLY_APPLIED' || state === 'AMBIGUOUS');
  const exactMissingMigrations = ambiguous
    ? null
    : MIGRATIONS.filter((migration) => states[migration] === 'NOT_APPLIED');
  return {
    states,
    exactMissingMigrations,
    exactForwardOrder: exactMissingMigrations,
    exactRollbackOrder: exactMissingMigrations ? [...exactMissingMigrations].reverse() : null,
    ambiguous,
  };
}

function normalizedSchema<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).sort(([left], [right]) => left.localeCompare(right))
  ));
}

function fingerprintSchema(input: {
  columns: ColumnRow[];
  constraints: ConstraintRow[];
  indexes: IndexRow[];
  migration: MigrationClassification;
}) {
  return createHash('sha256').update(JSON.stringify({
    columns: normalizedSchema(input.columns),
    constraints: normalizedSchema(input.constraints),
    indexes: normalizedSchema(input.indexes),
    migrationStates: input.migration.states,
  })).digest('hex');
}

function columnSet(columns: ColumnRow[], tableName: string) {
  return new Set(columns.filter((item) => item.table_name === tableName).map((item) => item.column_name));
}

async function groupedCount(
  connection: AuditConnection,
  tableName: 'ai_shadow_forecast' | 'ai_shadow_enrollment',
  columnName: string
) {
  const result = await connection.query<{ value: string | null; count: string | number }>(
    `/* ai06b1:aggregate */ SELECT ${columnName}::text AS value, count(*)::bigint AS count FROM ${tableName} GROUP BY ${columnName} ORDER BY ${columnName}`
  );
  return result.rows.map((row) => ({ value: row.value, count: normalizedCount(row.count) }));
}

async function collectAggregates(
  connection: AuditConnection,
  privileges: SafePrivilegeResult[],
  columns: ColumnRow[]
): Promise<Pick<ReadonlyAuditSnapshot, 'evidence' | 'enrollment'>> {
  const forecastPrivilege = privileges.find((item) => item.tableName === 'ai_shadow_forecast')!;
  const enrollmentPrivilege = privileges.find((item) => item.tableName === 'ai_shadow_enrollment')!;
  const emptyEvidence: ReadonlyAuditSnapshot['evidence'] = {
    aiShadowForecastPresent: forecastPrivilege.present,
    aggregateState: forecastPrivilege.present ? 'NOT_AUTHORIZED_TO_QUERY' : 'NOT_PRESENT',
    totalRows: null,
    byStatus: [], byProvenance: [], byTemporalIntegrity: [], byProspective: [],
  };
  const emptyEnrollment: ReadonlyAuditSnapshot['enrollment'] = {
    schemaPresent: enrollmentPrivilege.present,
    aggregateState: enrollmentPrivilege.present ? 'NOT_AUTHORIZED_TO_QUERY' : 'NOT_PRESENT',
    totalRows: null,
    byEnabled: [], byApprovedProvenance: [],
  };

  if (forecastPrivilege.present && forecastPrivilege.select) {
    const available = columnSet(columns, 'ai_shadow_forecast');
    const total = await connection.query<{ count: string | number }>(
      '/* ai06b1:aggregate */ SELECT count(*)::bigint AS count FROM ai_shadow_forecast'
    );
    emptyEvidence.aggregateState = 'AVAILABLE';
    emptyEvidence.totalRows = normalizedCount(total.rows[0]?.count);
    if (available.has('status')) emptyEvidence.byStatus = await groupedCount(connection, 'ai_shadow_forecast', 'status');
    if (available.has('data_provenance')) emptyEvidence.byProvenance = await groupedCount(connection, 'ai_shadow_forecast', 'data_provenance');
    if (available.has('history_temporal_integrity')) emptyEvidence.byTemporalIntegrity = await groupedCount(connection, 'ai_shadow_forecast', 'history_temporal_integrity');
    if (available.has('prospective_forecast')) emptyEvidence.byProspective = await groupedCount(connection, 'ai_shadow_forecast', 'prospective_forecast');
  }
  if (enrollmentPrivilege.present && enrollmentPrivilege.select) {
    const available = columnSet(columns, 'ai_shadow_enrollment');
    const total = await connection.query<{ count: string | number }>(
      '/* ai06b1:aggregate */ SELECT count(*)::bigint AS count FROM ai_shadow_enrollment'
    );
    emptyEnrollment.aggregateState = 'AVAILABLE';
    emptyEnrollment.totalRows = normalizedCount(total.rows[0]?.count);
    if (available.has('shadow_enabled')) emptyEnrollment.byEnabled = await groupedCount(connection, 'ai_shadow_enrollment', 'shadow_enabled');
    if (available.has('approved_provenance')) emptyEnrollment.byApprovedProvenance = await groupedCount(connection, 'ai_shadow_enrollment', 'approved_provenance');
  }
  return { evidence: emptyEvidence, enrollment: emptyEnrollment };
}

async function auditOnce(
  connectionString: string,
  target: ReturnType<typeof validateAuditTarget>,
  factory: AuditConnectionFactory
): Promise<ReadonlyAuditSnapshot> {
  const connection = factory(connectionString);
  let transactionStarted = false;
  try {
    await connection.connect();
    await connection.query('BEGIN READ ONLY');
    transactionStarted = true;
    await connection.query("SET LOCAL statement_timeout = '8000ms'");
    const identityResult = await connection.query<IdentityRow>(IDENTITY_SQL);
    const identityRow = identityResult.rows[0];
    if (!identityRow || !normalizedBoolean(identityRow.transaction_read_only)) {
      throw new ProductionAuditError('PRODUCTION_AUDIT_TRANSACTION_NOT_READ_ONLY');
    }
    const privilegeRows = (await connection.query<PrivilegeRow>(PRIVILEGES_SQL)).rows;
    const privileges = assertSafePrivileges(privilegeRows);
    const columns = (await connection.query<ColumnRow>(COLUMNS_SQL)).rows;
    const constraints = (await connection.query<ConstraintRow>(CONSTRAINTS_SQL)).rows;
    const indexes = (await connection.query<IndexRow>(INDEXES_SQL)).rows;
    const migration = classifyMigrations({ columns, constraints, indexes });
    const aggregates = await collectAggregates(connection, privileges, columns);
    const schemaFingerprint = fingerprintSchema({ columns, constraints, indexes, migration });
    await connection.query('ROLLBACK');
    transactionStarted = false;
    return {
      auditTimestamp: new Date().toISOString(),
      identity: {
        databaseName: identityRow.database_name,
        currentRole: identityRow.current_role,
        serverVersion: identityRow.server_version,
        transactionReadOnly: true,
        hostSha256: target.hostSha256,
        providerCandidate: target.providerCandidate,
        providerIdentityVerified: false,
      },
      writePrivilegesAbsent: true,
      privileges,
      schemaFingerprint,
      migration,
      schema: { columns, constraints, indexes },
      ...aggregates,
      privacy: { aggregateOnly: true, entityLevelOutput: false, connectionSecretIncluded: false },
    };
  } catch (error) {
    if (transactionStarted) {
      try { await connection.query('ROLLBACK'); } catch {}
    }
    if (error instanceof ProductionAuditError) throw error;
    throw new ProductionAuditError('PRODUCTION_READONLY_AUDIT_FAILED');
  } finally {
    try { await connection.end(); } catch {}
  }
}

export async function auditProductionDatabase(
  connectionString: string,
  options: {
    allowLocalForTests?: boolean;
    connectionFactory?: AuditConnectionFactory;
  } = {}
): Promise<ReadonlyAuditResult> {
  const target = validateAuditTarget(connectionString, options.allowLocalForTests ?? false);
  const factory = options.connectionFactory ?? defaultFactory;
  const first = await auditOnce(connectionString, target, factory);
  const second = await auditOnce(connectionString, target, factory);
  return {
    schemaVersion: '1.0',
    result: 'PASS',
    transactionReadOnly: true,
    writePrivilegesAbsent: true,
    schemaFingerprintReproducible: first.schemaFingerprint === second.schemaFingerprint,
    first,
    secondAuditTimestamp: second.auditTimestamp,
    secondSchemaFingerprint: second.schemaFingerprint,
  };
}

export function safeAuditError(error: unknown): string {
  return error instanceof ProductionAuditError ? error.code : 'PRODUCTION_READONLY_AUDIT_FAILED';
}
