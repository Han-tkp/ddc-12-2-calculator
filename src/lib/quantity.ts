/**
 * Parses Thai volume quantities off chemical-label forms and normalises them to
 * millilitres.
 *
 * Why this exists: the agency's intake form records the mixing ratio as two free-text
 * quantities that are routinely in DIFFERENT units — e.g. ซับมาริน is "500 มล." of
 * concentrate to "12.5 ลิตร (ผสมน้ำมัน)" of carrier. Reading those as bare numbers
 * yields 500:12.5, whereas the true ratio is 500 mL : 12,500 mL = 1:25. That is a
 * thousand-fold overdose of an organophosphate/pyrethroid, pointed the wrong way.
 * Any code deriving C:S from label text MUST normalise through here first.
 */

export type QuantityUnit = 'mL' | 'L' | 'part';

export interface ParsedQuantity {
    /** The number as written. */
    value: number;
    unit: QuantityUnit;
    /** Normalised to millilitres. `null` for unitless "ส่วน" (parts), which has no volume. */
    milliliters: number | null;
}

const LITRE_PATTERNS = /ลิตร|liter|litre|\bl\b/i;
const MILLILITRE_PATTERNS = /มิลลิลิตร|มล\.?|ซีซี|\bml\b|\bcc\b/i;
const PART_PATTERNS = /ส่วน|part/i;

/**
 * Extracts a quantity from a form cell such as "12.5 ลิตร (ผสมน้ำมั้น)" or "500 มล.".
 * Returns null when no number is present.
 *
 * Note the parenthetical carrier note ("(ผสมน้ำ)" / "(ผสมน้ำมัน)") is deliberately
 * ignored here — it identifies WHICH solvent, not how much, and is captured separately.
 */
/**
 * ⚠️ ยังไม่ได้ใช้งานในระบบจริง และ **ห้ามนำไปต่อสายก่อนตรวจ regex ใหม่**
 *
 * ตัวแยกหน่วยของฟังก์ชันกลุ่มนี้ (parseQuantity / ratioFromQuantities / parseArea)
 * ยังแยกหน่วยผิดในบางรูปแบบข้อความ ตอนนี้โปรดักชันเรียกใช้เฉพาะ formatCSUnitLabel
 * และ simplifyRatio จึงยังไม่เป็นอันตราย แต่ถ้านำสามฟังก์ชันนี้ไปใช้กับข้อมูลสารเคมี
 * เมื่อไหร่ ค่าที่แยกผิดจะกลายเป็นสัดส่วนผสมที่ผิดทันที
 *
 * ก่อนใช้งาน: แก้ regex และเพิ่มเทสต์ครอบรูปแบบข้อความที่พบจริงบนฉลากให้ครบก่อน
 */
export function parseQuantity(raw: unknown): ParsedQuantity | null {
    const text = String(raw ?? '').trim();
    if (!text) return null;

    // Strip the parenthetical note before looking for the unit, so "(ผสมน้ำมัน)" can't
    // be mistaken for a unit token.
    const withoutNote = text.replace(/\([^)]*\)/g, ' ');

    const numberMatch = withoutNote.match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!numberMatch) return null;

    const value = Number(numberMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) return null;

    // Order matters: check mL before L, because "มล." contains no "ล" ambiguity but
    // English "ml" would also satisfy a naive /l/ test.
    if (MILLILITRE_PATTERNS.test(withoutNote)) {
        return { value, unit: 'mL', milliliters: value };
    }
    if (LITRE_PATTERNS.test(withoutNote)) {
        return { value, unit: 'L', milliliters: value * 1000 };
    }
    if (PART_PATTERNS.test(withoutNote)) {
        return { value, unit: 'part', milliliters: null };
    }
    // No unit written at all — treat as a bare ratio part rather than guessing a volume.
    return { value, unit: 'part', milliliters: null };
}

/**
 * Derives the C:S ratio from two label quantities, converting to a common unit first.
 *
 * Both sides must be the same KIND of quantity: two volumes, or two unitless parts.
 * A volume paired with a bare "ส่วน" is rejected rather than guessed — silently
 * assuming a unit is how a dosing error gets shipped.
 */
/**
 * ⚠️ ยังไม่ได้ใช้งานในระบบจริง และ **ห้ามนำไปต่อสายก่อนตรวจ regex ใหม่**
 *
 * ตัวแยกหน่วยของฟังก์ชันกลุ่มนี้ (parseQuantity / ratioFromQuantities / parseArea)
 * ยังแยกหน่วยผิดในบางรูปแบบข้อความ ตอนนี้โปรดักชันเรียกใช้เฉพาะ formatCSUnitLabel
 * และ simplifyRatio จึงยังไม่เป็นอันตราย แต่ถ้านำสามฟังก์ชันนี้ไปใช้กับข้อมูลสารเคมี
 * เมื่อไหร่ ค่าที่แยกผิดจะกลายเป็นสัดส่วนผสมที่ผิดทันที
 *
 * ก่อนใช้งาน: แก้ regex และเพิ่มเทสต์ครอบรูปแบบข้อความที่พบจริงบนฉลากให้ครบก่อน
 */
export function ratioFromQuantities(
    concentrate: unknown,
    solvent: unknown
): { C: number; S: number; note: string } | null {
    const c = parseQuantity(concentrate);
    const s = parseQuantity(solvent);
    if (!c || !s) return null;

    const bothVolumes = c.milliliters !== null && s.milliliters !== null;
    const bothParts = c.milliliters === null && s.milliliters === null;

    if (bothVolumes) {
        const cMl = c.milliliters as number;
        const sMl = s.milliliters as number;
        if (cMl <= 0 || sMl <= 0) return null;
        const note = c.unit === s.unit
            ? `${c.value} ${c.unit} : ${s.value} ${s.unit}`
            : `แปลงหน่วยแล้ว: ${c.value} ${c.unit} = ${cMl} มล. : ${s.value} ${s.unit} = ${sMl} มล.`;
        return { C: cMl, S: sMl, note };
    }

    if (bothParts) {
        if (c.value <= 0 || s.value <= 0) return null;
        return { C: c.value, S: s.value, note: `${c.value} ส่วน : ${s.value} ส่วน` };
    }

    // Mixed kinds — refuse, and let the caller ask a human.
    return null;
}

/** Reduces a ratio to its simplest form for display (1500:30000 → 1:20). */
export function simplifyRatio(C: number, S: number): { C: number; S: number } {
    if (!Number.isFinite(C) || !Number.isFinite(S) || C <= 0 || S <= 0) return { C, S };
    // Work in integers so gcd is meaningful for values like 12.5.
    const scale = 1000;
    const ci = Math.round(C * scale);
    const si = Math.round(S * scale);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(ci, si) || 1;
    return { C: ci / g, S: si / g };
}

/**
 * Labels the unit an admin picked for C or S at entry time (C_unit/S_unit columns,
 * migration 20260810120000_add_cs_units.sql). "ส่วน" covers rows saved before that
 * migration existed — the stored ratio is still valid, the literal unit just wasn't recorded.
 */
export function formatCSUnitLabel(unit: 'L' | 'cc' | null | undefined): string {
    if (unit === 'L') return 'ลิตร';
    if (unit === 'cc') return 'มล.';
    return 'ส่วน';
}

/** Parses "10,000 ตารางเมตร" → 10000. Returns null when absent or unparseable. */
/**
 * ⚠️ ยังไม่ได้ใช้งานในระบบจริง และ **ห้ามนำไปต่อสายก่อนตรวจ regex ใหม่**
 *
 * ตัวแยกหน่วยของฟังก์ชันกลุ่มนี้ (parseQuantity / ratioFromQuantities / parseArea)
 * ยังแยกหน่วยผิดในบางรูปแบบข้อความ ตอนนี้โปรดักชันเรียกใช้เฉพาะ formatCSUnitLabel
 * และ simplifyRatio จึงยังไม่เป็นอันตราย แต่ถ้านำสามฟังก์ชันนี้ไปใช้กับข้อมูลสารเคมี
 * เมื่อไหร่ ค่าที่แยกผิดจะกลายเป็นสัดส่วนผสมที่ผิดทันที
 *
 * ก่อนใช้งาน: แก้ regex และเพิ่มเทสต์ครอบรูปแบบข้อความที่พบจริงบนฉลากให้ครบก่อน
 */
export function parseArea(raw: unknown): number | null {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(value) && value > 0 ? value : null;
}
