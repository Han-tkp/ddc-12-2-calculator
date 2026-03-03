export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { UserPlus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { UserActions } from '@/components/admin/user-actions';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const session = await auth();
    const { page } = await searchParams;
    const currentPage = parseInt(page || '1', 10);
    const pageSize = 100;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: users, count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching users:', error);
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">จัดการผู้ใช้งาน</h1>
                    <p className="text-slate-500">รายชื่อเจ้าหน้าที่ที่สามารถเข้าใช้งานระบบได้</p>
                </div>
                <Link href="/admin/users/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <UserPlus className="h-4 w-4" />
                        เพิ่มผู้ใช้งาน
                    </Button>
                </Link>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6 w-full">
                <div className="overflow-x-auto max-h-[70vh] md:max-h-150 overflow-y-auto w-full relative">
                    <Table className="whitespace-nowrap md:whitespace-normal text-sm md:text-base">
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">ชื่อ-นามสกุล (เข้ารหัส)</TableHead>
                                <TableHead className="font-semibold text-slate-700">อีเมล</TableHead>
                                <TableHead className="font-semibold text-slate-700">สิทธิ์</TableHead>
                                <TableHead className="font-semibold text-slate-700">วันที่สมัคร</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(users || []).map((user: any) => (
                                <TableRow key={user.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                {/* Decrypt name here for display, handle null/undefined */}
                                                {user.name ? decrypt(user.name).charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span>{user.name ? decrypt(user.name) : 'ไม่ระบุชื่อ'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{user.email}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(user.createdAt), 'd MMM yyyy', { locale: th })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <UserActions user={user} currentUserId={session?.user?.id || ''} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(users || []).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        ไม่พบข้อมูลผู้ใช้งาน
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={count || 0} />
            </div>
        </div>
    );
}
