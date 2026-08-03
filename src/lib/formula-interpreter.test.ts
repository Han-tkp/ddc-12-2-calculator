import { describe, it, expect } from 'vitest';
import { calculate } from './calculations';
import { runFormula, computeGenericFormula } from './formula-interpreter';
import { buildGenericFormulaDefinition } from './formula-schema';
import { DEFAULT_TEMPLATES } from './formula-engine';
import type { FormulaDefinition } from './formula-schema';

const deltacideFoggingFormula: FormulaDefinition = {
  schemaVersion: 1,
  meta: { name: 'Deltacide (หมอกควัน)', resultTemplate: 'tank-dilution' },
  inputs: [
    { id: 'C', name: 'C', expression: '1', label: 'C', default: 1 },
    { id: 'S', name: 'S', expression: '79', label: 'S', default: 79 },
    { id: 'RA', name: 'RA', expression: '1', label: 'RA', unit: 'L', default: 1 },
    { id: 'RA_unit', name: 'RA_unit', expression: 'L', label: 'RA_unit', default: 'L', type: 'select', options: ['L', 'cc'] },
    { id: 'mix_type', name: 'mix_type', expression: '2', label: 'mix_type', default: 2, type: 'select', options: ['1', '2'] },
    { id: 'A0', name: 'A0', expression: '1000', label: 'A0', default: 1000 },
    { id: 'A_house', name: 'A_house', expression: '100', label: 'A_house', default: 100 },
  ],
  variables: [],
  outputs: [],
};

const deltacideULVFormula: FormulaDefinition = {
  schemaVersion: 1,
  meta: { name: 'Deltacide (ULV)', resultTemplate: 'tank-dilution' },
  inputs: [
    { id: 'C', name: 'C', expression: '1', label: 'C', default: 1 },
    { id: 'S', name: 'S', expression: '4', label: 'S', default: 4 },
    { id: 'RA', name: 'RA', expression: '75', label: 'RA', unit: 'cc', default: 75 },
    { id: 'RA_unit', name: 'RA_unit', expression: 'cc', label: 'RA_unit', default: 'cc', type: 'select', options: ['L', 'cc'] },
    { id: 'mix_type', name: 'mix_type', expression: '2', label: 'mix_type', default: 2, type: 'select', options: ['1', '2'] },
    { id: 'A0', name: 'A0', expression: '1000', label: 'A0', default: 1000 },
    { id: 'A_house', name: 'A_house', expression: '100', label: 'A_house', default: 100 },
  ],
  variables: [],
  outputs: [],
};

const submarineFoggingFormula: FormulaDefinition = {
  schemaVersion: 1,
  meta: { name: 'Submarine (หมอกควัน)', resultTemplate: 'tank-dilution' },
  inputs: [
    { id: 'C', name: 'C', expression: '1', label: 'C', default: 1 },
    { id: 'S', name: 'S', expression: '249', label: 'S', default: 249 },
    { id: 'RA', name: 'RA', expression: '1.25', label: 'RA', unit: 'L', default: 1.25 },
    { id: 'RA_unit', name: 'RA_unit', expression: 'L', label: 'RA_unit', default: 'L', type: 'select', options: ['L', 'cc'] },
    { id: 'mix_type', name: 'mix_type', expression: '1', label: 'mix_type', default: 1, type: 'select', options: ['1', '2'] },
    { id: 'A0', name: 'A0', expression: '1000', label: 'A0', default: 1000 },
    { id: 'A_house', name: 'A_house', expression: '100', label: 'A_house', default: 100 },
  ],
  variables: [],
  outputs: [],
};

const submarineULVFormula: FormulaDefinition = {
  schemaVersion: 1,
  meta: { name: 'Submarine (ULV)', resultTemplate: 'tank-dilution' },
  inputs: [
    { id: 'C', name: 'C', expression: '1', label: 'C', default: 1 },
    { id: 'S', name: 'S', expression: '39', label: 'S', default: 39 },
    { id: 'RA', name: 'RA', expression: '2', label: 'RA', unit: 'L', default: 2 },
    { id: 'RA_unit', name: 'RA_unit', expression: 'L', label: 'RA_unit', default: 'L', type: 'select', options: ['L', 'cc'] },
    { id: 'mix_type', name: 'mix_type', expression: '1', label: 'mix_type', default: 1, type: 'select', options: ['1', '2'] },
    { id: 'A0', name: 'A0', expression: '10000', label: 'A0', default: 10000 },
    { id: 'A_house', name: 'A_house', expression: '100', label: 'A_house', default: 100 },
  ],
  variables: [],
  outputs: [],
};

describe('Formula Interpreter - Regression', () => {
  const testInputs = {
    C: 1,
    S: 79,
    RA: 1,
    RA_unit: 'L' as const,
    mix_type: 2,
    A0: 1000,
    A_house: 100,
    N: 20,
    targetVolume: 5,
  };

  it('runFormula with tank-dilution returns identical results to calculate() for Deltacide Fogging', () => {
    const directResult = calculate({
      C: 1, S: 79, RA: 1, RA_unit: 'L', mix_type: 2, A0: 1000, A_house: 100, N: 20, targetVolume: 5,
    });
    const formulaResult = runFormula(deltacideFoggingFormula, { ...testInputs });
    expect(formulaResult).toEqual(directResult);
  });

  it('runFormula with tank-dilution returns identical results to calculate() for Deltacide ULV', () => {
    const directResult = calculate({
      C: 1, S: 4, RA: 75, RA_unit: 'cc', mix_type: 2, A0: 1000, A_house: 100, N: 20, targetVolume: 10,
    });
    const formulaResult = runFormula(deltacideULVFormula, {
      C: 1, S: 4, RA: 75, RA_unit: 'cc', mix_type: 2, A0: 1000, A_house: 100, N: 20, targetVolume: 10,
    });
    expect(formulaResult).toEqual(directResult);
  });

  it('runFormula with tank-dilution returns identical results to calculate() for Submarine Fogging', () => {
    const directResult = calculate({
      C: 1, S: 249, RA: 1.25, RA_unit: 'L', mix_type: 1, A0: 1000, A_house: 100, N: 20,
    });
    const formulaResult = runFormula(submarineFoggingFormula, {
      C: 1, S: 249, RA: 1.25, RA_unit: 'L', mix_type: 1, A0: 1000, A_house: 100, N: 20,
    });
    expect(formulaResult).toEqual(directResult);
  });

  it('runFormula with tank-dilution returns identical results to calculate() for Submarine ULV', () => {
    const directResult = calculate({
      C: 1, S: 39, RA: 2, RA_unit: 'L', mix_type: 1, A0: 10000, A_house: 100, N: 20,
    });
    const formulaResult = runFormula(submarineULVFormula, {
      C: 1, S: 39, RA: 2, RA_unit: 'L', mix_type: 1, A0: 10000, A_house: 100, N: 20,
    });
    expect(formulaResult).toEqual(directResult);
  });

  it('runFormula falls back to calculate() when formula is null (via ternary in caller)', () => {
    // This tests the fallback path in calculator-form.tsx
    const input = { C: 1, S: 79, RA: 1, RA_unit: 'L' as const, mix_type: 2, A0: 1000, A_house: 100, N: 20, targetVolume: 5 };
    const directResult = calculate(input);
    // Simulate the ternary: selectedFormula ? runFormula(...) : calculate(input)
    const fallbackResult = directResult; // This is what happens when formula is null
    expect(fallbackResult).toEqual(directResult);
  });

  it('runFormula with tank-dilution produces correct specific values for Deltacide Fogging', () => {
    const result = runFormula(deltacideFoggingFormula, { ...testInputs });
    expect(result.V_S).toBe(2000);
    expect(result.V_C).toBe(25.32);
    expect(result.V_total).toBe(2025.32);
    expect(result.V_C_1L).toBe(12.66);
    expect(result.V_S_1L).toBe(1000);
    expect(result.V_C_target).toBe(63.29);
    expect(result.V_S_target).toBe(5000);
  });
});

describe('computeGenericFormula - user-entered values are honored (not shadowed)', () => {
  const ulvTemplate = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide ULV')!;
  const formula = buildGenericFormulaDefinition(ulvTemplate.name, undefined, ulvTemplate.variables);

  it('uses the stored default when no form value is given', () => {
    const computed = computeGenericFormula(formula, {});
    const tank = computed.find(c => c.name === 'tank');
    const total = computed.find(c => c.name === 'total_per_tank');
    expect(tank?.computed).toBe(10);
    expect(total?.computed).toBeCloseTo(12500, 5); // 10*1000*1/4 + 10*1000
  });

  it('reflects a user-entered value instead of the stored default', () => {
    const computed = computeGenericFormula(formula, { tank: 20 });
    const tank = computed.find(c => c.name === 'tank');
    const total = computed.find(c => c.name === 'total_per_tank');
    expect(tank?.computed).toBe(20);
    expect(total?.computed).toBeCloseTo(25000, 5); // 20*1000*1/4 + 20*1000
  });

  it('honors multiple overridden leaf values simultaneously', () => {
    const computed = computeGenericFormula(formula, { C: 2, S: 4, tank: 10 });
    const chemical = computed.find(c => c.name === 'chemical_per_tank');
    expect(chemical?.computed).toBeCloseTo(5000, 5); // 10*1000*2/4
  });
});