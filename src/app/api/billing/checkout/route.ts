import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStripeClient, getSubscriptionStatus } from '@/lib/billing';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
        }

        const priceId = process.env.STRIPE_PRICE_ID;
        if (!priceId) {
            return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า STRIPE_PRICE_ID' }, { status: 500 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const existing = await getSubscriptionStatus();

        const stripe = getStripeClient();
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            customer: existing.stripeCustomerId ?? undefined,
            success_url: `${appUrl}/admin/billing?checkout=success`,
            cancel_url: `${appUrl}/admin/billing?checkout=canceled`,
        });

        if (!checkoutSession.url) {
            return NextResponse.json({ error: 'ไม่สามารถสร้างลิงก์ชำระเงินได้' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถเริ่มการชำระเงินได้';
        console.error('Billing checkout error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
