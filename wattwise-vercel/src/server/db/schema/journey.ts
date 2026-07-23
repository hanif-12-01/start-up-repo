import { pgTable, text, timestamp, integer, boolean, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const PLAN_TYPES = ['FREE', 'PRO_TRIAL'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const userPlan = pgTable(
  'user_plan',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull(),
    trialStartsAt: timestamp('trial_starts_at', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key'),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('user_plan_user_id_unique').on(t.userId),
    unique('user_plan_idempotency_key_unique').on(t.idempotencyKey),
    check('user_plan_plan_check', sql`${t.plan} IN ('FREE', 'PRO_TRIAL')`),
    check(
      'user_plan_free_no_trial_check',
      sql`${t.plan} != 'FREE' OR (${t.trialStartsAt} IS NULL AND ${t.trialEndsAt} IS NULL)`
    ),
    check(
      'user_plan_trial_dates_required_check',
      sql`${t.plan} != 'PRO_TRIAL' OR (${t.trialStartsAt} IS NOT NULL AND ${t.trialEndsAt} IS NOT NULL)`
    ),
    check(
      'user_plan_trial_end_after_start_check',
      sql`${t.trialStartsAt} IS NULL OR ${t.trialEndsAt} > ${t.trialStartsAt}`
    ),
  ]
);

export const BUSINESS_TYPES = ['KOS_PROPERTY', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const ELECTRICAL_SYSTEMS = ['ALL_IN', 'TOKEN_PER_KAMAR', 'SUB_METER', 'PATUNGAN', 'CAMPURAN'] as const;
export type ElectricalSystem = (typeof ELECTRICAL_SYSTEMS)[number];

export const BUSINESS_SEGMENTS = ['KOS', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER'] as const;
export type BusinessSegment = (typeof BUSINESS_SEGMENTS)[number];

export const business = pgTable(
  'business',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    businessType: text('business_type').notNull(),
    city: text('city'),
    segment: text('segment').notNull(),
    electricalSystem: text('electrical_system').notNull(),
    roomCount: integer('room_count'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('business_room_count_check', sql`${t.roomCount} IS NULL OR ${t.roomCount} >= 0`),
    check(
      'business_type_check',
      sql`${t.businessType} IN ('KOS_PROPERTY', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')`
    ),
    check(
      'business_segment_check',
      sql`${t.segment} IN ('KOS', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')`
    ),
    check(
      'business_electrical_system_check',
      sql`${t.electricalSystem} IN ('ALL_IN', 'TOKEN_PER_KAMAR', 'SUB_METER', 'PATUNGAN', 'CAMPURAN')`
    ),
  ]
);
