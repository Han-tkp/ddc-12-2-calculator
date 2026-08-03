import { describe, it, expect } from 'vitest';
import { resolvePrimaryResult } from './formula-result';
import { buildGenericFormulaDefinition } from './formula-schema';
import { computeAll, DEFAULT_TEMPLATES } from './formula-engine';
import type { FormulaDefinition } from './formula-schema';

describe('resolvePrimaryResult', () => {
  it('returns the named primaryOutput entry when present', () => {
    const formula: FormulaDefinition = {
      schemaVersion: 1,
      meta: { name: 'test', resultTemplate: 'generic-table', primaryOutput: 'b' },
      inputs: [],
      variables: [],
      outputs: [],
    };
    const computed = computeAll([
      { id: '1', name: 'a', expression: '1' },
      { id: '2', name: 'b', expression: 'a + 1' },
    ]);
    const result = resolvePrimaryResult(formula, computed);
    expect(result?.name).toBe('b');
  });

  it('falls back to the last computed entry when primaryOutput is unset (back-compat)', () => {
    const formula: FormulaDefinition = {
      schemaVersion: 1,
      meta: { name: 'test', resultTemplate: 'generic-table' },
      inputs: [],
      variables: [],
      outputs: [],
    };
    const computed = computeAll([
      { id: '1', name: 'a', expression: '1' },
      { id: '2', name: 'b', expression: 'a + 1' },
    ]);
    const result = resolvePrimaryResult(formula, computed);
    expect(result?.name).toBe('b');
  });

  it('falls back to the last entry when primaryOutput names a variable not present in computed', () => {
    const formula: FormulaDefinition = {
      schemaVersion: 1,
      meta: { name: 'test', resultTemplate: 'generic-table', primaryOutput: 'does_not_exist' },
      inputs: [],
      variables: [],
      outputs: [],
    };
    const computed = computeAll([
      { id: '1', name: 'a', expression: '1' },
      { id: '2', name: 'b', expression: 'a + 1' },
    ]);
    const result = resolvePrimaryResult(formula, computed);
    expect(result?.name).toBe('b');
  });

  it('returns null for an empty computed list', () => {
    const formula: FormulaDefinition = {
      schemaVersion: 1,
      meta: { name: 'test', resultTemplate: 'generic-table' },
      inputs: [],
      variables: [],
      outputs: [],
    };
    expect(resolvePrimaryResult(formula, [])).toBeNull();
  });

  it('Deltacide ULV: resolves to total_per_tank via the fallback heuristic (primaryOutput ambiguous)', () => {
    const template = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide ULV')!;
    const formula = buildGenericFormulaDefinition(template.name, undefined, template.variables);
    expect(formula.meta.primaryOutput).toBeUndefined();
    const computed = computeAll(template.variables);
    const result = resolvePrimaryResult(formula, computed);
    expect(result?.name).toBe('total_per_tank');
  });
});
