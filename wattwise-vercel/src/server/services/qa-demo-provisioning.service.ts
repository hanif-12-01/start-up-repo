import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { getMonthlyReportReadModel } from '@/server/services/monthly-report.service';

export function isDemoEnvironmentAllowed(): { allowed: boolean; reason?: string } {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const qaDemoEnabled = process.env.QA_DEMO_ENABLED;

  // Unconditional refusal for Vercel Production
  if (vercelEnv === 'production') {
    return { allowed: false, reason: 'VERCEL_ENV is set to production. QA Demo provisioning refused.' };
  }

  // Vercel Preview requires explicit opt-in QA_DEMO_ENABLED === 'true'
  if (vercelEnv === 'preview') {
    if (qaDemoEnabled === 'true') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'VERCEL_ENV is preview but QA_DEMO_ENABLED is not set to true.' };
  }

  // If VERCEL_ENV is set to any unrecognized value in production-like runtime -> DENY
  if (vercelEnv && vercelEnv !== 'development' && vercelEnv !== 'test' && vercelEnv !== 'preview') {
    return { allowed: false, reason: `Unrecognized VERCEL_ENV=${vercelEnv}. QA Demo provisioning refused.` };
  }

  // Non-Vercel local development or test runtime -> ALLOW
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return { allowed: true };
  }

  // Non-Vercel NODE_ENV === 'production' without recognized Vercel Preview context -> DENY
  if (nodeEnv === 'production') {
    return { allowed: false, reason: 'NODE_ENV is production and non-Vercel runtime detected. QA Demo provisioning refused.' };
  }

  // Default fallback for unknown environments -> DENY
  return { allowed: false, reason: 'Unknown or unapproved environment runtime. QA Demo provisioning refused.' };
}

export function getDemoCredentials(): { email: string; password?: string } {
  const email = (process.env.QA_DEMO_EMAIL || 'qa-demo@wattwise.test').trim().toLowerCase();
  const password = process.env.QA_DEMO_PASSWORD;
  return { email, password };
}

export interface QaDemoSeedOptions {
  anchorMonth?: string; // YYYY-MM format, defaults to current month
}

function getMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function subMonthsStr(anchorMonthStr: string, subCount: number): string {
  const [yearStr, monthStr] = anchorMonthStr.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 - subCount, 1);
  return getMonthString(date);
}

function getMonthDateBounds(monthStr: string): { start: string; end: string } {
  const [yearStr, mStr] = monthStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(mStr, 10);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0); // last day of month

  const formatIso = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  return { start: formatIso(startDate), end: formatIso(endDate) };
}

export async function seedQaDemoAccount(options?: QaDemoSeedOptions): Promise<{
  userId: string;
  businessId: string;
  email: string;
  billCount: number;
  revenueCount: number;
  applianceCount: number;
}> {
  const envGuard = isDemoEnvironmentAllowed();
  if (!envGuard.allowed) {
    throw new Error(`QA Demo provisioning rejected: ${envGuard.reason}`);
  }

  const { email, password } = getDemoCredentials();
  if (!password || password.length < 8) {
    throw new Error('QA_DEMO_PASSWORD must be provided via environment variable (minimum 8 characters).');
  }

  const db = getDb();
  const anchorMonth = options?.anchorMonth || getMonthString(new Date());

  return await db.transaction(async (tx) => {
    // Acquire PostgreSQL advisory transaction lock for concurrency safety
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('wattwise_qa_demo_provisioning_lock', 0))`);

    // 1. Better Auth User & Account setup with Demo Identity Invariant Protection (GAP 2)
    const existingUsers = await tx.select().from(schema.user).where(sql`${schema.user.email} = ${email}`).limit(1);
    let userId: string;

    const hashedPassword = await hashPassword(password);

    if (existingUsers.length > 0) {
      const userRow = existingUsers[0];
      // Hijack Protection: verify that matched existing user is a recognized QA Demo identity
      const isDemoIdentity = userRow.name === 'WattWise QA Demo' && userRow.id.startsWith('user-qa-demo-');
      if (!isDemoIdentity) {
        throw new Error(`QA Demo provisioning refused: configured email (${email}) belongs to a non-demo user.`);
      }

      userId = userRow.id;
      // Update verification status & timestamp
      await tx.update(schema.user).set({
        name: 'WattWise QA Demo',
        emailVerified: true,
        updatedAt: new Date(),
      }).where(sql`${schema.user.id} = ${userId}`);

      // Upsert account credential password
      const existingAccounts = await tx.select().from(schema.account)
        .where(sql`${schema.account.userId} = ${userId} AND ${schema.account.providerId} = 'credential'`)
        .limit(1);

      if (existingAccounts.length > 0) {
        await tx.update(schema.account).set({
          password: hashedPassword,
          updatedAt: new Date(),
        }).where(sql`${schema.account.id} = ${existingAccounts[0].id}`);
      } else {
        await tx.insert(schema.account).values({
          id: `acc-demo-${crypto.randomUUID()}`,
          userId,
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      userId = `user-qa-demo-${crypto.randomUUID()}`;
      await tx.insert(schema.user).values({
        id: userId,
        name: 'WattWise QA Demo',
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(schema.account).values({
        id: `acc-demo-${crypto.randomUUID()}`,
        userId,
        accountId: email,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 2. Entitlement User Plan (PRO_TRIAL)
    const existingPlans = await tx.select().from(schema.userPlan).where(sql`${schema.userPlan.userId} = ${userId}`).limit(1);
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existingPlans.length > 0) {
      await tx.update(schema.userPlan).set({
        plan: 'PRO_TRIAL',
        status: 'ACTIVE',
        trialStartsAt: now,
        trialEndsAt: thirtyDaysLater,
        onboardingCompletedAt: now,
        updatedAt: now,
      }).where(sql`${schema.userPlan.id} = ${existingPlans[0].id}`);
    } else {
      await tx.insert(schema.userPlan).values({
        id: `plan-demo-${crypto.randomUUID()}`,
        userId,
        plan: 'PRO_TRIAL',
        status: 'ACTIVE',
        trialStartsAt: now,
        trialEndsAt: thirtyDaysLater,
        onboardingCompletedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Primary Business Setup (Kos Melati Demo)
    const existingBusinesses = await tx.select().from(schema.business)
      .where(sql`${schema.business.userId} = ${userId} AND ${schema.business.name} = 'Kos Melati Demo'`)
      .limit(1);

    let businessId: string;
    if (existingBusinesses.length > 0) {
      businessId = existingBusinesses[0].id;
      await tx.update(schema.business).set({
        businessType: 'KOS_PROPERTY',
        segment: 'KOS',
        electricalSystem: 'ALL_IN',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        address: 'Jl. Melati QA No. 12',
        roomCount: 20,
        occupiedRoomCount: 16,
        employeeCount: 2,
        operatingDaysPerMonth: 30,
        customerType: 'Bisnis/Rumah Tangga',
        powerVa: 2200,
        tariffRupiahPerKwh: '1444.70',
        paymentMethod: 'Pascabayar',
        isActive: true,
        updatedAt: now,
      }).where(sql`${schema.business.id} = ${businessId}`);
    } else {
      businessId = `biz-demo-${crypto.randomUUID()}`;
      await tx.insert(schema.business).values({
        id: businessId,
        userId,
        name: 'Kos Melati Demo',
        businessType: 'KOS_PROPERTY',
        segment: 'KOS',
        electricalSystem: 'ALL_IN',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        address: 'Jl. Melati QA No. 12',
        roomCount: 20,
        occupiedRoomCount: 16,
        employeeCount: 2,
        operatingDaysPerMonth: 30,
        customerType: 'Bisnis/Rumah Tangga',
        powerVa: 2200,
        tariffRupiahPerKwh: '1444.70',
        paymentMethod: 'Pascabayar',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Business-Scoped Cleanup for Kos Melati Demo ONLY (GAP 3)
    await tx.delete(schema.actionOutcomeEvaluation).where(
      sql`action_plan_id IN (SELECT id FROM energy_action_plan WHERE business_id = ${businessId})`
    );
    await tx.delete(schema.energyActionPlan).where(sql`business_id = ${businessId}`);
    await tx.delete(schema.inspectionItem).where(
      sql`plan_id IN (SELECT id FROM inspection_plan WHERE business_id = ${businessId})`
    );
    await tx.delete(schema.inspectionPlan).where(sql`business_id = ${businessId}`);
    await tx.delete(schema.diagnosticCandidate).where(
      sql`diagnostic_session_id IN (SELECT id FROM diagnostic_session WHERE business_id = ${businessId})`
    );
    await tx.delete(schema.diagnosticSession).where(sql`business_id = ${businessId}`);
    await tx.delete(schema.appliance).where(sql`business_id = ${businessId}`);
    await tx.delete(schema.revenueEntry).where(sql`business_id = ${businessId}`);
    await tx.delete(schema.electricityBill).where(sql`business_id = ${businessId}`);

    // 5. Seed 18 Months Electricity History & Revenue History
    const billIdsCreated: string[] = [];
    const tariff = 1444.70;
    const baseMeter = 42000.0;
    let cumulativeKwh = 0.0;

    for (let i = 0; i < 18; i++) {
      const monthStr = subMonthsStr(anchorMonth, 17 - i);
      const { start, end } = getMonthDateBounds(monthStr);

      let usageKwh: number;
      if (i < 12) {
        usageKwh = 460 + (i % 3) * 15;
      } else if (i === 12) {
        usageKwh = 520;
      } else if (i === 13) {
        usageKwh = 540; // Month 14 (Referenced bill)
      } else if (i === 14) {
        usageKwh = 560;
      } else if (i === 15) {
        usageKwh = 570;
      } else if (i === 16) {
        usageKwh = 480; // Month 17 baseline return
      } else {
        usageKwh = 680; // Month 18 (Intentional spike -> Boros)
      }

      let totalAmountRupiah = BigInt(Math.round(usageKwh * tariff));
      let kwhValue: string | null = usageKwh.toFixed(3);
      const tariffValue: string | null = '1444.70';
      let meterStart: string | null = null;
      let meterEnd: string | null = null;
      let kwhSource: 'USER_ENTERED' | 'METER_DERIVED' | 'LEGACY_UNKNOWN' = 'USER_ENTERED';
      let notes = 'Data sintetis QA WattWise AI. Bukan tagihan resmi PLN.';

      // Provenance mix logic with corrected raw null-kWh semantics (GAP 7)
      if (i === 0) {
        kwhSource = 'LEGACY_UNKNOWN';
      } else if (i === 9) {
        // Month 10: BILL_TARIFF_DERIVED fixture within latest 12 bills (kwh = null, raw source = LEGACY_UNKNOWN)
        kwhSource = 'LEGACY_UNKNOWN';
        kwhValue = null;
      } else if (i === 10) {
        // Month 11: Zero usage period within latest 12 bills (kwh = '0.000', raw source = USER_ENTERED)
        kwhSource = 'USER_ENTERED';
        usageKwh = 0;
        kwhValue = '0.000';
        totalAmountRupiah = BigInt(50000);
        notes = 'Kos libur semester / zero usage (Data sintetis QA WattWise AI)';
      } else if (i >= 4 && i <= 8) {
        kwhSource = 'METER_DERIVED';
        const mStart = baseMeter + cumulativeKwh;
        const mEnd = mStart + usageKwh;
        meterStart = mStart.toFixed(3);
        meterEnd = mEnd.toFixed(3);
      }

      cumulativeKwh += usageKwh;

      const billId = `bill-demo-${i + 1}-${crypto.randomUUID()}`;
      billIdsCreated.push(billId);

      await tx.insert(schema.electricityBill).values({
        id: billId,
        businessId,
        periodStart: start,
        periodEnd: end,
        totalAmountRupiah,
        kwh: kwhValue,
        tariffRupiahPerKwh: tariffValue,
        meterStart,
        meterEnd,
        kwhSource,
        paymentMethod: 'Pascabayar',
        notes,
        createdAt: now,
        updatedAt: now,
      });

      // Revenue entry for matching month
      const revenueAmount = BigInt(15000000 + (i % 4) * 1000000);
      await tx.insert(schema.revenueEntry).values({
        id: `rev-demo-${i + 1}-${crypto.randomUUID()}`,
        businessId,
        periodMonth: `${monthStr}-01`,
        amountRupiah: revenueAmount,
        inputMode: 'EXACT',
        notes: `Data sintetis QA WattWise AI. Penerimaan bulan ${monthStr}.`,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Seed Realistic Kos Appliances (6 TEMPLATE + 1 USER_ENTERED manual)
    const appliancesToSeed = [
      { name: 'AC kamar 1/2 PK', category: 'Pendingin', powerWatts: 450, dailyHours: '8.00', quantity: 2, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'Pompa air jet pump', category: 'Utilitas', powerWatts: 250, dailyHours: '3.00', quantity: 1, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'Lampu LED koridor', category: 'Penerangan', powerWatts: 12, dailyHours: '12.00', quantity: 6, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'Kulkas bersama', category: 'Dapur', powerWatts: 150, dailyHours: '24.00', quantity: 1, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'Router WiFi', category: 'Utilitas', powerWatts: 15, dailyHours: '24.00', quantity: 1, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'CCTV 4 kamera', category: 'Keamanan', powerWatts: 20, dailyHours: '24.00', quantity: 1, operatingDays: 30, dataSource: 'TEMPLATE', confidence: 'HIGH', notes: 'Template QA' },
      { name: 'Mesin Cuci Tambahan QA', category: 'Laundry', powerWatts: 400, dailyHours: '2.00', quantity: 1, operatingDays: 15, dataSource: 'MANUAL', confidence: 'USER_CUSTOM', notes: 'Input manual QA untuk memverifikasi isolasi template' },
    ];

    for (const app of appliancesToSeed) {
      await tx.insert(schema.appliance).values({
        id: `app-demo-${crypto.randomUUID()}`,
        businessId,
        name: app.name,
        category: app.category,
        powerWatts: app.powerWatts,
        dailyHours: app.dailyHours,
        quantity: app.quantity,
        operatingDays: app.operatingDays,
        dataSource: app.dataSource,
        confidence: app.confidence,
        notes: app.notes,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Seed Diagnostic Session Fixture (linking Month 14 bill so it becomes REFERENCED & LOCKED)
    const month13BillId = billIdsCreated[12];
    const month14BillId = billIdsCreated[13];

    const diagSessionId = `diag-demo-session-${crypto.randomUUID()}`;
    await tx.insert(schema.diagnosticSession).values({
      id: diagSessionId,
      businessId,
      electricityBillId: month14BillId, // Referenced bill
      comparisonBillId: month13BillId,
      segmentCode: 'KOS',
      ruleVersion: 'v1.0',
      status: 'ANALYZED',
      questionnaireCompletedAt: now,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(schema.diagnosticCandidate).values({
      id: `cand-demo-${crypto.randomUUID()}`,
      diagnosticSessionId: diagSessionId,
      candidateCode: 'CAND_AC_01',
      candidateVersion: 1,
      candidateType: 'APPLIANCE',
      ruleVersion: 'v1.0',
      title: 'AC & Air Conditioning',
      rank: 1,
      internalScore: 85,
      evidenceLevel: 'STRONG',
      explanation: 'Penggunaan AC meningkat pada musim kemarau (Data sintetis QA WattWise AI).',
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      businessId,
      email,
      billCount: 18,
      revenueCount: 18,
      applianceCount: appliancesToSeed.length,
    };
  });
}

export async function resetQaDemoAccount(options?: QaDemoSeedOptions): Promise<void> {
  const envGuard = isDemoEnvironmentAllowed();
  if (!envGuard.allowed) {
    throw new Error(`QA Demo reset rejected: ${envGuard.reason}`);
  }

  const { email } = getDemoCredentials();
  const db = getDb();
  const anchorMonth = options?.anchorMonth || getMonthString(new Date());

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('wattwise_qa_demo_provisioning_lock', 0))`);

    const users = await tx.select().from(schema.user).where(sql`${schema.user.email} = ${email}`).limit(1);
    if (users.length > 0) {
      const userRow = users[0];
      // Reset Identity Guard: Verify strong demo user identity (GAP 3)
      const isDemoIdentity = userRow.name === 'WattWise QA Demo' && userRow.id.startsWith('user-qa-demo-');
      if (!isDemoIdentity) {
        throw new Error(`QA Demo reset refused: configured email (${email}) belongs to a non-demo user.`);
      }

      const userId = userRow.id;

      // Find exact Kos Melati Demo business ID
      const demoBusinesses = await tx.select().from(schema.business)
        .where(sql`${schema.business.userId} = ${userId} AND ${schema.business.name} = 'Kos Melati Demo'`)
        .limit(1);

      if (demoBusinesses.length > 0) {
        const demoBusinessId = demoBusinesses[0].id;

        // Business-Scoped Cleanup for Kos Melati Demo ONLY
        await tx.delete(schema.actionOutcomeEvaluation).where(
          sql`action_plan_id IN (SELECT id FROM energy_action_plan WHERE business_id = ${demoBusinessId})`
        );
        await tx.delete(schema.energyActionPlan).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.inspectionItem).where(
          sql`plan_id IN (SELECT id FROM inspection_plan WHERE business_id = ${demoBusinessId})`
        );
        await tx.delete(schema.inspectionPlan).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.diagnosticCandidate).where(
          sql`diagnostic_session_id IN (SELECT id FROM diagnostic_session WHERE business_id = ${demoBusinessId})`
        );
        await tx.delete(schema.diagnosticSession).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.appliance).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.revenueEntry).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.electricityBill).where(sql`business_id = ${demoBusinessId}`);
        await tx.delete(schema.business).where(sql`id = ${demoBusinessId}`);
      }
    }
  });

  // Reseed deterministic synthetic dataset
  await seedQaDemoAccount({ anchorMonth });
}

export interface QaDemoCheckResult {
  ready: boolean;
  reason?: string;
  details: {
    userExists: boolean;
    accountExists: boolean;
    businessExists: boolean;
    businessActive: boolean;
    onboardingCompleted: boolean;
    planReady: boolean;
    billCount: number;
    revenueCount: number;
    applianceCount: number;
    referencedBillCount: number;
    unreferencedBillCount: number;
    diagnosticSessionCount: number;
    historicalReportReady: boolean;
    historicalReportMonth?: string;
    historicalRevenueReady: boolean;
    anomalyStatus?: string;
    anomalyExpectedBoros: boolean;
  };
}

export async function checkQaDemoAccount(options?: { anchorMonth?: string }): Promise<QaDemoCheckResult> {
  if (process.env.MONTHLY_REPORTS_ENABLED === undefined) {
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
  }

  const envGuard = isDemoEnvironmentAllowed();
  if (!envGuard.allowed) {
    return {
      ready: false,
      reason: envGuard.reason,
      details: {
        userExists: false,
        accountExists: false,
        businessExists: false,
        businessActive: false,
        onboardingCompleted: false,
        planReady: false,
        billCount: 0,
        revenueCount: 0,
        applianceCount: 0,
        referencedBillCount: 0,
        unreferencedBillCount: 0,
        diagnosticSessionCount: 0,
        historicalReportReady: false,
        historicalRevenueReady: false,
        anomalyExpectedBoros: false,
      },
    };
  }

  const { email } = getDemoCredentials();
  const db = getDb();
  const anchorMonth = options?.anchorMonth || getMonthString(new Date());

  const users = await db.select().from(schema.user).where(sql`${schema.user.email} = ${email}`).limit(1);
  if (users.length === 0) {
    return {
      ready: false,
      reason: `Demo user for ${email} does not exist. Run qa:demo:seed to provision.`,
      details: {
        userExists: false,
        accountExists: false,
        businessExists: false,
        businessActive: false,
        onboardingCompleted: false,
        planReady: false,
        billCount: 0,
        revenueCount: 0,
        applianceCount: 0,
        referencedBillCount: 0,
        unreferencedBillCount: 0,
        diagnosticSessionCount: 0,
        historicalReportReady: false,
        historicalRevenueReady: false,
        anomalyExpectedBoros: false,
      },
    };
  }

  const userRow = users[0];
  const isDemoIdentity = userRow.name === 'WattWise QA Demo' && userRow.id.startsWith('user-qa-demo-');
  if (!isDemoIdentity) {
    return {
      ready: false,
      reason: `Configured email (${email}) belongs to a non-demo user.`,
      details: {
        userExists: true,
        accountExists: false,
        businessExists: false,
        businessActive: false,
        onboardingCompleted: false,
        planReady: false,
        billCount: 0,
        revenueCount: 0,
        applianceCount: 0,
        referencedBillCount: 0,
        unreferencedBillCount: 0,
        diagnosticSessionCount: 0,
        historicalReportReady: false,
        historicalRevenueReady: false,
        anomalyExpectedBoros: false,
      },
    };
  }

  const userId = userRow.id;

  const accounts = await db.select().from(schema.account)
    .where(sql`${schema.account.userId} = ${userId} AND ${schema.account.providerId} = 'credential'`)
    .limit(1);

  const plans = await db.select().from(schema.userPlan).where(sql`${schema.userPlan.userId} = ${userId}`).limit(1);
  const businesses = await db.select().from(schema.business)
    .where(sql`${schema.business.userId} = ${userId} AND ${schema.business.name} = 'Kos Melati Demo'`)
    .limit(1);

  if (businesses.length === 0) {
    return {
      ready: false,
      reason: `Business Kos Melati Demo does not exist for demo user.`,
      details: {
        userExists: true,
        accountExists: accounts.length > 0,
        businessExists: false,
        businessActive: false,
        onboardingCompleted: plans.length > 0 && !!plans[0].onboardingCompletedAt,
        planReady: plans.length > 0 && ['PRO_TRIAL', 'PRO', 'BUSINESS'].includes(plans[0].plan),
        billCount: 0,
        revenueCount: 0,
        applianceCount: 0,
        referencedBillCount: 0,
        unreferencedBillCount: 0,
        diagnosticSessionCount: 0,
        historicalReportReady: false,
        historicalRevenueReady: false,
        anomalyExpectedBoros: false,
      },
    };
  }

  const businessId = businesses[0].id;

  const bills = await db.select().from(schema.electricityBill).where(sql`${schema.electricityBill.businessId} = ${businessId}`);
  const revenues = await db.select().from(schema.revenueEntry).where(sql`${schema.revenueEntry.businessId} = ${businessId}`);
  const appliances = await db.select().from(schema.appliance).where(sql`${schema.appliance.businessId} = ${businessId}`);
  const diagSessions = await db.select().from(schema.diagnosticSession).where(sql`${schema.diagnosticSession.businessId} = ${businessId}`);

  const referencedBillIds = new Set<string>();
  diagSessions.forEach((s) => {
    if (s.electricityBillId) referencedBillIds.add(s.electricityBillId);
    if (s.comparisonBillId) referencedBillIds.add(s.comparisonBillId);
  });

  const referencedBillCount = bills.filter((b) => referencedBillIds.has(b.id)).length;
  const unreferencedBillCount = bills.filter((b) => !referencedBillIds.has(b.id)).length;

  let anomalyStatus: string | undefined;
  try {
    const analysisModel = await getProductAnalysisReadModel(userId, businessId);
    anomalyStatus = analysisModel.anomaly?.status;
  } catch {
    anomalyStatus = undefined;
  }

  const anomalyExpectedBoros = anomalyStatus === 'Boros';

  // Historical Report Actual Service Verification (GAP 6)
  let historicalReportReady = false;
  let historicalRevenueReady = false;
  const historicalMonthStr = subMonthsStr(anchorMonth, 4); // Month 14

  try {
    const historicalReport = await getMonthlyReportReadModel(userId, businessId, historicalMonthStr);
    if (
      historicalReport &&
      historicalReport.primaryBillSummary !== null &&
      historicalReport.revenueSummary !== null
    ) {
      historicalReportReady = true;
      historicalRevenueReady = true;
    }
  } catch {
    historicalReportReady = false;
    historicalRevenueReady = false;
  }

  const ready =
    accounts.length > 0 &&
    plans.length > 0 &&
    ['PRO_TRIAL', 'PRO', 'BUSINESS'].includes(plans[0].plan) &&
    businesses[0].isActive &&
    !!plans[0].onboardingCompletedAt &&
    bills.length >= 18 &&
    revenues.length >= 18 &&
    appliances.length >= 6 &&
    referencedBillCount >= 1 &&
    unreferencedBillCount >= 1 &&
    diagSessions.length >= 1 &&
    anomalyExpectedBoros &&
    historicalReportReady &&
    historicalRevenueReady;

  let reason: string | undefined;
  if (!ready) {
    if (!anomalyExpectedBoros) {
      reason = `Demo anomaly scenario drifted from expected Boros state (current: ${anomalyStatus || 'undefined'}).`;
    } else if (!historicalReportReady) {
      reason = `Historical report for ${historicalMonthStr} failed to resolve.`;
    } else {
      reason = `Demo account components incomplete.`;
    }
  }

  return {
    ready,
    reason,
    details: {
      userExists: true,
      accountExists: accounts.length > 0,
      businessExists: true,
      businessActive: businesses[0].isActive,
      onboardingCompleted: !!plans[0].onboardingCompletedAt,
      planReady: plans.length > 0 && ['PRO_TRIAL', 'PRO', 'BUSINESS'].includes(plans[0].plan),
      billCount: bills.length,
      revenueCount: revenues.length,
      applianceCount: appliances.length,
      referencedBillCount,
      unreferencedBillCount,
      diagnosticSessionCount: diagSessions.length,
      historicalReportReady,
      historicalReportMonth: historicalMonthStr,
      historicalRevenueReady,
      anomalyStatus,
      anomalyExpectedBoros,
    },
  };
}
