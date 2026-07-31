import { AIProviderError } from './errors';
import { fetchWithTimeout, toGeminiTool } from './helpers';
import type { AIProvider, AIProviderName, AIRequest, AIResponse, AIToolCall, AIUsage, ModelInfo } from './types';

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
    inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
    readonly name: AIProviderName = 'gemini';
    readonly displayName = 'Gemini (Google)';
    readonly defaultModel = DEFAULT_MODEL;

    private apiKey: string | undefined;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    }

    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }

    private async post(path: string, body: unknown): Promise<Response> {
        if (!this.apiKey) {
            throw new AIProviderError('gemini', 'not_configured', 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${encodeURIComponent(this.apiKey)}`;
        return fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }, this.name);
    }

    /** แปลง history (AIMessage[]) + prompt ให้เป็น Gemini contents */
    private buildContents(input: AIRequest): GeminiContent[] {
        const contents: GeminiContent[] = [];

        for (const msg of input.history || []) {
            if (msg.role === 'assistant') {
                contents.push({
                    role: 'model',
                    parts: (msg.toolCalls || []).map((tc) => ({
                        functionCall: { name: tc.name, args: tc.args },
                    })),
                });
            } else if (msg.role === 'tool') {
                contents.push({
                    role: 'user',
                    parts: (msg.toolResults || []).map((tr) => ({
                        functionResponse: { name: tr.name, response: { result: tr.content } },
                    })),
                });
            } else {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.text || '' }],
                });
            }
        }

        // Prompt ปัจจุบัน
        const currentParts: GeminiPart[] = [];
        if (input.images && input.images.length > 0) {
            currentParts.push({ text: input.prompt });
            for (const img of input.images) {
                currentParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
            }
        } else {
            currentParts.push({ text: input.prompt });
        }
        contents.push({ role: 'user', parts: currentParts });

        return contents;
    }

    private buildBody(input: AIRequest, isVision: boolean): Record<string, unknown> {
        const body: Record<string, unknown> = {
            contents: this.buildContents(input),
        };
        if (input.systemPrompt) {
            body.systemInstruction = { parts: [{ text: input.systemPrompt }] };
        }
        if (input.tools && input.tools.length > 0) {
            body.tools = [{ functionDeclarations: input.tools.map(toGeminiTool) }];
        }
        const genConfig: Record<string, unknown> = {};
        if (input.maxTokens) genConfig.maxOutputTokens = input.maxTokens;
        if (input.temperature !== undefined) genConfig.temperature = input.temperature;
        if (Object.keys(genConfig).length > 0) body.generationConfig = genConfig;
        return body;
    }

    private parseResponse(payload: any): { text: string; toolCalls?: AIToolCall[]; usage?: AIUsage } {
        const candidate = payload?.candidates?.[0];
        const parts: GeminiPart[] = candidate?.content?.parts || [];
        const text = parts.filter((p) => p.text).map((p) => p.text).join('');
        const toolCalls: AIToolCall[] = parts
            .filter((p) => p.functionCall)
            .map((p, i) => ({
                id: `gemini-call-${i}`,
                name: p.functionCall!.name,
                args: p.functionCall!.args || {},
            }));
        const usage: AIUsage | undefined = payload?.usageMetadata
            ? {
                inputTokens: payload.usageMetadata.promptTokenCount,
                outputTokens: payload.usageMetadata.candidatesTokenCount,
                totalTokens: payload.usageMetadata.totalTokenCount,
            }
            : undefined;
        return { text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined, usage };
    }

    async analyzeText(input: AIRequest): Promise<AIResponse> {
        const res = await this.post(`models/${input.model || DEFAULT_MODEL}:generateContent`, this.buildBody(input, false));
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus('gemini', res.status, text.slice(0, 300));
        }
        const payload = await res.json();
        const parsed = this.parseResponse(payload);
        return { ...parsed, model: input.model || DEFAULT_MODEL, provider: this.name };
    }

    async analyzeImage(input: AIRequest): Promise<AIResponse> {
        if (!input.images || input.images.length === 0) {
            throw new AIProviderError('gemini', 'invalid_request', 'ต้องระบุ images สำหรับ analyzeImage');
        }
        const res = await this.post(`models/${input.model || DEFAULT_MODEL}:generateContent`, this.buildBody(input, true));
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus('gemini', res.status, text.slice(0, 300));
        }
        const payload = await res.json();
        const parsed = this.parseResponse(payload);
        return { ...parsed, model: input.model || DEFAULT_MODEL, provider: this.name };
    }

    async getModels(): Promise<ModelInfo[]> {
        if (!this.isConfigured()) {
            throw new AIProviderError('gemini', 'not_configured', 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey!)}&pageSize=1000`;
        const res = await fetchWithTimeout(url, { method: 'GET' }, this.name);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus('gemini', res.status, text.slice(0, 300));
        }
        const payload = await res.json();
        return (payload.models || []).map((m: { name: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
            id: m.name.replace(/^models\//, ''),
            displayName: m.displayName || m.name.replace(/^models\//, ''),
            supportsVision: m.supportedGenerationMethods?.includes('generateContent') ?? false,
            supportsTools: true,
        }));
    }
}
