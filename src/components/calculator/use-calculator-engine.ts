'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculationSchema } from '@/lib/validations';
import { calculate, CalculationInput, CalculationResult } from '@/lib/calculations';
import { runFormula, computeGenericFormula } from '@/lib/formula-interpreter';
import { parseFormulaDefinition, type FormulaDefinition } from '@/lib/formula-schema';
import type { ComputedVariable } from '@/lib/formula-engine';
import { buildDynamicInputSchema } from '@/lib/formula-input-schema';
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

    const form = useForm<ExtendedCalculationInput>({
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

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        setResult(null);
        setCalculatedInput(null);
        setGenericResult(null);
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
        // handlers
        requestGPS, handleLocationChange, handlePresetChange, handleCalculateAndSave, handleReset,
    };
}
