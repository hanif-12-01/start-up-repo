import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';

export interface EnrollmentChange {
  businessId: string;
  action: 'ENROLL' | 'DISABLE';
  reason: string;
  dryRun: boolean;
}

export async function setShadowEnrollment(
  input: EnrollmentChange,
  client: PoolClient | null = null
) {
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(input.businessId)) throw new Error('BUSINESS_ID_INVALID');
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new Error('ENROLLMENT_REASON_INVALID');
  const executor = client ?? getPool();
  const business = await executor.query<{ data_provenance: string }>(
    `SELECT data_provenance FROM business WHERE id = $1 LIMIT 1`,
    [input.businessId]
  );
  if (!business.rows[0]) throw new Error('BUSINESS_NOT_FOUND');
  if (input.action === 'ENROLL' && business.rows[0].data_provenance !== 'REAL_WATTWISE') {
    throw new Error('REAL_WATTWISE_CLASSIFICATION_REQUIRED');
  }
  if (input.dryRun) {
    return { businessId: input.businessId, action: input.action, changed: false, dryRun: true };
  }
  if (input.action === 'ENROLL') {
    await executor.query(
      `INSERT INTO ai_shadow_enrollment (
         business_id, shadow_enabled, approved_provenance, enrolled_at,
         disabled_at, enrollment_reason
       ) VALUES ($1, true, 'REAL_WATTWISE', NOW(), NULL, $2)
       ON CONFLICT (business_id) DO UPDATE
         SET shadow_enabled = true, approved_provenance = 'REAL_WATTWISE',
             enrolled_at = COALESCE(ai_shadow_enrollment.enrolled_at, NOW()),
             disabled_at = NULL, enrollment_reason = EXCLUDED.enrollment_reason,
             updated_at = NOW()`,
      [input.businessId, reason]
    );
  } else {
    await executor.query(
      `INSERT INTO ai_shadow_enrollment (
         business_id, shadow_enabled, approved_provenance, enrolled_at,
         disabled_at, enrollment_reason
       ) VALUES ($1, false, 'REAL_WATTWISE', NULL, NOW(), $2)
       ON CONFLICT (business_id) DO UPDATE
         SET shadow_enabled = false, disabled_at = COALESCE(ai_shadow_enrollment.disabled_at, NOW()),
             enrollment_reason = EXCLUDED.enrollment_reason, updated_at = NOW()`,
      [input.businessId, reason]
    );
    await executor.query(
      `UPDATE ai_shadow_forecast
          SET status = 'NOT_ELIGIBLE', transient_payload = NULL,
              fallback_reason = 'COHORT_DISABLED', updated_at = NOW()
        WHERE business_id = $1
          AND status IN ('PENDING', 'FAILED_RETRYABLE')`,
      [input.businessId]
    );
  }
  return { businessId: input.businessId, action: input.action, changed: true, dryRun: false };
}

export async function countEnabledRealEnrollments(): Promise<number> {
  const result = await getPool().query<{ count: number }>(
    `SELECT count(*)::int AS count FROM ai_shadow_enrollment
      WHERE shadow_enabled = true AND approved_provenance = 'REAL_WATTWISE'`
  );
  return result.rows[0]?.count ?? 0;
}
