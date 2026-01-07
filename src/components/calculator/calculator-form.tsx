'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculate, formatNumber, type CalculationResult } from '@/lib/calculations';
import { calculationSchema, type CalculationInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Loader2, Sparkles, Droplets, Beaker, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ResultsDisplay } from './results-display';

interface Profile {
    id: string;
    name: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: string;
    A0: number;
}

interface CalculatorFormProps {
    profiles?: Profile[];
}

export function CalculatorForm({ profiles = [] }: CalculatorFormProps) {
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CalculationInput>({
        resolver: zodResolver(calculationSchema),
        defaultValues: {
            C: 1,
            S: 79,
            RA: 1,
            RA_unit: 'L',
            A0: 1000,
            A_house: 100,
            N: 20,
        },
    });

    const watchedValues = watch();

    const handleProfileSelect = (profileId: string) => {
        setSelectedProfileId(profileId);
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            setValue('C', profile.C);
            setValue('S', profile.S);
            setValue('RA', profile.RA);
            setValue('RA_unit', profile.RA_unit as 'L' | 'cc');
            setValue('A0', profile.A0);
            toast.success(`โหลดสูตร "${profile.name}" แล้ว`);
        }
    };

    const onSubmit = async (data: CalculationInput) => {
        try {
            const calculatedResult = calculate(data);
            setResult(calculatedResult);
            toast.success('คำนวณเสร็จแล้ว!');
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูล');
            }
        }
    };

    const handleReset = () => {
        reset();
        setResult(null);
        setSelectedProfileId('');
        toast.info('ล้างข้อมูลแล้ว');
    };

    return (
        <div className="space-y-6">
            {/* Main Calculator Card - Glassmorphism */}
            <div className="glass-card rounded-3xl overflow-hidden hover-lift">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 pb-20">
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                            <Calculator className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                คำนวณสารเคมีพ่นยุง
                            </h2>
                            <p className="text-white/80 text-sm">
                                กรอกข้อมูลจากฉลากยาและพื้นที่พ่น
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="relative -mt-14 px-6 pb-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="glass-card rounded-2xl p-6 space-y-6">
                        {/* Profile Selector */}
                        {profiles.length > 0 && (
                            <div className="space-y-2 animate-fade-up">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    เลือกสูตรสำเร็จรูป
                                </Label>
                                <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                                    <SelectTrigger className="w-full h-12 text-base rounded-xl border-2 focus:border-indigo-500 transition-all">
                                        <SelectValue placeholder="-- เลือกสูตรที่บันทึกไว้ --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles.map((profile) => (
                                            <SelectItem key={profile.id} value={profile.id}>
                                                {profile.name} (สัดส่วน {profile.C}:{profile.S})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Bento Grid for Inputs */}
                        <div className="bento-grid animate-fade-up stagger-1">
                            {/* Chemical Ratio - Large Item */}
                            <div className="bento-item bento-item-large bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200/50 hover-lift">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                        <Droplets className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-700 dark:text-blue-400">อัตราส่วนผสม</h3>
                                        <p className="text-xs text-slate-500">ดูจากฉลากสารเคมี</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="C" className="text-sm font-medium">ยาฆ่ายุง</Label>
                                        <Input
                                            id="C"
                                            type="number"
                                            step="any"
                                            className="h-12 text-lg font-semibold bg-white/70 rounded-xl border-2 focus:border-blue-500"
                                            placeholder="1"
                                            {...register('C', { valueAsNumber: true })}
                                        />
                                        {errors.C && <p className="text-xs text-red-500">{errors.C.message}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="S" className="text-sm font-medium">น้ำมัน/น้ำ</Label>
                                        <Input
                                            id="S"
                                            type="number"
                                            step="any"
                                            className="h-12 text-lg font-semibold bg-white/70 rounded-xl border-2 focus:border-blue-500"
                                            placeholder="79"
                                            {...register('S', { valueAsNumber: true })}
                                        />
                                        {errors.S && <p className="text-xs text-red-500">{errors.S.message}</p>}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-3 p-2 bg-white/50 rounded-lg">
                                    💡 ตัวอย่าง: ฉลากเขียน "1:79" → ยาฆ่ายุง = 1, น้ำมัน = 79
                                </p>
                            </div>

                            {/* Application Rate */}
                            <div className="bento-item bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200/50 hover-lift">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                                        <Beaker className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-amber-700 dark:text-amber-400">ปริมาณพ่น</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="RA" className="text-sm">ปริมาณ</Label>
                                        <Input
                                            id="RA"
                                            type="number"
                                            step="any"
                                            className="h-10 bg-white/70 rounded-xl border-2 focus:border-amber-500"
                                            placeholder="1"
                                            {...register('RA', { valueAsNumber: true })}
                                        />
                                    </div>
                                    <Select
                                        value={watchedValues.RA_unit}
                                        onValueChange={(value: 'L' | 'cc') => setValue('RA_unit', value)}
                                    >
                                        <SelectTrigger className="bg-white/70 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">ลิตร</SelectItem>
                                            <SelectItem value="cc">ซีซี</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Standard Area */}
                            <div className="bento-item bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200/50 hover-lift">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                                        <span className="text-lg">📏</span>
                                    </div>
                                    <h3 className="font-bold text-emerald-700 dark:text-emerald-400">พื้นที่มาตรฐาน</h3>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="A0" className="text-sm">ตามฉลาก (ตร.ม.)</Label>
                                    <Input
                                        id="A0"
                                        type="number"
                                        step="1"
                                        className="h-10 bg-white/70 rounded-xl border-2 focus:border-emerald-500"
                                        placeholder="1000"
                                        {...register('A0', { valueAsNumber: true })}
                                    />
                                </div>
                            </div>

                            {/* House Area */}
                            <div className="bento-item bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 border border-pink-200/50 hover-lift">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                                        <span className="text-lg">🏠</span>
                                    </div>
                                    <h3 className="font-bold text-pink-700 dark:text-pink-400">พื้นที่ต่อหลัง</h3>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="A_house" className="text-sm">ตร.ม. ต่อหลัง</Label>
                                    <Input
                                        id="A_house"
                                        type="number"
                                        step="1"
                                        className="h-10 bg-white/70 rounded-xl border-2 focus:border-pink-500"
                                        placeholder="100"
                                        {...register('A_house', { valueAsNumber: true })}
                                    />
                                </div>
                            </div>

                            {/* Number of Houses */}
                            <div className="bento-item bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border border-violet-200/50 hover-lift">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                                        <span className="text-lg">🏘️</span>
                                    </div>
                                    <h3 className="font-bold text-violet-700 dark:text-violet-400">จำนวนบ้าน</h3>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="N" className="text-sm">จำนวนหลัง</Label>
                                    <Input
                                        id="N"
                                        type="number"
                                        step="1"
                                        className="h-10 bg-white/70 rounded-xl border-2 focus:border-violet-500"
                                        placeholder="20"
                                        {...register('N', { valueAsNumber: true })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 animate-fade-up stagger-3">
                            <Button
                                type="submit"
                                className="flex-1 h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 hover-lift"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        กำลังคำนวณ...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-6 w-6" />
                                        คำนวณเลย!
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-14 px-8 rounded-2xl border-2 hover:bg-slate-50"
                                onClick={handleReset}
                            >
                                ล้างข้อมูล
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results Display */}
            {result && <ResultsDisplay result={result} input={watchedValues} />}
        </div>
    );
}
