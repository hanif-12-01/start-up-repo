import "server-only";

/**
 * Safe logging helper. Redacts secrets before writing to server logs.
 * Never call from client code. Never log full env or credentials.
 */

const PATTERNS: { re: RegExp; replace: string }[] = [
  { re: /postgres(?:ql)?:\/\/[^\s"'`]+/gi, replace: "[REDACTED_PG_URL]" },
  { re: /(authorization\s*[:=]\s*)(bearer|basic)\s+[A-Za-z0-9._\-+/=]+/gi, replace: "$1$2 [REDACTED]" },
  {
    re: /((?:password|passwd|pwd|secret|token|api[_-]?key|nextauth_secret)\s*[:=]\s*)("?)[^\s"',}]+\2/gi,
    replace: "$1$2[REDACTED]$2",
  },
  { re: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, replace: "[REDACTED_JWT]" },
];

const SECRET_ENV_VALUES = () =>
  [process.env.NEXTAUTH_SECRET, process.env.DATABASE_URL, process.env.DIRECT_URL].filter(
    (v): v is string => !!v && v.length >= 8
  );

function scrubString(s: string): string {
  let out = s;
  for (const v of SECRET_ENV_VALUES()) {
    if (out.includes(v)) out = out.split(v).join("[REDACTED_ENV]");
  }
  for (const p of PATTERNS) out = out.replace(p.re, p.replace);
  return out;
}

function scrub(input: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (input == null) return input;
  if (typeof input === "string") return scrubString(input);
  if (input instanceof Error) {
    return { name: input.name, message: scrubString(input.message) };
  }
  if (Array.isArray(input)) return input.map((i) => scrub(i, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (/pass|secret|token|authorization|cookie|api[_-]?key/i.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out;
  }
  return input;
}

export function safeError(tag: string, err: unknown, extra?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.error(`[${tag}]`, scrub(err), extra ? scrub(extra) : undefined);
}

export function safeInfo(tag: string, msg: string, extra?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.info(`[${tag}] ${scrubString(msg)}`, extra ? scrub(extra) : undefined);
}
