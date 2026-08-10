import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recordFormulaAudit } from '@/lib/formula-audit';
import { deviceInfoFromRequest } from '@/lib/device-info';
import { getGuestOwner, setGuestOwnerCookie } from '@/lib/guest-owner';
import { supabaseAdmin } from '@/lib/supabase';
import { profileMutationSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET() {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === 'ADMIN';
        const guestOwner = isAdmin ? null : await getGuestOwner();
        const { data: profiles, error } = await supabaseAdmin
            .from('label_profiles')
            .select('*')
            .eq('isActive', true)
            .order('name', { ascending: true });

        if (error) throw error;
        const safeProfiles = profiles.map((profile) => {
            const { guestOwnerToken, ...safeProfile } = profile;
            return {
                ...safeProfile,
                canManage: isAdmin || guestOwnerToken === guestOwner?.token,
            };
        });

        return NextResponse.json(safeProfiles);
    } catch {
        return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
    }
}

/** Creates a formula that is immediately available to all users. */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === 'ADMIN';
        const validated = profileMutationSchema.parse(await request.json());
        const { actorLabel, location, lat, lng, ...profileInput } = validated;
        const guestOwner = isAdmin ? null : await getGuestOwner();

        const { data: existing, error: existingError } = await supabaseAdmin
            .from('label_profiles')
            .select('id')
            .eq('name', profileInput.name)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
            return NextResponse.json({ error: 'มีชื่อสูตรนี้อยู่ในระบบแล้ว' }, { status: 400 });
        }

        const { data: profile, error } = await supabaseAdmin
            .from('label_profiles')
            .insert({
                ...profileInput,
                // tankCapacity is a retired concept, no longer surfaced anywhere in the
                // app — this fixed value only exists to satisfy the DB column's constraint.
                tankCapacity: 10,
                isActive: true,
                createdById: isAdmin ? session.user.id : null,
                guestOwnerToken: guestOwner?.token ?? null,
            })
            .select()
            .single();

        if (error) throw error;

        try {
            await recordFormulaAudit({
                formulaId: profile.id,
                action: 'CREATE',
                actorType: isAdmin ? 'ADMIN' : 'GUEST',
                actorUserId: isAdmin ? session.user.id : null,
                guestOwnerToken: guestOwner?.token ?? null,
                actorLabel: isAdmin ? session.user.name : actorLabel || 'ผู้ใช้งานทั่วไป',
                location,
                lat,
                lng,
                device: deviceInfoFromRequest(request),
                afterData: profile,
            });
        } catch (auditError) {
            console.error('Formula audit error:', auditError);
        }

        const response = NextResponse.json(
            { profile, status: 'published', message: 'บันทึกและเผยแพร่สูตรเรียบร้อยแล้ว' },
            { status: 201 }
        );
        return guestOwner ? setGuestOwnerCookie(response, guestOwner) : response;
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่อีกครั้ง';
        console.error('Create profile error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
