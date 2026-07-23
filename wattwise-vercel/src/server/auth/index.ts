import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { env } from '@/config/env';

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET || 'dev_fallback_secret_32_characters_minimum_length_required_for_auth',
  baseURL: env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [
    env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://wattwise-prod-server:3000',
  ],
  advanced: {
    cookiePrefix: 'wattwise',
  },
});
