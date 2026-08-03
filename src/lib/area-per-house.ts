/**
 * Resolves A_house (พื้นที่ต่อหลัง, m²) for the calculation engine.
 *
 * Why this is not simply read off the label: the intake form
 * (examplevbdc/แบบฟอร์มการกรอกสารเคมีพ่นจังหวัดสงขลาสตูล.xlsx) describes the CHEMICAL —
 * mixing ratio and spray rate per reference area. A_house describes the TARGET AREA.
 * No chemical label can ever contain it, so an AI asked to "find A_house from the form"
 * has nothing to find and would have to invent a number.
 *
 * What it can legitimately do is DERIVE it. In calculate() the term appears only as
 *
 *     V_total = RA_cc × (N × A_house) / A0
 *
 * so only the PRODUCT N × A_house — the total area treated — affects any output. That
 * makes A_house recoverable from figures a field officer actually has: the total area of
 * the zone, or the footprint of a typical house.
 *
 * All arithmetic here is deterministic. Per this codebase's rule the model maps language
 * to parameters; it never computes.
 */

export type AreaSource = 'explicit' | 'dimensions' | 'total-area' | 'default';

export interface AreaPerHouseInput {
    /** Already known, e.g. taken from a saved profile or typed by the officer. */
    A_house?: number | null;
    /** Total area of the operation (m²) — "พ่นทั้งหมู่บ้าน 5,000 ตร.ม." */
    A_total?: number | null;
    /** House count the total area covers. */
    N?: number | null;
    /** Footprint of a representative house — "บ้านกว้าง 8 ยาว 12". */
    width?: number | null;
    length?: number | null;
}

export interface AreaPerHouseResult {
    A_house: number;
    source: AreaSource;
    /** Thai one-liner explaining where the number came from, for the chat reply. */
    explanation: string;
    /** True when the value is a fallback rather than something the user supplied. */
    isAssumed: boolean;
}

/**
 * The engine's historical default, used across constants.ts and the calculator form.
 * Kept as the last resort so behaviour matches the existing UI when nothing is known.
 */
export const DEFAULT_AREA_PER_HOUSE = 100;

const isPositive = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0;

export function resolveAreaPerHouse(input: AreaPerHouseInput): AreaPerHouseResult {
    // 1. Explicit wins. If the officer stated it, never second-guess it.
    if (isPositive(input.A_house)) {
        return {
            A_house: input.A_house,
            source: 'explicit',
            explanation: `ใช้พื้นที่ต่อหลังที่ระบุ ${input.A_house} ตร.ม.`,
            isAssumed: false,
        };
    }

    // 2. Measured footprint. More specific than a zone average, so it outranks it.
    if (isPositive(input.width) && isPositive(input.length)) {
        const area = input.width * input.length;
        return {
            A_house: area,
            source: 'dimensions',
            explanation: `คำนวณจากขนาดบ้าน ${input.width} × ${input.length} = ${area} ตร.ม./หลัง`,
            isAssumed: false,
        };
    }

    // 3. Back out the average from the whole operation. This is the case the engine
    //    actually cares about, since only N × A_house reaches the result.
    if (isPositive(input.A_total) && isPositive(input.N)) {
        const area = input.A_total / input.N;
        return {
            A_house: area,
            source: 'total-area',
            explanation:
                `ย้อนหาจากพื้นที่รวม ${input.A_total.toLocaleString('th-TH')} ตร.ม. ÷ ${input.N} หลัง ` +
                `= ${Number(area.toFixed(2)).toLocaleString('th-TH')} ตร.ม./หลัง`,
            isAssumed: false,
        };
    }

    // 4. Nothing to go on. Say so loudly rather than presenting a guess as a measurement.
    return {
        A_house: DEFAULT_AREA_PER_HOUSE,
        source: 'default',
        explanation:
            `ไม่ได้ระบุพื้นที่ต่อหลัง จึงใช้ค่าเริ่มต้น ${DEFAULT_AREA_PER_HOUSE} ตร.ม./หลัง ` +
            `— หากทราบพื้นที่รวมหรือขนาดบ้านจริง กรุณาแจ้งเพื่อให้ผลแม่นยำขึ้น`,
        isAssumed: true,
    };
}
