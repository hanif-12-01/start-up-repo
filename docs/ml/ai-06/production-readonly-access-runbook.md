# AI-06B.1 Production Read-Only Access Runbook

## Purpose and stop conditions

Use this runbook only when an authorized database operator provides a dedicated, short-lived,
least-privilege identity. Never substitute the production application `DATABASE_URL`, owner role,
Vercel environment extraction, local disposable database, preview database, or a broadly privileged
credential.

Stop immediately if the role has INSERT, UPDATE, DELETE, or TRUNCATE on `business`,
`electricity_bill`, `ai_shadow_forecast`, or `ai_shadow_enrollment`. The auditor returns
`PRODUCTION_AUDIT_ROLE_TOO_PRIVILEGED` before collecting schema metadata.

## Operator-side identity provisioning

The database owner performs this outside Codex and outside Git. The exact provider procedure is
provider-specific, but the resulting role must have only:

- database CONNECT;
- USAGE on the application schema;
- visibility of `information_schema` and `pg_catalog`;
- SELECT on `business` and `electricity_bill` only if required to verify privileges;
- optional SELECT on `ai_shadow_forecast` and `ai_shadow_enrollment` for aggregate-only counts.

Do not grant ownership, SUPERUSER, BYPASSRLS, CREATE, TEMPORARY, role administration, replication,
or write privileges. Prefer an identity with an explicit expiry or revoke it immediately after two
matching audit runs.

## Direct auditor path

Set the credential only in the operator's process environment:

```powershell
$env:WATTWISE_PROD_READONLY_DATABASE_URL = '<dedicated short-lived read-only URL>'
npm run ai:production:audit
Remove-Item Env:WATTWISE_PROD_READONLY_DATABASE_URL
```

The script:

- never reads `DATABASE_URL`;
- rejects localhost/loopback targets;
- opens `BEGIN READ ONLY` with an eight-second statement timeout;
- verifies `transaction_read_only=true` and effective table privileges;
- runs the catalog/signature audit twice;
- emits only safe database identity, host SHA-256, catalog metadata, aggregate counts, and a
  reproducible schema fingerprint;
- never prints the connection URL, hostname, password, business ID, request ID, forecast row,
  electricity history, or owner data.

Capture stdout in an operator-controlled encrypted location. Review it before sharing the sanitized
JSON. Never paste shell history or environment output.

## Independently executed SQL path

If direct credentials cannot enter this workspace:

1. Start a provider SQL console/session using the dedicated read-only role.
2. explicitly set the session/transaction to read-only and a 5-10 second statement timeout using
   provider controls;
3. verify `transaction_read_only=true` in the first result;
4. run `production-schema-readonly-audit.sql` twice without editing it;
5. stop if any write-privilege boolean is true;
6. provide only the sanitized result tables and timestamps.

The SQL file contains catalog and information-schema reads only. It deliberately omits row-level
business/electricity data. If evidence-table aggregate counts are approved, prefer the TypeScript
auditor; it queries only count/group values after confirming SELECT access and never emits entity
columns.

## Database and provider identity

A result is not production evidence until the operator independently confirms:

- provider project/database identity;
- production branch/endpoint classification;
- safe database name and server version;
- host fingerprint match without disclosing the hostname;
- dedicated role name and read-only state;
- provider-authoritative backup/PITR metadata.

Reject `127.0.0.1`, `localhost`, disposable, test, preview, and branch-rehearsal resources.

## Revocation

After the second matching fingerprint:

1. revoke or expire the dedicated audit credential;
2. terminate its remaining sessions if supported;
3. retain only the sanitized result and provider verification timestamp;
4. confirm no production mutation occurred;
5. repeat the entire audit if the release or schema changes before Stage B2.
