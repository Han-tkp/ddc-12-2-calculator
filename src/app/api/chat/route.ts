import { NextRequest, NextResponse } from 'next/server';
import {
    SYSTEM_PROMPT,
    classifyIntent,
    buildFormulaFromSupabase,
    buildNewFormulaRecommendation,
    buildChemicalComparison,
    buildFileAnalysis,
    AIFormulaResult,
} from '@/lib/ai-mcp';

/**
 * POST /api/chat
 *
 * AI / MCP endpoint — receives user prompt, delegates to Supabase,
 * returns structured response (text + optional formula).
 *
 * The AI acts purely as an MCP intermediary:
 *   User → classify intent → Supabase query → format response
 */
export async function POST(request: NextRequest) {
    try {
        const { message, fileData } = await request.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json(
                { error: 'กรุณาระบุข้อความ' },
                { status: 400 }
            );
        }

        const trimmed = message.trim();
        const intent = classifyIntent(trimmed);

        console.log(`[AI/MCP] intent=${intent} | msg="${trimmed.slice(0, 80)}" | file=${fileData ? 'yes' : 'no'}`);

        // มีไฟล์แนบ → วิเคราะห์ไฟล์ก่อน (AI "เห็น" ข้อมูลในไฟล์)
        if (fileData && Array.isArray(fileData.headers) && Array.isArray(fileData.rows)) {
            let result: { text: string; formula?: AIFormulaResult };
            const hasFileIntent = intent === 'general_chat' || intent === 'query_history';

            if (hasFileIntent) {
                result = buildFileAnalysis(fileData.headers, fileData.rows, trimmed, fileData.fileName || 'ไฟล์ที่อัปโหลด');
            } else {
                // ผู้ใช้ถามเรื่องสูตร แต่มีไฟล์ — ใช้ข้อมูลจากไฟล์ + ค้นหาใน DB
                result = buildFileAnalysis(fileData.headers, fileData.rows, trimmed, fileData.fileName || 'ไฟล์ที่อัปโหลด');
            }
            return NextResponse.json(result);
        }

        let result: { text: string; formula?: AIFormulaResult };

        switch (intent) {
            case 'query_chemical': {
                result = await buildFormulaFromSupabase(trimmed);
                break;
            }
            case 'create_formula': {
                result = await buildNewFormulaRecommendation(trimmed);
                break;
            }
            case 'compare_chemicals': {
                result = await buildChemicalComparison(trimmed);
                break;
            }
            case 'query_history': {
                result = {
                    text: '📋 ดูประวัติการคำนวณและใช้งานสารเคมีย้อนหลังได้ที่เมนู "ประวัติคำนวณ" หรือ "ประวัติจัดการสูตร" ในระบบ',
                };
                break;
            }
            default: {
                result = {
                    text: `💬 สวัสดีครับ! ผมคือ AI / MCP Assistant ของระบบ DDC Chemical Calculator

คำถามของคุณ: "${trimmed}"

ผมสามารถช่วยเหลือคุณได้ดังนี้:
• **สร้างสูตรผสมสารเคมี** — พิมพ์ เช่น "ช่วยสร้างสูตร ULV เดลตาไซด์"
• **ค้นหาข้อมูลสารเคมี** — พิมพ์ เช่น "เดลตาไซด์คืออะไร" หรือ "Submarine"
• **เปรียบเทียบสารเคมี** — พิมพ์ เช่น "เปรียบเทียบ Deltacide กับ Submarine"
• **ดูประวัติ** — พิมพ์ เช่น "ประวัติการใช้งานย้อนหลัง"

ระบบนี้ใช้สถาปัตยกรรม AI + MCP + Supabase โดย AI จะทำหน้าที่ส่งต่อ prompt ไปยัง Supabase และแสดงผลลัพธ์กลับมา`,
                };
                break;
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[AI/MCP] Chat error:', error);
        return NextResponse.json(
            { text: `⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อกับ Supabase: ${error.message || 'ไม่ทราบสาเหตุ'}` },
            { status: 500 }
        );
    }
}
