import {
  createBillForOwnedBusiness,
  findPreviousBillForUser,
  listBillsForUser,
} from '@/server/repositories/bill.repository';
import { compareBills } from '@/server/services/bill-comparison.service';
import type { CreateBillInput } from '@/server/validation/bills';
import { getUserEntitlements } from './entitlement.service';

export async function createBill(
  userId: string,
  input: CreateBillInput,
  businessId?: string
) {
  if (!userId) throw new Error('UNAUTHENTICATED');
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.limits.maxElectricityEntries !== null) {
    const existing = await listBillsForUser(userId, businessId);
    if (existing.length >= entitlements.limits.maxElectricityEntries) throw new Error('Batas 3 tagihan paket Gratis telah tercapai.');
  }
  return createBillForOwnedBusiness(userId, input, businessId);
}

export async function getBillOverview(userId: string, businessId?: string) {
  const bills = await listBillsForUser(userId, businessId);
  const current = bills[0] ?? null;
  const previous = current ? await findPreviousBillForUser(userId, current) : null;
  const comparison = current && previous ? compareBills(current, previous) : null;

  return { bills, current, previous, comparison };
}
