/**
 * Deterministic draft extraction — แปลงไฟล์/ข้อความที่ผู้ใช้แนบเป็น "สูตรฉบับร่าง"
 * โดยไม่ผ่าน LLM (แม่นยำกว่า, ไม่ hallucinate, ไม่กิน quota)
 */
import { asNumber, type AIFormulaResult, type FormulaDraftInput } from './types';
import { ratioFromQuantities, simplifyRatio, parseQuantity, parseArea } from '../quantity';

/**
 * Locates a column by header name.
 *
 * Matching is anchored rather than a bare `includes`, because the agency's intake form
 * has both "ชื่อสารเคมี" (the product name) and "สารเคมีที่ใช้" (the concentrate
 * quantity). A substring test for "สารเคมี" hits the name column first and pulls a
 * string where a number is expected. Single-letter aliases like "c"/"s" are matched
 * exactly for the same reason — `header.includes('s')` matches almost anything.
 */
function makeFinder(headers: string[], row: unknown[]) {
    const normalised = headers.map(h => String(h ?? '').trim().toLowerCase());
    return (...names: string[]) => {
        // Exact match first — the least ambiguous signal available.
        for (const name of names) {
            const i = normalised.indexOf(name.toLowerCase());
            if (i >= 0) return row[i];
        }
        // Then substring, but only for aliases long enough to be meaningful.
        for (const name of names) {
            if (name.length < 3) continue;
            const i = normalised.findIndex(h => h.includes(name.toLowerCase()));
            if (i >= 0) return row[i];
        }
        return undefined;
    };
}

/** ประเภทการผสม: "ผสมให้ได้" = 1 (ปริมาตรรวมคงที่), "ผสมกับ" = 2 (เติมทบตัวทำละลาย) */
function parseMixType(raw: unknown): 1 | 2 | undefined {
    const text = String(raw ?? '').trim();
    if (!text) return undefined;
    if (/ผสมให้ได้/.test(text)) return 1;
    if (/ผสมกับ/.test(text)) return 2;
    const n = asNumber(text);
    if (n === 1 || n === 2) return n;
    return undefined;
}

/** Builds one draft from a single spreadsheet row. Returns null when the row is unusable. */
function draftFromRow(headers: string[], row: unknown[], fileName: string): AIFormulaResult | null {
    const find = makeFinder(headers, row);

    // The concentrate/solvent cells carry their own units and are frequently different
    // from each other ("500 มล." vs "12.5 ลิตร"). ratioFromQuantities normalises both to
    // millilitres before dividing — reading them as bare numbers is a 1000× dosing error.
    const ratio = ratioFromQuantities(
        find('สารเคมีที่ใช้', 'ปริมาณสารเคมี', 'concentrate', 'c'),
        find('ตัวทำละลาย (น้ำหรือน้ำมัน)', 'ตัวทำละลาย', 'solvent', 's')
    );
    if (!ratio) return null;

    // The spray rate arrives two ways: with the unit inline ("1.25 ลิตร", the agency's
    // intake form) or split across an RA/RA_unit column pair (the simpler export format).
    const raRaw = find('ฉีดพ่นในอัตรา', 'ปริมาณฉีดพ่น', 'อัตราการฉีดพ่น', 'อัตราพ่น', 'rate', 'ra');
    const raQuantity = parseQuantity(raRaw);
    if (!raQuantity) return null;

    let RA: number;
    let RA_unit: 'L' | 'cc';
    if (raQuantity.milliliters !== null) {
        // Unit was written next to the number — normalise to cc so it pairs exactly with A0.
        RA = raQuantity.milliliters;
        RA_unit = 'cc';
    } else {
        const unitColumn = String(find('ra_unit', 'หน่วย', 'unit') ?? '').toLowerCase();
        if (!unitColumn) return null; // No unit anywhere; guessing one is a dosing error.
        RA = raQuantity.value;
        RA_unit = /ลิตร|liter|litre|^l$/.test(unitColumn) ? 'L' : 'cc';
    }

    const A0 = parseArea(find('ต่อพื้นที่ตารางเมตร', 'พื้นที่มาตรฐาน', 'พื้นที่', 'a0')) ?? 1000;

    const rawName = String(find('ชื่อสารเคมี', 'name', 'ชื่อ') ?? '').trim();
    const method = String(find('ระบุ สูตร ulv/หมอกควัน', 'สูตร', 'method') ?? '').trim();
    const agency = String(find('หน่วยงาน', 'agency') ?? '').trim();
    if (!rawName) return null;

    const simple = simplifyRatio(ratio.C, ratio.S);

    const descriptionParts = [
        `นำเข้าจากไฟล์ ${fileName}`,
        `อัตราส่วน ${simple.C}:${simple.S}`,
        ratio.note,
        agency ? `หน่วยงาน ${agency}` : '',
    ].filter(Boolean);

    return {
        name: method ? `${rawName} (${method})` : rawName,
        description: descriptionParts.join(' • '),
        C: simple.C,
        S: simple.S,
        RA,
        RA_unit,
        mix_type: parseMixType(find('ประเภทการผสม', 'mix_type')) ?? 2,
        A0,
    };
}

/**
 * Extract formula drafts from a structured upload. Drafts are never saved automatically.
 *
 * The agency's intake form is a catalogue — one chemical per row, seventeen rows in the
 * Songkhla/Satun sheet — so every readable row is surfaced, not just the first.
 */
export function buildFormulaDraftFromFile(
    input: FormulaDraftInput
): { text: string; formula?: AIFormulaResult; formulas?: AIFormulaResult[] } | null {
    const headers = input.headers.map(header => String(header ?? '').trim());
    const drafts = input.rows
        .map(row => draftFromRow(headers, row, input.fileName))
        .filter((d): d is AIFormulaResult => d !== null);

    if (drafts.length === 0) return null;

    const skipped = input.rows.length - drafts.length;
    const lines = drafts
        .map((d, i) => `${i + 1}. ${d.name} — ${d.C}:${d.S}, พ่น ${d.RA} ${d.RA_unit === "L" ? "ลิตร" : "มล."}/${d.A0.toLocaleString("th-TH")} ตร.ม. (${d.mix_type === 1 ? 'ผสมให้ได้' : 'ผสมกับ'})`)
        .join('\n');

    return {
        text: `📄 อ่านไฟล์ "${input.fileName}" แล้ว พบสูตรที่ใช้ได้ ${drafts.length} รายการ`
            + (skipped > 0 ? ` (ข้าม ${skipped} แถวที่ข้อมูลไม่ครบหรือหน่วยไม่ตรงกัน)` : '')
            + `\n\n${lines}\n\n`
            + `ℹ️ อัตราส่วนถูกแปลงเป็นหน่วยเดียวกันก่อนคำนวณแล้ว\n`
            + `⚠️ ยังไม่บันทึก กรุณาตรวจสอบกับฉลากจริงก่อนกด "บันทึกสูตรนี้"`,
        // First draft stays on `formula` so existing single-formula callers keep working.
        formula: drafts[0],
        formulas: drafts,
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
    // Capture the unit alongside each side so "1 ลิตร : 170 ลิตร" and the mixed-unit
    // "500 มล. : 12.5 ลิตร" both normalise correctly instead of dividing raw numbers.
    const ratioMatch = rawText.match(
        /(?:อัตราส่วน|สัดส่วน|ratio)\s*[:=]?\s*(\d+(?:\.\d+)?\s*(?:ลิตร|liter|litre|L|มล\.?|ml|cc|ซีซี|ส่วน)?)\s*[:/]\s*(\d+(?:\.\d+)?\s*(?:ลิตร|liter|litre|L|มล\.?|ml|cc|ซีซี|ส่วน)?)/i
    );
    const raMatch = rawText.match(/(?:RA|อัตราพ่น|อัตราการพ่น)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ลิตร|liter|litre|L|มล\.?|ml|cc)/i);
    const area = value([/(?:พื้นที่มาตรฐาน|พื้นที่|A0)\s*[:=]?\s*([\d,]+)/i]);
    if (!ratioMatch || !raMatch) return null;

    const ratio = ratioFromQuantities(ratioMatch[1], ratioMatch[2]);
    if (!ratio) return null;
    const simple = simplifyRatio(ratio.C, ratio.S);

    const RA = Number(raMatch[1]);
    const RA_unit = /ลิตร|liter|litre|^L$/i.test(raMatch[2]) ? 'L' as const : 'cc' as const;
    const formula: AIFormulaResult = {
        name: name || fileName.replace(/\.[^.]+$/, ''),
        description: `สูตรจากไฟล์ ${fileName} • ${ratio.note}`,
        C: simple.C,
        S: simple.S,
        RA,
        RA_unit,
        mix_type: /ผสมให้ได้|รวม|ได้สุทธิ|fixed/i.test(rawText) ? 1 : 2,
        A0: Number((area || '1000').replace(/,/g, '')) || 1000,
    };
    return {
        text: `📄 อ่านข้อความในไฟล์ "${fileName}" แล้ว และสร้างสูตรฉบับร่างให้ตรวจสอบ\n\n`
            + `✅ พบข้อมูล C:S = ${simple.C}:${simple.S} (${ratio.note}), RA = ${RA} ${RA_unit}\n`
            + `⚠️ สูตรยังไม่ถูกบันทึก กรุณาตรวจสอบฉลากก่อนกด "บันทึกสูตรนี้"`,
        formula,
    };
}
