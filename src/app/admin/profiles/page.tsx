import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ProfilesTable } from '@/components/admin/profiles-table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { ArrowLeft, Settings, FlaskConical, Sparkles, Shield } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { SearchInput } from '@/components/admin/search-input';
import { ProfileSourceFilter } from '@/components/admin/profile-source-filter';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { thaiStartOfDay, thaiEndOfDay } from '@/lib/thai-time';

async function getProfiles(pageStr: string | undefined, q?: string, source?: string, fromDateStr?: string, toDateStr?: string) {
    const currentPage = parseInt(pageStr || '1', 10);
    const pageSize = 20;
    const rangeFrom = (currentPage - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
        .from('label_profiles')
        .select('*, createdBy:users(name, email)', { count: 'exact' })
        .order('createdAt', { ascending: false });

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        query = query.or(`name.ilike.${keyword},description.ilike.${keyword}`);
    }

    // Mirrors the inference in src/lib/profile-source.ts — there's no dedicated
    // "source" column, so this reconstructs the same signals server-side.
    if (source === 'default') {
        query = query.eq('isDefault', true);
    } else if (source === 'admin') {
        query = query.eq('isDefault', false).is('guestOwnerToken', null);
    } else if (source === 'guest') {
        query = query.eq('isDefault', false).not('guestOwnerToken', 'is', null);
    } else if (source === 'file-import') {
        query = query.eq('isDefault', false).or('description.ilike.%นำเข้าจากไฟล์%,description.ilike.%แนบไฟล์ฉลาก%,description.ilike.%วิเคราะห์ฉลาก%');
    }

    if (fromDateStr) {
        query = query.gte('createdAt', thaiStartOfDay(fromDateStr).toISOString());
    }
    if (toDateStr) {
        query = query.lte('createdAt', thaiEndOfDay(toDateStr).toISOString());
    }

    const { data: profiles, count, error } = await query.range(rangeFrom, rangeTo);

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

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; source?: string; from?: string; to?: string }> }) {
    const session = await auth();
    const { page, q, source, from, to } = await searchParams;

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const { profiles, count, currentPage, totalPages } = await getProfiles(page, q, source, from, to);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">จัดการสูตรสารเคมี</h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                        จัดการสูตรที่ผู้ใช้เลือกได้ในหน้าคำนวณ ({(count || 0).toLocaleString('th-TH')} รายการ)
                    </p>
                </div>
                <Link href="/admin/audit" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto gap-2 h-10 bg-white shadow-sm border-slate-200">
                        <Shield className="h-4 w-4" />
                        ดูประวัติ
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col xl:flex-row items-stretch xl:items-end gap-2 w-full">
                <div className="w-full sm:w-64">
                    <SearchInput placeholder="ค้นหาชื่อสูตร หรือคำอธิบาย..." />
                </div>
                <div className="w-full xl:w-auto overflow-x-auto">
                    <ProfileSourceFilter />
                </div>
                <div className="flex-1 w-full">
                    <DateRangeFilter />
                </div>
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
