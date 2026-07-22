import { NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export async function GET() {
  const release = HealthCheckService.getReleaseInfo();
  return NextResponse.json(release, { status: 200 });
}
