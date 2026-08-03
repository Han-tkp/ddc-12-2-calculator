import { describe, it, expect } from 'vitest';
import { computeAll, DEFAULT_TEMPLATES, extractVarRefs, type FormulaVariable } from './formula-engine';

describe('computeAll — security (no code execution)', () => {
    const dangerous = [
        'process.env',
        '(()=>{}).constructor("return process")()',
        'fetch("http://evil")',
        '__proto__.polluted = 1',
        'this.constructor',
        'require("fs")',
        'global.process',
    ];

    for (const expr of dangerous) {
        it(`rejects "${expr}" without executing it`, () => {
            const result = computeAll([{ id: '1', name: 'x', expression: expr }]);
            expect(result[0].computed).toBeNull();
            expect(result[0].error).toBeTruthy();
        });
    }

    it('does not resolve identifiers against JS globals', () => {
        const result = computeAll([{ id: '1', name: 'x', expression: 'undefined' }]);
        expect(result[0].computed).toBeNull();
        expect(result[0].error).toBeTruthy();
    });
});

describe('computeAll — MATH_FUNCTIONS support', () => {
    const cases: Array<[string, number]> = [
        ['ROUND(1.2345, 2)', 1.23],
        ['IF(1 > 0, 10, 20)', 10],
        ['IF(1 < 0, 10, 20)', 20],
        ['SUM(1,2,3)', 6],
        ['AVG(2,4)', 3],
        ['MIN(3,1,2)', 1],
        ['MAX(3,1,2)', 3],
        ['CEIL(1.1)', 2],
        ['FLOOR(1.9)', 1],
        ['ABS(-5)', 5],
        ['POW(2,3)', 8],
        ['SQRT(9)', 3],
        ['LOG(1)', 0],
        ['LOG10(100)', 2],
        ['PI()', Math.PI],
        ['SIN(0)', 0],
        ['COS(0)', 1],
        ['TAN(0)', 0],
    ];

    for (const [expr, expected] of cases) {
        it(`evaluates ${expr} => ${expected}`, () => {
            const result = computeAll([{ id: '1', name: 'x', expression: expr }]);
            expect(result[0].error).toBeUndefined();
            expect(result[0].computed).toBeCloseTo(expected, 5);
        });
    }

    it('supports comparison operators inside IF', () => {
        const result = computeAll([
            { id: '1', name: 'a', expression: '5' },
            { id: '2', name: 'b', expression: 'IF(a >= 5, 1, 0)' },
        ]);
        expect(result.find(r => r.name === 'b')?.computed).toBe(1);
    });
});

describe('computeAll — circular dependency detection', () => {
    it('detects a cycle', () => {
        const variables: FormulaVariable[] = [
            { id: '1', name: 'a', expression: 'b + 1' },
            { id: '2', name: 'b', expression: 'a + 1' },
        ];
        const result = computeAll(variables);
        expect(result.every(r => r.error)).toBe(true);
    });
});

describe('computeAll — DEFAULT_TEMPLATES behavior-preserving', () => {
    for (const template of DEFAULT_TEMPLATES) {
        it(`computes "${template.name}" without errors`, () => {
            const result = computeAll(template.variables);
            for (const r of result) {
                expect(r.error, `${r.name}: ${r.error}`).toBeUndefined();
                expect(typeof r.computed).toBe('number');
            }
        });
    }

    it('Deltacide ULV produces expected values', () => {
        const template = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide ULV')!;
        const result = computeAll(template.variables);
        const get = (name: string) => result.find(r => r.name === name)?.computed;
        expect(get('chemical_per_tank')).toBeCloseTo(2500, 5); // 10*1000*1/4
        expect(get('solvent_per_tank')).toBeCloseTo(10000, 5);
        expect(get('total_per_tank')).toBeCloseTo(12500, 5);
    });
});

describe('extractVarRefs', () => {
    it('extracts identifiers, excluding MATH_FUNCTIONS names', () => {
        expect(extractVarRefs('ROUND(a + b, 2)').sort()).toEqual(['a', 'b']);
    });

    it('extracts identifiers referenced inside comparisons', () => {
        expect(extractVarRefs('IF(a > b, 1, 0)').sort()).toEqual(['a', 'b']);
    });

    it('returns empty array for a bare numeric literal', () => {
        expect(extractVarRefs('42')).toEqual([]);
    });
});
