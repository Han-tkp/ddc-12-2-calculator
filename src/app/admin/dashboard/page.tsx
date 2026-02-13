import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, FlaskConical, Clock, TrendingUp, CalendarRange, Microscope, MapPin } from 'lucide-react';
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: { from?: string; to?: string };
}) {
    // 1. Date Logic
    const startDate = searchParams.from ? startOfDay(parseISO(searchParams.from)) : subDays(startOfDay(new Date()), 30);
    const endDate = searchParams.to ? endOfDay(parseISO(searchParams.to)) : endOfDay(new Date());

    const dateFilter = {
        createdAt: {
            gte: startDate,
            lte: endDate,
        },
    };

    // 2. Fetch Data Parallelly
    const [
        totalCalculations,
        totalUsers,
        popularChemicals,
        recentCalculations,
        calculationsInRange,
        totalDropletAnalyses,
        passedDropletAnalyses,
        mapPoints,
        uniqueLocations,
    ] = await Promise.all([
        db.calculation.count({ where: dateFilter }),
        db.user.count(),
        db.calculation.groupBy({
            by: ['chemical'],
            _count: { chemical: true },
            where: dateFilter,
            orderBy: { _count: { chemical: 'desc' } },
            take: 5,
        }),
        db.calculation.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } },
        }),
        db.calculation.findMany({
            where: dateFilter,
            select: { createdAt: true, chemical: true },
            orderBy: { createdAt: 'asc' },
        }),
        db.dropletAnalysis.count(),
        db.dropletAnalysis.count({ where: { passStandard: true } }),
        // Using `as any` because prisma generate hasn't run (lat/lng types missing)
        (db.calculation as any).findMany({
            where: {
                ...dateFilter,
                lat: { not: null },
                lng: { not: null },
            },
            select: {
                id: true,
                lat: true,
                lng: true,
                chemical: true,
                location: true,
                V_total: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }),
        db.calculation.groupBy({
            by: ['location'],
            where: { ...dateFilter, location: { not: null } },
            _count: { location: true },
        }),
    ]);

    // 3. Process Data for Charts

    // 3.1 Daily Stats
    const daysMap = new Map<string, number>();
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    daysInterval.forEach(day => {
        daysMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    calculationsInRange.forEach(calc => {
        const dateKey = format(calc.createdAt, 'yyyy-MM-dd');
        if (daysMap.has(dateKey)) {
            daysMap.set(dateKey, (daysMap.get(dateKey) || 0) + 1);
        }
    });

    const dailyStats = Array.from(daysMap.entries()).map(([date, count]) => ({
        date: format(parseISO(date), 'd MMM', { locale: th }),
        count
    }));

    // 3.2 Chemical Stats for Pie Chart
    const chemicalStats = popularChemicals.map(item => ({
        name: item.chemical || 'อื่นๆ',
        value: item._count.chemical
    }));

    // Decrypt names for recent activity
    const { decrypt } = await import('@/lib/encryption');

    const recentWithNames = recentCalculations.map(calc => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name) : 'Guest'
    }));

    // 3.3 Location Report Data
    const locationReportData = await db.calculation.groupBy({
        by: ['location'],
        where: { ...dateFilter, location: { not: null } },
        _count: { location: true },
        _max: { createdAt: true, chemical: true },
        orderBy: { _count: { location: 'desc' } },
        take: 20,
    });

    const locationReport = locationReportData.map(loc => ({
        name: loc.location || 'ไม่ระบุ',
        count: loc._count.location,
        chemical: loc._max.chemical || null,
        lastUsed: loc._max.createdAt
            ? format(loc._max.createdAt, 'd MMM yy', { locale: th })
            : '-',
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard ภาพรวม</h1>
                    <p className="text-slate-500">
                        ข้อมูลระหว่าง {format(startDate, 'd MMM yyyy', { locale: th })} - {format(endDate, 'd MMM yyyy', { locale: th })}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                    <CalendarRange className="h-4 w-4" />
                    {totalCalculations} รายการในช่วงเวลานี้
                </div>
            </div>

            {/* Filter */}
            <DateRangeFilter />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">คำนวณทั้งหมด (ช่วงนี้)</CardTitle>
                        <Calculator className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalCalculations}</div>
                        <p className="text-xs text-slate-500">+ จากช่วงเวลาที่เลือก</p>
                    </CardContent>
                </Card>
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">ผู้ใช้งานทั้งหมด</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalUsers}</div>
                        <p className="text-xs text-slate-500">บัญชีในระบบ</p>
                    </CardContent>
                </Card>
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">สูตรยอดนิยม</CardTitle>
                        <FlaskConical className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800 truncate">
                            {popularChemicals[0]?.chemical || '-'}
                        </div>
                        <p className="text-xs text-slate-500">
                            {popularChemicals[0]?._count.chemical || 0} ครั้ง
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">แนวโน้ม</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {dailyStats[dailyStats.length - 1]?.count || 0}
                        </div>
                        <p className="text-xs text-slate-500">รายการวันนี้</p>
                    </CardContent>
                </Card>
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">วิเคราะห์ AI</CardTitle>
                        <Microscope className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalDropletAnalyses}</div>
                        <p className="text-xs text-slate-500">
                            ผ่าน {passedDropletAnalyses}/{totalDropletAnalyses} รายการ
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">สถานที่ปฏิบัติงาน</CardTitle>
                        <MapPin className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{uniqueLocations.length}</div>
                        <p className="text-xs text-slate-500">สถานที่ไม่ซ้ำกัน</p>
                    </CardContent>
                </Card>
            </div>

            {/* Map & Location Report side by side */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Map Section - 2/3 width */}
                <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                            <MapPin className="h-5 w-5 text-violet-500" />
                            แผนที่การปฏิบัติงาน
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DashboardMap points={(mapPoints as any[]).map((p: any) => ({
                            id: p.id,
                            lat: p.lat!,
                            lng: p.lng!,
                            chemical: p.chemical,
                            location: p.location,
                            V_total: p.V_total,
                            createdAt: p.createdAt.toISOString(),
                        }))} />
                    </CardContent>
                </Card>

                {/* Location Report - 1/3 width */}
                <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                            📊 สรุปสถานที่ปฏิบัติงาน
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LocationReport locations={locationReport} />
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <DashboardCharts dailyStats={dailyStats} chemicalStats={chemicalStats} />

            {/* Recent Activity Table */}
            <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                        <Clock className="h-5 w-5" />
                        รายการล่าสุด (5 รายการ)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentWithNames.map((calc, i) => (
                            <div key={calc.id} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {calc.chemical}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {calc.userName} • {calc.location || 'ไม่ระบุสถานที่'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-slate-800">{calc.V_total.toFixed(2)} cc</p>
                                    <p className="text-xs text-slate-400">
                                        {format(calc.createdAt, 'd MMM HH:mm', { locale: th })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {recentWithNames.length === 0 && (
                            <div className="text-center py-4 text-slate-500">
                                ไม่มีข้อมูลการคำนวณ
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
