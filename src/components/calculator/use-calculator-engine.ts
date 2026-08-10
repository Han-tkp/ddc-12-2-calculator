'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculationSchema } from '@/lib/validations';
import { calculate, convertRA, CalculationInput, CalculationResult } from '@/lib/calculations';
import { runFormula, computeGenericFormula } from '@/lib/formula-interpreter';
import { parseFormulaDefinition, type FormulaDefinition } from '@/lib/formula-schema';
import type { ComputedVariable } from '@/lib/formula-engine';
import { buildDynamicInputSchema } from '@/lib/formula-input-schema';
import { simplifyRatio } from '@/lib/quantity';
import { toast } from 'sonner';
import { CHEMICAL_PRESETS } from '@/lib/constants';

export interface ExtendedCalculationInput extends CalculationInput {
    location?: string;
    agency?: string;
    chemical?: string;
}

/**
 * Shared calculation state/handlers behind both the landing-page calculator
 * (calculator-form.tsx) and the Field Mode app shell (field-mode-calculator.tsx) —
 * same math, same DB presets, same generic-table handling; only the chrome differs.
 */
export function useCalculatorEngine() {
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [calculatedInput, setCalculatedInput] = useState<CalculationInput | null>(null);
    const [genericResult, setGenericResult] = useState<ComputedVariable[] | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [selectedFormula, setSelectedFormula] = useState<FormulaDefinition | null>(null);
    const [genericFormValues, setGenericFormValues] = useState<Record<string, string | number>>({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    // ตัวช่วยเลือกหน่วยของ C และ S แยกอิสระจากกัน — ฉลากจริงมักเขียนหน่วยไม่ตรงกัน
    // (เช่น C เป็น "500 มล." แต่ S เป็น "12.5 ลิตร") สลับหน่วยของช่องไหนจะแปลงแค่ช่องนั้น
    // ก่อนคำนวณจริงจะแปลงทั้งคู่เป็นหน่วยเดียวกัน (มล.) เสมอ — ดูใน handleCalculateAndSave
    const [CUnit, setCUnit] = useState<'L' | 'cc'>('L');
    const [SUnit, setSUnit] = useState<'L' | 'cc'>('L');

    const form = useForm<ExtendedCalculationInput>({
        resolver: zodResolver(calculationSchema),
        defaultValues: {
            C: 0,
            S: 0,
            RA: 0,
            RA_unit: 'cc',
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
    const { register, handleSubmit, setValue, watch, getValues, trigger, reset, formState: { errors } } = form;

    const requestGPS = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            return;
        }
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                setGpsStatus('success');
            },
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        requestGPS();
    }, [requestGPS]);

    const handleLocationChange = useCallback((lat: number, lng: number, placeName: string) => {
        setCoords({ lat, lng });
        if (placeName) setValue('location', placeName);
    }, [setValue]);

    const watchedValues = watch();
    const isGenericSelected = selectedFormula?.meta.resultTemplate === 'generic-table';

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
                        A_house: 100,
                        formula: parseFormulaDefinition(p.formula),
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

    // Switching L <-> cc should convert the already-typed RA value, not leave it
    // stale in the wrong unit (1 would silently mean 1 cc instead of 1 L).
    const handleRAUnitChange = (unit: 'L' | 'cc') => {
        const currentUnit = getValues('RA_unit') as 'L' | 'cc';
        const currentRA = getValues('RA');
        setValue('RA', convertRA(currentRA, currentUnit, unit));
        setValue('RA_unit', unit);
    };

    // C และ S แต่ละช่องแปลงหน่วยของตัวเองเท่านั้น เพื่อยังหมายถึงปริมาณเท่าเดิม
    // (ไม่แตะอีกช่อง — ทั้งคู่จะถูกแปลงเป็นหน่วยเดียวกันตอนคำนวณจริงแทน)
    const handleCUnitChange = (unit: 'L' | 'cc') => {
        setValue('C', convertRA(getValues('C'), CUnit, unit));
        setCUnit(unit);
    };
    const handleSUnitChange = (unit: 'L' | 'cc') => {
        setValue('S', convertRA(getValues('S'), SUnit, unit));
        setSUnit(unit);
    };

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        setResult(null);
        setCalculatedInput(null);
        setGenericResult(null);
        // ค่า C/S ของ preset เป็นสัดส่วนที่ normalize ไว้แล้วจาก DB — รีเซ็ตตัวเลือกหน่วยกลับ
        // เป็นค่าเริ่มต้นเสมอ ไม่งั้นหน่วยเก่าที่ผู้ใช้เคยสลับไว้จะไปตีความเลขชุดใหม่ผิด
        setCUnit('L');
        setSUnit('L');
        const preset = dbPresets.find(p => String(p.id) === presetId);

        if (preset) {
            if (preset.id !== 'other') {
                setValue('C', preset.C);
                setValue('S', preset.S);
                setValue('RA', preset.RA);
                setValue('RA_unit', preset.RA_unit);
                setValue('A0', preset.A0);
                setValue('mix_type', (preset as any).mix_type || 1);
                setValue('chemical', preset.name);
                if (preset.formula) {
                    setSelectedFormula(preset.formula);
                    if (preset.formula.meta?.resultTemplate === 'generic-table') {
                        setGenericFormValues(
                            Object.fromEntries(
                                (preset.formula.inputs as FormulaDefinition['inputs']).map(
                                    (i) => [i.name, i.default ?? '']
                                )
                            )
                        );
                    } else {
                        setGenericFormValues({});
                    }
                } else {
                    setSelectedFormula(null);
                    setGenericFormValues({});
                }
            } else {
                setValue('chemical', 'อื่นๆ');
                setSelectedFormula(null);
                setGenericFormValues({});
            }
            setValue('A_house', preset.A_house);
        } else {
            setSelectedFormula(null);
            setGenericFormValues({});
        }
    };

    const handleCalculateAndSave = async () => {
        const isGeneric = isGenericSelected;

        if (isGeneric && selectedFormula) {
            const dynamicSchema = buildDynamicInputSchema(selectedFormula.inputs);
            const parsed = dynamicSchema.safeParse(genericFormValues);
            if (!parsed.success) {
                toast.error(parsed.error.issues[0]?.message || 'กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
        } else {
            const isValid = await trigger(['C', 'S', 'RA', 'RA_unit', 'A0', 'A_house', 'N', 'targetVolume']);
            if (!isValid) {
                toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
        }

        const values = getValues();
        setIsCalculating(true);
        try {
            const chemName = selectedPreset && selectedPreset !== 'other'
                ? (dbPresets.find(p => String(p.id) === selectedPreset)?.name || values.chemical)
                : (values.chemical || 'อื่นๆ');

            // C และ S อาจกรอกกันคนละหน่วย (มล./ลิตร) — แปลงเป็นหน่วยเดียวกัน (มล.) แล้วลดรูป
            // สัดส่วนก่อนคำนวณเสมอ มิฉะนั้นสัดส่วน C/(C+S) หรือ C/S จะผิดไปตามตัวคูณ 1000
            // ระหว่างหน่วย (การลดรูปยังทำให้ตัวเลขที่บันทึก/แสดงผลอ่านง่ายเหมือนเดิมด้วย)
            const { C: C_ml, S: S_ml } = simplifyRatio(
                CUnit === 'L' ? Number(values.C) * 1000 : Number(values.C),
                SUnit === 'L' ? Number(values.S) * 1000 : Number(values.S),
            );

            const input: ExtendedCalculationInput = {
                C: C_ml,
                S: S_ml,
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

            if (isGeneric && selectedFormula) {
                const computed = computeGenericFormula(selectedFormula, genericFormValues);
                if (computed.some(c => c.error)) {
                    throw new Error('สูตรมีข้อผิดพลาด ไม่สามารถคำนวณได้');
                }
                setGenericResult(computed);
                setResult(null);
                setCalculatedInput(null);
            } else {
                const calculatedResult = selectedFormula
                    ? runFormula(selectedFormula, input)
                    : calculate(input);
                setResult(calculatedResult);
                setCalculatedInput(input);
                setGenericResult(null);
            }

            if (!isGeneric) {
                const saveRes = await fetch('/api/calculations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...values,
                        // ส่ง C/S ที่แปลงหน่วยแล้ว ไม่ใช่ค่าดิบจากฟอร์ม — เซิร์ฟเวอร์คำนวณซ้ำ
                        // จาก body นี้ตรงๆ (ไม่เชื่อผลจาก client) ถ้าส่งค่าดิบสัดส่วนจะผิด
                        C: C_ml,
                        S: S_ml,
                        chemical: chemName,
                        lat: coords?.lat ?? null,
                        lng: coords?.lng ?? null,
                    }),
                });

                if (!saveRes.ok) {
                    const data = await saveRes.json().catch(() => ({}));
                    throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
                }
            }

            toast.success(isGeneric ? 'คำนวณเรียบร้อย!' : 'คำนวณและบันทึกเรียบร้อย!');
        } catch (e) {
            setResult(null);
            setCalculatedInput(null);
            setGenericResult(null);
            toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleReset = () => {
        reset();
        setResult(null);
        setCalculatedInput(null);
        setGenericResult(null);
        setSelectedPreset('');
        setSelectedFormula(null);
        setGenericFormValues({});
        toast.info('ล้างข้อมูลแล้ว');
    };

    return {
        // form bag
        register, handleSubmit, setValue, watch, getValues, trigger, reset, errors, watchedValues,
        // state
        result, calculatedInput, genericResult, selectedPreset, selectedFormula,
        genericFormValues, setGenericFormValues, isCalculating, gpsStatus, coords,
        dbPresets, isGenericSelected,
        CUnit, SUnit,
        // handlers
        requestGPS, handleLocationChange, handlePresetChange, handleRAUnitChange, handleCUnitChange, handleSUnitChange, handleCalculateAndSave, handleReset,
    };
}
