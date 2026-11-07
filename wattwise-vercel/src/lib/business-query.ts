/**
 * Keeps the explicitly selected active location through in-app navigation.
 * Server routes still re-authorize the ID; this helper only preserves context.
 */
export function withBusinessId(
  href: string,
  businessId: string | null | undefined
): string {
  const id = businessId?.trim();
  if (!id || !href.startsWith('/') || href.startsWith('//')) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

  const params = new URLSearchParams(query);
  if (params.getAll('businessId').length > 0) return href;

  params.set('businessId', id);
  return `${path}?${params.toString()}${hash}`;
}