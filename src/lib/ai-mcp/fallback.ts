/**
 * Rule-based fallback — intent classification + parameter extraction + custom formula + file analysis
 * ใช้ตอนไม่มี AI provider หรือ provider ล้มเหลว
 */
import { calculate } from '../calculations';
import { resolveAreaPerHouse } from '../area-per-house';
import { ratioFromQuantities, simplifyRatio, parseQuantity } from '../quantity';
import type { AIFormulaResult, FileAnalysisResult, ExtractedFormulaParams, Intent } from './types';

function round(n: number, digits = 2): number {
    const p = Math.pow(10, digits);
    return Math.round(n * p) / p;
}

/** พารามิเตอร์สำหรับการคำนวณปริมาณ — ค่าที่ AI/rule-based ส่งมา */
export interface CalculationRequest {
    C?: number;
    S?: number;
    RA?: number;
    RA_unit?: 'L' | 'cc';
    A0?: number;
    A_house?: number;
    /** Total area treated (m²). With N, this back-derives A_house — see area-per-house.ts. */
    A_total?: number;
    /** Footprint of a representative house (m), when the officer measured it instead. */
    houseWidth?: number;
    houseLength?: number;
    N?: number;
    targetVolume?: number;
    mix_type?: number;
    chemicalName?: string;
}

/**
 * คำนวณปริมาณสารเคมีด้วย deterministic engine (calculations.ts) และจัดรูปแบบคำตอบภาษาไทย
 *
 * สำคัญ: ตรงนี้คือจุดเดียวที่ AI/MCP layer เรียก engine จริง — AI จะไม่คำนวณเอง
 * ถ้าค่าไม่ครบ/ผิด จะคืนข้อความแนะนำ ไม่ throw เพื่อให้ LLM รู้และถามผู้ใช้ต่อ
 */
export function buildCalculationResponse(params: CalculationRequest): { text: string; result?: Record<string, number | string> } {
    const method = (params.mix_type === 1 || params.mix_type === 2)
        ? params.mix_type
        : undefined;
    const defaults = params.mix_type === 1
        ? { C: 1, S: 79, RA: 1, RA_unit: 'L' as const, A0: 1000 }
        : { C: 1, S: 9, RA: 50, RA_unit: 'cc' as const, A0: 1000 };

    const C = params.C ?? defaults.C;
    const S = params.S ?? defaults.S;
    const RA = params.RA ?? defaults.RA;
    const RA_unit = params.RA_unit ?? defaults.RA_unit;
    // A0 divides straight into the dose, so a wrong or silently-defaulted value scales
    // the whole result. Weak models routinely drop it — they read "1,250 cc ต่อ 10,000
    // ตร.ม." and send only the 1,250 — which quietly turns a correct answer into a
    // tenfold overdose. Track the omission and say so in the reply.
    const A0IsAssumed = params.A0 === undefined || params.A0 === null;
    const A0 = params.A0 ?? defaults.A0;
    const N = params.N ?? 1;
    // A_house never appears on a chemical label — it describes the target area, not the
    // product. Derive it from whatever the officer actually knows, deterministically.
    const area = resolveAreaPerHouse({
        A_house: params.A_house,
        A_total: params.A_total,
        N,
        width: params.houseWidth,
        length: params.houseLength,
    });
    const A_house = area.A_house;
    const targetVolume = params.targetVolume ?? 1;
    const mix_type = method ?? (defaults.RA_unit === 'L' ? 1 : 2);

    if (C <= 0 || S <= 0 || RA <= 0 || A0 <= 0 || A_house <= 0 || N <= 0 || targetVolume <= 0) {
        return {
            text: '⚠️ ไม่สามารถคำนวณได้ เนื่องจากค่าสูตรไม่ถูกต้อง (ทุกค่าต้องเป็นจำนวนบวก) — กรุณาตรวจสอบ C, S, RA, พื้นที่ และจำนวนหลังบ้าน',
        };
    }

    try {
        const res = calculate({ C, S, RA, RA_unit, A0, A_house, N, targetVolume, mix_type });

        const chemicalName = params.chemicalName || 'สารเคมี';
        const mixLabel = mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';

        return {
            text: `🧪 **ผลการคำนวณ: ${chemicalName}** (${mixLabel})

• จำนวนหลังบ้าน: ${N} หลัง (พื้นที่รวม ${round(N * A_house, 2).toLocaleString('th-TH')} ตร.ม.)
• พื้นที่ต่อหลัง: ${round(A_house, 2)} ตร.ม. ${area.isAssumed ? '⚠️' : '✓'} ${area.explanation}
• อัตราพ่น: ${RA} ${RA_unit === 'L' ? 'ลิตร' : 'มล.'} ต่อ ${A0.toLocaleString('th-TH')} ตร.ม. ${A0IsAssumed
                    ? '⚠️ ไม่ได้ระบุพื้นที่อ้างอิง จึงใช้ค่าเริ่มต้น 1,000 ตร.ม. — ถ้าฉลากระบุเป็นค่าอื่น (เช่น ต่อ 10,000 ตร.ม.) ปริมาณยาจะผิดเป็นเท่าตัว กรุณาระบุให้ชัด'
                    : '✓'}
• สารเข้มข้น (C): ${res.V_C} cc
• ตัวทำละลาย (S): ${res.V_S} cc
• **ปริมาณผสมรวม (Total): ${res.V_total} cc** (${round(res.V_total / 1000, 3)} ลิตร)
• ต่อ 1 หลัง: ${res.V_per_house} cc

💡 ถ้าต้องการผสมแบบ target volume ${targetVolume} ลิตร: สาร ${res.V_C_target} cc + ตัวทำละลาย ${res.V_S_target} cc

⚠️ ตรวจสอบกับฉลากผลิตภัณฑ์จริงก่อนใช้งาน และสวม PPE`,
            result: {
                V_total: res.V_total,
                V_C: res.V_C,
                V_S: res.V_S,
                V_per_house: res.V_per_house,
                V_C_1L: res.V_C_1L,
                V_S_1L: res.V_S_1L,
                V_C_target: res.V_C_target,
                V_S_target: res.V_S_target,
                mix_type,
            },
        };
    } catch (e) {
        return {
            text: `⚠️ ไม่สามารถคำนวณได้: ${e instanceof Error ? e.message : 'ค่าสูตรไม่ถูกต้อง'} — กรุณาตรวจสอบค่าที่ป้อน`,
        };
    }
}

export function classifyIntent(text: string): Intent {
    const lower = text.toLowerCase();

    // Checked first, and before 'create_formula', because "คำนวณ...ผสม..." would otherwise
    // be read as a request to author a formula. The calculation engine is deterministic,
    // so this intent must stay reachable even with no AI provider or subscription —
    // otherwise the chat can't do arithmetic precisely when it has no model to lean on.
    if (
        lower.includes('คำนวณ') ||
        lower.includes('คํานวณ') ||
        lower.includes('ต้องใช้เท่าไหร่') ||
        lower.includes('ต้องผสมเท่าไร') ||
        lower.includes('กี่ถัง') ||
        lower.includes('calculate')
    ) {
        return 'calculate';
    }

    if (
        lower.includes('สร้าง') ||
        lower.includes('สร้างสูตร') ||
        lower.includes('สูตรผสม') ||
        lower.includes('ขอสูตร') ||
        lower.includes('ช่วยสร้าง')
    ) {
        return 'create_formula';
    }

    if (
        lower.includes('เทียบ') ||
        lower.includes('เปรียบเทียบ') ||
        lower.includes('ต่าง') ||
        lower.includes('vs') ||
        lower.includes('compare')
    ) {
        return 'compare_chemicals';
    }

    if (
        lower.includes('ค้นหา') ||
        lower.includes('หาข้อมูล') ||
        lower.includes('มีอะไรบ้าง') ||
        lower.includes('คืออะไร') ||
        lower.includes('del') ||
        lower.includes('delta') ||
        lower.includes('submarine') ||
        lower.includes('fendona') ||
        lower.includes('k-othrine') ||
        lower.includes('aqua resigen') ||
        lower.includes('เคมี')
    ) {
        return 'query_chemical';
    }

    if (
        lower.includes('ประวัติ') ||
        lower.includes('การใช้งาน') ||
        lower.includes('สถิติ') ||
        lower.includes('ย้อนหลัง') ||
        lower.includes('history') ||
        lower.includes('log')
    ) {
        return 'query_history';
    }

    return 'general_chat';
}

/**
 * ดึงค่าพารามิเตอร์ของสูตรจากข้อความของผู้ใช้ เช่น
 * "สร้างสูตร ULV สำหรับยาสาร X อัตราส่วน 1:9 RA 50 ถัง 5 ลิตร"
 */
/**
 * Pulls calculation parameters out of a Thai sentence for the rule-based path.
 *
 * Ratios go through ratioFromQuantities so "500 มล. ต่อ 12.5 ลิตร" normalises to 1:25
 * rather than 500:12.5 — the same thousand-fold hazard the spreadsheet importer guards
 * against. A_house is deliberately NOT guessed here; it is derived downstream by
 * resolveAreaPerHouse from whichever of A_total / dimensions the officer supplied.
 */
export function extractCalculationParams(userQuery: string): CalculationRequest {
    const text = userQuery.trim();
    const params: CalculationRequest = {};

    const UNIT = '(?:ลิตร|ล\\.|มล\\.?|ml|cc|ซีซี|ส่วน)';

    // Ratio, written either "500 มล. : 12.5 ลิตร" or "500 มล. ต่อ 12.5 ลิตร".
    const ratioMatch = text.match(
        new RegExp(`(\\d+(?:\\.\\d+)?\\s*${UNIT}?)\\s*(?::|ต่อ)\\s*(\\d+(?:\\.\\d+)?\\s*${UNIT})`, 'i')
    );
    if (ratioMatch) {
        const ratio = ratioFromQuantities(ratioMatch[1], ratioMatch[2]);
        if (ratio) {
            const simple = simplifyRatio(ratio.C, ratio.S);
            params.C = simple.C;
            params.S = simple.S;
        }
    }

    // Spray rate and its reference area: "พ่น 1.25 ลิตรต่อ 10000 ตร.ม."
    const raMatch = text.match(
        new RegExp(`(?:พ่น|อัตรา(?:การ)?พ่น|ra)\\s*(?:=|คือ)?\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT})\\s*(?:ต่อ|/)\\s*([\\d,]+)\\s*(?:ตร\\.?\\s*ม\\.?|ตารางเมตร|m2)`, 'i')
    );
    if (raMatch) {
        const quantity = parseQuantity(`${raMatch[1]} ${raMatch[2]}`);
        if (quantity?.milliliters != null) {
            params.RA = quantity.milliliters;
            params.RA_unit = 'cc';
        }
        params.A0 = Number(raMatch[3].replace(/,/g, '')) || undefined;
    }

    // House count.
    const nMatch = text.match(/(\d[\d,]*)\s*หลัง/);
    if (nMatch) params.N = Number(nMatch[1].replace(/,/g, ''));

    // Total treated area — the figure an officer actually has for a zone.
    const totalMatch = text.match(/พื้นที่(?:รวม|ทั้งหมด|ทั้งหมู่บ้าน)\s*([\d,]+(?:\.\d+)?)/);
    if (totalMatch) params.A_total = Number(totalMatch[1].replace(/,/g, ''));

    // Explicit per-house area, if stated outright.
    const perHouseMatch = text.match(/(?:พื้นที่)?ต่อหลัง\s*([\d,]+(?:\.\d+)?)|บ้านละ\s*([\d,]+(?:\.\d+)?)\s*(?:ตร\.?\s*ม\.?|ตารางเมตร)/);
    if (perHouseMatch) {
        const raw = perHouseMatch[1] ?? perHouseMatch[2];
        if (raw) params.A_house = Number(raw.replace(/,/g, ''));
    }

    // House footprint: "บ้านกว้าง 8 ยาว 12".
    const dimMatch = text.match(/กว้าง\s*(\d+(?:\.\d+)?)\s*(?:ม\.?|เมตร)?\s*(?:ยาว|x|×)\s*(\d+(?:\.\d+)?)/);
    if (dimMatch) {
        params.houseWidth = Number(dimMatch[1]);
        params.houseLength = Number(dimMatch[2]);
    }

    // Mixing method.
    if (/ผสมให้ได้/.test(text)) params.mix_type = 1;
    else if (/ผสมกับ/.test(text)) params.mix_type = 2;

    // Chemical name, for the reply header only — never used in arithmetic.
    const nameMatch = text.match(/คำนวณ\s*([฀-๿a-zA-Z0-9\s-]{2,40}?)\s*(?:ULV|หมอกควัน|อัตราส่วน|สัดส่วน|$)/i);
    if (nameMatch?.[1]?.trim()) params.chemicalName = nameMatch[1].trim();

    return params;
}

export function extractFormulaParams(userQuery: string): ExtractedFormulaParams {
    const lower = userQuery.toLowerCase();
    const params: ExtractedFormulaParams = {};

    // ชื่อสารเคมี — คำหลัง "สาร" / "ยาเคมี" / "ยาสาร"
    const nameMatch = lower.match(/(?:สาร|ยาเคมี|ยาสาร)\s+([a-z0-9\-]+(?:\s+[a-z0-9\-]+){0,3})(?=\s*(?:อัตราส่วน|ratio|สัดส่วน|วิธี|แบบ|ถัง|ra\b|ด้วย|เพื่อ|สำหรับ|$))/i);
    if (nameMatch && nameMatch[1].trim()) {
        params.chemicalName = nameMatch[1].trim();
    } else {
        const secondNameMatch = lower.match(/สร้าง\s*(?:สูตร)?\s*(?:พ่น|วิธี)?\s*([a-z0-9\-]+(?:\s+[a-z0-9\-]+){0,3})(?=\s*(?:อัตราส่วน|ratio|สัดส่วน|วิธี|แบบ|ถัง|ra\b|ด้วย|เพื่อ|สำหรับ|$))/i);
        if (secondNameMatch && secondNameMatch[1].trim()) {
            params.chemicalName = secondNameMatch[1].trim();
        }
    }

    // อัตราส่วน C:S — รูปแบบ "1:79", "1 : 79"
    const ratioMatch = lower.match(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/);
    if (ratioMatch) {
        params.C = parseFloat(ratioMatch[1]);
        params.S = parseFloat(ratioMatch[2]);
    }

    // วิธีพ่น
    if (lower.includes('ulv') || lower.includes('ฝอยละเอียด') || lower.includes('ยูแอลวี') || lower.includes('ยูแอล')) {
        params.method = 'ULV';
    } else if (lower.includes('หมอก') || lower.includes('fog') || lower.includes('thermal')) {
        params.method = 'fogging';
    }

    // อัตราการพ่น RA
    const raMatch = lower.match(/(?:RA|อัตรา(?:การ)?พ่น)\s*(?:=|คือ)?\s*(\d+(?:\.\d+)?)\s*(cc|ซีซี|มล|ml|l|ลิตร)/i);
    if (raMatch) {
        params.RA = parseFloat(raMatch[1]);
        const unit = raMatch[2].toLowerCase();
        params.RA_unit = (unit === 'l' || unit === 'ลิตร') ? 'L' : 'cc';
    }

    // พื้นที่มาตรฐาน A0
    const a0Match = lower.match(/(?:พื้นที่|a0)\s*(?:มาตรฐาน)?\s*(?:=|คือ)?\s*(\d+(?:\.\d+)?)/i);
    if (a0Match) {
        params.A0 = parseFloat(a0Match[1]);
    }

    return params;
}

/** สร้างสูตรใหม่จากพารามิเตอร์ที่แยกได้ (ค่า default หากไม่ได้ระบุ) */
export function buildCustomFormula(params: ExtractedFormulaParams, source: 'query' | 'create'): { text: string; formula?: AIFormulaResult } {
    const method = params.method || 'ULV';
    const isULV = method === 'ULV';

    const defaults = isULV
        ? { C: 1, S: 9, RA: 50, RA_unit: 'cc' as const, A0: 1000 }
        : { C: 1, S: 79, RA: 1, RA_unit: 'L' as const, A0: 1000 };

    const C = params.C ?? defaults.C;
    const S = params.S ?? defaults.S;
    const RA = params.RA ?? defaults.RA;
    const RA_unit = params.RA_unit ?? defaults.RA_unit;
    const A0 = params.A0 ?? defaults.A0;
    // ULV → mix_type 2 (แบบผสมกับ — เติมสารทบน้ำมัน/ตัวทำละลาย)
    // Fogging → mix_type 1 (แบบผสมให้ได้ — รวมปริมาตรคงที่)
    const mix_type = isULV ? 2 : 1;
    const chemicalName = params.chemicalName || (source === 'query' ? 'สารเคมีใหม่' : 'สูตรใหม่');

    const mixLabel = mix_type === 2 ? 'แบบผสมกับ (เติมสารทบ)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';
    const methodLabel = isULV ? 'พ่นฝอยละเอียด ULV' : 'พ่นหมอกควัน Thermal Fogging';
    const methodNote = source === 'query'
        ? `✅ ไม่พบ "${chemicalName}" ในฐานข้อมูล — สร้างสูตรใหม่ให้แล้ว กรุณาตรวจสอบและแก้ไขก่อนใช้งาน`
        : `🧪 สร้างสูตรใหม่ "${chemicalName}" ตามข้อมูลที่คุณระบุ`;

    return {
        text: `${methodNote}

📋 **${chemicalName}** — ${methodLabel}
• อัตราส่วนผสม: ${C} : ${S} (${mixLabel})
• อัตราการพ่น (RA): ${RA} ${RA_unit} / ${A0.toLocaleString()} ตร.ม.

💡 **หมายเหตุ:** สูตรนี้สร้างใหม่จากข้อมูลที่คุณให้ ยังไม่ได้บันทึกในฐานข้อมูล
กด "ส่งไปคำนวณ" เพื่อดูรายละเอียด หรือ "บันทึกสูตรนี้" เพื่อเพิ่มเข้า database

⚠️ **คำเตือน:** ตรวจสอบความถูกต้องกับเอกสารของผลิตภัณฑ์ก่อนใช้งานจริง`,
        formula: {
            name: chemicalName,
            description: `${chemicalName} ${methodLabel} อัตราส่วน ${C}:${S} สร้างใหม่จาก AI Chatbot`,
            C,
            S,
            RA,
            RA_unit,
            mix_type,
            A0,
        },
    };
}

/**
 * วิเคราะห์ไฟล์ที่ผู้ใช้อัปโหลด — คำนวณสถิติต่อคอลัมน์ และตอบคำถาม
 * data: หัวตาราง + แถวข้อมูล (จาก file-import.ts)
 */
export function buildFileAnalysis(
    headers: string[],
    rows: (string | number)[][],
    userQuery: string,
    fileName: string
): FileAnalysisResult {
    const lower = userQuery.toLowerCase();
    const numericCols: { name: string; values: number[] }[] = [];

    for (let c = 0; c < headers.length; c++) {
        const values = rows
            .map(r => r[c])
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        if (values.length > 0) {
            numericCols.push({ name: headers[c] || `คอลัมน์${c + 1}`, values });
        }
    }

    const stats = numericCols.map(col => {
        const sum = col.values.reduce((a, b) => a + b, 0);
        const avg = sum / col.values.length;
        const min = Math.min(...col.values);
        const max = Math.max(...col.values);
        return { name: col.name, count: col.values.length, sum, avg, min, max };
    });

    const totalAll = numericCols.reduce((a, col) => a + col.values.reduce((x, y) => x + y, 0), 0);

    // ตรวจจับคำถามเรื่องสถิติ
    const asksStats = /(รวม|sum|ผลรวม|เฉลี่ย|avg|average|มากสุด|max|น้อยสุด|min|สถิติ|stat)/i.test(lower);
    const asksCol = numericCols.find(c => lower.includes(c.name.toLowerCase()));

    if (asksStats) {
        const lines = stats.map(s =>
            `• ${s.name}: รวม=${round(s.sum)} | เฉลี่ย=${round(s.avg)} | น้อยสุด=${round(s.min)} | มากสุด=${round(s.max)} | (${s.count} ค่า)`
        );
        return {
            text: `📊 **ผลการวิเคราะห์ไฟล์ "${fileName}"** (${rows.length} แถว)

${lines.length > 0 ? lines.join('\n') : '• ยังไม่มีคอลัมน์ตัวเลขให้คำนวณ'}

💰 **ยอดรวมทุกคอลัมน์:** ${round(totalAll)}
${asksCol ? `\n📌 คอลัมน์ "${asksCol.name}" ที่คุณถาม: รวม=${round(asksCol.values.reduce((a, b) => a + b, 0))}` : ''}`,
        };
    }

    if (stats.length === 0) {
        return {
            text: `📄 อ่านไฟล์ "${fileName}" แล้ว — ${rows.length} แถว ${headers.length} คอลัมน์
คอลัมน์: ${headers.join(', ')}

ยังไม่พบคอลัมน์ตัวเลขที่คำนวณได้ ลองถาม เช่น "ผลรวมคอลัมน์ [ชื่อ]" หรือ "เฉลี่ยของทุกคอลัมน์"`,
        };
    }

    return {
        text: `📄 **อ่านไฟล์ "${fileName}" แล้ว** — ${rows.length} แถว × ${headers.length} คอลัมน์
คอลัมน์: ${headers.join(', ')}

**คอลัมน์ตัวเลขที่คำนวณได้:**
${stats.map(s => `• ${s.name} (${s.count} ค่า)`).join('\n')}

ถามได้ เช่น:
• "รวมคอลัมน์ ${stats[0]?.name}"
• "ค่าเฉลี่ยทุกคอลัมน์"
• "คอลัมน์ไหนมากสุด"`,
    };
}