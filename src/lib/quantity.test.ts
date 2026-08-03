import { describe, it, expect } from 'vitest';
import { parseQuantity, ratioFromQuantities, simplifyRatio, parseArea } from './quantity';

describe('parseQuantity', () => {
    it('reads millilitres', () => {
        expect(parseQuantity('500 มล.')).toMatchObject({ value: 500, unit: 'mL', milliliters: 500 });
        expect(parseQuantity('100 ซีซี')).toMatchObject({ unit: 'mL', milliliters: 100 });
        expect(parseQuantity('20 ml')).toMatchObject({ unit: 'mL', milliliters: 20 });
    });

    it('converts litres to millilitres', () => {
        expect(parseQuantity('12.5 ลิตร')).toMatchObject({ value: 12.5, unit: 'L', milliliters: 12500 });
        expect(parseQuantity('1 ลิตร')).toMatchObject({ milliliters: 1000 });
    });

    it('ignores the carrier note in parentheses', () => {
        // "(ผสมน้ำมัน)" says WHICH solvent, not how much.
        expect(parseQuantity('12.5 ลิตร (ผสมน้ำมั้น)')).toMatchObject({ value: 12.5, milliliters: 12500 });
        expect(parseQuantity('70 มล. (ผสมน้ำมัน)')).toMatchObject({ value: 70, milliliters: 70 });
    });

    it('treats ส่วน as a unitless ratio part, not a volume', () => {
        expect(parseQuantity('40 ส่วน (ผสมน้ำ)')).toMatchObject({ value: 40, unit: 'part', milliliters: null });
    });

    it('returns null when there is no number', () => {
        expect(parseQuantity('')).toBeNull();
        expect(parseQuantity('ผสมน้ำมัน')).toBeNull();
    });
});

describe('ratioFromQuantities — real rows from the Songkhla intake form', () => {
    // Each case is a verbatim row from
    // examplevbdc/แบบฟอร์มการกรอกสารเคมีพ่นจังหวัดสงขลาสตูล.xlsx.
    // The "expected" column is the ratio in a COMMON unit — reading these cells as bare
    // numbers instead produces a thousand-fold dosing error on every mixed-unit row.
    it.each([
        ['ซับมาริน ULV ผสมกับ', '500 มล.', '12.5 ลิตร (ผสมน้ำมั้น)', 500, 12500, '1:25'],
        ['ซับมาริน ULV ผสมให้ได้', '500 มล.', '20 ลิตร (ผสมน้ำ)', 500, 20000, '1:40'],
        ['ซับมาริน หมอกควัน', '500 มล.', '125 ลิตร (ผสมน้ำมัน)', 500, 125000, '1:250'],
        ['เดลการ์ด 50 ULV', '1 มล.', '10 มล. (ผสมน้ำมัน)', 1, 10, '1:10'],
        ['เดลต้า 50 ULV', '1 ลิตร', '6 ลิตร (ผสมน้ำ)', 1000, 6000, '1:6'],
        ['ฟาร่า 250 EW', '1 ลิตร', '170 ลิตร (ผสมน้ำ)', 1000, 170000, '1:170'],
        ['เวนเท็กซ์250 แมลงบิน', '100 ซีซี', '10 ลิตร (ผสมน้ำ)', 100, 10000, '1:100'],
        ['อะควา เค-โอทรีน', '1 มล.', '40 มล. (ผสมน้ำ)', 1, 40, '1:40'],
        ['อีเล็กซ่า ULV', '100 มล.', '2 ลิตร (ผสมน้ำ)', 100, 2000, '1:20'],
        ['อีเล็กซ่า หมอกควัน', '100 มล.', '10 ลิตร (ผสมน้ำมัน)', 100, 10000, '1:100'],
    ])('%s', (_name, c, s, expectC, expectS, simplified) => {
        const result = ratioFromQuantities(c, s);
        expect(result).not.toBeNull();
        expect(result!.C).toBe(expectC);
        expect(result!.S).toBe(expectS);

        const simple = simplifyRatio(result!.C, result!.S);
        expect(`${simple.C}:${simple.S}`).toBe(simplified);
    });

    it('handles the unitless "ส่วน" rows (บีกัสโซ่ 10)', () => {
        const result = ratioFromQuantities('1 ส่วน', '40 ส่วน (ผสมน้ำ)');
        expect(result).toMatchObject({ C: 1, S: 40 });
    });

    it('refuses to guess when one side is a volume and the other is a bare part', () => {
        // Silently assuming a unit here is exactly how a dosing error ships.
        expect(ratioFromQuantities('1 ส่วน', '10 ลิตร')).toBeNull();
    });

    it('rejects zero or missing quantities', () => {
        expect(ratioFromQuantities('0 มล.', '10 ลิตร')).toBeNull();
        expect(ratioFromQuantities('', '10 ลิตร')).toBeNull();
    });
});

describe('parseArea', () => {
    it('strips thousands separators and the unit', () => {
        expect(parseArea('10,000 ตารางเมตร')).toBe(10000);
        expect(parseArea('100 ตารางเมตร')).toBe(100);
        expect(parseArea('1 ตารางเมตร')).toBe(1);
    });

    it('returns null for junk', () => {
        expect(parseArea('')).toBeNull();
        expect(parseArea('ไม่ระบุ')).toBeNull();
    });
});
