import { NextRequest, NextResponse } from 'next/server';
import { HealthCheckService } from '@/server/services/health.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ready
 *
 * Kubernetes/load-balancer readiness probe.
 * Returns 200 only when the application is ready to serve traffic — i.e.,
 * the database connection is reachable.
 *
 * Returns 503 if the database is unreachable or misconfigured.
 * A failing readiness probe removes the instance from the load-balancer
 * rotation without restarting it.
 */
export async function GET(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') ?? undefined;
  const { result, httpStatus } = await HealthCheckService.getDatabaseHealth(correlationId);

  const ready = result.status === 'ok' && result.schemaCompatible !== false;

  return NextResponse.json(
    {
      status: ready ? 'ready' : 'not-ready',
      database: result.status,
      schemaCompatible: result.schemaCompatible ?? false,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : (httpStatus || 503),
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
