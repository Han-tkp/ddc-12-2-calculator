import { FormulaDefinition } from './formula-schema';
import { calculate, CalculationInput, CalculationResult } from './calculations';
import { computeAll, FormulaVariable, ComputedVariable } from './formula-engine';

export function runFormula(
  formula: FormulaDefinition,
  formValues: Record<string, any>
): CalculationResult {
  if (formula.meta.resultTemplate === 'tank-dilution') {
    const input = formValues as CalculationInput;
    return calculate(input);
  }
  const computed = computeGenericFormula(formula, formValues);
  return mapToGenericResult(computed, formula.outputs);
}

/** Compute a generic-table formula, returning the full variable list for display. */
export function computeGenericFormula(
  formula: FormulaDefinition,
  formValues: Record<string, any>
): ComputedVariable[] {
  const inputNames = new Set(formula.inputs.map(i => i.name));
  const nonInputVariables = formula.variables.filter(v => !inputNames.has(v.name));
  return computeAll([
    ...toFormulaVariables(formula.inputs, formValues),
    ...nonInputVariables,
  ]);
}

function toFormulaVariables(inputs: FormulaDefinition['inputs'], formValues: Record<string, any>): FormulaVariable[] {
  return inputs.map(input => ({
    id: input.id,
    name: input.name,
    expression: String(formValues[input.name] ?? input.default ?? input.expression),
    unit: input.unit,
    description: input.description,
  }));
}

function mapToGenericResult(
  computed: { name: string; computed: number | null }[],
  outputs: FormulaDefinition['outputs']
): CalculationResult {
  const values = new Map(computed.map(c => [c.name, c.computed ?? 0]));
  const get = (key: string) => values.get(key) ?? 0;

  return {
    V_per_house: get('V_per_house'),
    V_total: get('V_total'),
    V_C: get('V_C'),
    V_S: get('V_S'),
    V_C_1L: get('V_C_1L'),
    V_S_1L: get('V_S_1L'),
    V_C_target: get('V_C_target'),
    V_S_target: get('V_S_target'),
  };
}
