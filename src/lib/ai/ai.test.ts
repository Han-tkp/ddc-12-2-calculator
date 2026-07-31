import { describe, it, expect, vi } from 'vitest';
import { AIProviderRouter } from './router';
import { extractFormulaFromText } from './agent';
import { AI_TOOLS, AI_TOOL_HANDLERS, getTool } from './tools';
import { AIProviderError } from './errors';
import { guardQuota, resetQuota, getQuotaState, DEFAULT_QUOTA } from './usage';
import type { AIProvider, AIProviderName, AIRequest, AIResponse, ModelInfo } from './types';

function makeProvider(name: AIProviderName, configured = true, opts: {
    model?: string;
    failWith?: (req: AIRequest) => Error;
    result?: Partial<AIResponse>;
} = {}): AIProvider {
    const model = opts.model || `model-${name}`;
    return {
        name,
        displayName: name,
        defaultModel: model,
        isConfigured: () => configured,
        analyzeText: async (input: AIRequest): Promise<AIResponse> => {
            if (opts.failWith) throw opts.failWith(input);
            return { text: 'ok', model: input.model || model, provider: name, ...opts.result };
        },
        analyzeImage: async (input: AIRequest): Promise<AIResponse> => {
            if (opts.failWith) throw opts.failWith(input);
            return { text: 'image ok', model: input.model || model, provider: name, ...opts.result };
        },
        getModels: async (): Promise<ModelInfo[]> => [{ id: model, displayName: model }],
    };
}

function makeRouter(providers: Partial<Record<AIProviderName, AIProvider>>, order?: AIProviderName[], options?: ConstructorParameters<typeof AIProviderRouter>[2]) {
    const map = new Map<AIProviderName, AIProvider>(Object.entries(providers) as [AIProviderName, AIProvider][]);
    return new AIProviderRouter(map, order || ['gemini', 'anthropic', 'openai', 'openrouter'], options);
}

describe('extractFormulaFromText', () => {
    it('extracts JSON from a ```json code block', () => {
        const text = 'นี่คือสูตร:\n```json\n{"name":"X","C":1,"S":9,"RA":50,"RA_unit":"cc"}\n```';
        expect(extractFormulaFromText(text)).toMatchObject({ name: 'X', C: 1, S: 9, RA: 50, RA_unit: 'cc' });
    });

    it('extracts JSON from plain text', () => {
        expect(extractFormulaFromText('{"C":1,"S":79,"RA":1}')).toMatchObject({ C: 1, S: 79, RA: 1 });
    });

    it('returns null for text without formula shape', () => {
        expect(extractFormulaFromText('สวัสดีครับ ไม่มีสูตรที่นี่')).toBeNull();
        expect(extractFormulaFromText('')).toBeNull();
        expect(extractFormulaFromText('```json\n{"foo":"bar"}\n```')).toBeNull();
    });
});

describe('AI_TOOLS', () => {
    it('defines query_chemical_profiles, query_calculations, validate_formula', () => {
        expect(getTool('query_chemical_profiles')).toBeTruthy();
        expect(getTool('query_calculations')).toBeTruthy();
        expect(getTool('validate_formula')).toBeTruthy();
        expect(getTool('nope')).toBeUndefined();
    });

    it('validate_formula handler returns valid + normalized formula', async () => {
        const result = await AI_TOOL_HANDLERS.validate_formula({ formula: { C: '1', S: '9', RA: '50' } }) as any;
        expect(result.valid).toBe(true);
        expect(result.formula).toMatchObject({ C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2 });
        expect(result.message).toContain('RA');
    });
});

describe('router options (logger/guard/model override)', () => {
    it('applies model override to the winning provider', async () => {
        const router = makeRouter(
            { gemini: makeProvider('gemini') },
            ['gemini'],
            { modelOverrides: { gemini: 'gemini-2.5-pro' } }
        );
        const res = await router.analyzeText({ prompt: 'hi' });
        expect(res.model).toBe('gemini-2.5-pro');
    });

    it('guard throws before provider is called when quota exceeded', async () => {
        const calls: string[] = [];
        const router = makeRouter(
            { gemini: makeProvider('gemini'), anthropic: makeProvider('anthropic') },
            ['gemini', 'anthropic'],
            {
                guard: (name) => {
                    if (name === 'gemini') throw new AIProviderError('gemini', 'rate_limit', 'quota exceeded', 429);
                },
                logger: (log) => { calls.push(`${log.provider}:${log.ok}`); },
            }
        );
        const res = await router.analyzeText({ prompt: 'hi' });
        expect(res.provider).toBe('anthropic');
        expect(calls).toContain('gemini:false');
        expect(calls).toContain('anthropic:true');
    });

    it('logger receives ok + failed entries with latency', async () => {
        const logs: any[] = [];
        const router = makeRouter(
            {
                gemini: makeProvider('gemini', true, { failWith: () => new AIProviderError('gemini', 'rate_limit', '429', 429) }),
                anthropic: makeProvider('anthropic'),
            },
            ['gemini', 'anthropic'],
            { logger: (log) => logs.push(log) }
        );
        await router.analyzeText({ prompt: 'hi' });
        expect(logs.length).toBe(2);
        expect(logs[0]).toMatchObject({ provider: 'gemini', ok: false, kind: 'text' });
        expect(logs[0].error?.kind).toBe('rate_limit');
        expect(logs[1]).toMatchObject({ provider: 'anthropic', ok: true, kind: 'text' });
        expect(typeof logs[1].latencyMs).toBe('number');
    });

    it('setOrder filters to known providers and persists via getOrder', () => {
        const router = makeRouter({ gemini: makeProvider('gemini'), openai: makeProvider('openai') });
        router.setOrder(['openai', 'gemini']);
        expect(router.getOrder()).toEqual(['openai', 'gemini']);
        router.setOrder(['gemini', 'openrouter']);
        expect(router.getOrder()).toEqual(['gemini']);
    });
});

describe('quota guard', () => {
    it('blocks provider after perMinute limit and recovers on reset', () => {
        resetQuota();
        const limits = { perMinute: 2, perHour: 100 };
        guardQuota('gemini', limits);
        guardQuota('gemini', limits);
        expect(() => guardQuota('gemini', limits)).toThrowError(AIProviderError);
        expect(getQuotaState()['gemini']?.perMinute).toBe(2);
        resetQuota();
        expect(getQuotaState()).toEqual({});
        guardQuota('gemini', limits);
        expect(getQuotaState()['gemini']?.perMinute).toBe(1);
    });

    it('uses default quota from env when available', () => {
        resetQuota();
        expect(DEFAULT_QUOTA.perMinute).toBeGreaterThan(0);
    });
});

describe('runAgent honors model override + logger kind=agent', () => {
    it('reports kind agent in logs and uses override model', async () => {
        const logs: any[] = [];
        const provider = makeProvider('gemini');
        const router = makeRouter({ gemini: provider }, ['gemini'], {
            logger: (log) => logs.push(log),
            modelOverrides: { gemini: 'gemini-2.5-flash' },
        });
        const res = await router.runAgent(
            { prompt: 'find formula' },
            AI_TOOLS,
            { query_chemical_profiles: async () => ({ profiles: [] }) },
            3
        );
        expect(res.model).toBe('gemini-2.5-flash');
        expect(logs.some(l => l.kind === 'agent' && l.ok === true)).toBe(true);
    });

    it('does not call guard twice on permanent error across providers', async () => {
        const guardCalls: string[] = [];
        const router = makeRouter(
            {
                gemini: makeProvider('gemini', true, { failWith: () => new AIProviderError('gemini', 'auth', 'bad key', 401) }),
                anthropic: makeProvider('anthropic'),
            },
            ['gemini', 'anthropic'],
            { guard: (n) => guardCalls.push(n) }
        );
        await expect(router.analyzeText({ prompt: 'hi' })).rejects.toThrowError('bad key');
        expect(guardCalls).toEqual(['gemini']);
    });
});
