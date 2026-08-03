import { describe, it, expect } from 'vitest';
import { buildDynamicInputSchema } from './formula-input-schema';
import type { FormulaInput } from './formula-schema';

const sampleInputs: FormulaInput[] = [
  { id: '1', name: 'A', expression: '100', label: 'พื้นที่', default: 100, min: 0 },
  { id: '2', name: 'RA_unit', expression: 'L', label: 'หน่วย', default: 'L', type: 'select', options: ['L', 'cc'] },
  { id: '3', name: 'N', expression: '1', label: 'จำนวนหลัง', default: 1, integer: true, min: 1, max: 1000 },
];

describe('buildDynamicInputSchema', () => {
  it('accepts a valid payload', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    const result = schema.safeParse({ A: 50, RA_unit: 'cc', N: 10 });
    expect(result.success).toBe(true);
  });

  it('coerces numeric strings (from controlled <Input> fields) to numbers', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    const result = schema.safeParse({ A: '50', RA_unit: 'L', N: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.A).toBe(50);
      expect(result.data.N).toBe(10);
    }
  });

  it('rejects a select value outside the declared options', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    const result = schema.safeParse({ A: 50, RA_unit: 'invalid', N: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer value for an integer-only input', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    const result = schema.safeParse({ A: 50, RA_unit: 'L', N: 10.5 });
    expect(result.success).toBe(false);
  });

  it('rejects a value below min / above max', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    expect(schema.safeParse({ A: 50, RA_unit: 'L', N: 0 }).success).toBe(false);
    expect(schema.safeParse({ A: 50, RA_unit: 'L', N: 5000 }).success).toBe(false);
  });

  it('rejects a non-numeric value for a plain number input', () => {
    const schema = buildDynamicInputSchema(sampleInputs);
    const result = schema.safeParse({ A: 'not a number', RA_unit: 'L', N: 10 });
    expect(result.success).toBe(false);
  });
});
