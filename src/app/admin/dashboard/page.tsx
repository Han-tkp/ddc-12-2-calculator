import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, FlaskConical, MapPin, CalendarRange, Clock, Users, FileText, Droplets } from 'lucide-react';
import { TabsContent } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DateRangeFilter } from '@/components/admin/date-range-filter';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { DashboardTabs } from '@/components/admin/dashboard-tabs';
import { TrendDelta } from '@/components/admin/trend-delta';
import { DimensionFilter } from '@/components/admin/dimension-filter';
import { DashboardExportButton } from '@/components/admin/dashboard-export-button';
import { SearchInput } from '@/components/admin/search-input';
import { Pagination } from '@/components/ui/pagination';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/calculations';

const PAGE_SIZE = 100;

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; q?: string; page?: string; tab?: string; chemical?: string; location?: string }>;
}) {
    // 1. Await searchParams
    const { from, to, q, page, tab, chemical, location } = await searchParams;
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

    // The immediately preceding window of the SAME length, so "vs. ช่วงก่อนหน้า" compares
    // like with like whatever range the user picked — a 7-day view is measured against the
    // 7 days before it, a 30-day view against the 30 before that.
    const rangeMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - rangeMs);

    /**
     * Applies the dimension filters to any calculations query.
     *
     * Every panel on this page goes through here. A filter that narrowed only the
     * history table while the KPI cards, charts and map kept showing everything would
     * be worse than no filter at all — the reader would take the unfiltered numbers as
     * the filtered ones.
     *
     * Typed loosely on purpose: threading Supabase's builder generics through a helper
     * blows past TypeScript's instantiation depth (TS2589). The shape is checked where
     * each query is declared.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withDimensions = (query: any): any => {
        let q2 = query;
        if (chemical) q2 = q2.eq('chemical', chemical);
        if (location) q2 = q2.eq('location', location);
        return q2;
    };

    // 2.1 Counts
    const calcCountPromise = withDimensions(supabaseAdmin.from('calculations')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte));

    const prevCalcDataPromise = withDimensions(supabaseAdmin.from('calculations')
        .select('chemical, location, V_total')
        .gte('createdAt', prevStartDate.toISOString())
        .lte('createdAt', prevEndDate.toISOString()));

    const userCountPromise = supabaseAdmin.from('users')
        .select('*', { count: 'exact', head: true });

    // Distinct values that populate the filter drop-downs. Read from the whole date
    // range but WITHOUT the dimension filters, so choosing a chemical never removes the
    // other chemicals from the list and traps the user in their own selection.
    const filterOptionsPromise = supabaseAdmin.from('calculations')
        .select('chemical, location')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte);

    // 2.2 Aggregations (fetch data then aggregate)
    const calcDataPromise = withDimensions(supabaseAdmin.from('calculations')
        .select('chemical, location, createdAt, V_total')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte));

    // 2.3 Recent Activity (with Join) — filtered too, otherwise "สูตรที่ใช้งานล่าสุด"
    // reports a chemical the user has filtered out, contradicting the rest of the page.
    const recentCalcPromise = withDimensions(supabaseAdmin.from('calculations')
        .select('*, user:users(name, email)')
        .order('createdAt', { ascending: false })
        .limit(5));

    // 2.5 Map Points
    // Capped at 2000 rather than the old 200 — the map now clusters/heatmaps
    // instead of drawing one raw marker per point, so a low cap just hid data.
    const mapPointsPromise = withDimensions(supabaseAdmin.from('calculations')
        .select('id, lat, lng, chemical, location, V_total, createdAt')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(2000));

    // 2.6 History table (paginated, searchable)
    const currentPage = parseInt(page || '1', 10);
    const historyFrom = (currentPage - 1) * PAGE_SIZE;
    const historyTo = historyFrom + PAGE_SIZE - 1;

    let historyQuery = withDimensions(supabaseAdmin
        .from('calculations')
        .select('*, user:users(name, email)', { count: 'exact' })
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .order('createdAt', { ascending: false }));

    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        historyQuery = historyQuery.or(`chemical.ilike.${keyword},location.ilike.${keyword},agency.ilike.${keyword}`);
    }

    const historyPromise = historyQuery.range(historyFrom, historyTo);

    // Export reads its own unpaginated query. Reusing the history page's rows would have
    // exported only the 100 rows currently on screen while the button advertised the
    // filtered total — a file that silently disagrees with the dashboard it came from.
    // Capped so a wide date range can't pull an unbounded result set into memory.
    const EXPORT_LIMIT = 5000;
    let exportQuery = withDimensions(supabaseAdmin
        .from('calculations')
        .select('createdAt, chemical, location, agency, C, S, RA, RA_unit, N, V_C, V_S, V_total, lat, lng')
        .gte('createdAt', dateFilterStr.gte)
        .lte('createdAt', dateFilterStr.lte)
        .order('createdAt', { ascending: false }));
    if (q && q.trim()) {
        const keyword = `%${q.trim()}%`;
        exportQuery = exportQuery.or(`chemical.ilike.${keyword},location.ilike.${keyword},agency.ilike.${keyword}`);
    }
    const exportPromise = exportQuery.limit(EXPORT_LIMIT);

    const [
        { count: totalCalculations },
        { count: totalUsers },
        { data: allCalcData },
        { data: recentCalculations },
        { data: mapPoints },
        { data: historyRows, count: historyCount },
        { data: prevCalcData },
        { data: filterOptionRows },
        { data: exportSourceRows },
    ] = await Promise.all([
        calcCountPromise,
        userCountPromise,
        calcDataPromise,
        recentCalcPromise,
        mapPointsPromise,
        historyPromise,
        prevCalcDataPromise,
        filterOptionsPromise,
        exportPromise,
    ]);

    const chemicalOptions = [...new Set(
        (filterOptionRows || []).map((r: any) => r.chemical).filter(Boolean) as string[]
    )].sort((a, b) => a.localeCompare(b, 'th'));
    const locationOptions = [...new Set(
        (filterOptionRows || []).map((r: any) => r.location).filter(Boolean) as string[]
    )].sort((a, b) => a.localeCompare(b, 'th'));

    const historyRowsSafe = (historyRows || []) as any[];
    const historyTotal = historyCount || 0;
    const historyTotalPages = Math.ceil(historyTotal / PAGE_SIZE);

    // Export payload: the history rows the current filters produced, so the file always
    // matches the dashboard it came from.
    const exportRows = ((exportSourceRows || []) as any[]).map((c: any) => ({
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString('th-TH') : '',
        chemical: c.chemical ?? '',
        location: c.location ?? '',
        agency: c.agency ?? '',
        C: c.C ?? '', S: c.S ?? '', RA: c.RA ?? '', RA_unit: c.RA_unit ?? '', N: c.N ?? '',
        V_C: c.V_C ?? '', V_S: c.V_S ?? '', V_total: c.V_total ?? '',
        lat: c.lat ?? '', lng: c.lng ?? '',
    }));


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
    const yesterdayCount = daysMap.get(format(subDays(new Date(), 1), 'yyyy-MM-dd')) || 0;

    // Period-over-period baselines for the KPI cards.
    const previousRows = (prevCalcData || []) as { V_total: number | null }[];
    const previousCount = previousRows.length;
    const previousVolumeL = previousRows.reduce((sum, r) => sum + (Number(r.V_total) || 0), 0) / 1000;
    const currentVolumeL = calculationsInRange.reduce((sum: number, c: any) => sum + (Number(c.V_total) || 0), 0) / 1000;

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

    // Decrypt names for display. decryptName() is used rather than decrypt() because the
    // latter throws on a key mismatch — inside a server component that takes down the
    // whole dashboard — and because falling back to the raw column prints ciphertext.
    const { decryptName } = await import('@/lib/encryption');

    const recentWithNames = ((recentCalculations || []) as any[]).map((calc: any) => ({
        ...calc,
        userName: calc.user ? decryptName(calc.user.name, 'ไม่ระบุชื่อ') : 'Guest',
    }));

    const historyWithNames = historyRowsSafe.map((calc: any) => ({
        ...calc,
        userName: calc.user ? decryptName(calc.user.name, 'ไม่ระบุชื่อ') : (calc.agency || 'ผู้ใช้งานภาคสนาม'),
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
                <div className="flex items-center gap-2 bg-brand-soft text-brand-dark px-3 py-1 rounded-full text-sm font-medium">
                    <CalendarRange className="h-4 w-4" />
                    {totalCalculations} รายการในช่วงเวลานี้
                </div>
            </div>

            {/* Filters — one row, all writing into searchParams so the view is shareable */}
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    <DateRangeFilter />
                </div>
                <DimensionFilter paramKey="chemical" label="สารเคมี" options={chemicalOptions} allLabel="ทุกสารเคมี" />
                <DimensionFilter paramKey="location" label="สถานที่" options={locationOptions} allLabel="ทุกสถานที่" />
                <DashboardExportButton
                    rows={exportRows}
                    fileLabel={`dashboard_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`}
                />
            </div>

            {(chemical || location) && (
                <p className="text-xs text-brand-muted -mt-3">
                    กำลังกรอง: {[chemical && `สารเคมี "${chemical}"`, location && `สถานที่ "${location}"`].filter(Boolean).join(' • ')}
                    {' — '}ทุกกราฟ การ์ดสรุป และแผนที่ในหน้านี้ถูกกรองตามนี้ทั้งหมด
                </p>
            )}

            <DashboardTabs defaultValue={activeTab}>
                {/* 1. Operational Dashboard - การปฏิบัติงาน (Real-time tracking) */}
                <TabsContent value="operational" className="space-y-4 m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">คำนวณใหม่วันนี้</CardTitle>
                                <Calculator className="h-4 w-4 text-brand" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-brand-ink tabular-nums">
                                    {todayCount}
                                </div>
                                <TrendDelta current={todayCount} previous={yesterdayCount} unit="รายการ" periodLabel="จากเมื่อวาน" />
                            </CardContent>
                        </Card>
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">รายการในช่วงที่เลือก</CardTitle>
                                <FileText className="h-4 w-4 text-brand" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-brand-ink tabular-nums">
                                    {(totalCalculations || 0).toLocaleString('th-TH')}
                                </div>
                                <TrendDelta current={totalCalculations || 0} previous={previousCount} unit="รายการ" />
                            </CardContent>
                        </Card>
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">ปริมาณสารเคมีรวม</CardTitle>
                                <Droplets className="h-4 w-4 text-brand" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-brand-ink tabular-nums">
                                    {currentVolumeL.toLocaleString('th-TH', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-brand-muted">ลิตร</span>
                                </div>
                                <TrendDelta
                                    current={currentVolumeL}
                                    previous={Number(previousVolumeL.toFixed(1))}
                                    unit="ลิตร"
                                />
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
                                <FlaskConical className="h-4 w-4 text-brand" />
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
                                    <MapPin className="h-5 w-5 text-brand" />
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
                                <FlaskConical className="h-4 w-4 text-brand" />
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
                        <Card className="glass-card ring-1 ring-black/5 shadow-sm bg-linear-to-br from-white to-brand-soft/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">พื้นที่ปฏิบัติการ (Total Coverage)</CardTitle>
                                <MapPin className="h-4 w-4 text-brand" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-brand-dark">{uniqueLocations.length} แห่ง</div>
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
