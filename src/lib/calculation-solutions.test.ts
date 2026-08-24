import { describe, it, expect } from 'vitest';
import { calculate, sprayVolumePerHouse, formatMixRatio, chemicalToSolventRatio } from './calculations';
import { normalizeCSForCalc } from './cs-units';
import { computeGenericFormula } from './formula-interpreter';
import { buildGenericFormulaDefinition } from './formula-schema';
import { DEFAULT_TEMPLATES } from './formula-engine';
import { calculationSchema } from './validations';
import { CHEMICAL_PRESETS } from './constants';
import { parseFormulaDefinition } from './formula-schema';

/**
 * เอกสารวิธีคำนวณที่รันได้ — ครอบทุกประเภทการคำนวณในระบบ
 *
 * ต่างจาก calculations.test.ts ที่ตรึงผลลัพธ์สุดท้าย ไฟล์นี้เดินทีละขั้นตามวิธีทำ
 * โดยคำนวณค่าของแต่ละขั้นไว้ล่วงหน้าแบบมือ แล้วให้ engine มายืนยัน — อ่านไล่จากบนลงล่าง
 * จะได้วิธีทำเต็มของแต่ละประเภท เทียบกับเอกสารทางการของศูนย์ฯ ได้ตรง ๆ
 *
 * ประเภทที่ครอบ:
 *   1. ผสมให้ได้ (mix_type 1)      — S คือยอดรวมสุทธิ
 *   2. ผสมกับ (mix_type 2)         — S คือตัวทำละลายล้วน
 *   3. หน่วย C/S                    — เดียวกัน / คนละหน่วย / ไม่มีหน่วย
 *   4. ยอดเตรียมตามเป้าหมาย         — targetVolume
 *   5. สูตรทั่วไป (generic-table)   — เครื่องมือสูตรอิสระ
 *   6. ตัวช่วยต่อ 1 หลัง            — คอลัมน์ในตารางสูตร
 */

describe('ประเภทที่ 1 · ผสมให้ได้ (mix_type = 1)', () => {
    // ─────────────────────────────────────────────────────────────────────
    // โจทย์  เอส-ไบโอต้า (ULV) — เคสที่เจ้าหน้าที่ส่งมาให้ตรวจ
    //   ฉลาก : สารเคมี 1 ลิตร ผสมน้ำ "ให้ได้" 14 ลิตร
    //   พ่น   : 20 มิลลิลิตร ต่อพื้นที่ 100 ตารางเมตร
    //   งาน   : บ้าน 25 หลัง (หลังละ 100 ตร.ม.) และอยากเตรียมไว้ 5 ลิตร
    // ─────────────────────────────────────────────────────────────────────
    const input = {
        C: 1, S: 14, mix_type: 1,
        RA: 20, RA_unit: 'cc' as const, A0: 100,
        A_house: 100, N: 25, targetVolume: 5,
    };
    const result = calculate(input);

    it('ขั้นที่ 1 · แปลงอัตราพ่นเป็นมิลลิลิตร → 20 มล. (เป็น มล. อยู่แล้ว)', () => {
        expect(input.RA_unit).toBe('cc');
    });

    it('ขั้นที่ 2 · พื้นที่รวม = 25 หลัง × 100 ตร.ม. = 2,500 ตร.ม.', () => {
        expect(input.N * input.A_house).toBe(2500);
    });

    it('ขั้นที่ 3 · ต่อ 1 หลัง = 20 มล. × (100 ÷ 100) = 20 มล.', () => {
        expect(result.V_per_house).toBe(20);
    });

    it('ขั้นที่ 4 · ปริมาตรรวมที่ต้องเตรียม = 25 × 20 = 500 มล.', () => {
        // อัตราพ่นบนฉลากใช้กับ "ส่วนผสมที่ผสมเสร็จแล้ว" ยอดนี้จึงคือน้ำยาพร้อมพ่น
        expect(result.V_total).toBe(500);
    });

    it('ขั้นที่ 5 · สัดส่วนสารเคมี fC = C ÷ S = 1 ÷ 14 (S คือยอดรวม)', () => {
        // "ผสมให้ได้ 14 ลิตร" แปลว่าในน้ำยา 14 ส่วน เป็นสารเคมี 1 ส่วน
        expect(result.V_C / result.V_total).toBeCloseTo(1 / 14, 4);
    });

    it('ขั้นที่ 6 · แบ่ง 500 มล. → สารเคมี 35.71 มล. · น้ำ 464.29 มล.', () => {
        expect(result.V_C).toBe(35.71);      // 500 ÷ 14 = 35.714…
        expect(result.V_S).toBe(464.29);     // 500 − 35.714… = 464.285…
        expect(result.V_C + result.V_S).toBe(500);
    });

    it('ขั้นที่ 7 · ต่อน้ำยา 1 ลิตร → สารเคมี 71.43 มล. · น้ำ 928.57 มล.', () => {
        // ฐานคือ "ยอดรวม 1 ลิตร" เติมน้ำให้ครบพอดี — รวมกันได้ 1,000
        expect(result.V_C_1L).toBe(71.43);   // 1000 ÷ 14
        expect(result.V_S_1L).toBe(928.57);
        expect(result.V_C_1L + result.V_S_1L).toBe(1000);
    });

    it('ขั้นที่ 8 · เตรียม 5 ลิตร → สารเคมี 357.14 มล. · น้ำ 4,642.86 มล.', () => {
        expect(result.V_C_target).toBe(357.14);   // 5,000 ÷ 14
        expect(result.V_S_target).toBe(4642.86);
        expect(result.V_C_target + result.V_S_target).toBe(5000);
    });

    it('ตรวจทาน · ตรงกับที่เจ้าหน้าที่คำนวณมือในเอกสาร (71.43 มล./ลิตร)', () => {
        expect(result.V_C_1L).toBe(71.43);
    });
});

describe('ประเภทที่ 2 · ผสมกับ (mix_type = 2)', () => {
    // ─────────────────────────────────────────────────────────────────────
    // โจทย์  เดลทริน 25 (หมอกควัน)
    //   ฉลาก : สารเคมี 100 มิลลิลิตร ผสม "กับ" น้ำมัน 25 ลิตร
    //   พ่น   : 100 มิลลิลิตร ต่อพื้นที่ 100 ตารางเมตร
    //   งาน   : บ้าน 20 หลัง (หลังละ 100 ตร.ม.)
    // ─────────────────────────────────────────────────────────────────────
    const ratio = normalizeCSForCalc(100, 'cc', 25, 'L');   // ขั้นที่ 1
    const result = calculate({
        C: ratio.C, S: ratio.S, mix_type: 2,
        RA: 100, RA_unit: 'cc', A0: 100,
        A_house: 100, N: 20,
    });

    it('ขั้นที่ 1 · หน่วยไม่ตรงกัน แปลงเป็น มล. ก่อน → 100 : 25,000 = 1 : 250', () => {
        expect(ratio).toEqual({ C: 1, S: 250 });
    });

    it('ขั้นที่ 2 · ต่อ 1 หลัง = 100 มล. × (100 ÷ 100) = 100 มล.', () => {
        expect(result.V_per_house).toBe(100);
    });

    it('ขั้นที่ 3 · ปริมาตรรวมที่ต้องเตรียม = 20 × 100 = 2,000 มล.', () => {
        expect(result.V_total).toBe(2000);
    });

    it('ขั้นที่ 4 · สัดส่วนสารเคมี fC = C ÷ (C + S) = 1 ÷ 251 (S คือน้ำมันล้วน)', () => {
        // "ผสมกับน้ำมัน 250 ส่วน" แปลว่ายา 1 ส่วน + น้ำมัน 250 ส่วน = 251 ส่วน
        // V_C ถูกปัดเป็น 2 ตำแหน่งก่อนแล้ว จึงเทียบที่ 5 ตำแหน่ง
        expect(result.V_C / result.V_total).toBeCloseTo(1 / 251, 5);
    });

    it('ขั้นที่ 5 · แบ่ง 2,000 มล. → สารเคมี 7.97 มล. · น้ำมัน 1,992.03 มล.', () => {
        expect(result.V_C).toBe(7.97);        // 2,000 ÷ 251 = 7.968…
        expect(result.V_S).toBe(1992.03);
        expect(result.V_C + result.V_S).toBe(2000);
    });

    it('ขั้นที่ 6 · วิธีตวงจริง — ตั้งต้นน้ำมัน 1 ลิตร แล้วเทยาทบ 4 มล.', () => {
        // ฐานของโหมดนี้คือ "ตัวทำละลาย 1 ลิตร" ไม่ใช่ยอดรวม 1 ลิตร
        // จึงรวมกันได้ 1,004 มล. ไม่ใช่ 1,000 — ตรงกับวิธีผสมหน้างาน
        expect(result.V_S_1L).toBe(1000);
        expect(result.V_C_1L).toBe(4);        // 1,000 × (1 ÷ 250)
        expect(result.V_C_1L + result.V_S_1L).toBe(1004);
    });

    it('ตรวจทาน · ปริมาตรรวมเท่ากับอัตราฉลากพอดี ไม่เติมยาทบเกิน', () => {
        // เดิมโหมดนี้ตั้งน้ำมัน = 2,000 แล้วเติมยาอีก 8 รวมเป็น 2,008 ซึ่งเกินอัตราฉลาก
        expect(result.V_total).toBe(2000);
    });
});

describe('ประเภทที่ 3 · หน่วยของ C และ S', () => {
    // ตัวเลข C/S เก็บ "ตามที่พิมพ์จากฉลาก" หน่วยจริงเก็บแยก แปลงตอนคำนวณเท่านั้น
    it('หน่วยเดียวกัน · 1 มล. : 40 มล. → 1 : 40', () => {
        expect(normalizeCSForCalc(1, 'cc', 40, 'cc')).toEqual({ C: 1, S: 40 });
    });

    it('คนละหน่วย · 500 มล. : 12.5 ลิตร → แปลงเป็น 500 : 12,500 = 1 : 25', () => {
        expect(normalizeCSForCalc(500, 'cc', 12.5, 'L')).toEqual({ C: 1, S: 25 });
    });

    it('ไม่มีหน่วย (ส่วน) · 1 : 250 → อ่านเป็นสัดส่วนล้วน ไม่คูณพัน', () => {
        expect(normalizeCSForCalc(1, null, 250, null)).toEqual({ C: 1, S: 250 });
    });

    it('พิมพ์คนละแบบแต่สัดส่วนเท่ากัน → ผลคำนวณต้องเท่ากันเป๊ะ', () => {
        const base = {
            mix_type: 2, RA: 100, RA_unit: 'cc' as const,
            A0: 100, A_house: 100, N: 20,
        };
        const typedAsMl = normalizeCSForCalc(100, 'cc', 25, 'L');    // 100 มล. : 25 ล.
        const typedAsParts = normalizeCSForCalc(1, null, 250, null); // 1 : 250 ส่วน

        expect(calculate({ ...base, ...typedAsMl }))
            .toEqual(calculate({ ...base, ...typedAsParts }));
    });
});

describe('ประเภทที่ 4 · ยอดเตรียมตามเป้าหมาย (targetVolume)', () => {
    // เจ้าหน้าที่ระบุว่าอยากเตรียมน้ำยารวมกี่ลิตร ระบบแบ่งให้ว่าต้องใช้ยาเท่าไร น้ำเท่าไร
    const base = {
        RA: 1, RA_unit: 'L' as const, A0: 1000,
        A_house: 100, N: 20, targetVolume: 5,
    };

    it('ผสมให้ได้ · เตรียม 5 ลิตร จากสูตร 1 : 80 → ยา 62.5 มล. + น้ำมัน 4,937.5 มล.', () => {
        const r = calculate({ ...base, C: 1, S: 80, mix_type: 1 });
        expect(r.V_C_target).toBe(62.5);           // 5,000 ÷ 80
        expect(r.V_S_target).toBe(4937.5);
        expect(r.V_C_target + r.V_S_target).toBe(5000);
    });

    it('ผสมกับ · เตรียม 5 ลิตร จากสูตร 1 : 79 → ได้เท่ากัน (ความเข้มข้นเดียวกัน)', () => {
        // "ผสมกับ 79" กับ "ผสมให้ได้ 80" คือความเข้มข้นเดียวกัน ยอดเตรียมจึงต้องตรงกัน
        const mixWith = calculate({ ...base, C: 1, S: 79, mix_type: 2 });
        const mixTo = calculate({ ...base, C: 1, S: 80, mix_type: 1 });
        expect(mixWith.V_C_target).toBe(mixTo.V_C_target);
        expect(mixWith.V_C_target + mixWith.V_S_target).toBe(5000);
    });
});

describe('ประเภทที่ 5 · สูตรทั่วไป (generic-table)', () => {
    // ─────────────────────────────────────────────────────────────────────
    // เส้นทางนี้ไม่ใช้ calculate() แต่ประเมินสูตรที่ผู้ใช้เขียนเองทีละตัวแปร
    // ใช้เทมเพลต "Deltacide หมอกควัน" : C = 1, S = 79, RA = 1 ลิตร/1,000 ตร.ม., ถัง 10 ลิตร
    // ─────────────────────────────────────────────────────────────────────
    const template = DEFAULT_TEMPLATES.find(t => t.name === 'Deltacide หมอกควัน')!;
    const formula = buildGenericFormulaDefinition(template.name, undefined, template.variables);
    const computed = computeGenericFormula(formula, {});
    const value = (name: string) => computed.find(c => c.name === name)?.computed;

    it('ขั้นที่ 1 · รวมสัดส่วนทั้งหมด = C + S = 1 + 79 = 80', () => {
        expect(value('ratio_total')).toBe(80);
    });

    it('ขั้นที่ 2 · สารเคมีต่อถัง = 10 ลิตร × 1 ÷ 80 = 0.125 ลิตร (125 มล.)', () => {
        expect(value('chemical_per_tank')).toBeCloseTo(0.125, 6);
        expect(value('chemical_per_tank_ml')).toBeCloseTo(125, 6);
    });

    it('ขั้นที่ 3 · ตัวทำละลายต่อถัง = 10 − 0.125 = 9.875 ลิตร', () => {
        expect(value('solvent_per_tank')).toBeCloseTo(9.875, 6);
    });

    it('ขั้นที่ 4 · สารเคมี + ตัวทำละลาย = 10 ลิตร เท่าขนาดถังพอดี', () => {
        expect(value('chemical_per_tank')! + value('solvent_per_tank')!).toBeCloseTo(10, 6);
    });

    it('ขั้นที่ 5 · พื้นที่ต่อถัง = 10 ลิตร × 1,000 ÷ 1 = 10,000 ตร.ม.', () => {
        expect(value('area_per_tank')).toBeCloseTo(10000, 6);
    });

    it('ขั้นที่ 6 · จำนวนบ้านต่อถัง = 10,000 ÷ 100 = 100 หลัง', () => {
        expect(value('houses_per_tank')).toBeCloseTo(100, 6);
    });

    it('ทุกตัวแปรคำนวณผ่าน ไม่มีตัวไหน error', () => {
        expect(computed.filter(c => c.error)).toEqual([]);
    });
});

describe('ประเภทที่ 6 · ตัวช่วย "ต่อ 1 หลัง" ในตารางสูตร', () => {
    // คิดจากอัตราพ่นของแต่ละสารเคมีเอง ซึ่งพื้นที่อ้างอิงไม่เท่ากัน
    const rows: [string, number, 'L' | 'cc', number, number][] = [
        ['ซับมาริน ULV — 1.25 ลิตร ต่อ 10,000 ตร.ม.', 1.25, 'L', 10000, 12.5],
        ['ซับมาริน หมอกควัน — 1.25 ลิตร ต่อ 1,000 ตร.ม.', 1.25, 'L', 1000, 125],
        ['เดลทริน 25 หมอกควัน — 100 มล. ต่อ 100 ตร.ม.', 100, 'cc', 100, 100],
        ['เวนเท็กซ์250 คลาน — 50 มล. ต่อ 1 ตร.ม.', 50, 'cc', 1, 5000],
    ];

    for (const [name, RA, unit, A0, expected] of rows) {
        it(`${name} → ${expected.toLocaleString('th-TH')} มล./หลัง`, () => {
            expect(sprayVolumePerHouse(RA, unit, A0)).toBe(expected);
        });
    }

    it('พื้นที่ต่อหลังปรับได้ · 100 มล./100 ตร.ม. ที่บ้าน 137.5 ตร.ม. → 137.5 มล.', () => {
        expect(sprayVolumePerHouse(100, 'cc', 100, 137.5)).toBe(137.5);
    });

    it('ตรงกับ V_per_house ของเครื่องคำนวณทั้งสองโหมด', () => {
        const base = { RA: 75, RA_unit: 'cc' as const, A0: 1000, A_house: 100, N: 20 };
        const expected = sprayVolumePerHouse(base.RA, base.RA_unit, base.A0, base.A_house);
        expect(calculate({ ...base, C: 1, S: 4, mix_type: 2 }).V_per_house).toBe(expected);
        expect(calculate({ ...base, C: 1, S: 5, mix_type: 1 }).V_per_house).toBe(expected);
    });
});

describe('ประเภทที่ 7 · อัตราส่วนที่แสดงต้องอ่านตรงกับฉลาก', () => {
    // ตัวเลข S ที่เก็บไว้มีความหมายต่างกันตามโหมด เอาไปแสดงดิบ ๆ คู่กับคำว่า "น้ำมัน/น้ำ"
    // จะขัดกับขวดในโหมด "ผสมให้ได้"
    it('ผสมให้ได้ · เก็บ 1:80 (ยอดรวม) → แสดง 1:79 ตรงกับที่ฉลากเขียน', () => {
        expect(formatMixRatio(1, 80, 1)).toBe('1:79');
        expect(chemicalToSolventRatio(1, 80, 1)).toEqual({ C: 1, S: 79 });
    });

    it('ผสมกับ · เก็บ 1:79 (น้ำมันล้วน) → แสดง 1:79 ตามเดิม', () => {
        expect(formatMixRatio(1, 79, 2)).toBe('1:79');
        expect(chemicalToSolventRatio(1, 79, 2)).toEqual({ C: 1, S: 79 });
    });

    it('สองโหมดที่ความเข้มข้นเท่ากัน ต้องแสดงอัตราส่วนเดียวกัน', () => {
        expect(formatMixRatio(1, 80, 1)).toBe(formatMixRatio(1, 79, 2));
    });

    it('เศษทศนิยมไม่เพี้ยน · เก็บ 1:14 ให้ได้ → แสดง 1:13', () => {
        expect(formatMixRatio(1, 14, 1)).toBe('1:13');
    });
});

describe('ประเภทที่ 8 · ค่าที่กรอกผิดต้องถูกปัดตกพร้อมบอกสาเหตุ', () => {
    // ด่านนี้ต้องอยู่ที่ schema ไม่ใช่แค่ใน calculate() ไม่งั้น error จะไม่มี .issues
    // แล้ว api/calculations จะตอบ 500 แทนที่จะเป็น 400 พร้อมข้อความบอกช่องที่ผิด
    const bad = {
        C: 5, S: 2, mix_type: 1,
        RA: 1, RA_unit: 'L' as const, A0: 1000, A_house: 100, N: 10,
    };

    it('ผสมให้ได้ที่ยอดรวมน้อยกว่าสารเคมี → schema ปัดตก', () => {
        const parsed = calculationSchema.safeParse(bad);
        expect(parsed.success).toBe(false);
    });

    it('error มี issues และชี้ช่องที่ผิด — เงื่อนไขที่ทำให้ตอบ 400 ไม่ใช่ 500', () => {
        const parsed = calculationSchema.safeParse(bad);
        if (parsed.success) throw new Error('ควรไม่ผ่าน');
        expect(parsed.error.issues[0].path).toEqual(['S']);
        expect(parsed.error.issues[0].message).toContain('ปริมาณรวมต้องมากกว่าปริมาณสารเคมี');
    });

    it('โหมดผสมกับมี S น้อยกว่า C ได้ตามปกติ', () => {
        expect(calculationSchema.safeParse({ ...bad, mix_type: 2 }).success).toBe(true);
    });
});

describe('ประเภทที่ 9 · สูตรตั้งต้นต้องคำนวณได้แม้ฐานข้อมูลว่าง', () => {
    // ทาง fallback ไม่ได้กรองผ่าน parseFormulaDefinition เหมือนแถวจาก DB
    // ถ้ามีฟิลด์ชื่อ formula ที่เป็นสตริง มันจะหลุดเข้า runFormula() แล้วพัง
    it('CHEMICAL_PRESETS ต้องไม่มีฟิลด์ชื่อ formula ที่ไม่ใช่ FormulaDefinition', () => {
        for (const preset of CHEMICAL_PRESETS) {
            const asAny = preset as Record<string, unknown>;
            if ('formula' in asAny) {
                // ถ้ามี ต้อง parse ผ่านเป็น FormulaDefinition จริงเท่านั้น
                expect(parseFormulaDefinition(asAny.formula)).not.toBeNull();
            }
        }
    });

    it('ทุกสูตรตั้งต้นคำนวณผ่าน ไม่โยน error', () => {
        for (const preset of CHEMICAL_PRESETS) {
            if (preset.id === 'other') continue;   // ค่าว่างไว้ให้ผู้ใช้กรอกเอง
            expect(() => calculate({
                C: preset.C, S: preset.S, mix_type: preset.mix_type,
                RA: preset.RA, RA_unit: preset.RA_unit,
                A0: preset.A0, A_house: preset.A_house, N: 20,
            })).not.toThrow();
        }
    });
});
