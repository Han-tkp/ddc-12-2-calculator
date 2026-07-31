'use client';

import { useState, useMemo } from 'react';
import { calculate, formatNumber } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    FlaskConical,
    Beaker,
    Droplets,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Zap,
    Shield,
    Upload,
    FileText,
    Sparkles,
    Save,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { NodeVisualCalculator } from './node-visual-calculator';

export function FormulaPlayground() {
    const [viewMode, setViewMode] = useState<'node' | 'standard'>('node');
    // Left Pane Form State
    const [name, setName] = useState('เดลตาไซด์ ULV (สูตรทดสอบภาคสนาม)');
    const [description, setDescription] = useState('สูตรทดสอบพารามิเตอร์พ่นฝอยละเอียด ULV สำหรับเครื่องพ่นสะพายหลัง');
    const [C, setC] = useState<number>(1);
    const [S, setS] = useState<number>(4);
    const [RA, setRA] = useState<number>(75);
    const [RAUnit, setRAUnit] = useState<'L' | 'cc'>('cc');
    const [mixType, setMixType] = useState<number>(1); // 1 = แบบผสมให้ได้, 2 = แบบผสมกับ
    const [A0, setA0] = useState<number>(1000);
    const [tankCapacity, setTankCapacity] = useState<number>(10);

    // Right Pane Simulator State
    const [testArea, setTestArea] = useState<number>(2500); // 2,500 ตร.ม.
    const [testHouseCount, setTestHouseCount] = useState<number>(25); // 25 หลัง
    const [testTankCapacity, setTestTankCapacity] = useState<number>(10); // ถัง 10 ลิตร

    // File Drag & Drop
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Confirmation Modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Live Calculation Engine Calculation
    const result = useMemo(() => {
        try {
            return calculate({
                C: Number(C) || 1,
                S: Number(S) || 1,
                RA: Number(RA) || 1,
                RA_unit: RAUnit,
                mix_type: Number(mixType),
                A0: Number(A0) || 1000,
                A_house: (Number(testArea) || 1000) / (Number(testHouseCount) || 10),
                N: Number(testHouseCount) || 10,
                targetVolume: 1,
                tankCapacity: Number(testTankCapacity) || 10,
            });
        } catch (e) {
            return null;
        }
    }, [C, S, RA, RAUnit, mixType, A0, testArea, testHouseCount, testTankCapacity]);

    // Batch Tank Math (Full Tanks + Partial Tank)
    const tankAnalysis = useMemo(() => {
        if (!result) return null;
        const totalLiters = result.V_total / 1000;
        const tankCap = Number(testTankCapacity) || 10;
        const fullTanks = Math.floor(totalLiters / tankCap);
        const remainderLiters = totalLiters % tankCap;

        // Recipe per 1 Full Tank
        const chemPerFullTank = result.V_C_1L * tankCap; // cc
        const solventPerFullTank = (result.V_S_1L * tankCap) / 1000; // Liters

        // Recipe per Partial Tank
        const chemPerPartialTank = result.V_C_1L * remainderLiters; // cc
        const solventPerPartialTank = (result.V_S_1L * remainderLiters) / 1000; // Liters

        return {
            totalLiters,
            fullTanks,
            remainderLiters: Number(remainderLiters.toFixed(2)),
            chemPerFullTank: Number(chemPerFullTank.toFixed(2)),
            solventPerFullTank: Number(solventPerFullTank.toFixed(2)),
            chemPerPartialTank: Number(chemPerPartialTank.toFixed(2)),
            solventPerPartialTank: Number(solventPerPartialTank.toFixed(2)),
        };
    }, [result, testTankCapacity]);

    // Edge Case Validations
    const validations = useMemo(() => {
        const checks = [];
        let isValid = true;

        // 1. Ratio Validation
        if (mixType === 1 && C >= (C + S)) {
            checks.push({ status: 'error', text: 'สัดส่วนสารออกฤทธิ์ C ต้องน้อยกว่าปริมาตรรวม (C+S) ในแบบผสมให้ได้' });
            isValid = false;
        } else {
            checks.push({ status: 'success', text: `สัดส่วนการเจือจางถูกต้อง (1 : ${S})` });
        }

        // 2. Precision Check
        if (result && result.V_C < 0.1) {
            checks.push({ status: 'warning', text: 'ปริมาณสารเคมีเพียว < 0.1 มล. ซึ่งน้อยเกินกว่าถ้วยตวงภาคสนามจะวัดได้' });
        } else {
            checks.push({ status: 'success', text: 'ค่าความเที่ยงตรงปริมาณสารเคมีเหมาะสมสำหรับการตวงภาคสนาม' });
        }

        // 3. Division by Zero Protection
        if (S <= 0 || A0 <= 0 || testArea <= 0) {
            checks.push({ status: 'error', text: 'พบค่าเป็น 0 หรือติดลบ ในตัวหาร (S, A0, หรือ พื้นที่)' });
            isValid = false;
        } else {
            checks.push({ status: 'success', text: 'ผ่านการตรวจสอบความปลอดภัยคณิตศาสตร์ (No Division by Zero)' });
        }

        // 4. Chemical Waste Alert
        if (tankAnalysis && tankAnalysis.remainderLiters > 0) {
            checks.push({
                status: 'info',
                text: `คำแนะนำผสมยา: มีเศษปริมาตร ${tankAnalysis.remainderLiters} ลิตร ให้ผสมถังบางส่วนเพื่อลดขยะเคมีตกค้าง (Chemical Waste Reduction)`
            });
        }

        return { checks, isValid };
    }, [C, S, mixType, A0, testArea, result, tankAnalysis]);

    const handleSaveToDatabase = async () => {
        if (!name.trim()) {
            toast.error('กรุณาระบุชื่อสูตรสารเคมี');
            return;
        }
        setIsSubmitting(true);
        try {
            const desc = uploadedFile
                ? `${description.trim()} [แนบไฟล์ฉลาก: ${uploadedFile.name}]`
                : description.trim();

            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: desc || 'สูตรสารเคมีทดสอบผ่าน Live Playground',
                    C: Number(C),
                    S: Number(S),
                    RA: Number(RA),
                    RA_unit: RAUnit,
                    mix_type: Number(mixType),
                    A0: Number(A0),
                    tankCapacity: Number(tankCapacity),
                    isActive: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกสูตรได้');

            toast.success(`บันทึกสูตรสารเคมี "${name}" เข้าสู่ระบบฐานข้อมูลสำเร็จ!`);
            setShowConfirmModal(false);
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Dynamic Engine v2.0
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                        🧪 Interactive Formula Playground & Edge Case Verifier
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm">
                        เครื่องมือสร้างและจำลองการคำนวณสูตรสารเคมีภาคสนามแบบเรียลไทม์ (Side-by-Side Live Simulator)
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
                        <Button
                            variant={viewMode === 'node' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('node')}
                            className={`rounded-xl text-xs font-bold gap-1.5 ${viewMode === 'node' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Sparkles className="h-3.5 w-3.5" /> 🧩 เครื่องคิดเลขสมการ (Formula Pad)
                        </Button>
                        <Button
                            variant={viewMode === 'standard' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('standard')}
                            className={`rounded-xl text-xs font-bold gap-1.5 ${viewMode === 'standard' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <FlaskConical className="h-3.5 w-3.5" /> 📝 ฟอร์มทดสอบสูตร
                        </Button>
                    </div>

                    <Button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!validations.isValid}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-md h-11 px-6 rounded-2xl shrink-0"
                    >
                        <Save className="h-4 w-4" /> บันทึกสูตรเข้าฐานข้อมูล
                    </Button>
                </div>
            </div>

            {/* View Mode Content */}
            {viewMode === 'node' ? (
                <NodeVisualCalculator />
            ) : (
                /* Side-by-Side Grid Architecture */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT PANE: Form & Parameter Editor */}
                <Card className="border-indigo-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-900">
                            <FlaskConical className="h-5 w-5 text-indigo-600" />
                            📝 1. กำหนดพารามิเตอร์สูตรสารเคมี (Formula Builder)
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            ป้อนสัดส่วนฉลาก และความจุถังพ่นเคมีมาตรฐาน
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4 text-xs">
                        <div className="space-y-1">
                            <Label className="font-semibold text-slate-700">ชื่อสูตรสารเคมี *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="font-semibold text-slate-700">คำอธิบายสูตร</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>

                        {/* Mix Type Dropdown - Pure Thai */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">รูปแบบการผสมยา *</Label>
                                <Select value={String(mixType)} onValueChange={(val) => setMixType(Number(val))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้ - รวมปริมาตรคงที่</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ - เติมสารทบน้ำมัน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-semibold text-slate-700">สารเคมีออกฤทธิ์ (C) มล.</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={C}
                                        onChange={(e) => setC(Number(e.target.value))}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-semibold text-slate-700">ตัวทำละลาย น้ำมัน/น้ำ (S)</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={S}
                                        onChange={(e) => setS(Number(e.target.value))}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Spray Coverage & Standard Tank */}
                        <div className="grid grid-cols-3 gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">อัตราพ่น (RA)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={RA}
                                    onChange={(e) => setRA(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">หน่วยการพ่น</Label>
                                <Select value={RAUnit} onValueChange={(val: any) => setRAUnit(val)}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร (L)</SelectItem>
                                        <SelectItem value="cc">มิลลิลิตร / มล. (cc)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">ความจุถัง (ลิตร)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={tankCapacity}
                                    onChange={(e) => setTankCapacity(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT PANE: Live Test Playground Simulator */}
                <Card className="border-emerald-100 shadow-sm bg-white rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-900">
                            <Zap className="h-5 w-5 text-emerald-600" />
                            🧪 2. จำลองการพ่นภาคสนาม (Live Test Simulator)
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            ป้อนพื้นที่ทดสอบเพื่อดูผลลัพธ์และสูตรตวงต่อถังแบบเรียลไทม์
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6 flex-1 text-xs">
                        {/* Simulation Inputs */}
                        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">พื้นที่พ่น (ตร.ม.)</Label>
                                <Input
                                    type="number"
                                    value={testArea}
                                    onChange={(e) => setTestArea(Number(e.target.value))}
                                    className="bg-white h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">จำนวนหลังบ้าน (N)</Label>
                                <Input
                                    type="number"
                                    value={testHouseCount}
                                    onChange={(e) => setTestHouseCount(Number(e.target.value))}
                                    className="bg-white h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">ขนาดถังพ่น (ลิตร)</Label>
                                <Input
                                    type="number"
                                    value={testTankCapacity}
                                    onChange={(e) => setTestTankCapacity(Number(e.target.value))}
                                    className="bg-white h-9"
                                />
                            </div>
                        </div>

                        {/* Live Calculation Output Card */}
                        {result && tankAnalysis && (
                            <div className="space-y-4">
                                <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-md space-y-3">
                                    <div className="flex justify-between items-center border-b border-emerald-700/60 pb-2">
                                        <span className="font-bold text-sm">📊 ผลลัพธ์การผสมน้ำยาพ่นสุทธิ</span>
                                        <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-400/30">
                                            รวม {formatNumber(tankAnalysis.totalLiters, 2)} ลิตร
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-white/10 p-2.5 rounded-xl">
                                            <span className="block text-[10px] text-emerald-200">สารเคมีเพียว (C)</span>
                                            <span className="font-extrabold text-white text-base">{formatNumber(result.V_C)} มล.</span>
                                        </div>
                                        <div className="bg-white/10 p-2.5 rounded-xl">
                                            <span className="block text-[10px] text-emerald-200">ตัวทำละลาย (S)</span>
                                            <span className="font-extrabold text-white text-base">{formatNumber(result.V_S / 1000, 2)} ลิตร</span>
                                        </div>
                                        <div className="bg-white/10 p-2.5 rounded-xl">
                                            <span className="block text-[10px] text-emerald-200">จำนวนถังที่ต้องผสม</span>
                                            <span className="font-extrabold text-amber-300 text-base">{result.tanksCount} ถัง</span>
                                        </div>
                                    </div>

                                    {/* Tank Batch Breakdown */}
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-xs space-y-1.5 leading-relaxed">
                                        <p className="font-bold text-emerald-200">⚓ สัดส่วนตวงผสมต่อถังพ่นเคมีภาคสนาม:</p>
                                        <p>• <strong>ถังเต็ม ({testTankCapacity} ลิตร):</strong> ผสมจำนวน {tankAnalysis.fullTanks} ถังเต็ม (ถังละ: สารเคมี {tankAnalysis.chemPerFullTank} มล. + น้ำมัน/น้ำ {tankAnalysis.solventPerFullTank} ลิตร)</p>
                                        {tankAnalysis.remainderLiters > 0 && (
                                            <p className="text-amber-200">
                                                • <strong>ถังย่อยเศษ ({tankAnalysis.remainderLiters} ลิตร):</strong> ผสมอีก 1 ถังย่อย (สารเคมี {tankAnalysis.chemPerPartialTank} มล. + น้ำมัน/น้ำ {tankAnalysis.solventPerPartialTank} ลิตร)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Edge Case Verification Checklist */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                        <Shield className="h-4 w-4 text-indigo-600" /> ⚠️ Edge Case Validation Checks:
                                    </h4>
                                    <div className="space-y-1.5 text-[11px]">
                                        {validations.checks.map((check, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                {check.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                                                {check.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                                                {check.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                                                {check.status === 'info' && <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />}
                                                <span className={check.status === 'error' ? 'text-red-700 font-bold' : 'text-slate-600'}>
                                                    {check.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            )}

            {/* Confirmation Alert Dialog */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700 text-lg font-bold">
                            <AlertTriangle className="h-5 w-5 text-amber-500" /> ยืนยันการบันทึกสูตรสารเคมีจาก Playground?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
                            โปรดตรวจสอบข้อมูลสูตรสารเคมีที่ผ่านการตรวจสอบ Validation ก่อนบันทึกลงฐานข้อมูล Supabase
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">ชื่อสูตรสารเคมี:</span>
                            <span className="font-bold text-indigo-900">{name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">รูปแบบการผสม:</span>
                            <span className="font-bold text-slate-900">{mixType === 2 ? 'แบบผสมกับ - เติมสารทบน้ำมัน' : 'แบบผสมให้ได้ - รวมปริมาตรคงที่'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">สัดส่วน (C:S):</span>
                            <span className="font-bold text-slate-900">{C}:{S}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">ถังพ่นเคมีแนะนำ:</span>
                            <span className="font-bold text-purple-700">{tankCapacity} ลิตร</span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveToDatabase}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {isSubmitting ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            ยืนยันบันทึกสูตร
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
