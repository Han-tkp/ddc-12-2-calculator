import { FormulaVariable, extractVarRefs } from './formula-engine';
import { inferPrimaryOutput } from './formula-result';
import { z } from 'zod';

export interface FormulaInput extends FormulaVariable {
  /** Display label. Optional because the backfilled built-in presets omit it —
   *  callers fall back to `name`. */
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  type?: 'number' | 'select';
  options?: string[];
  default?: number | string;
}

export interface FormulaOutput {
  key: string;
  label?: string;
  unit?: string;
  decimals?: number;
}

export interface FormulaDefinition {
  schemaVersion: 1;
  meta: {
    name: string;
    description?: string;
    resultTemplate: 'tank-dilution' | 'generic-table';
    /** Name of the variable that is "the" headline result, for generic-table formulas. */
    primaryOutput?: string;
  };
  inputs: FormulaInput[];
  variables: FormulaVariable[];
  outputs: FormulaOutput[];
}

export const formulaInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  expression: z.string(),
  unit: z.string().optional(),
  description: z.string().optional(),
  label: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  integer: z.boolean().optional(),
  type: z.enum(['number', 'select']).optional(),
  options: z.array(z.string()).optional(),
  default: z.union([z.number(), z.string()]).optional(),
});

export const formulaOutputSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  unit: z.string().optional(),
  decimals: z.number().optional(),
});

export const formulaDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    name: z.string(),
    description: z.string().optional(),
    resultTemplate: z.enum(['tank-dilution', 'generic-table']),
    primaryOutput: z.string().optional(),
  }),
  inputs: z.array(formulaInputSchema),
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    expression: z.string(),
    unit: z.string().optional(),
    description: z.string().optional(),
  })),
  outputs: z.array(formulaOutputSchema),
});

export type FormulaDefinitionInput = z.infer<typeof formulaDefinitionSchema>;

/**
 * Validates a `formula` JSONB value read back from the database.
 *
 * Rows can predate the current shape (or be hand-edited), so never cast straight
 * to FormulaDefinition — a row missing `meta` would throw on `.meta.resultTemplate`
 * at render time. Returns null instead, letting callers fall back to the legacy
 * scalar columns.
 */
export function parseFormulaDefinition(value: unknown): FormulaDefinition | null {
  if (!value) return null;
  const parsed = formulaDefinitionSchema.safeParse(value);
  if (!parsed.success) {
    console.warn('พบสูตรที่มีโครงสร้างไม่ถูกต้อง จึงข้ามไปใช้ค่าพื้นฐานแทน:', parsed.error.issues[0]?.message);
    return null;
  }
  return parsed.data as FormulaDefinition;
}

/**
 * Build a generic-table FormulaDefinition from raw playground variables.
 * Inputs are the true "leaf" variables — those whose own expression has zero
 * dependencies — so a dynamic form can be generated from them (Phase 3).
 * All variables are kept in `variables` for computeAll().
 */
export function buildGenericFormulaDefinition(
  name: string,
  description: string | undefined,
  variables: FormulaVariable[]
): FormulaDefinition {
  const isLeaf = (v: FormulaVariable) => extractVarRefs(v.expression).length === 0;

  const inputs: FormulaInput[] = variables
    .filter(isLeaf)
    .map(v => {
      const defaultValue = Number(v.expression);
      if (isNaN(defaultValue)) {
        throw new Error(`ตัวแปร "${v.name}" เป็นค่าคงที่แต่ไม่ใช่ตัวเลข: "${v.expression}"`);
      }
      return {
        ...v,
        label: v.description || v.name,
        default: defaultValue,
      };
    });

  // NOTE: outputs is an unfiltered superset of all variables, kept for potential
  // future display/legend use; it is not read by any live UI today — see
  // meta.primaryOutput for "the" designated result variable.
  const outputs: FormulaOutput[] = variables.map(v => ({
    key: v.name,
    label: v.description || v.name,
    unit: v.unit,
  }));

  const primaryOutput = inferPrimaryOutput(variables);

  return {
    schemaVersion: 1,
    meta: { name, description, resultTemplate: 'generic-table', primaryOutput },
    inputs,
    variables,
    outputs,
  };
}