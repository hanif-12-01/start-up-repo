import { createAuthClient } from 'better-auth/react';

// Browser authentication is intentionally same-origin. This avoids baking a
// deployment-specific hostname into the client bundle and keeps CSP
// `connect-src 'self'` effective in previews, local verification, and
// production.
export const authClient = createAuthClient();
