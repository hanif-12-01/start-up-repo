# Secret Rotation Runbook — WattWise AI

## 1. Scope
This runbook defines rotation procedures for production secrets, database credentials, authentication keys (`BETTER_AUTH_SECRET`), and Vercel protection bypass secrets.

## 2. Capability & Target Classifications
- **Database Credential Rotation (`DATABASE_URL`)**: `verified capability` (Verified via Neon CLI role password reset & Vercel env update)
- **Authentication Key Rotation (`BETTER_AUTH_SECRET`)**: `verified capability with session invalidation` (Current Better Auth implementation immediately invalidates active user cookie signatures upon secret change; zero-downtime dual-key rotation is NOT implemented and requires a scheduled maintenance window)
- **Vercel Protection Bypass Secret Rotation**: `verified capability` (Verified via Vercel CLI protection bypass key rotation)

## 3. Session Invalidation & Overlap Strategy for `BETTER_AUTH_SECRET`
> [!WARNING]
> **Session Invalidation Notice**: Better Auth uses `BETTER_AUTH_SECRET` to sign session cookies (`HMAC-SHA256`). Rotating `BETTER_AUTH_SECRET` in production immediately invalidates all existing client session cookies. Active logged-in users will be required to re-authenticate upon their next request.
> Zero-downtime session overlap (dual-key signing) is NOT supported in the current Better Auth release. All `BETTER_AUTH_SECRET` rotations MUST be scheduled during an announced low-traffic maintenance window.

## 4. Prerequisites
- Vercel CLI access with Production environment modification permissions.
- Neon CLI or Neon Console access for database role/password rotation.
- Secure password generator capable of generating 32+ character high-entropy secrets.

## 5. Authorized Operator
- Security Lead / Lead System Administrator.

## 6. Secret Inventory & Rotation Cadence
| Secret Name | Scope | Rotation Frequency | Rotation Impact & Downtime Strategy |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server-only | 90 days / On Compromise | Re-requires serverless function connection pool refresh (Zero user downtime) |
| `BETTER_AUTH_SECRET` | Server-only | 180 days / On Compromise | **Invalidates active session cookies** (Requires scheduled maintenance window notification) |
| `VERCEL_PROTECTION_BYPASS` | Environment-specific | 30 days / On Compromise | Updates automated test bypass header requirement (Zero user downtime) |

## 7. Commands & UI Workflow
```powershell
# 1. Rotate Neon Database Role Password
npx neonctl connection-string --project-id <project-id> --role-name <app-role> --reset-password

# 2. Update Vercel Production Environment Variable (DATABASE_URL)
npx vercel env add DATABASE_URL production --value "<new-pooled-connection-string>" --yes --force

# 3. Rotate BETTER_AUTH_SECRET (32-character high entropy) during maintenance window
$newAuthSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
npx vercel env add BETTER_AUTH_SECRET production --value "$newAuthSecret" --yes --force

# 4. Trigger seamless deployment to propagate new environment variables
npx vercel --prod
```

## 8. Safety Checks
- Verify new database connection string includes `ssl: true` and connects successfully before redeploying.
- Verify new `BETTER_AUTH_SECRET` is at least 32 characters in length.
- Confirm zero secret values are committed to git history or printed in CI/CD console logs.

## 9. Evidence Required
- Secret rotation log recording secret name, rotation timestamp, operator ID, and verification status.
- Post-rotation HTTP readiness test log (`/api/health/ready`).
- Audit log showing old secret key destruction.

## 10. Stop Conditions
- Database authentication failure following credential update.
- Application deployment failure during secret propagation.
- Unplanned session termination affecting active critical sessions without maintenance window notice.

## 11. Post-Action Verification
- Execute `/api/health/ready` probe to confirm database connectivity with rotated secret.
- Test user login flow to confirm session creation with new `BETTER_AUTH_SECRET`.
- Revoke old database credentials/passwords in Neon console once connection switch is verified.

## 12. Forbidden Actions
- NEVER commit plain-text rotated secrets into repository files, environment templates, or runbooks.
- NEVER reuse previously compromised secret strings.
- NEVER rotate `BETTER_AUTH_SECRET` without warning users of session invalidation during unannounced periods.
