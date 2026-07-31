import { describe, it, expect } from 'vitest';
import { validateFormulaDraft, formatValidationIssues } from './formula-validator';

describe('validateFormulaDraft', () => {
    it('validates a complete valid formula with no issues', () => {
        const result = validateFormulaDraft({ name: 'Test', C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10 });
        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.formula).toMatchObject({ C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10 });
    });

    it('fills defaults with warnings when values are missing', () => {
        const result = validateFormulaDraft({ C: 1, S: 9, RA: 50 });
        expect(result.valid).toBe(true);
        expect(result.formula).toMatchObject({ C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10, name: 'สูตรใหม่' });
        expect(result.issues.some(i => i.level === 'warning')).toBe(true);
    });

    it('coerces string numbers', () => {
        const result = validateFormulaDraft({ C: '1', S: '79', RA: '1', RA_unit: 'L', mix_type: '2', A0: '1,000', tankCapacity: '5' });
        expect(result.valid).toBe(true);
        expect(result.formula).toMatchObject({ C: 1, S: 79, RA: 1, RA_unit: 'L', mix_type: 2, A0: 1000, tankCapacity: 5 });
    });

    it('rejects non-positive and out-of-range values as errors', () => {
        const result = validateFormulaDraft({ C: 0, S: -5, RA: 999999999, tankCapacity: 0 });
        expect(result.valid).toBe(false);
        const fields = result.issues.filter(i => i.level === 'error').map(i => i.field);
        expect(fields).toContain('C');
        expect(fields).toContain('S');
        expect(fields).toContain('RA');
        expect(fields).toContain('tankCapacity');
    });

    it('rejects invalid RA_unit and mix_type with warnings + defaults', () => {
        const result = validateFormulaDraft({ C: 1, S: 9, RA: 50, RA_unit: 'kg' as any, mix_type: 9 as any });
        expect(result.valid).toBe(true);
        expect(result.formula.RA_unit).toBe('cc');
        expect(result.formula.mix_type).toBe(2);
        expect(result.issues.some(i => i.field === 'RA_unit')).toBe(true);
        expect(result.issues.some(i => i.field === 'mix_type')).toBe(true);
    });

    it('formatValidationIssues produces readable text', () => {
        const result = validateFormulaDraft({ C: 1, S: 9, RA: 50, name: 'Test' });
        expect(formatValidationIssues(result)).toContain('เตือน');
        expect(formatValidationIssues(result)).toContain('RA');
    });
});
