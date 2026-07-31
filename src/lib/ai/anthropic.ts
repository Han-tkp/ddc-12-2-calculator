import { AIProviderError } from './errors';
import { fetchWithTimeout, toAnthropicTool } from './helpers';
import type { AIProvider, AIProviderName, AIRequest, AIResponse, AIToolCall, AIUsage, ModelInfo } from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-5';

interface AnthropicContentBlock {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    source?: { type: string; media_type: string; data: string };
}

const KNOWN_MODELS: ModelInfo[] = [
    { id: 'claude-opus-4-1', displayName: 'Claude Opus 4.1', supportsVision: true, supportsTools: true },
    { id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', supportsVision: true, supportsTools: true },
    { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', supportsVision: true, supportsTools: true },
];

export class AnthropicProvider implements AIProvider {
    readonly name: AIProviderName = 'anthropic';
    readonly displayName = 'Claude (Anthropic)';
    readonly defaultModel = DEFAULT_MODEL;

    private apiKey: string | undefined;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
    }

    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }

    private buildMessages(input: AIRequest): { role: 'user' | 'assistant'; content: AnthropicContentBlock[] }[] {
        const messages: { role: 'user' | 'assistant'; content: AnthropicContentBlock[] }[] = [];

        for (const msg of input.history || []) {
            if (msg.role === 'assistant') {
                messages.push({
                    role: 'assistant',
                    content: (msg.toolCalls || []).map((tc) => ({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.name,
                        input: tc.args,
                    })),
                });
            } else if (msg.role === 'tool') {
                messages.push({
                    role: 'user',
                    content: (msg.toolResults || []).map((tr) => ({
                        type: 'tool_result',
                        tool_use_id: tr.toolCallId,
                        content: tr.content,
                    })),
                });
            } else {
                const content: AnthropicContentBlock[] = [];
                if (msg.text) content.push({ type: 'text', text: msg.text });
                for (const img of msg.images || []) {
                    content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.data } });
                }
                messages.push({ role: 'user', content });
            }
        }

        // Prompt ปัจจุบัน
        const current: AnthropicContentBlock[] = [];
        if (input.images && input.images.length > 0) {
            current.push({ type: 'text', text: input.prompt });
            for (const img of input.images) {
                current.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.data } });
            }
        } else {
            current.push({ type: 'text', text: input.prompt });
        }
        messages.push({ role: 'user', content: current });

        return messages;
    }

    private async complete(input: AIRequest): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new AIProviderError('anthropic', 'not_configured', 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY');
        }

        const body: Record<string, unknown> = {
            model: input.model || DEFAULT_MODEL,
            max_tokens: input.maxTokens || 1024,
            messages: this.buildMessages(input),
        };
        if (input.systemPrompt) body.system = input.systemPrompt;
        if (input.temperature !== undefined) body.temperature = input.temperature;
        if (input.tools && input.tools.length > 0) {
            body.tools = input.tools.map(toAnthropicTool);
        }

        const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        }, this.name);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw AIProviderError.fromHttpStatus('anthropic', res.status, text.slice(0, 300));
        }

        const payload = await res.json();
        const blocks: AnthropicContentBlock[] = payload.content || [];
        const text = blocks.filter((b) => b.type === 'text' && b.text).map((b) => b.text).join('');
        const toolCalls: AIToolCall[] = blocks
            .filter((b) => b.type === 'tool_use' && b.id && b.name)
            .map((b) => ({ id: b.id!, name: b.name!, args: b.input || {} }));

        const usage: AIUsage | undefined = payload.usage
            ? { inputTokens: payload.usage.input_tokens, outputTokens: payload.usage.output_tokens }
            : undefined;

        return {
            text,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            model: input.model || DEFAULT_MODEL,
            provider: this.name,
        };
    }

    async analyzeText(input: AIRequest): Promise<AIResponse> {
        return this.complete(input);
    }

    async analyzeImage(input: AIRequest): Promise<AIResponse> {
        if (!input.images || input.images.length === 0) {
            throw new AIProviderError('anthropic', 'invalid_request', 'ต้องระบุ images สำหรับ analyzeImage');
        }
        return this.complete(input);
    }

    async getModels(): Promise<ModelInfo[]> {
        // Anthropic ไม่มี public REST endpoint สำหรับรายการโมเดล — ใช้รายการที่รู้จัก
        return KNOWN_MODELS;
    }
}
