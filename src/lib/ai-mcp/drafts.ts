/**
 * Deterministic draft extraction — แปลงไฟล์/ข้อความที่ผู้ใช้แนบเป็น "สูตรฉบับร่าง"
 * โดยไม่ผ่าน LLM (แม่นยำกว่า, ไม่ hallucinate, ไม่กิน quota)
 */
import { asNumber, type AIFormulaResult, type FormulaDraftInput } from './types';

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