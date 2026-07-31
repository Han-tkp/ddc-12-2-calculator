/* =========================================================================
 * Formula Validator
 *
 * ตรวจสอบและปรับค่าสูตรฉบับร่างที่ได้จาก AI (LLM tool-calling) ให้ถูกต้อง
 * ก่อนนำไปแสดงให้ Admin ยืนยัน — ตัด error (ค่าคงที่/หายไป) และแจ้ง warning
 * สำหรับค่าที่น่าสงสัย
 * ========================================================================= */

export interface FormulaDraft {
    name?: string;
    description?: string;
    C?: number | string;
    S?: number | string;
    RA?: number | string;
    RA_unit?: 'L' | 'cc';
    mix_type?: number | string;
    A0?: number | string;
    tankCapacity?: number | string;
}

export interface FormulaIssue {
    field: string;
    level: 'error' | 'warning';
    message: string;
}

export interface FormulaValidationResult {
    valid: boolean;
    issues: FormulaIssue[];
    formula: {
        name: string;
        description: string;
        C: number;
        S: number;
        RA: number;
        RA_unit: 'L' | 'cc';
        mix_type: number;
        A0: number;
        tankCapacity: number;
    };
}

export const FORMULA_LIMITS = {
    maxC: 1000,
    maxS: 100000,
    maxRA: 100000,
    maxA0: 1000000,
    maxTankCapacity: 100000,
    minPositive: 0,
};

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function isPositive(n: number): boolean {
    return n > 0;
}

/** ตรวจสอบสูตรร่างและคืนค่าที่ถูก normalize (default กรณีขาด) พร้อมรายการ issue */
export function validateFormulaDraft(input: FormulaDraft = {}): FormulaValidationResult {
    const issues: FormulaIssue[] = [];

    const push = (field: string, level: 'error' | 'warning', message: string) => {
        issues.push({ field, level, message });
    };

    const numberOr = (field: keyof FormulaDraft, label: string, fallback: number, max: number, warnThreshold?: number) => {
        const value = toNumber(input[field]);
        if (value === undefined) {
            push(field, 'warning', `ไม่พบค่า ${label} ใช้ค่าเริ่มต้น ${fallback}`);
            return fallback;
        }
        if (!isPositive(value)) {
            push(field, 'error', `${label} ต้องมากกว่า 0 (ได้รับ ${value})`);
            return fallback;
        }
        if (value > max) {
            push(field, 'error', `${label} มากเกินไป (${value} สูงสุด ${max})`);
            return fallback;
        }
        if (warnThreshold !== undefined && value > warnThreshold) {
            push(field, 'warning', `${label} สูงผิดปกติ (${value}) กรุณาตรวจสอบ`);
        }
        return value;
    };

    const name = String(input.name ?? '').trim();
    if (!name) push('name', 'warning', 'ยังไม่มีชื่อสารเคมี ใช้ชื่อชั่วคราว "สูตรใหม่"');

    const C = numberOr('C', 'C (สัดส่วนสารออกฤทธิ์)', 1, FORMULA_LIMITS.maxC);
    const S = numberOr('S', 'S (สัดส่วนตัวทำละลาย)', 9, FORMULA_LIMITS.maxS);
    const RA = numberOr('RA', 'RA (อัตราการพ่น)', 50, FORMULA_LIMITS.maxRA);
    const A0 = numberOr('A0', 'พื้นที่มาตรฐาน', 1000, FORMULA_LIMITS.maxA0);
    const tankCapacity = numberOr('tankCapacity', 'ขนาดถัง', 10, FORMULA_LIMITS.maxTankCapacity);

    let RA_unit: 'L' | 'cc' = input.RA_unit as 'L' | 'cc';
    if (RA_unit !== 'L' && RA_unit !== 'cc') {
        push('RA_unit', 'warning', 'ไม่พบหน่วย RA ที่ถูกต้อง ใช้ cc แทน');
        RA_unit = 'cc';
    }

    let mix_type: number = toNumber(input.mix_type) ?? 0;
    if (mix_type !== 1 && mix_type !== 2) {
        push('mix_type', 'warning', 'mix_type ไม่ถูกต้อง (ต้องเป็น 1 หรือ 2) ใช้แบบผสมกับ (2) แทน');
        mix_type = 2;
    }

    const ratioWarning = (S / C) > 10000 || (C / S) > 10000;
    if (ratioWarning) {
        push('formula', 'warning', 'สัดส่วน C:S ผิดปกติ (1 : ' + Math.round(S / C) + ') กรุณาตรวจสอบ');
    }

    const description = String(input.description ?? '').trim() || `${name} สูตรจาก AI (${C}:${S}, RA ${RA} ${RA_unit})`;

    return {
        valid: !issues.some(i => i.level === 'error'),
        issues,
        formula: {
            name: name || 'สูตรใหม่',
            description,
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

/** แปลงผลตรวจเป็นข้อความสั้นสำหรับแนบไปในคำตอบของ AI/UI */
export function formatValidationIssues(result: FormulaValidationResult): string {
    if (result.issues.length === 0) return '';
    const lines = result.issues.map(i => `• [${i.level === 'error' ? 'ผิดพลาด' : 'เตือน'}] ${i.message}`);
    return `${result.valid ? '⚠️ สูตรผ่านการตรวจ แต่มีคำเตือน:' : '❌ สูตรไม่ผ่านการตรวจ:'}\n${lines.join('\n')}`;
}
