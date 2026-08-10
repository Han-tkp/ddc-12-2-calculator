/**
 * CRUD handlers สำหรับ AI/MCP tool layer
 *
 * ทุก handler ตรวจสิทธิ์เหมือน REST API (admin/owner), validate schema,
 * ทำ mutation ผ่าน supabaseAdmin (RLS bypass), และบันทึก audit log
 */
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { recordFormulaAudit, type FormulaAuditAction } from '@/lib/formula-audit';
import { getGuestOwner } from '@/lib/guest-owner';
import { profileMutationSchema } from '@/lib/validations';

/** ผลลัพธ์ที่ AI tool handler ส่งกลับให้ LLM — ใช้ ok/ok+data แทน throw เพื่อให้ LLM รู้และลองอีกรอบ */
export type CrudResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

interface CrudContext {
    isAdmin: boolean;
    userId: string | null;
    guestOwnerToken: string | null;
    actorLabel: string;
    actorType: 'ADMIN' | 'GUEST';
}

/** เรียก auth() + getGuestOwner() ครั้งเดียวต่อ request — pattern เดียวกับ /api/profiles route */
async function getCrudContext(): Promise<CrudContext> {
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';
    const guestOwner = isAdmin ? null : await getGuestOwner();
    return {
        isAdmin,
        userId: isAdmin ? (session!.user.id as string) : null,
        guestOwnerToken: guestOwner?.token ?? null,
        actorLabel: isAdmin ? (session!.user.name ?? 'admin') : 'ผู้ใช้งานทั่วไป',
        actorType: isAdmin ? 'ADMIN' : 'GUEST',
    };
}

function formatZodError(zerr: z.ZodError): string {
    return zerr.issues.map((i) => i.message).join(', ');
}

interface ProfileRow {
    id: string;
    name: string;
    description?: string | null;
    C: number;
    S: number;
    RA: number;
    RA_unit: string;
    mix_type: number;
    A0: number;
    isActive: boolean;
    guestOwnerToken?: string | null;
    updatedAt?: string;
}

async function getProfileById(id: string): Promise<ProfileRow | null> {
    const { data, error } = await supabaseAdmin
        .from('label_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
}

/** ตรวจสิทธิ์เหมือน canManageProfile ใน REST API — extract มาเป็น shared util */
function canManage(profile: ProfileRow, ctx: CrudContext): boolean {
    if (ctx.isAdmin) return true;
    return profile.guestOwnerToken === ctx.guestOwnerToken;
}

/* ─────────────────────────────────────────────────────────────────
 * CREATE
 * ───────────────────────────────────────────────────────────────── */
export async function createChemicalProfile(args: Record<string, unknown>): Promise<CrudResult<{ profile: ProfileRow }>> {
    const ctx = await getCrudContext();

    // Zod validate — แยก actorLabel/location/lat/lng ออกจาก profile fields
    let validated;
    try {
        validated = profileMutationSchema.parse(args);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return { ok: false, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(err)}` };
        }
        throw err;
    }
    const { actorLabel, location, lat, lng, ...profileInput } = validated;

    // Duplicate name check (เหมือน REST POST)
    const { data: existing } = await supabaseAdmin
        .from('label_profiles')
        .select('id')
        .eq('name', profileInput.name)
        .maybeSingle();
    if (existing) {
        return { ok: false, error: `มีชื่อสูตร "${profileInput.name}" อยู่ในระบบแล้ว` };
    }

    // Insert
    const { data: profile, error } = await supabaseAdmin
        .from('label_profiles')
        .insert({
            ...profileInput,
            // tankCapacity is a retired concept, no longer surfaced anywhere in the
            // app — this fixed value only exists to satisfy the DB column's constraint.
            tankCapacity: 10,
            // Guest ไม่สามารถตั้ง isActive = false ได้ตอนสร้าง — admin เท่านั้น
            isActive: ctx.isAdmin ? profileInput.isActive : true,
            createdById: ctx.userId,
            guestOwnerToken: ctx.guestOwnerToken,
        })
        .select()
        .single();

    if (error) {
        return { ok: false, error: `ไม่สามารถสร้างสูตรได้: ${error.message}` };
    }

    // Audit log (best-effort — ไม่ให้ fail ทั้ง request)
    try {
        await recordFormulaAudit({
            formulaId: (profile as ProfileRow).id,
            action: 'CREATE',
            actorType: ctx.actorType,
            actorUserId: ctx.userId,
            guestOwnerToken: ctx.guestOwnerToken,
            actorLabel: actorLabel || ctx.actorLabel,
            location: location ?? null,
            lat: lat ?? null,
            lng: lng ?? null,
            afterData: profile,
        });
    } catch (auditErr) {
        console.error('Formula audit error (create):', auditErr);
    }

    return { ok: true, data: { profile: profile as ProfileRow } };
}

/* ─────────────────────────────────────────────────────────────────
 * UPDATE (partial — ใช้สำหรับ patch)
 * ───────────────────────────────────────────────────────────────── */
const ALLOWED_UPDATE_FIELDS = [
    'name', 'description', 'C', 'S', 'RA', 'RA_unit', 'mix_type',
    'A0', 'isActive',
] as const;

const updateArgsSchema = z.object({
    id: z.string().min(1, 'ต้องระบุ id'),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    C: z.number().positive().optional(),
    S: z.number().positive().optional(),
    RA: z.number().positive().optional(),
    RA_unit: z.enum(['L', 'cc']).optional(),
    mix_type: z.number().int().min(1).max(2).optional(),
    A0: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    location: z.string().trim().max(200).optional(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
});

export async function updateChemicalProfile(args: Record<string, unknown>): Promise<CrudResult<{ profile: ProfileRow }>> {
    const ctx = await getCrudContext();

    let validated;
    try {
        validated = updateArgsSchema.parse(args);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return { ok: false, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(err)}` };
        }
        throw err;
    }
    const { id, location, lat, lng, ...fields } = validated;

    const current = await getProfileById(id);
    if (!current) {
        return { ok: false, error: 'ไม่พบสูตรที่ต้องการแก้ไข' };
    }

    if (!canManage(current, ctx)) {
        return { ok: false, error: 'แก้ไขได้เฉพาะสูตรที่คุณเพิ่มเอง' };
    }

    // กรองเฉพาะ field ที่ส่งมาและอยู่ใน allowlist
    const patch: Record<string, unknown> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
        if (fields[key] !== undefined) patch[key] = fields[key];
    }

    if (Object.keys(patch).length === 0) {
        return { ok: false, error: 'ไม่มีฟิลด์ที่ต้องการแก้ไข' };
    }

    // Guest ไม่สามารถ toggle isActive ได้ — ใช้ค่าเดิม
    if (patch.isActive !== undefined && !ctx.isAdmin) {
        delete patch.isActive;
    }

    // Duplicate name check (ถ้าเปลี่ยน name)
    if (patch.name && patch.name !== current.name) {
        const { data: dup } = await supabaseAdmin
            .from('label_profiles')
            .select('id')
            .eq('name', patch.name)
            .neq('id', id)
            .maybeSingle();
        if (dup) {
            return { ok: false, error: `มีชื่อสูตร "${patch.name}" อยู่ในระบบแล้ว` };
        }
    }

    const { data: updated, error } = await supabaseAdmin
        .from('label_profiles')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return { ok: false, error: `ไม่สามารถแก้ไขสูตรได้: ${error.message}` };
    }

    try {
        await recordFormulaAudit({
            formulaId: id,
            action: 'UPDATE',
            actorType: ctx.actorType,
            actorUserId: ctx.userId,
            guestOwnerToken: ctx.guestOwnerToken,
            actorLabel: ctx.actorLabel,
            location: location ?? null,
            lat: lat ?? null,
            lng: lng ?? null,
            beforeData: current,
            afterData: updated,
        });
    } catch (auditErr) {
        console.error('Formula audit error (update):', auditErr);
    }

    return { ok: true, data: { profile: updated as ProfileRow } };
}

/* ─────────────────────────────────────────────────────────────────
 * DELETE (hard delete — ต้องยืนยัน confirm=true)
 * ───────────────────────────────────────────────────────────────── */
const deleteArgsSchema = z.object({
    id: z.string().min(1, 'ต้องระบุ id'),
    confirm: z.literal(true, { message: 'ต้องยืนยัน confirm=true ก่อนลบ' }),
    location: z.string().trim().max(200).optional(),
});

export async function deleteChemicalProfile(args: Record<string, unknown>): Promise<CrudResult<{ deletedId: string; name: string }>> {
    const ctx = await getCrudContext();

    let validated;
    try {
        validated = deleteArgsSchema.parse(args);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return { ok: false, error: formatZodError(err) };
        }
        throw err;
    }
    const { id, confirm: _confirm, location } = validated;

    const current = await getProfileById(id);
    if (!current) {
        return { ok: false, error: 'ไม่พบสูตรที่ต้องการลบ' };
    }

    if (!canManage(current, ctx)) {
        return { ok: false, error: 'ลบได้เฉพาะสูตรที่คุณเพิ่มเอง' };
    }

    const { error } = await supabaseAdmin
        .from('label_profiles')
        .delete()
        .eq('id', id);

    if (error) {
        return { ok: false, error: `ไม่สามารถลบสูตรได้: ${error.message}` };
    }

    try {
        await recordFormulaAudit({
            formulaId: id,
            action: 'DELETE' satisfies FormulaAuditAction,
            actorType: ctx.actorType,
            actorUserId: ctx.userId,
            guestOwnerToken: ctx.guestOwnerToken,
            actorLabel: ctx.actorLabel,
            location: location ?? null,
            beforeData: current,
        });
    } catch (auditErr) {
        console.error('Formula audit error (delete):', auditErr);
    }

    return { ok: true, data: { deletedId: id, name: current.name } };
}