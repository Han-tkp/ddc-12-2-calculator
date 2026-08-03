import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildFormulaDraftFromFile, buildFormulaDraftFromText } from './drafts';

/**
 * Driven by the agency's real intake sheet rather than invented fixtures, because the
 * defects this guards against (mixed C/S units, a "ชื่อสารเคมี" column that shadows
 * "สารเคมีที่ใช้") only show up in the real header/row shapes.
 */
const CSV_PATH = join(
    process.cwd(),
    'examplevbdc',
    'แบบฟอร์มการกรอกสารเคมีพ่นจังหวัดสงขลาสตูล.xlsx - จังหวัดสงขลา.csv'
);

/** Minimal CSV reader that honours double-quoted fields ("10,000 ตารางเมตร"). */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch !== '\r') field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
}

function loadForm() {
    const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
    // Row 1 is the top-level header, row 2 the sub-header naming the paired columns.
    // Merge them so the concentrate/solvent columns get their distinguishing names.
    const top = rows[0];
    const sub = rows[1];
    const headers = top.map((h, i) => (sub[i]?.trim() ? sub[i].trim() : h.trim()));
    const dataRows = rows.slice(3).filter(r => r.some(cell => cell.trim()));
    return { headers, dataRows };
}

describe('buildFormulaDraftFromFile with the real Songkhla intake sheet', () => {
    const { headers, dataRows } = loadForm();

    it('reads every usable row, not just the first', () => {
        const result = buildFormulaDraftFromFile({ fileName: 'สงขลา.xlsx', headers, rows: dataRows });
        expect(result).not.toBeNull();
        // 17 chemical rows; the two "ส่วน" rows are unitless but still a valid ratio.
        expect(result!.formulas!.length).toBe(17);
    });

    it('normalises mixed C/S units instead of dividing raw numbers', () => {
        const result = buildFormulaDraftFromFile({ fileName: 'สงขลา.xlsx', headers, rows: dataRows });
        const drafts = result!.formulas!;

        // ซับมาริน ULV ผสมกับ — 500 มล. : 12.5 ลิตร. Reading the cells as bare numbers
        // gives 500:12.5 (a 1000× overdose); the true ratio is 1:25.
        const submarine = drafts.find(d => d.name.startsWith('ซับมาริน'))!;
        expect(`${submarine.C}:${submarine.S}`).toBe('1:25');

        // อีเล็กซ่า ULV — 100 มล. : 2 ลิตร → 1:20, not 100:2.
        const elexa = drafts.find(d => d.name.startsWith('อีเล็กซ่า'))!;
        expect(`${elexa.C}:${elexa.S}`).toBe('1:20');

        // ฟาร่า 250 EW — same unit on both sides, must be left alone.
        const fara = drafts.find(d => d.name.startsWith('ฟาร่า'))!;
        expect(`${fara.C}:${fara.S}`).toBe('1:170');
    });

    it('does not mistake the "ชื่อสารเคมี" column for the concentrate quantity', () => {
        const result = buildFormulaDraftFromFile({ fileName: 'สงขลา.xlsx', headers, rows: dataRows });
        for (const draft of result!.formulas!) {
            expect(Number.isFinite(draft.C)).toBe(true);
            expect(draft.C).toBeGreaterThan(0);
            expect(draft.name).not.toMatch(/^\d+$/);
        }
    });

    it('reads the spray rate and reference area with their units', () => {
        const result = buildFormulaDraftFromFile({ fileName: 'สงขลา.xlsx', headers, rows: dataRows });
        const submarine = result!.formulas!.find(d => d.name.includes('ซับมาริน'))!;
        // "1.25 ลิตร" per "10,000 ตารางเมตร"
        expect(submarine.RA).toBe(1250);
        expect(submarine.RA_unit).toBe('cc');
        expect(submarine.A0).toBe(10000);
    });

    it('maps ประเภทการผสม to the engine mix_type', () => {
        const result = buildFormulaDraftFromFile({ fileName: 'สงขลา.xlsx', headers, rows: dataRows });
        const drafts = result!.formulas!;
        // Row 1 is ผสมกับ, row 2 is ผสมให้ได้.
        expect(drafts[0].mix_type).toBe(2);
        expect(drafts[1].mix_type).toBe(1);
    });

    it('returns null rather than a bogus draft when nothing parses', () => {
        expect(buildFormulaDraftFromFile({
            fileName: 'ว่าง.xlsx',
            headers: ['อะไรก็ไม่รู้'],
            rows: [['-']],
        })).toBeNull();
    });
});

describe('buildFormulaDraftFromText', () => {
    it('normalises a mixed-unit ratio written in prose', () => {
        const draft = buildFormulaDraftFromText(
            'ชื่อสารเคมี: อีเล็กซ่า\nอัตราส่วน: 100 มล. : 2 ลิตร\nอัตราพ่น: 20 มล.\nพื้นที่: 100',
            'label.txt'
        );
        expect(draft!.formula).toMatchObject({ C: 1, S: 20, RA: 20, RA_unit: 'cc', A0: 100 });
    });

    it('leaves a same-unit ratio untouched', () => {
        const draft = buildFormulaDraftFromText(
            'ชื่อสารเคมี: เดลต้า 50\nอัตราส่วน: 1 ลิตร : 6 ลิตร\nอัตราพ่น: 15 มล.\nพื้นที่: 100',
            'label.txt'
        );
        expect(draft!.formula).toMatchObject({ C: 1, S: 6 });
    });
});
