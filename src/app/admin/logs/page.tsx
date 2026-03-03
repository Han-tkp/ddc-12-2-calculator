import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, User, Calendar, Droplets, FlaskConical } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/calculations';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { ExportExcelButton } from '@/components/admin/export-excel-button';

async function getLogs(pageStr: string | undefined, fromDateStr?: string, toDateStr?: string) {
    const currentPage = parseInt(pageStr || '1', 10);
    const pageSize = 100;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('calculations')
        .select('*, user:users(name, email)', { count: 'exact' })
        .order('createdAt', { ascending: false });

    if (fromDateStr) {
        query = query.gte('createdAt', startOfDay(parseISO(fromDateStr)).toISOString());
    }
    if (toDateStr) {
        query = query.lte('createdAt', endOfDay(parseISO(toDateStr)).toISOString());
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

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ page?: string; from?: string; to?: string }> }) {
    const session = await auth();
    const { page, from, to } = await searchParams;

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const { logs, count, currentPage, totalPages } = await getLogs(page, from, to);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">ประวัติการคำนวณ</h1>
                    <p className="text-slate-500">ดูประวัติการคำนวณทั้งหมดในระบบ ({count} รายการ)</p>
                </div>
                <div className="flex items-end gap-2">
                    <DateRangeFilter />
                    <div className="pb-6">
                        <ExportExcelButton fromDate={from} toDate={to} />
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto max-h-150 overflow-y-auto w-full relative">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm">
                            <tr className="border-b border-slate-200/50">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">เวลา</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">สถานที่/ผู้ใช้</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">สารเคมี</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">สูตร (C:S)</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-right">ผลลัพธ์รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(logs || []).map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {format(new Date(log.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <div className="font-medium text-slate-800 dark:text-slate-200">
                                                {log.location || '-'}
                                            </div>
                                            {log.user ? (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <User className="h-3 w-3" />
                                                    {log.user.name || 'User'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-slate-400 italic">
                                                    <User className="h-3 w-3" />
                                                    Anonymous
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <FlaskConical className="h-4 w-4 text-purple-500" />
                                            <span className="text-sm font-medium">{log.chemical || 'กำหนดเอง'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Droplets className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{log.C}:{log.S}</span>
                                        </div>
                                        <div className="text-xs text-slate-400">RA: {log.RA} {log.RA_unit}</div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatNumber(log.V_total)} cc
                                        </span>
                                        <div className="text-xs text-slate-400">{log.N} หลัง</div>
                                    </td>
                                </tr>
                            ))}
                            {(logs || []).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        ยังไม่มีประวัติการคำนวณ
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
