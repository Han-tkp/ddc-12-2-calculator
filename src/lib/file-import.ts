import * as XLSX from 'xlsx';

export interface ParsedFile {
    fileName: string;
    fileType: string;
    sheetName?: string;
    headers: string[];
    rows: (string | number)[][];
    rowCount: number;
    colCount: number;
    numericColumns: string[];
}

export type SupportedFile = 'xlsx' | 'xls' | 'csv' | 'tsv' | 'json' | 'txt';

const EXT_MAP: Record<string, SupportedFile> = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/json': 'json',
    'text/csv': 'csv',
    'text/plain': 'txt',
};

function detectType(fileName: string, mime?: string): SupportedFile {
    const fromMime = mime ? EXT_MAP[mime] : undefined;
    if (fromMime) return fromMime;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'tsv' || ext === 'json' || ext === 'txt') {
        return ext;
    }
    return 'csv';
}

function toCellString(v: unknown): string {
    if (v === null || v === undefined) return '';
    return String(v);
}

function toCellNumber(v: unknown): number | string {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = toCellString(v).trim().replace(/,/g, '');
    const n = Number(s);
    return isNaN(n) ? toCellString(v) : n;
}

/** Parse a file (xlsx/xls/csv/tsv/json/txt) into a structured grid */
export async function parseFile(file: File): Promise<ParsedFile> {
    const type = detectType(file.name, file.type);
    const buffer = await file.arrayBuffer();
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let sheetName: string | undefined;

    try {
        if (type === 'json') {
            const text = new TextDecoder().decode(buffer);
            const data = JSON.parse(text);
            const arr = Array.isArray(data) ? data : (data.data ?? data.rows ?? []);
            if (!Array.isArray(arr)) {
                throw new Error('JSON ต้องเป็น array หรือมี field data/rows');
            }
            if (arr.length > 0 && typeof arr[0] === 'object') {
                headers = Object.keys(arr[0]);
                rows = arr.map((r: Record<string, unknown>) => headers.map(h => toCellNumber(r[h])));
            }
        } else if (type === 'txt') {
            const text = new TextDecoder().decode(buffer);
            rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split('\t').map(toCellNumber));
            if (rows.length > 0) {
                headers = rows[0].map(String);
                rows = rows.slice(1);
            }
        } else {
            // xlsx / xls / csv / tsv — ใช้ SheetJS
            const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
            const firstSheet = wb.SheetNames[0];
            sheetName = firstSheet;
            const ws = wb.Sheets[firstSheet];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 }) as unknown[][];
            if (json.length === 0) {
                throw new Error('ไฟล์ว่างเปล่า ไม่มีข้อมูล');
            }
            const hasHeader = typeof json[0][0] !== 'number';
            if (hasHeader) {
                headers = (json[0] as unknown[]).map(toCellString).map(h => h.trim() || `คอลัมน์${(headers.length || 0) + 1}`);
            }
            rows = json.slice(hasHeader ? 1 : 0).map((r: unknown[]) =>
                Array.isArray(r) ? r.map(toCellNumber) : []
            );
        }
    } catch (e: any) {
        // fallback: ลอง parse เป็น CSV เปล่าๆ
        if (type === 'csv' || type === 'tsv') {
            const sep = type === 'tsv' ? '\t' : ',';
            const text = new TextDecoder().decode(buffer);
            rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(sep).map(toCellNumber));
            if (rows.length > 0) {
                headers = rows[0].map(String);
                rows = rows.slice(1);
            }
        } else {
            throw new Error(`ไม่สามารถอ่านไฟล์ได้: ${e.message || 'รูปแบบไม่รองรับ'}`);
        }
    }

    // เติมชื่อคอลัมน์ที่ว่าง
    headers = headers.length > 0 ? headers : rows[0]?.map((_, i) => `คอลัมน์${i + 1}`) ?? [];
    rows = rows.filter(r => r.some(c => String(c).trim() !== ''));

    // หาคอลัมน์ที่เป็นตัวเลขล้วน
    const numericColumns: string[] = [];
    for (let c = 0; c < headers.length; c++) {
        const values = rows.map(r => r[c]).filter(v => v !== '');
        const allNumeric = values.length > 0 && values.every(v => typeof v === 'number');
        if (allNumeric) numericColumns.push(headers[c]);
    }

    return {
        fileName: file.name,
        fileType: type,
        sheetName,
        headers,
        rows,
        rowCount: rows.length,
        colCount: headers.length,
        numericColumns,
    };
}

/** สร้างข้อความสรุปข้อมูลสำหรับ AI */
export function buildFileSummary(file: ParsedFile, maxRows = 20): string {
    const lines: string[] = [];
    lines.push(`ไฟล์: ${file.fileName} (${file.fileType.toUpperCase()})`);
    if (file.sheetName) lines.push(`ชีต: ${file.sheetName}`);
    lines.push(`ขนาด: ${file.rowCount} แถว × ${file.colCount} คอลัมน์`);
    lines.push(`คอลัมน์: ${file.headers.join(', ')}`);
    if (file.numericColumns.length > 0) {
        lines.push(`คอลัมน์ตัวเลข: ${file.numericColumns.join(', ')}`);
    }
    lines.push('');
    lines.push(`ตัวอย่างข้อมูล (${Math.min(file.rowCount, maxRows)} แถวแรก):`);
    lines.push(['#', ...file.headers].join('\t'));
    for (let i = 0; i < Math.min(file.rowCount, maxRows); i++) {
        lines.push([i + 1, ...file.rows[i].map(String)].join('\t'));
    }
    if (file.rowCount > maxRows) {
        lines.push(`... และอีก ${file.rowCount - maxRows} แถว`);
    }
    return lines.join('\n');
}

/** แปลงคอลัมน์ตัวเลขให้เป็นตัวแปรของเครื่องคำนวณ (แต่ละคอลัมน์ = ตัวแปร 1 ตัว) */
export function fileToFormulaVariables(file: ParsedFile): { id: string; name: string; expression: string; unit?: string; description?: string }[] {
    const vars: { id: string; name: string; expression: string; unit?: string; description?: string }[] = [];
    const usedNames = new Set<string>();
    const id = () => Math.random().toString(36).slice(2, 9);

    file.numericColumns.forEach((col, idx) => {
        let name = (col || '').replace(/[^a-zA-Z0-9_]/g, '_') || `COL${idx + 1}`;
        if (/^[0-9]/.test(name)) name = `col_${name}`;
        let base = name;
        let counter = 2;
        while (usedNames.has(name)) {
            name = `${base}_${counter++}`;
        }
        usedNames.add(name);

        const values = file.rows.map(r => r[file.headers.indexOf(col)]).filter(v => typeof v === 'number') as number[];
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        const first = values[0] ?? 0;

        vars.push({
            id: id(),
            name,
            expression: String(first),
            unit: '',
            description: `จากไฟล์ ${file.fileName} คอลัมน์ ${col} (${file.rowCount} แถว, รวม=${round(sum)}, เฉลี่ย=${round(avg)})`,
        });
    });

    if (vars.length === 0 && file.headers.length > 0) {
        file.headers.slice(0, 10).forEach((col, idx) => {
            let name = (col || '').replace(/[^a-zA-Z0-9_]/g, '_') || `COL${idx + 1}`;
            if (/^[0-9]/.test(name)) name = `col_${name}`;
            const first = file.rows[0]?.[idx];
            vars.push({
                id: id(),
                name,
                expression: String(typeof first === 'number' ? first : '1'),
                unit: '',
                description: `จากไฟล์ ${file.fileName} คอลัมน์ ${col}`,
            });
        });
    }

    if (vars.length === 0) {
        vars.push({ id: id(), name: 'A', expression: '1', unit: '', description: 'ว่างเปล่า' });
    }

    return vars;
}

function round(n: number, digits = 2): number {
    const p = Math.pow(10, digits);
    return Math.round(n * p) / p;
}
