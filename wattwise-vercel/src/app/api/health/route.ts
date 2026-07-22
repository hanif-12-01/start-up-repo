import { NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export async function GET() {
  const health = HealthCheckService.getSystemHealth();
  return NextResponse.json(health, { status: 200 });
}
