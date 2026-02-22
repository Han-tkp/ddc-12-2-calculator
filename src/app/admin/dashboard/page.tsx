import { supabase } from '@/lib/supabase';
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
    searchParams: Promise<{ from?: string; to?: string }>;
}) {
    // 1. Await searchParams
    const { from, to } = await searchParams;

    // 2. Date Logic
    const startDate = from ? startOfDay(parseISO(from)) : subDays(startOfDay(new Date()), 30);
    const endDate = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

    // 2. Fetch Data
    // Note: Supabase doesn't support Promise.all for some chained builders easily, but we can await them.
    // Actually we can run them in parallel.

    const dateFilterStr = {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
    };

    // 2.1 Counts
    const calcCountPromise = supabase.from('calculations')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte);

    const userCountPromise = supabase.from('users')
        .select('*', { count: 'exact', head: true });

    // 2.2 Aggregations (fetch data then aggregate)
    const calcDataPromise = supabase.from('calculations')
        .select('chemical, location, createdAt')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte);

    // 2.3 Recent Activity (with Join)
    const recentCalcPromise = supabase.from('calculations')
        .select('*, user:users(name, email)')
        .order('createdAt', { ascending: false })
        .limit(5);

    // 2.4 Droplet Analysis
    const dropletTotalPromise = supabase.from('droplet_analyses')
        .select('*', { count: 'exact', head: true });

    const dropletPassedPromise = supabase.from('droplet_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('passStandard', true);

    // 2.5 Map Points
    const mapPointsPromise = supabase.from('calculations')
        .select('id, lat, lng, chemical, location, V_total, createdAt')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(200);

    const [
        { count: totalCalculations },
        { count: totalUsers },
        { data: allCalcData },
        { data: recentCalculations },
        { count: totalDropletAnalyses },
        { count: passedDropletAnalyses },
        { data: mapPoints },
    ] = await Promise.all([
        calcCountPromise,
        userCountPromise,
        calcDataPromise,
        recentCalcPromise,
        dropletTotalPromise,
        dropletPassedPromise,
        mapPointsPromise
    ]);

    // 3. Process Data for Charts & Stats
    const calculationsInRange = allCalcData || [];

    // Popular Chemicals
    const chemicalCounts = new Map<string, number>();
    calculationsInRange.forEach((c: any) => {
        const chem = c.chemical || 'อื่นๆ';
        chemicalCounts.set(chem, (chemicalCounts.get(chem) || 0) + 1);
    });

    const popularChemicals = Array.from(chemicalCounts.entries())
        .map(([chemical, count]) => ({ chemical, _count: { chemical: count } }))
        .sort((a, b) => b._count.chemical - a._count.chemical)
        .slice(0, 5);

    // Location Report
    const locationCounts = new Map<string, { count: number, chemical: string, lastUsed: Date }>();
    calculationsInRange.forEach((c: any) => {
        if (!c.location) return;
        const current = locationCounts.get(c.location) || { count: 0, chemical: '', lastUsed: new Date(0) };
        const cDate = new Date(c.createdAt);

        locationCounts.set(c.location, {
            count: current.count + 1,
            chemical: cDate > current.lastUsed ? c.chemical : current.chemical,
            lastUsed: cDate > current.lastUsed ? cDate : current.lastUsed
        });
    });

    const locationReportData = Array.from(locationCounts.entries())
        .map(([location, data]) => ({
            location,
            _count: { location: data.count },
            _max: { chemical: data.chemical, createdAt: data.lastUsed }
        }))
        .sort((a, b) => b._count.location - a._count.location)
        .slice(0, 20);

    // Daily Stats
    const daysMap = new Map<string, number>();
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    daysInterval.forEach(day => {
        daysMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    calculationsInRange.forEach((calc: any) => {
        const dateKey = format(new Date(calc.createdAt), 'yyyy-MM-dd');
        if (daysMap.has(dateKey)) {
            daysMap.set(dateKey, (daysMap.get(dateKey) || 0) + 1);
        }
    });

    const dailyStats = Array.from(daysMap.entries()).map(([date, count]) => ({
        date: format(parseISO(date), 'd MMM', { locale: th }),
        count
    }));

    // Chemical Stats for Pie Chart
    const chemicalStats = popularChemicals.map(item => ({
        name: item.chemical || 'อื่นๆ',
        value: item._count.chemical
    }));

    // Decrypt names for recent activity
    const { decrypt } = await import('@/lib/encryption');

    const recentWithNames = (recentCalculations || []).map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name) : 'Guest'
    }));

    const uniqueLocations = Array.from(locationCounts.keys());
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
                            createdAt: new Date(p.createdAt).toISOString(),
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
                        {recentWithNames.map((calc: any, i: number) => (
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
                                        {format(new Date(calc.createdAt), 'd MMM HH:mm', { locale: th })}
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
