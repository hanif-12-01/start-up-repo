import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { isProductionBuild } from '@/config/env';
import { getAuthConfig } from './config';

const config = getAuthConfig(process.env, isProductionBuild());

export const auth = betterAuth({
  ...config,
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
});
