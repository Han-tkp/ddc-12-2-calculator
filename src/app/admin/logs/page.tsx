import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, User, Calendar, Droplets, FlaskConical } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/calculations';

async function getLogs() {
    const { data: logs, error } = await supabase
        .from('calculations')
        .select('*, user:users(name, email)')
        .order('createdAt', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
    return logs;
}

export default async function AdminLogsPage() {
    const session = await auth();

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const logs = await getLogs();

    return (
        <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl animate-float" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float stagger-2" />
                <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-float stagger-4" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b-0 border-x-0 rounded-none">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <Button variant="ghost" size="sm" className="rounded-xl hover-lift">
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    กลับหน้าหลัก
                                </Button>
                            </Link>
                            <Link href="/admin/profiles">
                                <Button variant="ghost" size="sm" className="rounded-xl hover-lift">
                                    <Shield className="h-4 w-4 mr-1" />
                                    จัดการสูตร
                                </Button>
                            </Link>
                            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2" />
                            <h1 className="text-xl font-bold gradient-text-blue">
                                ประวัติการใช้งาน
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                {session.user.name?.[0] || 'A'}
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {session.user.name || 'Admin'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
                <div className="glass-card rounded-3xl overflow-hidden mb-6 animate-fade-up">
                    <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 p-6">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                                <FileText className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    รายการคำนวณล่าสุด
                                    <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                                        {logs.length} รายการ
                                    </span>
                                </h2>
                                <p className="text-white/80">
                                    ดูประวัติการคำนวณทั้งหมดในระบบ
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200/50">
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
                </div>
            </main>

            <Toaster position="top-center" richColors />
        </div>
    );
}
