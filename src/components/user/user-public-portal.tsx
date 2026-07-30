'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DashboardMap } from '@/components/admin/dashboard-map';
import { LocationReport } from '@/components/admin/location-report';
import { PublicFormulaManager } from '@/components/calculator/public-formula-manager';
import { AiMcpChatbot } from '@/components/ai/ai-mcp-chatbot';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    LayoutDashboard,
    Layers,
    Bot,
    Sparkles,
    MapPin,
    Calculator,
    CheckCircle2,
    FlaskConical,
    Droplets,
    AlertTriangle,
    Clock,
    ShieldAlert,
    Beaker,
    Plus,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';

import { useSearchParams } from 'next/navigation';

interface UserPublicPortalProps {
    initialCalcData: any[];
    initialProfiles: any[];
}

export function UserPublicPortal({ initialCalcData, initialProfiles }: UserPublicPortalProps) {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam || 'overview');

    // Formula List State
    const [profiles, setProfiles] = useState<any[]>(initialProfiles);

    // AI Assistant State
    const [aiQuery, setAiQuery] = useState('');
    const [aiName, setAiName] = useState('');
    const [aiDesc, setAiDesc] = useState('');
    const [aiC, setAiC] = useState(1);
    const [aiS, setAiS] = useState(79);
    const [aiRA, setAiRA] = useState(1);
    const [aiRAUnit, setAiRAUnit] = useState<'L' | 'cc'>('L');
    const [aiMixType, setAiMixType] = useState(2);
    const [aiTankCap, setAiTankCap] = useState(10);
    const [aiLocation, setAiLocation] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [showAiConfirm, setShowAiConfirm] = useState(false);
    const [isSavingAi, setIsSavingAi] = useState(false);

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
    const dailyStats = [
        { date: 'วันนี้', count: initialCalcData.length }
    ];

    // Generate AI formula recommendation
    const handleGenerateAiFormula = () => {
        if (!aiQuery.trim()) {
            toast.error('กรุณาระบุชื่อสารเคมีหรือศัตรูพืชที่ต้องการกำจัด');
            return;
        }
        setIsAiGenerating(true);
        setTimeout(() => {
            const queryLower = aiQuery.toLowerCase();
            if (queryLower.includes('ulv') || queryLower.includes('ยูแอลวี')) {
                setAiName(aiQuery.includes('เดลตา') ? 'Deltacide ULV (สูตรแนะนำโดย AI)' : `${aiQuery} (ULV AI)`);
                setAiC(1);
                setAiS(4);
                setAiRA(75);
                setAiRAUnit('cc');
                setAiMixType(1);
                setAiTankCap(10);
                setAiDesc('สูตรคำนวณ ULV แนะนำโดยผู้ช่วย AI (75 มล./1,000 ตร.ม.)');
            } else {
                setAiName(aiQuery.includes('ซับมาริน') ? 'Submarine (สูตรแนะนำโดย AI)' : `${aiQuery} (หมอกควัน AI)`);
                setAiC(1);
                setAiS(79);
                setAiRA(1);
                setAiRAUnit('L');
                setAiMixType(2);
                setAiTankCap(10);
                setAiDesc('สูตรคำนวณหมอกควัน แนะนำโดยผู้ช่วย AI (1 ลิตร/1,000 ตร.ม.)');
            }
            setIsAiGenerating(false);
            toast.success('AI ช่วยสร้างสูตรและคำนวณพารามิเตอร์เรียบร้อยแล้ว');
        }, 600);
    };

    // Confirm AI formula save
    const handleConfirmSaveAiFormula = async () => {
        if (!aiName.trim()) {
            toast.error('กรุณาสร้างสูตรก่อนกดยืนยันบันทึก');
            return;
        }
        setIsSavingAi(true);
        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: aiName.trim(),
                    description: aiDesc.trim() || 'สูตรที่สร้างโดย AI Assistant',
                    C: Number(aiC),
                    S: Number(aiS),
                    RA: Number(aiRA),
                    RA_unit: aiRAUnit,
                    mix_type: Number(aiMixType),
                    A0: 1000,
                    tankCapacity: Number(aiTankCap),
                    isActive: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกสูตรได้');

            // Record tracking calculation entry
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    C: Number(aiC),
                    S: Number(aiS),
                    RA: Number(aiRA),
                    RA_unit: aiRAUnit,
                    mix_type: Number(aiMixType),
                    A0: 1000,
                    A_house: 100,
                    N: 10,
                    chemical: aiName.trim(),
                    location: aiLocation.trim() || 'สร้างผ่าน AI Assistant ผู้ใช้ภายนอก',
                    agency: 'ผู้ใช้งานทั่วไป / AI Assistant',
                }),
            });

            toast.success(`บันทึกสูตรสารเคมี AI "${aiName}" เข้าสู่ระบบเรียบร้อยแล้ว!`);
            setShowAiConfirm(false);

            // Refresh profiles list
            const pRes = await fetch('/api/profiles');
            if (pRes.ok) {
                const pData = await pRes.json();
                setProfiles(pData);
            }
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSavingAi(false);
        }
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <TabsList className="bg-slate-200/70 p-1 rounded-2xl gap-1">
                    <TabsTrigger value="overview" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-xs">
                        <LayoutDashboard className="h-4 w-4" />
                        1. ภาพรวมปฏิบัติงาน & วิเคราะห์
                    </TabsTrigger>
                    <TabsTrigger value="catalog" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-xs">
                        <Layers className="h-4 w-4" />
                        2. จัดการสูตร (ผู้ใช้ภายนอก)
                    </TabsTrigger>
                    <TabsTrigger value="ai-assistant" className="rounded-xl gap-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-xs">
                        <Bot className="h-4 w-4" />
                        3. เพิ่มสารเคมีด้วย AI (MCP)
                    </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                    <PublicFormulaManager onFormulaAdded={async () => {
                        const res = await fetch('/api/profiles');
                        if (res.ok) setProfiles(await res.json());
                    }} />
                </div>
            </div>

            {/* TAB 1: ภาพรวม ปฏิบัติงาน & วิเคราะห์เชิงลึก */}
            <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-indigo-100 bg-linear-to-br from-indigo-50/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                รายการปฏิบัติงานรวม
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Activity className="h-6 w-6 text-indigo-600" />
                                {initialCalcData.length} รายการ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">บันทึกประวัติจากเจ้าหน้าที่และผู้ใช้ภายนอกทั้งหมด</p>
                        </CardContent>
                    </Card>

                    <Card className="border-teal-100 bg-linear-to-br from-teal-50/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                                ปริมาณสารเคมีผสมรวม
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Droplets className="h-6 w-6 text-teal-600" />
                                {(initialCalcData.reduce((acc, c) => acc + (Number(c.V_total) || 0), 0) / 1000).toFixed(2)} ลิตร
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">ปริมาณน้ำยาพ่นที่เตรียมเพื่อใช้งานในพื้นที่จริง</p>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-100 bg-linear-to-br from-purple-50/60 to-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                                สูตรสารเคมีเปิดใช้งาน
                            </CardDescription>
                            <CardTitle className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                <FlaskConical className="h-6 w-6 text-purple-600" />
                                {profiles.length} สูตร
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500">สูตรเคมีมาตรฐานและสูตรที่เพิ่มโดยผู้ใช้งาน</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Interactive GIS Map */}
                <Card className="border-slate-200 shadow-xs overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                            <MapPin className="h-5 w-5 text-red-500" /> แผนที่พิกัดการปฏิบัติงานพ่นสารเคมี (GIS Operation Map)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            แสดงหมุดพิกัดสถานที่ปฏิบัติงานที่มีการบันทึกประวัติย้อนหลัง
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <DashboardMap points={mapItems} />
                    </CardContent>
                </Card>

                {/* Analytics Charts & Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DashboardCharts dailyStats={dailyStats} chemicalStats={chemicalStats} volumeStats={volumeStats} />
                    <LocationReport locations={locationStats} />
                </div>
            </TabsContent>

            {/* TAB 2: จัดการสูตร (แบบผู้ใช้งานภายนอก) */}
            <TabsContent value="catalog" className="space-y-6 mt-0">
                <Card className="border-slate-200 shadow-xs">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                                <Layers className="h-5 w-5 text-indigo-600" /> แคตตาล็อกสูตรสารเคมี (Public Chemical Formula Catalog)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                รายการสูตรสารเคมีทั้งหมดในระบบ ผู้ใช้ภายนอกสามารถเพิ่มสูตรใหม่พร้อมการยืนยันและการ Tracking ได้
                            </CardDescription>
                        </div>
                        <PublicFormulaManager onFormulaAdded={async () => {
                            const res = await fetch('/api/profiles');
                            if (res.ok) setProfiles(await res.json());
                        }} />
                    </CardHeader>

                    <CardContent className="p-6">
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">ชื่อสูตรสารเคมี</th>
                                        <th className="p-3">ประเภทการผสม</th>
                                        <th className="p-3 text-center">สัดส่วน (C:S)</th>
                                        <th className="p-3 text-center">อัตราพ่น (RA)</th>
                                        <th className="p-3 text-center">ถังมาตรฐาน</th>
                                        <th className="p-3">คำอธิบาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {profiles.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                                <FlaskConical className="h-4 w-4 text-indigo-600 shrink-0" />
                                                {p.name}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.mix_type === 2 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                                    {p.mix_type === 2 ? 'แบบผสมกับ - เติมสารทบน้ำมัน' : 'แบบผสมให้ได้ - รวมปริมาตรคงที่'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold text-slate-700">
                                                {p.C} : {p.S}
                                            </td>
                                            <td className="p-3 text-center font-semibold text-slate-700">
                                                {p.RA} {p.RA_unit} / {p.A0 || 1000} ตร.ม.
                                            </td>
                                            <td className="p-3 text-center font-semibold text-purple-700">
                                                {p.tankCapacity || 10} ลิตร
                                            </td>
                                            <td className="p-3 text-slate-500 max-w-xs truncate">
                                                {p.description || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 3: เพิ่มสารเคมีด้วย AI (MCP Chatbot) */}
            <TabsContent value="ai-assistant" className="space-y-6 mt-0">
                <AiMcpChatbot onFormulaSaved={async () => {
                    const res = await fetch('/api/profiles');
                    if (res.ok) setProfiles(await res.json());
                }} />
            </TabsContent>
        </Tabs>
    );
}
