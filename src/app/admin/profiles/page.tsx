import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ProfilesTable } from '@/components/admin/profiles-table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { ArrowLeft, Settings, FlaskConical, Sparkles, Shield } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

async function getProfiles(pageStr: string | undefined) {
    const currentPage = parseInt(pageStr || '1', 10);
    const pageSize = 100;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: profiles, count, error } = await supabase
        .from('label_profiles')
        .select('*, createdBy:users(name, email)', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching profiles:', error);
        return { profiles: [], count: 0, currentPage, totalPages: 0 };
    }

    return {
        profiles,
        count: count || 0,
        currentPage,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const session = await auth();
    const { page } = await searchParams;

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const { profiles, count, currentPage, totalPages } = await getProfiles(page);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">จัดการสูตรสารเคมี</h1>
                    <p className="text-xs sm:text-sm text-slate-500">จัดการสูตรที่ผู้ใช้เลือกได้ในหน้าคำนวณ</p>
                </div>
                <Link href="/admin/logs" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto gap-2 h-10 bg-white shadow-sm border-slate-200">
                        <Shield className="h-4 w-4" />
                        ดูประวัติ
                    </Button>
                </Link>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 shadow-sm mb-6">
                <ProfilesTable profiles={profiles} />
                <div className="mt-4">
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count || 0} />
                </div>
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
