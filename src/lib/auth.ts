import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { safeError } from "./safe-log";
import { checkRateLimit, recordAuthAttempt, RATE_LIMIT_ERROR } from "./rate-limit";

/**
 * Extract client IP from NextAuth `req` in a robust way.
 * Supports both Headers instances and plain header objects.
 */
function extractIp(req: any): string {
  const headers = req?.headers;
  if (!headers) return "unknown";

  const get = (name: string): string | undefined => {
    if (typeof headers.get === "function") {
      return headers.get(name) ?? undefined;
    }
    const lower = name.toLowerCase();
    // Header objects may be case-sensitive; try both
    return (headers[name] ?? headers[lower]) as string | undefined;
  };

  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xreal = get("x-real-ip");
  if (xreal) return xreal.trim();
  return "unknown";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi");
        }

        const identifier = credentials.email.toLowerCase();
        const ip = extractIp(req);

        // Rate limit check
        const allowed = await checkRateLimit(identifier, ip, "login");
        if (!allowed) {
          throw new Error(RATE_LIMIT_ERROR);
        }

        const user = await db.user.findUnique({
          where: { email: identifier },
          include: { businesses: { select: { id: true, name: true } } },
        });

        if (!user) {
          await recordAuthAttempt(identifier, ip, "login", false);
          throw new Error("Email atau password salah");
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          await recordAuthAttempt(identifier, ip, "login", false);
          throw new Error("Email atau password salah");
        }

        await recordAuthAttempt(identifier, ip, "login", true);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hasBusiness: user.businesses.length > 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasBusiness = (user as any).hasBusiness;
      }
      if (trigger === "update") {
        if (session?.hasBusiness !== undefined) {
          token.hasBusiness = session.hasBusiness;
        } else if (token.id) {
          // Fallback: recompute from DB if client did not pass value.
          const count = await db.business.count({ where: { userId: token.id as string } });
          token.hasBusiness = count > 0;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).hasBusiness = token.hasBusiness;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: (() => {
    const s = process.env.NEXTAUTH_SECRET;
    if (s) return s;
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] NEXTAUTH_SECRET is required in production");
    }
    return "wattwise-dev-secret-key"; // ponytail: dev-only fallback
  })(),
};