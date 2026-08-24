// lib/calculations.ts

import { DEFAULT_AREA_PER_HOUSE } from './area-per-house';

export interface CalculationInput {
    C: number;           // สัดส่วนสารออกฤทธิ์
    /**
     * ความหมายขึ้นกับ mix_type — ตรงกับตัวเลขที่อ่านได้จากฉลากโดยไม่ต้องบวก/ลบเอง
     * mix_type 1 (ผสมให้ได้): ยอดรวมสุทธิ เช่น "1 ลิตร ผสมน้ำมันให้ได้ 14 ลิตร" → S = 14
     * mix_type 2 (ผสมกับ):   ตัวทำละลายล้วน เช่น "1 ลิตร ผสมกับน้ำมัน 79 ลิตร" → S = 79
     */
    S: number;
    RA: number;          // อัตราการพ่น
    RA_unit: 'L' | 'cc'; // หน่วย
    mix_type?: number;   // 1 = ผสมให้ได้, 2 = ผสมกับ (ค่าเริ่มต้น 1)
    A0: number;          // พื้นที่มาตรฐาน (ตร.ม.)
    A_house: number;     // พื้นที่ต่อหลังบ้าน (ตร.ม.)
    N: number;           // จำนวนหลังบ้าน
    targetVolume?: number; // ปริมาณที่ต้องการเตรียมรวม (ลิตร)
}

export interface CalculationResult {
    V_per_house: number; // ส่วนผสมต่อหลัง (cc)
    V_total: number;     // ส่วนผสมรวม (cc)
    V_C: number;         // สารออกฤทธิ์รวม (cc)
    V_S: number;         // ตัวทำละลายรวม (cc)
    V_C_1L: number;      // สารเคมี (cc) - ดูตามบริบท mix_type
    V_S_1L: number;      // ตัวทำละลาย (cc) - ดูตามบริบท mix_type
    V_C_target: number;  // สารเคมีที่ต้องใช้ตามเป้าหมาย (cc)
    V_S_target: number;  // ตัวทำละลายที่ต้องใช้ตามเป้าหมาย (cc)
}

/**
 * แปลงค่า RA ระหว่างหน่วยลิตร/มล. ให้ตัวเลขที่ผู้ใช้พิมพ์ไว้ตรงกับหน่วยใหม่เสมอ
 * เมื่อสลับ dropdown หน่วย (แทนที่จะปล่อยค่าเดิมค้างไว้ผิดหน่วย)
 */
export function convertRA(value: number, from: 'L' | 'cc', to: 'L' | 'cc'): number {
    if (from === to || !Number.isFinite(value)) return value;
    const converted = from === 'L' ? value * 1000 : value / 1000;
    return Math.round(converted * 1e6) / 1e6;
}

/**
 * แปลงหน่วย RA ('L'/'cc' ที่เก็บในฐานข้อมูล) เป็นคำไทยที่ผู้ใช้อ่านได้ — จุดกลางจุดเดียว
 * กันไม่ให้ค่าดิบอย่าง "cc" หลุดออกไปแสดงตรงๆ ในหน้าจอต่างๆ
 */
export function formatRAUnit(unit: string): string {
    return unit === 'L' ? 'ลิตร' : 'มล.';
}

/**
 * ปริมาณน้ำยาผสมที่ต้องใช้ต่อบ้าน 1 หลัง — ตัวช่วยดูคร่าว ๆ ในตารางสูตร
 *
 * คิดจากอัตราพ่นบนฉลากของสารเคมีตัวนั้นเอง (`RA` ต่อพื้นที่ `A0`) ซึ่งไม่เท่ากันในแต่ละสูตร —
 * จากแบบฟอร์มของศูนย์ฯ มีตั้งแต่ 1 ถึง 10,000 ตร.ม. จึงใช้ค่าเดียวกันทุกสารเคมีไม่ได้
 * ส่วน `A_house` เป็นตัวช่วยประมาณ (ค่าเริ่มต้น 100 ตร.ม./หลัง) ไม่ใช่ค่าจากฉลาก
 *
 * ⚠️ ค่านี้คือ "อัตราพ่นตามฉลาก" จึงไม่ขึ้นกับ mix_type ต่างจาก `V_per_house` ของ calculate()
 * ที่โหมด "ผสมกับ" เติมสารเคมีทบเข้าไปอีก (ต่างกันได้ถึง 25% ในสูตรเข้มข้นอย่าง 1:4)
 * ถ้ามีการแก้พฤติกรรมโหมด "ผสมกับ" เมื่อไร ต้องกลับมาทบทวนฟังก์ชันนี้ด้วย
 *
 * คืน `null` เมื่อข้อมูลไม่พอคำนวณ เพื่อให้หน้าจอแสดงขีดแทนที่จะโชว์ Infinity/NaN
 */
export function sprayVolumePerHouse(
    RA: number,
    RA_unit: 'L' | 'cc',
    A0: number,
    A_house: number = DEFAULT_AREA_PER_HOUSE,
): number | null {
    if (![RA, A0, A_house].every(v => Number.isFinite(v) && v > 0)) return null;
    const RA_cc = convertRA(RA, RA_unit, 'cc');
    return roundTo(RA_cc * (A_house / A0), 2);
}

/**
 * จัดรูปแบบปริมาณต่อหลังให้อ่านในช่องตารางได้ — ค่ากว้างตั้งแต่ 10 ถึง 5,000 มล.
 * ต่ำกว่า 1 ลิตรแสดงเป็น มล. ตั้งแต่ 1 ลิตรขึ้นไปแสดงเป็นลิตร กันเลขล้นเซลล์
 * `null` (ข้อมูลไม่พอคำนวณ) แสดงเป็นขีด ไม่ใช่ 0 ซึ่งจะอ่านเป็น "ไม่ต้องใช้ยา"
 */
export function formatVolumePerHouse(ml: number | null): string {
    if (ml === null) return '—';
    if (ml < 1000) return `${formatNumber(ml, ml % 1 === 0 ? 0 : 2)} มล.`;
    return `${formatNumber(ml / 1000, (ml / 1000) % 1 === 0 ? 0 : 2)} ลิตร`;
}

/**
 * คำนวณปริมาณสารเคมีและตัวทำละลาย
 */
export function calculate(input: CalculationInput): CalculationResult {
    // Validate input
    validateCalculationInput(input);

    const { C, S, RA, RA_unit, mix_type = 1, A0, A_house, N, targetVolume = 1 } = input;

    // 1. แปลง RA เป็น cc
    const RA_cc = RA_unit === 'L' ? RA * 1000 : RA;

    // 2. คำนวณปริมาตรการพ่นอ้างอิงและต่อหลังบ้าน
    const V_per_house_ref = RA_cc * (A_house / A0);
    const V_total_ref = N * V_per_house_ref;

    let V_total = 0;
    let V_C = 0;
    let V_S = 0;
    let V_C_1L = 0;
    let V_S_1L = 0;

    // สัดส่วนสารออกฤทธิ์ในส่วนผสมสุทธิ — ต่างกันตามความหมายของ S ในแต่ละโหมด
    const fC = mix_type === 2 ? C / (C + S) : C / S;

    if (mix_type === 2) {
        // แบบ "ผสมกับ" (S = ตัวทำละลายล้วน, เติมสารเคมีลงไปทบในปริมาตรอ้างอิง)
        V_S = V_total_ref;
        V_C = V_S * (C / S);
        V_total = V_S + V_C;

        // สารเคมีต่อตัวทำละลาย 1 ลิตร (ฐานคือตัวทำละลาย ไม่ใช่ยอดรวม)
        V_S_1L = 1000;
        V_C_1L = 1000 * (C / S);
    } else {
        // แบบ 1 "ผสมให้ได้" (S = ยอดรวมสุทธิ, ปริมาตรรวมคงที่ = V_total_ref)
        V_total = V_total_ref;
        V_C = V_total * fC;
        V_S = V_total - V_C;

        // แยกใน 1 ลิตรสุทธิ
        V_C_1L = 1000 * fC;
        V_S_1L = 1000 - V_C_1L;
    }

    // คำนวณส่วนผสมต่อหลังบ้านจริงตาม V_total
    const V_per_house = V_total / N;

    // คำนวณตามเป้าหมาย (targetVolume = ยอดรวมที่ต้องการ หน่วยลิตร)
    // ใช้ fC เสมอ เพื่อให้สารเคมี + ตัวทำละลาย รวมกันได้เท่ากับ targetVolume พอดีทั้งสองโหมด
    const V_C_target = 1000 * targetVolume * fC;
    const V_S_target = 1000 * targetVolume - V_C_target;

    return {
        V_per_house: roundTo(V_per_house, 2),
        V_total: roundTo(V_total, 2),
        V_C: roundTo(V_C, 2),
        V_S: roundTo(V_S, 2),
        V_C_1L: roundTo(V_C_1L, 2),
        V_S_1L: roundTo(V_S_1L, 2),
        V_C_target: roundTo(V_C_target, 2),
        V_S_target: roundTo(V_S_target, 2),
    };
}

/**
 * Validate calculation input
 */
function validateCalculationInput(input: CalculationInput): void {
    const { C, S, RA, A0, A_house, N, mix_type = 1, targetVolume = 1 } = input;

    if (C <= 0 || S <= 0 || RA <= 0 || A0 <= 0 || A_house <= 0 || N <= 0 || targetVolume <= 0) {
        throw new Error('ค่าทั้งหมดต้องเป็นจำนวนบวก');
    }

    if (!Number.isFinite(C) || !Number.isFinite(S) || !Number.isFinite(RA) ||
        !Number.isFinite(A0) || !Number.isFinite(A_house) || !Number.isFinite(targetVolume)) {
        throw new Error('ค่าทั้งหมดต้องเป็นตัวเลขที่ถูกต้อง');
    }

    if (!Number.isInteger(N)) {
        throw new Error('จำนวนหลังบ้านต้องเป็นจำนวนเต็ม');
    }

    // โหมด "ผสมให้ได้" S คือยอดรวมสุทธิ จึงต้องมากกว่าปริมาณสารเคมีเสมอ
    if (mix_type !== 2 && S <= C) {
        throw new Error('แบบผสมให้ได้: ปริมาณรวมต้องมากกว่าปริมาณสารเคมี');
    }
}

/**
 * Round number to specified decimal places
 */
function roundTo(num: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Format number with Thai locale
 */
export function formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('th-TH', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Parse ratio string (e.g., "1:79") to C and S values
 */
export function parseRatio(ratio: string): { C: number; S: number } | null {
    const match = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (!match) return null;

    return {
        C: parseFloat(match[1]),
        S: parseFloat(match[2]),
    };
}

/**
 * Convert cc to liters
 */
export function ccToLiters(cc: number): number {
    return cc / 1000;
}

/**
 * Convert liters to cc
 */
export function litersToCc(liters: number): number {
    return liters * 1000;
}
