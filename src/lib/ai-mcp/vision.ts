/**
 * AI Vision — วิเคราะห์รูปภาพฉลากสารเคมีด้วย LLM ผ่าน router
 * (Fallback เมื่อ deterministic extraction ทำไม่ได้)
 */
import { AIProviderError, defaultRouter } from '../ai';
import type { AIFormulaResult } from './types';

/** Analyze a label image with AI Vision (Gemini/Claude/OpenAI) when a provider key is configured. */
export async function analyzeFormulaImage(imageData: string, fileName: string): Promise<{ text: string; formula?: AIFormulaResult }> {
    const router = defaultRouter;
    if (!router.isAnyConfigured()) {
        return { text: `🖼️ รับไฟล์ภาพ "${fileName}" แล้ว แต่ยังวิเคราะห์อัตโนมัติไม่ได้\n\nกรุณาตั้งค่า API key ของ AI provider อย่างใดอย่างหนึ่งบนเซิร์ฟเวอร์ (GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY) หรือส่งข้อมูลเป็น TXT/CSV โดยมีคอลัมน์ name, C, S, RA, RA_unit, mix_type, A0` };
    }
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { text: '⚠️ รูปภาพไม่อยู่ในรูปแบบที่รองรับ' };
    const prompt = `อ่านข้อความจากฉลากสารเคมีในภาพ แล้วตอบเป็น JSON เท่านั้นตาม schema นี้: {"name":"string","description":"string","C":number,"S":number,"RA":number,"RA_unit":"L"|"cc","mix_type":1|2,"A0":number}. ห้ามเดาค่าที่อ่านไม่พบ ให้ใช้ 0 และใส่คำว่าไม่พบใน description. ค่า mix_type 1 คือผสมให้ได้ปริมาตรรวมคงที่, 2 คือผสมกับตัวทำละลาย. นี่คือไฟล์ ${fileName}`;
    try {
        const response = await router.analyzeImage({
            prompt,
            images: [{ mimeType: match[1], data: match[2] }],
        });
        const raw = response.text.replace(/```json|```/g, '').trim();
        if (!raw) throw new Error('ไม่พบผลวิเคราะห์จาก AI Vision');
        const parsed = JSON.parse(raw) as AIFormulaResult;
        return { text: `🖼️ วิเคราะห์ฉลาก "${fileName}" แล้ว (${response.provider}/${response.model}) และสร้างสูตรฉบับร่าง\n\n⚠️ กรุณาตรวจสอบค่ากับฉลากจริงก่อนบันทึก`, formula: parsed };
    } catch (err: unknown) {
        if (err instanceof AIProviderError) {
            return { text: `⚠️ AI Vision ไม่สามารถวิเคราะห์ภาพได้ (${err.kind === 'not_configured' ? 'ยังไม่ตั้งค่า API key' : `HTTP ${err.status || 'error'}`}) กรุณาตรวจสอบการตั้งค่าแล้วลองใหม่` };
        }
        throw err;
    }
}