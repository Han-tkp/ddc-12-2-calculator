import { queryChemicalProfiles, queryCalculations } from '../ai-mcp';
import { validateFormulaDraft, formatValidationIssues } from '../formula-validator';
import { createChemicalProfile, updateChemicalProfile, deleteChemicalProfile } from '../ai-mcp/crud';
import { buildCalculationResponse } from '../ai-mcp/fallback';
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
    {
        name: 'calculate_formula',
        description: 'คำนวณปริมาณสารเคมีจริงด้วย deterministic engine (ค่าถูกต้องเสมอ) — รับ C, S, RA, RA_unit, N (จำนวนหลัง), A0, A_house, mix_type และคืน V_total, V_C, V_S, ต่อหลัง, จำนวนถัง ควรเรียกเมื่อผู้ใช้ถาม "คำนวณ/เท่าไหร่/กี่ถัง/ต้องผสมเท่าไร" หรือต้องการตัวเลขปริมาณ (ห้าม AI คำนวณเอง — ให้ engine คำนวณ)',
        parameters: {
            C: { type: 'number', description: 'สัดส่วนสารออกฤทธิ์ (จาก query_chemical_profiles หรือที่ผู้ใช้ให้)' },
            S: { type: 'number', description: 'สัดส่วนตัวทำละลาย' },
            RA: { type: 'number', description: 'อัตราการพ่น' },
            RA_unit: { type: 'string', enum: ['L', 'cc'] },
            mix_type: { type: 'number', enum: [1, 2], description: '1=ผสมให้ได้, 2=ผสมกับ (default ตามวิธี)' },
            N: { type: 'number', description: 'จำนวนหลังบ้าน (default 1)' },
            A0: { type: 'number', default: 1000, description: 'พื้นที่มาตรฐาน (ตร.ม.)' },
            A_house: { type: 'number', default: 100, description: 'พื้นที่ต่อหลัง (ตร.ม.)' },
            targetVolume: { type: 'number', default: 1, description: 'ปริมาณ target (ลิตร) สำหรับ V_C_target/V_S_target' },
            tankCapacity: { type: 'number', default: 10, description: 'ขนาดถังพ่น (ลิตร)' },
            chemicalName: { type: 'string', optional: true, description: 'ชื่อสารเคมีเพื่อแสดงในผลลัพธ์' },
        },
        required: ['C', 'S', 'RA', 'RA_unit'],
    },
    {
        name: 'create_chemical_profile',
        description: 'สร้างสูตรสารเคมีใหม่ — ตรวจสิทธิ์ (admin หรือ owner) ก่อน insert + audit log. คืน {ok:true, profile} หรือ {ok:false, error}',
        parameters: {
            name: { type: 'string', description: 'ชื่อสูตร (unique ในระบบ)' },
            description: { type: 'string', optional: true },
            C: { type: 'number', description: 'สัดส่วนสารออกฤทธิ์' },
            S: { type: 'number', description: 'สัดส่วนตัวทำละลาย' },
            RA: { type: 'number', description: 'อัตราการพ่น' },
            RA_unit: { type: 'string', enum: ['L', 'cc'] },
            mix_type: { type: 'number', enum: [1, 2], default: 2 },
            A0: { type: 'number', default: 1000 },
            tankCapacity: { type: 'number', default: 10 },
            isActive: { type: 'boolean', default: true },
            actorLabel: { type: 'string', optional: true },
            location: { type: 'string', optional: true },
            lat: { type: 'number', optional: true },
            lng: { type: 'number', optional: true },
        },
        required: ['name', 'C', 'S', 'RA', 'RA_unit'],
    },
    {
        name: 'update_chemical_profile',
        description: 'แก้ไขสูตรสารเคมี — ต้องระบุ id (จาก query ก่อน). ตรวจสิทธิ์ (admin หรือ owner) + audit log. Guest ไม่สามารถเปลี่ยน isActive ได้',
        parameters: {
            id: { type: 'string', description: 'id ของสูตร (ได้จาก query_chemical_profiles)' },
            name: { type: 'string', optional: true },
            description: { type: 'string', optional: true },
            C: { type: 'number', optional: true },
            S: { type: 'number', optional: true },
            RA: { type: 'number', optional: true },
            RA_unit: { type: 'string', enum: ['L', 'cc'], optional: true },
            mix_type: { type: 'number', enum: [1, 2], optional: true },
            A0: { type: 'number', optional: true },
            tankCapacity: { type: 'number', optional: true },
            isActive: { type: 'boolean', optional: true },
            location: { type: 'string', optional: true },
            lat: { type: 'number', optional: true },
            lng: { type: 'number', optional: true },
        },
        required: ['id'],
    },
    {
        name: 'delete_chemical_profile',
        description: 'ลบสูตรสารเคมีออกถาวร (hard-delete ตามนโยบาย) — ต้องยืนยัน confirm=true + audit log. ถ้าผู้ใช้ยังไม่ยืนยัน ให้ถามก่อน',
        parameters: {
            id: { type: 'string' },
            confirm: { type: 'boolean', description: 'ต้อง true เพื่อยืนยันการลบ (false/ไม่ระบุ → ปฏิเสธ)' },
            location: { type: 'string', optional: true },
        },
        required: ['id', 'confirm'],
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
    calculate_formula: async (args) => buildCalculationResponse(args),
    create_chemical_profile: async (args) => createChemicalProfile(args),
    update_chemical_profile: async (args) => updateChemicalProfile(args),
    delete_chemical_profile: async (args) => deleteChemicalProfile(args),
};

export function getTool(name: string): AITool | undefined {
    return AI_TOOLS.find(t => t.name === name);
}
