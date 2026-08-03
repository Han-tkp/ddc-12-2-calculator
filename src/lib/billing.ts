import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

export function getStripeClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY ไม่ได้ตั้งค่าไว้');
    }
    return new Stripe(key);
}

export interface SubscriptionStatus {
    active: boolean;
    status: 'active' | 'past_due' | 'canceled' | 'inactive';
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
}

/** Reads the agency-wide subscription row. There is exactly one row for the whole deployment. */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const { data, error } = await supabaseAdmin
        .from('billing_subscription')
        .select('status, currentPeriodEnd, stripeCustomerId')
        .order('updatedAt', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`ไม่สามารถอ่านสถานะการสมัครสมาชิกได้: ${error.message}`);
    }

    if (!data) {
        return { active: false, status: 'inactive', currentPeriodEnd: null, stripeCustomerId: null };
    }

    return {
        active: data.status === 'active',
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        stripeCustomerId: data.stripeCustomerId,
    };
}

async function upsertSubscriptionRow(fields: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status: SubscriptionStatus['status'];
    currentPeriodEnd?: string | null;
}): Promise<void> {
    const { data: existing, error: selectError } = await supabaseAdmin
        .from('billing_subscription')
        .select('id')
        .order('updatedAt', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (selectError) {
        throw new Error(`ไม่สามารถอ่านสถานะการสมัครสมาชิกได้: ${selectError.message}`);
    }

    const payload = {
        stripeCustomerId: fields.stripeCustomerId,
        stripeSubscriptionId: fields.stripeSubscriptionId,
        status: fields.status,
        currentPeriodEnd: fields.currentPeriodEnd,
        updatedAt: new Date().toISOString(),
    };

    const { error } = existing
        ? await supabaseAdmin.from('billing_subscription').update(payload).eq('id', existing.id)
        : await supabaseAdmin.from('billing_subscription').insert(payload);

    if (error) {
        throw new Error(`ไม่สามารถบันทึกสถานะการสมัครสมาชิกได้: ${error.message}`);
    }
}

/** Maps a verified Stripe webhook event into the single billing_subscription row. */
export async function upsertSubscriptionFromStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await upsertSubscriptionRow({
                stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
                stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
                status: 'active',
                currentPeriodEnd: null,
            });
            return;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
            const sub = event.data.object as Stripe.Subscription;
            await upsertSubscriptionRow({
                stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
                stripeSubscriptionId: sub.id,
                status: mapStripeStatus(sub.status),
                currentPeriodEnd: sub.items.data[0]?.current_period_end
                    ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
                    : null,
            });
            return;
        }
        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            await upsertSubscriptionRow({
                stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
                stripeSubscriptionId: sub.id,
                status: 'canceled',
                currentPeriodEnd: null,
            });
            return;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            await upsertSubscriptionRow({
                stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null,
                stripeSubscriptionId: null,
                status: 'past_due',
                currentPeriodEnd: null,
            });
            return;
        }
        default:
            // Ignore events we don't care about.
            return;
    }
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus['status'] {
    if (status === 'active' || status === 'trialing') return 'active';
    if (status === 'past_due' || status === 'unpaid') return 'past_due';
    return 'canceled';
}
