/**
 * Tests for admin allowlist behavior and role checks.
 * The Supabase client is mocked — no real network calls.
 */

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin, requireOwner } from '@/lib/adminAuth';

const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;

function buildAdminSupabaseMock(row: Record<string, unknown> | null, error: unknown = null) {
  const maybySingleMock = jest.fn().mockResolvedValue({ data: row, error });
  const eqActiveMock    = jest.fn().mockReturnValue({ maybeSingle: maybySingleMock });
  const eqIdMock        = jest.fn().mockReturnValue({ eq: eqActiveMock });
  const selectMock      = jest.fn().mockReturnValue({ eq: eqIdMock });
  const fromMock        = jest.fn().mockReturnValue({ select: selectMock });

  const getUserByIdMock = jest.fn().mockResolvedValue({
    data: { user: { email: 'admin@example.com' } },
  });

  mockCreateClient.mockReturnValue({
    from: fromMock,
    auth: { admin: { getUserById: getUserByIdMock } },
  } as never);

  return { fromMock, selectMock, eqIdMock, eqActiveMock, maybySingleMock, getUserByIdMock };
}

describe('requireAdmin()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when user is not in admin_users', async () => {
    buildAdminSupabaseMock(null);
    expect(await requireAdmin('non-admin-user-id')).toBeNull();
  });

  it('returns null when user row is null (inactive or not found)', async () => {
    buildAdminSupabaseMock(null);
    expect(await requireAdmin('inactive-user-id')).toBeNull();
  });

  it('returns identity for active admin user', async () => {
    buildAdminSupabaseMock({ id: 'user-1', role: 'admin', is_active: true });
    const result = await requireAdmin('user-1');
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
    expect(result!.userId).toBe('user-1');
  });

  it('returns identity for owner user when called via requireAdmin', async () => {
    buildAdminSupabaseMock({ id: 'owner-1', role: 'owner', is_active: true });
    const result = await requireAdmin('owner-1');
    expect(result).not.toBeNull();
    expect(result!.role).toBe('owner');
  });

  it('filters by is_active = true', async () => {
    const { eqActiveMock } = buildAdminSupabaseMock({ id: 'user-1', role: 'admin', is_active: true });
    await requireAdmin('user-1');
    expect(eqActiveMock).toHaveBeenCalledWith('is_active', true);
  });
});

describe('requireOwner()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null for admin role (not owner)', async () => {
    buildAdminSupabaseMock({ id: 'user-1', role: 'admin', is_active: true });
    expect(await requireOwner('user-1')).toBeNull();
  });

  it('returns identity for owner role', async () => {
    buildAdminSupabaseMock({ id: 'owner-1', role: 'owner', is_active: true });
    const result = await requireOwner('owner-1');
    expect(result).not.toBeNull();
    expect(result!.role).toBe('owner');
  });

  it('returns null when user not found', async () => {
    buildAdminSupabaseMock(null);
    expect(await requireOwner('nobody')).toBeNull();
  });
});

describe('Admin allowlist security properties', () => {
  beforeEach(() => jest.clearAllMocks());

  it('always queries admin_users — never trusts user-supplied role', async () => {
    const { fromMock } = buildAdminSupabaseMock(null);
    await requireAdmin('any-user-id');
    expect(fromMock).toHaveBeenCalledWith('admin_users');
  });

  it('queries by user ID — not by email or other fields', async () => {
    const { eqIdMock } = buildAdminSupabaseMock(null);
    await requireAdmin('my-user-id');
    expect(eqIdMock).toHaveBeenCalledWith('id', 'my-user-id');
  });
});
