import { describe, it, expect } from 'vitest';
import { calculate, parseRatio, ccToLiters, litersToCc } from './calculations';

describe('Chemical Calculations', () => {
    describe('Deltacide Fogging (mix_type = 2, ผสมกับ)', () => {
        it('should calculate correct volumes for Deltacide Fogging with 20 houses', () => {
            // จากฉลาก: เดลตาไซด์ 1 ลิตร ผสมกับน้ำมัน 79 ลิตร (อัตราส่วน 1:79)
            // ฉีดพ่น 1 ลิตร ต่อพื้นที่ 1,000 ตร.ม.
            // บ้าน 1 หลัง = 100 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // ในสูตร mix_type = 2 (ผสมกับ): ปริมาตรตัวทำละลาย (น้ำมัน) = 2,000 cc (2 ลิตร)
            // สารออกฤทธิ์ C = 1, ตัวผสม S = 79
            // ปริมาณสารเคมี = 2000 * (1 / 79) = 25.32 cc
            // ปริมาณรวม = 2000 + 25.32 = 2025.32 cc
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

            expect(result.V_S).toBe(2000);
            expect(result.V_C).toBe(25.32); // 2000 * (1 / 79) = 25.316 -> round to 25.32
            expect(result.V_total).toBe(2025.32);
            expect(result.V_C_1L).toBe(12.66); // 1000 * (1 / 79) = 12.658 -> round to 12.66
            expect(result.V_S_1L).toBe(1000);
            expect(result.V_C_target).toBe(63.29); // 12.658... * 5 = 63.29
            expect(result.V_S_target).toBe(5000);
        });
    });

    describe('Deltacide ULV (mix_type = 1, ผสมให้ได้)', () => {
        it('should calculate correct volumes for Deltacide ULV with 20 houses', () => {
            // จากฉลาก: เดลตาไซด์ 1 ลิตร ผสมกับน้ำมัน 4 ลิตร (อัตราส่วน 1:4)
            // ฉีดพ่น 75 cc ต่อพื้นที่ 1,000 ตร.ม.
            // บ้าน 1 หลัง = 100 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // อัตราฉีดพ่นต่อ 2,000 ตร.ม. คือ 75 * 2 = 150 cc
            // mix_type = 1 (ผสมให้ได้): ปริมาณรวม = 150 cc
            // ปริมาณสารเคมี = 150 * (1 / (1 + 4)) = 150 * 0.2 = 30 cc
            // ปริมาณตัวทำละลาย = 150 - 30 = 120 cc
            const result = calculate({
                C: 1,
                S: 4,
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
            // จากฉลาก: ซับมาริน 1 ลิตร ผสมกับน้ำมันดีเซลให้ได้ 250 ลิตร (อัตราส่วน 1:249)
            // ฉีดพ่น 1.25 ลิตร ต่อพื้นที่ 1,000 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // ปริมาตรผสมอ้างอิง = 1.25 * 1000 * (2000 / 1000) = 2500 cc
            // mix_type = 1 (ผสมให้ได้): ปริมาณรวม = 2500 cc
            // fC = 1 / (1 + 249) = 1/250 = 0.004
            // ปริมาณสารเคมี = 2500 * 0.004 = 10 cc
            // ปริมาณน้ำมันดีเซล = 2500 - 10 = 2490 cc
            const result = calculate({
                C: 1,
                S: 249,
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
            // จากฉลาก: ซับมาริน 1 ลิตร ผสมกับน้ำให้ได้ 40 ลิตร (อัตราส่วน 1:39)
            // ฉีดพ่น 2 ลิตร ต่อพื้นที่ 10,000 ตร.ม.
            // 20 หลัง = 2,000 ตร.ม.
            // ปริมาตรผสมอ้างอิง = 2 * 1000 * (2000 / 10000) = 400 cc
            // mix_type = 1 (ผสมให้ได้): ปริมาณรวม = 400 cc
            // fC = 1 / (1 + 39) = 1/40 = 0.025
            // ปริมาณสารเคมี = 400 * 0.025 = 10 cc
            // ปริมาณน้ำ = 400 - 10 = 390 cc
            const result = calculate({
                C: 1,
                S: 39,
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
