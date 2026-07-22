import { NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export async function GET() {
  const dbHealth = HealthCheckService.getDatabaseHealth();
  return NextResponse.json(dbHealth, { status: 200 });
}
