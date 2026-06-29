/**
 * Tests for softDeleteLogs — owner gate + id parsing.
 * Supabase, session, and adminAuth are mocked — no real network calls.
 */

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/supabase/serverSession', () => ({
  createSessionClient: jest.fn(),
}));

jest.mock('@/lib/adminAuth', () => ({
  requireOwner: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/serverSession';
import { requireOwner } from '@/lib/adminAuth';
import { softDeleteLogs } from '@/app/admin/logs/actions';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;
const mockSession = createSessionClient as jest.MockedFunction<typeof createSessionClient>;
const mockRequireOwner = requireOwner as jest.MockedFunction<typeof requireOwner>;

function mockAuth(owner: { userId: string; email: string; role: 'owner' | 'admin' } | null) {
  mockSession.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: owner ? { id: owner.userId } : null } }) },
  } as never);
  mockRequireOwner.mockResolvedValue(owner as never);
}

function mockDb() {
  const inMock     = jest.fn().mockResolvedValue({ data: null, error: null });
  const updateMock = jest.fn().mockReturnValue({ in: inMock });
  const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
  const fromMock = jest.fn((table: string) =>
    table === 'audit_logs' ? { insert: insertMock } : { update: updateMock }
  );
  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, updateMock, inMock, insertMock };
}

function formDataWith(ids: string[]): FormData {
  const fd = new FormData();
  for (const id of ids) fd.append('ids', id);
  return fd;
}

describe('softDeleteLogs()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not update when caller is not an owner', async () => {
    mockAuth(null);
    const { updateMock } = mockDb();
    await softDeleteLogs(formDataWith(['a', 'b']));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns early with no update when no ids are selected', async () => {
    mockAuth({ userId: 'o1', email: 'o@x.com', role: 'owner' });
    const { updateMock } = mockDb();
    await softDeleteLogs(formDataWith([]));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('soft-deletes selected ids and writes an audit row as owner', async () => {
    mockAuth({ userId: 'o1', email: 'o@x.com', role: 'owner' });
    const { updateMock, inMock, insertMock } = mockDb();
    await softDeleteLogs(formDataWith(['a', 'b']));

    const updateArg = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof updateArg.deleted_at).toBe('string');
    expect(inMock).toHaveBeenCalledWith('id', ['a', 'b']);

    const audit = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(audit.action_type).toBe('soft_delete');
    expect(audit.entity_type).toBe('assessment_log');
    expect(audit.notes).toBe('2 logs');
  });
});
