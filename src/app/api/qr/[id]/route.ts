import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { qrCodeUpdateSchema } from '@/lib/validations';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') return null;
    return session;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = qrCodeUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        const patch: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
            updatedBy: session.user.id ?? null,
        };
        if (parsed.data.label !== undefined) patch.label = parsed.data.label;
        if (parsed.data.targetUrl !== undefined) patch.targetUrl = parsed.data.targetUrl;

        const { data, error } = await supabaseAdmin
            .from('qr_codes')
            .update(patch)
            .eq('id', id)
            .is('deletedAt', null)
            .select()
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) {
            return NextResponse.json({ error: 'ไม่พบ QR Code นี้ หรือถูกยกเลิกไปแล้ว' }, { status: 404 });
        }
        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถแก้ไข QR Code ได้';
        console.error('QR update error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Soft delete — the row (and its "ยกเลิกเมื่อ" timestamp) is the point of the audit trail. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const now = new Date().toISOString();
        const { data, error } = await supabaseAdmin
            .from('qr_codes')
            .update({ deletedAt: now, updatedAt: now, updatedBy: session.user.id ?? null })
            .eq('id', id)
            .is('deletedAt', null)
            .select()
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) {
            return NextResponse.json({ error: 'ไม่พบ QR Code นี้ หรือถูกยกเลิกไปแล้ว' }, { status: 404 });
        }
        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถยกเลิก QR Code ได้';
        console.error('QR delete error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
