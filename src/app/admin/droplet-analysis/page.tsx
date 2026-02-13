import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Microscope, CheckCircle2, XCircle, Activity, Building2, Droplets, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default async function DropletAnalysisPage({
    searchParams,
}: {
    searchParams: { page?: string };
}) {
    const page = parseInt(searchParams.page || '1');
    const limit = 15;
    const skip = (page - 1) * limit;

    const [analyses, total, passCount, failCount, avgVmd] = await Promise.all([
        db.dropletAnalysis.findMany({
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        db.dropletAnalysis.count(),
        db.dropletAnalysis.count({ where: { passStandard: true } }),
        db.dropletAnalysis.count({ where: { passStandard: false } }),
        db.dropletAnalysis.aggregate({ _avg: { vmd: true } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Microscope className="h-6 w-6 text-indigo-500" />
                    ผลวิเคราะห์ละอองน้ำยาเคมี (AI)
                </h1>
                <p className="text-slate-500 mt-1">
                    ข้อมูลจากเครื่อง DropDetect Desktop App
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">วิเคราะห์ทั้งหมด</CardTitle>
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{total}</div>
                        <p className="text-xs text-slate-500">รายการ</p>
                    </CardContent>
                </Card>

                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">ผ่านมาตรฐาน WHO</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{passCount}</div>
                        <p className="text-xs text-slate-500">
                            {total > 0 ? `${((passCount / total) * 100).toFixed(1)}% ของทั้งหมด` : '-'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">ไม่ผ่านมาตรฐาน</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{failCount}</div>
                        <p className="text-xs text-slate-500">
                            {total > 0 ? `${((failCount / total) * 100).toFixed(1)}% ของทั้งหมด` : '-'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">VMD เฉลี่ย</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {avgVmd._avg.vmd ? avgVmd._avg.vmd.toFixed(2) : '-'} <span className="text-sm font-normal text-slate-500">µm</span>
                        </div>
                        <p className="text-xs text-slate-500">มาตรฐาน: 10-30 µm</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analysis Table */}
            <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                        <Activity className="h-5 w-5" />
                        รายการวิเคราะห์ ({total} รายการ)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-2 font-medium text-slate-600">#</th>
                                    <th className="text-left py-3 px-2 font-medium text-slate-600">วันที่</th>
                                    <th className="text-left py-3 px-2 font-medium text-slate-600">เครื่องพ่น</th>
                                    <th className="text-left py-3 px-2 font-medium text-slate-600">หน่วยงาน</th>
                                    <th className="text-center py-3 px-2 font-medium text-slate-600">VMD (µm)</th>
                                    <th className="text-center py-3 px-2 font-medium text-slate-600">SPAN</th>
                                    <th className="text-center py-3 px-2 font-medium text-slate-600">จำนวนละออง</th>
                                    <th className="text-center py-3 px-2 font-medium text-slate-600">สารเคมี</th>
                                    <th className="text-center py-3 px-2 font-medium text-slate-600">ผลประเมิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analyses.map((a, i) => (
                                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-2 text-slate-400">{skip + i + 1}</td>
                                        <td className="py-3 px-2 text-slate-700">
                                            {format(a.createdAt, 'd MMM yy HH:mm', { locale: th })}
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="text-slate-800 font-medium">{a.machineName || '-'}</div>
                                            {a.machineId && (
                                                <div className="text-xs text-slate-400">{a.machineId}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-slate-700">{a.organization || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`font-bold ${a.passStandard ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {a.vmd.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-center text-slate-700">{a.span.toFixed(2)}</td>
                                        <td className="py-3 px-2 text-center text-slate-700">{a.dropletCount}</td>
                                        <td className="py-3 px-2 text-center text-slate-600">{a.chemical || '-'}</td>
                                        <td className="py-3 px-2 text-center">
                                            {a.passStandard ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    ผ่าน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                                                    <XCircle className="h-3 w-3" />
                                                    ไม่ผ่าน
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {analyses.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400">
                                            <Microscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                            <p className="text-lg font-medium">ยังไม่มีข้อมูลวิเคราะห์</p>
                                            <p className="text-sm mt-1">ข้อมูลจะปรากฏเมื่อส่งผลวิเคราะห์จาก DropDetect Desktop App</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                หน้า {page} จาก {totalPages}
                            </p>
                            <div className="flex gap-2">
                                {page > 1 && (
                                    <a
                                        href={`/admin/droplet-analysis?page=${page - 1}`}
                                        className="px-3 py-1.5 text-sm rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                    >
                                        ← ก่อนหน้า
                                    </a>
                                )}
                                {page < totalPages && (
                                    <a
                                        href={`/admin/droplet-analysis?page=${page + 1}`}
                                        className="px-3 py-1.5 text-sm rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                                    >
                                        ถัดไป →
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
