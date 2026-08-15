import { and, eq, inArray, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { buildContinuousHistory, requestedEngineForPhase } from './phase-aware-forecast.service';
import { buildUsageSamplesFromBills } from './product-analysis';
import { isDemoEnvironmentAllowed } from './qa-demo-provisioning.service';

export const AI_VALIDATION_PREVIEW_PROJECT_ID = 'shy-art-58672693';
export const AI_VALIDATION_BUSINESS_NAMES = [
  'AI Validation H00',
  'AI Validation H01_02',
  'AI Validation H03_05',
  'AI Validation H06_12',
  'AI Validation H13_PLUS',
  'AI Validation GAP',
] as const;

function assertAiValidationEnvironment(): void {
  const demoGuard = isDemoEnvironmentAllowed();
  if (!demoGuard.allowed) throw new Error(`AI validation provisioning rejected: ${demoGuard.reason}`);
  if (
    process.env.VERCEL_ENV === 'preview' &&
    process.env.WATTWISE_PREVIEW_DATABASE_PROJECT_ID !== AI_VALIDATION_PREVIEW_PROJECT_ID
  ) {
    throw new Error('AI validation provisioning rejected: Preview database identity mismatch.');
  }
}

function credentials(): { email: string; password: string } {
  const email = (process.env.AI_VALIDATION_EMAIL ?? 'ai-validation@wattwise.demo').trim().toLowerCase();
  const password = process.env.AI_VALIDATION_PASSWORD ?? '';
  if (!password || password.length < 12) {
    throw new Error('AI_VALIDATION_PASSWORD must contain at least 12 characters.');
  }
  return { email, password };
}

function monthAt(anchor: string, offset: number): { month: string; start: string; end: string } {
  const [year, month] = anchor.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1 + offset, 1));
  const valueYear = value.getUTCFullYear();
  const valueMonth = value.getUTCMonth();
  const monthString = `${valueYear}-${String(valueMonth + 1).padStart(2, '0')}`;
  const finalDay = new Date(Date.UTC(valueYear, valueMonth + 1, 0)).getUTCDate();
  return {
    month: monthString,
    start: `${monthString}-01`,
    end: `${monthString}-${String(finalDay).padStart(2, '0')}`,
  };
}

function monthsForFixture(name: (typeof AI_VALIDATION_BUSINESS_NAMES)[number]): number[] {
  if (name === 'AI Validation H00') return [];
  if (name === 'AI Validation H01_02') return [-2, -1];
  if (name === 'AI Validation H03_05') return [-4, -3, -2, -1];
  if (name === 'AI Validation H06_12') return [-8, -7, -6, -5, -4, -3, -2, -1];
  if (name === 'AI Validation H13_PLUS') {
    return Array.from({ length: 18 }, (_, index) => index - 18);
  }
  return [-9, -8, -7, -3, -2, -1];
}

async function removeValidationBusinesses(
  tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
  userId: string
): Promise<void> {
  await tx
    .delete(schema.business)
    .where(
      and(
        eq(schema.business.userId, userId),
        inArray(schema.business.name, [...AI_VALIDATION_BUSINESS_NAMES])
      )
    );
}

export async function seedAiValidationDemo(anchorMonth = new Date().toISOString().slice(0, 7)) {
  assertAiValidationEnvironment();
  const { email, password } = credentials();
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended('wattwise_ai_validation_provisioning_lock', 0))`
    );
    const existingUsers = await tx
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    const hashedPassword = await hashPassword(password);
    let userId: string;
    if (existingUsers.length) {
      const existing = existingUsers[0];
      if (existing.name !== 'WattWise AI Validation' || !existing.id.startsWith('user-ai-validation-')) {
        throw new Error('AI validation email belongs to a non-validation identity.');
      }
      userId = existing.id;
      await tx
        .update(schema.user)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(schema.user.id, userId));
      const accounts = await tx
        .select()
        .from(schema.account)
        .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'credential')))
        .limit(1);
      if (accounts.length) {
        await tx
          .update(schema.account)
          .set({ password: hashedPassword, updatedAt: new Date() })
          .where(eq(schema.account.id, accounts[0].id));
      } else {
        await tx.insert(schema.account).values({
          id: `account-ai-validation-${crypto.randomUUID()}`,
          userId,
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
        });
      }
    } else {
      userId = `user-ai-validation-${crypto.randomUUID()}`;
      await tx.insert(schema.user).values({
        id: userId,
        name: 'WattWise AI Validation',
        email,
        emailVerified: true,
      });
      await tx.insert(schema.account).values({
        id: `account-ai-validation-${crypto.randomUUID()}`,
        userId,
        accountId: email,
        providerId: 'credential',
        password: hashedPassword,
      });
    }

    await tx
      .insert(schema.userPlan)
      .values({ id: `plan-ai-validation-${crypto.randomUUID()}`, userId, plan: 'BUSINESS', onboardingCompletedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.userPlan.userId,
        set: { plan: 'BUSINESS', onboardingCompletedAt: new Date(), updatedAt: new Date() },
      });
    await removeValidationBusinesses(tx, userId);

    const businesses: Array<{ id: string; name: string; expectedHistoryMonths: number }> = [];
    for (const [fixtureIndex, name] of AI_VALIDATION_BUSINESS_NAMES.entries()) {
      const businessId = `business-ai-validation-${crypto.randomUUID()}`;
      const offsets = monthsForFixture(name);
      await tx.insert(schema.business).values({
        id: businessId,
        userId,
        name,
        businessType: 'OTHER',
        city: 'Bandung',
        province: 'Jawa Barat',
        segment: 'OTHER',
        electricalSystem: 'ALL_IN',
        employeeCount: 8,
        operatingDaysPerMonth: 26,
        tariffRupiahPerKwh: '1500.00',
        businessNotes: 'SYNTHETIC_DEMO — Preview-only phase-aware AI validation fixture.',
        electricityNotes: 'Data sintetis, bukan data pelanggan dan bukan data resmi PLN.',
      });
      for (const [index, offset] of offsets.entries()) {
        const period = monthAt(anchorMonth, offset);
        const usageKwh = 820 + fixtureIndex * 75 + index * 18 + ((index * 17) % 29);
        await tx.insert(schema.electricityBill).values({
          id: `bill-ai-validation-${crypto.randomUUID()}`,
          businessId,
          periodStart: period.start,
          periodEnd: period.end,
          totalAmountRupiah: BigInt(Math.round(usageKwh * 1_500)),
          kwh: usageKwh.toFixed(3),
          tariffRupiahPerKwh: '1500.00',
          kwhSource: 'USER_ENTERED',
          paymentMethod: 'Pascabayar',
          notes: `SYNTHETIC_DEMO fixed fixture ${name} ${period.month}`,
        });
      }
      const expectedHistoryMonths = name === 'AI Validation GAP' ? 3 : offsets.length;
      businesses.push({ id: businessId, name, expectedHistoryMonths });
    }
    return { userId, email, dataProvenance: 'SYNTHETIC_DEMO' as const, businesses };
  });
}

export async function checkAiValidationDemo(anchorMonth = new Date().toISOString().slice(0, 7)) {
  assertAiValidationEnvironment();
  const { email } = credentials();
  const db = getDb();
  const users = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (!users.length) return { ready: false, reason: 'VALIDATION_USER_MISSING', businesses: [] };
  const user = users[0];
  if (user.name !== 'WattWise AI Validation' || !user.id.startsWith('user-ai-validation-')) {
    return { ready: false, reason: 'VALIDATION_IDENTITY_MISMATCH', businesses: [] };
  }
  const rows = await db
    .select()
    .from(schema.business)
    .where(and(eq(schema.business.userId, user.id), inArray(schema.business.name, [...AI_VALIDATION_BUSINESS_NAMES])));
  const results = [];
  for (const business of rows) {
    const bills = await db
      .select()
      .from(schema.electricityBill)
      .where(eq(schema.electricityBill.businessId, business.id));
    const samples = buildUsageSamplesFromBills(bills);
    const history = buildContinuousHistory(samples, new Date(`${anchorMonth}-15T00:00:00.000Z`));
    results.push({
      id: business.id,
      name: business.name,
      billCount: bills.length,
      continuousHistoryMonths: history.continuousHistoryMonths,
      reportingPhase: history.reportingPhase,
      requestedEngine: requestedEngineForPhase(history.reportingPhase),
    });
  }
  const expected = new Map([
    ['AI Validation H00', ['H00', 'deterministic_baseline', 0]],
    ['AI Validation H01_02', ['H01_02', 'deterministic_baseline', 2]],
    ['AI Validation H03_05', ['H03_05', 'lightgbm', 4]],
    ['AI Validation H06_12', ['H06_12', 'nbeats', 8]],
    ['AI Validation H13_PLUS', ['H13_PLUS', 'nbeats', 18]],
    ['AI Validation GAP', ['H03_05', 'lightgbm', 3]],
  ] as const);
  const ready = results.length === expected.size && results.every((result) => {
    const value = expected.get(result.name as (typeof AI_VALIDATION_BUSINESS_NAMES)[number]);
    return value && result.reportingPhase === value[0] && result.requestedEngine === value[1] && result.continuousHistoryMonths === value[2];
  });
  return { ready, reason: ready ? null : 'VALIDATION_FIXTURE_MISMATCH', userId: user.id, businesses: results };
}

export async function resetAiValidationDemo(): Promise<void> {
  assertAiValidationEnvironment();
  const { email } = credentials();
  const db = getDb();
  await db.transaction(async (tx) => {
    const users = await tx.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
    if (!users.length) return;
    const user = users[0];
    if (user.name !== 'WattWise AI Validation' || !user.id.startsWith('user-ai-validation-')) {
      throw new Error('AI validation reset refused for non-validation identity.');
    }
    await removeValidationBusinesses(tx, user.id);
  });
}
