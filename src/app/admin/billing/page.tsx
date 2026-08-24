import { getSubscriptionStatus } from '@/lib/billing';
import { BillingActions } from '@/components/admin/billing-actions';
import { CreditCard, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatThaiDate } from '@/lib/thai-time';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    active: { label: 'ใช้งานอยู่', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    past_due: { label: 'ค้างชำระ', icon: AlertTriangle, className: 'text-amber-600 bg-amber-50 border-amber-200' },
    canceled: { label: 'ยกเลิกแล้ว', icon: XCircle, className: 'text-red-600 bg-red-50 border-red-200' },
    inactive: { label: 'ยังไม่ได้สมัครสมาชิก', icon: XCircle, className: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default async function AdminBillingPage() {
    const subscription = await getSubscriptionStatus();
    const meta = STATUS_META[subscription.status];
    const StatusIcon = meta.icon;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-brand-soft p-2.5 rounded-xl border border-brand/20 shadow-sm">
                    <CreditCard className="h-6 w-6 text-brand" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">การเรียกเก็บเงิน / Subscription</h1>
                    <p className="text-slate-500">หน่วยงานสมัครสมาชิกครั้งเดียว ใช้งานฟีเจอร์ AI ได้ทุกคนโดยไม่ต้องมีคีย์ส่วนตัว</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 max-w-xl">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${meta.className}`}>
                    <StatusIcon className="h-4 w-4" />
                    {meta.label}
                </div>

                {subscription.active && subscription.currentPeriodEnd && (
                    <p className="text-sm text-slate-500">
                        ต่ออายุ/สิ้นสุดรอบถัดไป: {formatThaiDate(subscription.currentPeriodEnd)}
                    </p>
                )}

                {!subscription.active && (
                    <p className="text-sm text-slate-500">
                        ฟีเจอร์ AI (ผู้ช่วยสร้างสูตร, แชท) จะปิดใช้งานจนกว่าจะสมัครสมาชิก — ระบบคำนวณหลักยังใช้งานได้ตามปกติ
                    </p>
                )}

                <BillingActions hasCustomer={Boolean(subscription.stripeCustomerId)} />
            </div>
        </div>
    );
}
