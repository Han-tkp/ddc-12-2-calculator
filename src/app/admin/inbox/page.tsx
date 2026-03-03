import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Inbox, MessageSquareText, FlaskConical, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const { page } = await searchParams;
    const currentPage = parseInt(page || '1', 10);
    const pageSize = 50;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch feedbacks
    const { data: feedbacks, count, error } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching feedbacks:', error);
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl border border-indigo-200 shadow-sm">
                    <Inbox className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">กล่องข้อความ</h1>
                    <p className="text-slate-500">ข้อเสนอแนะและคำขอเพิ่มสูตรจากผู้ใช้งาน</p>
                </div>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6 w-full">
                <div className="overflow-x-auto max-h-[70vh] md:max-h-[80vh] overflow-y-auto w-full relative">
                    <Table className="whitespace-nowrap md:whitespace-normal">
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700 min-w-40">วันที่ส่ง</TableHead>
                                <TableHead className="font-semibold text-slate-700">ประเภท</TableHead>
                                <TableHead className="font-semibold text-slate-700 min-w-56">หน่วยงาน/ติดต่อ</TableHead>
                                <TableHead className="font-semibold text-slate-700 min-w-80">รายละเอียด</TableHead>
                                <TableHead className="font-semibold text-center text-slate-700">สถานะ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(feedbacks || []).map((item: any) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 group">
                                    <TableCell className="text-slate-500 text-sm align-top pt-4">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {format(new Date(item.createdAt), 'd MMM y HH:mm', { locale: th })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        {item.type === 'FORMULA_REQUEST' ? (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 gap-1 font-medium">
                                                <FlaskConical className="h-3 w-3" />
                                                ขอเพิ่มสูตร
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 gap-1 font-medium">
                                                <MessageSquareText className="h-3 w-3" />
                                                แนะนำทั่วไป
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        <div className="font-medium text-slate-800">{item.organization}</div>
                                        {item.contact && (
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                {item.contact}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        <div className="space-y-3">
                                            <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100/50">
                                                <p className="text-sm font-semibold text-slate-700 mb-1">เหตุผล:</p>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.reason}</p>
                                            </div>

                                            {item.formulaData && (
                                                <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-100">
                                                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                                        <FlaskConical className="h-3.5 w-3.5" />
                                                        ข้อมูลสูตรที่ต้องการ
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                                        <div><span className="text-amber-700/70">ชื่อ:</span> <span className="font-medium">{item.formulaData.name}</span></div>
                                                        <div><span className="text-amber-700/70">C:S</span> <span className="font-medium">{item.formulaData.C}:{item.formulaData.S}</span></div>
                                                        <div><span className="text-amber-700/70">RA:</span> <span className="font-medium">{item.formulaData.RA}</span></div>
                                                        <div><span className="text-amber-700/70">A0:</span> <span className="font-medium">{item.formulaData.A0}</span></div>
                                                    </div>
                                                </div>
                                            )}

                                            {item.message && (
                                                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100/50">
                                                    <p className="text-sm font-semibold text-slate-700 mb-1">ข้อความเพิ่มเติม:</p>
                                                    <p className="text-sm text-slate-600 italic whitespace-pre-wrap">{item.message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center align-top pt-4">
                                        <Badge variant="outline" className={`${item.status === 'NEW' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.status === 'NEW' ? 'ใหม่' : 'อ่านแล้ว'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {(feedbacks || []).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <Inbox className="h-12 w-12 opacity-20" />
                                            <p className="text-lg font-medium text-slate-500">ว่างเปล่า</p>
                                            <p className="text-sm">ยังไม่มีข้อเสนอแนะในขณะนี้</p>
                                        </div>
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

// EOF appended
