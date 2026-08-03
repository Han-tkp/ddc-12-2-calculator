import { describe, it, expect } from 'vitest';
import { buildGenericFormulaDefinition } from './formula-schema';
import { DEFAULT_TEMPLATES, type FormulaVariable } from './formula-engine';

describe('buildGenericFormulaDefinition — leaf detection', () => {
  it('Deltacide ULV: inputs are the true leaf constants, not the derived variables', () => {
    const template = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide ULV')!;
    const formula = buildGenericFormulaDefinition(template.name, undefined, template.variables);

    const inputNames = formula.inputs.map(i => i.name).sort();
    expect(inputNames).toEqual(['C', 'RA', 'S', 'tank']);

    const byName = Object.fromEntries(formula.inputs.map(i => [i.name, i]));
    expect(byName.C.default).toBe(1);
    expect(byName.S.default).toBe(4);
    expect(byName.RA.default).toBe(75);
    expect(byName.tank.default).toBe(10);
  });

  it('Deltacide ULV has two independent terminals (area_per_tank, total_per_tank), so primaryOutput is left ambiguous/undefined', () => {
    const template = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide ULV')!;
    const formula = buildGenericFormulaDefinition(template.name, undefined, template.variables);
    expect(formula.meta.primaryOutput).toBeUndefined();
  });

  it('Elexa-style formula (leaves A, R, D; derived V_total/V_chemical/V_solvent)', () => {
    const variables: FormulaVariable[] = [
      { id: '1', name: 'A', expression: '100', description: 'พื้นที่' },
      { id: '2', name: 'R', expression: '1', description: 'อัตราพ่น' },
      { id: '3', name: 'D', expression: '100', description: 'สัดส่วนเจือจาง' },
      { id: '4', name: 'V_total', expression: 'A * R' },
      { id: '5', name: 'V_chemical', expression: 'V_total / D' },
      { id: '6', name: 'V_solvent', expression: 'V_total - V_chemical' },
    ];
    const formula = buildGenericFormulaDefinition('อีเล็กซ่า', undefined, variables);

    expect(formula.inputs.map(i => i.name).sort()).toEqual(['A', 'D', 'R']);
    expect(formula.meta.primaryOutput).toBe('V_solvent');
  });

  it('a formula with zero true leaves (fully cyclic) has an empty inputs array', () => {
    const variables: FormulaVariable[] = [
      { id: '1', name: 'a', expression: 'b + 1' },
      { id: '2', name: 'b', expression: 'a + 1' },
    ];
    const formula = buildGenericFormulaDefinition('cyclic', undefined, variables);
    expect(formula.inputs).toEqual([]);
  });

  it('an unused leaf constant is still an input, and does not count as a terminal', () => {
    const variables: FormulaVariable[] = [
      { id: '1', name: 'x', expression: '1' },
      { id: '2', name: 'y', expression: '2' }, // unused leaf constant
      { id: '3', name: 'z', expression: 'x + 1' }, // the only derived, unreferenced variable
    ];
    const formula = buildGenericFormulaDefinition('multi-leaf', undefined, variables);
    expect(formula.inputs.map(i => i.name).sort()).toEqual(['x', 'y']);
    expect(formula.meta.primaryOutput).toBe('z');
  });

  it('leaves primaryOutput undefined when there are multiple independent terminal results', () => {
    const variables: FormulaVariable[] = [
      { id: '1', name: 'x', expression: '1' },
      { id: '2', name: 'p', expression: 'x + 1' }, // terminal #1
      { id: '3', name: 'q', expression: 'x + 2' }, // terminal #2
    ];
    const formula = buildGenericFormulaDefinition('multi-terminal', undefined, variables);
    expect(formula.meta.primaryOutput).toBeUndefined();
  });

  it('throws when a zero-dependency leaf expression is not a numeric literal', () => {
    // "1+" has no variable references (so it's classified as a leaf) but is not
    // itself a valid number — must be rejected at save time, not silently defaulted to 0.
    const variables: FormulaVariable[] = [
      { id: '1', name: 'a', expression: '1+' },
    ];
    expect(() => buildGenericFormulaDefinition('bad', undefined, variables)).toThrow();
  });
});
