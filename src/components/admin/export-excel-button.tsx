'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Download, FileSpreadsheet, Loader2, FileText, LayoutList, Map, Calculator, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getExportData } from '@/app/actions/export';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';

interface ExportExcelButtonProps {
    fromDate?: string;
    toDate?: string;
}

const EXPORT_MODES = [
    {
        id: 'daily',
        title: 'สรุปรายการประจำวัน (Daily Summary Log)',
        description: 'ข้อมูลทุกรายการเรียงตามวันที่ เหมาะสำหรับสรุปยอดรวมประจำวันหรือทำ Pivot Table',
        icon: LayoutList,
    },
    {
        id: 'ticket',
        title: 'ใบสั่งเตรียมสารเคมี (Preparation Ticket)',
        description: 'แยกข้อมูลให้จัดเรียงเพื่อใช้เป็นใบสั่งงานสำหรับเจ้าหน้าที่ผสมน้ำยา',
        icon: FileText,
    },
    {
        id: 'area',
        title: 'แยกตามพื้นที่ (Area-Based Allocation)',
        description: 'สรุปผลรวมปริมาณสารเคมีและตัวผสมโดยคัดแยกกลุ่มตามชื่อหมู่บ้านหรือสถานที่ปฏิบัติงาน',
        icon: Map,
    },
    {
        id: 'cost',
        title: 'วิเคราะห์คลังยา (Inventory & Cost)',
        description: 'ฟอร์มเปล่าสำหรับหัวหน้างานเพื่อใช้กรอกราคาต่อหน่วยและวิเคราะห์ต้นทุน',
        icon: Calculator,
    },
    {
        id: 'ddc',
        title: 'แบบฟอร์มกรมควบคุมโรค (DDC Standard)',
        description: 'จัดเรียงคอลัมน์ให้ตรงกับแบบฟอร์มรายงานมาตรฐาน รง.506 หรือรายงานการพ่นยุงลาย',
        icon: ClipboardList,
    },
];

export function ExportExcelButton({ fromDate, toDate }: ExportExcelButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);

    const handleExport = async (modeId: string) => {
        try {
            setIsExporting(modeId);
            const data = await getExportData(fromDate, toDate);

            if (!data || data.length === 0) {
                toast.error('ไม่พบข้อมูลในช่วงเวลาที่เลือก');
                setIsExporting(null);
                setIsOpen(false);
                return;
            }

            let wsData: any[] = [];
            let sheetName = 'Sheet1';

            if (modeId === 'daily') {
                sheetName = 'Daily_Summary';
                wsData = data.map((item) => ({
                    'วัน-เวลา': format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: th }),
                    'สถานที่': item.location || 'ไม่ระบุ',
                    'สารเคมี': item.chemical,
                    'อัตราส่วน': `${item.C}:${item.S}`,
                    'ชนิดการพ่น': item.type || 'หมอกควัน/ULV',
                    'ใช้เครื่อง (Rate)': item.flow_rate || '-',
                    'ปริมาณรวมทั้งหมด (cc)': item.V_total,
                    'ใช้สารเคมี (cc)': item.V_chem,
                    'ใช้ตัวผสม (cc)': item.V_solvent,
                    'ผู้ปฏิบัติงาน': item.userName,
                }));
            } else if (modeId === 'ticket') {
                sheetName = 'Preparation_Tickets';
                wsData = data.map((item, index) => ({
                    'Ticket No.': `#${String(index + 1).padStart(4, '0')}`,
                    'เวลางาน': format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: th }),
                    'พื้นที่': item.location || 'ไม่ระบุ',
                    'สารเคมีที่เบิก': item.chemical,
                    'ปริมาณสารเคมี (cc)': item.V_chem,
                    'ปริมาณตัวผสม (cc)': item.V_solvent,
                    'ผสมลงถังขนาด (ลิตร)': item.bottle_capacity || '-',
                    'ผู้รับผิดชอบ': item.userName,
                    'ลายเซ็นผู้จ่ายยา': '...............................',
                    'ลายเซ็นผู้รับยา': '...............................',
                }));
            } else if (modeId === 'area') {
                sheetName = 'Area_Allocation';
                const grouped = data.reduce((acc: any, curr: any) => {
                    const loc = curr.location || 'ไม่ระบะพื้นที่';
                    if (!acc[loc]) {
                        acc[loc] = { location: loc, chem: 0, solvent: 0, total: 0, counts: 0 };
                    }
                    acc[loc].chem += curr.V_chem || 0;
                    acc[loc].solvent += curr.V_solvent || 0;
                    acc[loc].total += curr.V_total || 0;
                    acc[loc].counts += 1;
                    return acc;
                }, {});
                wsData = Object.values(grouped).map((item: any) => ({
                    'สถานที่ปฏิบัติงาน / หมู่บ้าน': item.location,
                    'ความถี่การออกพ่น (ครั้ง)': item.counts,
                    'ยอดใช้สารเคมีรวม (cc)': item.chem,
                    'ยอดใช้น้ำ/น้ำมันรวม (cc)': item.solvent,
                    'น้ำยาผสมเสร็จรวม (cc)': item.total,
                }));
            } else if (modeId === 'cost') {
                sheetName = 'Inventory_Cost';
                wsData = data.map((item) => ({
                    'วันที่เบิก': format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: th }),
                    'สารเคมี': item.chemical,
                    'ปริมาณเบิกใช้ (cc)': item.V_chem,
                    'ราคาต่อหน่วย (บาท)': '',
                    'ต้นทุนสารเคมีรวม (บาท)': '',
                    'ต้นทุนตัวทำละลาย (บาท)': '',
                    'ต้นทุนสุทธิ (Total Cost)': '',
                    'สถานที่นำไปใช้': item.location || '-',
                    'ผู้เบิก': item.userName,
                }));
            } else if (modeId === 'ddc') {
                sheetName = 'DDC_Report';
                wsData = data.map((item) => ({
                    'วัน/เดือน/ปี': format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: th }),
                    'สถานที่พ่น': item.location || '-',
                    'จำนวนหลังคาเรือน': item.params?.N || '-',
                    'ชนิดเครื่องพ่น': item.type || '-',
                    'ชนิดสารเคมี': item.chemical,
                    'อัตราส่วนผสม': `${item.C}:${item.S}`,
                    'ปริมาณสารเคมี (cc)': item.V_chem,
                    'ปริมาณน้ำมัน/น้ำ (cc)': item.V_solvent,
                    'ผู้ปฏิบัติงาน': item.userName,
                    'หมายเหตุ': '',
                }));
            }

            const ws = XLSX.utils.json_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Adjust column widths automatically based on headers
            const colWidths = Object.keys(wsData[0] || {}).map(key => ({ wch: Math.max(key.length + 5, 15) }));
            ws['!cols'] = colWidths;

            // Trigger file download
            const fileName = `DDC_Export_${modeId}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success(`ดาวน์โหลดไฟล์ ${fileName} สำเร็จ`);
            setIsOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล');
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 shadow-sm border-emerald-500">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Excel</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl p-0 overflow-hidden">
                <div className="bg-emerald-500 p-6 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 opacity-20">
                        <FileSpreadsheet className="w-48 h-48" />
                    </div>
                    <div className="relative">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Download className="h-6 w-6" /> Export to Excel
                        </DialogTitle>
                        <DialogDescription className="text-emerald-50 mt-1 text-sm max-w-sm">
                            เลือกระบบการนำออกข้อมูลที่เหมาะสมสำหรับการนำไปใช้งานของคุณ ระบบจะดึงข้อมูลตามช่วงเวลาที่คุณเลือกไว้ด้านหน้า
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-6 grid gap-3 max-h-[60vh] overflow-y-auto">
                    {EXPORT_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isLoading = isExporting === mode.id;

                        return (
                            <button
                                key={mode.id}
                                onClick={() => handleExport(mode.id)}
                                disabled={isExporting !== null}
                                className="flex items-start text-left gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-200 group disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <div className="p-3 bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 rounded-lg text-slate-500 shrink-0 transition-colors">
                                    {isLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <Icon className="h-6 w-6" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 mb-1">
                                        {mode.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {mode.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
