import { NextRequest, NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') ?? undefined;
  const { result, httpStatus } = await HealthCheckService.getDatabaseHealth(correlationId);
  return NextResponse.json(result, { status: httpStatus });
}
