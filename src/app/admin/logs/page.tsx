import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { Pagination } from '@/components/ui/pagination';
import { Shield, User, Calendar, FlaskConical } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/calculations';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { ExportExcelButton } from '@/components/admin/export-excel-button';
import { RoleFilter } from '@/components/admin/role-filter';
import { SearchInput } from '@/components/admin/search-input';

async function getLogs(pageStr: string | undefined, fromDateStr?: string, toDateStr?: string, role?: string, q?: string) {
    const currentPage = parseInt(pageStr || '1', 10);
    const pageSize = 100;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
        .from('calculations')
        .select('*, user:users(name, email, role)', { count: 'exact' })
        .order('createdAt', { ascending: false });

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        query = query.or(`chemical.ilike.${keyword},location.ilike.${keyword},agency.ilike.${keyword}`);
    }

    if (fromDateStr) {
        query = query.gte('createdAt', startOfDay(parseISO(fromDateStr)).toISOString());
    }
    if (toDateStr) {
        query = query.lte('createdAt', endOfDay(parseISO(toDateStr)).toISOString());
    }

    // ตัวกรองบทบาท: admin = บันทึกโดยผู้ล็อกอิน (userId มีค่า) หรือ agency มีคำว่า Admin
    // user = กลับด้าน: userId ว่าง และ agency ไม่ใช่ Admin
    if (role === 'admin') {
        query = query.or('userId.not.is.null,agency.ilike.%Admin%');
    } else if (role === 'user') {
        query = query.or(
            'and(userId.is.null,agency.not.ilike.%Admin%),' +
            'and(userId.is.null,agency.is.null)'
        );
    }

    const { data: logs, count, error } = await query.range(from, to);

    if (error) {
        console.error('Error fetching logs:', error);
        return { logs: [], count: 0, currentPage, totalPages: 0 };
    }

    return {
        logs,
        count: count || 0,
        currentPage,
        totalPages: Math.ceil((count || 0) / pageSize)
    };
}

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ page?: string; from?: string; to?: string; role?: string; q?: string }> }) {
    const session = await auth();
    const { page, from, to, role, q } = await searchParams;

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const { logs, count, currentPage, totalPages } = await getLogs(page, from, to, role, q);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">ประวัติการคำนวณ</h1>
                    <p className="text-xs sm:text-sm text-slate-500">ดูประวัติการคำนวณทั้งหมดในระบบ ({count} รายการ)</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full xl:w-auto">
                    <div className="w-full xl:w-52">
                        <SearchInput placeholder="ค้นหา สารเคมี / สถานที่ / หน่วยงาน..." />
                    </div>
                    <div className="w-full sm:w-auto">
                        <RoleFilter allLabel="ทั้งหมด" adminLabel="Admin" userLabel="ผู้ใช้" />
                    </div>
                    <div className="flex-1 w-full">
                        <DateRangeFilter />
                    </div>
                    <div className="w-full sm:w-auto">
                        <ExportExcelButton fromDate={from} toDate={to} />
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto max-h-[70vh] md:max-h-150 overflow-y-auto w-full relative">
                    <table className="w-full text-left border-collapse relative whitespace-nowrap md:whitespace-normal min-w-max md:min-w-0">
                        <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm">
                            <tr className="border-b border-slate-200/50">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">เวลา & การทำรายการ</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">ผู้ใช้งาน / สิทธิ์</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">สถานที่ & พิกัด Tracking</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">สารเคมี & สัดส่วนผสม</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-right">ยอดรวมผสม (มล.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(logs || []).map((log: any) => {
                                const isAdmin = log.user?.role === 'ADMIN' || log.agency?.includes('Admin');
                                const isAi = log.agency?.includes('AI') || log.chemical?.includes('AI');
                                const isCustom = log.agency?.includes('Custom');

                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                                    <Calendar className="h-4 w-4 text-indigo-500" />
                                                    {format(new Date(log.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isAi ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                                                            🤖 สั่งสร้างโดย AI
                                                        </span>
                                                    ) : isCustom ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                            ➕ เพิ่มสูตร Custom
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                            🧪 ประวัติการคำนวณ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="space-y-1">
                                                {isAdmin ? (
                                                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold inline-flex items-center gap-1">
                                                        <Shield className="h-3 w-3 text-indigo-600" /> ผู้ดูแลระบบ (Admin)
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1">
                                                        <User className="h-3 w-3 text-emerald-600" /> ผู้ใช้งานทั่วไป (External User)
                                                    </span>
                                                )}
                                                <div className="text-xs text-slate-500 font-medium pt-0.5">
                                                    {log.agency || log.user?.name || 'ผู้ใช้งานภาคสนาม'}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="space-y-0.5 text-xs">
                                                <div className="font-bold text-slate-800">
                                                    {log.location || 'ไม่ระบุสถานที่'}
                                                </div>
                                                {log.lat != null && log.lng != null ? (
                                                    <div className="text-[11px] text-indigo-600 font-mono flex items-center gap-1">
                                                        📍 พิกัด: {Number(log.lat).toFixed(4)}, {Number(log.lng).toFixed(4)}
                                                    </div>
                                                ) : (
                                                    <div className="text-[11px] text-slate-400">ไม่มีพิกัด GPS</div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="space-y-1 text-xs">
                                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                                    <FlaskConical className="h-3.5 w-3.5 text-purple-600" />
                                                    {log.chemical || 'สูตรกำหนดเอง'}
                                                </div>
                                                <div className="text-slate-600 font-semibold">
                                                    สัดส่วน {log.C}:{log.S} ({log.mix_type === 2 ? 'แบบผสมกับ - เติมสารทบน้ำมัน' : 'แบบผสมให้ได้ - รวมปริมาตรคงที่'})
                                                </div>
                                                <div className="text-slate-500">
                                                    RA: {log.RA} {log.RA_unit === 'L' ? 'ลิตร' : 'มล.'} / 1,000 ตร.ม.
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                                                {formatNumber(log.V_total)} มล.
                                            </span>
                                            <div className="text-xs text-slate-500 font-medium">({(log.V_total / 1000).toFixed(2)} ลิตร)</div>
                                            <div className="text-[11px] text-slate-400">พ่น {log.N} หลัง</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(logs || []).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        ยังไม่มีประวัติการทำรายการ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count || 0} />
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
