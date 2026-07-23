import { NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export const runtime = 'nodejs';

export async function GET() {
  const { result, httpStatus } = await HealthCheckService.getDatabaseHealth();
  return NextResponse.json(result, { status: httpStatus });
}
