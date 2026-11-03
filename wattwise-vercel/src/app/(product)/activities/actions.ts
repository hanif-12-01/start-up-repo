'use server';

import { revalidatePath } from 'next/cache';
import { createOperationalProcess, createProductionRecord } from '@/server/services/operational.service';
import { localToIso, operationalError, operationalIssue } from '@/lib/operational-input';

export type OperationalFormState = {
  error?: string;
  code?: string;
  issues?: { path: string; message: string }[];
  success?: string;
};

export async function createProcessAction(_prev: OperationalFormState, form: FormData): Promise<OperationalFormState> {
  const businessId = form.get('businessId');
  const name = form.get('name');
  const outputUnit = form.get('outputUnit');
  const description = form.get('description');

  const result = await createOperationalProcess({
    businessId,
    name,
    outputUnit,
    ...(typeof description === 'string' && description.trim() ? { description } : {}),
  });

  if (!result.ok) {
    return {
      error: operationalError(result.error.code),
      code: result.error.code,
      issues: result.error.issues?.map((i) => ({ ...i, message: operationalIssue(i.path, i.message) })),
    };
  }

  revalidatePath('/activities');
  return { success: 'Jenis aktivitas usaha berhasil didaftarkan.' };
}

export async function createRecordAction(_prev: OperationalFormState, form: FormData): Promise<OperationalFormState> {
  const businessId = form.get('businessId');
  const operationalProcessId = form.get('operationalProcessId');
  const localStart = form.get('periodStart');
  const localEnd = form.get('periodEnd');
  const outputQuantity = form.get('outputQuantity');
  const notes = form.get('notes');

  const periodStart = typeof localStart === 'string' ? localToIso(localStart) : '';
  const periodEnd = typeof localEnd === 'string' ? localToIso(localEnd) : '';

  const result = await createProductionRecord({
    businessId,
    operationalProcessId,
    periodStart,
    periodEnd,
    outputQuantity,
    ...(typeof notes === 'string' && notes.trim() ? { notes } : {}),
  });

  if (!result.ok) {
    return {
      error: operationalError(result.error.code),
      code: result.error.code,
      issues: result.error.issues?.map((i) => ({ ...i, message: operationalIssue(i.path, i.message) })),
    };
  }

  revalidatePath('/activities');
  return { success: 'Catatan hasil produksi berhasil disimpan. Lihat analisis efisiensi di bawah.' };
}
