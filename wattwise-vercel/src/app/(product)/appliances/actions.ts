'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { addAppliance, applyApplianceTemplate, setApplianceActive } from '@/server/services/workspace.service';

function optionalInteger(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw ? Number.parseInt(raw, 10) : null;
}

export async function addApplianceAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const dailyHours = String(formData.get('dailyHours') ?? '').trim();
  const quantity = optionalInteger(formData.get('quantity')) ?? 1;
  const operatingDays = optionalInteger(formData.get('operatingDays')) ?? 30;
  const powerWatts = optionalInteger(formData.get('powerWatts'));
  if (!businessId || name.length < 2 || category.length < 2 || quantity < 1 || operatingDays < 1 || operatingDays > 31) {
    throw new Error('Data peralatan tidak valid');
  }
  await addAppliance(userId, {
    businessId,
    name,
    category,
    powerWatts,
    dailyHours: dailyHours || null,
    quantity,
    operatingDays,
    dataSource: 'MANUAL',
    isActive: true,
  });
  revalidatePath('/appliances');
  redirect(`/appliances?businessId=${encodeURIComponent(businessId)}&saved=1`);
}

export async function applyTemplateAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) throw new Error('Business is required');
  await applyApplianceTemplate(userId, businessId);
  revalidatePath('/appliances');
  redirect(`/appliances?businessId=${encodeURIComponent(businessId)}&template=1`);
}

export async function toggleApplianceAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  const applianceId = String(formData.get('applianceId') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!businessId || !applianceId) throw new Error('Appliance is required');
  await setApplianceActive(userId, applianceId, active);
  revalidatePath('/appliances');
  redirect(`/appliances?businessId=${encodeURIComponent(businessId)}`);
}
