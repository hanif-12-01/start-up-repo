import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { getOptionalSession } from '@/server/auth/session';
import { isLocalNBeatsCandidateAllowed } from '@/server/services/local-nbeats-candidate';
import { LOCAL_NBEATS_CANDIDATE } from '@/lib/ai/local-candidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!isLocalNBeatsCandidateAllowed(request.headers.get('host'))) {
    return new Response(null, { status: 404, headers });
  }
  if (!(await getOptionalSession())?.user) {
    return new Response(null, { status: 401, headers });
  }
  try {
    // ponytail: local ignored artifact only; deployment needs separate promotion approval.
    const bytes = await readFile(join(process.cwd(), '..', '.onnx-artifacts', `${LOCAL_NBEATS_CANDIDATE.modelVersion}.onnx`));
    if (createHash('sha256').update(bytes).digest('hex') !== LOCAL_NBEATS_CANDIDATE.sha256) {
      throw new Error('MODEL_HASH_MISMATCH');
    }
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
