'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { convertRA } from '@/lib/calculations';
import { simplifyRatio } from '@/lib/quantity';

interface BulkEditProfile {
    id: string;
    name: string;
    description: string | null;
    C: number;
    S: number;
    RA: number;
    RA_unit: string;
    mix_type: number;
    A0: number;
    C_unit?: 'L' | 'cc' | null;
    S_unit?: 'L' | 'cc' | null;
}

interface BulkRow {
    id: string;
    name: string;
    description: string;
    C: number;
    CUnit: 'L' | 'cc';
    S: number;
    SUnit: 'L' | 'cc';
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
}

function toRow(p: BulkEditProfile): BulkRow {
    return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        C: p.C,
        CUnit: p.C_unit || 'L',
        S: p.S,
        SUnit: p.S_unit || 'L',
        RA: p.RA,
        RA_unit: (p.RA_unit as 'L' | 'cc') || 'L',
        mix_type: p.mix_type || 1,
        A0: p.A0,
    };
}

interface BulkEditProfilesModalProps {
    profiles: BulkEditProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}

/**
 * Edits several profiles in one dialog — each row keeps its own values (not a
 * single value fanned out to every row), because different chemicals legitimately
 * need different C/S/RA/A0. Saves sequentially and reports per-row pass/fail so a
 * mistake in one formula doesn't silently swallow the rest.
 */
export function BulkEditProfilesModal({ profiles, open, onOpenChange, onDone }: BulkEditProfilesModalProps) {
    const [rows, setRows] = useState<BulkRow[]>(() => profiles.map(toRow));
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<Record<string, 'ok' | 'error'> | null>(null);

    // Re-seed from the latest selection whenever the dialog is (re)opened.
    const [lastOpenedIds, setLastOpenedIds] = useState<string>('');
    const currentIds = profiles.map((p) => p.id).join(',');
    if (open && currentIds !== lastOpenedIds) {
        setLastOpenedIds(currentIds);
        setRows(profiles.map(toRow));
        setResults(null);
    }

    const updateRow = (id: string, patch: Partial<BulkRow>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        const outcome: Record<string, 'ok' | 'error'> = {};
        for (const row of rows) {
            try {
                const { C, S } = simplifyRatio(
                    row.CUnit === 'L' ? row.C * 1000 : row.C,
                    row.SUnit === 'L' ? row.S * 1000 : row.S,
                );
                const res = await fetch(`/api/profiles/${row.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: row.name,
                        description: row.description,
                        C, S,
                        C_unit: row.CUnit,
                        S_unit: row.SUnit,
                        RA: row.RA,
                        RA_unit: row.RA_unit,
                        mix_type: row.mix_type,
                        A0: row.A0,
                    }),
                });
                outcome[row.id] = res.ok ? 'ok' : 'error';
            } catch {
                outcome[row.id] = 'error';
            }
        }
        setResults(outcome);
        setIsSaving(false);

        const okCount = Object.values(outcome).filter((v) => v === 'ok').length;
        const errCount = rows.length - okCount;
        if (errCount === 0) {
            toast.success(`บันทึกสำเร็จทั้งหมด ${okCount} รายการ`);
            onDone();
            onOpenChange(false);
        } else {
            toast.error(`บันทึกสำเร็จ ${okCount} รายการ, ล้มเหลว ${errCount} รายการ — ตรวจสอบแถวที่ทำเครื่องหมายด้านล่าง`);
            onDone();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>แก้ไขหลายสูตรพร้อมกัน ({rows.length} รายการ)</DialogTitle>
                    <DialogDescription>
                        แก้ค่าของแต่ละแถวได้อิสระ (ไม่จำเป็นต้องเหมือนกัน) แล้วกด &ldquo;บันทึกทั้งหมด&rdquo; ครั้งเดียว — ระบบจะบันทึกทีละแถวและรายงานผลแยกกัน
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                            <div className="flex items-center gap-2">
                                {results && (
                                    results[row.id] === 'ok'
                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        : results[row.id] === 'error'
                                            ? <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                            : null
                                )}
                                <Input
                                    value={row.name}
                                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                                    className="font-semibold bg-white h-8 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                                <div className="flex gap-1 min-w-0">
                                    <Input
                                        type="number" step="any" value={row.C}
                                        onChange={(e) => updateRow(row.id, { C: parseFloat(e.target.value) || 0 })}
                                        className="bg-white h-8 text-xs flex-1 min-w-0" title="สารเคมีออกฤทธิ์ (C)"
                                    />
                                    <Select value={row.CUnit} onValueChange={(v: 'L' | 'cc') => updateRow(row.id, { C: convertRA(row.C, row.CUnit, v), CUnit: v })}>
                                        <SelectTrigger className="w-16 h-8 text-xs bg-white shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="L">ลิตร</SelectItem><SelectItem value="cc">มล.</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1 min-w-0">
                                    <Input
                                        type="number" step="any" value={row.S}
                                        onChange={(e) => updateRow(row.id, { S: parseFloat(e.target.value) || 0 })}
                                        className="bg-white h-8 text-xs flex-1 min-w-0" title="ตัวทำละลาย (S)"
                                    />
                                    <Select value={row.SUnit} onValueChange={(v: 'L' | 'cc') => updateRow(row.id, { S: convertRA(row.S, row.SUnit, v), SUnit: v })}>
                                        <SelectTrigger className="w-16 h-8 text-xs bg-white shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="L">ลิตร</SelectItem><SelectItem value="cc">มล.</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1 min-w-0">
                                    <Input
                                        type="number" step="any" value={row.RA}
                                        onChange={(e) => updateRow(row.id, { RA: parseFloat(e.target.value) || 0 })}
                                        className="bg-white h-8 text-xs flex-1 min-w-0" title="อัตราการพ่น (RA)"
                                    />
                                    <Select value={row.RA_unit} onValueChange={(v: 'L' | 'cc') => updateRow(row.id, { RA: convertRA(row.RA, row.RA_unit, v), RA_unit: v })}>
                                        <SelectTrigger className="w-16 h-8 text-xs bg-white shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="L">ลิตร</SelectItem><SelectItem value="cc">มล.</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    type="number" step="1" value={row.A0}
                                    onChange={(e) => updateRow(row.id, { A0: parseFloat(e.target.value) || 0 })}
                                    className="bg-white h-8 text-xs min-w-0" title="พื้นที่มาตรฐาน (A0)"
                                />
                                <Select value={String(row.mix_type)} onValueChange={(v) => updateRow(row.id, { mix_type: parseInt(v) })}>
                                    <SelectTrigger className="h-8 text-xs bg-white min-w-0"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">ผสมให้ได้</SelectItem>
                                        <SelectItem value="2">ผสมกับ</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    value={row.description}
                                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                                    placeholder="คำอธิบาย"
                                    className="bg-white h-8 text-xs min-w-0"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        ปิด
                    </Button>
                    <Button type="button" onClick={handleSaveAll} disabled={isSaving} className="bg-brand hover:bg-brand-dark gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        บันทึกทั้งหมด ({rows.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
