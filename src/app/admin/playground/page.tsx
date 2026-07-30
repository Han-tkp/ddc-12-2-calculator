import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FormulaPlayground } from '@/components/admin/formula-playground';

export const dynamic = 'force-dynamic';

export default async function AdminPlaygroundPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    return (
        <div className="pb-12">
            <FormulaPlayground />
        </div>
    );
}
