'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import { updateBusiness } from '@/server/services/business.service';
import { createBusinessSchema } from '@/server/validation/journey';

const optionalNumber = (formData: FormData, key: string) => formData.get(key) ? Number(formData.get(key)) : undefined;

export async function updateBusinessAction(formData: FormData) {
  const userId = await requireUserId();
  const businessId = String(formData.get('businessId') ?? '');
  const parsed = createBusinessSchema.safeParse({
    name: formData.get('name'), businessType: formData.get('businessType'), city: formData.get('city') || undefined,
    province: formData.get('province') || undefined, address: formData.get('address') || undefined,
    segment: formData.get('segment'), electricalSystem: formData.get('electricalSystem'), roomCount: optionalNumber(formData, 'roomCount'),
    occupiedRoomCount: optionalNumber(formData, 'occupiedRoomCount'), employeeCount: optionalNumber(formData, 'employeeCount'),
    operatingDaysPerMonth: optionalNumber(formData, 'operatingDaysPerMonth'), customerType: formData.get('customerType') || undefined,
    powerVa: optionalNumber(formData, 'powerVa'), tariffRupiahPerKwh: formData.get('tariffRupiahPerKwh') || undefined,
    paymentMethod: formData.get('paymentMethod') || undefined, meterType: formData.get('meterType') || undefined,
    businessNotes: formData.get('businessNotes') || undefined, electricityNotes: formData.get('electricityNotes') || undefined,
  });
  if (!businessId || !parsed.success) throw new Error('Data profil usaha tidak valid');
  await updateBusiness(userId, businessId, parsed.data);
  revalidatePath('/businesses'); revalidatePath('/dashboard');
  redirect('/businesses?updated=1');
}
