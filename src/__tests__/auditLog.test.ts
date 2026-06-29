/**
 * Tests for writeAuditLog — camelCase params -> snake_case columns, never throws.
 * The Supabase client is mocked — no real network calls.
 */

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<
  typeof createServerSupabaseClient
>;

function buildInsertMock(error: unknown = null) {
  const insertMock = jest.fn().mockResolvedValue({ data: null, error });
  const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
  mockCreateClient.mockReturnValue({ from: fromMock } as never);
  return { fromMock, insertMock };
}

describe('writeAuditLog()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts into audit_logs', async () => {
    const { fromMock } = buildInsertMock();
    await writeAuditLog({ performedBy: 'u1', actionType: 'publish_dataset' });
    expect(fromMock).toHaveBeenCalledWith('audit_logs');
  });

  it('maps camelCase params to snake_case columns', async () => {
    const { insertMock } = buildInsertMock();
    await writeAuditLog({
      performedBy: 'u1',
      actionType: 'publish_dataset',
      entityType: 'dataset',
      entityId: 'v1',
      newValue: { ids: ['a'] },
    });
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.performed_by).toBe('u1');
    expect(inserted.action_type).toBe('publish_dataset');
    expect(inserted.entity_type).toBe('dataset');
    expect(inserted.entity_id).toBe('v1');
    expect(inserted.new_value).toEqual({ ids: ['a'] });
  });

  it('defaults unset optional fields to null', async () => {
    const { insertMock } = buildInsertMock();
    await writeAuditLog({ performedBy: 'u1', actionType: 'soft_delete' });
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.entity_type).toBeNull();
    expect(inserted.entity_id).toBeNull();
    expect(inserted.old_value).toBeNull();
    expect(inserted.new_value).toBeNull();
    expect(inserted.notes).toBeNull();
  });

  it('does not throw when the insert returns an error', async () => {
    buildInsertMock({ message: 'DB error' });
    await expect(
      writeAuditLog({ performedBy: 'u1', actionType: 'export' })
    ).resolves.toBeUndefined();
  });
});
