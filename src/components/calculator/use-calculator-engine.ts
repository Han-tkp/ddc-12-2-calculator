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
import { csEditState, normalizeCSForCalc, resolveCSUnitPair, type CSUnit, type CSUnitOrParts } from '@/lib/cs-units';
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
    //
    // ค่าเริ่มต้นเป็น null ("ส่วน") สำหรับสูตรเก่าที่เก็บสัดส่วนย่อไว้โดยไม่มีหน่วยกำกับ
    // เลือกหน่วยข้างเดียวไม่ได้ — resolveCSUnitPair() บังคับให้อีกข้างมีหน่วยตามไปด้วย
    const [CUnit, setCUnit] = useState<CSUnitOrParts>('L');
    const [SUnit, setSUnit] = useState<CSUnitOrParts>('L');

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
                        // ไม่มี A_house ที่นี่โดยตั้งใจ — label_profiles ไม่มีคอลัมน์นี้ และฉลาก
                        // สารเคมีไม่มีทางระบุพื้นที่ต่อหลังได้ ค่านี้มาจากช่องกรอกของเจ้าหน้าที่เท่านั้น
                        // หน่วยของ C/S ต้องติดมาด้วย ไม่งั้น handlePresetChange เดาเป็น 'L' ทั้งคู่
                        // แล้วสูตรที่เก็บคนละหน่วยจะถูกคำนวณผิดสัดส่วนไปถึงพันเท่า
                        C_unit: p.C_unit ?? null,
                        S_unit: p.S_unit ?? null,
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
    // สลับหน่วยแล้วแปลงตัวเลขตาม เพื่อให้ยังหมายถึงปริมาณเท่าเดิม (สูตรที่ยังไม่มีหน่วยถือเป็นลิตร
    // ตอนแปลง) จากนั้นบังคับให้อีกช่องมีหน่วยด้วย — คู่ null/'cc' ตีความสัดส่วนผิดไป 1,000 เท่า
    // 'part' = "ส่วน" สัดส่วนล้วนไม่มีหน่วย ซึ่งเป็นคุณสมบัติของ "คู่" ไม่ใช่ของช่องเดียว
    // จึงต้องเซ็ตทั้งสองข้างพร้อมกัน และตัวเลขไม่ต้องแปลงเพราะไม่ได้เป็นปริมาตรอีกต่อไป
    const handleCSUnitChange = (side: 'C' | 'S', value: CSUnit | 'part') => {
        if (value === 'part') {
            setCUnit(null);
            setSUnit(null);
            return;
        }
        const field = side === 'C' ? 'C' : 'S';
        const currentUnit = side === 'C' ? CUnit : SUnit;
        setValue(field, convertRA(getValues(field), currentUnit ?? 'L', value));
        const next = resolveCSUnitPair({ C: 0, CUnit, S: 0, SUnit }, side, value);
        setCUnit(next.CUnit);
        setSUnit(next.SUnit);
    };
    const handleCUnitChange = (unit: CSUnit | 'part') => handleCSUnitChange('C', unit);
    const handleSUnitChange = (unit: CSUnit | 'part') => handleCSUnitChange('S', unit);

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        setResult(null);
        setCalculatedInput(null);
        setGenericResult(null);
        const preset = dbPresets.find(p => String(p.id) === presetId);

        // C/S ของสูตรคือตัวเลขตามที่กรอกไว้ หน่วยจึงต้องมาจากสูตรนั้นเอง ไม่ใช่หน่วยที่ผู้ใช้
        // เคยสลับค้างไว้จากสูตรก่อนหน้า สูตรที่ไม่มีหน่วยกำกับ (แถวเก่า) อ่านเป็น "ส่วน" ตามเดิม
        // ส่วน CHEMICAL_PRESETS ที่ hardcode ไว้ไม่มีคอลัมน์หน่วย จึงตกมาเป็นสัดส่วนล้วนเช่นกัน
        const presetState = csEditState({
            C: preset?.C ?? 0,
            S: preset?.S ?? 0,
            C_unit: preset?.C_unit ?? null,
            S_unit: preset?.S_unit ?? null,
        });
        setCUnit(presetState.CUnit);
        setSUnit(presetState.SUnit);

        if (preset) {
            if (preset.id !== 'other') {
                setValue('C', preset.C);
                setValue('S', preset.S);
                setValue('RA', preset.RA);
                setValue('RA_unit', preset.RA_unit);
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

            // A0 คือ "ต่อพื้นที่เท่าไร" ของอัตราการพ่น ต้องมาพร้อมสูตรเสมอ รวมถึงกรณี "อื่นๆ"
            // ก่อนหน้านี้กรณี "อื่นๆ" ไม่ได้เซ็ต ค่าจึงค้างจากสูตรก่อนหน้า — เลือกสูตรที่ A0=10,000
            // แล้วสลับมา "อื่นๆ" เพื่อกรอกฉลากที่ต่อ 100 ตร.ม. จะได้สารเคมีน้อยกว่าที่ควร 100 เท่า
            setValue('A0', preset.A0);

            // ไม่รีเซ็ต A_house — พื้นที่ต่อหลังเป็นเรื่องของพื้นที่ปฏิบัติงาน ไม่ใช่ของสารเคมี
            // ฉลากไม่มีทางระบุค่านี้ได้ (ดู src/lib/area-per-house.ts) การเลือกสูตรจึงไม่ควรลบค่า
            // ที่เจ้าหน้าที่วัดมาเองทิ้ง
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
            const { C: C_ml, S: S_ml } = normalizeCSForCalc(
                Number(values.C), CUnit,
                Number(values.S), SUnit,
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
