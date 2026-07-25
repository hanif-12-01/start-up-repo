import {
  createBillForOwnedBusiness,
  findPreviousBillForUser,
  listBillsForUser,
} from '@/server/repositories/bill.repository';
import { compareBills } from '@/server/services/bill-comparison.service';
import type { CreateBillInput } from '@/server/validation/bills';

export async function createBill(userId: string, input: CreateBillInput) {
  if (!userId) throw new Error('UNAUTHENTICATED');
  return createBillForOwnedBusiness(userId, input);
}

export async function getBillOverview(userId: string) {
  const bills = await listBillsForUser(userId);
  const current = bills[0] ?? null;
  const previous = current ? await findPreviousBillForUser(userId, current) : null;
  const comparison = current && previous ? compareBills(current, previous) : null;

  return { bills, current, previous, comparison };
}

