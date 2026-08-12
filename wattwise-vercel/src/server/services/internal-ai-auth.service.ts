import { timingSafeEqual } from 'node:crypto';

export function authorizeInternalAiRequest(authorization: string | null): boolean {
  const secret = process.env.WATTWISE_AI_SCHEDULER_SECRET?.trim();
  if (!secret || secret.length < 32 || !authorization?.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length);
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}
