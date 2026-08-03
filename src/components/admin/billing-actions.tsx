'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, Settings2, Loader2 } from 'lucide-react';

async function redirectTo(endpoint: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
        const res = await fetch(endpoint, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
            throw new Error(data.error || 'ไม่สามารถดำเนินการได้');
        }
        window.location.href = data.url;
    } catch (err: any) {
        toast.error(err.message || 'เกิดข้อผิดพลาด');
        setLoading(false);
    }
}

export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    return (
        <div className="flex flex-wrap gap-3">
            <Button
                onClick={() => redirectTo('/api/billing/checkout', setCheckoutLoading)}
                disabled={checkoutLoading}
                className="gap-2 rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                ชำระเงิน
            </Button>
            {hasCustomer && (
                <Button
                    variant="outline"
                    onClick={() => redirectTo('/api/billing/portal', setPortalLoading)}
                    disabled={portalLoading}
                    className="gap-2 rounded-xl"
                >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                    จัดการการสมัครสมาชิก
                </Button>
            )}
        </div>
    );
}
