import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { getDb } from '@/server/db/client';
import { getWorkspaceContext, WorkspaceBusinessNotFoundError, WorkspaceUnavailableError } from '@/server/services/workspace.service';

vi.mock('@/server/db/client', () => ({ getDb: vi.fn() }));
const owned = { id: 'owned', userId: 'owner', isActive: true };
const second = { ...owned, id: 'second' };
let rows = [owned];
const where = vi.fn();
beforeEach(() => {
  rows = [owned];
  where.mockReset().mockImplementation(() => ({ orderBy: async () => rows }));
  vi.mocked(getDb).mockReturnValue({ select: () => ({ from: () => ({ where }) }) } as unknown as ReturnType<typeof getDb>);
});

describe('Active location real workspace resolver (mock DB)', () => {
  it('filters ownership and active status at the DB boundary', async () => {
    expect((await getWorkspaceContext('owner')).business.id).toBe('owned');
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"business"."user_id"');
    expect(query.sql).toContain('"business"."is_active"');
    expect(query.params).toEqual(['owner', true]);
  });
  it('resolves the explicitly selected location using the same workspace resolver as Analysis', async () => {
    rows = [owned, second];
    expect((await getWorkspaceContext('owner', 'second')).business.id).toBe('second');
  });
  it.each(['foreign', 'missing', ' owned '])('never falls back to owned data for invalid selection %s', async id => {
    await expect(getWorkspaceContext('owner', id)).rejects.toBeInstanceOf(WorkspaceBusinessNotFoundError);
  });
  it('rejects no active owned businesses', async () => {
    rows = [];
    await expect(getWorkspaceContext('non-owner')).rejects.toBeInstanceOf(WorkspaceUnavailableError);
  });
});
