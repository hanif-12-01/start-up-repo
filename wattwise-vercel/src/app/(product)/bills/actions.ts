'use server';
import { revalidatePath } from 'next/cache';
import { createBill, updateBill, deleteBill } from '@/server/services/bill.service';
import { getOptionalSession } from '@/server/auth/session';
import { createBillSchema } from '@/server/validation/bills';
import { ReferencedBillLockedError } from '@/server/repositories/bill.repository';

export interface BillFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export async function createBillAction(
  prevState: BillFormState | null,
  formData: FormData
): Promise<BillFormState> {
  const session = await getOptionalSession();
  if (!session?.user) {
    return { error: 'Anda harus login terlebih dahulu.' };
  }

  const rawValues = {
    periodStart: formData.get('periodStart') as string,
    periodEnd: formData.get('periodEnd') as string,
    totalAmountRupiah: formData.get('totalAmountRupiah') as string,
    kwh: (formData.get('kwh') as string) || undefined,
    tariffRupiahPerKwh: (formData.get('tariffRupiahPerKwh') as string) || undefined,
    meterStart: (formData.get('meterStart') as string) || undefined,
    meterEnd: (formData.get('meterEnd') as string) || undefined,
    paymentMethod: (formData.get('paymentMethod') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const businessId = (formData.get('businessId') as string) || undefined;

  const parseResult = createBillSchema.safeParse(rawValues);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return {
      error: 'Mohon periksa kembali data tagihan.',
      fieldErrors,
      values: Object.fromEntries(
        Object.entries(rawValues).map(([k, v]) => [k, v ?? ''])
      ),
    };
  }

  try {
    await createBill(session.user.id, parseResult.data, businessId);
    revalidatePath('/bills');
    revalidatePath('/dashboard');
    revalidatePath('/analysis');
    revalidatePath('/reports');
    return {};
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Gagal menyimpan tagihan.',
      values: Object.fromEntries(
        Object.entries(rawValues).map(([k, v]) => [k, v ?? ''])
      ),
    };
  }
}

export async function updateBillAction(
  billId: string,
  prevState: BillFormState | null,
  formData: FormData
): Promise<BillFormState> {
  const session = await getOptionalSession();
  if (!session?.user) {
    return { error: 'Anda harus login terlebih dahulu.' };
  }

  const rawValues = {
    periodStart: formData.get('periodStart') as string,
    periodEnd: formData.get('periodEnd') as string,
    totalAmountRupiah: formData.get('totalAmountRupiah') as string,
    kwh: (formData.get('kwh') as string) || undefined,
    tariffRupiahPerKwh: (formData.get('tariffRupiahPerKwh') as string) || undefined,
    meterStart: (formData.get('meterStart') as string) || undefined,
    meterEnd: (formData.get('meterEnd') as string) || undefined,
    paymentMethod: (formData.get('paymentMethod') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const parseResult = createBillSchema.safeParse(rawValues);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return {
      error: 'Mohon periksa kembali data tagihan.',
      fieldErrors,
      values: Object.fromEntries(
        Object.entries(rawValues).map(([k, v]) => [k, v ?? ''])
      ),
    };
  }

  try {
    await updateBill(session.user.id, billId, parseResult.data);
    revalidatePath('/bills');
    revalidatePath('/dashboard');
    revalidatePath('/analysis');
    revalidatePath('/reports');
    return {};
  } catch (err: unknown) {
    if (err instanceof ReferencedBillLockedError) {
      return {
        error:
          'Tagihan ini sudah terhubung dengan riwayat Cek Kenaikan dan terkunci agar data analisis tetap konsisten.',
        values: Object.fromEntries(
          Object.entries(rawValues).map(([k, v]) => [k, v ?? ''])
        ),
      };
    }
    return {
      error: err instanceof Error ? err.message : 'Gagal memperbarui tagihan.',
      values: Object.fromEntries(
        Object.entries(rawValues).map(([k, v]) => [k, v ?? ''])
      ),
    };
  }
}

export async function deleteBillAction(
  billId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getOptionalSession();
  if (!session?.user) {
    return { success: false, error: 'Anda harus login terlebih dahulu.' };
  }

  try {
    await deleteBill(session.user.id, billId);
    revalidatePath('/bills');
    revalidatePath('/dashboard');
    revalidatePath('/analysis');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof ReferencedBillLockedError) {
      return {
        success: false,
        error:
          'Tagihan ini terhubung dengan riwayat Cek Kenaikan dan tidak dapat dihapus agar data analisis tetap konsisten.',
      };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghapus tagihan.',
    };
  }
}
