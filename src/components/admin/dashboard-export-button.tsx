'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ExportRow {
    createdAt: string;
    chemical: string;
    location: string;
    agency: string;
    C: number | string;
    S: number | string;
    RA: number | string;
    RA_unit: string;
    N: number | string;
    V_C: number | string;
    V_S: number | string;
    V_total: number | string;
    lat: number | string;
    lng: number | string;
}

const HEADERS: { key: keyof ExportRow; label: string }[] = [
    { key: 'createdAt', label: 'วันที่-เวลา' },
    { key: 'chemical', label: 'สารเคมี' },
    { key: 'location', label: 'สถานที่' },
    { key: 'agency', label: 'หน่วยงาน' },
    { key: 'C', label: 'สัดส่วนสารออกฤทธิ์ (C)' },
    { key: 'S', label: 'สัดส่วนตัวทำละลาย (S)' },
    { key: 'RA', label: 'อัตราพ่น' },
    { key: 'RA_unit', label: 'หน่วยอัตราพ่น' },
    { key: 'N', label: 'จำนวนหลัง' },
    { key: 'V_C', label: 'สารเคมี (มล.)' },
    { key: 'V_S', label: 'ตัวทำละลาย (มล.)' },
    { key: 'V_total', label: 'รวม (มล.)' },
    { key: 'lat', label: 'ละติจูด' },
    { key: 'lng', label: 'ลองจิจูด' },
];

/**
 * Escapes a CSV field.
 *
 * The leading apostrophe guard is deliberate: a value starting with = + - or @ is
 * executed as a formula when the file is opened in Excel or Sheets. Chemical and
 * location names come from free-text entry, so this file is untrusted input as far
 * as the spreadsheet is concerned.
 */
function csvCell(value: unknown): string {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

interface DashboardExportButtonProps {
    rows: ExportRow[];
    fileLabel: string;
}

/**
 * Exports exactly the rows the page is currently showing — the same date range and
 * dimension filters. Anything else would hand the user a file that disagrees with
 * the dashboard they exported it from.
 */
export function DashboardExportButton({ rows, fileLabel }: DashboardExportButtonProps) {
    const [busy, setBusy] = useState(false);

    const handleExport = () => {
        if (rows.length === 0) {
            toast.error('ไม่มีข้อมูลในช่วง/ตัวกรองที่เลือก');
            return;
        }
        setBusy(true);
        try {
            const lines = [
                HEADERS.map(h => csvCell(h.label)).join(','),
                ...rows.map(row => HEADERS.map(h => csvCell(row[h.key])).join(',')),
            ];
            // UTF-8 BOM so Excel on Windows renders Thai instead of mojibake.
            const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileLabel}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(`ส่งออก ${rows.length.toLocaleString('th-TH')} รายการแล้ว`);
        } catch {
            toast.error('ส่งออกไม่สำเร็จ');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={busy}
            className="h-9 gap-2 border-brand-line text-brand-dark hover:bg-brand-soft shrink-0"
            title="ส่งออกข้อมูลตามตัวกรองปัจจุบันเป็น CSV"
        >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            ส่งออก CSV ({rows.length.toLocaleString('th-TH')})
        </Button>
    );
}
