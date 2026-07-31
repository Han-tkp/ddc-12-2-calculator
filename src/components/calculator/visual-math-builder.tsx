'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calculator,
    ArrowRight,
    FlaskConical,
    Droplets,
    Ruler,
    Home,
    Beaker,
    Eraser,
    Sigma,
    BrainCircuit,
} from 'lucide-react';

interface VisualMathBuilderProps {
    presetName?: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    A0: number;
    A_house: number;
    N: number;
    mix_type: number;
    targetVolume: number;
    isPreset: boolean;
}

const VARIABLES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    C: { label: 'สารเคมี (C)', icon: <FlaskConical className="h-4 w-4" />, color: 'border-blue-400 bg-blue-50 text-blue-800' },
    S: { label: 'ตัวทำละลาย (S)', icon: <Droplets className="h-4 w-4" />, color: 'border-sky-400 bg-sky-50 text-sky-800' },
    RA: { label: 'อัตราพ่น (RA)', icon: <Beaker className="h-4 w-4" />, color: 'border-amber-400 bg-amber-50 text-amber-800' },
    A0: { label: 'พื้นที่ฐาน (A₀)', icon: <Ruler className="h-4 w-4" />, color: 'border-purple-400 bg-purple-50 text-purple-800' },
    A_house: { label: 'พื้นที่/หลัง (A₁)', icon: <Ruler className="h-4 w-4" />, color: 'border-indigo-400 bg-indigo-50 text-indigo-800' },
    N: { label: 'จำนวนหลัง (N)', icon: <Home className="h-4 w-4" />, color: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
};

export function VisualMathBuilder({
    presetName,
    C, S, RA, RA_unit, A0, A_house, N, mix_type, targetVolume,
    isPreset,
}: VisualMathBuilderProps) {
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState<number | null>(null);

    const RA_cc = RA_unit === 'L' ? RA * 1000 : RA;

    const variableValues: Record<string, number> = useMemo(() => ({
        C, S, RA: RA_cc, A0, A_house, N,
        targetVolume,
        AREA: A_house * N,
    }), [C, S, RA_cc, A0, A_house, N, targetVolume]);

    const handleAppend = (token: string) => {
        setExpression(prev => prev + token);
    };

    const handleClear = () => {
        setExpression('');
        setResult(null);
    };

    const handleBackspace = () => {
        setExpression(prev => prev.slice(0, -1));
    };

    const handleEvaluate = () => {
        if (!expression.trim()) {
            setResult(null);
            return;
        }
        try {
            let expr = expression;
            for (const [key, val] of Object.entries(variableValues)) {
                expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), `(${val})`);
            }
            expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
            if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
                setResult(NaN);
                return;
            }
            const evaluated = new Function(`return ${expr}`)();
            setResult(typeof evaluated === 'number' && !isNaN(evaluated) ? evaluated : NaN);
        } catch {
            setResult(NaN);
        }
    };

    useEffect(() => {
        if (expression) handleEvaluate();
    }, [expression]);

    const operatorButtons = [
        { label: '+', value: '+' },
        { label: '−', value: '-' },
        { label: '×', value: '×' },
        { label: '÷', value: '÷' },
        { label: '(', value: '(' },
        { label: ')', value: ')' },
    ];

    if (isPreset) {
        const area = A_house * N;
        const V_per_house_ref = RA_cc * (A_house / A0);
        const V_total_ref = N * V_per_house_ref;
        let V_C = 0, V_S = 0, V_total = 0;
        if (mix_type === 2) {
            V_S = V_total_ref;
            V_C = V_S * (C / S);
            V_total = V_S + V_C;
        } else {
            V_total = V_total_ref;
            const fC = C / (C + S);
            V_C = V_total * fC;
            V_S = V_total - V_C;
        }

        const steps = [
            { label: `พื้นที่รวม ${area.toLocaleString()} ตร.ม.`, value: `${area}`, color: 'indigo' },
            { label: `RA ${RA}${RA_unit === 'L' ? 'ล' : 'มล.'}/${A0} ตร.ม.`, value: `× ${(RA_cc / A0).toFixed(4)}`, color: 'amber' },
            { label: `× ${N} หลัง`, value: `× ${N}`, color: 'emerald' },
            { label: `อัตราส่วน ${C}:${S}`, value: mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้', color: 'pink' },
            { label: `รวม ${V_total.toFixed(2)} มล.`, value: `${V_total.toFixed(0)} มล.`, color: 'violet' },
        ];

        return (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50 border-b border-slate-100 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                        <BrainCircuit className="h-5 w-5 text-indigo-600" />
                        Sub-Graph: {presetName || 'สารเคมีสำเร็จรูป'}
                        <Badge variant="outline" className="text-[10px] bg-white ml-auto">Data Flow Diagram</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1 sm:gap-0 flex-1">
                                <div className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold text-center min-w-0
                                    ${step.color === 'indigo' ? 'border-indigo-200 bg-indigo-50/80 text-indigo-800' : ''}
                                    ${step.color === 'amber' ? 'border-amber-200 bg-amber-50/80 text-amber-800' : ''}
                                    ${step.color === 'emerald' ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800' : ''}
                                    ${step.color === 'pink' ? 'border-pink-200 bg-pink-50/80 text-pink-800' : ''}
                                    ${step.color === 'violet' ? 'border-violet-200 bg-violet-50/80 text-violet-800 font-bold' : ''}
                                `}>
                                    <div className="truncate">{step.label}</div>
                                    <div className="font-mono text-sm mt-0.5">{step.value}</div>
                                </div>
                                {i < steps.length - 1 && (
                                    <ArrowRight className="h-5 w-5 text-slate-300 shrink-0 mx-0.5 sm:mx-1" />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 bg-linear-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="text-sm font-semibold text-emerald-800">ปริมาตรผสมสุทธิ:</span>
                        <span className="text-lg font-extrabold text-emerald-700 font-mono">
                            {V_total.toFixed(2)} มล. <span className="text-sm font-normal text-slate-500">({(V_total / 1000).toFixed(2)} ลิตร)</span>
                        </span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-linear-to-r from-slate-50 to-indigo-50 border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <Sigma className="h-5 w-5 text-indigo-600" />
                    กระดานดำสูตรคณิตศาสตร์ (Sub-Graph)
                    <Badge variant="outline" className="text-[10px] bg-white ml-auto">Custom Mode</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    กดปุ่มตัวแปรและเครื่องหมายด้านล่างเพื่อสร้างสมการคำนวณอิสระ
                </div>

                <div className="min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 font-mono text-sm text-slate-800 break-all leading-relaxed">
                    {expression || <span className="text-slate-300 italic">รอสร้างสมการ...</span>}
                </div>

                <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ตัวแปร</div>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(VARIABLES).map(([key, v]) => (
                            <button
                                key={key}
                                onClick={() => handleAppend(key)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${v.color}`}
                            >
                                {v.icon}
                                {key}
                            </button>
                        ))}
                        <button
                            onClick={() => handleAppend('targetVolume')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-teal-400 bg-teal-50 text-teal-800 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                            <Beaker className="h-4 w-4" />
                            TargetVol
                        </button>
                        <button
                            onClick={() => handleAppend('AREA')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-rose-400 bg-rose-50 text-rose-800 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                            <Ruler className="h-4 w-4" />
                            AREA
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ตัวดำเนินการ</div>
                    <div className="flex flex-wrap gap-1.5">
                        {operatorButtons.map(op => (
                            <button
                                key={op.value}
                                onClick={() => handleAppend(op.value)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-lg cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-400 active:scale-95"
                            >
                                {op.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleClear} className="gap-1 text-xs">
                        <Eraser className="h-3.5 w-3.5" /> ล้าง
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBackspace} className="gap-1 text-xs">
                        ← ลบ
                    </Button>
                    <Button size="sm" onClick={handleEvaluate} className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white ml-auto">
                        <Calculator className="h-3.5 w-3.5" /> คำนวณ
                    </Button>
                </div>

                {result !== null && (
                    <div className={`p-3 rounded-xl border-2 font-mono text-sm flex items-center justify-between ${isNaN(result) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                        <span className="font-semibold text-xs">ผลลัพธ์:</span>
                        <span className={`font-extrabold text-lg ${isNaN(result) ? 'text-red-600' : 'text-emerald-700'}`}>
                            {isNaN(result) ? 'ERROR' : `${result.toFixed(2)}`}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}