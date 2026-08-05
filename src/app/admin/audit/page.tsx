import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { RoleFilter } from '@/components/admin/role-filter';
import { SearchInput } from '@/components/admin/search-input';

const PAGE_SIZE = 20;

async function getFormulaAuditLogs(pageStr: string | undefined, fromDateStr?: string, toDateStr?: string, role?: string, q?: string) {
    const currentPage = parseInt(pageStr || '1', 10);
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseAdmin
        .from('formula_audit_logs')
        .select('*', { count: 'exact' })
        .order('createdAt', { ascending: false });

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        // Formula names live in label_profiles, not on the audit row, so resolve
        // matching ids first and fold them into the same OR as actor/location.
        const { data: matchedProfiles } = await supabaseAdmin
            .from('label_profiles')
            .select('id')
            .ilike('name', keyword);
        const matchedIds = (matchedProfiles || []).map((p: any) => p.id);

        const filters = [`actorLabel.ilike.${keyword}`, `location.ilike.${keyword}`];
        if (matchedIds.length > 0) {
            filters.push(`formulaId.in.(${matchedIds.join(',')})`);
        }
        query = query.or(filters.join(','));
    }

    if (fromDateStr) {
        query = query.gte('createdAt', startOfDay(parseISO(fromDateStr)).toISOString());
    }
    if (toDateStr) {
        query = query.lte('createdAt', endOfDay(parseISO(toDateStr)).toISOString());
    }

    if (role === 'admin') {
        query = query.eq('actorType', 'ADMIN');
    } else if (role === 'user') {
        query = query.eq('actorType', 'GUEST');
    }

    const { data: auditLogs, count, error } = await query.range(from, to);

    if (error || !auditLogs) {
        if (error) console.error('Error fetching formula audit logs:', error);
        return { logs: [], count: 0, currentPage, totalPages: 0 };
    }

    const formulaIds = [...new Set(auditLogs.map((log: any) => log.formulaId))];
    const { data: profiles } = await supabaseAdmin
        .from('label_profiles')
        .select('id, name')
        .in('id', formulaIds);
    const formulaNames = new Map((profiles || []).map((profile: any) => [profile.id, profile.name]));

    const logs = auditLogs.map((log: any) => ({
        ...log,
        formulaName: formulaNames.get(log.formulaId) || 'สูตรที่ถูกลบหรือไม่พบชื่อ',
    }));

    return {
        logs,
        count: count || 0,
        currentPage,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    };
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string; from?: string; to?: string; role?: string; q?: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const { page, from, to, role, q } = await searchParams;
    const { logs: formulaAuditLogs, count, currentPage, totalPages } = await getFormulaAuditLogs(page, from, to, role, q);

    const actionLabels: Record<string, string> = {
        CREATE: 'เพิ่มสูตร',
        UPDATE: 'แก้ไขสูตร',
        ACTIVATE: 'เผยแพร่สูตร',
        DEACTIVATE: 'ปิดใช้งานสูตร',
        DELETE: 'ลบสูตรถาวร',
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">ประวัติจัดการสูตร</h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                        แสดงประวัติการเพิ่ม แก้ไข เผยแพร่ และลบสูตรสารเคมี ({(count || 0).toLocaleString('th-TH')} รายการ)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full xl:w-auto">
                    <div className="w-full sm:w-64">
                        <SearchInput placeholder="ค้นหา สูตร / ผู้ทำรายการ / สถานที่..." />
                    </div>
                    <div className="w-full sm:w-auto">
                        <RoleFilter allLabel="ทั้งหมด" adminLabel="Admin" userLabel="ผู้ใช้" />
                    </div>
                    <div className="flex-1 w-full">
                        <DateRangeFilter />
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-225">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0">
                            <tr>
                                <th className="p-3 font-semibold">เวลา</th>
                                <th className="p-3 font-semibold">ผู้ทำรายการ</th>
                                <th className="p-3 font-semibold">การเปลี่ยนแปลง</th>
                                <th className="p-3 font-semibold">สูตร</th>
                                <th className="p-3 font-semibold">สถานที่ / พิกัด</th>
                                <th className="p-3 font-semibold">อุปกรณ์</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {formulaAuditLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-xs text-slate-600">
                                        {format(new Date(log.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                    </td>
                                    <td className="p-3 max-w-40">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${log.actorType === 'ADMIN' ? 'bg-brand-soft text-brand-dark' : 'bg-slate-100 text-slate-700'}`}>
                                            <Shield className="h-3 w-3 mr-1" />
                                            {log.actorType === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}
                                        </span>
                                        <p className="mt-1 text-xs text-slate-500 truncate" title={log.actorLabel || undefined}>
                                            {log.actorLabel || 'ไม่ระบุชื่อ'}
                                        </p>
                                    </td>
                                    <td className="p-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                        {actionLabels[log.action] || log.action}
                                    </td>
                                    <td className="p-3 text-xs font-semibold text-slate-800 max-w-56">
                                        <span className="block truncate" title={log.formulaName}>{log.formulaName}</span>
                                    </td>
                                    <td className="p-3 text-xs text-slate-600 max-w-56">
                                        <div className="truncate" title={log.location || undefined}>{log.location || 'ไม่ระบุสถานที่'}</div>
                                        {log.lat != null && log.lng != null && (
                                            <div className="font-mono text-[11px] text-brand">
                                                {Number(log.lat).toFixed(4)}, {Number(log.lng).toFixed(4)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-xs text-slate-600 max-w-48">
                                        {log.deviceOs || log.deviceBrowser || log.deviceModel ? (
                                            <>
                                                <div className="truncate" title={[log.deviceOs, log.deviceModel].filter(Boolean).join(' · ')}>
                                                    {[log.deviceOs, log.deviceModel].filter(Boolean).join(' · ') || '-'}
                                                </div>
                                                {log.deviceBrowser && (
                                                    <div className="text-[11px] text-slate-400 truncate">{log.deviceBrowser}</div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-slate-400">ไม่ระบุ</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {formulaAuditLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                                        ยังไม่มีประวัติการจัดการสูตร
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count || 0} />
            </div>
        </div>
    );
}
