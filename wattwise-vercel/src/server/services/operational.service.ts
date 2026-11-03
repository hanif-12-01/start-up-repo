import 'server-only';
import { z } from 'zod';
import { requireUserId } from '@/server/auth/session';
import { isMeasurementPilotAllowed } from './measurement-access';
import {
  createOperationalProcessForUser,
  createProductionRecordForUser,
  findProductionRecordForUser,
  listOperationalProcessesForUser,
  listProductionRecordsForUser,
  OperationalError,
} from '@/server/repositories/operational.repository';
import {
  createOperationalProcessSchema,
  createProductionRecordSchema,
  listProductionRecordsSchema,
  operationalIdSchema,
} from '@/server/validation/operational';

export type OperationalResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; issues?: { path: string; message: string }[] };
    };

async function execute<T>(operation: (userId: string) => Promise<T>): Promise<OperationalResult<T>> {
  try {
    const userId = await requireUserId();
    return { ok: true, data: await operation(userId) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data operasional tidak valid',
          issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        },
      };
    }
    if (error instanceof OperationalError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu' } };
    }
    if (error instanceof OperationalAccessDeniedError) {
      return { ok: false, error: { code: 'OPERATIONAL_WRITE_DENIED', message: error.message } };
    }
    return {
      ok: false,
      error: { code: 'OPERATIONAL_UNAVAILABLE', message: 'Data operasional belum dapat diproses; coba kembali' },
    };
  }
}

class OperationalAccessDeniedError extends Error {
  constructor() {
    super('Akses pencatatan data operasional tidak tersedia untuk akun atau lingkungan ini');
  }
}

function requireOperationalWriteAccess(userId: string, businessId: string) {
  if (!isMeasurementPilotAllowed(userId, businessId)) {
    throw new OperationalAccessDeniedError();
  }
}

export async function createOperationalProcess(raw: unknown) {
  return execute(async (userId) => {
    const input = createOperationalProcessSchema.parse(raw);
    requireOperationalWriteAccess(userId, input.businessId);
    return createOperationalProcessForUser(userId, input);
  });
}

export async function listOperationalProcesses(businessId: unknown) {
  return execute((userId) => listOperationalProcessesForUser(userId, operationalIdSchema.parse(businessId)));
}

export async function createProductionRecord(raw: unknown) {
  return execute(async (userId) => {
    const input = createProductionRecordSchema.parse(raw);
    requireOperationalWriteAccess(userId, input.businessId);
    return createProductionRecordForUser(userId, input);
  });
}

export async function listProductionRecords(raw: unknown) {
  return execute((userId) => listProductionRecordsForUser(userId, listProductionRecordsSchema.parse(raw)));
}

export async function getProductionRecord(recordId: unknown) {
  return execute((userId) => findProductionRecordForUser(userId, operationalIdSchema.parse(recordId)));
}
