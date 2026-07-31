import { queryChemicalProfiles, queryCalculations } from '../ai-mcp';
import { validateFormulaDraft, formatValidationIssues } from '../formula-validator';
import type { AITool } from './types';

/* =========================================================================
 * MCP Tool layer สำหรับ LLM agent (tool-calling)
 *
 * ใช้กับ AIProviderRouter.runAgent() — ให้นัก AI เรียก query จากฐานข้อมูล
 * และตรวจสอบสูตรด้วย validate_formula แทนการเดาเอง
 * ========================================================================= */

export const AI_TOOLS: AITool[] = [
    {
        name: 'query_chemical_profiles',
        description: 'ค้นหาสูตรสารเคมี (C:S, RA, วิธีผสม, ขนาดถัง) จากฐานข้อมูล label_profiles ใช้ชื่อสารเคมีหรือคำค้นหา',
        parameters: {
            search: { type: 'string', description: 'ชื่อสารเคมีหรือคำค้นหา เช่น Deltacide, Submarine' },
            limit: { type: 'integer', description: 'จำนวนผลลัพธ์สูงสุด (default 10, ไม่เกิน 50)' },
        },
        required: [],
    },
    {
        name: 'query_calculations',
        description: 'ค้นหาประวัติการคำนวณสารเคมีย้อนหลังจากตาราง calculations',
        parameters: {
            chemical: { type: 'string', description: 'ชื่อสารเคมีเพื่อกรอง เช่น Deltacide' },
            limit: { type: 'integer', description: 'จำนวนผลลัพธ์สูงสุด (default 10, ไม่เกิน 50)' },
        },
        required: [],
    },
    {
        name: 'validate_formula',
        description: 'ตรวจสอบสูตรฉบับร่าง (C, S, RA, RA_unit, mix_type, A0, tankCapacity, name) ว่าค่าครบถ้วนและอยู่ในช่วงที่ปลอดภัยหรือไม่ คืนผลตรวจและค่า default ที่แก้แล้ว ควรเรียกก่อนตอบสูตรให้ผู้ใช้ทุกครั้ง',
        parameters: {
            formula: {
                type: 'object',
                description: 'สูตรที่ต้องการตรวจสอบ: {"name"?:string,"C":number,"S":number,"RA":number,"RA_unit":"L"|"cc","mix_type":1|2,"A0"?:number,"tankCapacity"?:number}',
            },
        },
        required: ['formula'],
    },
];

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export const AI_TOOL_HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
    query_chemical_profiles: async (args) => {
        const { search, limit } = asRecord(args);
        return queryChemicalProfiles({
            search: typeof search === 'string' ? search : '',
            limit: String(typeof limit === 'number' ? limit : ''),
        });
    },
    query_calculations: async (args) => {
        const { chemical, limit } = asRecord(args);
        return queryCalculations({
            chemical: typeof chemical === 'string' ? chemical : '',
            limit: String(typeof limit === 'number' ? limit : ''),
        });
    },
    validate_formula: async (args) => {
        const { formula } = asRecord(args);
        const result = validateFormulaDraft(formula as any);
        return {
            valid: result.valid,
            issues: result.issues,
            formula: result.formula,
            message: formatValidationIssues(result),
        };
    },
};

export function getTool(name: string): AITool | undefined {
    return AI_TOOLS.find(t => t.name === name);
}
