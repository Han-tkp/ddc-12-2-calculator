'use client';

import { useEffect, useState } from 'react';
import { calculate, CalculationInput, CalculationResult } from '@/lib/calculations';
import { ResultsDisplay } from './results-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, RotateCcw, TestTube2 } from 'lucide-react';

interface FormulaTrialPreviewProps {
    /** Namespaces the scratch localStorage key so two dialogs don't collide. */
    storageKey: string;
    C: number;
    S: number;
    RA: number;
    RAUnit: 'L' | 'cc';
    mixType: number;
    A0: number;
    /** The result-help draft being authored, so the preview shows it exactly as it will render. */
    resultHelp?: Record<string, string>;
}

interface TrialScratch {
    A_house: number;
    N: number;
}

const DEFAULT_SCRATCH: TrialScratch = { A_house: 100, N: 10 };

/**
 * "ทดลองคำนวณ" — a same-page preview of how a formula's results will render,
 * before the formula is saved. Never touches the database: A_house/N live in
 * localStorage as scratch state only, cleared by the reset button, and the
 * compute button just calls the pure `calculate()` engine directly.
 */
export function FormulaTrialPreview({ storageKey, C, S, RA, RAUnit, mixType, A0, resultHelp }: FormulaTrialPreviewProps) {
    const fullKey = `ddc:trial-preview:${storageKey}`;
    const [scratch, setScratch] = useState<TrialScratch>(DEFAULT_SCRATCH);
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [calculatedInput, setCalculatedInput] = useState<CalculationInput | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(fullKey);
            if (raw) setScratch(JSON.parse(raw));
            // eslint-disable-next-line no-empty
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const persistScratch = (next: TrialScratch) => {
        setScratch(next);
        try {
            localStorage.setItem(fullKey, JSON.stringify(next));
            // eslint-disable-next-line no-empty
        } catch { }
    };

    const handleCompute = () => {
        const input: CalculationInput = {
            C, S, RA, RA_unit: RAUnit,
            mix_type: mixType,
            A0,
            A_house: scratch.A_house,
            N: scratch.N,
        };
        try {
            setResult(calculate(input));
            setCalculatedInput(input);
        } catch {
            setResult(null);
            setCalculatedInput(null);
        }
    };

    const handleReset = () => {
        persistScratch(DEFAULT_SCRATCH);
        setResult(null);
        setCalculatedInput(null);
        try {
            localStorage.removeItem(fullKey);
            // eslint-disable-next-line no-empty
        } catch { }
    };

    return (
        <div className="border border-brand/20 rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 bg-brand-soft/60 flex items-center gap-1.5">
                <TestTube2 className="h-3.5 w-3.5 text-brand" />
                <span className="font-semibold text-brand-dark text-xs">ทดลองคำนวณผลลัพธ์ (ไม่บันทึกลงระบบ)</span>
            </div>

            <div className="p-3 space-y-3 bg-white">
                <p className="text-[11px] text-slate-500">
                    ใส่จำนวนหลังและพื้นที่ต่อหลังชั่วคราว เพื่อดูตัวอย่างหน้าผลลัพธ์ก่อนบันทึกจริง ค่านี้เก็บไว้ในเครื่องของคุณเท่านั้น
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">พื้นที่ต่อหลัง (ตร.ม.)</Label>
                        <Input
                            type="number"
                            step="any"
                            className="h-8 text-xs bg-white"
                            value={scratch.A_house}
                            onChange={(e) => persistScratch({ ...scratch, A_house: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">จำนวนหลัง (N)</Label>
                        <Input
                            type="number"
                            className="h-8 text-xs bg-white"
                            value={scratch.N}
                            onChange={(e) => persistScratch({ ...scratch, N: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleCompute} className="flex-1 gap-1.5 h-8 text-xs bg-brand hover:bg-brand-dark text-white">
                        <Calculator className="h-3.5 w-3.5" /> คำนวณตัวอย่าง
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={handleReset} className="gap-1.5 h-8 text-xs">
                        <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ต
                    </Button>
                </div>

                {result && calculatedInput && (
                    <div className="pt-1 -mx-1">
                        <ResultsDisplay result={result} input={calculatedInput} resultHelp={resultHelp} />
                    </div>
                )}
            </div>
        </div>
    );
}
