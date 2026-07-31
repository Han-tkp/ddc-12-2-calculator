import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, FlaskConical, MapPin, CalendarRange, Clock, Users } from 'lucide-react';
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { DashboardTabs } from '@/components/admin/dashboard-tabs';
import { SearchInput } from '@/components/admin/search-input';
import { Pagination } from '@/components/ui/pagination';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/calculations';

const PAGE_SIZE = 100;

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; q?: string; page?: string; tab?: string }>;
}) {
    // 1. Await searchParams
    const { from, to, q, page, tab } = await searchParams;
    const activeTab = tab || 'operational';

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
    const calcCountPromise = supabaseAdmin.from('calculations')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte);

    const userCountPromise = supabaseAdmin.from('users')
        .select('*', { count: 'exact', head: true });

    // 2.2 Aggregations (fetch data then aggregate)
    const calcDataPromise = supabaseAdmin.from('calculations')
        .select('chemical, location, createdAt, V_total')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte);

    // 2.3 Recent Activity (with Join)
    const recentCalcPromise = supabaseAdmin.from('calculations')
        .select('*, user:users(name, email)')
        .order('createdAt', { ascending: false })
        .limit(5);

    // 2.5 Map Points
    const mapPointsPromise = supabaseAdmin.from('calculations')
        .select('id, lat, lng, chemical, location, V_total, createdAt')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(200);

    // 2.6 History table (paginated, searchable)
    const currentPage = parseInt(page || '1', 10);
    const historyFrom = (currentPage - 1) * PAGE_SIZE;
    const historyTo = historyFrom + PAGE_SIZE - 1;

    let historyQuery = supabaseAdmin
        .from('calculations')
        .select('*, user:users(name, email)', { count: 'exact' })
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .order('createdAt', { ascending: false });

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        historyQuery = historyQuery.or(`chemical.ilike.${keyword},location.ilike.${keyword},agency.ilike.${keyword}`);
    }

    const historyPromise = historyQuery.range(historyFrom, historyTo);

    const [
        { count: totalCalculations },
        { count: totalUsers },
        { data: allCalcData },
        { data: recentCalculations },
        { data: mapPoints },
        { data: historyRows, count: historyCount },
    ] = await Promise.all([
        calcCountPromise,
        userCountPromise,
        calcDataPromise,
        recentCalcPromise,
        mapPointsPromise,
        historyPromise
    ]);

    const historyRowsSafe = (historyRows || []) as any[];
    const historyTotal = historyCount || 0;
    const historyTotalPages = Math.ceil(historyTotal / PAGE_SIZE);

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

    const todayCount = daysMap.get(format(new Date(), 'yyyy-MM-dd')) || 0;

    // Chemical Stats for Pie Chart (Frequency)
    const chemicalStats = popularChemicals.map(item => ({
        name: item.chemical || 'อื่นๆ',
        value: item._count.chemical
    }));

    // Chemical Volume Stats
    const chemicalVolume = new Map<string, number>();
    calculationsInRange.forEach((c: any) => {
        const chem = c.chemical || 'อื่นๆ';
        const vol = c.V_total || 0;
        chemicalVolume.set(chem, (chemicalVolume.get(chem) || 0) + vol);
    });

    const volumeStats = Array.from(chemicalVolume.entries())
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value);

    // Decrypt names for recent activity
    const { decrypt } = await import('@/lib/encryption');

    const recentWithNames = (recentCalculations || []).map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name) : 'Guest'
    }));

    const historyWithNames = historyRowsSafe.map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name || 'ไม่ระบุชื่อ') : (calc.agency || 'ผู้ใช้งานภาคสนาม'),
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

            <DashboardTabs defaultValue={activeTab}>
                {/* 1. Operational Dashboard - การปฏิบัติงาน (Real-time tracking) */}
                <TabsContent value="operational" className="space-y-4 m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">คำนวณใหม่วันนี้</CardTitle>
                                <Calculator className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800">
                                    {todayCount}
                                </div>
                                <p className="text-xs text-slate-500">
                                    จากยอด {totalCalculations} รายการในช่วงเวลานี้
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">ใช้งานระบบล่าสุดโดย</CardTitle>
                                <Users className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-slate-800 truncate">
                                    {recentWithNames[0]?.userName || '-'}
                                </div>
                                <p className="text-xs text-slate-500">
                                    พื้นที่: {recentWithNames[0]?.location || 'ไม่ระบุ'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">สูตรที่ใช้งานล่าสุด</CardTitle>
                                <FlaskConical className="h-4 w-4 text-violet-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-slate-800 truncate">
                                    {recentWithNames[0]?.chemical || '-'}
                                </div>
                                <p className="text-xs text-slate-500">
                                    อัตราส่วน {recentWithNames[0]?.C || 0}:{recentWithNames[0]?.S || 0}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Map Section - 2/3 width */}
                        <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5 lg:col-span-2 min-w-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                                    <MapPin className="h-5 w-5 text-violet-500" />
                                    แผนที่การปฏิบัติงานล่าสุด
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

                        {/* Recent Table - 1/3 width */}
                        <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5 min-w-0">
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
                                                <div className="h-10 w-10 min-w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                    {i + 1}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-slate-800 truncate">
                                                        {calc.chemical}
                                                    </p>
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {calc.userName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <p className="font-medium text-emerald-600">{calc.V_total.toFixed(2)} cc</p>
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
                </TabsContent>

                {/* 2. Analytics Dashboard - วิเคราะห์เชิงลึก (Trends and reasons) */}
                <TabsContent value="analytics" className="space-y-4 m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    <DashboardCharts dailyStats={dailyStats} chemicalStats={chemicalStats} volumeStats={volumeStats} />

                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">พฤติกรรมยอดนิยม (Top Formula)</CardTitle>
                                <FlaskConical className="h-4 w-4 text-violet-500" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-3xl font-bold text-slate-800 truncate mb-1">
                                    {popularChemicals[0]?.chemical || '-'}
                                </div>
                                <p className="text-sm text-slate-500">
                                    ครองสัดส่วนอันดับ 1 โดยถูกใช้งานไปถึง {popularChemicals[0]?._count.chemical || 0} ครั้งในช่วงนี้
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card shadow-sm border-0 ring-1 ring-black/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
                                    📊 สรุปลำดับสถานที่ปฏิบัติงาน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <LocationReport locations={locationReport} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 3. Strategic Dashboard - กลยุทธ์และเป้าหมาย (Growth and goals) */}
                <TabsContent value="strategic" className="space-y-4 m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm bg-linear-to-br from-white to-blue-50/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">อัตราการมีส่วนร่วม (System Adoption)</CardTitle>
                                <Users className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-700">{totalUsers} บัญชี</div>
                                <p className="text-sm text-slate-500 mt-1">ผู้ปฏิบัติงานทั้งหมดในระบบที่ลงทะเบียน</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm bg-linear-to-br from-white to-pink-50/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">พื้นที่ปฏิบัติการ (Total Coverage)</CardTitle>
                                <MapPin className="h-4 w-4 text-pink-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-pink-700">{uniqueLocations.length} แห่ง</div>
                                <p className="text-sm text-slate-500 mt-1">จำนวนสถานที่ปฏิบัติงานที่ไม่ซ้ำกันในรอบนี้</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 4. Full History - ประวัติทั้งหมด */}
                <TabsContent value="history" className="space-y-4 m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <p className="text-xs sm:text-sm text-slate-500">
                            ประวัติการคำนวณทั้งหมดในรอบนี้ ({historyTotal} รายการ)
                        </p>
                        <div className="w-full sm:w-80">
                            <SearchInput placeholder="ค้นหา สารเคมี / สถานที่ / หน่วยงาน..." />
                        </div>
                    </div>

                    <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto w-full">
                            <table className="w-full text-left text-sm min-w-225">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 font-semibold">เวลา</th>
                                        <th className="p-3 font-semibold">ผู้บันทึก</th>
                                        <th className="p-3 font-semibold">สถานที่</th>
                                        <th className="p-3 font-semibold">สารเคมี / สัดส่วน</th>
                                        <th className="p-3 font-semibold text-right">ยอดรวม (มล.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyWithNames.map((calc: any) => (
                                        <tr key={calc.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-xs text-slate-600">
                                                {format(new Date(calc.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                            </td>
                                            <td className="p-3 text-xs font-semibold text-slate-700">
                                                {calc.userName}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600">{calc.location || 'ไม่ระบุสถานที่'}</td>
                                            <td className="p-3">
                                                <div className="text-xs font-semibold text-slate-800">{calc.chemical || 'สูตรกำหนดเอง'}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    สัดส่วน {calc.C}:{calc.S} {calc.mix_type === 2 ? '(แบบผสมกับ)' : '(แบบผสมให้ได้)'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-xs font-bold text-emerald-600">
                                                {formatNumber(calc.V_total)} มล.
                                            </td>
                                        </tr>
                                    ))}
                                    {historyWithNames.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-sm text-slate-500">
                                                ไม่พบข้อมูลการคำนวณ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={historyTotalPages} totalItems={historyTotal} />
                    </div>
                </TabsContent>
            </DashboardTabs>
        </div>
    );
}
