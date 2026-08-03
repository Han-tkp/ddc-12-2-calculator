import { redirect } from 'next/navigation';
import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { findQrCodeForRedirect, incrementScanCount } from '@/lib/qr-codes';

export const dynamic = 'force-dynamic';

/**
 * Public short-link resolver. Deliberately unauthenticated: these links are printed on
 * signage and scanned by anyone in the field. Nothing about the QR record is rendered
 * on the way through — the visitor either lands on the destination or is told the link
 * was withdrawn.
 */
export default async function QrRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const record = await findQrCodeForRedirect(id);

    if (record && !record.deletedAt) {
        await incrementScanCount(id);
        redirect(record.targetUrl);
    }

    const wasRetired = Boolean(record?.deletedAt);

    return (
        <main className="min-h-screen flex items-center justify-center bg-brand-cloud px-4">
            <div className="max-w-md w-full rounded-2xl border border-brand-line bg-white p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
                    <QrCode className="h-6 w-6 text-brand" />
                </div>
                <h1 className="text-lg font-bold text-brand-ink mb-2">
                    {wasRetired ? 'ลิงก์นี้ถูกยกเลิกแล้ว' : 'ไม่พบลิงก์นี้ในระบบ'}
                </h1>
                <p className="text-sm text-brand-muted leading-relaxed">
                    {wasRetired
                        ? 'ป้าย QR Code ที่ท่านสแกนถูกยกเลิกการใช้งานแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อขอลิงก์ปัจจุบัน'
                        : 'รหัส QR Code ไม่ถูกต้อง หรืออาจถูกลบออกจากระบบแล้ว'}
                </p>
                <Link
                    href="/"
                    className="inline-block mt-6 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark"
                >
                    ไปหน้าหลักของระบบ
                </Link>
            </div>
        </main>
    );
}
