import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createProviders, DEFAULT_ORDER } from '@/lib/ai';

/** GET /api/ai/status — สถานะ provider ที่ตั้งค่าไว้ (ไม่เปิดเผย key) */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    const providers = createProviders();
    const status = Object.values(providers).map(p => ({
        name: p.name,
        displayName: p.displayName,
        configured: p.isConfigured(),
        defaultModel: p.defaultModel,
    }));

    return NextResponse.json({ providers: status, defaultOrder: DEFAULT_ORDER });
}
