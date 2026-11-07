// Harness-only: no requests, credentials, or real sessions.
export const authClient = { signOut: async () => ({ error: null }) };
