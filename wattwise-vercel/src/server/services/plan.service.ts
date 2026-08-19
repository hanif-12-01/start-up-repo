import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { billingPlan, sandboxInvoice, sandboxPayment, userPlan } from '@/server/db/schema';
import { getUserEntitlements } from './entitlement.service';

export class TrialAlreadyUsedError extends Error {}
export class SandboxPaymentError extends Error {}

export async function ensureCanonicalBillingPlans() {
  const db = getDb();
  await db.execute(sql`
    UPDATE billing_plan SET price_amount = 49000 WHERE code = 'PRO' AND price_amount != 49000;
    UPDATE billing_plan SET price_amount = 149000 WHERE code = 'BUSINESS' AND price_amount != 149000;
  `);
}

export async function getPlanCenter(userId: string) {
  await ensureCanonicalBillingPlans().catch(() => {});
  const db = getDb();
  const [entitlements, plans, invoices] = await Promise.all([
    getUserEntitlements(userId),
    db.select().from(billingPlan).where(eq(billingPlan.active, true)).orderBy(billingPlan.priceAmount),
    db.select({
      id: sandboxInvoice.id,
      invoiceNumber: sandboxInvoice.invoiceNumber,
      planCode: sandboxInvoice.planCode,
      amount: sandboxInvoice.amount,
      status: sandboxInvoice.status,
      issuedAt: sandboxInvoice.issuedAt,
      paymentId: sandboxPayment.id,
      paymentStatus: sandboxPayment.status,
    }).from(sandboxInvoice).leftJoin(sandboxPayment, eq(sandboxPayment.invoiceId, sandboxInvoice.id)).where(eq(sandboxInvoice.userId, userId)).orderBy(desc(sandboxInvoice.issuedAt)).limit(10),
  ]);
  const [row] = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  return { entitlements, plans, invoices, planRow: row ?? null, sandboxOnly: true };
}

export async function startProTrial(userId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(userPlan).where(eq(userPlan.userId, userId)).for('update').limit(1);
    if (current?.trialUsedAt || current?.trialStartsAt) throw new TrialAlreadyUsedError('Masa uji coba hanya dapat digunakan satu kali.');
    const now = new Date();
    const ends = new Date(now.getTime() + 30 * 86_400_000);
    await tx.insert(userPlan).values({ userId, plan: 'PRO_TRIAL', status: 'ACTIVE', trialStartsAt: now, trialEndsAt: ends, trialUsedAt: now, idempotencyKey: `trial_${userId}` }).onConflictDoUpdate({ target: userPlan.userId, set: { plan: 'PRO_TRIAL', status: 'ACTIVE', trialStartsAt: now, trialEndsAt: ends, trialUsedAt: now, updatedAt: now } });
  });
}

export async function createSandboxCheckout(userId: string, planCode: 'PRO' | 'BUSINESS', idempotencyKey: string) {
  await ensureCanonicalBillingPlans().catch(() => {});
  const db = getDb();
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(billingPlan).where(and(eq(billingPlan.code, planCode), eq(billingPlan.active, true))).limit(1);
    if (!plan) throw new SandboxPaymentError('Paket sandbox tidak tersedia.');
    const [existing] = await tx.select().from(sandboxInvoice).where(and(eq(sandboxInvoice.userId, userId), eq(sandboxInvoice.planCode, planCode), eq(sandboxInvoice.idempotencyKey, idempotencyKey))).limit(1);
    if (existing) return existing.id;
    const invoiceId = crypto.randomUUID();
    const now = new Date();
    await tx.insert(sandboxInvoice).values({ id: invoiceId, userId, planCode, invoiceNumber: `SBX-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${invoiceId.slice(0, 8).toUpperCase()}`, idempotencyKey, amount: plan.priceAmount, currency: plan.currency, status: 'OPEN', simulated: true });
    await tx.insert(sandboxPayment).values({ id: crypto.randomUUID(), invoiceId, userId, status: 'PENDING', provider: 'sandbox_simulator', simulated: true });
    return invoiceId;
  });
}

export async function settleSandboxPayment(userId: string, paymentId: string, outcome: 'success' | 'failure' | 'cancelled') {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [attempt] = await tx.select({ payment: sandboxPayment, invoice: sandboxInvoice }).from(sandboxPayment).innerJoin(sandboxInvoice, eq(sandboxInvoice.id, sandboxPayment.invoiceId)).where(and(eq(sandboxPayment.id, paymentId), eq(sandboxPayment.userId, userId))).for('update').limit(1);
    if (!attempt || !attempt.payment.simulated || attempt.payment.status !== 'PENDING') throw new SandboxPaymentError('Transisi pembayaran simulasi tidak diizinkan.');
    const now = new Date();
    const paymentStatus = outcome === 'success' ? 'SIMULATED_PAID' : outcome === 'failure' ? 'FAILED' : 'CANCELLED';
    const invoiceStatus = outcome === 'success' ? 'PAID' : outcome === 'failure' ? 'FAILED' : 'CANCELLED';
    await tx.update(sandboxPayment).set({ status: paymentStatus, providerReference: `SIM-${paymentId.slice(0, 12).toUpperCase()}`, updatedAt: now }).where(eq(sandboxPayment.id, paymentId));
    await tx.update(sandboxInvoice).set({ status: invoiceStatus, paidAt: outcome === 'success' ? now : null }).where(eq(sandboxInvoice.id, attempt.invoice.id));
    if (outcome === 'success') {
      const periodEnd = new Date(now); periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      await tx.insert(userPlan).values({ userId, plan: attempt.invoice.planCode, status: 'ACTIVE', currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, idempotencyKey: `paid_${attempt.invoice.id}` }).onConflictDoUpdate({ target: userPlan.userId, set: { plan: attempt.invoice.planCode, status: 'ACTIVE', trialStartsAt: null, trialEndsAt: null, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, cancelledAt: null, updatedAt: now } });
    }
  });
}

export async function cancelSandboxSubscription(userId: string) {
  const now = new Date();
  await getDb().update(userPlan).set({ plan: 'FREE', status: 'ACTIVE', trialStartsAt: null, trialEndsAt: null, currentPeriodStartsAt: null, currentPeriodEndsAt: null, cancelledAt: now, updatedAt: now }).where(eq(userPlan.userId, userId));
}
