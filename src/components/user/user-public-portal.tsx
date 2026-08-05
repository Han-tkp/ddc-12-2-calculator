'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { PublicFormulaManager } from '@/components/calculator/public-formula-manager';
import { AiMcpChatbot, formulaSchemaToVariables } from '@/components/ai/ai-mcp-chatbot';
import type { FormulaSchema } from '@/components/ai/ai-mcp-chatbot';
import type { FormulaVariable } from '@/lib/formula-engine';
import { FreeFormulaCalculator } from '@/components/calculator/free-formula-calculator';
import { formatRAUnit } from '@/lib/calculations';
import {
    LayoutDashboard,
    Layers,
    Bot,
    MapPin,
    Calculator,
    FlaskConical,
    Droplets,
    Activity,
    BarChart3,
    Search,
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';

const CATALOG_PAGE_SIZE = 10;

interface UserPublicPortalProps {
    initialCalcData: any[];
    initialProfiles: any[];
}

export function UserPublicPortal({ initialCalcData, initialProfiles }: UserPublicPortalProps) {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam || 'overview');

    // Calculator state — receives formulas from chatbot
    const [calcVars, setCalcVars] = useState<FormulaVariable[] | null>(null);
    const [calcKey, setCalcKey] = useState(0);

    const handleSendToCalculator = (formula: FormulaSchema) => {
        setCalcVars(formulaSchemaToVariables(formula));
        setCalcKey((k) => k + 1);
        setActiveTab('playground');
    };

    const handleSendFileToCalculator = (vars: FormulaVariable[]) => {
        setCalcVars(vars);
        setCalcKey((k) => k + 1);
        setActiveTab('playground');
    };

    // Formula List State
    const [profiles, setProfiles] = useState<any[]>(initialProfiles);

    const refreshProfiles = async () => {
        const response = await fetch('/api/profiles');
        if (response.ok) setProfiles(await response.json().catch(() => ({})));
    };

    useEffect(() => {
        void refreshProfiles();
    }, []);

    // Read-only catalog browsing: client-side filter + paging. The shared <Pagination>
    // component drives server searchParams, which doesn't apply here — this list is
    // already fully in memory from /api/profiles.
    const [catalogQuery, setCatalogQuery] = useState('');
    const [catalogPage, setCatalogPage] = useState(1);

    const filteredProfiles = profiles.filter((p: any) => {
        const q = catalogQuery.trim().toLowerCase();
        if (!q) return true;
        return `${p.name ?? ''} ${p.description ?? ''}`.toLowerCase().includes(q);
    });
    const catalogTotalPages = Math.max(1, Math.ceil(filteredProfiles.length / CATALOG_PAGE_SIZE));
    const pagedProfiles = filteredProfiles.slice(
        (catalogPage - 1) * CATALOG_PAGE_SIZE,
        catalogPage * CATALOG_PAGE_SIZE
    );

    // Format Map items
    const mapItems = initialCalcData
        .filter((c: any) => c.lat != null && c.lng != null)
        .map((c: any) => ({
            id: String(c.id || Math.random()),
            lat: Number(c.lat),
            lng: Number(c.lng),
            chemical: c.chemical || 'สารเคมี',
            location: c.location || 'สถานที่ปฏิบัติงาน',
            V_total: Number(c.V_total || 0),
            createdAt: c.createdAt
        }));

    // Format Chemical & Volume Stats
    const chemCountMap: Record<string, number> = {};
    const chemVolMap: Record<string, number> = {};
    const locMap: Record<string, { count: number; chemical: string | null; lastUsed: string }> = {};

    initialCalcData.forEach((c: any) => {
        const name = c.chemical || 'ไม่ระบุชื่อสาร';
        chemCountMap[name] = (chemCountMap[name] || 0) + 1;
        chemVolMap[name] = (chemVolMap[name] || 0) + (Number(c.V_total) || 0) / 1000;

        const loc = c.location || 'ไม่ระบุสถานที่';
        if (!locMap[loc]) {
            locMap[loc] = { count: 0, chemical: name, lastUsed: c.createdAt };
        }
        locMap[loc].count += 1;
    });

    const chemicalStats = Object.entries(chemCountMap).map(([name, value]) => ({ name, value }));
    const volumeStats = Object.entries(chemVolMap).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
    const locationStats = Object.entries(locMap).map(([name, data]) => ({
        name,
        count: data.count,
        chemical: data.chemical,
        lastUsed: data.lastUsed,
    }));
    // Group by actual calendar day. This used to be a single hardcoded bucket labelled
    // "วันนี้" holding the whole range's total — one bar claiming to be today while
    // reporting 30 days of work. /admin/dashboard already grouped properly; this brings
    // the public portal in line so both read from the same shape of truth.
    const dayCounts = new Map<string, number>();
    initialCalcData.forEach((c: any) => {
        if (!c.createdAt) return;
        const d = new Date(c.createdAt);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    });
    const dailyStats = [...dayCounts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
            const [, month, day] = key.split('-');
            return { date: `${Number(day)}/${Number(month)}`, count };
        });

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="overflow-x-auto -mx-4 px-4 w-full">
                    <TabsList className="bg-slate-200/70 p-1 rounded-2xl gap-1 w-max min-w-full flex-nowrap justify-start">
                        <TabsTrigger value="overview" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-brand shadow-xs">
                            <LayoutDashboard className="h-4 w-4" />
                            1. ภาพรวมปฏิบัติงาน
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-brand shadow-xs">
                            <BarChart3 className="h-4 w-4" />
                            2. วิเคราะห์
                        </TabsTrigger>
                        <TabsTrigger value="catalog" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-brand shadow-xs">
                            <Layers className="h-4 w-4" />
                            3. คลังสูตร
                        </TabsTrigger>
                        <TabsTrigger value="ai-assistant" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-brand shadow-xs">
                            <Bot className="h-4 w-4" />
                            4. เพิ่มสารเคมีด้วย AI (Beta)
                        </TabsTrigger>
                        <TabsTrigger value="playground" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-brand shadow-xs">
                            <FlaskConical className="h-4 w-4" />
                            5. เพิ่มสูตรสารเคมี
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex items-center gap-2">
                    <PublicFormulaManager onFormulaAdded={async () => {
                        await refreshProfiles();
                    }} />
                </div>
            </div>

            {/* TAB 1: ภาพรวม ปฏิบัติงาน & วิเคราะห์เชิงลึก */}
            <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-brand-soft bg-linear-to-br from-brand-soft/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-brand uppercase tracking-wider">
                                รายการปฏิบัติงานรวม
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Activity className="h-6 w-6 text-brand" />
                                {initialCalcData.length} รายการ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">บันทึกประวัติจากเจ้าหน้าที่และผู้ใช้ภายนอกทั้งหมด</p>
                        </CardContent>
                    </Card>

                    <Card className="border-brand-soft bg-linear-to-br from-brand-soft/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-brand uppercase tracking-wider">
                                ปริมาณสารเคมีผสมรวม
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Droplets className="h-6 w-6 text-brand" />
                                {(initialCalcData.reduce((acc, c) => acc + (Number(c.V_total) || 0), 0) / 1000).toFixed(2)} ลิตร
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">ปริมาณน้ำยาพ่นที่เตรียมเพื่อใช้งานในพื้นที่จริง</p>
                        </CardContent>
                    </Card>

                    <Card className="border-brand-soft bg-linear-to-br from-brand-soft/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-brand uppercase tracking-wider">
                                สูตรสารเคมีเปิดใช้งาน
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <FlaskConical className="h-6 w-6 text-brand" />
                                {profiles.length} สูตร
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">สูตรเคมีมาตรฐานและสูตรที่เพิ่มโดยผู้ใช้งาน</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Interactive GIS Map */}
                <Card className="border-brand-line shadow-xs overflow-hidden">
                    <CardHeader className="bg-brand-cloud border-b border-brand-line">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-brand-ink">
                            <MapPin className="h-5 w-5 text-brand" /> แผนที่พิกัดการปฏิบัติงานพ่นสารเคมี (GIS Operation Map)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            แสดงหมุดพิกัดสถานที่ปฏิบัติงานที่มีการบันทึกประวัติย้อนหลัง
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <DashboardMap points={mapItems} />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 2: วิเคราะห์เชิงลึก — split out of the overview tab so charts get the
                full width instead of competing with the stat cards and GIS map. */}
            <TabsContent value="analytics" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="min-w-0">
                        <DashboardCharts dailyStats={dailyStats} chemicalStats={chemicalStats} volumeStats={volumeStats} />
                    </div>
                    <div className="min-w-0">
                        <LocationReport locations={locationStats} />
                    </div>
                </div>
            </TabsContent>

            {/* TAB 3: คลังสูตร — read-only. Creating/editing lives in the "เพิ่มสูตรสารเคมี"
                tab and PublicFormulaManager; this view is purely for browsing what exists. */}
            <TabsContent value="catalog" className="space-y-6 mt-0">
                <Card className="border-brand-line shadow-xs">
                    <CardHeader className="bg-brand-cloud border-b border-brand-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-brand-ink">
                                <Layers className="h-5 w-5 text-brand" /> คลังสูตรสารเคมี
                            </CardTitle>
                            <CardDescription className="text-xs">
                                รายการสูตรสารเคมีทั้งหมดในระบบ (ดูอย่างเดียว) — หากต้องการเพิ่มสูตร ไปที่แท็บ &ldquo;เพิ่มสูตรสารเคมี&rdquo;
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                            <Input
                                value={catalogQuery}
                                onChange={(e) => { setCatalogQuery(e.target.value); setCatalogPage(1); }}
                                placeholder="ค้นหาชื่อสูตร / คำอธิบาย..."
                                className="h-9 pl-9 text-sm bg-white border-brand-line"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 space-y-4">
                        <div className="overflow-x-auto rounded-xl border border-brand-line">
                            <table className="w-full text-left text-xs sm:text-sm min-w-200">
                                <thead className="bg-brand-cloud text-brand-muted font-semibold border-b border-brand-line">
                                    <tr>
                                        <th className="p-3">ชื่อสูตรสารเคมี</th>
                                        <th className="p-3">ประเภทการผสม</th>
                                        <th className="p-3 text-center">สัดส่วน</th>
                                        <th className="p-3 text-center">อัตราพ่น</th>
                                        <th className="p-3 text-center">ถังมาตรฐาน</th>
                                        <th className="p-3">คำอธิบาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-line">
                                    {pagedProfiles.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-brand-soft/40">
                                            <td className="p-3 font-bold text-brand-ink max-w-56">
                                                <div className="flex items-center gap-2">
                                                    <FlaskConical className="h-4 w-4 text-brand shrink-0" />
                                                    <span className="truncate" title={p.name}>{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-brand-soft text-brand-dark">
                                                    {p.mix_type === 2 ? 'แบบผสมกับ' : 'แบบผสมให้ได้'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold text-brand-ink tabular-nums whitespace-nowrap">
                                                {p.C} : {p.S}
                                            </td>
                                            <td className="p-3 text-center font-semibold text-brand-ink tabular-nums whitespace-nowrap">
                                                {p.RA} {formatRAUnit(p.RA_unit)} / {p.A0 || 1000} ตร.ม.
                                            </td>
                                            <td className="p-3 text-center font-semibold text-brand-dark tabular-nums whitespace-nowrap">
                                                {p.tankCapacity || 10} ลิตร
                                            </td>
                                            <td className="p-3 text-brand-muted max-w-64">
                                                <span className="block truncate" title={p.description || undefined}>
                                                    {p.description || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {pagedProfiles.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-brand-muted">
                                                ไม่พบสูตรที่ตรงกับคำค้นหา
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {catalogTotalPages > 1 && (
                            <div className="flex items-center justify-between gap-3 text-xs text-brand-muted">
                                <span>
                                    แสดง {(catalogPage - 1) * CATALOG_PAGE_SIZE + 1}–
                                    {Math.min(catalogPage * CATALOG_PAGE_SIZE, filteredProfiles.length)} จาก {filteredProfiles.length} สูตร
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCatalogPage((n) => Math.max(1, n - 1))}
                                        disabled={catalogPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span className="tabular-nums">{catalogPage} / {catalogTotalPages}</span>
                                    <button
                                        type="button"
                                        onClick={() => setCatalogPage((n) => Math.min(catalogTotalPages, n + 1))}
                                        disabled={catalogPage === catalogTotalPages}
                                        className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 3: เพิ่มสารเคมีด้วย AI (MCP Chatbot) */}
            <TabsContent value="ai-assistant" className="space-y-6 mt-0">
                <AiMcpChatbot onFormulaSaved={async () => {
                    await refreshProfiles();
                }} onSendToCalculator={handleSendToCalculator} onSendFileToCalculator={handleSendFileToCalculator} />
            </TabsContent>

            {/* TAB 4: Playground ทดสอบสูตรอิสระ */}
            <TabsContent value="playground" className="space-y-6 mt-0">
                <div className="flex items-center gap-2 p-4 bg-linear-to-r from-brand-soft to-brand-soft rounded-xl border border-brand/20">
                    <Calculator className="h-5 w-5 text-brand" />
                    <div>
                        <h3 className="text-sm font-bold text-brand-ink">เครื่องคำนวณสูตร Excel</h3>
                        <p className="text-xs text-brand-dark">กำหนดตัวแปร เขียนสูตรเอง คำนวณได้ทุกอย่าง เหมือนใช้ Excel</p>
                    </div>
                </div>
                <FreeFormulaCalculator key={calcKey} initialVariables={calcVars ?? undefined} />
            </TabsContent>

        </Tabs>
    );
}
