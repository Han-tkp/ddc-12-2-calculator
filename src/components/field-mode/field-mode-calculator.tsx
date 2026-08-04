'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Calculator,
    Loader2,
    MapPin,
    ChevronDown,
    ChevronUp,
    History,
    FlaskConical,
    Search,
    Settings as SettingsIcon,
} from 'lucide-react';
import { useCalculatorEngine } from '@/components/calculator/use-calculator-engine';
import { LocationPickerWrapper } from '@/components/calculator/location-picker-wrapper';
import { ResultsDisplay } from '@/components/calculator/results-display';
import { FieldModeGenericResult } from './field-mode-generic-result';

import { BRAND } from '@/lib/theme';

const { accent: ACCENT, accentDark: ACCENT_DARK, line: LINE, ink: INK, inkMuted: INK_MUTED, cloud: CLOUD } = BRAND;

function ComingSoonTab({ icon: Icon, label }: { icon: typeof History; label: string }) {
    return (
        <button
            type="button"
            onClick={() => toast.info(`${label} — เร็วๆ นี้`)}
            className="flex-1 flex flex-col items-center gap-1 py-1 text-[10px]"
            style={{ color: INK_MUTED }}
        >
            <Icon className="h-5 w-5" />
            {label}
        </button>
    );
}

export function FieldModeCalculator() {
    const {
        register, setValue, watchedValues, errors,
        result, calculatedInput, genericResult, selectedPreset, selectedFormula,
        genericFormValues, setGenericFormValues, isCalculating, gpsStatus, coords,
        dbPresets, isGenericSelected,
        requestGPS, handleLocationChange, handlePresetChange, handleCalculateAndSave, handleReset,
    } = useCalculatorEngine();

    const [mapOpen, setMapOpen] = useState(false);
    const [presetQuery, setPresetQuery] = useState('');

    const visiblePresets = presetQuery.trim()
        ? dbPresets.filter((p) => p.name?.toLowerCase().includes(presetQuery.trim().toLowerCase()))
        : dbPresets;

    const gpsLabel = gpsStatus === 'success' ? 'GPS OK' : gpsStatus === 'loading' ? 'กำลังหา GPS...' : gpsStatus === 'error' ? 'GPS ไม่พร้อม' : 'GPS';
    const gpsDotColor = gpsStatus === 'success' ? ACCENT : gpsStatus === 'error' ? '#b42318' : '#b45309';

    return (
        <div className="min-h-screen flex justify-center" style={{ background: CLOUD }}>
            <div
                className="w-full max-w-md min-h-screen flex flex-col bg-white"
                style={{ borderLeft: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}
            >
                {/* Top bar */}
                <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ borderBottom: `1px solid ${LINE}` }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-7 h-7 shrink-0">
                            <Image src="/logo-vbdc2.png" alt="ตราสัญลักษณ์กระทรวงสาธารณสุข" fill sizes="28px" className="object-contain" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: INK }}>คำนวณสาร</div>
                            <div className="text-[10px] truncate" style={{ color: INK_MUTED }}>กรมควบคุมโรค เขต 12</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestGPS}
                        className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded shrink-0"
                        style={{ border: `1px solid ${LINE}`, color: INK_MUTED }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: gpsDotColor }} />
                        {gpsLabel}
                    </button>
                </div>

                {/* Chemical picker: one search box + chips. The preset list grows as
                    officers add formulas, so scrolling a chip row alone stops scaling. */}
                <div className="px-4 py-3 shrink-0 space-y-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
                    <div className="relative">
                        <Search
                            className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: INK_MUTED }}
                        />
                        <input
                            type="search"
                            value={presetQuery}
                            onChange={(e) => setPresetQuery(e.target.value)}
                            placeholder="ค้นหาสารเคมี..."
                            className="w-full h-9 pl-8 pr-3 text-xs rounded-md bg-white outline-none focus:ring-2 focus:ring-offset-0"
                            style={{ border: `1px solid ${LINE}`, color: INK }}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto">
                        {visiblePresets.map((preset) => {
                            const active = String(preset.id) === selectedPreset;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handlePresetChange(String(preset.id))}
                                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap"
                                    style={active
                                        ? { background: '#fff', color: ACCENT, border: `1px solid ${ACCENT}`, fontWeight: 700 }
                                        : { background: '#fff', color: INK_MUTED, border: `1px solid ${LINE}` }
                                    }
                                >
                                    {preset.name}
                                </button>
                            );
                        })}
                        {visiblePresets.length === 0 && (
                            <span className="text-xs py-1.5" style={{ color: INK_MUTED }}>
                                ไม่พบสารเคมีที่ค้นหา
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {/* Collapsible location */}
                    <div className="rounded-lg" style={{ border: `1px solid ${LINE}` }}>
                        <button
                            type="button"
                            onClick={() => setMapOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs"
                            style={{ color: INK_MUTED }}
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {watchedValues.location || 'แตะเพื่อเลือกตำแหน่งปฏิบัติงาน'}
                            </span>
                            {mapOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                        {mapOpen && (
                            <div className="px-3 pb-3 space-y-2">
                                <Input
                                    {...register('agency')}
                                    placeholder="หน่วยงานผู้ใช้ เช่น รพ.สต. / อบต."
                                    className="h-10 text-xs"
                                />
                                <LocationPickerWrapper
                                    lat={coords?.lat ?? null}
                                    lng={coords?.lng ?? null}
                                    onLocationChange={handleLocationChange}
                                    onRequestGPS={requestGPS}
                                    gpsStatus={gpsStatus}
                                />
                            </div>
                        )}
                    </div>

                    {/* Input fields */}
                    {isGenericSelected && selectedFormula ? (
                        <div className="grid grid-cols-2 gap-2">
                            {selectedFormula.inputs.map((input) => (
                                <div key={input.name} className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                    <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>
                                        {input.label || input.name}
                                        {input.unit && <span> ({input.unit})</span>}
                                    </label>
                                    {input.type === 'select' && input.options ? (
                                        <Select
                                            onValueChange={(val) => setGenericFormValues((prev) => ({ ...prev, [input.name]: val }))}
                                            value={String(genericFormValues[input.name] ?? '')}
                                        >
                                            <SelectTrigger className="h-10 text-xs bg-white">
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
                                            onChange={(e) => setGenericFormValues((prev) => ({ ...prev, [input.name]: e.target.value }))}
                                            className="h-10 text-sm font-mono font-semibold bg-white"
                                            style={{ color: ACCENT }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-xs mb-1.5 font-medium" style={{ color: INK }}>จำนวนบ้านที่พ่น (N)</label>
                                <Input
                                    type="number"
                                    {...register('N', { valueAsNumber: true })}
                                    className="h-12 text-2xl font-mono font-bold text-center bg-white"
                                    style={{ color: ACCENT }}
                                    placeholder="0"
                                />
                                {errors.N && <p className="text-[11px] mt-1" style={{ color: '#b42318' }}>{errors.N.message}</p>}
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>สารเคมี (มล.)</label>
                                <Input type="number" step="0.1" {...register('C', { valueAsNumber: true })} className="h-10 text-sm font-mono font-semibold bg-white" />
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>ตัวทำละลาย (ลิตร)</label>
                                <Input type="number" step="0.1" {...register('S', { valueAsNumber: true })} className="h-10 text-sm font-mono font-semibold bg-white" />
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>ประเภทการผสม</label>
                                <Select
                                    onValueChange={(val) => setValue('mix_type', parseInt(val))}
                                    value={String(watchedValues.mix_type || 1)}
                                >
                                    <SelectTrigger className="h-10 text-xs bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">ผสมให้ได้</SelectItem>
                                        <SelectItem value="2">ผสมกับ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>อัตราพ่น</label>
                                <div className="flex gap-1">
                                    <Input type="number" step="0.01" {...register('RA', { valueAsNumber: true })} className="h-10 text-sm font-mono font-semibold bg-white" />
                                    <Select onValueChange={(val) => setValue('RA_unit', val as 'L' | 'cc')} value={watchedValues.RA_unit}>
                                        <SelectTrigger className="w-16 h-10 text-xs bg-white shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">ลิตร</SelectItem>
                                            <SelectItem value="cc">มล.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>พื้นที่ต่อ 1 หลัง (ตร.ม.)</label>
                                <Input type="number" {...register('A_house', { valueAsNumber: true })} className="h-10 text-sm font-mono font-semibold bg-white" />
                            </div>
                            <div className="rounded-lg p-3" style={{ background: CLOUD, border: `1px solid ${LINE}` }}>
                                <label className="block text-[10px] mb-1.5" style={{ color: INK_MUTED }}>ปริมาณที่ต้องการ (ลิตร)</label>
                                <Input type="number" step="0.1" min="0.1" {...register('targetVolume', { valueAsNumber: true })} className="h-10 text-sm font-mono font-semibold bg-white" />
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {genericResult && selectedFormula?.meta.resultTemplate === 'generic-table' && (
                        <FieldModeGenericResult
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
                            resultHelp={dbPresets.find((p) => String(p.id) === selectedPreset)?.resultHelp}
                        />
                    )}
                </div>

                {/* Sticky action bar */}
                <div className="flex gap-2 px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${LINE}` }}>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="rounded-lg"
                        style={{ borderColor: LINE, color: INK_MUTED }}
                    >
                        ล้างค่า
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCalculateAndSave}
                        disabled={isCalculating}
                        className="flex-1 rounded-lg text-white"
                        style={{ background: ACCENT }}
                    >
                        {isCalculating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังคำนวณ...</>
                        ) : (
                            <><Calculator className="mr-2 h-4 w-4" />คำนวณ</>
                        )}
                    </Button>
                </div>

                {/* Bottom tab bar */}
                <div className="flex px-2 py-2 shrink-0" style={{ borderTop: `1px solid ${LINE}` }}>
                    <button
                        type="button"
                        className="flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold"
                        style={{ color: ACCENT }}
                    >
                        <Calculator className="h-5 w-5" />
                        คำนวณ
                    </button>
                    <ComingSoonTab icon={History} label="ประวัติ" />
                    <ComingSoonTab icon={FlaskConical} label="สูตรของฉัน" />
                    <ComingSoonTab icon={SettingsIcon} label="ตั้งค่า" />
                </div>
            </div>
        </div>
    );
}
