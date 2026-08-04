'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Plus, Trash2, HelpCircle } from 'lucide-react';

/** Fields commonly opaque enough to need an explanation — freeform keys are still allowed. */
const SUGGESTED_KEYS = [
    { value: 'A0', label: 'A0 — พื้นที่มาตรฐานอ้างอิง' },
    { value: 'mix_type', label: 'รูปแบบการผสม (mix_type)' },
    { value: 'RA', label: 'อัตราการพ่น (RA)' },
    { value: 'tankCapacity', label: 'ความจุถังพ่น' },
];

interface ResultHelpEditorProps {
    value: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
}

/**
 * Repeatable key/text rows so a formula author can explain *why* a default
 * value is what it is (e.g. why A0 = 1000 for this label). Additive to the
 * hardcoded explanations already in ResultsDisplay — nothing here is required.
 */
export function ResultHelpEditor({ value, onChange }: ResultHelpEditorProps) {
    const [expanded, setExpanded] = useState(false);
    const entries = Object.entries(value);

    const updateEntry = (index: number, key: string, text: string) => {
        const next = [...entries];
        next[index] = [key, text];
        onChange(Object.fromEntries(next));
    };

    const removeEntry = (index: number) => {
        const next = entries.filter((_, i) => i !== index);
        onChange(Object.fromEntries(next));
    };

    const addEntry = () => {
        // Avoid clobbering an existing key; find the first suggested key not yet used.
        const usedKeys = new Set(entries.map(([k]) => k));
        const nextKey = SUGGESTED_KEYS.find(k => !usedKeys.has(k.value))?.value || '';
        onChange({ ...value, [nextKey || `field_${entries.length + 1}`]: '' });
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                    <HelpCircle className="h-3.5 w-3.5 text-brand" />
                    คำอธิบายค่าเริ่มต้น / ผลลัพธ์ (ไม่บังคับ)
                    {entries.length > 0 && (
                        <span className="text-[10px] bg-brand-soft text-brand-dark px-1.5 py-0.5 rounded-full font-bold">
                            {entries.length}
                        </span>
                    )}
                </span>
                {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expanded && (
                <div className="p-3 space-y-3 bg-white">
                    <p className="text-[11px] text-slate-500">
                        ระบุเหตุผลของค่าเริ่มต้นแต่ละช่อง (เช่น ทำไม A0 ถึงเป็น 1000) เพื่อให้ผู้ใช้งานเห็นคำอธิบายนี้ตอนแสดงผลลัพธ์
                    </p>

                    {entries.map(([key, text], index) => (
                        <div key={index} className="flex gap-2 items-start p-2 bg-slate-50 rounded-lg">
                            <div className="w-40 shrink-0 space-y-1">
                                <Label className="text-[10px] text-slate-500">ช่อง</Label>
                                <Select value={key} onValueChange={(val) => updateEntry(index, val, text)}>
                                    <SelectTrigger className="bg-white h-8 text-xs">
                                        <SelectValue placeholder="เลือก หรือพิมพ์เอง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUGGESTED_KEYS.map(k => (
                                            <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="h-7 text-xs"
                                    placeholder="หรือระบุชื่อช่องเอง"
                                    value={key}
                                    onChange={(e) => updateEntry(index, e.target.value, text)}
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-slate-500">คำอธิบาย</Label>
                                <Textarea
                                    className="min-h-16 text-xs bg-white"
                                    placeholder="เช่น ใช้พื้นที่มาตรฐาน 1000 ตร.ม. ตามฉลาก เพราะ..."
                                    value={text}
                                    onChange={(e) => updateEntry(index, key, e.target.value)}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 shrink-0 mt-4"
                                onClick={() => removeEntry(index)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEntry}
                        className="w-full gap-1.5 text-xs h-8 border-dashed"
                    >
                        <Plus className="h-3.5 w-3.5" /> เพิ่มคำอธิบาย
                    </Button>
                </div>
            )}
        </div>
    );
}
