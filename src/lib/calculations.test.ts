import { describe, it, expect } from 'vitest';
import { calculate, parseRatio, ccToLiters, litersToCc, sprayVolumePerHouse, formatVolumePerHouse } from './calculations';

describe('Chemical Calculations', () => {
    describe('Deltacide Fogging (mix_type = 2, ผสมกับ)', () => {
        it('should calculate correct volumes for Deltacide Fogging with 20 houses', () => {
            // จากฉลาก: เดลตาไซด์ 1 ลิตร ผสมกับน้ำมัน 79 ลิตร (อัตราส่วน 1:79)
            // ฉีดพ่น 1 ลิตร ต่อพื้นที่ 1,000 ตร.ม.
            // บ้าน 1 หลัง = 100 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // อัตราพ่นบนฉลากใช้กับส่วนผสมที่ผสมเสร็จแล้ว → ต้องเตรียมรวม 2,000 cc พอดี
            // mix_type = 2 (ผสมกับ): S = ตัวทำละลายล้วน → fC = 1/(1+79) = 1/80
            // สารเคมี = 2000 / 80 = 25 cc · น้ำมัน = 2000 - 25 = 1,975 cc
            const result = calculate({
                C: 1,
                S: 79,
                RA: 1,
                RA_unit: 'L',
                mix_type: 2,
                A0: 1000,
                A_house: 100,
                N: 20,
                targetVolume: 5,
            });

            expect(result.V_total).toBe(2000);
            expect(result.V_C).toBe(25);
            expect(result.V_S).toBe(1975);
            expect(result.V_per_house).toBe(100);
            expect(result.V_C_1L).toBe(12.66); // 1000 * (1 / 79) = 12.658 -> round to 12.66
            expect(result.V_S_1L).toBe(1000);
            // targetVolume = ยอดรวม 5 ลิตร: สารเคมี = 5000 * 1/80 = 62.5, ที่เหลือเป็นน้ำมัน
            expect(result.V_C_target).toBe(62.5);
            expect(result.V_S_target).toBe(4937.5);
            expect(result.V_C_target + result.V_S_target).toBe(5000);
        });
    });

    describe('Deltacide ULV (mix_type = 1, ผสมให้ได้)', () => {
        it('should calculate correct volumes for Deltacide ULV with 20 houses', () => {
            // จากฉลาก: เดลตาไซด์ 1 ลิตร ผสมน้ำมันให้ได้ 5 ลิตร
            // ฉีดพ่น 75 cc ต่อพื้นที่ 1,000 ตร.ม.
            // บ้าน 1 หลัง = 100 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // อัตราฉีดพ่นต่อ 2,000 ตร.ม. คือ 75 * 2 = 150 cc
            // mix_type = 1 (ผสมให้ได้): S = ยอดรวมสุทธิ = 5, ปริมาณรวม = 150 cc
            // ปริมาณสารเคมี = 150 * (1 / 5) = 150 * 0.2 = 30 cc
            // ปริมาณตัวทำละลาย = 150 - 30 = 120 cc
            const result = calculate({
                C: 1,
                S: 5,
                RA: 75,
                RA_unit: 'cc',
                mix_type: 1,
                A0: 1000,
                A_house: 100,
                N: 20,
                targetVolume: 10,
            });

            expect(result.V_total).toBe(150);
            expect(result.V_C).toBe(30);
            expect(result.V_S).toBe(120);
            expect(result.V_C_1L).toBe(200); // 1000 * (1/5) = 200 cc
            expect(result.V_S_1L).toBe(800); // 1000 - 200 = 800 cc
            expect(result.V_C_target).toBe(2000); // 200 * 10 = 2000
            expect(result.V_S_target).toBe(8000); // 800 * 10 = 8000
        });
    });

    describe('Submarine Fogging (mix_type = 1, ผสมให้ได้)', () => {
        it('should calculate correct volumes for Submarine Fogging with 20 houses', () => {
            // จากฉลาก: ซับมาริน 1 ลิตร ผสมกับน้ำมันดีเซลให้ได้ 250 ลิตร
            // ฉีดพ่น 1.25 ลิตร ต่อพื้นที่ 1,000 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // ปริมาตรผสมอ้างอิง = 1.25 * 1000 * (2000 / 1000) = 2500 cc
            // mix_type = 1 (ผสมให้ได้): S = ยอดรวม = 250, ปริมาณรวม = 2500 cc
            // fC = 1 / 250 = 0.004
            // ปริมาณสารเคมี = 2500 * 0.004 = 10 cc
            // ปริมาณน้ำมันดีเซล = 2500 - 10 = 2490 cc
            const result = calculate({
                C: 1,
                S: 250,
                RA: 1.25,
                RA_unit: 'L',
                mix_type: 1,
                A0: 1000,
                A_house: 100,
                N: 20,
            });

            expect(result.V_total).toBe(2500);
            expect(result.V_C).toBe(10);
            expect(result.V_S).toBe(2490);
            expect(result.V_C_1L).toBe(4); // 1000 * (1/250) = 4 cc
            expect(result.V_S_1L).toBe(996);
            expect(result.V_C_target).toBe(4); // default targetVolume = 1
            expect(result.V_S_target).toBe(996);
        });
    });

    describe('Submarine ULV (mix_type = 1, ผสมให้ได้)', () => {
        it('should calculate correct volumes for Submarine ULV with 20 houses', () => {
            // จากฉลาก: ซับมาริน 1 ลิตร ผสมกับน้ำให้ได้ 40 ลิตร
            // ฉีดพ่น 2 ลิตร ต่อพื้นที่ 10,000 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // ปริมาตรผสมอ้างอิง = 2 * 1000 * (2000 / 10000) = 400 cc
            // mix_type = 1 (ผสมให้ได้): S = ยอดรวม = 40, ปริมาณรวม = 400 cc
            // fC = 1 / 40 = 0.025
            // ปริมาณสารเคมี = 400 * 0.025 = 10 cc
            // ปริมาณน้ำ = 400 - 10 = 390 cc
            const result = calculate({
                C: 1,
                S: 40,
                RA: 2,
                RA_unit: 'L',
                mix_type: 1,
                A0: 10000,
                A_house: 100,
                N: 20,
            });

            expect(result.V_total).toBe(400);
            expect(result.V_C).toBe(10);
            expect(result.V_S).toBe(390);
            expect(result.V_C_1L).toBe(25); // 1000 * 0.025 = 25 cc
            expect(result.V_S_1L).toBe(975);
        });
    });

    describe('เอส-ไบโอต้า ULV (เคสที่ผู้ใช้แจ้งว่าคำนวณผิด)', () => {
        it('อ่าน S เป็นยอดรวมสุทธิ ไม่ใช่ตัวทำละลายล้วน', () => {
            // จากฉลาก: สารเคมี 1 ลิตร ผสมน้ำมันให้ได้ 14 ลิตร
            // ฉีดพ่น 20 มล. ต่อพื้นที่ 100 ตร.ม., บ้าน 25 หลัง (หลังละ 100 ตร.ม.), เตรียม 5 ลิตร
            // เดิมระบบคิด 1/(1+14) = 66.67 มล./ลิตร ซึ่งคลาดจากโจทย์ 7%
            const result = calculate({
                C: 1,
                S: 14,
                RA: 20,
                RA_unit: 'cc',
                mix_type: 1,
                A0: 100,
                A_house: 100,
                N: 25,
                targetVolume: 5,
            });

            expect(result.V_per_house).toBe(20);
            expect(result.V_C_1L).toBe(71.43); // 1000 / 14
            expect(result.V_S_1L).toBe(928.57);
            expect(result.V_C_target).toBe(357.14); // 5000 / 14
            expect(result.V_S_target).toBe(4642.86);
        });
    });

    describe('targetVolume คือยอดรวมเสมอ', () => {
        it('สารเคมี + ตัวทำละลาย รวมกันได้เท่าเป้าหมายทั้งสองโหมด', () => {
            const base = {
                C: 1, RA: 1, RA_unit: 'L' as const, A0: 1000,
                A_house: 100, N: 20, targetVolume: 5,
            };

            const mixTo = calculate({ ...base, S: 80, mix_type: 1 });
            expect(mixTo.V_C_target + mixTo.V_S_target).toBe(5000);

            const mixWith = calculate({ ...base, S: 79, mix_type: 2 });
            expect(mixWith.V_C_target + mixWith.V_S_target).toBe(5000);

            // ทั้งสองโหมดเป็นความเข้มข้นเดียวกัน (1 ส่วนใน 80) จึงต้องได้ยอดเตรียมเท่ากัน
            expect(mixWith.V_C_target).toBe(mixTo.V_C_target);
        });
    });

    describe('ผลลัพธ์ขึ้นกับสัดส่วน ไม่ใช่ขนาดของตัวเลข', () => {
        // สมมติฐานที่การเก็บ C/S "ตามที่พิมพ์" ตั้งอยู่ (ดู src/lib/cs-units.ts): ตราบใดที่
        // สัดส่วนเท่ากัน จะพิมพ์มาเป็น 1:250 หรือ 100:25000 ก็ต้องได้ผลเท่ากันเป๊ะ
        const base = {
            RA: 1, RA_unit: 'L' as const, A0: 1000,
            A_house: 100, N: 20, targetVolume: 5,
        };

        for (const mix_type of [1, 2]) {
            it(`mix_type ${mix_type}`, () => {
                expect(calculate({ ...base, C: 100, S: 25000, mix_type }))
                    .toEqual(calculate({ ...base, C: 1, S: 250, mix_type }));
            });
        }
    });

    describe('A0 — พื้นที่อ้างอิงตามฉลาก', () => {
        // A0 คือครึ่งหลังของอัตราการพ่นบนฉลาก ("20 มล. ต่อพื้นที่ 100 ตร.ม.")
        // เดิมไม่มีช่องกรอกในฟอร์ม และกรณีเลือก "อื่นๆ" ก็ไม่ถูกเซ็ต ค่าจึงค้างจากสูตรก่อนหน้า
        const base = {
            C: 1, S: 15, RA: 20, RA_unit: 'cc' as const, mix_type: 1,
            A_house: 100, N: 25, targetVolume: 5,
        };

        it('A0 ต่างกันทำให้ยอดรวมต่างกันตามสัดส่วน', () => {
            const ตามฉลาก = calculate({ ...base, A0: 100 });
            const ค้างจากสูตรอื่น = calculate({ ...base, A0: 10000 });

            expect(ตามฉลาก.V_per_house).toBe(20);      // 20 มล. ต่อบ้าน 100 ตร.ม.
            expect(ตามฉลาก.V_total).toBe(500);          // 25 หลัง

            // A0 ค้างที่ 10,000 ทำให้ได้สารเคมีน้อยกว่าที่ควร 100 เท่า
            expect(ค้างจากสูตรอื่น.V_total).toBe(5);
            expect(ตามฉลาก.V_total / ค้างจากสูตรอื่น.V_total).toBe(100);
        });

        it('มีผลเฉพาะผ่านอัตราส่วน A_house / A0', () => {
            // ขยายทั้งพื้นที่อ้างอิงและพื้นที่ต่อหลังเท่ากัน ผลต้องไม่ขยับ
            expect(calculate({ ...base, A0: 100, A_house: 100 }))
                .toEqual(calculate({ ...base, A0: 1000, A_house: 1000 }));
        });
    });

    describe('sprayVolumePerHouse — ตัวช่วยดูคร่าว ๆ ต่อบ้าน 1 หลัง', () => {
        // ground truth จากแบบฟอร์มจริงของศูนย์ฯ (แบบฟอร์มกรอกสารเคมีพ่น สงขลา/สตูล)
        // คอลัมน์ "ต่อพื้นที่ตารางเมตร" ในฟอร์มมี 4 ค่า: 1 / 100 / 1,000 / 10,000
        const rows: [string, number, 'L' | 'cc', number, number][] = [
            ['ซับมาริน ULV — 1.25 ล./10,000 ตร.ม.', 1.25, 'L', 10000, 12.5],
            ['ซับมาริน หมอกควัน — 1.25 ล./1,000 ตร.ม.', 1.25, 'L', 1000, 125],
            ['เดลต้า 50 ULV — 15 มล./100 ตร.ม.', 15, 'cc', 100, 15],
            ['เดลทริน 25 หมอกควัน — 100 มล./100 ตร.ม.', 100, 'cc', 100, 100],
            ['เวนเท็กซ์250 คลาน — 50 มล./1 ตร.ม.', 50, 'cc', 1, 5000],
            ['ไดนาโฟล 10 หมอกควัน — 10 ล./10,000 ตร.ม.', 10, 'L', 10000, 100],
        ];

        for (const [name, RA, unit, A0, expected] of rows) {
            it(name, () => {
                expect(sprayVolumePerHouse(RA, unit, A0)).toBe(expected);
            });
        }

        it('รับพื้นที่ต่อหลังที่กำหนดเองได้', () => {
            expect(sprayVolumePerHouse(100, 'cc', 100, 200)).toBe(200);
        });

        it('รองรับพื้นที่ค่าใดก็ได้ ไม่ผูกกับชุด 1/100/1,000/10,000', () => {
            // อนาคตอาจมีฉลากที่ระบุพื้นที่อื่น และพื้นที่ต่อหลังจริงก็ไม่ได้เป็น 100 เสมอ
            expect(sprayVolumePerHouse(60, 'cc', 750, 137.5)).toBe(11);      // 60 × 137.5/750
            expect(sprayVolumePerHouse(0.4, 'L', 250, 62.5)).toBe(100);      // 400 × 62.5/250
            expect(sprayVolumePerHouse(7, 'cc', 3, 1)).toBe(2.33);           // ปัดทศนิยม 2 ตำแหน่ง
        });

        it('เพิ่มพื้นที่ต่อหลังเป็นสองเท่า ปริมาณต้องเป็นสองเท่า', () => {
            const base = sprayVolumePerHouse(100, 'cc', 100, 100)!;
            expect(sprayVolumePerHouse(100, 'cc', 100, 200)).toBe(base * 2);
        });

        it('ข้อมูลไม่พอคำนวณต้องคืน null ไม่ใช่ Infinity หรือ NaN', () => {
            expect(sprayVolumePerHouse(100, 'cc', 0)).toBeNull();
            expect(sprayVolumePerHouse(0, 'cc', 100)).toBeNull();
            expect(sprayVolumePerHouse(NaN, 'cc', 100)).toBeNull();
            expect(sprayVolumePerHouse(100, 'cc', undefined as unknown as number)).toBeNull();
        });

        it('ตรงกับ V_per_house ของ calculate() ในโหมดผสมให้ได้', () => {
            // โหมด "ผสมให้ได้" ปริมาตรรวมเท่ากับอัตราฉลากพอดี ทั้งสองทางจึงต้องได้เลขเดียวกัน
            const result = calculate({
                C: 1, S: 14, RA: 20, RA_unit: 'cc', mix_type: 1,
                A0: 100, A_house: 100, N: 25,
            });
            expect(sprayVolumePerHouse(20, 'cc', 100)).toBe(result.V_per_house);
        });
    });

    describe('formatVolumePerHouse', () => {
        it('ต่ำกว่า 1 ลิตรเป็น มล. ตั้งแต่ 1 ลิตรขึ้นไปเป็นลิตร', () => {
            expect(formatVolumePerHouse(12.5)).toBe('12.50 มล.');
            expect(formatVolumePerHouse(100)).toBe('100 มล.');
            expect(formatVolumePerHouse(5000)).toBe('5 ลิตร');
            expect(formatVolumePerHouse(2500)).toBe('2.50 ลิตร');
        });

        it('null แสดงเป็นขีด ไม่ใช่ 0', () => {
            expect(formatVolumePerHouse(null)).toBe('—');
        });
    });

    describe('นิยามสองโหมดตามที่เจ้าหน้าที่ระบุ', () => {
        // ผสมกับ    → ปริมาตรรวม = สารเคมี + ตัวทำละลาย
        // ผสมให้ได้ → ตัวเลขคือปริมาตรรวมสุดท้าย เติมตัวทำละลาย (S - C)
        // ตั้ง RA/A0/A_house/N ให้ V_total เท่ากับปริมาตรของชุดผสมตามฉลากพอดี เพื่อเทียบตรง ๆ
        const cases: [string, number, number, number, number, number, number][] = [
            // ชื่อ, C(มล.), S(มล.), mix_type, ปริมาตรรวม, สารเคมี, ตัวทำละลาย
            ['ผสมกับ · ซับมาริน ULV 500 มล. : 12.5 ล.', 500, 12500, 2, 13000, 500, 12500],
            ['ผสมกับ · อีเล็กซ่า ULV 100 มล. : 2 ล.', 100, 2000, 2, 2100, 100, 2000],
            ['ผสมให้ได้ · ซับมาริน ULV 100 มล. ให้ได้ 20 ล.', 100, 20000, 1, 20000, 100, 19900],
            ['ผสมให้ได้ · เดลต้า 50 — 1 ล. ให้ได้ 6 ล.', 1000, 6000, 1, 6000, 1000, 5000],
        ];

        for (const [name, C, S, mix_type, total, expC, expS] of cases) {
            it(name, () => {
                // RA = ปริมาตรรวมที่ต้องการ (มล.) ต่อพื้นที่ A0 = A_house, N = 1
                const result = calculate({
                    C, S, mix_type,
                    RA: total, RA_unit: 'cc',
                    A0: 100, A_house: 100, N: 1,
                });

                expect(result.V_total).toBe(total);
                expect(result.V_C).toBeCloseTo(expC, 2);
                expect(result.V_S).toBeCloseTo(expS, 2);
                expect(result.V_C + result.V_S).toBeCloseTo(total, 2);
            });
        }
    });

    describe('ปริมาตรที่ต้องเตรียมเท่ากับอัตราพ่นบนฉลากเสมอ', () => {
        // ฉลากเขียนว่า "นำส่วนผสมนี้ไปฉีดพ่นในอัตรา X ต่อพื้นที่ Y" — X คือส่วนผสมที่ผสมเสร็จแล้ว
        // เดิมโหมด "ผสมกับ" เติมสารเคมีทบบนปริมาตรอ้างอิง ทำให้เตรียมเกินไปตามสัดส่วน C/S
        const base = { RA: 75, RA_unit: 'cc' as const, A0: 1000, A_house: 100, N: 20 };

        it('เดลตาไซด์ ULV 1:4 — 20 หลัง ต้องได้ 150 มล. ไม่ใช่ 187.5', () => {
            // เอกสารทางการของศูนย์ฯ คำนวณไว้ 160 cc (ปัด 7.5 → 8 cc ต่อหลัง) ค่าไม่ปัดคือ 150
            const result = calculate({ ...base, C: 1, S: 4, mix_type: 2 });
            expect(result.V_total).toBe(150);
            expect(result.V_per_house).toBe(7.5);
        });

        it('ทั้งสองโหมดให้ V_total เท่ากับปริมาตรอ้างอิงเท่ากัน', () => {
            const mixWith = calculate({ ...base, C: 1, S: 79, mix_type: 2 });
            const mixTo = calculate({ ...base, C: 1, S: 80, mix_type: 1 });
            expect(mixWith.V_total).toBe(150);
            expect(mixTo.V_total).toBe(150);
        });

        it('V_per_house ตรงกับ sprayVolumePerHouse ทั้งสองโหมด', () => {
            const expected = sprayVolumePerHouse(base.RA, base.RA_unit, base.A0, base.A_house);
            expect(calculate({ ...base, C: 1, S: 4, mix_type: 2 }).V_per_house).toBe(expected);
            expect(calculate({ ...base, C: 1, S: 5, mix_type: 1 }).V_per_house).toBe(expected);
        });
    });

    describe('Validation', () => {
        it('should throw error for non-positive values', () => {
            expect(() => calculate({
                C: 0, S: 79, RA: 1, RA_unit: 'L', A0: 1000, A_house: 100, N: 20
            })).toThrow('ค่าทั้งหมดต้องเป็นจำนวนบวก');

            expect(() => calculate({
                C: 1, S: -1, RA: 1, RA_unit: 'L', A0: 1000, A_house: 100, N: 20
            })).toThrow('ค่าทั้งหมดต้องเป็นจำนวนบวก');

            expect(() => calculate({
                C: 1, S: 79, RA: 1, RA_unit: 'L', A0: 1000, A_house: 100, N: 20, targetVolume: 0
            })).toThrow('ค่าทั้งหมดต้องเป็นจำนวนบวก');
        });

        it('should throw error for non-integer house count', () => {
            expect(() => calculate({
                C: 1, S: 79, RA: 1, RA_unit: 'L', A0: 1000, A_house: 100, N: 20.5
            })).toThrow('จำนวนหลังบ้านต้องเป็นจำนวนเต็ม');
        });

        it('should reject mix_type 1 when total volume is not greater than chemical', () => {
            expect(() => calculate({
                C: 1, S: 1, RA: 1, RA_unit: 'L', mix_type: 1, A0: 1000, A_house: 100, N: 20
            })).toThrow('แบบผสมให้ได้: ปริมาณรวมต้องมากกว่าปริมาณสารเคมี');

            // โหมดผสมกับใช้ S เป็นตัวทำละลายล้วน จึงมี S น้อยกว่า C ได้ตามปกติ
            expect(() => calculate({
                C: 2, S: 1, RA: 1, RA_unit: 'L', mix_type: 2, A0: 1000, A_house: 100, N: 20
            })).not.toThrow();
        });

        it('should throw error for non-finite values', () => {
            expect(() => calculate({
                C: NaN, S: 79, RA: 1, RA_unit: 'L', A0: 1000, A_house: 100, N: 20
            })).toThrow('ค่าทั้งหมดต้องเป็นตัวเลขที่ถูกต้อง');
        });
    });

    describe('Utility Functions', () => {
        it('should parse ratio string correctly', () => {
            expect(parseRatio('1:79')).toEqual({ C: 1, S: 79 });
            expect(parseRatio('1.5:4.5')).toEqual({ C: 1.5, S: 4.5 });
            expect(parseRatio('invalid')).toBeNull();
        });

        it('should convert cc and liters correctly', () => {
            expect(ccToLiters(1500)).toBe(1.5);
            expect(litersToCc(1.5)).toBe(1500);
        });
    });
});
