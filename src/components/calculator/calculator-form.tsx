'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculationSchema } from '@/lib/validations';
import { calculate, CalculationInput, CalculationResult } from '@/lib/calculations';
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
import { toast } from 'sonner';
import { ResultsDisplay } from './results-display';
import { CHEMICAL_PRESETS } from '@/lib/constants';
import { LabelGuide } from './label-guide';
import { LocationPickerWrapper } from './location-picker-wrapper';
import { PublicFormulaManager } from './public-formula-manager';

// Extended types for form
interface ExtendedCalculationInput extends CalculationInput {
    location?: string;
    agency?: string;
    chemical?: string;
}

export function CalculatorForm() {
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [calculatedInput, setCalculatedInput] = useState<CalculationInput | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        getValues,
        trigger,
        reset,
        formState: { errors },
    } = useForm<ExtendedCalculationInput>({
        resolver: zodResolver(calculationSchema),
        defaultValues: {
            C: 0,
            S: 0,
            RA: 0,
            RA_unit: 'L',
            A0: 1000,
            A_house: 100,
            N: 0,
            mix_type: 1,
            targetVolume: 1,
            location: '',
            agency: '',
            chemical: '',
        },
    });

    // GPS: Request current position
    const requestGPS = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            return;
        }
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setGpsStatus('success');
            },
            () => {
                setGpsStatus('error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // Auto-capture GPS on mount
    useEffect(() => {
        requestGPS();
    }, [requestGPS]);

    // Handle location change from mini map (pin drag / click / GPS)
    const handleLocationChange = useCallback((lat: number, lng: number, placeName: string) => {
        setCoords({ lat, lng });
        if (placeName) {
            setValue('location', placeName);
        }
    }, [setValue]);

    // Watch for preset and RA_unit select
    const watchedValues = watch();

    // Fetch profiles from database on mount (fallback to CHEMICAL_PRESETS if DB is empty)
    const [dbPresets, setDbPresets] = useState<any[]>(CHEMICAL_PRESETS);

    const loadProfiles = useCallback(async () => {
        try {
            const res = await fetch('/api/profiles');
            if (res.ok) {
                const profiles = await res.json();
                if (Array.isArray(profiles) && profiles.length > 0) {
                    const formattedProfiles = profiles.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        C: p.C,
                        S: p.S,
                        RA: p.RA,
                        RA_unit: p.RA_unit,
                        mix_type: p.mix_type,
                        A0: p.A0,
                        A_house: 100
                    }));
                    const otherPreset = CHEMICAL_PRESETS.find(p => p.id === 'other');
                    setDbPresets([...formattedProfiles, otherPreset]);
                } else {
                    setDbPresets(CHEMICAL_PRESETS);
                }
            }
        } catch (error) {
            console.error('Failed to fetch profiles:', error);
            setDbPresets(CHEMICAL_PRESETS);
        }
    }, []);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    // 1. Handle Preset Selection
    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        setResult(null); // Clear results when changing preset
        setCalculatedInput(null);
        const preset = dbPresets.find(p => String(p.id) === presetId);

        if (preset) {
            if (preset.id !== 'other') {
                setValue('C', preset.C);
                setValue('S', preset.S);
                setValue('RA', preset.RA);
                setValue('RA_unit', preset.RA_unit);
                setValue('A0', preset.A0);
                if ((preset as any).mix_type) {
                    setValue('mix_type', (preset as any).mix_type);
                } else {
                    setValue('mix_type', 1);
                }
                setValue('chemical', preset.name);
            } else {
                setValue('chemical', 'อื่นๆ');
            }
            setValue('A_house', preset.A_house);
        }
    };

    // 2. Calculate AND Save on button click (single action)
    const handleCalculateAndSave = async () => {
        const isValid = await trigger(['C', 'S', 'RA', 'RA_unit', 'A0', 'A_house', 'N', 'targetVolume']);
        if (!isValid) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        const values = getValues();
        setIsCalculating(true);
        try {
            // Determine chemical name
            const chemName = selectedPreset && selectedPreset !== 'other'
                ? (dbPresets.find(p => String(p.id) === selectedPreset)?.name || values.chemical)
                : (values.chemical || 'อื่นๆ');

            // Step 1: Calculate
            const input: ExtendedCalculationInput = {
                C: Number(values.C),
                S: Number(values.S),
                RA: Number(values.RA),
                RA_unit: values.RA_unit as 'L' | 'cc',
                mix_type: Number(values.mix_type) || 1,
                A0: Number(values.A0),
                A_house: Number(values.A_house),
                N: Number(values.N),
                targetVolume: Number(values.targetVolume) || 1,
                chemical: chemName,
                agency: values.agency,
                location: values.location,
            };
            const calculatedResult = calculate(input);
            setResult(calculatedResult);
            setCalculatedInput(input);

            // Step 2: Save to DB (auto-log with GPS)
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    chemical: chemName,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                }),
            });

            toast.success('คำนวณและบันทึกเรียบร้อย!');
        } catch (e) {
            setResult(null);
            setCalculatedInput(null);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleReset = () => {
        reset();
        setResult(null);
        setCalculatedInput(null);
        setSelectedPreset('');
        toast.info('ล้างข้อมูลแล้ว');
    };

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden ring-1 ring-white/20">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-violet-500/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 animate-pulse-glow">
                        <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-600 to-fuchsia-600">
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
                                    <FlaskConical className="h-4 w-4 text-violet-500 shrink-0" />
                                    เลือกสูตรสารเคมี
                                </Label>
                                <LabelGuide />
                            </div>
                            <Select onValueChange={handlePresetChange} value={selectedPreset}>
                                <SelectTrigger className="glass-input h-11 sm:h-12 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-violet-500/20 hover:bg-white/80 transition-all text-xs sm:text-sm">
                                    <SelectValue placeholder="เลือกสูตร..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {dbPresets.map((preset) => (
                                        <SelectItem key={preset.id} value={String(preset.id)}>
                                            <span className="font-medium text-xs sm:text-sm">{preset.name}</span>
                                            {preset.id !== 'other' && (
                                                <span className="text-[11px] text-slate-400 ml-2">
                                                    ({preset.C}:{preset.S})
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                <MapPin className="h-4 w-4 text-pink-500 shrink-0" />
                                สถานที่ปฏิบัติงาน
                            </Label>
                            <div className="relative">
                                <Input
                                    {...register('location')}
                                    placeholder="ชื่อสถานที่จะแสดงอัตโนมัติจากแผนที่"
                                    className="glass-input h-11 sm:h-12 pl-10 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-pink-500/20 hover:bg-white/80 transition-all text-xs sm:text-sm"
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

                    {/* 3. Parameters Input (Bento Grid) */}
                    <div className="bento-grid">
                        {/* Number of Houses - Highlighted */}
                        <div className="bento-item bento-item-large bg-linear-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-200/50 p-4 sm:p-5">
                            <Label className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 leading-relaxed">
                                <HomeIcon className="h-5 w-5 text-violet-600 shrink-0" />
                                จำนวนบ้านที่พ่น (N)
                            </Label>
                            <Input
                                type="number"
                                {...register('N', { valueAsNumber: true })}
                                className="glass-input text-2xl sm:text-3xl font-bold h-14 sm:h-16 text-center text-violet-700 bg-white/80 border-violet-200 shadow-inner"
                                placeholder="0"
                            />
                            {errors.N && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.N.message}</p>}
                        </div>

                        {/* Point 1: Ratio C */}
                        <div className="bento-item bg-blue-50/50 border-blue-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Droplets className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <span>ปริมาณสารเคมีที่ระบุข้างขวด (มิลลิลิตร)</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                {...register('C', { valueAsNumber: true })}
                                className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                            />
                        </div>

                        {/* Point 2: Ratio S */}
                        <div className="bento-item bg-sky-50/50 border-sky-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <Beaker className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                                <span>ปริมาณตัวทำละลายที่ระบุข้างขวด (น้ำมัน/น้ำ) (ลิตร)</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                {...register('S', { valueAsNumber: true })}
                                className="glass-input text-lg sm:text-xl text-center font-semibold bg-white/60 h-11 sm:h-12"
                            />
                        </div>

                        {/* Mix Type */}
                        <div className="bento-item bg-fuchsia-50/50 border-fuchsia-100 p-4 sm:p-5 flex flex-col justify-between">
                            <Label className="flex items-start gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed min-h-[2.5rem]">
                                <FlaskConical className="h-4 w-4 text-fuchsia-500 shrink-0 mt-0.5" />
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
                                    onValueChange={(val) => setValue('RA_unit', val as 'L' | 'cc')}
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
                            className="bg-linear-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all hover:scale-105"
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
            {result && calculatedInput && (
                <ResultsDisplay
                    result={result}
                    input={calculatedInput}
                    agency={watchedValues.agency}
                    location={watchedValues.location}
                    coords={coords}
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
