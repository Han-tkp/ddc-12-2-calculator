import { describe, it, expect } from 'vitest';
import { resolveAreaPerHouse, DEFAULT_AREA_PER_HOUSE } from './area-per-house';
import { calculate } from './calculations';

describe('resolveAreaPerHouse precedence', () => {
    it('prefers an explicitly stated value over everything else', () => {
        const r = resolveAreaPerHouse({ A_house: 120, A_total: 5000, N: 10, width: 8, length: 12 });
        expect(r).toMatchObject({ A_house: 120, source: 'explicit', isAssumed: false });
    });

    it('uses measured dimensions before a zone average', () => {
        const r = resolveAreaPerHouse({ width: 8, length: 12, A_total: 5000, N: 10 });
        expect(r).toMatchObject({ A_house: 96, source: 'dimensions', isAssumed: false });
    });

    it('backs the average out of total area ÷ house count', () => {
        const r = resolveAreaPerHouse({ A_total: 5000, N: 50 });
        expect(r).toMatchObject({ A_house: 100, source: 'total-area', isAssumed: false });
        expect(r.explanation).toContain('÷ 50 หลัง');
    });

    it('falls back to the engine default and flags it as an assumption', () => {
        const r = resolveAreaPerHouse({});
        expect(r).toMatchObject({ A_house: DEFAULT_AREA_PER_HOUSE, source: 'default', isAssumed: true });
        expect(r.explanation).toContain('ค่าเริ่มต้น');
    });

    it('ignores zero and negative inputs rather than dividing by them', () => {
        expect(resolveAreaPerHouse({ A_total: 5000, N: 0 }).source).toBe('default');
        expect(resolveAreaPerHouse({ A_house: -5 }).source).toBe('default');
        expect(resolveAreaPerHouse({ width: 8, length: 0 }).source).toBe('default');
    });
});

describe('only the product N × A_house reaches the result', () => {
    // This is the property that makes deriving A_house from a total area sound.
    const base = { C: 1, S: 25, RA: 1.25, RA_unit: 'L' as const, A0: 10000, mix_type: 2 as const };

    it('50 houses × 100 m² equals 25 houses × 200 m²', () => {
        const a = calculate({ ...base, N: 50, A_house: 100 });
        const b = calculate({ ...base, N: 25, A_house: 200 });
        expect(a.V_total).toBeCloseTo(b.V_total, 6);
        expect(a.V_C).toBeCloseTo(b.V_C, 6);
        expect(a.V_S).toBeCloseTo(b.V_S, 6);
    });

    it('a derived A_house reproduces the same totals as the stated one', () => {
        const stated = calculate({ ...base, N: 40, A_house: 125 });
        const derived = resolveAreaPerHouse({ A_total: 5000, N: 40 });
        expect(derived.A_house).toBe(125);
        expect(calculate({ ...base, N: 40, A_house: derived.A_house }).V_total).toBeCloseTo(stated.V_total, 6);
    });
});

describe('ซับมาริน ULV worked example from the Songkhla form', () => {
    // Row 1: 500 มล. : 12.5 ลิตร (= 1:25), ผสมกับ, 1.25 ลิตร ต่อ 10,000 ตร.ม.
    // 20 houses, officer reports the zone totals 2,000 m².
    it('produces the totals implied by the label', () => {
        const area = resolveAreaPerHouse({ A_total: 2000, N: 20 });
        expect(area.A_house).toBe(100);

        const result = calculate({
            C: 500, S: 12500, RA: 1.25, RA_unit: 'L',
            A0: 10000, A_house: area.A_house, N: 20, mix_type: 2,
        });

        // 1.25 L over 10,000 m²; 2,000 m² treated → 0.25 L = 250 mL of FINISHED spray.
        // The label's rate applies to the mixture, not to the carrier it started from.
        expect(result.V_total).toBe(250);
        // "ผสมกับ" 500 มล. : 12.5 ล. → the mixture is 1 part in 26. Engine rounds to 2 dp.
        expect(result.V_C).toBe(9.62);   // 250 / 26 = 9.6153…
        expect(result.V_S).toBe(240.38);
        expect(result.V_C + result.V_S).toBeCloseTo(result.V_total, 6);
    });
});
