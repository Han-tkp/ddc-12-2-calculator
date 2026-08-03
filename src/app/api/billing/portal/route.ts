import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStripeClient, getSubscriptionStatus } from '@/lib/billing';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
        }

        const existing = await getSubscriptionStatus();
        if (!existing.stripeCustomerId) {
            return NextResponse.json({ error: 'ยังไม่มีข้อมูลลูกค้าใน Stripe — ยังไม่เคยชำระเงิน' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const stripe = getStripeClient();
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: existing.stripeCustomerId,
            return_url: `${appUrl}/admin/billing`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถเปิดหน้าจัดการการสมัครสมาชิกได้';
        console.error('Billing portal error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
