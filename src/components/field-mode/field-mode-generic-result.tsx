'use client';

import { formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { CheckCircle, Printer, Building, MapPin } from 'lucide-react';
import type { FormulaDefinition } from '@/lib/formula-schema';
import type { ComputedVariable } from '@/lib/formula-engine';
import { resolvePrimaryResult } from '@/lib/formula-result';

import { BRAND } from '@/lib/theme';

const { accent: ACCENT, accentDark: ACCENT_DARK, line: LINE, ink: INK, inkMuted: INK_MUTED, cloud: CLOUD } = BRAND;

interface FieldModeGenericResultProps {
    formula: FormulaDefinition;
    computed: ComputedVariable[];
    agency?: string;
    location?: string;
    coords?: { lat: number; lng: number } | null;
}

/**
 * Field Mode's own result renderer for generic-table formulas — same data/logic as
 * GenericFormulaResults, but flat white/green to match this page's theme instead of
 * the violet-fuchsia gradient GenericFormulaResults uses on the landing page.
 */
export function FieldModeGenericResult({ formula, computed, agency, location, coords }: FieldModeGenericResultProps) {
    const inputs = computed.filter(c => c.dependsOn.length === 0);
    const results = computed.filter(c => c.dependsOn.length > 0);
    const finalResult = resolvePrimaryResult(formula, computed);

    const handlePrint = () => window.print();

    const formatVal = (n: number | null) =>
        n === null ? '-' : n % 1 === 0 ? n.toLocaleString('th-TH') : formatNumber(n, 4);

    return (
        <div className="rounded-lg overflow-hidden print:shadow-none" style={{ border: `1px solid ${LINE}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}`, background: CLOUD }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
                        <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold truncate" style={{ color: INK }}>ผลการคำนวณ</h2>
                        <p className="text-[11px] truncate" style={{ color: INK_MUTED }}>{formula.meta.name}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handlePrint} className="print:hidden h-8 px-2" style={{ color: INK_MUTED }}>
                    <Printer className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-3 space-y-4">
                {/* Input Values */}
                {inputs.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: INK_MUTED }}>ค่าตั้งต้น (Input)</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {inputs.map(cv => (
                                <div key={cv.id} className="rounded-lg p-2.5" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                    <div className="font-mono font-bold text-xs" style={{ color: ACCENT_DARK }}>{cv.name}</div>
                                    <div className="text-base font-bold mt-0.5 flex items-center gap-1" style={{ color: INK }}>
                                        {formatVal(cv.computed)}
                                        {cv.unit && <span className="text-[10px] font-normal" style={{ color: INK_MUTED }}>{cv.unit}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Calculation Steps */}
                {results.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: INK_MUTED }}>ขั้นตอนการคำนวณ</h3>
                        <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${LINE}` }}>
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead style={{ background: CLOUD, color: INK_MUTED }}>
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">ตัวแปร</th>
                                        <th className="px-3 py-2 font-semibold">สูตร</th>
                                        <th className="px-3 py-2 font-semibold text-right">ผลลัพธ์</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((cv, i) => (
                                        <tr key={cv.id} style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}>
                                            <td className="px-3 py-2 font-mono font-bold" style={{ color: ACCENT_DARK }}>{cv.name}</td>
                                            <td className="px-3 py-2 font-mono" style={{ color: INK_MUTED }}>{cv.expression}</td>
                                            <td className="px-3 py-2 text-right font-bold font-mono" style={{ color: INK }}>{formatVal(cv.computed)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Final Result */}
                {finalResult && (
                    <div className="rounded-lg p-3" style={{ background: '#fff', border: `1px solid ${LINE}`, borderLeft: `3px solid ${ACCENT}` }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: INK_MUTED }}>ผลลัพธ์สุดท้าย (Final Result)</div>
                        <div className="flex items-end gap-2 mt-1">
                            <span className="text-2xl font-extrabold font-mono" style={{ color: ACCENT_DARK }}>{formatVal(finalResult.computed)}</span>
                            {finalResult.unit && <span className="text-sm font-semibold" style={{ color: INK_MUTED }}>{finalResult.unit}</span>}
                            <span className="text-xs ml-1" style={{ color: INK_MUTED }}>({finalResult.name})</span>
                        </div>
                        <div className="text-[11px] mt-1 font-mono" style={{ color: INK_MUTED }}>{finalResult.expression}</div>
                    </div>
                )}

                {/* Location & Agency Info */}
                {(agency || location || coords) && (
                    <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Building className="h-3.5 w-3.5 shrink-0" style={{ color: INK_MUTED }} />
                            <h4 className="font-semibold text-xs" style={{ color: INK }}>ข้อมูลผู้ใช้งานและสถานที่ปฏิบัติงาน</h4>
                        </div>
                        {agency && <p className="text-xs mb-0.5" style={{ color: INK }}>หน่วยงานผู้ใช้: {agency}</p>}
                        {location && (
                            <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: INK }}>
                                <MapPin className="h-3 w-3 shrink-0" style={{ color: ACCENT }} /> {location}
                            </p>
                        )}
                        {coords && (
                            <p className="text-[10px] font-mono" style={{ color: INK_MUTED }}>
                                พิกัด: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
