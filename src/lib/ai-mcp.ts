import { supabaseAdmin } from './supabase';
import { AIProviderError, defaultRouter } from './ai';

/* =========================================================================
 * AI / MCP Core Architecture
 *
 * The AI agent acts as a pure MCP (Model Context Protocol) intermediary:
 *   User prompt → AI → classify intent → call Supabase (fetch/calculate) → return result
 *
 * The AI does NOT perform calculations itself. All data and computation
 * come from Supabase (table queries, Postgres functions, or RPC calls).
 * ========================================================================= */

/** Formula schema returned to the chatbot UI */
export interface AIFormulaResult {
    name: string;
    description: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
    tankCapacity: number;
}

export interface ChatResponse {
    text: string;
    formula?: AIFormulaResult;
}

export interface FormulaDraftInput {
    fileName: string;
    headers: string[];
    rows: (string | number)[][];
}

function asNumber(value: unknown): number | undefined {
    const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Extract a formula draft from a structured upload. The draft is never saved automatically. */
export function buildFormulaDraftFromFile(input: FormulaDraftInput): { text: string; formula?: AIFormulaResult } | null {
    const headers = input.headers.map(header => header.trim().toLowerCase());
    const row = input.rows[0] ?? [];
    const find = (...names: string[]) => {
        const index = headers.findIndex(header => names.some(name => header === name || header.includes(name)));
        return index >= 0 ? row[index] : undefined;
    };
    const C = asNumber(find('c', 'chemical', 'สารเคมีเข้มข้น', 'สารเคมี'));
    const S = asNumber(find('s', 'solvent', 'ตัวทำละลาย', 'น้ำมัน', 'น้ำ'));
    const RA = asNumber(find('ra', 'rate', 'อัตราพ่น', 'อัตราการพ่น'));
    if (C === undefined || S === undefined || RA === undefined) return null;

    const name = String(find('name', 'ชื่อ', 'สารเคมี') || input.fileName.replace(/\.[^.]+$/, '')).trim();
    const unitValue = String(find('ra_unit', 'unit', 'หน่วย') || 'cc').toLowerCase();
    const mixType = asNumber(find('mix_type', 'ประเภทการผสม')) ?? 2;
    const formula: AIFormulaResult = {
        name,
        description: `สูตรจากไฟล์ ${input.fileName}`,
        C,
        S,
        RA,
        RA_unit: unitValue.includes('ลิตร') || unitValue === 'l' ? 'L' : 'cc',
        mix_type: mixType === 1 ? 1 : 2,
        A0: asNumber(find('a0', 'พื้นที่', 'พื้นที่มาตรฐาน')) ?? 1000,
        tankCapacity: asNumber(find('tankcapacity', 'tank', 'ถัง')) ?? 10,
    };
    return {
        text: `📄 อ่านไฟล์ "${input.fileName}" แล้ว และสร้างสูตรฉบับร่างให้ตรวจสอบ\n\n✅ พบข้อมูล C:S = ${C}:${S}, RA = ${RA} ${formula.RA_unit}\n⚠️ สูตรยังไม่ถูกบันทึก กรุณาตรวจสอบฉลากก่อนกด "บันทึกสูตรนี้"`,
        formula,
    };
}

/** Extract a formula draft from a human-readable label text file. */
export function buildFormulaDraftFromText(rawText: string, fileName: string): { text: string; formula?: AIFormulaResult } | null {
    const value = (patterns: RegExp[]) => {
        for (const pattern of patterns) {
            const match = rawText.match(pattern);
            if (match?.[1]) return match[1].trim();
        }
        return undefined;
    };
    const name = value([/(?:ชื่อสารเคมี|ชื่อสาร|chemical|name)\s*[:=]\s*(.+)/i]);
    const ratioMatch = rawText.match(/(?:อัตราส่วน|สัดส่วน|ratio)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/i);
    const raMatch = rawText.match(/(?:RA|อัตราพ่น|อัตราการพ่น)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ลิตร|liter|litre|L|มล\.?|ml|cc)/i);
    const area = value([/(?:พื้นที่มาตรฐาน|พื้นที่|A0)\s*[:=]?\s*([\d,]+)/i]);
    const tank = value([/(?:ขนาดถัง|ถัง|tank)\s*[:=]?\s*([\d,.]+)\s*(?:ลิตร|L|liter)?/i]);
    if (!ratioMatch || !raMatch) return null;
    const C = Number(ratioMatch[1]);
    const S = Number(ratioMatch[2]);
    const RA = Number(raMatch[1]);
    const RA_unit = /ลิตร|liter|litre|^L$/i.test(raMatch[2]) ? 'L' as const : 'cc' as const;
    const formula: AIFormulaResult = {
        name: name || fileName.replace(/\.[^.]+$/, ''),
        description: `สูตรจากไฟล์ ${fileName}`,
        C, S, RA, RA_unit,
        mix_type: /รวม|ได้สุทธิ|fixed/i.test(rawText) ? 1 : 2,
        A0: Number((area || '1000').replace(/,/g, '')) || 1000,
        tankCapacity: Number((tank || '10').replace(/,/g, '')) || 10,
    };
    return {
        text: `📄 อ่านข้อความในไฟล์ "${fileName}" แล้ว และสร้างสูตรฉบับร่างให้ตรวจสอบ\n\n✅ พบข้อมูล C:S = ${C}:${S}, RA = ${RA} ${RA_unit}\n⚠️ สูตรยังไม่ถูกบันทึก กรุณาตรวจสอบฉลากก่อนกด "บันทึกสูตรนี้"`,
        formula,
    };
}

/** Analyze a label image with AI Vision (Gemini/Claude/OpenAI) when a provider key is configured. */
export async function analyzeFormulaImage(imageData: string, fileName: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const router = defaultRouter;
    if (!router.isAnyConfigured()) {
        return { text: `🖼️ รับไฟล์ภาพ "${fileName}" แล้ว แต่ยังวิเคราะห์อัตโนมัติไม่ได้\n\nกรุณาตั้งค่า API key ของ AI provider อย่างใดอย่างหนึ่งบนเซิร์ฟเวอร์ (GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY) หรือส่งข้อมูลเป็น TXT/CSV โดยมีคอลัมน์ name, C, S, RA, RA_unit, mix_type, A0, tankCapacity` };
    }
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { text: '⚠️ รูปภาพไม่อยู่ในรูปแบบที่รองรับ' };
    const prompt = `อ่านข้อความจากฉลากสารเคมีในภาพ แล้วตอบเป็น JSON เท่านั้นตาม schema นี้: {"name":"string","description":"string","C":number,"S":number,"RA":number,"RA_unit":"L"|"cc","mix_type":1|2,"A0":number,"tankCapacity":number}. ห้ามเดาค่าที่อ่านไม่พบ ให้ใช้ 0 และใส่คำว่าไม่พบใน description. ค่า mix_type 1 คือผสมให้ได้ปริมาตรรวมคงที่, 2 คือผสมกับตัวทำละลาย. นี่คือไฟล์ ${fileName}`;
    try {
        const response = await router.analyzeImage({
            prompt,
            images: [{ mimeType: match[1], data: match[2] }],
        });
        const raw = response.text.replace(/```json|```/g, '').trim();
        if (!raw) throw new Error('ไม่พบผลวิเคราะห์จาก AI Vision');
        const parsed = JSON.parse(raw) as AIFormulaResult;
        return { text: `🖼️ วิเคราะห์ฉลาก "${fileName}" แล้ว (${response.provider}/${response.model}) และสร้างสูตรฉบับร่าง\n\n⚠️ กรุณาตรวจสอบค่ากับฉลากจริงก่อนบันทึก`, formula: parsed };
    } catch (err: any) {
        if (err instanceof AIProviderError) {
            return { text: `⚠️ AI Vision ไม่สามารถวิเคราะห์ภาพได้ (${err.kind === 'not_configured' ? 'ยังไม่ตั้งค่า API key' : `HTTP ${err.status || 'error'}`}) กรุณาตรวจสอบการตั้งค่าแล้วลองใหม่` };
        }
        throw err;
    }
}

/* ───────────── System Prompt ───────────── */

export const SYSTEM_PROMPT = `คุณคือผู้ช่วย AI / MCP ของกรมควบคุมโรค (DDC) สำหรับระบบคำนวณสารเคมีกำจัดยุง

กฎการทำงาน:
1. คุณมีหน้าที่รับ prompt จากผู้ใช้ และส่งต่อคำขอไปยัง Supabase database เท่านั้น
2. คุณจะไม่คำนวณเองทุกกรณี — Supabase เป็นผู้คำนวณทั้งหมด
3. คุณสามารถ query ข้อมูลจากตาราง label_profiles และ calculations ได้
4. เมื่อผู้ใช้ขอ "สูตรผสม" หรือ "คำนวณ" คุณต้องใช้ข้อมูลจากฐานข้อมูล Supabase เท่านั้น
5. ตอบกลับเป็นภาษาไทยด้วยสำนวนทางการแพทย์และสาธารณสุข
6. หากไม่พบข้อมูลในฐานข้อมูล ให้บอกผู้ใช้ไปตรงๆ ว่ายังไม่มีข้อมูลนี้
7. เน้นความปลอดภัย: แนะนำให้สวมถุงมือ หน้ากาก และแว่นตานิรภัยทุกครั้ง`;

/* ───────────── MCP Functions Registry ───────────── */

interface MCPFunction {
    name: string;
    description: string;
    handler: (args: Record<string, string>) => Promise<Record<string, unknown>>;
}

async function queryChemicalProfiles(args: Record<string, string>) {
    const search = args.search || '';
    const limit = Math.min(parseInt(args.limit || '10', 10) || 10, 50);
    const { data, error } = await supabaseAdmin
        .from('label_profiles')
        .select('*')
        .eq('isActive', true)
        .ilike('name', `%${search}%`)
        .order('name', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return { profiles: data ?? [] };
}

async function queryCalculations(args: Record<string, string>) {
    const limit = parseInt(args.limit || '10', 10);
    const chemical = args.chemical || '';
    let query = supabaseAdmin
        .from('calculations')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(Math.min(limit, 50));

    if (chemical) {
        query = query.ilike('chemical', `%${chemical}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { calculations: data ?? [] };
}

export const MCP_FUNCTIONS: MCPFunction[] = [
    {
        name: 'query_chemical_profiles',
        description: 'ค้นหาข้อมูลสูตรสารเคมีจากฐานข้อมูล label_profiles',
        handler: queryChemicalProfiles,
    },
    {
        name: 'query_calculations',
        description: 'ค้นหาประวัติการคำนวณและใช้งานสารเคมีย้อนหลัง',
        handler: queryCalculations,
    },
];

export { queryChemicalProfiles, queryCalculations };

/* ───────────── File Data Analysis ───────────── */

export interface FileAnalysisResult {
    text: string;
    formula?: AIFormulaResult;
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

function round(n: number, digits = 2): number {
    const p = Math.pow(10, digits);
    return Math.round(n * p) / p;
}

/* ───────────── Intent Classification ───────────── */

export type Intent = 'create_formula' | 'query_chemical' | 'query_history' | 'general_chat' | 'compare_chemicals';

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

/* ───────────── Formula Parameter Extraction ───────────── */

export interface ExtractedFormulaParams {
    chemicalName?: string;
    C?: number;
    S?: number;
    RA?: number;
    RA_unit?: 'L' | 'cc';
    tankCapacity?: number;
    method?: 'ULV' | 'fogging';
    A0?: number;
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
    const mix_type = isULV ? 2 : 2;
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

/* ───────────── Supabase Data Builders ───────────── */

/** Fetch chemical profiles from Supabase and build formula response */
export async function buildFormulaFromSupabase(searchTerm: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const profiles = await queryChemicalProfiles({ search: searchTerm });
    const list = profiles.profiles as Array<{
        name: string; description?: string; C: number; S: number;
        RA: number; RA_unit: string; mix_type: number; A0: number; tankCapacity: number;
    }>;

    if (list.length === 0) {
        return {
            text: `⚠️ ไม่พบข้อมูล "${searchTerm}" ในฐานข้อมูล label_profiles กรุณาตรวจสอบชื่อสารเคมีหรือลองคำค้นหาอื่น`,
        };
    }

    const profile = list[0];
    const mixLabel = profile.mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';

    return {
        text: `✅ ค้นพบข้อมูล "${profile.name}" ในฐานข้อมูล Supabase แล้ว

📋 **รายละเอียด:**
• อัตราส่วนผสม: ${profile.C} : ${profile.S} (${mixLabel})
• อัตราการพ่น (RA): ${profile.RA} ${profile.RA_unit} / ${profile.A0.toLocaleString()} ตร.ม.
• ขนาดถังพ่น: ${profile.tankCapacity} ลิตร

📝 ${profile.description || ''}

🔬 **ข้อควรปฏิบัติ:**
• สวมอุปกรณ์ป้องกัน PPE ทุกครั้ง (หน้ากาก N95, ถุงมือยาง, แว่นตานิรภัย)
• ตรวจสอบทิศทางลมก่อนฉีดพ่นทุกครั้ง
• หลีกเลี่ยงการพ่นในช่วงกลางวันที่มีแดดจัด`,
        formula: {
            name: profile.name,
            description: profile.description || '',
            C: profile.C,
            S: profile.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit as 'L' | 'cc',
            mix_type: profile.mix_type,
            A0: profile.A0,
            tankCapacity: profile.tankCapacity,
        },
    };
}

/** Generate a new formula recommendation based on best-match from Supabase data */
export async function buildNewFormulaRecommendation(userQuery: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const lower = userQuery.toLowerCase();

    const isFogging = lower.includes('fog') || lower.includes('หมอกควัน') || lower.includes('หมอก') || lower.includes('thermal');
    const isULV = lower.includes('ulv') || lower.includes('ฝอยละเอียด') || lower.includes('ยูแอลวี');

    const extracted = extractFormulaParams(userQuery);

    // ตรวจว่าเป็นสารเคมีที่รู้จักในระบบหรือไม่
    const KNOWN_BRANDS = ['deltacide', 'เดลตา', 'submarine', 'ซับมาริน', 'fendona', 'เฟนโดนา', 'k-othrine', 'โอทริน', 'โอธริน', 'aqua resigen', 'resigen', 'อควา'];
    const isKnownBrand = extracted.chemicalName
        ? KNOWN_BRANDS.some(b => extracted.chemicalName!.toLowerCase().includes(b) || b.includes(extracted.chemicalName!.toLowerCase()))
        : false;

    // ผู้ใช้ระบุสารเคมีตัวใหม่ที่ไม่รู้จัก → สร้างสูตรใหม่ทันที
    if (extracted.chemicalName && !isKnownBrand) {
        return buildCustomFormula(extracted, 'create');
    }

    let searchTerm = '';
    if (lower.includes('เดลตา') || lower.includes('delta') || lower.includes('deltacide')) {
        searchTerm = 'Deltacide';
    } else if (lower.includes('ซับมาริน') || lower.includes('submarine')) {
        searchTerm = 'Submarine';
    } else if (lower.includes('fendona') || lower.includes('เฟนโดนา')) {
        searchTerm = 'Fendona';
    } else if (lower.includes('k-othrine') || lower.includes('โอทริน') || lower.includes('โอธริน')) {
        searchTerm = 'K-Othrine';
    } else if (lower.includes('aqua') || lower.includes('resigen') || lower.includes('อควา')) {
        searchTerm = 'Aqua Resigen';
    }

    if (searchTerm) {
        const suffix = isFogging ? 'หมอกควัน' : isULV ? 'ULV' : '';
        const results = await queryChemicalProfiles({ search: `${searchTerm} ${suffix}`.trim() });
        const list = results.profiles as Array<{
            name: string; description?: string; C: number; S: number;
            RA: number; RA_unit: string; mix_type: number; A0: number; tankCapacity: number;
        }>;

        if (list.length > 0) {
            const profile = list[0];
            const mixLabel = profile.mix_type === 2 ? 'แบบผสมกับ (เติมสารทบน้ำมัน)' : 'แบบผสมให้ได้ (รวมปริมาตรคงที่)';

            return {
                text: `🧪 **Supabase พบข้อมูล:** "${profile.name}"

📋 สัดส่วนที่แนะนำตามมาตรฐาน DDC:
• สัดส่วน (C:S) = ${profile.C} : ${profile.S} (${mixLabel})
• อัตราพ่น = ${profile.RA} ${profile.RA_unit} ต่อ ${profile.A0.toLocaleString()} ตร.ม.
• ขนาดถังพ่น = ${profile.tankCapacity} ลิตร
• จำนวนบ้านประมาณ = ${Math.round(profile.A0 / 100)} หลัง (บ้านละ 100 ตร.ม.)

💧 **วิธีผสมต่อถัง ${profile.tankCapacity} ลิตร:**
${
    profile.mix_type === 2
        ? `• ตวงสารเคมี = ${(10000 * profile.C / profile.S).toFixed(0)} มล.
• เติมน้ำมัน/น้ำ = ${(10000 - (10000 * profile.C / profile.S)).toFixed(0)} มล.`
        : `• ตวงสารเคมี = ${(10000 * profile.C / (profile.C + profile.S)).toFixed(0)} มล.
• เติมน้ำมัน/น้ำ = ${(10000 * profile.S / (profile.C + profile.S)).toFixed(0)} มล.`
}

⚠️ **คำเตือน:** ใส่ PPE ทุกครั้งก่อนผสมและพ่นสารเคมี`,
                formula: {
                    name: profile.name,
                    description: profile.description || '',
                    C: profile.C,
                    S: profile.S,
                    RA: profile.RA,
                    RA_unit: profile.RA_unit as 'L' | 'cc',
                    mix_type: profile.mix_type,
                    A0: profile.A0,
                    tankCapacity: profile.tankCapacity,
                },
            };
        }
    }

    const profiles = await queryChemicalProfiles({ search: '' });
    const allProfiles = profiles.profiles as Array<{
        name: string; description?: string; C: number; S: number;
        RA: number; RA_unit: string; mix_type: number; A0: number; tankCapacity: number;
    }>;
    const profile = allProfiles[0];

    const params = extractFormulaParams(userQuery);

    // ผู้ใช้ระบุชื่อสารเคมีใหม่ แต่ไม่พบในฐานข้อมูล — สร้างสูตรใหม่ตามที่ระบุ
    if (params.chemicalName) {
        return buildCustomFormula(params, 'create');
    }

    // ไม่มีข้อมูลในฐานข้อมูลเลย — สร้างสูตรใหม่จากพารามิเตอร์ที่ผู้ใช้ระบุ
    if (!profile) {
        return buildCustomFormula(params, 'create');
    }

    return {
        text: `🧪 ขอแนะนำสูตร "${profile.name}" จากฐานข้อมูล Supabase`,
        formula: {
            name: profile.name,
            description: profile.description || '',
            C: profile.C,
            S: profile.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit as 'L' | 'cc',
            mix_type: profile.mix_type,
            A0: profile.A0,
            tankCapacity: profile.tankCapacity,
        },
    };
}

/** Compare two chemicals using Supabase data */
export async function buildChemicalComparison(userQuery: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const lower = userQuery.toLowerCase();

    const BRAND_ALIASES: { brand: string; keys: string[] }[] = [
        { brand: 'Deltacide', keys: ['deltacide', 'เดลตา'] },
        { brand: 'Submarine', keys: ['submarine', 'ซับมาริน'] },
        { brand: 'Fendona', keys: ['fendona', 'เฟนโดนา'] },
        { brand: 'K-Othrine', keys: ['k-othrine', 'โอทริน', 'โอธริน'] },
        { brand: 'Aqua Resigen', keys: ['aqua', 'resigen', 'อควา'] },
    ];

    const findBrand = (text: string): string | null => {
        for (const { brand, keys } of BRAND_ALIASES) {
            if (keys.some(k => text.includes(k))) return brand;
        }
        return null;
    };

    // แยกเคมีตัวแรก / ตัวที่สองจาก "เทียบ X กับ Y" / "X vs Y" / "X และ Y"
    const parts = lower.split(/กับ|vs\.?|และ|เทียบ|เปรียบเทียบ/).map(s => s.trim()).filter(Boolean);
    const mentioned = [...new Set(lower.match(/deltacide|เดลตา|submarine|ซับมาริน|fendona|เฟนโดนา|k-othrine|โอทริน|โอธริน|aqua|resigen|อควา/g) || [])];

    let chem1 = 'Deltacide';
    let chem2 = 'Submarine';

    if (mentioned.length >= 2) {
        const b1 = findBrand(parts[0] || mentioned[0]) || findBrand(mentioned[0]) || chem1;
        const b2 = findBrand(mentioned[1]) || chem2;
        chem1 = b1;
        chem2 = b2;
    } else {
        const b1 = findBrand(lower) || chem1;
        const b2 = mentioned.length === 1 && b1 === findBrand(lower)
            ? BRAND_ALIASES.find(a => a.brand !== b1)?.brand || chem2
            : chem2;
        chem1 = b1;
        chem2 = b2;
    }

    if (chem1 === chem2) {
        const other = BRAND_ALIASES.find(a => a.brand !== chem1)?.brand || 'Submarine';
        chem2 = other;
    }

    const r1 = await queryChemicalProfiles({ search: chem1 });
    const r2 = await queryChemicalProfiles({ search: chem2 });

    const p1 = (r1.profiles as Array<Record<string, unknown>>)?.[0] as Record<string, unknown> | undefined;
    const p2 = (r2.profiles as Array<Record<string, unknown>>)?.[0] as Record<string, unknown> | undefined;

    if (!p1 || !p2) {
        return {
            text: `⚠️ ไม่พบข้อมูล "${!p1 ? chem1 : chem2}" ในฐานข้อมูล Supabase`,
        };
    }

    return {
        text: `📊 **เปรียบเทียบ ${p1.name} vs ${p2.name} (จาก Supabase)**

| รายการ | ${p1.name} | ${p2.name} |
|---|---|---|
| สัดส่วน C:S | ${p1.C}:${p1.S} | ${p2.C}:${p2.S} |
| อัตราพ่น | ${p1.RA} ${p1.RA_unit} | ${p2.RA} ${p2.RA_unit} |
| พื้นที่มาตรฐาน | ${(p1.A0 as number).toLocaleString()} ตร.ม. | ${(p2.A0 as number).toLocaleString()} ตร.ม. |
| ขนาดถัง | ${p1.tankCapacity} ลิตร | ${p2.tankCapacity} ลิตร |
| ประเภทผสม | ${p1.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'} | ${p2.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'} |

💡 **ข้อแนะนำ:** เลือก ${p1.name} สำหรับการพ่นในพื้นที่เปิด และ ${p2.name} สำหรับพื้นที่อับหรือต้องการการปกคลุมนาน`,
    };
}
