'use client';

import { formatNumber, formatMixRatio } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Printer, FlaskConical, Droplets, Home, Beaker, MapPin, Download, Building, CheckCircle } from 'lucide-react';
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
    agency?: string;
    location?: string;
    coords?: { lat: number; lng: number } | null;
    /** Optional per-field explanations authored for this formula (e.g. why A0 is
     *  what it is). Additive only — profiles without it render exactly as before. */
    resultHelp?: Record<string, string> | null;
}

export function ResultsDisplay({ result, input, agency, location, coords, resultHelp }: ResultsDisplayProps) {
    const chemicalName = input.chemical || 'ไม่ระบุสารเคมี';
    const sprayType = input.mix_type === 2 ? 'แบบผสมกับ' : 'แบบผสมให้ได้';
    const totalArea = input.N * input.A_house;
    const totalLiters = result.V_total / 1000;

    const handlePrint = () => {
        window.print();
    };

    const handleExport = (mode: number) => {
        const wb = XLSX.utils.book_new();
        let wsData: Array<Array<string | number | undefined>> = [];
        const dateStr = new Date().toLocaleString('th-TH');
        const chemName = input.chemical || 'ไม่ระบุสารเคมี';
        const locName = location || 'ไม่ระบุสถานที่';
        const agencyName = agency || 'ไม่ระบุหน่วยงาน';

        if (mode === 1) {
            // โหมด 1: แบบสรุปรายการประจำวัน (Daily Summary Log)
            wsData = [
                ['วันที่-เวลา', 'หน่วยงาน', 'ชื่อสารเคมี', 'อัตราส่วน', 'จำนวนหลัง(N)', 'ฉีดพ่นในอัตรา(RA)', 'ปริมาณตัวผสม', 'สารเคมีเตรียม(มล.)', 'น้ำมัน/น้ำเตรียม(มล.)', 'ยอดรวม(มล.)', 'สถานที่/พิกัด'],
                [dateStr, agencyName, chemName, formatMixRatio(input.C, input.S, input.mix_type), input.N, input.RA, input.S, result.V_C, result.V_S, result.V_total, locName]
            ];
        } else if (mode === 2) {
            // โหมด 2: แบบใบสั่งเตรียมสารเคมี (Chemical Preparation Ticket)
            wsData = [
                ['ใบสั่งเตรียมสารเคมี (Chemical Ticket)'],
                ['วันที่อนุมัติ:', dateStr],
                ['หน่วยงาน:', agencyName],
                ['สถานที่นำไปใช้:', locName],
                [],
                ['กรุณาเตรียมสารเคมีตามอัตราส่วนดังนี้:'],
                ['ชื่อสารเคมีหลัก:', chemName],
                ['ใช้สารเคมี (มล.):', result.V_C],
                ['ใช้น้ำมันดีเซล/น้ำ (มล.):', result.V_S],
                ['รวมเป็นปริมาณทั้งสิ้น (มล.):', result.V_total, `(${formatNumber(result.V_total / 1000, 2)} ลิตร)`],
                [],
                ['ผู้เบิก/ผู้สั่งเตรียม: ___________________________'],
                ['ผู้ผสมยา: ___________________________']
            ];
        } else if (mode === 3) {
            // โหมด 3: แบบแยกตามพื้นที่หมู่บ้าน (Area-Based Allocation)
            wsData = [
                ['หน่วยงาน', 'ชื่อหมู่บ้าน/พื้นที่', 'จำนวนหลัง', 'พื้นที่รวม (ตร.ม.)', 'สารเคมีที่ใช้', 'ปริมาณสารเคมี(มล.)', 'ปริมาณน้ำมัน(มล.)', 'รวมสารผสม(มล.)'],
                [agencyName, locName, input.N, (input.N * input.A_house), chemName, result.V_C, result.V_S, result.V_total]
            ];
        } else if (mode === 4) {
            // โหมด 4: แบบวิเคราะห์ต้นทุน (Inventory & Cost Analysis)
            wsData = [
                ['วันที่', 'หน่วยงาน', 'สถานที่', 'สารเคมี', 'จำนวนยาที่เบิก(มล.)', 'ตัวทำละลาย(มล.)', 'ข้อเสนอแนะต้นทุน (Cost Ref)'],
                [dateStr, agencyName, locName, chemName, result.V_C, result.V_S, '(เพิ่มตารางราคาลงในช่องถัดไปเพื่อคำนวณเงิน)']
            ];
        } else if (mode === 5) {
            // โหมด 5: แบบฟอร์มรายงานกรมควบคุมโรค (DDC Standard Report)
            wsData = [
                ['แบบฟอร์มรายงานการปฏิบัติงานควบคุมยุงลาย ศูนย์ควบคุมโรค 12.2'],
                ['วัน/เดือน/ปี ที่ออกปฏิบัติงาน:', dateStr],
                ['หน่วยงานปฏิบัติงาน:', agencyName],
                ['เป้าหมายพื้นที่/หมู่บ้าน:', locName],
                ['พิกัด GPS:', coords ? `${coords.lat}, ${coords.lng}` : 'N/A'],
                [''],
                ['รายละเอียดการใช้สารเคมี:'],
                ['ประเภทสารที่ใช้:', chemName, `อัตราส่วน ${formatMixRatio(input.C, input.S, input.mix_type)}`],
                ['ฉีดพ่นในอัตรา (RA):', `${input.RA} ${input.RA_unit === 'L' ? 'ลิตร' : 'มล.'}`],
                ['จำนวนหลังคาเรือนเป้าหมาย:', input.N, 'หลัง'],
                ['รวมปริมาณสารเคมีที่ใช้สุทธิ:', result.V_C, 'มล.'],
                ['รวมน้ำมัน/น้ำที่ใช้สุทธิ:', result.V_S, 'มล.']
            ];
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `โหมด ${mode}`);
        XLSX.writeFile(wb, `ค่าคำนวณสารเคมี_${dateStr.replace(/[:\/ ]/g, '_')}_Mode${mode}.xlsx`);
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-brand-line bg-white shadow-sm print:shadow-none">
            {/* Success Header */}
            <div className="bg-brand-cloud border-b border-brand-line px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                            <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-brand-ink truncate">
                                ผลการคำนวณ
                            </h2>
                            <p className="text-brand-muted text-sm truncate">
                                สูตร {formatMixRatio(input.C, input.S, input.mix_type)} • {input.N} หลัง
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="print:hidden border-brand-line text-brand-dark hover:bg-brand-soft"
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
                            className="text-brand-muted hover:bg-brand-soft hover:text-brand-dark print:hidden"
                        >
                            <Printer className="h-4 w-4 mr-1" />
                            พิมพ์
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Results - Bento Grid */}
            <div className="p-4 sm:p-6">
                {/* Big Summary Card */}
                <div className="rounded-2xl border border-brand-line bg-white mb-4 sm:mb-6 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 leading-relaxed text-brand-ink">
                        <FlaskConical className="h-5 w-5 shrink-0 text-brand" />
                        สรุปผลการคำนวณสารเคมี
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-4">
                        <div className="rounded-xl bg-brand-cloud border border-brand-line p-3">
                            <span className="block text-brand-muted text-xs mb-0.5">สารเคมีที่ใช้</span>
                            <span className="font-bold text-brand-ink text-sm sm:text-base leading-relaxed">{chemicalName}</span>
                        </div>
                        <div className="rounded-xl bg-brand-cloud border border-brand-line p-3">
                            <span className="block text-brand-muted text-xs mb-0.5">ประเภทการพ่น</span>
                            <span className="font-bold text-brand-ink text-sm sm:text-base leading-relaxed">{sprayType}</span>
                            {resultHelp?.mix_type && (
                                <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">{resultHelp.mix_type}</p>
                            )}
                        </div>
                        <div className="rounded-xl bg-brand-cloud border border-brand-line p-3">
                            <span className="block text-brand-muted text-xs mb-0.5">จำนวนบ้านที่ต้องพ่น</span>
                            <span className="font-bold text-brand-ink text-sm sm:text-base leading-relaxed">{input.N} หลัง (เทียบเท่าพื้นที่ {formatNumber(totalArea)} ตร.ม.)</span>
                        </div>
                        <div className="rounded-xl bg-brand-cloud border border-brand-line p-3">
                            <span className="block text-brand-muted text-xs mb-0.5">อัตราส่วนผสม</span>
                            <span className="font-bold text-brand-ink text-sm sm:text-base leading-relaxed">{formatMixRatio(input.C, input.S, input.mix_type).replace(':', ' : ')} ({chemicalName} : น้ำมัน/น้ำ)</span>
                        </div>
                        <div className="rounded-xl bg-brand-cloud border border-brand-line p-3 lg:col-span-2">
                            <span className="block text-brand-muted text-xs mb-0.5">อัตราการฉีดพ่น (RA)</span>
                            <span className="font-bold text-brand-ink text-base leading-relaxed">{formatNumber(input.RA)} {input.RA_unit === 'L' ? 'ลิตร' : 'มล.'} ต่อพื้นที่ {input.A0.toLocaleString('th-TH')} ตร.ม.</span>
                            {(resultHelp?.A0 || resultHelp?.RA) && (
                                <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">
                                    {[resultHelp?.A0, resultHelp?.RA].filter(Boolean).join(' • ')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-brand-line">
                        <table className="w-full text-left text-xs sm:text-sm whitespace-normal tabular-nums">
                            <thead className="bg-brand-cloud text-brand-muted">
                                <tr>
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">รายการ</th>
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-right">ปริมาณ (มล.)</th>
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-right">ปริมาณ (ลิตร)</th>
                                </tr>
                            </thead>
                            <tbody className="text-brand-ink leading-relaxed">
                                <tr className="border-t border-brand-line">
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">สารเคมีชนิดเข้มข้น</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium">{formatNumber(result.V_C)}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium">{formatNumber(result.V_C / 1000, 3)}</td>
                                </tr>
                                <tr className="border-t border-brand-line">
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">ตัวทำละลาย (น้ำ/น้ำมัน)</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium">{formatNumber(result.V_S)}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-medium">{formatNumber(result.V_S / 1000, 3)}</td>
                                </tr>
                                <tr className="border-t border-brand-line bg-brand-soft">
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold leading-normal sm:leading-relaxed text-brand-dark">ปริมาณสารเคมีสำหรับพ่นตามจำนวนหลังที่ระบุ</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-extrabold text-brand-dark">{formatNumber(result.V_total)}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-extrabold text-brand-dark">{formatNumber(totalLiters, 3)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Grid */}
                <div className="bento-grid">
                    <BentoResultCard
                        icon={<Home className="h-5 w-5" />}
                        label="ใช้ต่อหลัง"
                        value={formatNumber(result.V_per_house)}
                        unit="มล."
                        description="ปริมาณพ่นแต่ละบ้าน"
                    />
                    <BentoResultCard
                        icon={<Droplets className="h-5 w-5" />}
                        label="สารเคมีที่ใช้ในส่วนผสม 1 ลิตร"
                        value={formatNumber(result.V_C_1L)}
                        unit="มล."
                        description={input.mix_type === 2 ? "ปริมาณยาที่เติม" : "ปริมาณยาในส่วนผสม"}
                    />

                    <BentoResultCard
                        icon={<Beaker className="h-5 w-5" />}
                        label="น้ำมัน/น้ำ ที่ใช้ในส่วนผสม 1 ลิตร"
                        value={formatNumber(result.V_S_1L)}
                        unit="มล."
                        description={input.mix_type === 2 ? "ตัวตั้งต้น 1,000" : "ปริมาณตัวผสม"}
                    />
                </div>

                {/* Target Volume Calculations Comparison */}
                {input.targetVolume !== undefined && input.targetVolume > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6 print:break-inside-avoid">
                        {/* Box 1: Base ratio per 1 Liter */}
                        <div className="p-4 sm:p-5 rounded-2xl border border-brand-line bg-brand-cloud">
                            <h4 className="font-bold text-brand-ink mb-3 border-b border-brand-line pb-2 flex items-center gap-1.5 text-sm sm:text-base leading-relaxed">
                                สัดส่วนน้ำยาพ่นต่อ 1 ลิตร
                            </h4>
                            <div className="space-y-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
                                <div className="flex justify-between items-center gap-3">
                                    <span>ใช้สารเคมีเข้มข้น:</span>
                                    <span className="font-semibold text-brand-ink tabular-nums">{formatNumber(result.V_C_1L)} มล.</span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span>เติม น้ำมัน/น้ำ:</span>
                                    <span className="font-semibold text-brand-ink tabular-nums">{formatNumber(result.V_S_1L)} มล.</span>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Total preparation target volume (Highlighted) */}
                        <div className="p-4 sm:p-5 rounded-2xl border border-brand-line border-l-[3px] border-l-brand bg-white">
                            <h4 className="font-bold text-brand-ink mb-3 border-b border-brand-line pb-2 flex flex-wrap justify-between items-center gap-2 text-sm sm:text-base leading-relaxed">
                                <span>ปริมาณสารเคมีสำหรับพ่นที่ต้องการ</span>
                                <span className="bg-brand text-white text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-semibold">
                                    รวม {input.targetVolume.toLocaleString('th-TH')} ลิตร
                                </span>
                            </h4>
                            <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-brand-muted font-medium">ใช้สารเคมีเข้มข้น:</span>
                                    <span className="text-lg sm:text-xl font-extrabold text-brand-dark tabular-nums">
                                        {formatNumber(result.V_C_target ?? (result.V_C_1L * input.targetVolume))} มล.
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-brand-muted font-medium">เติม น้ำมัน/น้ำ:</span>
                                    <span className="text-lg sm:text-xl font-extrabold text-brand-dark tabular-nums">
                                        {formatNumber((result.V_S_target ?? (result.V_S_1L * input.targetVolume)) / 1000, 2)} ลิตร
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Print Instructions */}
                <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-brand-line bg-white print:break-inside-avoid">
                    <h4 className="font-bold mb-3 text-brand-ink text-sm sm:text-base leading-relaxed">
                        วิธีผสมตามจำนวนหลังที่ระบุ
                    </h4>
                    <ol className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-brand-ink">
                        <li className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-dark flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">1</span>
                            <span>เตรียม <strong className="text-brand-dark tabular-nums">{formatNumber(result.V_C)} มล. ({formatNumber(result.V_C / 1000, 3)} ลิตร)</strong> ของสารเคมี</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-dark flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">2</span>
                            <span>เตรียม <strong className="text-brand-dark tabular-nums">{formatNumber(result.V_S)} มล. ({formatNumber(result.V_S / 1000, 3)} ลิตร)</strong> ของน้ำมัน/น้ำ</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-dark flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">3</span>
                            <span>ผสมเข้าด้วยกัน ได้ <strong className="text-brand-dark tabular-nums">{formatNumber(result.V_total)} มล. ({formatNumber(result.V_total / 1000, 2)} ลิตร)</strong></span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">4</span>
                            <span>พ่นบ้านละ <strong className="text-brand-dark tabular-nums">{formatNumber(result.V_per_house)} มล. ({formatNumber(result.V_per_house / 1000, 3)} ลิตร)</strong></span>
                        </li>
                    </ol>
                    <p className="text-xs text-brand-muted mt-4 pt-3 border-t border-brand-line leading-relaxed">
                        สูตร: {formatMixRatio(input.C, input.S, input.mix_type)} | พื้นที่หลังละ {input.A_house.toLocaleString('th-TH')} ตร.ม. | จำนวน {input.N.toLocaleString('th-TH')} หลัง
                    </p>
                </div>

                {/* Location & Agency Info */}
                {(agency || location || coords) && (
                    <div className="mt-4 p-4 rounded-2xl border border-brand-line bg-brand-cloud">
                        <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-brand-muted shrink-0" />
                            <h4 className="font-semibold text-xs sm:text-sm text-brand-ink leading-relaxed">ข้อมูลผู้ใช้งานและสถานที่ปฏิบัติงาน</h4>
                        </div>
                        {agency && (
                            <p className="text-xs sm:text-sm font-medium text-brand-ink mb-1 leading-relaxed">หน่วยงานผู้ใช้: {agency}</p>
                        )}
                        {location && (
                            <p className="text-xs sm:text-sm font-medium text-brand-ink mb-1 leading-relaxed flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" /> สถานที่ปฏิบัติงาน: {location}
                            </p>
                        )}
                        {coords && (
                            <p className="text-[11px] sm:text-xs text-brand-muted leading-relaxed font-mono">
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
    label,
    value,
    unit,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    description: string;
}) {
    return (
        <div className="bento-item rounded-2xl bg-white border border-brand-line p-4 sm:p-5 flex flex-col justify-between">
            <div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center mb-2.5">
                    <span className="text-brand">{icon}</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-brand-muted leading-normal sm:leading-relaxed min-h-[2.25rem] flex items-center">{label}</p>
            </div>
            <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-brand-ink mt-1.5 leading-tight tabular-nums">
                    {value} <span className="text-xs sm:text-sm font-normal text-brand-muted">{unit}</span>
                </p>
                <p className="text-[11px] sm:text-xs text-brand-muted mt-1.5 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
