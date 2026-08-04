# Secret Rotation Runbook — WattWise AI

## 1. Scope
This runbook defines zero-downtime rotation procedures for production secrets, database credentials, authentication keys (`BETTER_AUTH_SECRET`), and Vercel protection bypass secrets.

## 2. Prerequisites
- Vercel CLI access with Production environment modification permissions.
- Neon CLI or Neon Console access for database role/password rotation.
- Secure password generator capable of generating 32+ character high-entropy secrets.

## 3. Authorized Operator
- Security Lead / Lead System Administrator.

## 4. Secret Inventory & Rotation Cadence
| Secret Name | Scope | Rotation Frequency | Rotation Impact |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server-only | 90 days / On Compromise | Re-requires serverless function connection pool refresh |
| `BETTER_AUTH_SECRET` | Server-only | 180 days / On Compromise | Invalidates active user session cookies |
| `VERCEL_PROTECTION_BYPASS` | Environment-specific | 30 days / On Compromise | Updates automated test bypass header requirement |

## 5. Commands & UI Workflow
```powershell
# 1. Rotate Neon Database Role Password
npx neonctl connection-string --project-id <project-id> --role-name <app-role> --reset-password

# 2. Update Vercel Production Environment Variable (DATABASE_URL)
npx vercel env add DATABASE_URL production --value "<new-pooled-connection-string>" --yes --force

# 3. Rotate BETTER_AUTH_SECRET (32-character high entropy)
$newAuthSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
npx vercel env add BETTER_AUTH_SECRET production --value "$newAuthSecret" --yes --force

# 4. Trigger seamless deployment to propagate new environment variables
npx vercel --prod
```

## 6. Safety Checks
- Verify new database connection string includes `ssl: true` and connects successfully before redeploying.
- Verify new `BETTER_AUTH_SECRET` is at least 32 characters in length.
- Confirm zero secret values are committed to git history or printed in CI/CD console logs.

## 7. Evidence Required
- Secret rotation log recording secret name, rotation timestamp, operator ID, and verification status.
- Post-rotation HTTP readiness test log (`/api/health/ready`).
- Audit log showing old secret key destruction.

## 8. Stop Conditions
- Database authentication failure following credential update.
- Application deployment failure during secret propagation.
- Unplanned session termination affecting active critical sessions without maintenance window notice.

## 9. Post-Action Verification
- Execute `/api/health/ready` probe to confirm database connectivity with rotated secret.
- Test user login flow to confirm session creation with new `BETTER_AUTH_SECRET`.
- Revoke old database credentials/passwords in Neon console once connection switch is verified.

## 10. Forbidden Actions
- NEVER commit plain-text rotated secrets into repository files, environment templates, or runbooks.
- NEVER reuse previously compromised secret strings.
- NEVER rotate `BETTER_AUTH_SECRET` without warning users of session invalidation during unannounced periods.
