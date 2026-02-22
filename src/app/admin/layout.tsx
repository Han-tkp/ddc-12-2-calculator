import { redirect } from 'next/navigation';
import { AdminLayoutWrapper } from '@/components/admin/admin-layout-wrapper';
import { auth } from '@/lib/auth';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth Guard: Only ADMIN role can access
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        redirect('/login');
    }

    return (
        <AdminLayoutWrapper>
            {children}
        </AdminLayoutWrapper>
    );
}
