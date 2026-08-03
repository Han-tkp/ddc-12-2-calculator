'use client';

import { formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, Printer, Building, MapPin } from 'lucide-react';
import type { FormulaDefinition } from '@/lib/formula-schema';
import type { ComputedVariable } from '@/lib/formula-engine';
import { resolvePrimaryResult } from '@/lib/formula-result';

interface GenericFormulaResultsProps {
    formula: FormulaDefinition;
    computed: ComputedVariable[];
    agency?: string;
    location?: string;
    coords?: { lat: number; lng: number } | null;
}

export function GenericFormulaResults({ formula, computed, agency, location, coords }: GenericFormulaResultsProps) {
    const inputs = computed.filter(c => c.dependsOn.length === 0);
    const results = computed.filter(c => c.dependsOn.length > 0);
    const finalResult = resolvePrimaryResult(formula, computed);

    const handlePrint = () => window.print();

    const formatVal = (n: number | null) =>
        n === null ? '-' : n % 1 === 0 ? n.toLocaleString('th-TH') : formatNumber(n, 4);

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-bounce-in print:shadow-none">
            {/* Header */}
            <div className="relative bg-linear-to-r from-brand/60 via-brand to-brand p-6">
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
                            <p className="text-white/80 text-sm">{formula.meta.name}</p>
                        </div>
                    </div>
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

            <div className="p-4 sm:p-6">
                {/* Input Values */}
                {inputs.length > 0 && (
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ค่าตั้งต้น (Input)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {inputs.map(cv => (
                                <div key={cv.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <div className="font-mono text-brand font-bold text-xs">{cv.name}</div>
                                    <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                                        {formatVal(cv.computed)}
                                        {cv.unit && <span className="text-[11px] font-normal text-slate-400">{cv.unit}</span>}
                                    </div>
                                    {cv.description && (
                                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{cv.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Calculation Steps */}
                {results.length > 0 && (
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ขั้นตอนการคำนวณ</h3>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-3 sm:px-4 py-2.5 font-semibold">ตัวแปร</th>
                                        <th className="px-3 sm:px-4 py-2.5 font-semibold">สูตร</th>
                                        <th className="px-3 sm:px-4 py-2.5 font-semibold text-right">ผลลัพธ์</th>
                                        <th className="px-3 sm:px-4 py-2.5 font-semibold">หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map(cv => (
                                        <tr key={cv.id} className="hover:bg-slate-50/50">
                                            <td className="px-3 sm:px-4 py-2.5 font-mono font-bold text-brand-dark">{cv.name}</td>
                                            <td className="px-3 sm:px-4 py-2.5 font-mono text-slate-500">{cv.expression}</td>
                                            <td className="px-3 sm:px-4 py-2.5 text-right font-bold text-slate-900">{formatVal(cv.computed)}</td>
                                            <td className="px-3 sm:px-4 py-2.5 text-slate-400">{cv.unit || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Final Result */}
                {finalResult && (
                    <div className="bg-brand rounded-2xl p-4 text-white">
                        <div className="text-xs text-brand-soft font-semibold uppercase tracking-wider">ผลลัพธ์สุดท้าย (Final Result)</div>
                        <div className="flex items-end gap-3 mt-1">
                            <span className="text-3xl font-extrabold font-mono">{formatVal(finalResult.computed)}</span>
                            {finalResult.unit && <span className="text-lg font-semibold text-brand-soft">{finalResult.unit}</span>}
                            <span className="text-sm text-brand-soft ml-2">({finalResult.name})</span>
                        </div>
                        <div className="text-xs text-brand-soft mt-1 font-mono">{finalResult.expression}</div>
                    </div>
                )}

                {/* Location & Agency Info */}
                {(agency || location || coords) && (
                    <div className="mt-4 p-4 glass-card rounded-2xl border border-brand-soft/50 bg-brand-soft/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-brand shrink-0" />
                            <h4 className="font-semibold text-xs sm:text-sm text-slate-700">ข้อมูลผู้ใช้งานและสถานที่ปฏิบัติงาน</h4>
                        </div>
                        {agency && (
                            <p className="text-xs sm:text-sm font-medium text-slate-800 mb-1">🏢 หน่วยงานผู้ใช้: {agency}</p>
                        )}
                        {location && (
                            <p className="text-xs sm:text-sm font-medium text-slate-800 mb-1">📍 สถานที่ปฏิบัติงาน: {location}</p>
                        )}
                        {coords && (
                            <p className="text-[11px] sm:text-xs text-slate-400">
                                พิกัด: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
