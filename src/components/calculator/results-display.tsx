'use client';

import { formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Printer, FlaskConical, Droplets, Home, Beaker, Sparkles, CheckCircle, MapPin, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ResultsDisplayProps {
    result: {
        V_per_house: number;
        V_total: number;
        V_C: number;
        V_S: number;
        V_C_1L: number;
        V_S_1L: number;
        V_C_target?: number;
        V_S_target?: number;
    };
    input: {
        C: number;
        S: number;
        RA: number;
        RA_unit: string;
        A0: number;
        A_house: number;
        N: number;
        chemical?: string;
        mix_type?: number;
        targetVolume?: number;
    };
    location?: string;
    coords?: { lat: number; lng: number } | null;
}

export function ResultsDisplay({ result, input, location, coords }: ResultsDisplayProps) {
    const handlePrint = () => {
        window.print();
    };

    const handleExport = (mode: number) => {
        const wb = XLSX.utils.book_new();
        let wsData: any[] = [];
        const dateStr = new Date().toLocaleString('th-TH');
        const chemName = input.chemical || 'ไม่ระบุสารเคมี';
        const locName = location || 'ไม่ระบุสถานที่';

        if (mode === 1) {
            // โหมด 1: แบบสรุปรายการประจำวัน (Daily Summary Log)
            wsData = [
                ['วันที่-เวลา', 'ชื่อสารเคมี', 'อัตราส่วน', 'จำนวนหลัง(N)', 'ฉีดพ่นในอัตรา(RA)', 'ปริมาณตัวผสม', 'สารเคมีเตรียม(cc)', 'น้ำมัน/น้ำเตรียม(cc)', 'ยอดรวม(cc)', 'สถานที่/พิกัด'],
                [dateStr, chemName, `1:${input.S}`, input.N, input.RA, input.S, result.V_C, result.V_S, result.V_total, locName]
            ];
        } else if (mode === 2) {
            // โหมด 2: แบบใบสั่งเตรียมสารเคมี (Chemical Preparation Ticket)
            wsData = [
                ['ใบสั่งเตรียมสารเคมี (Chemical Ticket)'],
                ['วันที่อนุมัติ:', dateStr],
                ['สถานที่นำไปใช้:', locName],
                [],
                ['กรุณาเตรียมสารเคมีตามอัตราส่วนดังนี้:'],
                ['ชื่อสารเคมีหลัก:', chemName],
                ['ใช้สารเคมี (cc):', result.V_C],
                ['ใช้น้ำมันดีเซล/น้ำ (cc):', result.V_S],
                ['รวมเป็นปริมาณทั้งสิ้น (cc):', result.V_total, `(${formatNumber(result.V_total / 1000, 2)} ลิตร)`],
                [],
                ['ผู้เบิก/ผู้สั่งเตรียม: ___________________________'],
                ['ผู้ผสมยา: ___________________________']
            ];
        } else if (mode === 3) {
            // โหมด 3: แบบแยกตามพื้นที่หมู่บ้าน (Area-Based Allocation)
            wsData = [
                ['ชื่อหมู่บ้าน/พื้นที่', 'จำนวนหลัง', 'พื้นที่รวม (ตร.ม.)', 'สารเคมีที่ใช้', 'ปริมาณสารเคมี(cc)', 'ปริมาณน้ำมัน(cc)', 'รวมสารผสม(cc)'],
                [locName, input.N, (input.N * input.A_house), chemName, result.V_C, result.V_S, result.V_total]
            ];
        } else if (mode === 4) {
            // โหมด 4: แบบวิเคราะห์ต้นทุน (Inventory & Cost Analysis)
            wsData = [
                ['วันที่', 'สถานที่', 'สารเคมี', 'จำนวนยาที่เบิก(cc)', 'ตัวทำละลาย(cc)', 'ข้อเสนอแนะต้นทุน (Cost Ref)'],
                [dateStr, locName, chemName, result.V_C, result.V_S, '(เพิ่มตารางราคาลงในช่องถัดไปเพื่อคำนวณเงิน)']
            ];
        } else if (mode === 5) {
            // โหมด 5: แบบฟอร์มรายงานกรมควบคุมโรค (DDC Standard Report)
            wsData = [
                ['แบบฟอร์มรายงานการปฏิบัติงานควบคุมยุงลาย ศูนย์ควบคุมโรค 12.2'],
                ['วัน/เดือน/ปี ที่ออกปฏิบัติงาน:', dateStr],
                ['เป้าหมายพื้นที่/หมู่บ้าน:', locName],
                ['พิกัด GPS:', coords ? `${coords.lat}, ${coords.lng}` : 'N/A'],
                [''],
                ['รายละเอียดการใช้สารเคมี:'],
                ['ประเภทสารที่ใช้:', chemName, `อัตราส่วน 1:${input.S}`],
                ['ฉีดพ่นในอัตรา (RA):', `${input.RA} ${input.RA_unit}`],
                ['จำนวนหลังคาเรือนเป้าหมาย:', input.N, 'หลัง'],
                ['รวมปริมาณสารเคมีที่ใช้สุทธิ:', result.V_C, 'ซีซี'],
                ['รวมน้ำมัน/น้ำที่ใช้สุทธิ:', result.V_S, 'ซีซี']
            ];
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `โหมด ${mode}`);
        XLSX.writeFile(wb, `ค่าคำนวณสารเคมี_${dateStr.replace(/[:\/ ]/g, '_')}_Mode${mode}.xlsx`);
    };

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-bounce-in print:shadow-none">
            {/* Success Header */}
            <div className="relative bg-linear-to-r from-emerald-400 via-green-500 to-teal-500 p-6">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                ผลการคำนวณ
                                <Sparkles className="h-5 w-5" />
                            </h2>
                            <p className="text-white/80 text-sm">
                                สูตร {input.C}:{input.S} • {input.N} หลัง
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="print:hidden bg-white/20 hover:bg-white/30 text-white border-white/20"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    ส่งออก Excel
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>เลือกโหมด Export</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleExport(1)} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                                    <span className="font-semibold text-xs">1. สรุปรายการประจำวัน (Daily Log)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal leading-tight">เก็บประวัติแบบคอลัมน์ เอาไปรวม Pivot Table ได้ง่าย</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(2)} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                                    <span className="font-semibold text-xs">2. ใบสั่งเตรียมสารเคมี (Ticket)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal leading-tight">แบบฟอร์มให้คนผสมยา มีช่องเซ็นชื่อ ปริมาณชัดเจน</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(3)} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                                    <span className="font-semibold text-xs">3. แยกตามหมู่บ้าน (Area Base)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal leading-tight">จัดสรรยาตามพื้นที่ เหมาะสำหรับการเบิกพร้อมกันหลายหมู่บ้าน</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(4)} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                                    <span className="font-semibold text-xs">4. วิเคราะห์ต้นทุน (Cost/Inventory)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal leading-tight">จัดตารางสำหรับพ่วงกับราคากลาง เพื่อคำนวณงบประมาณ</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(5)} className="flex flex-col items-start gap-1 py-2 cursor-pointer">
                                    <span className="font-semibold text-xs">5. ฟอร์ม DDC มาตรฐาน (Official)</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-normal leading-tight">โครงสร้างตารางอิงแบบฟอร์มกรมควบคุมโรค พร้อมแนบราชการ</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrint}
                            className="text-white hover:bg-white/20 print:hidden"
                        >
                            <Printer className="h-4 w-4 mr-1" />
                            พิมพ์
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Results - Bento Grid */}
            <div className="p-6">
                {/* Big Summary Card */}
                <div className="bento-item bento-item-large bg-linear-to-br from-emerald-500 to-teal-600 text-white mb-4 hover-lift animate-pulse-glow">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        📋 สรุปสิ่งที่ต้องเตรียม
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Droplets className="h-8 w-8" />
                                <span className="text-emerald-100">สารเคมี</span>
                            </div>
                            <p className="text-4xl font-extrabold">{formatNumber(result.V_C)} <span className="text-lg font-normal">ซีซี</span></p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Beaker className="h-8 w-8" />
                                <span className="text-emerald-100">น้ำมัน/น้ำ</span>
                            </div>
                            <p className="text-4xl font-extrabold">{formatNumber(result.V_S)} <span className="text-lg font-normal">ซีซี</span></p>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/30">
                        <p className="text-emerald-100">รวมส่วนผสมทั้งหมด</p>
                        <p className="text-5xl font-extrabold">
                            {formatNumber(result.V_total)} <span className="text-xl font-normal">ซีซี</span>
                            <span className="text-lg font-normal text-emerald-200 ml-2">
                                ({formatNumber(result.V_total / 1000, 2)} ลิตร)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Detail Grid */}
                <div className="bento-grid">
                    <BentoResultCard
                        icon={<Home className="h-5 w-5" />}
                        emoji="🏠"
                        label="ใช้ต่อหลัง"
                        value={formatNumber(result.V_per_house)}
                        unit="ซีซี"
                        description="ปริมาณพ่นแต่ละบ้าน"
                        gradient="from-blue-400 to-blue-600"
                    />
                    <BentoResultCard
                        icon={<Droplets className="h-5 w-5" />}
                        emoji="💧"
                        label={input.mix_type === 2 ? "ยาต่อตัวผสม 1 ลิตร" : "ยาในส่วนผสม 1 ลิตร"}
                        value={formatNumber(result.V_C_1L)}
                        unit="ซีซี"
                        description={input.mix_type === 2 ? "ปริมาณยาที่เติม" : "ปริมาณยาในส่วนผสม"}
                        gradient="from-indigo-400 to-indigo-600"
                    />

                    <BentoResultCard
                        icon={<Beaker className="h-5 w-5" />}
                        emoji="🫗"
                        label={input.mix_type === 2 ? "ตัวทำละลาย (น้ำมัน/น้ำ)" : "ตัวทำละลายใน 1 ลิตร"}
                        value={formatNumber(result.V_S_1L)}
                        unit="ซีซี"
                        description={input.mix_type === 2 ? "ตัวตั้งต้น 1,000" : "ปริมาณตัวผสม"}
                        gradient="from-amber-400 to-orange-500"
                    />
                </div>

                {/* Target Volume Calculations Comparison */}
                {input.targetVolume !== undefined && input.targetVolume > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 print:break-inside-avoid">
                        {/* Box 1: Base ratio per 1 Liter */}
                        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 bg-slate-50/50">
                            <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200/50 pb-2 flex items-center gap-1.5">
                                <span className="text-lg">💡</span> สัดส่วนน้ำยาพ่นต่อ 1 ลิตร
                            </h4>
                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span>ใช้สารเคมีเข้มข้น:</span>
                                    <span className="font-semibold text-slate-800">{formatNumber(result.V_C_1L)} cc (มล.)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>เติมตัวทำละลาย (น้ำ/น้ำมัน):</span>
                                    <span className="font-semibold text-slate-800">{formatNumber(result.V_S_1L)} cc (มล.)</span>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Total preparation target volume (Highlighted) */}
                        <div className="glass-card p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/30 animate-pulse-glow">
                            <h4 className="font-bold text-teal-800 mb-3 border-b border-teal-200/50 pb-2 flex justify-between items-center">
                                <span className="flex items-center gap-1.5">🚀 ยอดรวมที่ต้องเตรียมจริง</span>
                                <span className="bg-teal-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                                    รวม {input.targetVolume} ลิตร
                                </span>
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-teal-700 font-medium">ตวงสารเคมีเข้มข้น:</span>
                                    <span className="text-xl font-extrabold text-teal-800">
                                        {formatNumber(result.V_C_target ?? (result.V_C_1L * input.targetVolume))} cc (มล.)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-teal-700 font-medium">เติม น้ำ หรือ น้ำมัน:</span>
                                    <span className="text-xl font-extrabold text-teal-800">
                                        {formatNumber((result.V_S_target ?? (result.V_S_1L * input.targetVolume)) / 1000, 2)} ลิตร
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Instructions */}
                <div className="mt-6 p-5 glass-card rounded-2xl border border-slate-200/50 print:break-inside-avoid">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-700">
                        <span className="text-xl">📝</span>
                        วิธีผสม (สำหรับพิมพ์)
                    </h4>
                    <ol className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">1</span>
                            <span>เตรียม <strong className="text-blue-600">{formatNumber(result.V_C)} ซีซี</strong> ของสารเคมี</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">2</span>
                            <span>เตรียม <strong className="text-amber-600">{formatNumber(result.V_S)} ซีซี</strong> ของน้ำมัน/น้ำ</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shrink-0">3</span>
                            <span>ผสมเข้าด้วยกัน ได้ <strong className="text-green-600">{formatNumber(result.V_total)} ซีซี ({formatNumber(result.V_total / 1000, 2)} ลิตร)</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold shrink-0">4</span>
                            <span>พ่นบ้านละ <strong className="text-pink-600">{formatNumber(result.V_per_house)} ซีซี</strong></span>
                        </li>
                    </ol>
                    <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-200">
                        สูตร: {input.C}:{input.S} | พื้นที่หลังละ {input.A_house} ตร.ม. | จำนวน {input.N} หลัง
                    </p>
                </div>

                {/* Location Info */}
                {(location || coords) && (
                    <div className="mt-4 p-4 glass-card rounded-2xl border border-violet-100/50 bg-violet-50/30">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-violet-500" />
                            <h4 className="font-semibold text-sm text-slate-700">สถานที่ปฏิบัติงาน</h4>
                        </div>
                        {location && (
                            <p className="text-sm font-medium text-slate-800 mb-1">📍 {location}</p>
                        )}
                        {coords && (
                            <p className="text-xs text-slate-400">
                                พิกัด: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function BentoResultCard({
    icon,
    emoji,
    label,
    value,
    unit,
    description,
    gradient,
}: {
    icon: React.ReactNode;
    emoji: string;
    label: string;
    value: string;
    unit: string;
    description: string;
    gradient: string;
}) {
    return (
        <div className="bento-item glass-card border border-white/50 hover-lift group">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-white">{icon}</span>
                </div>
                <span className="text-2xl">{emoji}</span>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                {value} <span className="text-sm font-normal text-slate-500">{unit}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">{description}</p>
        </div>
    );
}
