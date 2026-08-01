/**
 * Rule-based fallback — intent classification + parameter extraction + custom formula + file analysis
 * ใช้ตอนไม่มี AI provider หรือ provider ล้มเหลว
 */
import { calculate } from '../calculations';
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
    N?: number;
    targetVolume?: number;
    mix_type?: number;
    tankCapacity?: number;
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
    const A0 = params.A0 ?? defaults.A0;
    const A_house = params.A_house ?? 100;
    const N = params.N ?? 1;
    const targetVolume = params.targetVolume ?? 1;
    const tankCapacity = params.tankCapacity ?? 10;
    const mix_type = method ?? (defaults.RA_unit === 'L' ? 1 : 2);

    if (C <= 0 || S <= 0 || RA <= 0 || A0 <= 0 || A_house <= 0 || N <= 0 || targetVolume <= 0 || tankCapacity <= 0) {
        return {
            text: '⚠️ ไม่สามารถคำนวณได้ เนื่องจากค่าสูตรไม่ถูกต้อง (ทุกค่าต้องเป็นจำนวนบวก) — กรุณาตรวจสอบ C, S, RA, พื้นที่ และจำนวนหลังบ้าน',
        };
    }

    try {
        const res = calculate({ C, S, RA, RA_unit, A0, A_house, N, targetVolume, mix_type, tankCapacity });

        const chemicalName = params.chemicalName || 'สารเคมี';
        const mixLabel = mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';
        const tanksCount = res.tanksCount;

        return {
            text: `🧪 **ผลการคำนวณ: ${chemicalName}** (${mixLabel})

• จำนวนหลังบ้าน: ${N} หลัง (พื้นที่ ${A_house} ตร.ม./หลัง)
• สารเข้มข้น (C): ${res.V_C} cc
• ตัวทำละลาย (S): ${res.V_S} cc
• **ปริมาณผสมรวม (Total): ${res.V_total} cc** (${round(res.V_total / 1000, 3)} ลิตร)
• ต่อ 1 หลัง: ${res.V_per_house} cc
• จำนวนถัง ${tankCapacity} ลิตร: ${tanksCount} ถัง (ผสม ${res.V_per_tank} cc ต่อถัง)

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
                tanksCount: res.tanksCount,
                V_C_per_tank: res.V_C_per_tank,
                V_S_per_tank: res.V_S_per_tank,
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

    // ขนาดถัง
    const tankMatch = lower.match(/(?:ถัง|tank)\s*(?:ขนาด)?\s*(\d+(?:\.\d+)?)\s*(?:ลิตร|l)\b/i);
    if (tankMatch) {
        params.tankCapacity = parseFloat(tankMatch[1]);
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
    const tankCapacity = params.tankCapacity ?? 10;
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
• ขนาดถังพ่น: ${tankCapacity} ลิตร

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
            tankCapacity,
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