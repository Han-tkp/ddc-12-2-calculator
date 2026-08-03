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
    extractCalculationParams,
    buildCalculationResponse,
    AIFormulaResult,
} from '@/lib/ai-mcp';
import { createProviders, AIProviderRouter, DEFAULT_ORDER, normalizeAISettings, AIProviderError, guardQuota } from '@/lib/ai';
import { runChatAgent } from '@/lib/ai/agent';
import type { AIProvider, AIProviderName } from '@/lib/ai/types';
import { getSubscriptionStatus } from '@/lib/billing';
import { supabaseAdmin } from '@/lib/supabase';
import { AI_SETTINGS_KEY } from '@/lib/ai/settings';

/** ตั้งใจอ่านจาก server (app_settings) เสมอ — ไม่เชื่อค่าที่ client ส่งมาในตัว request อีกต่อไป */
async function loadAISettings() {
    const { data } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', AI_SETTINGS_KEY)
        .maybeSingle();
    return normalizeAISettings(data?.value);
}

/**
 * POST /api/chat
 *
 * เมื่อตั้งค่า AI provider (env key) → ใช้ LLM tool-calling (runChatAgent)
 * โดยมี rule-based classifyIntent เป็น fallback เมื่อไม่มี provider ตั้งค่า
 * และ deterministic draft extraction สำหรับไฟล์แนบ
 */
function buildRouterFromSettings(normalized: ReturnType<typeof normalizeAISettings>): AIProviderRouter {
    const providers = createProviders();
    const map = new Map<AIProviderName, AIProvider>((Object.entries(providers) as [AIProviderName, AIProvider][]));

    let order = DEFAULT_ORDER;
    if (normalized) {
        order = normalized.order.filter(name => normalized.providers[name]?.enabled !== false);
    }
    // Wire the quota guard so AI_MAX_REQUESTS_PER_MINUTE / _PER_HOUR actually apply
    // to this unauthenticated endpoint.
    const router = new AIProviderRouter(map, order.length > 0 ? order : DEFAULT_ORDER, {
        guard: (provider) => guardQuota(provider),
    });

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
        case 'calculate': {
            // Routed to the same deterministic engine the UI uses. No model is involved,
            // so this works with no provider configured and no active subscription.
            const params = extractCalculationParams(trimmed);
            if (params.C === undefined || params.S === undefined || params.RA === undefined) {
                result = {
                    text: '🧮 ต้องการคำนวณให้ครับ แต่ยังได้ข้อมูลไม่ครบ กรุณาระบุ:\n\n'
                        + '• **อัตราส่วนผสม** เช่น "500 มล. ต่อ 12.5 ลิตร"\n'
                        + '• **อัตราการพ่น** เช่น "พ่น 1.25 ลิตรต่อ 10000 ตร.ม."\n'
                        + '• **จำนวนหลัง** เช่น "20 หลัง"\n'
                        + '• **พื้นที่** — บอกอย่างใดอย่างหนึ่ง: พื้นที่รวม ("พื้นที่รวม 2000 ตร.ม."), '
                        + 'ขนาดบ้าน ("บ้านกว้าง 8 ยาว 12") หรือพื้นที่ต่อหลังตรงๆ ("บ้านละ 100 ตร.ม.")\n\n'
                        + 'ℹ️ พื้นที่ต่อหลังไม่มีบนฉลากสารเคมี ระบบจึงคำนวณย้อนจากพื้นที่รวม ÷ จำนวนหลังให้แทน',
                };
                break;
            }
            result = buildCalculationResponse(params);
            break;
        }
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
        const { message, fileData, imageData, rawText } = await request.json();

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

        const normalized = await loadAISettings();
        const router = buildRouterFromSettings(normalized);

        // 4) มี AI provider ใช้งานได้ + หน่วยงานสมัครสมาชิกอยู่ → ใช้ LLM tool-calling
        //    (ถ้าไม่ได้สมัครสมาชิก ให้ตกกลับ rule-based เหมือนกรณีไม่มี provider — ไม่ error)
        const subscription = await getSubscriptionStatus();
        if (router.isAnyConfigured() && subscription.active) {
            try {
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

        // 5) ไม่มี provider หรือหน่วยงานยังไม่ได้สมัครสมาชิก → rule-based fallback เดิม
        return NextResponse.json(await ruleBasedResponse(trimmed));
    } catch (error: any) {
        console.error('[AI/MCP] Chat error:', error);
        return NextResponse.json(
            { text: `⚠️ เกิดข้อผิดพลาด: ${error.message || 'ไม่ทราบสาเหตุ'}` },
            { status: 500 }
        );
    }
}
