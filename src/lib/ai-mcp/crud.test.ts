/**
 * Test สำหรับ AI/MCP CRUD handlers
 *
 * Mock supabaseAdmin + auth + getGuestOwner เพื่อทดสอบ:
 * - happy path: insert/update/delete + audit log
 * - permission denial: guest token mismatch
 * - Zod validation: invalid fields
 * - duplicate name: create reject
 * - delete confirm: ต้องมี confirm=true
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (ต้องอยู่บนสุดก่อน import ที่ใช้ mock) ─────────────────
const { mockSupabase, mockAuth, mockGuestOwner, mockAudit } = vi.hoisted(() => {
    const mockSupabase = {
        from: vi.fn(),
    };
    const mockAuth = vi.fn();
    const mockGuestOwner = vi.fn();
    const mockAudit = vi.fn();
    return { mockSupabase, mockAuth, mockGuestOwner, mockAudit };
});

vi.mock('@/lib/supabase', () => ({
    supabaseAdmin: mockSupabase,
}));
vi.mock('@/lib/auth', () => ({
    auth: mockAuth,
}));
vi.mock('@/lib/guest-owner', () => ({
    getGuestOwner: mockGuestOwner,
}));
vi.mock('@/lib/formula-audit', () => ({
    recordFormulaAudit: mockAudit,
}));

// Helper: สร้าง query chain ที่ resolve ด้วย data/error ที่กำหนด
function chainWith(data: unknown, error: unknown = null) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        single: vi.fn().mockResolvedValue({ data, error }),
        then: (resolve: (v: unknown) => void) => resolve({ data, error }),
    };
    return chain;
}

// Helper: admin context
function adminContext() {
    mockAuth.mockResolvedValue({
        user: { id: 'admin-1', name: 'ทดสอบ แอดมิน', role: 'ADMIN' },
    });
}

// Helper: guest context พร้อม token
function guestContext(token = 'guest-token-abc') {
    mockAuth.mockResolvedValue(null);
    mockGuestOwner.mockResolvedValue({ token, isNew: false });
}

// Helper: ตั้ง supabase chain สำหรับ table
function setupSupabaseFor(table: string, impl: () => ReturnType<typeof chainWith>) {
    mockSupabase.from.mockImplementation((t: string) => {
        if (t !== table) throw new Error(`unexpected table ${t}`);
        return impl();
    });
}

// ─── Tests ──────────────────────────────────────────────────────────────
describe('ai-mcp/crud', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAudit.mockResolvedValue(undefined);
    });

    describe('createChemicalProfile', () => {
        it('admin: insert + audit log ครบ', async () => {
            const { createChemicalProfile } = await import('./crud');
            adminContext();

            const newProfile = {
                id: 'p-1', name: 'Deltacide ULV', C: 1, S: 9, RA: 50, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true,
            };

            // from('label_profiles'): duplicate check (no existing) → insert → audit
            let callCount = 0;
            mockSupabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // duplicate name check: .select().eq().eq().maybeSingle()
                    return chainWith(null); // no existing
                }
                if (callCount === 2) {
                    // insert: .insert().select().single()
                    return chainWith(newProfile);
                }
                return chainWith(null);
            });

            const result = await createChemicalProfile({
                name: 'Deltacide ULV', C: 1, S: 9, RA: 50, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10,
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data?.profile.id).toBe('p-1');
            }
            expect(mockAudit).toHaveBeenCalledOnce();
            const auditCall = mockAudit.mock.calls[0][0];
            expect(auditCall.action).toBe('CREATE');
            expect(auditCall.actorType).toBe('ADMIN');
            expect(auditCall.actorUserId).toBe('admin-1');
        });

        it('guest: ใช้ guestOwnerToken + actor type GUEST', async () => {
            const { createChemicalProfile } = await import('./crud');
            guestContext('my-token');

            const newProfile = { id: 'p-2', name: 'My Formula', C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true };
            let callCount = 0;
            mockSupabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) return chainWith(null);
                if (callCount === 2) return chainWith(newProfile);
                return chainWith(null);
            });

            const result = await createChemicalProfile({
                name: 'My Formula', C: 1, S: 9, RA: 50, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10,
            });

            expect(result.ok).toBe(true);
            expect(mockAudit).toHaveBeenCalledOnce();
            const auditCall = mockAudit.mock.calls[0][0];
            expect(auditCall.actorType).toBe('GUEST');
            expect(auditCall.actorUserId).toBeNull();
            expect(auditCall.guestOwnerToken).toBe('my-token');
        });

        it('duplicate name → {ok:false}', async () => {
            const { createChemicalProfile } = await import('./crud');
            adminContext();
            // duplicate check เจอ record เดิม
            mockSupabase.from.mockImplementation(() => chainWith({ id: 'existing' }));

            const result = await createChemicalProfile({
                name: 'Deltacide ULV', C: 1, S: 9, RA: 50, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10,
            });

            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('Deltacide ULV');
            expect(mockAudit).not.toHaveBeenCalled();
        });

        it('Zod validation fail → {ok:false} ไม่ insert', async () => {
            const { createChemicalProfile } = await import('./crud');
            adminContext();

            const result = await createChemicalProfile({
                name: '', // empty → Zod reject
                C: 1, S: 9, RA: 50, RA_unit: 'cc',
            });

            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('ข้อมูลไม่ถูกต้อง');
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });
    });

    describe('updateChemicalProfile', () => {
        it('guest token mismatch → forbidden', async () => {
            const { updateChemicalProfile } = await import('./crud');
            guestContext('my-token');
            // profile ถูกสร้างโดย owner อื่น
            mockSupabase.from.mockImplementation(() => chainWith({
                id: 'p-3', name: 'X', C: 1, S: 1, RA: 1, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true,
                guestOwnerToken: 'other-token',
            }));

            const result = await updateChemicalProfile({ id: 'p-3', RA: 99 });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('เฉพาะสูตรที่คุณเพิ่มเอง');
        });

        it('admin override → ผ่านได้', async () => {
            const { updateChemicalProfile } = await import('./crud');
            adminContext();
            const updated = { id: 'p-4', name: 'X', C: 1, S: 1, RA: 99, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true };
            let callCount = 0;
            mockSupabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) return chainWith({ ...updated, RA: 1 });
                if (callCount === 2) return chainWith(updated); // patch
                return chainWith(null);
            });

            const result = await updateChemicalProfile({ id: 'p-4', RA: 99 });
            expect(result.ok).toBe(true);
            const auditCall = mockAudit.mock.calls[0][0];
            expect(auditCall.action).toBe('UPDATE');
        });

        it('ไม่มี field ที่ต้องการแก้ → error', async () => {
            const { updateChemicalProfile } = await import('./crud');
            adminContext();
            mockSupabase.from.mockImplementation(() => chainWith({
                id: 'p-5', name: 'X', C: 1, S: 1, RA: 1, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true,
            }));

            const result = await updateChemicalProfile({ id: 'p-5' });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('ไม่มีฟิลด์');
        });
    });

    describe('deleteChemicalProfile', () => {
        it('ไม่มี confirm → {ok:false}', async () => {
            const { deleteChemicalProfile } = await import('./crud');
            adminContext();
            const result = await deleteChemicalProfile({ id: 'p-6' });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('confirm');
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });

        it('confirm=false → {ok:false}', async () => {
            const { deleteChemicalProfile } = await import('./crud');
            adminContext();
            const result = await deleteChemicalProfile({ id: 'p-6', confirm: false });
            expect(result.ok).toBe(false);
        });

        it('admin + confirm=true → delete + audit DELETE', async () => {
            const { deleteChemicalProfile } = await import('./crud');
            adminContext();
            const existing = { id: 'p-7', name: 'Old', C: 1, S: 1, RA: 1, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true };
            mockSupabase.from.mockImplementation(() => chainWith(existing));

            const result = await deleteChemicalProfile({ id: 'p-7', confirm: true });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data?.deletedId).toBe('p-7');
                expect(result.data?.name).toBe('Old');
            }
            const auditCall = mockAudit.mock.calls[0][0];
            expect(auditCall.action).toBe('DELETE');
            expect(auditCall.beforeData).toEqual(existing);
        });

        it('guest mismatch → forbidden', async () => {
            const { deleteChemicalProfile } = await import('./crud');
            guestContext('my-token');
            mockSupabase.from.mockImplementation(() => chainWith({
                id: 'p-8', name: 'X', C: 1, S: 1, RA: 1, RA_unit: 'cc',
                mix_type: 2, A0: 1000, tankCapacity: 10, isActive: true,
                guestOwnerToken: 'other-token',
            }));

            const result = await deleteChemicalProfile({ id: 'p-8', confirm: true });
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error).toContain('เฉพาะสูตรที่คุณเพิ่มเอง');
        });
    });
});