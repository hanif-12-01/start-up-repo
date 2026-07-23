export class TenantAccessError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export function assertResourceOwner(sessionUserId: string, resourceOwnerId: string): void {
  if (!sessionUserId || !resourceOwnerId) {
    throw new TenantAccessError('Access denied');
  }

  if (sessionUserId !== resourceOwnerId) {
    throw new TenantAccessError('Access denied');
  }
}

export function requireTenantOwnership(sessionUserId: string, targetOwnerId: string): void {
  assertResourceOwner(sessionUserId, targetOwnerId);
}
