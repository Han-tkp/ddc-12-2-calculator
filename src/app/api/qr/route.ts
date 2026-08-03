import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { qrCodeCreateSchema } from '@/lib/validations';
import { generateUniqueSlug, listQrCodes } from '@/lib/qr-codes';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') return null;
    return session;
}

export async function GET(request: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    try {
        const includeDeleted = new URL(request.url).searchParams.get('includeDeleted') === '1';
        return NextResponse.json(await listQrCodes(includeDeleted));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดรายการ QR Code ได้';
        console.error('QR list error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = qrCodeCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        const id = await generateUniqueSlug();
        const { data, error } = await supabaseAdmin
            .from('qr_codes')
            .insert({
                id,
                label: parsed.data.label,
                targetUrl: parsed.data.targetUrl,
                createdBy: session.user.id ?? null,
                updatedBy: session.user.id ?? null,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึก QR Code ได้';
        console.error('QR create error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
