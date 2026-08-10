import type { AIProviderRouter } from './router';
import { AI_TOOLS, AI_TOOL_HANDLERS } from './tools';
import { validateFormulaDraft, formatValidationIssues } from '../formula-validator';
import type { AIFormulaResult } from '../ai-mcp';

/* =========================================================================
 * AI Agent orchestrator สำหรับ /api/chat
 *
 * เมื่อมี provider ตั้งค่า → ใช้ LLM tool-calling (runAgent) ให้ตัดสินใจเอง
 * เมื่อไม่มี provider → ตกกลับไป rule-based (classifyIntent ใน ai-mcp.ts)
 * ========================================================================= */

export interface AgentChatResult {
    text: string;
    formula?: AIFormulaResult;
    /** provider/model ที่ตอบจริง (สำหรับ logging/UI) */
    provider?: string;
    model?: string;
}

export const AGENT_SYSTEM_PROMPT = `คุณคือผู้ช่วย AI ของกรมควบคุมโรค (DDC) สำหรับระบบคำนวณสารเคมีกำจัดยุง

หน้าที่ของคุณ:
1. ตอบคำถามภาษาไทยด้วยสำนวนทางการแพทย์และสาธารณสุข กระชับ แต่ได้ใจความ
2. หาข้อมูลจากฐานข้อมูลเสมอโดยใช้เครื่องมือ (tool) — อย่าเดาข้อมูลสูตรจากความจำ
3. เมื่อผู้ใช้ขอสูตร/เปรียบเทียบ/ค้นหา ให้เรียก query_chemical_profiles ก่อน (ค้นด้วยชื่อแบรนด์ เช่น Deltacide, Submarine, Fendona, K-Othrine, Aqua Resigen)
4. วิธีผสม: mix_type=2 คือ "แบบผสมกับ" (เติมสารทบน้ำมัน/ตัวทำละลาย), mix_type=1 คือ "แบบผสมให้ได้" (รวมปริมาตรคงที่)
5. เมื่อจะตอบสูตรให้ผู้ใช้:
   - ตรวจสอบด้วย validate_formula ทุกครั้ง
   - แล้วแนบสูตรเป็น JSON ใน code block รูปแบบ \`\`\`json { "name": "...", "description": "...", "C": 1, "S": 9, "RA": 50, "RA_unit": "cc", "mix_type": 2, "A0": 1000 } \`\`\` ต่อท้ายคำตอบ
   - ถ้าผู้ใช้ให้ค่าบางค่าไม่ครบ ให้ใช้ค่าเริ่มต้นที่สมเหตุสมผล (C:S=1:9 ULV / 1:79 fogging, RA=50cc หรือ 1L ต่อ 1000 ตร.ม., A0=1000) และบอกผู้ใช้ว่าใช้ค่าเริ่มต้น
6. เมื่อผู้ใช้ถามปริมาณการเตรียม (เช่น "พ่น 20 หลังทำเท่าไหร่", "ต้องผสมกี่ลิตร", "กี่ถัง") — **ห้ามคำนวณเลขเองเด็ดขาด** ให้เรียก calculate_formula ด้วยพารามิเตอร์จริง (C, S, RA, RA_unit, N, mix_type) แล้วตอบด้วยผลจาก tool
7. ไม่พบข้อมูลในฐานข้อมูล → บอกตรงๆ และเสนอสร้างสูตรใหม่จากข้อมูลที่ผู้ใช้ให้
8. เน้นความปลอดภัย: เตือนสวม PPE (หน้ากาก N95, ถุงมือยาง, แว่นตานิรภัย) และตรวจสอบกับฉลากผลิตภัณฑ์จริงก่อนใช้

9. CRUD operations — ใช้ tools ตาม intent ของผู้ใช้:
   - create_chemical_profile: สร้างสูตรใหม่. ถ้าผู้ใช้แนบ CSV/Excel หลายแถว → เรียกทีละแถว + สรุปผลท้าย
   - update_chemical_profile: ต้อง query_chemical_profiles หา id ก่อน → แล้วส่ง patch (partial fields)
   - delete_chemical_profile: HARD DELETE ถาวร — ต้องมี confirm=true เสมอ
     ถ้าผู้ใช้ยังไม่ได้ยืนยัน → ถาม "⚠️ ยืนยันลบ [ชื่อสูตร] ใช่ไหม?" แล้วรอคำตอบก่อนเรียก tool
10. ตรวจสิทธิ์: tools ทำการตรวจ admin/owner ฝั่ง server อัตโนมัติ. ถ้าไม่ใช่เจ้าของจะได้ {ok:false, error:"แก้ไขได้เฉพาะสูตรที่คุณเพิ่มเอง"} — บอก user ตามตรง
11. หลัง mutation สำเร็จ: ตอบเป็น "✅ บันทึก/แก้/ลบ [ชื่อ] แล้ว (id: xxx)" พร้อมระบุค่าที่เปลี่ยน (กรณี update)
12. multi-row import: ถ้าผู้ใช้แนบไฟล์หลายแถว → เรียก create_chemical_profile ทีละแถว. แถวไหน fail (เช่น ชื่อซ้ำ) → ข้าม + รวบยอดท้ายว่าสำเร็จกี่แถว, fail กี่แถว`;

/** ดึงสูตร JSON จากคำตอบของ AI (code block ```json ... ``` หรือ JSON ล้วน) */
export function extractFormulaFromText(text: string): AIFormulaResult | null {
    if (!text) return null;
    const codeBlock = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
    const raw = (codeBlock?.[1] ?? text).trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.C !== undefined &&
            parsed.S !== undefined &&
            parsed.RA !== undefined
        ) {
            return parsed as unknown as AIFormulaResult;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * รัน agent tool-calling ผ่าน router กับ prompt ของผู้ใช้
 * ถ้าผลลัพธ์มีสูตรแต่ไม่ผ่าน validate_formula → ส่งให้ agent แก้ครั้งเดียว
 */
export async function runChatAgent(
    router: AIProviderRouter,
    userText: string,
    opts: { temperature?: number; maxTokens?: number } = {}
): Promise<AgentChatResult> {
    const base: { prompt: string; systemPrompt: string; temperature?: number; maxTokens?: number } = {
        prompt: userText,
        systemPrompt: AGENT_SYSTEM_PROMPT,
    };
    if (typeof opts.temperature === 'number') base.temperature = opts.temperature;
    if (typeof opts.maxTokens === 'number') base.maxTokens = opts.maxTokens;

    let response = await router.runAgent(base, AI_TOOLS, AI_TOOL_HANDLERS, 6);
    const text = response.text.trim();
    let formula: AIFormulaResult | undefined = extractFormulaFromText(text) ?? undefined;

    if (formula) {
        const check = validateFormulaDraft(formula);
        if (!check.valid) {
            // ให้ agent แก้สูตรครั้งเดียว
            const fixPrompt = `${userText}\n\nหมายเหตุ: สูตรที่คุณให้ไม่ผ่านการตรวจสอบ:\n${formatValidationIssues(check)}\nกรุณาส่งสูตรใหม่ที่ถูกต้องใน code block \`\`\`json ... \`\`\` โดยใช้ข้อมูลจากฐานข้อมูลหรือค่าเริ่มต้นที่เหมาะสม`;
            response = await router.runAgent(
                { ...base, prompt: fixPrompt },
                AI_TOOLS,
                AI_TOOL_HANDLERS,
                4
            );
            formula = extractFormulaFromText(response.text.trim()) ?? undefined;
        }
    }

    return {
        text: response.text.trim(),
        formula,
        provider: response.provider,
        model: response.model,
    };
}
