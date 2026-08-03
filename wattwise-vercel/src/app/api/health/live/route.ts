import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/live
 *
 * Kubernetes/load-balancer liveness probe.
 * Returns 200 if the Node.js process is running and the event loop is alive.
 * Never performs I/O — a slow DB should NOT fail liveness.
 *
 * A failing liveness probe causes the container/instance to be restarted.
 */
export async function GET() {
  return NextResponse.json(
    { status: 'live', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
