import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecentAICalls, clearAICalls, getQuotaState, DEFAULT_QUOTA } from '@/lib/ai';

/** GET /api/ai/usage — log การเรียกใช้ AI provider ล่าสุด + สถานะโควตา */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '100', 10) || 100, 200);

    return NextResponse.json({
        logs: getRecentAICalls(limit),
        quotaState: getQuotaState(),
        quotaLimits: DEFAULT_QUOTA,
    });
}

/** DELETE /api/ai/usage — ล้าง log */
export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    clearAICalls();
    return NextResponse.json({ success: true, message: 'ล้าง log เรียบร้อย' });
}
