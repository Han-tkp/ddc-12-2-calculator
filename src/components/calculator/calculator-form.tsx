'use client';

import { useState, useEffect } from 'react';
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
import { Calculator, Loader2, Droplets, Beaker, Zap, Save, MapPin, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { ResultsDisplay } from './results-display';
import { CHEMICAL_PRESETS } from '@/lib/constants';
import { LabelGuide } from './label-guide';

// Extended types for form
interface ExtendedCalculationInput extends CalculationInput {
    location?: string;
    chemical?: string;
}

export function CalculatorForm() {
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
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
            location: '',
            chemical: '',
        },
    });

    // Watch all values for real-time calculation
    const watchedValues = watch();

    // 1. Handle Preset Selection
    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = CHEMICAL_PRESETS.find(p => p.id === presetId);

        if (preset) {
            if (preset.id !== 'other') {
                setValue('C', preset.C);
                setValue('S', preset.S);
                setValue('RA', preset.RA);
                setValue('RA_unit', preset.RA_unit);
                setValue('A0', preset.A0);
                setValue('chemical', preset.name);
            } else {
                setValue('chemical', 'อื่นๆ');
            }
            // A_house usually stays consistent
            setValue('A_house', preset.A_house);
        }
    };

    // 2. Real-time Calculation Effect
    useEffect(() => {
        // Calculate only if we have minimum valid inputs
        if (watchedValues.N > 0 && watchedValues.C > 0 && watchedValues.S > 0) {
            try {
                const input: CalculationInput = {
                    C: Number(watchedValues.C),
                    S: Number(watchedValues.S),
                    RA: Number(watchedValues.RA),
                    RA_unit: watchedValues.RA_unit as 'L' | 'cc',
                    A0: Number(watchedValues.A0),
                    A_house: Number(watchedValues.A_house),
                    N: Number(watchedValues.N),
                };
                const calculatedResult = calculate(input);
                setResult(calculatedResult);
            } catch (e) {
                setResult(null);
            }
        } else {
            setResult(null);
        }
    }, [
        watchedValues.C, watchedValues.S, watchedValues.RA, watchedValues.RA_unit,
        watchedValues.A0, watchedValues.A_house, watchedValues.N
    ]);

    // 3. Save Function
    const onSave = async (data: ExtendedCalculationInput) => {
        if (!result) return;

        setIsSaving(true);
        try {
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    chemical: selectedPreset !== 'other'
                        ? CHEMICAL_PRESETS.find(p => p.id === selectedPreset)?.name
                        : 'อื่นๆ',
                }),
            });
            toast.success('บันทึกข้อมูลเรียบร้อย!');
            // Optional: Reset form after success? Or keep it? keeping it is usually better for sequential entries.
        } catch (error) {
            console.error('Save failed', error);
            toast.error('บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        reset();
        setResult(null);
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
                            เลือกสูตรและกรอกจำนวนเพื่อคำนวณอัตโนมัติ
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSave)} className="space-y-6 relative z-10">
                    {/* 1. Location & Chemical Selection */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-violet-500" />
                                    เลือกสูตรสารเคมี
                                </Label>
                                <LabelGuide />
                            </div>
                            <Select onValueChange={handlePresetChange} value={selectedPreset}>
                                <SelectTrigger className="glass-input h-12 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-violet-500/20 hover:bg-white/80 transition-all">
                                    <SelectValue placeholder="เลือกสูตร..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CHEMICAL_PRESETS.map((preset) => (
                                        <SelectItem key={preset.id} value={preset.id}>
                                            <span className="font-medium">{preset.name}</span>
                                            <span className="text-xs text-slate-400 ml-2">({preset.formula})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-pink-500" />
                                สถานที่ปฏิบัติงาน (ระบุหมู่บ้าน/พื้นที่)
                            </Label>
                            <div className="relative">
                                <Input
                                    {...register('location')}
                                    placeholder="เช่น ม.5 บ้านหนองหอย"
                                    className="glass-input h-12 pl-10 bg-white/50 backdrop-blur-sm border-slate-200/50 focus:ring-pink-500/20 hover:bg-white/80 transition-all"
                                />
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent my-6" />

                    {/* 2. Parameters Input (Bento Grid) */}
                    <div className="bento-grid">
                        {/* Number of Houses - Highlighted */}
                        <div className="bento-item bento-item-large bg-linear-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-200/50">
                            <Label className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-4">
                                <HomeIcon className="h-5 w-5 text-violet-600" />
                                จำนวนบ้านที่พ่น (N)
                            </Label>
                            <Input
                                type="number"
                                {...register('N', { valueAsNumber: true })}
                                className="glass-input text-3xl font-bold h-16 text-center text-violet-700 bg-white/80 border-violet-200 shadow-inner"
                                placeholder="0"
                            />
                            {errors.N && <p className="text-red-500 text-sm mt-1">{errors.N.message}</p>}
                        </div>

                        {/* Ratio C */}
                        <div className="bento-item bg-blue-50/50 border-blue-100">
                            <Label className="flex items-center gap-2 mb-2">
                                <Droplets className="h-4 w-4 text-blue-500" />
                                ปริมาณสารเคมี (C)
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                {...register('C', { valueAsNumber: true })}
                                className="glass-input text-xl text-center font-semibold bg-white/60"
                            />
                        </div>

                        {/* Ratio S */}
                        <div className="bento-item bg-sky-50/50 border-sky-100">
                            <Label className="flex items-center gap-2 mb-2">
                                <Beaker className="h-4 w-4 text-sky-500" />
                                ปริมาณตัวผสม (น้ำมัน/น้ำ) (S)
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                {...register('S', { valueAsNumber: true })}
                                className="glass-input text-xl text-center font-semibold bg-white/60"
                            />
                        </div>

                        {/* Spray Rate */}
                        <div className="bento-item bg-amber-50/50 border-amber-100">
                            <Label className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                อัตราการไหล (RA)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('RA', { valueAsNumber: true })}
                                    className="glass-input text-xl text-center font-semibold bg-white/60"
                                />
                                <Select
                                    onValueChange={(val) => setValue('RA_unit', val as 'L' | 'cc')}
                                    defaultValue={watchedValues.RA_unit}
                                >
                                    <SelectTrigger className="w-20 bg-white/60">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร</SelectItem>
                                        <SelectItem value="cc">cc</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Area per House */}
                        <div className="bento-item bg-slate-50/50 border-slate-100">
                            <Label className="flex items-center gap-2 mb-2 text-slate-500">
                                พื้นที่ต่อ 1 หลัง
                            </Label>
                            <Input
                                type="number"
                                {...register('A_house', { valueAsNumber: true })}
                                className="glass-input text-lg text-center bg-white/40 text-slate-500"
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

                        {result && (
                            <Button
                                type="submit"
                                disabled={isSaving}
                                size="lg"
                                className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all hover:scale-105"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        บันทึกข้อมูล
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* Results Display */}
            {result && <ResultsDisplay result={result} input={{ ...watchedValues, RA_unit: watchedValues.RA_unit || 'L' }} />}
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
