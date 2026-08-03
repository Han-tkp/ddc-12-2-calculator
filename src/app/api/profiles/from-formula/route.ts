import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recordFormulaAudit } from '@/lib/formula-audit';
import { deviceInfoFromRequest } from '@/lib/device-info';
import { getGuestOwner, setGuestOwnerCookie } from '@/lib/guest-owner';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { buildGenericFormulaDefinition } from '@/lib/formula-schema';
import { computeAll } from '@/lib/formula-engine';

const fromFormulaSchema = z.object({
    name: z.string().trim().min(1, 'กรุณาระบุชื่อสูตร').max(100, 'ชื่อยาวเกินไป'),
    description: z.string().trim().max(500, 'คำอธิบายยาวเกินไป').optional(),
    variables: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            expression: z.string(),
            unit: z.string().optional(),
            description: z.string().optional(),
        })
    ).min(1, 'สูตรต้องมีอย่างน้อย 1 ตัวแปร'),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === 'ADMIN';
        const guestOwner = isAdmin ? null : await getGuestOwner();

        const validated = fromFormulaSchema.parse(await request.json());

        // Dry-run computeAll to reject broken formulas before saving
        const dryRun = computeAll(validated.variables);
        const firstError = dryRun.find(v => v.error);
        if (firstError) {
            return NextResponse.json(
                { error: `สูตรมีข้อผิดพลาดที่ตัวแปร "${firstError.name}": ${firstError.error}` },
                { status: 400 }
            );
        }

        const formula = buildGenericFormulaDefinition(
            validated.name,
            validated.description,
            validated.variables
        );

        const { data: existing, error: existingError } = await supabaseAdmin
            .from('label_profiles')
            .select('id')
            .eq('name', validated.name)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
            return NextResponse.json({ error: 'มีชื่อสูตรนี้อยู่ในระบบแล้ว' }, { status: 400 });
        }

        const { data: profile, error } = await supabaseAdmin
            .from('label_profiles')
            .insert({
                name: validated.name,
                description: validated.description ?? null,
                formula,
                // Backward-compat fields (not used by generic-table formulas)
                C: 1,
                S: 1,
                RA: 1,
                RA_unit: 'L',
                mix_type: 1,
                A0: 1000,
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
                actorLabel: isAdmin ? session.user.name : 'ผู้ใช้งานทั่วไป',
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
            return NextResponse.json(
                { error: error.issues.map(i => i.message).join(', ') },
                { status: 400 }
            );
        }
        const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกสูตรได้ กรุณาลองใหม่อีกครั้ง';
        console.error('Create formula-from-playground error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
