import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createProviders, AIProviderError } from '@/lib/ai';
import type { AIProviderName } from '@/lib/ai/types';

/**
 * POST /api/ai/test — ทดสอบการเชื่อมต่อ/provider ที่เลือก
 * body: { provider: AIProviderName, model?: string, prompt?: string }
 */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const name = body.provider as AIProviderName;
    const validNames: AIProviderName[] = ['gemini', 'anthropic', 'openrouter', 'openai'];
    if (!validNames.includes(name)) {
        return NextResponse.json({ error: `provider ไม่รู้จัก: ${String(name)}` }, { status: 400 });
    }

    const provider = createProviders()[name];
    if (!provider.isConfigured()) {
        return NextResponse.json({ ok: false, error: `ยังไม่ได้ตั้งค่า API key ของ ${provider.displayName} บนเซิร์ฟเวอร์` }, { status: 200 });
    }

    const startedAt = Date.now();
    try {
        const result = await provider.analyzeText({
            prompt: body.prompt || 'ตอบสั้นๆ ว่า OK',
            systemPrompt: 'คุณคือเครื่องมือทดสอบการเชื่อมต่อ',
            model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : undefined,
            maxTokens: 20,
        });
        return NextResponse.json({
            ok: true,
            provider: result.provider,
            model: result.model,
            latencyMs: Date.now() - startedAt,
            reply: result.text.slice(0, 200),
        });
    } catch (err: unknown) {
        const isAIErr = err instanceof AIProviderError;
        return NextResponse.json({
            ok: false,
            error: isAIErr ? `(${err.kind}) ${err.message}` : (err instanceof Error ? err.message : 'unknown'),
            retryable: isAIErr ? err.retryable : false,
            latencyMs: Date.now() - startedAt,
        }, { status: 200 });
    }
}
