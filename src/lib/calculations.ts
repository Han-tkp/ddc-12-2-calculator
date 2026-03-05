// lib/calculations.ts

export interface CalculationInput {
    C: number;           // สัดส่วนสารออกฤทธิ์
    S: number;           // สัดส่วนตัวทำละลาย
    RA: number;          // อัตราการพ่น
    RA_unit: 'L' | 'cc'; // หน่วย
    mix_type?: number;   // 1 = ผสมให้ได้, 2 = ผสมกับ (ค่าเริ่มต้น 1)
    A0: number;          // พื้นที่มาตรฐาน (ตร.ม.)
    A_house: number;     // พื้นที่ต่อหลังบ้าน (ตร.ม.)
    N: number;           // จำนวนหลังบ้าน
}

export interface CalculationResult {
    V_per_house: number; // ส่วนผสมต่อหลัง (cc)
    V_total: number;     // ส่วนผสมรวม (cc)
    V_C: number;         // สารออกฤทธิ์รวม (cc)
    V_S: number;         // ตัวทำละลายรวม (cc)
    V_C_1L: number;      // สารต่อ 1 ลิตรส่วนผสม (cc)
}

/**
 * คำนวณปริมาณสารเคมีและตัวทำละลาย
 */
export function calculate(input: CalculationInput): CalculationResult {
    // Validate input
    validateCalculationInput(input);

    const { C, S, RA, RA_unit, mix_type = 1, A0, A_house, N } = input;

    // 1. แปลง RA เป็น cc
    const RA_cc = RA_unit === 'L' ? RA * 1000 : RA;

    // 2. คำนวณปริมาตรการพ่นอ้างอิงและต่อหลังบ้าน
    const V_per_house_ref = RA_cc * (A_house / A0);
    const V_total_ref = N * V_per_house_ref;

    let V_total = 0;
    let V_C = 0;
    let V_S = 0;
    let V_C_1L = 0;

    if (mix_type === 2) {
        // แบบ "ผสมกับ" (เติมสารเคมีลงไปทบในปริมาตรอ้างอิง)
        // ถือเอาคู่ลอจิกคือ: RA ของเราคือปริมาตรน้ำมัน 
        // หรือ RA รวมก่อนทบทิ้ง? ตีความตามโจทย์ "13+1000 = 1013" หมายถึง S คือ base
        // ตามบริบทส่วนมากของโจทย์นี้ การพ่นยุง ULV มักยึด "RA = ปริมาตรรวมที่พ่นออก"
        // แต่ถ้าเป็น mix_type=2 ผู้ใช้อาจมองว่าสูตรระบุ RA=(น้ำมัน). ต้องตีความ:
        // ถ้าผสม 13+1000 = 1013 หมายความว่า สัดส่วนคือ C=13, S=1000
        // ปริมาณที่ต้องปั๊มออกเครื่องคิดเป็น V_total_ref.
        // ถือชั่วคราวว่า V_total = V_total_ref เป็นปริมาตรรวมเป้าประสงค์ 
        // ดังนั้น fC, fS ก็ยังเทียบกับ C+S
        // แต่เพื่อความแตกต่างจาก "ผสมให้ได้" จะใช้ V_total_ref เป็นตัวตั้งของ S (น้ำมัน) เป็นหลัก

        V_S = V_total_ref; // ถือว่าน้ำมันคือตัวหลักตามที่พ่น
        V_C = V_S * (C / S); // สารเคมีที่ต้องเติมลงไป
        V_total = V_S + V_C; // ปริมาตรที่จะได้จริง

        // สารต่อ 1 ลิตรของตัวทำละลาย
        V_C_1L = 1000 * (C / S);
    } else {
        // แบบ 1 "ผสมให้ได้" (ปริมาตรรวมคงที่ = V_total_ref)
        V_total = V_total_ref;
        const fC = C / (C + S);
        V_C = V_total * fC;
        V_S = V_total * (1 - fC);
        V_C_1L = 1000 * fC;
    }

    // คำนวณส่วนผสมต่อหลังบ้านจริงตาม V_total 
    const V_per_house = V_total / N;

    return {
        V_per_house: roundTo(V_per_house, 2),
        V_total: roundTo(V_total, 2),
        V_C: roundTo(V_C, 2),
        V_S: roundTo(V_S, 2),
        V_C_1L: roundTo(V_C_1L, 2),
    };
}

/**
 * Validate calculation input
 */
function validateCalculationInput(input: CalculationInput): void {
    const { C, S, RA, A0, A_house, N } = input;

    if (C <= 0 || S <= 0 || RA <= 0 || A0 <= 0 || A_house <= 0 || N <= 0) {
        throw new Error('ค่าทั้งหมดต้องเป็นจำนวนบวก');
    }

    if (!Number.isFinite(C) || !Number.isFinite(S) || !Number.isFinite(RA) ||
        !Number.isFinite(A0) || !Number.isFinite(A_house)) {
        throw new Error('ค่าทั้งหมดต้องเป็นตัวเลขที่ถูกต้อง');
    }

    if (!Number.isInteger(N)) {
        throw new Error('จำนวนหลังบ้านต้องเป็นจำนวนเต็ม');
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
