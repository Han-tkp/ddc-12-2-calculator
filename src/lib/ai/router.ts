import { AIProviderError, isRetryableError } from './errors';
import { recordAICall, type AICallLog, type AICallKind } from './usage';
import type { AIProvider, AIProviderName, AIRequest, AIResponse, AITool, AIToolResult } from './types';

export type AIProviderOrder = AIProviderName[];

export const DEFAULT_ORDER: AIProviderOrder = ['gemini', 'anthropic', 'openrouter', 'openai'];

export interface RouterOptions {
    /** บันทึก log ทุกครั้งที่เรียกใช้ provider (มีค่าเริ่มต้นคือ console) */
    logger?: (log: Parameters<typeof recordAICall>[0]) => void;
    /** ตรวจโควตาก่อนเรียกใช้ provider ต่อชื่อ provider */
    guard?: (provider: AIProviderName) => void;
    /** ระบุ model ให้กับ provider บางตัวโดยเฉพาะ (สำหรับ UI override) */
    modelOverrides?: Partial<Record<AIProviderName, string>>;
}

/**
 * จัดการ fallback ระหว่าง providers — fallback เฉพาะ error ที่ "ชั่วคราว"
 * (429 quota/rate limit, timeout, provider unavailable, network error)
 *
 * ไม่ fallback เมื่อ: key ผิด (auth), request ผิด (invalid), ไม่ได้ตั้งค่า
 */
export class AIProviderRouter {
    private order: AIProviderOrder;
    private modelOverrides: Partial<Record<AIProviderName, string>>;
    private logger: NonNullable<RouterOptions['logger']>;
    private guard: RouterOptions['guard'];

    constructor(
        private providers: Map<AIProviderName, AIProvider>,
        order: AIProviderOrder = DEFAULT_ORDER,
        options: RouterOptions = {}
    ) {
        this.order = order;
        this.modelOverrides = options.modelOverrides ?? {};
        this.logger = options.logger ?? ((log) => {
            const entry = recordAICall(log);
            console.log(`[AI] ${log.provider}/${log.model} ${log.kind} ${log.ok ? 'ok' : 'FAIL'} ${log.latencyMs}ms` + (log.error ? ` | ${log.error.kind}: ${log.error.message}` : ''));
            return entry;
        });
        this.guard = options.guard;
    }

    /** providers ทั้งหมดที่พร้อมใช้งาน (set key แล้ว) เรียงตาม order ที่ตั้งไว้ */
    getAvailableProviders(): AIProvider[] {
        return this.order
            .map((name) => this.providers.get(name))
            .filter((p): p is AIProvider => Boolean(p) && (p as AIProvider).isConfigured());
    }

    getProvider(name: AIProviderName): AIProvider | undefined {
        return this.providers.get(name);
    }

    isAnyConfigured(): boolean {
        return this.getAvailableProviders().length > 0;
    }

    getOrder(): AIProviderOrder {
        return [...this.order];
    }

    setOrder(order: AIProviderOrder): void {
        const valid = order.filter(name => this.providers.has(name));
        if (valid.length > 0) this.order = valid;
    }

    /** ระบุ model ให้กับ provider บางตัว (override ค่า default ของ provider) */
    setModelOverride(name: AIProviderName, model?: string): void {
        if (model && model.trim()) this.modelOverrides[name] = model.trim();
        else delete this.modelOverrides[name];
    }

    getModelOverride(name: AIProviderName): string | undefined {
        return this.modelOverrides[name];
    }

    private withModel(input: AIRequest, provider: AIProviderName): AIRequest {
        const override = this.modelOverrides[provider];
        return override ? { ...input, model: override } : input;
    }

    private guardOrThrow(name: AIProviderName): void {
        try {
            this.guard?.(name);
        } catch (err) {
            throw err instanceof AIProviderError
                ? err
                : new AIProviderError(name, 'rate_limit', `quota guard: ${err instanceof Error ? err.message : 'limit exceeded'}`, 429);
        }
    }

    private logCall(
        provider: AIProviderName,
        model: string,
        kind: AICallKind,
        startedAt: number,
        ok: boolean,
        usage?: AIResponse['usage'],
        error?: { kind: NonNullable<AICallLog['error']>['kind']; message: string }
    ): void {
        this.logger({
            provider,
            model,
            kind,
            latencyMs: Date.now() - startedAt,
            ok,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            error,
        });
    }

    /** ลอง provider ตามลำดับ; ถ้า error ชั่วคราว → ไป provider ถัดไป, ถ้า error ถาวร → throw ทันที */
    async route<T extends (p: AIProvider, name: AIProviderName) => Promise<AIResponse>>(fn: T, kind: AICallKind = 'text'): Promise<AIResponse> {
        const available = this.getAvailableProviders();
        if (available.length === 0) {
            throw new AIProviderError('gemini', 'not_configured', 'ยังไม่ได้ตั้งค่า API key ของ AI provider ใดเลย (GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY)');
        }

        const attempts: string[] = [];
        let lastError: unknown;

        for (const provider of available) {
            attempts.push(provider.name);
            const startedAt = Date.now();
            try {
                this.guardOrThrow(provider.name);
                const res = await fn(provider, provider.name);
                this.logCall(provider.name, res.model, kind, startedAt, true, res.usage);
                return res;
            } catch (err: unknown) {
                lastError = err;
                const isAIErr = err instanceof AIProviderError;
                this.logCall(
                    provider.name,
                    this.modelOverrides[provider.name] ?? provider.defaultModel,
                    kind,
                    startedAt,
                    false,
                    undefined,
                    isAIErr ? { kind: err.kind, message: err.message } : { kind: 'unknown', message: err instanceof Error ? err.message : 'unknown' }
                );
                // error ถาวร (key ผิด, request ผิด) → หยุด ไม่ลอง provider อื่น
                if (!isRetryableError(err)) {
                    throw err;
                }
                console.warn(`[AI Router] ${provider.name} ล้มเหลว (ชั่วคราว) → ลอง provider ถัดไป`, (err as Error).message);
            }
        }

        throw new AIProviderError(
            'gemini',
            'provider_unavailable',
            `provider ทั้งหมดล้มเหลว (ลองแล้ว: ${attempts.join(', ')}) — ${lastError instanceof Error ? lastError.message : 'unknown'}`,
            503
        );
    }

    /** สร้าง prompt/text response ผ่าน providers ตามลำดับ */
    async analyzeText(input: AIRequest): Promise<AIResponse> {
        return this.route((provider, name) => provider.analyzeText(this.withModel(input, name)), 'text');
    }

    /** วิเคราะห์ภาพผ่าน providers ตามลำดับ */
    async analyzeImage(input: AIRequest): Promise<AIResponse> {
        return this.route((provider, name) => provider.analyzeImage(this.withModel(input, name)), 'image');
    }

    /**
     * Tool-calling loop: ส่ง prompt + tools → provider ตอบ toolCalls → execute → ส่งผลกลับ
     * จนกว่า provider จะตอบ text (วนซ้ำสูงสุด maxIterations รอบ)
     */
    async runAgent(input: AIRequest, tools: AITool[], handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>, maxIterations = 5): Promise<AIResponse> {
        const available = this.getAvailableProviders();
        if (available.length === 0) {
            throw new AIProviderError('gemini', 'not_configured', 'ยังไม่ได้ตั้งค่า API key ของ AI provider ใดเลย');
        }

        const attempts: string[] = [];
        let lastError: unknown;

        for (const provider of available) {
            attempts.push(provider.name);
            const startedAt = Date.now();
            try {
                this.guardOrThrow(provider.name);
                const res = await this.runAgentOnProvider(provider, input, tools, handlers, maxIterations);
                this.logCall(provider.name, res.model, 'agent', startedAt, true, res.usage);
                return res;
            } catch (err: unknown) {
                lastError = err;
                const isAIErr = err instanceof AIProviderError;
                this.logCall(
                    provider.name,
                    this.modelOverrides[provider.name] ?? provider.defaultModel,
                    'agent',
                    startedAt,
                    false,
                    undefined,
                    isAIErr ? { kind: err.kind, message: err.message } : { kind: 'unknown', message: err instanceof Error ? err.message : 'unknown' }
                );
                if (!isRetryableError(err)) {
                    throw err;
                }
                console.warn(`[AI Router] runAgent ${provider.name} ล้มเหลว (ชั่วคราว) → ลอง provider ถัดไป`, (err as Error).message);
            }
        }

        throw new AIProviderError(
            'gemini',
            'provider_unavailable',
            `runAgent ล้มเหลวทุก provider (ลองแล้ว: ${attempts.join(', ')}) — ${lastError instanceof Error ? lastError.message : 'unknown'}`,
            503
        );
    }

    private async runAgentOnProvider(
        provider: AIProvider,
        input: AIRequest,
        tools: AITool[],
        handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>,
        maxIterations: number
    ): Promise<AIResponse> {
        const withTools: AIRequest = { ...this.withModel(input, provider.name), tools };
        const history: NonNullable<AIRequest['history']> = [];

        for (let iter = 0; iter < maxIterations; iter++) {
            const res = await provider.analyzeText({ ...withTools, history: [...history] });

            if (!res.toolCalls || res.toolCalls.length === 0) {
                return res;
            }

            // Execute tool calls
            const toolResults: AIToolResult[] = [];
            for (const tc of res.toolCalls) {
                const handler = handlers[tc.name];
                let content: string;
                if (!handler) {
                    content = JSON.stringify({ error: `tool "${tc.name}" ไม่รู้จัก` });
                } else {
                    try {
                        const result = await handler(tc.args);
                        content = typeof result === 'string' ? result : JSON.stringify(result);
                    } catch (err: unknown) {
                        content = JSON.stringify({ error: err instanceof Error ? err.message : 'tool execution failed' });
                    }
                }
                toolResults.push({ toolCallId: tc.id, name: tc.name, content });
            }

            history.push({ role: 'assistant', toolCalls: res.toolCalls });
            history.push({ role: 'tool', toolResults });
        }

        throw new AIProviderError(provider.name, 'provider_unavailable', `tool-calling เกิน ${maxIterations} รอบ ไม่ได้ผลลัพธ์สุดท้าย`, 503);
    }
}
