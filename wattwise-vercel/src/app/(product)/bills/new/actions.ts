'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import {
  BillBusinessNotFoundError,
  DuplicateBillPeriodError,
  OverlappingBillPeriodError,
} from '@/server/repositories/bill.repository';
import { createBill } from '@/server/services/bill.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { createBillSchema } from '@/server/validation/bills';

export interface BillFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export async function createBillAction(
  _previousState: BillFormState | null,
  formData: FormData
): Promise<BillFormState> {
  const userId = await requireUserId();
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const values = {
    periodStart: String(formData.get('periodStart') ?? ''),
    periodEnd: String(formData.get('periodEnd') ?? ''),
    totalAmountRupiah: String(formData.get('totalAmountRupiah') ?? ''),
    kwh: String(formData.get('kwh') ?? ''),
    tariffRupiahPerKwh: String(formData.get('tariffRupiahPerKwh') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  };

  const parsed = createBillSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? 'general';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      error: 'Mohon periksa data tagihan yang dimasukkan.',
      fieldErrors,
      values,
    };
  }

  try {
    await createBill(userId, parsed.data);
  } catch (error) {
    if (
      error instanceof DuplicateBillPeriodError ||
      error instanceof OverlappingBillPeriodError ||
      error instanceof BillBusinessNotFoundError
    ) {
      return {
        error: error.message,
        fieldErrors:
          error instanceof DuplicateBillPeriodError || error instanceof OverlappingBillPeriodError
            ? { periodEnd: error.message }
            : undefined,
        values,
      };
    }
    return {
      error: 'Tagihan belum dapat disimpan. Silakan coba lagi.',
      values,
    };
  }

  redirect('/bills');
}

