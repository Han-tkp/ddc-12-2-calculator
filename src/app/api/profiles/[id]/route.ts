import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recordFormulaAudit } from '@/lib/formula-audit';
import { getGuestOwner } from '@/lib/guest-owner';
import { supabaseAdmin } from '@/lib/supabase';
import { profileMutationSchema } from '@/lib/validations';
import { z } from 'zod';

async function getProfile(id: string) {
    const { data, error } = await supabaseAdmin
        .from('label_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function canManageProfile(profile: { guestOwnerToken?: string | null }, isAdmin: boolean) {
    if (isAdmin) return { allowed: true, guestOwnerToken: null };

    const guestOwner = await getGuestOwner();
    return {
        allowed: profile.guestOwnerToken === guestOwner.token,
        guestOwnerToken: guestOwner.token,
    };
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === 'ADMIN';
        const { id } = await params;
        const currentProfile = await getProfile(id);

        if (!currentProfile) {
            return NextResponse.json({ error: 'ไม่พบสูตรที่ต้องการแก้ไข' }, { status: 404 });
        }

        const access = await canManageProfile(currentProfile, isAdmin);
        if (!access.allowed) {
            return NextResponse.json({ error: 'แก้ไขได้เฉพาะสูตรที่คุณเพิ่มเอง' }, { status: 403 });
        }

        const validated = profileMutationSchema.parse(await request.json());
        const { actorLabel, location, lat, lng, ...profileInput } = validated;

        if (profileInput.name !== currentProfile.name) {
            const { data: existing, error: existingError } = await supabaseAdmin
                .from('label_profiles')
                .select('id')
                .eq('name', profileInput.name)
                .neq('id', id)
                .maybeSingle();

            if (existingError) throw existingError;
            if (existing) {
                return NextResponse.json({ error: 'มีชื่อสูตรนี้อยู่ในระบบแล้ว' }, { status: 400 });
            }
        }

        const isActive = isAdmin ? profileInput.isActive : currentProfile.isActive;
        const { data: updatedProfile, error } = await supabaseAdmin
            .from('label_profiles')
            .update({
                ...profileInput,
                isActive,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        try {
            await recordFormulaAudit({
                formulaId: id,
                action: isAdmin && !currentProfile.isActive && isActive ? 'ACTIVATE' : 'UPDATE',
                actorType: isAdmin ? 'ADMIN' : 'GUEST',
                actorUserId: isAdmin ? session.user.id : null,
                guestOwnerToken: access.guestOwnerToken,
                actorLabel: isAdmin ? session.user.name : actorLabel || 'ผู้ใช้งานทั่วไป',
                location,
                lat,
                lng,
                beforeData: currentProfile,
                afterData: updatedProfile,
            });
        } catch (auditError) {
            console.error('Formula audit error:', auditError);
        }

        return NextResponse.json({ profile: updatedProfile, message: 'บันทึกการแก้ไขสูตรเรียบร้อยแล้ว' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล';
        console.error('Update profile error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === 'ADMIN';
        const { id } = await params;
        const currentProfile = await getProfile(id);

        if (!currentProfile) {
            return NextResponse.json({ error: 'ไม่พบสูตรที่ต้องการลบ' }, { status: 404 });
        }

        const access = await canManageProfile(currentProfile, isAdmin);
        if (!access.allowed) {
            return NextResponse.json({ error: 'ลบได้เฉพาะสูตรที่คุณเพิ่มเอง' }, { status: 403 });
        }

        const body: unknown = await request.json().catch(() => ({}));
        const metadata = z.object({
            location: z.string().trim().max(200).optional(),
            lat: z.number().min(-90).max(90).optional().nullable(),
            lng: z.number().min(-180).max(180).optional().nullable(),
        }).parse(body);

        const { error } = await supabaseAdmin
            .from('label_profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        try {
            await recordFormulaAudit({
                formulaId: id,
                action: 'DELETE',
                actorType: isAdmin ? 'ADMIN' : 'GUEST',
                actorUserId: isAdmin ? session.user.id : null,
                guestOwnerToken: access.guestOwnerToken,
                actorLabel: isAdmin ? session.user.name : 'ผู้ใช้งานทั่วไป',
                ...metadata,
                beforeData: currentProfile,
            });
        } catch (auditError) {
            console.error('Formula audit error:', auditError);
        }

        return NextResponse.json({ success: true, message: 'ลบสูตรออกจากระบบถาวรแล้ว' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
        console.error('Delete profile error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
