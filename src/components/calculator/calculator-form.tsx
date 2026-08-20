'use client';

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
import { Calculator, Loader2, Droplets, Beaker, Zap, MapPin, FlaskConical, Building } from 'lucide-react';
import { ResultsDisplay } from './results-display';
import { GenericFormulaResults } from './generic-formula-results';
import { LabelGuide } from './label-guide';
import { LocationPickerWrapper } from './location-picker-wrapper';
import { useCalculatorEngine } from './use-calculator-engine';
import { PresetCombobox } from './preset-combobox';
import type { FormulaDefinition } from '@/lib/formula-schema';

export function CalculatorForm() {
    const {
        register, setValue, watchedValues, errors,
        result, calculatedInput, genericResult, selectedPreset, selectedFormula,
        genericFormValues, setGenericFormValues, isCalculating, gpsStatus, coords,
        dbPresets, isGenericSelected, CUnit, SUnit,
        requestGPS, handleLocationChange, handlePresetChange, handleRAUnitChange, handleCUnitChange, handleSUnitChange, handleCalculateAndSave, handleReset,
    } = useCalculatorEngine();

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden ring-1 ring-white/20">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-brand/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-brand to-brand flex items-center justify-center shadow-lg shadow-brand/20 animate-pulse-glow">
                        <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-brand to-brand">
                            เครื่องคำนวณผสมสารเคมี
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            กรอกข้อมูลให้ครบ แล้วกด "คำนวณ" เพื่อดูผลลัพธ์
                        </p>
                    </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="space-y-6 relative z-10">
                    {/* 1. Chemical Preset, Agency & Location Guide */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                                    <FlaskConical className="h-4 w-4 text-brand shrink-0" />
                                    เลือกสูตรสารเคมี
                                </Label>
                                <LabelGuide />
                            </div>
                            <PresetCombobox presets={dbPresets} value={selectedPreset} onValueChange={handlePresetChange} />
                        </div>

                        {/* Agency Input (Point 15) */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                                <Building className="h-4 w-4 text-blue-500 shrink-0" />
                                หน่วยงานผู้ใช้
                            </Label>
                            <Input
                                {...register('agency')}
                                placeholder="ระบุหน่วยงาน เช่น รพ.สต. / อบต."
                                className="glass-input h-11 sm:h-12 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-blue-500/20 hover:bg-white/80 transition-all text-xs sm:text-sm"
                            />
                        </div>

                        {/* Location Name */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                                <MapPin className="h-4 w-4 text-brand shrink-0" />
                                สถานที่ปฏิบัติงาน
                            </Label>
                            <div className="relative">
                                <Input
                                    {...register('location')}
                                    placeholder="ชื่อสถานที่จะแสดงอัตโนมัติจากแผนที่"
                                    className="glass-input h-11 sm:h-12 pl-10 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-brand/20 hover:bg-white/80 transition-all text-xs sm:text-sm"
                                />
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Location Map — Full Width */}
                    <LocationPickerWrapper
                        lat={coords?.lat ?? null}
                        lng={coords?.lng ?? null}
                        onLocationChange={handleLocationChange}
                        onRequestGPS={requestGPS}
                        gpsStatus={gpsStatus}
                    />

                    <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />

                    {/* 3. Parameters Input — dynamic fields for generic-table formulas, fixed grid otherwise */}
                    {isGenericSelected && selectedFormula ? (
                        <div className="bento-grid">
                            {selectedFormula.inputs.map((input) => (
                                <div
                                    key={input.name}
                                    className="bento-item bg-brand-soft/50 border-brand-soft p-4 sm:p-5 flex flex-col justify-between"
                                >
                                    <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                        <FlaskConical className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                                        <span>
                                            {input.label || input.name}
                                            {input.unit && <span className="text-slate-400"> ({input.unit})</span>}
                                        </span>
                                    </Label>
                                    {input.type === 'select' && input.options ? (
                                        <Select
                                            onValueChange={(val) =>
                                                setGenericFormValues((prev) => ({ ...prev, [input.name]: val }))
                                            }
                                            value={String(genericFormValues[input.name] ?? '')}
                                        >
                                            <SelectTrigger className="w-full bg-white/60 glass-input font-medium text-slate-700 text-xs sm:text-sm h-11 sm:h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {input.options.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type="number"
                                            step="any"
                                            value={genericFormValues[input.name] ?? ''}
                                            onChange={(e) =>
                                                setGenericFormValues((prev) => ({ ...prev, [input.name]: e.target.value }))
                                            }
                                            className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                    <div className="bento-grid">
                        {/* Number of Houses - Highlighted */}
                        <div className="bento-item bento-item-large bg-linear-to-br from-brand/5 to-brand/5 border-brand/20 p-4 sm:p-5">
                            <Label className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 leading-relaxed">
                                <HomeIcon className="h-5 w-5 text-brand shrink-0" />
                                จำนวนบ้านที่พ่น
                            </Label>
                            <Input
                                type="number"
                                {...register('N', { valueAsNumber: true })}
                                className="glass-input text-2xl sm:text-3xl font-bold h-14 sm:h-16 text-center text-brand-dark bg-white/80 border-brand/20 shadow-inner"
                                placeholder="0"
                            />
                            {errors.N && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.N.message}</p>}
                        </div>

                        {/* Point 1: Ratio C */}
                        <div className="bento-item bg-blue-50/50 border-blue-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Droplets className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <span>ปริมาณสารเคมีที่ระบุข้างขวด</span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.1"
                                    {...register('C', { valueAsNumber: true })}
                                    className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                                />
                                <Select
                                    onValueChange={(val) => handleCUnitChange(val as 'L' | 'cc' | 'part')}
                                    value={CUnit ?? 'part'}
                                >
                                    <SelectTrigger className="w-20 bg-white/60 h-11 sm:h-12 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร</SelectItem>
                                        <SelectItem value="cc">มล.</SelectItem>
                                        {/* สูตรเก่าเก็บเป็นสัดส่วนล้วนโดยไม่มีหน่วยกำกับ */}
                                        <SelectItem value="part">ส่วน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Point 2: Ratio S */}
                        <div className="bento-item bg-sky-50/50 border-sky-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Beaker className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                                <span>
                                    {(watchedValues.mix_type || 1) === 2
                                        ? 'ปริมาณตัวทำละลายที่ระบุข้างขวด (น้ำมัน/น้ำ)'
                                        : 'ปริมาณรวมสุทธิที่ระบุข้างขวด (ผสมให้ได้เท่าไร)'}
                                </span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.1"
                                    {...register('S', { valueAsNumber: true })}
                                    className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                                />
                                <Select
                                    onValueChange={(val) => handleSUnitChange(val as 'L' | 'cc' | 'part')}
                                    value={SUnit ?? 'part'}
                                >
                                    <SelectTrigger className="w-20 bg-white/60 h-11 sm:h-12 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร</SelectItem>
                                        <SelectItem value="cc">มล.</SelectItem>
                                        {/* สูตรเก่าเก็บเป็นสัดส่วนล้วนโดยไม่มีหน่วยกำกับ */}
                                        <SelectItem value="part">ส่วน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Mix Type */}
                        <div className="bento-item bg-brand-soft/50 border-brand-soft p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <FlaskConical className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                                <span>ประเภทการผสม</span>
                            </Label>
                            <div className="flex gap-2 h-11 sm:h-12 w-full mt-1">
                                <Select
                                    onValueChange={(val) => setValue('mix_type', parseInt(val))}
                                    value={String(watchedValues.mix_type || 1)}
                                >
                                    <SelectTrigger className="w-full bg-white/60 glass-input font-medium text-slate-700 text-xs sm:text-sm h-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้ (ได้สุทธิ)</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ (นำไปทบ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Point 3: Spray Rate */}
                        <div className="bento-item bg-amber-50/50 border-amber-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>ฉีดพ่นในอัตรา</span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('RA', { valueAsNumber: true })}
                                    className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                                />
                                <Select
                                    onValueChange={(val) => handleRAUnitChange(val as 'L' | 'cc')}
                                    value={watchedValues.RA_unit}
                                >
                                    <SelectTrigger className="w-20 bg-white/60 h-11 sm:h-12 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร</SelectItem>
                                        <SelectItem value="cc">มล.</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Point 3b: Reference area — the second half of the label's spray rate.
                            "20 มล. ต่อพื้นที่ 100 ตร.ม." คือ RA คู่กับ A0 แสดงแยกกันไม่ได้
                            เพราะอัตราการพ่นไม่มีความหมายถ้าไม่รู้ว่าต่อพื้นที่เท่าไร */}
                        <div className="bento-item bg-amber-50/50 border-amber-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>ต่อพื้นที่ที่ระบุข้างขวด (ตารางเมตร)</span>
                            </Label>
                            <Input
                                type="number"
                                step="1"
                                {...register('A0', { valueAsNumber: true })}
                                className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                            />
                        </div>

                        {/* Point 4: Area per House */}
                        <div className="bento-item bg-slate-50/50 border-slate-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed min-h-[2.5rem]">
                                <span>พื้นที่ต่อ 1 หลัง (ตารางเมตร)</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('A_house', { valueAsNumber: true })}
                                className="glass-input text-base sm:text-lg text-center bg-white/40 text-slate-500 h-11 sm:h-12"
                            />
                        </div>

                        {/* Point 5: Target Volume */}
                        <div className="bento-item bg-teal-50/50 border-teal-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <FlaskConical className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                                <span>ปริมาณสารเคมีสำหรับพ่นที่ต้องการ (สารเคมี+น้ำมัน/น้ำ) (ลิตร)</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                {...register('targetVolume', { valueAsNumber: true })}
                                className="glass-input text-lg sm:text-xl text-center font-bold bg-white/60 text-teal-700 h-11 sm:h-12"
                            />
                        </div>
                    </div>
                    )}

                    {/* Visual Math Builder removed */}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 animate-fade-up">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            ล้างค่า
                        </Button>

                        <Button
                            type="button"
                            size="lg"
                            onClick={handleCalculateAndSave}
                            disabled={isCalculating}
                            className="bg-linear-to-r from-brand to-brand hover:from-brand hover:to-brand-dark text-white shadow-lg shadow-brand/20 rounded-xl transition-all hover:scale-105"
                        >
                            {isCalculating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังคำนวณ...
                                </>
                            ) : (
                                <>
                                    <Calculator className="mr-2 h-5 w-5" />
                                    คำนวณ
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Results Display — only shown after clicking "คำนวณ" */}
            {genericResult && selectedFormula?.meta.resultTemplate === 'generic-table' && (
                <GenericFormulaResults
                    formula={selectedFormula}
                    computed={genericResult}
                    agency={watchedValues.agency}
                    location={watchedValues.location}
                    coords={coords}
                />
            )}
            {result && calculatedInput && (
                <ResultsDisplay
                    result={result}
                    input={calculatedInput}
                    agency={watchedValues.agency}
                    location={watchedValues.location}
                    coords={coords}
                    resultHelp={dbPresets.find(p => String(p.id) === selectedPreset)?.resultHelp}
                />
            )}
        </div>
    );
}

// Icon helper
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    )
}
