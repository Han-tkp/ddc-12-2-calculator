'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Download,
    Calculator,
    Sigma,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Variable,
    HelpCircle,
    X,
    Copy,
    RefreshCw,
    Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { KaTeXDisplay } from '@/components/ui/katex-display';
import {
    type FormulaVariable,
    type ComputedVariable,
    computeAll,
    evaluateVariable,
    DEFAULT_TEMPLATES,
} from '@/lib/formula-engine';
import { resolvePrimaryResultFromVariables } from '@/lib/formula-result';

const STORAGE_KEY = 'free-formula-variables';

interface FreeFormulaCalculatorProps {
    initialVariables?: FormulaVariable[];
    onVariablesChange?: (vars: FormulaVariable[]) => void;
}

function generateId(): string {
    return Math.random().toString(36).slice(2, 9);
}

export function FreeFormulaCalculator({ initialVariables, onVariablesChange }: FreeFormulaCalculatorProps) {
    const [variables, setVariables] = useState<FormulaVariable[]>(() => {
        if (initialVariables) return initialVariables;
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
            try { return JSON.parse(stored) as FormulaVariable[]; } catch { /* */ }
        }
        return DEFAULT_TEMPLATES[0].variables.map(v => ({ ...v, id: generateId() }));
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showFunctions, setShowFunctions] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'calculation'>('table');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveFormData, setSaveFormData] = useState({ name: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);

    const computedList = useMemo(() => computeAll(variables), [variables]);

    const selectedVar = useMemo(
        () => variables.find(v => v.id === selectedId) || null,
        [variables, selectedId]
    );

    const computedMap = useMemo(
        () => new Map(computedList.map(c => [c.name, c])),
        [computedList]
    );

    const updateVar = useCallback((id: string, field: keyof FormulaVariable, value: string) => {
        setVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    }, []);

    const addVariable = useCallback(() => {
        const baseName = String.fromCharCode(65 + variables.length % 26);
        const name = variables.some(v => v.name === baseName) ? `${baseName}${variables.length}` : baseName;
        const newVar: FormulaVariable = {
            id: generateId(),
            name,
            expression: '1',
            unit: '',
            description: '',
        };
        setVariables(prev => [...prev, newVar]);
        setSelectedId(newVar.id);
    }, [variables]);

    const removeVariable = useCallback((id: string) => {
        setVariables(prev => {
            const next = prev.filter(v => v.id !== id);
            if (selectedId === id) setSelectedId(next[0]?.id || null);
            return next;
        });
    }, [selectedId]);

    const handleExpressionChange = useCallback((id: string, expr: string) => {
        setVariables(prev => prev.map(v => v.id === id ? { ...v, expression: expr } : v));
    }, []);

    const loadTemplate = useCallback((templateName: string) => {
        const tpl = DEFAULT_TEMPLATES.find(t => t.name === templateName);
        if (tpl) {
            const newVars = tpl.variables.map(v => ({ ...v, id: generateId() }));
            setVariables(newVars);
            setSelectedId(newVars[0]?.id || null);
            toast.success(`โหลดแม่แบบ "${tpl.name}" เรียบร้อย`);
        }
    }, []);

    const saveToLocal = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
        onVariablesChange?.(variables);
        toast.success('บันทึกสูตรลงในเครื่องเรียบร้อย');
    }, [variables, onVariablesChange]);

    const saveFormulaToServer = async () => {
        if (!saveFormData.name.trim()) {
            toast.error('กรุณาระบุชื่อสูตร');
            return;
        }

        // Dry-run computeAll to validate
        const computed = computeAll(variables);
        if (computed.some(c => c.error)) {
            toast.error('สูตรมีข้อผิดพลาด ไม่สามารถบันทึกได้');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/profiles/from-formula', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: saveFormData.name.trim(),
                    description: saveFormData.description.trim(),
                    variables,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'ไม่สามารถบันทึกสูตรได้');
            }

            toast.success('บันทึกเป็นสูตรสารเคมีเรียบร้อย!');
            setIsSaveDialogOpen(false);
            setSaveFormData({ name: '', description: '' });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const exportJson = useCallback(() => {
        const blob = new Blob([JSON.stringify({ version: 1, variables }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `formula-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('ส่งออกไฟล์ JSON เรียบร้อย');
    }, [variables]);

    const importJson = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    if (data.variables && Array.isArray(data.variables)) {
                        const imported = data.variables.map((v: FormulaVariable) => ({
                            ...v,
                            id: generateId(),
                        }));
                        setVariables(imported);
                        setSelectedId(imported[0]?.id || null);
                        toast.success(`นำเข้าสูตร ${imported.length} ตัวแปรเรียบร้อย`);
                    } else {
                        toast.error('ไฟล์ JSON ไม่ถูกต้อง');
                    }
                } catch {
                    toast.error('ไม่สามารถอ่านไฟล์ JSON ได้');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);

    const clearAll = useCallback(() => {
        setVariables([
            { id: generateId(), name: 'A', expression: '1', unit: '', description: '' },
            { id: generateId(), name: 'B', expression: '1', unit: '', description: '' },
        ]);
        setSelectedId(null);
        toast.success('ล้างข้อมูลทั้งหมด');
    }, []);

    const hasErrors = computedList.some(c => c.error);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <Select onValueChange={loadTemplate}>
                    <SelectTrigger className="w-52 h-9 text-xs">
                        <SelectValue placeholder="เลือกแม่แบบสูตร..." />
                    </SelectTrigger>
                    <SelectContent>
                        {DEFAULT_TEMPLATES.map(t => (
                            <SelectItem key={t.name} value={t.name} className="text-xs">{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="h-6 w-px bg-slate-200" />

                <Button variant="outline" size="sm" onClick={addVariable} className="gap-1.5 text-xs h-9">
                    <Plus className="h-3.5 w-3.5" /> เพิ่มตัวแปร
                </Button>
                <Button variant="outline" size="sm" onClick={saveToLocal} className="gap-1.5 text-xs h-9">
                    <Save className="h-3.5 w-3.5" /> บันทึก
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsSaveDialogOpen(true)} className="gap-1.5 text-xs h-9 bg-brand hover:bg-brand-dark text-white border-brand">
                    <Database className="h-3.5 w-3.5" /> บันทึกเป็นสูตรสารเคมี
                </Button>
                <Button variant="outline" size="sm" onClick={exportJson} className="gap-1.5 text-xs h-9">
                    <Download className="h-3.5 w-3.5" /> ส่งออก
                </Button>
                <Button variant="outline" size="sm" onClick={importJson} className="gap-1.5 text-xs h-9">
                    <Upload className="h-3.5 w-3.5" /> นำเข้า
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll} className="gap-1.5 text-xs h-9 text-red-500 hover:text-red-600">
                    <RefreshCw className="h-3.5 w-3.5" /> ล้าง
                </Button>

                <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-8 text-xs gap-1.5 rounded-md"
                    >
                        <Calculator className="h-3.5 w-3.5" /> รูปแบบตาราง
                    </Button>
                    <Button
                        variant={viewMode === 'calculation' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('calculation')}
                        className="h-8 text-xs gap-1.5 rounded-md"
                    >
                        <Sigma className="h-3.5 w-3.5" /> รูปแบบคำนวณ
                    </Button>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {hasErrors ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> มีข้อผิดพลาด
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> คำนวณสำเร็จ
                        </span>
                    )}
                    <span className="text-xs text-slate-400">{variables.length} ตัวแปร</span>
                </div>
            </div>

            {/* Formula Bar — shows selected variable's expression */}
            {selectedVar && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-xs font-bold text-brand shrink-0 min-w-[80px]">
                        {selectedVar.name} =
                    </span>
                    <Input
                        value={selectedVar.expression}
                        onChange={(e) => handleExpressionChange(selectedVar.id, e.target.value)}
                        className="flex-1 min-w-20 h-8 text-xs font-mono bg-white border-slate-200 focus:border-brand/60"
                        placeholder="พิมพ์สูตร เช่น C + S หรือ A * B / 2"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">หน่วย:</span>
                        <Input
                            value={selectedVar.unit || ''}
                            onChange={(e) => updateVar(selectedVar.id, 'unit', e.target.value)}
                            className="w-16 h-8 text-xs bg-white"
                            placeholder="ml"
                        />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFunctions(!showFunctions)}
                            className="h-8 text-xs gap-1"
                        >
                            <HelpCircle className="h-3.5 w-3.5" /> ฟังก์ชัน
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const c = computedMap.get(selectedVar.name);
                                const val = c?.computed !== null && c?.computed !== undefined ? c.computed : '?';
                                navigator.clipboard.writeText(String(val));
                                toast.success(`คัดลอกค่า ${val}`);
                            }}
                            className="h-8 text-xs gap-1"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
            {selectedVar && (
                <div className="flex items-center gap-2 -mt-2">
                    <span className="text-xs text-slate-400 shrink-0 min-w-[80px] text-right pr-1">คำอธิบาย:</span>
                    <Input
                        value={selectedVar.description || ''}
                        onChange={(e) => updateVar(selectedVar.id, 'description', e.target.value)}
                        className="flex-1 h-8 text-xs bg-white border-slate-200 focus:border-brand/60"
                        placeholder="อธิบายว่าตัวแปรนี้คืออะไร/ใช้ทำอะไร (ไม่บังคับ)"
                    />
                </div>
            )}

            {/* Functions reference */}
            {showFunctions && (
                <Card className="border-brand-soft bg-brand-soft/30">
                    <CardContent className="p-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {[
                                ['SUM(a,b,c...)', 'รวมค่า'], ['AVG(a,b,c...)', 'ค่าเฉลี่ย'],
                                ['ROUND(x, d)', 'ปัดเศษ'], ['CEIL(x)', 'ปัดขึ้น'],
                                ['FLOOR(x)', 'ปัดลง'], ['ABS(x)', 'ค่าสัมบูรณ์'],
                                ['IF(cond, t, f)', 'เงื่อนไข'], ['POW(b, e)', 'ยกกำลัง'],
                                ['SQRT(x)', 'รากที่ 2'], ['MIN(a,b,c...)', 'ต่ำสุด'],
                                ['MAX(a,b,c...)', 'สูงสุด'], ['PI()', 'ค่า π'],
                            ].map(([fn, desc]) => (
                                <div key={fn} className="bg-white p-2 rounded-lg border border-slate-200">
                                    <code className="font-bold text-brand-dark text-[11px]">{fn}</code>
                                    <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Variable Sheet — Table (table view) */}
            {viewMode === 'table' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-2.5 text-left font-semibold text-slate-600 w-8">#</th>
                                <th className="p-2.5 text-left font-semibold text-slate-600">ตัวแปร</th>
                                <th className="p-2.5 text-left font-semibold text-slate-600">สูตร / ค่า</th>
                                <th className="p-2.5 text-left font-semibold text-slate-600 w-20">หน่วย</th>
                                <th className="p-2.5 text-right font-semibold text-slate-600 w-28">ผลลัพธ์</th>
                                <th className="p-2.5 w-16"> </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {computedList.map((cv, idx) => {
                                const isSelected = cv.id === selectedId;
                                const dependsOnStr = cv.dependsOn.length > 0
                                    ? `ขึ้นกับ: ${cv.dependsOn.join(', ')}`
                                    : 'ค่าคงที่';

                                return (
                                    <tr
                                        key={cv.id}
                                        className={`cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-brand-soft border-l-2 border-l-brand'
                                                : 'hover:bg-slate-50'
                                        } ${cv.error ? 'bg-red-50/50' : ''}`}
                                        onClick={() => setSelectedId(cv.id)}
                                    >
                                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                                        <td className="p-2.5">
                                            <Input
                                                value={cv.name}
                                                onChange={(e) => updateVar(cv.id, 'name', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`h-7 text-xs font-bold font-mono w-28 bg-transparent border-transparent hover:border-slate-200 focus:border-brand/60 ${
                                                    isSelected ? 'text-brand-dark' : 'text-slate-800'
                                                }`}
                                            />
                                            {cv.description && (
                                                <p className="text-[10px] text-slate-400 mt-0.5">{cv.description}</p>
                                            )}
                                        </td>
                                        <td className="p-2.5">
                                            <Input
                                                value={cv.expression}
                                                onChange={(e) => handleExpressionChange(cv.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-7 text-xs font-mono bg-transparent border-transparent hover:border-slate-200 focus:border-brand/60"
                                                placeholder="ค่าคงที่หรือสูตร"
                                            />
                                        </td>
                                        <td className="p-2.5">
                                            <Input
                                                value={cv.unit || ''}
                                                onChange={(e) => updateVar(cv.id, 'unit', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-7 text-xs bg-transparent border-transparent hover:border-slate-200 focus:border-brand/60"
                                                placeholder="หน่วย"
                                            />
                                        </td>
                                        <td className="p-2.5 text-right">
                                            {cv.error ? (
                                                <span className="text-red-500 text-[11px]" title={cv.error}>
                                                    <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                                                    ผิดพลาด
                                                </span>
                                            ) : cv.computed !== null ? (
                                                <span className="font-bold font-mono text-lg text-slate-900">
                                                    {cv.computed % 1 === 0
                                                        ? cv.computed.toLocaleString()
                                                        : cv.computed.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                            <div className="text-[10px] text-slate-400">{dependsOnStr}</div>
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); removeVariable(cv.id); }}
                                                className="h-7 w-7 p-0 text-slate-300 hover:text-red-500"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-2 border-t border-slate-100">
                    <Button variant="ghost" size="sm" onClick={addVariable} className="w-full text-xs gap-1.5 text-slate-500 hover:text-brand">
                        <Plus className="h-3.5 w-3.5" /> เพิ่มแถวตัวแปร
                    </Button>
                </div>
            </div>
            )}

            {/* Calculation View — full solution with KaTeX */}
            {viewMode === 'calculation' && (
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                        <Sigma className="h-4 w-4" />
                        รูปแบบคำนวณ — Solution Steps
                    </CardTitle>
                    <CardDescription className="text-xs">
                        แสดงขั้นตอนการคำนวณทั้งหมด พร้อมสูตรคณิตศาสตร์
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Input Variables */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ค่าตั้งต้น (Input)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {computedList.filter(cv => cv.dependsOn.length === 0).map(cv => (
                                    <div key={cv.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                                        <div className="font-mono text-brand font-bold text-xs">{cv.name}</div>
                                        <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                                            <KaTeXDisplay formula={String(cv.computed ?? '?')} />
                                        </div>
                                        {cv.unit && <div className="text-[10px] text-slate-400">{cv.unit}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Calculation Steps */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ขั้นตอนการคำนวณ (Steps)</h4>
                            <div className="space-y-2">
                                {computedList.filter(cv => cv.dependsOn.length > 0).map((cv, idx) => {
                                    const subValues = cv.dependsOn.map(dep => {
                                        const dv = computedMap.get(dep);
                                        return `${dep} = ${dv?.computed != null ? dv.computed : '?'}`;
                                    }).join(', ');

                                    return (
                                        <div key={cv.id} className="relative">
                                            {idx > 0 && (
                                                <div className="flex justify-center py-0.5">
                                                    <div className="w-0.5 h-4 bg-emerald-300 rounded-full" />
                                                </div>
                                            )}
                                            <div className={`bg-white border rounded-xl p-4 shadow-xs ${
                                                cv.error ? 'border-red-200' : 'border-emerald-200'
                                            }`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                                        cv.error ? 'bg-red-400' : 'bg-emerald-500'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <code className="text-sm font-bold text-emerald-700 font-mono">{cv.name}</code>
                                                            <span className="text-slate-400">=</span>
                                                            <code className="text-sm font-mono bg-emerald-50 px-2 py-0.5 rounded text-emerald-800">
                                                                {cv.expression}
                                                            </code>
                                                            {cv.unit && (
                                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    {cv.unit}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* KaTeX formula display */}
                                                        <div className="bg-slate-50 rounded-lg p-2 mt-1 border border-slate-100">
                                                            <KaTeXDisplay
                                                                formula={`${cv.name} = ${cv.expression}`}
                                                                displayMode={false}
                                                            />
                                                        </div>

                                                        {/* Dependencies with values */}
                                                        {cv.dependsOn.length > 0 && (
                                                            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                                                {cv.dependsOn.map(dep => {
                                                                    const depVar = computedMap.get(dep);
                                                                    return (
                                                                        <span key={dep} className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded">
                                                                            <span className="font-mono text-brand">{dep}</span>
                                                                            <span>=</span>
                                                                            <span className="font-bold text-slate-700">
                                                                                {depVar?.computed !== null && depVar?.computed !== undefined
                                                                                    ? depVar.computed % 1 === 0
                                                                                        ? depVar.computed.toLocaleString()
                                                                                        : depVar.computed.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                                                    : '?'}
                                                                            </span>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {cv.error && (
                                                            <div className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" /> {cv.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-lg font-bold font-mono ${
                                                            cv.error ? 'text-red-500' : 'text-slate-900'
                                                        }`}>
                                                            {cv.computed !== null
                                                                ? cv.computed % 1 === 0
                                                                    ? cv.computed.toLocaleString()
                                                                    : cv.computed.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                                : '?'}
                                                        </div>
                                                        {cv.description && (
                                                            <div className="text-[10px] text-slate-400 max-w-[120px] truncate">{cv.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Final Result */}
                        {(() => {
                            const last = resolvePrimaryResultFromVariables(variables, computedList);
                            if (!last) return null;
                            return (
                                <div className="mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
                                    <div className="text-xs text-emerald-100 font-semibold uppercase tracking-wider">ผลลัพธ์สุดท้าย (Final Result)</div>
                                    <div className="flex items-end gap-3 mt-1">
                                        <span className="text-3xl font-extrabold font-mono">
                                            {last.computed !== null
                                                ? last.computed % 1 === 0
                                                    ? last.computed.toLocaleString()
                                                    : last.computed.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                : '?'}
                                        </span>
                                        {last.unit && <span className="text-lg font-semibold text-emerald-100">{last.unit}</span>}
                                        <span className="text-sm text-emerald-200 ml-2">({last.name})</span>
                                    </div>
                                    <div className="text-xs text-emerald-100 mt-1">
                                        <KaTeXDisplay formula={`${last.name} = ${last.expression}`} />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </CardContent>
            </Card>
            )}

            {/* Save Formula Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>บันทึกเป็นสูตรสารเคมี</DialogTitle>
                        <DialogDescription>
                            สูตรนี้จะถูกบันทึกลงฐานข้อมูลและพร้อมใช้งานในหน้าคำนวณจริง
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="save-name">ชื่อสูตร <span className="text-red-500">*</span></Label>
                            <Input
                                id="save-name"
                                placeholder="เช่น Eleksa 1:50"
                                value={saveFormData.name}
                                onChange={(e) => setSaveFormData({ ...saveFormData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="save-description">คำอธิบาย</Label>
                            <Input
                                id="save-description"
                                placeholder="เช่น สูตรสำหรับพ่นหมอกควัน Eleksa"
                                value={saveFormData.description}
                                onChange={(e) => setSaveFormData({ ...saveFormData, description: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(false)} disabled={isSaving}>
                                ยกเลิก
                            </Button>
                            <Button type="button" onClick={saveFormulaToServer} disabled={isSaving} className="bg-brand hover:bg-brand-dark">
                                {isSaving ? (
                                    <>
                                        <Save className="h-4 w-4 mr-2 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        บันทึก
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
