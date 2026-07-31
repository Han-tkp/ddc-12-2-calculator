'use client';

import { useState } from 'react';
import { AiMcpChatbot, formulaSchemaToVariables, type FormulaSchema } from '@/components/ai/ai-mcp-chatbot';
import { FreeFormulaCalculator } from '@/components/calculator/free-formula-calculator';
import type { FormulaVariable } from '@/lib/formula-engine';
import { Calculator, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminMCPPage() {
    const [calcVars, setCalcVars] = useState<FormulaVariable[] | null>(null);
    const [calcKey, setCalcKey] = useState(0);
    const [showCalc, setShowCalc] = useState(false);

    const handleSendToCalculator = (formula: FormulaSchema) => {
        setCalcVars(formulaSchemaToVariables(formula));
        setCalcKey((k) => k + 1);
        if (!showCalc) setShowCalc(true);
    };

    const handleSendFileToCalculator = (vars: FormulaVariable[]) => {
        setCalcVars(vars);
        setCalcKey((k) => k + 1);
        if (!showCalc) setShowCalc(true);
    };

    return (
        <div className="pb-4 h-[calc(100vh-5rem)] flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-600" />
                    <h1 className="text-lg font-bold text-slate-800">AI Chatbot</h1>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCalc(!showCalc)}
                    className="h-8 text-xs gap-1.5 text-slate-500 rounded-xl"
                >
                    {showCalc ? (
                        <><ChevronUp className="h-3.5 w-3.5" /> ซ่อนเครื่องคำนวณ</>
                    ) : (
                        <><Calculator className="h-3.5 w-3.5" /> เปิดเครื่องคำนวณ</>
                    )}
                </Button>
            </div>

            {/* Chatbot — full width, fills remaining space */}
            <div className={`flex-1 min-h-0 ${showCalc ? 'h-1/2' : ''} transition-all duration-300`}>
                <AiMcpChatbot onSendToCalculator={handleSendToCalculator} onSendFileToCalculator={handleSendFileToCalculator} />
            </div>

            {/* Calculator — slides in below when opened */}
            {showCalc && (
                <div className="mt-4 flex flex-col min-h-0 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Calculator className="h-4 w-4 text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-800">เครื่องคำนวณสูตร</h2>
                        {calcVars && (
                            <span className="text-[11px] text-slate-400 ml-auto">
                                รับข้อมูลจาก chatbot แล้ว — แก้ไขได้ตามต้องการ
                            </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setShowCalc(false)} className="h-7 text-xs gap-1 text-slate-400 hover:text-slate-600">
                            <ChevronDown className="h-3.5 w-3.5" /> ย่อ
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <FreeFormulaCalculator
                            key={calcKey}
                            initialVariables={calcVars ?? undefined}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
