import 'server-only';
import { z } from 'zod';
import { requireUserId } from '@/server/auth/session';
import { getUserEntitlements } from './entitlement.service';
import {
  createEnergyMeasurementForUser, createMeasurementSourceForUser, findEnergyMeasurementForUser,
  listEnergyMeasurementsForUser, listMeasurementSourcesForUser, MeasurementError,
} from '@/server/repositories/measurement.repository';
import { createEnergyMeasurementSchema, createMeasurementSourceSchema, listMeasurementsSchema, measurementIdSchema } from '@/server/validation/measurements';

export type MeasurementResult<T> = { ok: true; data: T } | {
  ok: false; error: { code: string; message: string; issues?: { path: string; message: string }[] };
};

async function execute<T>(operation: (userId: string) => Promise<T>): Promise<MeasurementResult<T>> {
  try {
    const userId = await requireUserId();
    return { ok: true, data: await operation(userId) };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Input pengukuran tidak valid',
      issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) } };
    if (error instanceof MeasurementError) return { ok: false, error: { code: error.code, message: error.message } };
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu' } };
    if (error instanceof MeasurementPolicyPendingError) return { ok: false, error: { code: 'MEASUREMENT_POLICY_PENDING', message: error.message } };
    // Do not return SQL, credentials, infrastructure messages or other-tenant details.
    return { ok: false, error: { code: 'MEASUREMENT_UNAVAILABLE', message: 'Pengukuran belum dapat diproses; coba kembali' } };
  }
}

class MeasurementPolicyPendingError extends Error {
  constructor() { super('Akses pencatatan pengukuran belum diaktifkan; kebijakan paket menunggu persetujuan'); }
}

async function requireMeasurementWriteAccess(userId: string) {
  await getUserEntitlements(userId);
  // ponytail: all plans closed until PO approves measurement access/quotas; replace this denial with approved policy, never infer bill quotas.
  throw new MeasurementPolicyPendingError();
}

export async function createMeasurementSource(raw: unknown) {
  return execute(async userId => {
    const input = createMeasurementSourceSchema.parse(raw);
    await requireMeasurementWriteAccess(userId);
    return createMeasurementSourceForUser(userId, input);
  });
}

export async function createEnergyMeasurement(raw: unknown) {
  return execute(async userId => {
    const input = createEnergyMeasurementSchema.parse(raw);
    await requireMeasurementWriteAccess(userId);
    return createEnergyMeasurementForUser(userId, input);
  });
}

export async function listMeasurementSources(businessId: unknown) {
  return execute(userId => listMeasurementSourcesForUser(userId, measurementIdSchema.parse(businessId)));
}

export async function getEnergyMeasurement(measurementId: unknown) {
  return execute(userId => findEnergyMeasurementForUser(userId, measurementIdSchema.parse(measurementId)));
}

export async function listEnergyMeasurements(raw: unknown) {
  return execute(userId => listEnergyMeasurementsForUser(userId, listMeasurementsSchema.parse(raw)));
}
