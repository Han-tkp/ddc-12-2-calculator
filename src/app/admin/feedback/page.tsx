import { db } from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MessageSquare, FlaskConical } from 'lucide-react';

export default async function AdminFeedbackPage() {
    const feedbacks = await db.feedback.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">กล่องข้อความ / แจ้งเพิ่มสูตร</h1>
                    <p className="text-slate-500">ความคิดเห็นและคำร้องขอจากผู้ใช้งาน</p>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px] font-semibold text-slate-700">ประเภท</TableHead>
                            <TableHead className="font-semibold text-slate-700">หน่วยงาน/ผู้ติดต่อ</TableHead>
                            <TableHead className="font-semibold text-slate-700">รายละเอียด</TableHead>
                            <TableHead className="w-[150px] font-semibold text-slate-700">วันที่</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {feedbacks.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50/50 align-top">
                                <TableCell>
                                    <Badge variant={item.type === 'FORMULA_REQUEST' ? 'default' : 'secondary'} className={item.type === 'FORMULA_REQUEST' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-700'}>
                                        {item.type === 'FORMULA_REQUEST' ? (
                                            <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> ขอเพิ่มสูตร</span>
                                        ) : (
                                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> ทั่วไป</span>
                                        )}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-slate-800">{item.organization}</div>
                                    {item.contact && <div className="text-xs text-slate-500 mt-1">📞 {item.contact}</div>}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-700">เหตุผล: <span className="font-normal text-slate-600">{item.reason}</span></p>

                                        {item.message && (
                                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">"{item.message}"</p>
                                        )}

                                        {item.formulaData && (
                                            <div className="text-xs bg-indigo-50 p-2 rounded border border-indigo-100 font-mono text-indigo-800">
                                                {/* Parse JSON safely in real app, here assuming valid JSON string */}
                                                {(() => {
                                                    try {
                                                        const data = JSON.parse(item.formulaData);
                                                        return (
                                                            <>
                                                                <strong>สูตร: {data.name}</strong> <br />
                                                                C:{data.C} / S:{data.S} / RA:{data.RA} / A0:{data.A0}
                                                            </>
                                                        );
                                                    } catch (e) { return 'Invalid Data'; }
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                    {format(item.createdAt, 'd MMM yyyy HH:mm', { locale: th })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {feedbacks.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                    ไม่มีข้อความ
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
