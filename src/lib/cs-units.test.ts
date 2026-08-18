import { describe, it, expect } from 'vitest';
import {
    csToMl,
    normalizeCSForCalc,
    csEditState,
    csRatioLabel,
    csSavePayload,
    resolveCSUnitPair,
    type CSPair,
} from './cs-units';
import { convertRA } from './calculations';

describe('cs-units', () => {
    describe('csSavePayload(csEditState(p)) ต้อง idempotent', () => {
        // เคสนี้คือหัวใจของบั๊กที่เจ้าหน้าที่แจ้ง: เปิด dialog แก้ไขแล้วกดบันทึกโดยไม่แก้อะไร
        // ต้องไม่ทำให้ค่าขยับแม้แต่นิด (ของเดิมทำให้ S โตขึ้น 1,000 เท่าทุกครั้งที่บันทึก)
        const cases: { name: string; profile: Required<CSPair> }[] = [
            {
                name: 'หน่วยคนละแบบ (เดลทริน 25 หมอกควัน)',
                profile: { C: 100, C_unit: 'cc', S: 25, S_unit: 'L' },
            },
            {
                name: 'หน่วยเดียวกัน (อะควา เค-โอทริน)',
                profile: { C: 1, C_unit: 'cc', S: 40, S_unit: 'cc' },
            },
            {
                name: 'หน่วยเดียวกันเป็นลิตร (ไดนาโฟส 10)',
                profile: { C: 1, C_unit: 'L', S: 100, S_unit: 'L' },
            },
            {
                name: 'แถวเก่าไม่มีหน่วย (ส่วน)',
                profile: { C: 1, C_unit: null, S: 250, S_unit: null },
            },
        ];

        for (const { name, profile } of cases) {
            it(name, () => {
                expect(csSavePayload(csEditState(profile))).toEqual(profile);
            });

            it(`${name} — บันทึกซ้ำ 5 ครั้งค่าต้องนิ่ง`, () => {
                let current: Required<CSPair> = profile;
                for (let i = 0; i < 5; i++) {
                    current = csSavePayload(csEditState(current));
                }
                expect(current).toEqual(profile);
            });
        }
    });

    describe('normalizeCSForCalc รักษาสัดส่วนจริงตามฉลาก', () => {
        // ตรงกับรายการสูตรที่ศูนย์ฯ สงขลาใช้จริง ตัวเลขซ้ายคือที่พิมพ์ ขวาคือสัดส่วนที่ต้องได้
        const rows: [string, number, 'L' | 'cc' | null, number, 'L' | 'cc' | null, number, number][] = [
            ['เดลทริน 25 (หมอกควัน) 100 มล. : 25 ล.', 100, 'cc', 25, 'L', 1, 250],
            ['อีเล็กซ่า (หมอกควัน) 100 มล. : 10 ล.', 100, 'cc', 10, 'L', 1, 100],
            ['ซับมารีน ULV น้ำมัน 500 มล. : 12.5 ล.', 500, 'cc', 12.5, 'L', 1, 25],
            ['เวนเท็กซ์250 แมลงคลาน 50 มล. : 10 ล.', 50, 'cc', 10, 'L', 1, 200],
            ['อะควา เค-โอทริน 1 มล. : 40 มล.', 1, 'cc', 40, 'cc', 1, 40],
            ['ไดนาโฟส 10 — 1 ล. : 100 ล.', 1, 'L', 100, 'L', 1, 100],
        ];

        for (const [name, C, C_unit, S, S_unit, expectedC, expectedS] of rows) {
            it(name, () => {
                expect(normalizeCSForCalc(C, C_unit, S, S_unit)).toEqual({ C: expectedC, S: expectedS });
            });
        }

        it('แถวเก่าที่ไม่มีหน่วยต้องอ่านเป็นสัดส่วนล้วน ไม่ใช่คูณพัน', () => {
            // ตรึงความหมายของ migration 20260817_make_cs_units_self_consistent.sql:
            // แถวที่หน่วยขัดแย้งกันถูกล้างเป็น NULL ค่าที่ใช้คำนวณต้องยังเป็น 1:250 เท่าเดิม
            expect(normalizeCSForCalc(1, null, 250, null)).toEqual({ C: 1, S: 250 });
        });

        it('ให้ผลเท่ากันไม่ว่าจะพิมพ์มาเป็นหน่วยไหน', () => {
            expect(normalizeCSForCalc(100, 'cc', 25, 'L')).toEqual(normalizeCSForCalc(0.1, 'L', 25000, 'cc'));
        });
    });

    describe('csToMl', () => {
        it('ลิตรคูณพัน มล. คงเดิม ส่วนไม่แปลง', () => {
            expect(csToMl(2.5, 'L')).toBe(2500);
            expect(csToMl(250, 'cc')).toBe(250);
            expect(csToMl(250, null)).toBe(250);
            expect(csToMl(250, undefined)).toBe(250);
        });
    });

    describe('csRatioLabel', () => {
        it('ย่อสัดส่วนจากเลขที่พิมพ์คนละหน่วย', () => {
            expect(csRatioLabel(100, 'cc', 25, 'L')).toBe('1:250');
            expect(csRatioLabel(500, 'cc', 12.5, 'L')).toBe('1:25');
        });

        it('หน่วยเดียวกันก็ย่อให้เหมือนกัน', () => {
            expect(csRatioLabel(1, 'cc', 40, 'cc')).toBe('1:40');
            expect(csRatioLabel(2, 'L', 200, 'L')).toBe('1:100');
        });

        it('สูตรเก่าที่ไม่มีหน่วยต้องอ่านเป็นสัดส่วนล้วน', () => {
            expect(csRatioLabel(1, null, 250, null)).toBe('1:250');
            expect(csRatioLabel(1, undefined, 250, undefined)).toBe('1:250');
        });

        it('เลขที่พิมพ์ต่างกันแต่สัดส่วนเท่ากัน ต้องได้ป้ายเดียวกัน', () => {
            expect(csRatioLabel(100, 'cc', 25, 'L')).toBe(csRatioLabel(1, null, 250, null));
        });
    });

    describe('resolveCSUnitPair', () => {
        it('เลือกหน่วยข้างเดียวจากสูตรที่ไม่มีหน่วย ต้องได้หน่วยครบทั้งคู่', () => {
            const state = csEditState({ C: 1, S: 250, C_unit: null, S_unit: null });
            const next = resolveCSUnitPair(state, 'S', 'L');
            expect(next.SUnit).toBe('L');
            expect(next.CUnit).toBe('L'); // ห้ามค้างเป็น null คู่กับ 'L'
        });

        it('ไม่ไปแตะหน่วยอีกข้างที่ตั้งไว้แล้ว', () => {
            const state = csEditState({ C: 100, S: 25, C_unit: 'cc', S_unit: 'L' });
            expect(resolveCSUnitPair(state, 'S', 'cc')).toEqual({ ...state, SUnit: 'cc' });
        });
    });

    describe('สลับหน่วยแล้วสัดส่วนต้องไม่ขยับ', () => {
        it('convertRA ข้างเดียวแล้วบันทึก ได้สัดส่วนเดิม', () => {
            // เจ้าหน้าที่สลับ dropdown ของ C จาก มล. เป็น ลิตร ตัวเลขถูกแปลงตาม
            // ปริมาณจริงจึงเท่าเดิม สัดส่วนที่ใช้คำนวณต้องไม่เปลี่ยน
            const before = csEditState({ C: 100, S: 25, C_unit: 'cc', S_unit: 'L' });
            const after = { ...before, C: convertRA(before.C, 'cc', 'L'), CUnit: 'L' as const };

            const saved = csSavePayload(after);
            expect(normalizeCSForCalc(saved.C, saved.C_unit, saved.S, saved.S_unit))
                .toEqual(normalizeCSForCalc(before.C, before.CUnit, before.S, before.SUnit));
        });
    });
});
