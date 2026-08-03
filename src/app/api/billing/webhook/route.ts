import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, upsertSubscriptionFromStripeEvent } from '@/lib/billing';

// Stripe calls this endpoint directly — no session auth here. Trust is established
// entirely by verifying the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        return NextResponse.json({ error: 'Webhook ไม่ได้ตั้งค่าไว้ถูกต้อง' }, { status: 500 });
    }

    const rawBody = await request.text();

    let event;
    try {
        const stripe = getStripeClient();
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ลายเซ็นไม่ถูกต้อง';
        console.error('Stripe webhook signature verification failed:', message);
        return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
    }

    try {
        await upsertSubscriptionFromStripeEvent(event);
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook handling error:', error);
        return NextResponse.json({ error: 'ไม่สามารถประมวลผล webhook ได้' }, { status: 500 });
    }
}
