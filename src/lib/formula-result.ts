import type { FormulaDefinition } from './formula-schema';
import { extractVarRefs, type ComputedVariable, type FormulaVariable } from './formula-engine';

/**
 * A terminal variable is one nothing else references AND that itself has
 * dependencies (i.e. not also a leaf). If exactly one exists, it's the
 * natural "final result" of the formula; otherwise undefined (ambiguous).
 */
export function inferPrimaryOutput(variables: FormulaVariable[]): string | undefined {
  const referenced = new Set(variables.flatMap(v => extractVarRefs(v.expression)));
  const terminals = variables.filter(
    v => !referenced.has(v.name) && extractVarRefs(v.expression).length > 0
  );
  return terminals.length === 1 ? terminals[0].name : undefined;
}

/**
 * Resolve "the" headline result variable for a generic-table formula's computed output.
 * Prefers the formula's designated `meta.primaryOutput`; falls back to the last entry
 * in topological-sort order for formulas saved before that field existed.
 */
export function resolvePrimaryResult(
  formula: FormulaDefinition,
  computed: ComputedVariable[]
): ComputedVariable | null {
  if (formula.meta.primaryOutput) {
    const match = computed.find(c => c.name === formula.meta.primaryOutput);
    if (match) return match;
  }
  return computed.length > 0 ? computed[computed.length - 1] : null;
}

/**
 * Same resolution as resolvePrimaryResult, but for raw variables that haven't
 * been saved as a FormulaDefinition yet (e.g. the playground's live preview,
 * before meta.primaryOutput is inferred and persisted).
 */
export function resolvePrimaryResultFromVariables(
  variables: FormulaVariable[],
  computed: ComputedVariable[]
): ComputedVariable | null {
  const primaryOutput = inferPrimaryOutput(variables);
  if (primaryOutput) {
    const match = computed.find(c => c.name === primaryOutput);
    if (match) return match;
  }
  return computed.length > 0 ? computed[computed.length - 1] : null;
}
