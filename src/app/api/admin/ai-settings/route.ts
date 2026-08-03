import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeAISettings, DEFAULT_AI_SETTINGS, AI_SETTINGS_KEY } from '@/lib/ai/settings';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return null;
    }
    return session;
}

export async function GET() {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', AI_SETTINGS_KEY)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: `ไม่สามารถอ่านการตั้งค่าได้: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(normalizeAISettings(data?.value) ?? DEFAULT_AI_SETTINGS);
}

export async function PUT(request: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const normalized = normalizeAISettings(body) ?? DEFAULT_AI_SETTINGS;

    const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert({ key: AI_SETTINGS_KEY, value: normalized, updatedAt: new Date().toISOString() });

    if (error) {
        return NextResponse.json({ error: `ไม่สามารถบันทึกการตั้งค่าได้: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(normalized);
}
