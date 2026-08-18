/**
 * จุดเดียวที่รู้ความหมายของคู่ (C, C_unit) และ (S, S_unit) ใน `label_profiles`
 *
 * โมเดล: `C`/`S` คือ "ตัวเลขตามที่เจ้าหน้าที่พิมพ์" และ `C_unit`/`S_unit` คือหน่วยจริงของตัวเลขนั้น
 * การแปลงหน่วยเกิดขึ้น **ตอนคำนวณเท่านั้น** ไม่ใช่ตอนบันทึก
 *
 * ก่อนหน้านี้ระบบย่อสัดส่วนด้วย simplifyRatio() ก่อนบันทึก แล้วเก็บหน่วยที่พิมพ์ไว้ต่างหาก
 * ทำให้ข้อมูลสองส่วนขัดแย้งกันเอง: พิมพ์ "100 มล. : 25 ลิตร" ได้ออกมาเป็น C=1, S=250 คู่กับ
 * หน่วย cc/L ซึ่งอ่านได้ว่า 1:250,000 ผลคือ (ก) เจ้าหน้าที่แก้เลขแล้วถูกย่อกลับเป็นค่าเดิม
 * เห็นเป็น "ค่าไม่เปลี่ยน" และ (ข) เปิด dialog แก้ไขแล้วกดบันทึกเฉย ๆ สัดส่วนเจือจางลง 1,000 เท่า
 * ทุกครั้ง เพราะหน่วยเดิมถูกเอาไปคูณกับเลขที่ย่อไปแล้วซ้ำอีกรอบ
 *
 * กฎที่ต้องรักษาไว้: csSavePayload(csEditState(p)) ต้องได้ C/S/หน่วย เท่าเดิมเป๊ะ (idempotent)
 */

import { simplifyRatio } from './quantity';

export type CSUnit = 'L' | 'cc';

/**
 * หน่วยของ C/S — `null` แปลว่า "ส่วน" (สัดส่วนล้วนที่ไม่มีหน่วย) ซึ่งเป็นสภาพของแถวเก่า
 * ที่เคยถูกย่อจนหน่วยเดิมสูญไปแล้ว ดู migration 20260817_make_cs_units_self_consistent.sql
 */
export type CSUnitOrParts = CSUnit | null;

export interface CSPair {
    C: number;
    S: number;
    C_unit?: CSUnitOrParts;
    S_unit?: CSUnitOrParts;
}

export interface CSEditState {
    C: number;
    CUnit: CSUnitOrParts;
    S: number;
    SUnit: CSUnitOrParts;
}

/** แปลงค่าเป็นมิลลิลิตร — ค่าที่ไม่มีหน่วย ("ส่วน") คืนตามเดิมเพราะไม่ใช่ปริมาตร */
export function csToMl(value: number, unit: CSUnitOrParts | undefined): number {
    return unit === 'L' ? value * 1000 : value;
}

/**
 * แปลง C และ S ให้เป็นหน่วยเดียวกันแล้วย่อสัดส่วน — ใช้ก่อนส่งเข้า calculate() เท่านั้น
 *
 * ฉลากจริงมักเขียนคนละหน่วย (เช่น "500 มล." สารเคมี ต่อ "12.5 ลิตร" น้ำมัน) การอ่านเลขดิบ
 * โดยไม่แปลงหน่วยคือบั๊กพันเท่าที่ชี้ผิดทาง
 */
export function normalizeCSForCalc(
    C: number,
    C_unit: CSUnitOrParts | undefined,
    S: number,
    S_unit: CSUnitOrParts | undefined,
): { C: number; S: number } {
    return simplifyRatio(csToMl(C, C_unit), csToMl(S, S_unit));
}

/**
 * เตรียมค่าสำหรับ seed ฟอร์มแก้ไข — คงความเป็น null ของหน่วยไว้ ไม่แปลงเป็น 'L'
 *
 * ห้ามใส่ค่า default ให้ข้างเดียว: หน่วยข้างหนึ่งเป็นของจริงคู่กับอีกข้างที่เป็น default
 * คือรูปร่างของบั๊ก 1,000 เท่าพอดี ถ้าจะ default ต้อง default พร้อมกันผ่าน resolveCSUnitPair()
 */
export function csEditState(profile: CSPair): CSEditState {
    const C_unit = profile.C_unit ?? null;
    const S_unit = profile.S_unit ?? null;
    // หน่วยต้องมาเป็นคู่เสมอ — ถ้าข้อมูลเก่ามีมาข้างเดียว ถือว่าทั้งคู่ไม่มีหน่วย
    const paired = C_unit !== null && S_unit !== null;
    return {
        C: profile.C,
        CUnit: paired ? C_unit : null,
        S: profile.S,
        SUnit: paired ? S_unit : null,
    };
}

/** แปลง state ของฟอร์มกลับเป็น payload สำหรับบันทึก — ตรงไปตรงมา ไม่แปลงหน่วย ไม่ย่อสัดส่วน */
export function csSavePayload(state: CSEditState): Required<CSPair> {
    return {
        C: state.C,
        S: state.S,
        C_unit: state.CUnit,
        S_unit: state.SUnit,
    };
}

/**
 * ตั้งหน่วยของข้างใดข้างหนึ่ง โดยบังคับให้อีกข้างมีหน่วยด้วยเสมอ
 *
 * เมื่อสูตรเดิมไม่มีหน่วย ("ส่วน") แล้วเจ้าหน้าที่เลือกหน่วยให้ข้างเดียว อีกข้างต้องกลายเป็น
 * หน่วยที่ชัดเจนไปพร้อมกัน มิฉะนั้นจะได้คู่ null/'cc' ที่ตีความสัดส่วนผิดไป 1,000 เท่า
 */
export function resolveCSUnitPair(
    state: CSEditState,
    side: 'C' | 'S',
    unit: CSUnit,
    fallback: CSUnit = 'L',
): CSEditState {
    return {
        ...state,
        CUnit: side === 'C' ? unit : (state.CUnit ?? fallback),
        SUnit: side === 'S' ? unit : (state.SUnit ?? fallback),
    };
}

/**
 * สัดส่วนในรูปย่อสำหรับแสดงผล เช่น "1:250" — เจ้าหน้าที่คุ้นกับรูปนี้จากฉลาก
 * ใช้คู่กับตัวเลขตามที่พิมพ์ เพื่อให้เห็นว่าเลขที่กรอกกับสัดส่วนที่ระบบใช้ตรงกัน
 */
export function csRatioLabel(
    C: number,
    C_unit: CSUnitOrParts | undefined,
    S: number,
    S_unit: CSUnitOrParts | undefined,
): string {
    const r = normalizeCSForCalc(C, C_unit, S, S_unit);
    return `${r.C}:${r.S}`;
}

/** ค่าที่ dropdown หน่วยส่งกลับมา — `'part'` คือตัวเลือก "ส่วน" (สัดส่วนล้วน) */
export type CSUnitChoice = CSUnit | 'part';

/**
 * จัดการการสลับหน่วยในฟอร์มแก้ไขสูตร ให้ทุกหน้าจอทำเหมือนกันหมด
 *
 * - เลือกหน่วยจริง: แปลงตัวเลขของช่องนั้นให้ยังหมายถึงปริมาณเท่าเดิม แล้วบังคับให้อีกข้างมีหน่วยด้วย
 * - เลือก "ส่วน": ทั้งคู่กลายเป็นไม่มีหน่วยพร้อมกัน และไม่แปลงตัวเลข เพราะไม่ใช่ปริมาตรอีกต่อไป
 *
 * `convert` คือ convertRA จาก calculations.ts (ส่งเข้ามาเพื่อไม่ให้ lib ชั้นนี้ผูกกับกันเอง)
 */
export function applyCSUnitChoice(
    state: CSEditState,
    side: 'C' | 'S',
    choice: CSUnitChoice,
    convert: (value: number, from: CSUnit, to: CSUnit) => number,
): CSEditState {
    if (choice === 'part') {
        return { ...state, CUnit: null, SUnit: null };
    }
    const currentUnit = (side === 'C' ? state.CUnit : state.SUnit) ?? 'L';
    const converted = convert(side === 'C' ? state.C : state.S, currentUnit, choice);
    const withValue: CSEditState = side === 'C'
        ? { ...state, C: converted }
        : { ...state, S: converted };
    return resolveCSUnitPair(withValue, side, choice);
}
