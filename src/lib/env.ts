import "server-only";

/**
 * Server-only environment validation.
 * Never import from a client component.
 * Error messages MUST NOT include the value of any variable, only its name.
 */

const REQUIRED = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"] as const;
type RequiredKey = (typeof REQUIRED)[number];

const PLACEHOLDER_MARKERS = [
  "[YOUR-PASSWORD]",
  "<PROJECT_REF>",
  "<REGION>",
  "<ENCODED_PASSWORD>",
  "your-generated-secret-here",
  "localhost",
  "127.0.0.1",
  "transaction pooler",
  "session pooler",
];

function isPgUrl(v: string): boolean {
  return v.startsWith("postgresql://") || v.startsWith("postgres://");
}

function hasPlaceholder(v: string): boolean {
  const lower = v.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

function fail(varName: RequiredKey | string, reason: string): never {
  // Never include the value.
  throw new Error(`[env] ${varName}: ${reason}`);
}

function validate() {
  const isProd = process.env.NODE_ENV === "production";

  for (const key of REQUIRED) {
    if (!process.env[key] || process.env[key]!.length === 0) {
      fail(key, "missing required environment variable");
    }
  }

  const dbUrl = process.env.DATABASE_URL!;
  const directUrl = process.env.DIRECT_URL!;
  const nextauthUrl = process.env.NEXTAUTH_URL!;
  const secret = process.env.NEXTAUTH_SECRET!;

  if (!isPgUrl(dbUrl)) fail("DATABASE_URL", "must start with postgresql:// or postgres://");
  if (!isPgUrl(directUrl)) fail("DIRECT_URL", "must start with postgresql:// or postgres://");

  if (isProd) {
    if (!nextauthUrl.startsWith("https://")) {
      fail("NEXTAUTH_URL", "must start with https:// in production");
    }
    if (secret.length < 32) {
      fail("NEXTAUTH_SECRET", "must be at least 32 characters in production");
    }
    if (hasPlaceholder(dbUrl)) fail("DATABASE_URL", "contains placeholder or localhost");
    if (hasPlaceholder(directUrl)) fail("DIRECT_URL", "contains placeholder or localhost");
  }
}

let validated = false;
export function ensureEnv() {
  if (validated) return;
  validate();
  validated = true;
}

// Validate immediately on server import.
ensureEnv();

export const env = {
  NODE_ENV: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === "production",
};
