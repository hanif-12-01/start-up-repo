import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';

export const PUBLIC_DEMO_EMAIL = (process.env.NEXT_PUBLIC_DEMO_EMAIL || 'wattwise.jury.demo@example.com').trim().toLowerCase();
export const PUBLIC_DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'password123';

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
  const endDate = new Date(y, m, 0);

  const formatIso = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  return { start: formatIso(startDate), end: formatIso(endDate) };
}

export async function ensurePublicDemoAccount(): Promise<{
  userId: string;
  email: string;
  businessIds: { demo01: string; demo02: string; demo03: string };
}> {
  const db = getDb();
  const email = PUBLIC_DEMO_EMAIL;
  const password = PUBLIC_DEMO_PASSWORD;
  const anchorMonth = getMonthString(new Date());
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return await db.transaction(async (tx) => {
    // Acquire PostgreSQL advisory transaction lock for concurrency safety
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('wattwise_public_demo_provisioning_lock', 0))`);

    const existingUsers = await tx.select().from(schema.user).where(sql`${schema.user.email} = ${email}`).limit(1);
    let userId: string;
    const hashedPassword = await hashPassword(password);

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await tx.update(schema.user).set({
        name: 'WattWise Jury Demo',
        emailVerified: true,
        updatedAt: now,
      }).where(sql`${schema.user.id} = ${userId}`);

      const existingAccounts = await tx.select().from(schema.account)
        .where(sql`${schema.account.userId} = ${userId} AND ${schema.account.providerId} = 'credential'`)
        .limit(1);

      if (existingAccounts.length > 0) {
        await tx.update(schema.account).set({
          password: hashedPassword,
          updatedAt: now,
        }).where(sql`${schema.account.id} = ${existingAccounts[0].id}`);
      } else {
        await tx.insert(schema.account).values({
          id: `acc-jury-demo-${crypto.randomUUID()}`,
          userId,
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      userId = `user-jury-demo-${crypto.randomUUID()}`;
      await tx.insert(schema.user).values({
        id: userId,
        name: 'WattWise Jury Demo',
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(schema.account).values({
        id: `acc-jury-demo-${crypto.randomUUID()}`,
        userId,
        accountId: email,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Entitlement User Plan (PRO_TRIAL active)
    const existingPlans = await tx.select().from(schema.userPlan).where(sql`${schema.userPlan.userId} = ${userId}`).limit(1);
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
        id: `plan-jury-demo-${crypto.randomUUID()}`,
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

    // Helper to upsert a demo business
    const upsertBusiness = async (
      name: string,
      businessType: string,
      segment: string,
      city: string,
      powerVa: number,
      roomCount?: number
    ): Promise<string> => {
      const existing = await tx.select().from(schema.business)
        .where(sql`${schema.business.userId} = ${userId} AND ${schema.business.name} = ${name}`)
        .limit(1);

      let bId: string;
      if (existing.length > 0) {
        bId = existing[0].id;
        await tx.update(schema.business).set({
          businessType,
          segment,
          electricalSystem: 'ALL_IN',
          city,
          province: 'DKI Jakarta',
          address: `Jl. Demo WattWise No. ${name.replace('DEMO ', '')}`,
          powerVa,
          tariffRupiahPerKwh: '1444.70',
          paymentMethod: 'Pascabayar',
          roomCount: roomCount ?? null,
          isActive: true,
          updatedAt: now,
        }).where(sql`${schema.business.id} = ${bId}`);
      } else {
        bId = `biz-jury-${name.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID()}`;
        await tx.insert(schema.business).values({
          id: bId,
          userId,
          name,
          businessType,
          segment,
          electricalSystem: 'ALL_IN',
          city,
          province: 'DKI Jakarta',
          address: `Jl. Demo WattWise No. ${name.replace('DEMO ', '')}`,
          powerVa,
          tariffRupiahPerKwh: '1444.70',
          paymentMethod: 'Pascabayar',
          roomCount: roomCount ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      return bId;
    };

    // 3. DEMO 01 — Usaha Baru · 2 Bulan (FNB segment, unsupported for Cek Kenaikan)
    const demo01Id = await upsertBusiness('DEMO 01', 'FNB', 'FNB', 'Bandung', 2200);
    // 4. DEMO 02 — Histori Berkembang · 5 Bulan (LAUNDRY segment)
    const demo02Id = await upsertBusiness('DEMO 02', 'LAUNDRY', 'LAUNDRY', 'Surabaya', 3500);
    // 5. DEMO 03 — Prediksi AI · 6 Bulan (KOS segment, N-BEATS AI active)
    const demo03Id = await upsertBusiness('DEMO 03', 'KOS_PROPERTY', 'KOS', 'Jakarta Selatan', 4400, 15);

    // Helper to seed bills for a business if not already present
    const seedBillsForBusiness = async (
      bId: string,
      monthCount: number,
      baseKwh: number,
      stepKwh: number
    ) => {
      // Check existing bills count
      const existingBills = await tx.select().from(schema.electricityBill)
        .where(sql`${schema.electricityBill.businessId} = ${bId}`);

      if (existingBills.length < monthCount) {
        // Delete partial/existing bills to guarantee continuous clean history
        await tx.delete(schema.electricityBill).where(sql`${schema.electricityBill.businessId} = ${bId}`);

        for (let i = 0; i < monthCount; i++) {
          const monthStr = subMonthsStr(anchorMonth, monthCount - 1 - i);
          const { start, end } = getMonthDateBounds(monthStr);
          const usageKwh = baseKwh + i * stepKwh;
          const totalAmount = BigInt(Math.round(usageKwh * 1444.70));

          await tx.insert(schema.electricityBill).values({
            id: `bill-jury-${bId.slice(0, 12)}-${i + 1}-${crypto.randomUUID()}`,
            businessId: bId,
            periodStart: start,
            periodEnd: end,
            totalAmountRupiah: totalAmount,
            kwh: usageKwh.toFixed(3),
            tariffRupiahPerKwh: '1444.70',
            kwhSource: 'USER_ENTERED',
            paymentMethod: 'Pascabayar',
            notes: 'Data sintetis akun demo WattWise AI.',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    };

    // Seed 2 months for DEMO 01
    await seedBillsForBusiness(demo01Id, 2, 350, 40);
    // Seed 5 months for DEMO 02
    await seedBillsForBusiness(demo02Id, 5, 380, 25);
    // Seed 6 months for DEMO 03 (continuous 6 months triggers H06_12 phase -> N-BEATS AI active)
    await seedBillsForBusiness(demo03Id, 6, 450, 30);

    return {
      userId,
      email,
      businessIds: {
        demo01: demo01Id,
        demo02: demo02Id,
        demo03: demo03Id,
      },
    };
  });
}
