import { NextRequest, NextResponse } from 'next/server';
import {
    classifyIntent,
    buildFormulaFromSupabase,
    buildNewFormulaRecommendation,
    buildChemicalComparison,
    buildFileAnalysis,
    buildFormulaDraftFromFile,
    buildFormulaDraftFromText,
    analyzeFormulaImage,
    AIFormulaResult,
} from '@/lib/ai-mcp';
import { createProviders, AIProviderRouter, DEFAULT_ORDER, normalizeAISettings, AIProviderError } from '@/lib/ai';
import { runChatAgent } from '@/lib/ai/agent';
import type { AIProvider, AIProviderName } from '@/lib/ai/types';

/**
 * POST /api/chat
 *
 * เมื่อตั้งค่า AI provider (env key) → ใช้ LLM tool-calling (runChatAgent)
 * โดยมี rule-based classifyIntent เป็น fallback เมื่อไม่มี provider ตั้งค่า
 * และ deterministic draft extraction สำหรับไฟล์แนบ
 */
function buildRouterFromSettings(settings: unknown): AIProviderRouter {
    const normalized = normalizeAISettings(settings);
    const providers = createProviders();
    const map = new Map<AIProviderName, AIProvider>((Object.entries(providers) as [AIProviderName, AIProvider][]));

    let order = DEFAULT_ORDER;
    if (normalized) {
        order = normalized.order.filter(name => normalized.providers[name]?.enabled !== false);
    }
    const router = new AIProviderRouter(map, order.length > 0 ? order : DEFAULT_ORDER);

    if (normalized) {
        for (const name of Object.keys(normalized.providers) as AIProviderName[]) {
            const setting = normalized.providers[name];
            if (setting?.model) router.setModelOverride(name, setting.model);
        }
    }
    return router;
}

/** ตอบแบบ rule-based (keyword) — ใช้เมื่อไม่มี provider หรือ provider ล้มเหลว */
async function ruleBasedResponse(trimmed: string, opts: { note?: string } = {}): Promise<{ text: string; formula?: AIFormulaResult }> {
    const intent = classifyIntent(trimmed);
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
                text: `💬 สวัสดีครับ! ผมคือผู้ช่วยสูตรสารเคมี (Chemical Formula Assistant) ของระบบ DDC Chemical Calculator

คำถามของคุณ: "${trimmed}"

ผมสามารถช่วยเหลือคุณได้ดังนี้:
• **สร้างสูตรผสมสารเคมี** — พิมพ์ เช่น "ช่วยสร้างสูตร ULV เดลตาไซด์"
• **ค้นหาข้อมูลสารเคมี** — พิมพ์ เช่น "เดลตาไซด์คืออะไร" หรือ "Submarine"
• **เปรียบเทียบสารเคมี** — พิมพ์ เช่น "เปรียบเทียบ Deltacide กับ Submarine"
• **ดูประวัติ** — พิมพ์ เช่น "ประวัติการใช้งานย้อนหลัง"`,
            };
            break;
        }
    }

    if (opts.note) {
        result.text += `\n\n📌 ${opts.note}`;
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        const { message, fileData, imageData, rawText, aiSettings } = await request.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json(
                { error: 'กรุณาระบุข้อความ' },
                { status: 400 }
            );
        }

        const trimmed = message.trim();

        // 1) รูปภาพ → AI Vision ผ่าน router (fallback ระหว่าง providers)
        if (imageData && typeof imageData === 'string') {
            return NextResponse.json(await analyzeFormulaImage(imageData, fileData?.fileName || 'ฉลากสารเคมี'));
        }

        // 2) ข้อความในไฟล์ → deterministic draft extraction (แม่นยำกว่า LLM)
        if (typeof rawText === 'string' && rawText.trim()) {
            const textDraft = buildFormulaDraftFromText(rawText, fileData?.fileName || 'ฉลากสารเคมี.txt');
            if (textDraft) return NextResponse.json(textDraft);
        }

        // 3) ไฟล์แบบมีโครงสร้าง → deterministic draft + file analysis
        if (fileData && Array.isArray(fileData.headers) && Array.isArray(fileData.rows)) {
            const formulaDraft = buildFormulaDraftFromFile(fileData);
            if (formulaDraft) return NextResponse.json(formulaDraft);
            return NextResponse.json(buildFileAnalysis(fileData.headers, fileData.rows, trimmed, fileData.fileName || 'ไฟล์ที่อัปโหลด'));
        }

        const router = buildRouterFromSettings(aiSettings);
        console.log(`[AI/MCP] provider=${router.getAvailableProviders().map(p => p.name).join(',') || 'none(rule-based)'} | msg="${trimmed.slice(0, 80)}"`);

        // 4) มี AI provider → ใช้ LLM tool-calling (ถ้าล้มเหลว → ตกกลับ rule-based)
        if (router.isAnyConfigured()) {
            try {
                const normalized = normalizeAISettings(aiSettings);
                const agentResult = await runChatAgent(router, trimmed, {
                    temperature: normalized?.temperature,
                    maxTokens: normalized?.maxTokens,
                });
                return NextResponse.json({
                    text: agentResult.text,
                    formula: agentResult.formula,
                    provider: agentResult.provider,
                    model: agentResult.model,
                });
            } catch (err: unknown) {
                if (err instanceof AIProviderError) {
                    const reason = err.kind === 'not_configured'
                        ? 'ยังไม่ได้ตั้งค่า API key'
                        : `${err.kind === 'provider_unavailable' || err.kind === 'rate_limit' ? 'AI หลักเต็ม/ไม่พร้อม' : err.kind}`;
                    console.warn(`[AI/MCP] agent ล้มเหลว (${err.kind}) → ตกกลับ rule-based:`, err.message);
                    return NextResponse.json(await ruleBasedResponse(trimmed, {
                        note: `AI หลักไม่พร้อมใช้งานชั่วคราว (${reason}) กำลังตอบด้วยกฎสำเร็จรูป`,
                    }));
                }
                throw err;
            }
        }

        // 5) ไม่มี provider → rule-based fallback เดิม
        return NextResponse.json(await ruleBasedResponse(trimmed));
    } catch (error: any) {
        console.error('[AI/MCP] Chat error:', error);
        return NextResponse.json(
            { text: `⚠️ เกิดข้อผิดพลาด: ${error.message || 'ไม่ทราบสาเหตุ'}` },
            { status: 500 }
        );
    }
}
