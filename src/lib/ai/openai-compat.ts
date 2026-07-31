import { AIProviderError } from './errors';
import { fetchWithTimeout, getImageParts, toOpenAITool } from './helpers';
import type { AIProvider, AIProviderName, AIRequest, AIResponse, AIToolCall, AIUsage, ModelInfo } from './types';

export interface OpenAICompatOptions {
    name: AIProviderName;
    displayName: string;
    apiKey?: string;
    envKey: string;
    baseUrl: string;
    defaultModel: string;
    extraHeaders?: Record<string, string>;
}

interface OpenAIContentBlock {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

interface OpenAIMessage {
    role: 'user' | 'assistant' | 'tool';
    content: string | OpenAIContentBlock[] | null;
    tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
    tool_call_id?: string;
    name?: string;
}

export abstract class OpenAICompatProvider implements AIProvider {
    readonly name: AIProviderName;
    readonly displayName: string;
    readonly defaultModel: string;

    private apiKey: string | undefined;
    private envKey: string;
    private baseUrl: string;
    private extraHeaders: Record<string, string>;

    constructor(opts: OpenAICompatOptions) {
        this.name = opts.name;
        this.displayName = opts.displayName;
        this.defaultModel = opts.defaultModel;
        this.apiKey = opts.apiKey || process.env[opts.envKey];
        this.envKey = opts.envKey;
        this.baseUrl = opts.baseUrl;
        this.defaultModel = opts.defaultModel;
        this.extraHeaders = opts.extraHeaders || {};
    }

    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }

    private buildMessages(input: AIRequest): OpenAIMessage[] {
        const messages: OpenAIMessage[] = [];

        for (const msg of input.history || []) {
            if (msg.role === 'assistant') {
                messages.push({
                    role: 'assistant',
                    content: msg.text || null,
                    tool_calls: (msg.toolCalls || []).map((tc) => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
                    })),
                });
            } else if (msg.role === 'tool') {
                for (const tr of msg.toolResults || []) {
                    messages.push({
                        role: 'tool',
                        content: tr.content,
                        tool_call_id: tr.toolCallId,
                        name: tr.name,
                    });
                }
            } else {
                const content: string | OpenAIContentBlock[] = msg.images && msg.images.length > 0
                    ? [
                        ...(msg.text ? [{ type: 'text' as const, text: msg.text }] : []),
                        ...msg.images.map((img) => ({ type: 'image_url' as const, image_url: { url: `data:${img.mimeType};base64,${img.data}` } })),
                    ]
                    : msg.text || '';
                messages.push({ role: 'user', content });
            }
        }

        // Prompt ปัจจุบัน
        const current: string | OpenAIContentBlock[] = input.images && input.images.length > 0
            ? [
                { type: 'text', text: input.prompt },
                ...getImageParts(input.images),
            ]
            : input.prompt;
        messages.push({ role: 'user', content: current });

        return messages;
    }

    private async complete(input: AIRequest): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new AIProviderError(this.name, 'not_configured', `ยังไม่ได้ตั้งค่า ${this.envKey}`);
        }

        const body: Record<string, unknown> = {
            model: input.model || this.defaultModel,
            messages: this.buildMessages(input),
        };
        if (input.temperature !== undefined) body.temperature = input.temperature;
        if (input.maxTokens) body.max_tokens = input.maxTokens;
        if (input.tools && input.tools.length > 0) {
            body.tools = input.tools.map(toOpenAITool);
        }

        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                ...this.extraHeaders,
            },
            body: JSON.stringify(body),
        }, this.name);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus(this.name, res.status, text.slice(0, 300));
        }

        const payload = await res.json();
        const message = payload.choices?.[0]?.message;
        const content = message?.content;
        const text = Array.isArray(content) ? content.map((b: any) => b.text || '').join('') : (content || '');

        const toolCalls: AIToolCall[] = (message?.tool_calls || []).map((tc: any) => ({
            id: tc.id,
            name: tc.function?.name,
            args: (() => {
                try { return JSON.parse(tc.function?.arguments || '{}'); }
                catch { return {}; }
            })(),
        }));

        const usage: AIUsage | undefined = payload.usage
            ? { inputTokens: payload.usage.prompt_tokens, outputTokens: payload.usage.completion_tokens, totalTokens: payload.usage.total_tokens }
            : undefined;

        return {
            text,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            model: input.model || this.defaultModel,
            provider: this.name,
        };
    }

    async analyzeText(input: AIRequest): Promise<AIResponse> {
        return this.complete(input);
    }

    async analyzeImage(input: AIRequest): Promise<AIResponse> {
        if (!input.images || input.images.length === 0) {
            throw new AIProviderError(this.name, 'invalid_request', 'ต้องระบุ images สำหรับ analyzeImage');
        }
        return this.complete(input);
    }

    async getModels(): Promise<ModelInfo[]> {
        if (!this.apiKey) {
            throw new AIProviderError(this.name, 'not_configured', `ยังไม่ได้ตั้งค่า ${this.envKey}`);
        }
        const res = await fetchWithTimeout(`${this.baseUrl}/models`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.apiKey}` },
        }, this.name);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus(this.name, res.status, text.slice(0, 300));
        }
        const payload = await res.json();
        return (payload.data || []).map((m: { id: string }) => ({
            id: m.id,
            displayName: m.id,
            supportsVision: /vision|gpt-4o|gemini|claude|llava|qwen/.test(m.id),
            supportsTools: true,
        }));
    }
}
