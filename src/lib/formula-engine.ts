export interface FormulaVariable {
    id: string;
    name: string;
    expression: string;
    unit?: string;
    description?: string;
}

export interface ComputedVariable extends FormulaVariable {
    computed: number | null;
    error?: string;
    dependsOn: string[];
}

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    SUM: (...args) => args.reduce((a, b) => a + b, 0),
    AVG: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
    MIN: (...args) => Math.min(...args),
    MAX: (...args) => Math.max(...args),
    ROUND: (x, d) => { const p = Math.pow(10, d || 0); return Math.round(x * p) / p; },
    CEIL: (x) => Math.ceil(x),
    FLOOR: (x) => Math.floor(x),
    ABS: (x) => Math.abs(x),
    IF: (cond, t, f) => cond ? t : f,
    POW: (b, e) => Math.pow(b, e),
    SQRT: (x) => Math.sqrt(x),
    LOG: (x) => Math.log(x),
    LOG10: (x) => Math.log10(x),
    PI: () => Math.PI,
    SIN: (x) => Math.sin(x),
    COS: (x) => Math.cos(x),
    TAN: (x) => Math.tan(x),
};

function tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < expr.length) {
        if (expr[i] === ' ' || expr[i] === '\t') { i++; continue; }
        if ('+-*/^(),'.includes(expr[i])) { tokens.push(expr[i]); i++; continue; }
        if (expr[i] === ':' && expr[i + 1] === ':') { tokens.push('::'); i += 2; continue; }
        let word = '';
        while (i < expr.length && !'+-*/^(), \t'.includes(expr[i])) { word += expr[i]; i++; }
        if (word) tokens.push(word);
    }
    return tokens;
}

function extractVarRefs(expression: string): string[] {
    const tokens = tokenize(expression);
    const reserved = new Set(Object.keys(MATH_FUNCTIONS));
    reserved.add('true'); reserved.add('false');
    const refs: string[] = [];
    for (const t of tokens) {
        if (/^[a-zA-Z_]\w*$/.test(t) && !reserved.has(t)) {
            refs.push(t);
        }
    }
    return [...new Set(refs)];
}

function buildDependencyGraph(variables: FormulaVariable[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const v of variables) {
        graph.set(v.name, extractVarRefs(v.expression));
    }
    return graph;
}

function topologicalSort(variables: FormulaVariable[]): { sorted: FormulaVariable[]; error?: string } {
    const graph = buildDependencyGraph(variables);
    const nameToVar = new Map(variables.map(v => [v.name, v]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: FormulaVariable[] = [];

    function visit(name: string): boolean {
        if (visiting.has(name)) {
            result.length = 0;
            return false;
        }
        if (visited.has(name)) return true;
        visiting.add(name);
        const deps = graph.get(name) || [];
        for (const dep of deps) {
            if (!nameToVar.has(dep)) continue;
            if (!visit(dep)) return false;
        }
        visiting.delete(name);
        visited.add(name);
        const v = nameToVar.get(name);
        if (v) result.push(v);
        return true;
    }

    for (const v of variables) {
        if (!visited.has(v.name)) {
            if (!visit(v.name)) {
                return { sorted: [], error: `พบวงจรซ้ำซ้อนที่ตัวแปร "${v.name}"` };
            }
        }
    }

    return { sorted: result };
}

export function evaluateVariable(
    expression: string,
    scope: Record<string, number>
): { value: number | null; error?: string } {
    if (!expression.trim()) return { value: null, error: 'ไม่มีสูตร' };

    const isNumeric = !isNaN(Number(expression.trim()));
    if (isNumeric) return { value: Number(expression.trim()) };

    try {
        let processed = expression;

        for (const [fnName, fnImpl] of Object.entries(MATH_FUNCTIONS)) {
            const regex = new RegExp(`\\b${fnName}\\s*\\(`, 'gi');
            processed = processed.replace(regex, (match) => {
                return `MATH_FUNCTIONS.${fnName}(`;
            });
        }

        const keys = Object.keys(scope);
        const values = keys.map(k => scope[k]);

        const fn = new Function(
            'MATH_FUNCTIONS',
            ...keys,
            `"use strict"; return (${processed});`
        );

        const raw = fn(MATH_FUNCTIONS, ...values);
        const value = typeof raw === 'number' ? raw : Number(raw);

        if (isNaN(value)) return { value: null, error: 'ผลลัพธ์ไม่ใช่ตัวเลข' };
        if (!isFinite(value)) return { value: null, error: 'ค่าไม่จำกัด (Infinity)' };

        return { value };
    } catch (e: any) {
        return { value: null, error: e.message || 'ไม่สามารถคำนวณได้' };
    }
}

export function computeAll(variables: FormulaVariable[]): ComputedVariable[] {
    const { sorted, error } = topologicalSort(variables);
    if (error) {
        return variables.map(v => ({
            ...v,
            computed: null,
            error,
            dependsOn: extractVarRefs(v.expression),
        }));
    }

    const scope: Record<string, number> = {};
    const result: ComputedVariable[] = [];

    for (const v of sorted) {
        const scopeKeys = Object.keys(scope);
        const scopeValues = scopeKeys.map(k => scope[k]);

        const evaluator = new Function(
            'MATH_FUNCTIONS',
            ...scopeKeys,
            `"use strict"; return (${v.expression});`
        );

        let computed: number | null = null;
        let evalError: string | undefined;

        try {
            const raw = evaluator(MATH_FUNCTIONS, ...scopeValues);
            computed = typeof raw === 'number' ? raw : Number(raw);
            if (isNaN(computed)) { computed = null; evalError = 'ผลลัพธ์ไม่ใช่ตัวเลข'; }
            else if (!isFinite(computed)) { computed = null; evalError = 'ค่าไม่จำกัด (Infinity)'; }
        } catch (e: any) {
            evalError = e.message || 'ไม่สามารถคำนวณได้';
        }

        if (computed !== null) scope[v.name] = computed;

        result.push({
            ...v,
            computed,
            error: evalError,
            dependsOn: extractVarRefs(v.expression),
        });
    }

    return result;
}

export const DEFAULT_TEMPLATES: { name: string; variables: FormulaVariable[] }[] = [
    {
        name: 'Deltacide ULV',
        variables: [
            { id: '1', name: 'C', expression: '1', unit: 'ส่วน', description: 'สัดส่วนสารออกฤทธิ์' },
            { id: '2', name: 'S', expression: '4', unit: 'ส่วน', description: 'สัดส่วนตัวทำละลาย' },
            { id: '3', name: 'ratio_total', expression: 'C + S', unit: '', description: 'รวมสัดส่วนทั้งหมด' },
            { id: '4', name: 'RA', expression: '75', unit: 'ml', description: 'อัตราการพ่นต่อ 1000 ตร.ม.' },
            { id: '5', name: 'tank', expression: '10', unit: 'L', description: 'ขนาดถังพ่น' },
            { id: '6', name: 'area_per_tank', expression: '(tank * 1000) / (RA / 1000)', unit: 'ตร.ม.', description: 'พื้นที่ที่พ่นได้ต่อถัง' },
            { id: '7', name: 'chemical_per_tank', expression: 'tank * 1000 * C / ratio_total', unit: 'ml', description: 'ปริมาณสารเคมีต่อถัง' },
            { id: '8', name: 'solvent_per_tank', expression: 'tank * 1000 * S / ratio_total', unit: 'ml', description: 'ปริมาณตัวทำละลายต่อถัง' },
            { id: '9', name: 'total_per_tank', expression: 'chemical_per_tank + solvent_per_tank', unit: 'ml', description: 'ปริมาณรวมต่อถัง' },
        ],
    },
    {
        name: 'Deltacide หมอกควัน',
        variables: [
            { id: '1', name: 'C', expression: '1', unit: 'ส่วน', description: 'สัดส่วนสารออกฤทธิ์' },
            { id: '2', name: 'S', expression: '79', unit: 'ส่วน', description: 'สัดส่วนตัวทำละลาย' },
            { id: '3', name: 'RA', expression: '1', unit: 'L', description: 'อัตราพ่นต่อ 1000 ตร.ม.' },
            { id: '4', name: 'tank', expression: '10', unit: 'L', description: 'ขนาดถังพ่น' },
            { id: '5', name: 'chemical_per_tank', expression: 'tank * C / S', unit: 'L', description: 'ปริมาณสารเคมีต่อถัง' },
            { id: '6', name: 'chemical_per_tank_ml', expression: 'chemical_per_tank * 1000', unit: 'ml', description: 'ปริมาณสารเคมีต่อถัง (มล.)' },
            { id: '7', name: 'solvent_per_tank', expression: 'tank - chemical_per_tank', unit: 'L', description: 'ปริมาณตัวทำละลายต่อถัง' },
            { id: '8', name: 'area_per_tank', expression: 'tank * 1000 / RA', unit: 'ตร.ม.', description: 'พื้นที่พ่นต่อถัง' },
            { id: '9', name: 'houses_per_tank', expression: 'area_per_tank / 100', unit: 'หลัง', description: 'จำนวนบ้านต่อถัง (บ้านละ 100 ตร.ม.)' },
        ],
    },
    {
        name: 'Submarine หมอกควัน',
        variables: [
            { id: '1', name: 'C', expression: '1', unit: 'ส่วน', description: 'สัดส่วนสารออกฤทธิ์' },
            { id: '2', name: 'S', expression: '249', unit: 'ส่วน', description: 'สัดส่วนตัวทำละลาย' },
            { id: '3', name: 'ratio_total', expression: 'C + S', unit: '', description: 'รวมสัดส่วน' },
            { id: '4', name: 'RA', expression: '1.25', unit: 'L', description: 'อัตราพ่นต่อ 1000 ตร.ม.' },
            { id: '5', name: 'tank', expression: '10', unit: 'L', description: 'ขนาดถังพ่น' },
            { id: '6', name: 'chemical_per_tank', expression: 'tank * C / ratio_total', unit: 'L', description: 'สารเคมีต่อถัง' },
            { id: '7', name: 'solvent_per_tank', expression: 'tank * S / ratio_total', unit: 'L', description: 'ตัวทำละลายต่อถัง' },
            { id: '8', name: 'area_per_tank', expression: 'tank * 1000 / RA', unit: 'ตร.ม.', description: 'พื้นที่พ่นต่อถัง' },
        ],
    },
    {
        name: 'เปล่า (เริ่มใหม่)',
        variables: [
            { id: '1', name: 'A', expression: '1', unit: '', description: '' },
            { id: '2', name: 'B', expression: '1', unit: '', description: '' },
        ],
    },
];
