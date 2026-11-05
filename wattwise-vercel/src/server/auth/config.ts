/** Build auth policy from explicit inputs; never infer trust from a deployment hostname. */
export function getAuthConfig(input: Record<string, string | undefined>, localBuild = false) {
  const hosted = input.VERCEL === '1' || input.VERCEL_ENV === 'preview' || input.VERCEL_ENV === 'production';
  // ponytail: credential-free local compilation only; hosted builds and runtime require explicit config.
  const strict = hosted || (input.NODE_ENV === 'production' && !localBuild);
  const preview = input.VERCEL_ENV === 'preview';
  const secret = input.BETTER_AUTH_SECRET || (strict ? '' : 'dev_fallback_secret_32_characters_minimum_length_required_for_auth');
  if (strict && (new TextEncoder().encode(secret.trim()).length < 32 || secret.startsWith('dev_fallback_secret_'))) {
    throw new Error('BETTER_AUTH_SECRET: independent secret of at least 32 bytes required');
  }

  function origin(value: string | undefined, key: string): string {
    const candidate = value || (strict ? '' : 'http://localhost:3000');
    try {
      const url = new URL(candidate);
      if (candidate !== url.origin || /[*%]/.test(candidate) ||
        !['http:', 'https:'].includes(url.protocol) ||
        (strict && (url.protocol !== 'https:' || /^(localhost|.*\.localhost|127\..*|\[::1\])$/i.test(url.hostname)))) {
        throw new Error();
      }
      return url.origin;
    } catch {
      throw new Error(`${key}: exact ${strict ? 'HTTPS ' : ''}origin required`);
    }
  }

  const baseURL = origin(input.BETTER_AUTH_URL, 'BETTER_AUTH_URL');
  const appOrigin = origin(input.NEXT_PUBLIC_APP_URL, 'NEXT_PUBLIC_APP_URL');
  if (preview && baseURL !== appOrigin) throw new Error('Preview auth and app origins must match');

  const trustedOrigins = new Set([baseURL, appOrigin]);
  if (!strict) {
    for (const port of ['3000', '3001', '3002', ...(/^\d{1,5}$/.test(input.PORT || '') && Number(input.PORT) > 0 && Number(input.PORT) <= 65535 ? [input.PORT!] : [])]) {
      trustedOrigins.add(`http://localhost:${port}`);
      trustedOrigins.add(`http://127.0.0.1:${port}`);
    }
  }

  return {
    secret,
    baseURL,
    trustedOrigins: [...trustedOrigins],
    advanced: {
      cookiePrefix: 'wattwise',
      useSecureCookies: baseURL.startsWith('https://'),
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
  };
}
