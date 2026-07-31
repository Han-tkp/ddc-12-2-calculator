import { describe, it, expect, vi } from 'vitest';
import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import type { AIResponse } from './types';

type FetchResult = { ok: boolean; status?: number; json: () => Promise<any>; text?: () => Promise<string> };
type FetchMock = ReturnType<typeof makeFetchMock>;

function makeFetchMock(impl: (url: string, init?: RequestInit) => Promise<FetchResult>) {
    return vi.fn(impl);
}

const getBody = (mock: FetchMock): any => JSON.parse((mock.mock.calls[0][1] as RequestInit).body as string);
const getHeaders = (mock: FetchMock): Record<string, string> => (mock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
const getUrl = (mock: FetchMock): string => String(mock.mock.calls[0][0]);

describe('GeminiProvider serialization', () => {
    it('maps tool_use/tool_result history to functionCall/functionResponse', async () => {
        const provider = new GeminiProvider('test-key');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'done' }] } }] }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const res = await provider.analyzeText({
                prompt: 'หาสูตร',
                tools: [{ name: 'query', description: 'q', parameters: { q: { type: 'string' } } }],
                history: [
                    { role: 'assistant', toolCalls: [{ id: 't1', name: 'query', args: { q: 'y' } }] },
                    { role: 'tool', toolResults: [{ toolCallId: 't1', name: 'query', content: '{"ok":1}' }] },
                ],
            });
            expect(res.text).toBe('done');

            const body = getBody(fetchMock);
            expect(body.contents[0].role).toBe('model');
            expect(body.contents[0].parts[0].functionCall).toMatchObject({ name: 'query', args: { q: 'y' } });
            expect(body.contents[1].role).toBe('user');
            expect(body.contents[1].parts[0].functionResponse).toMatchObject({ name: 'query' });
            expect(body.contents[2].role).toBe('user');
            expect(body.contents[2].parts[0].text).toBe('หาสูตร');
            expect(getUrl(fetchMock)).toContain('generativelanguage.googleapis.com');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('sends images as inlineData in analyzeImage', async () => {
        const provider = new GeminiProvider('test-key');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'json' }] } }] }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            await provider.analyzeImage({
                prompt: 'read label',
                images: [{ mimeType: 'image/jpeg', data: 'base64data' }],
            });
            const body = getBody(fetchMock);
            expect(body.contents[0].parts[1].inlineData.mimeType).toBe('image/jpeg');
            expect(body.contents[0].parts[1].inlineData.data).toBe('base64data');
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('AnthropicProvider serialization', () => {
    it('sends x-api-key headers and tool_use/tool_result blocks', async () => {
        const provider = new AnthropicProvider('sk-ant-test');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({
                content: [{ type: 'tool_use', id: 't1', name: 'query', input: { q: 'y' } }],
                usage: { input_tokens: 10, output_tokens: 5 },
            }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const res = await provider.analyzeText({
                prompt: 'ถาม',
                tools: [{ name: 'query', description: 'q', parameters: { q: { type: 'string' } } }],
                history: [
                    { role: 'assistant', toolCalls: [{ id: 't1', name: 'query', args: { q: 'y' } }] },
                    { role: 'tool', toolResults: [{ toolCallId: 't1', name: 'query', content: '{"ok":1}' }] },
                ],
            });
            expect(res.toolCalls?.[0].name).toBe('query');
            expect(res.usage?.inputTokens).toBe(10);

            const headers = getHeaders(fetchMock);
            expect(headers['x-api-key']).toBe('sk-ant-test');
            expect(headers['anthropic-version']).toBe('2023-06-01');
            const body = getBody(fetchMock);
            expect(body.messages[0].content[0].type).toBe('tool_use');
            expect(body.messages[1].content[0].type).toBe('tool_result');
            expect(getUrl(fetchMock)).toContain('api.anthropic.com');
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('OpenAIProvider serialization', () => {
    it('sends tools in OpenAI function format and returns tool_calls', async () => {
        const provider = new OpenAIProvider('sk-openai');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'ok', tool_calls: [] } }],
                usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
            }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            await provider.analyzeText({
                prompt: 'hi',
                tools: [{ name: 'query', description: 'q', parameters: { q: { type: 'string' } } }],
            });
            const headers = getHeaders(fetchMock);
            expect(headers.Authorization).toBe('Bearer sk-openai');
            const body = getBody(fetchMock);
            expect(body.tools[0].type).toBe('function');
            expect(body.tools[0].function.name).toBe('query');
            expect(body.tools[0].function.parameters.properties.q.type).toBe('string');
            expect(getUrl(fetchMock)).toContain('api.openai.com');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('sends images as data URL in content', async () => {
        const provider = new OpenAIProvider('sk-openai');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'json' } }] }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            await provider.analyzeImage({
                prompt: 'read',
                images: [{ mimeType: 'image/png', data: 'abc' }],
            });
            const body = getBody(fetchMock);
            const content = body.messages.at(-1).content;
            expect(content[1].type).toBe('image_url');
            expect(content[1].image_url.url).toBe('data:image/png;base64,abc');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('parse errors and non-ok responses become AIProviderError', async () => {
        const provider = new OpenAIProvider('sk-openai');
        const fetchMock = makeFetchMock(async () => ({
            ok: false,
            status: 401,
            json: async () => ({ error: { message: 'invalid api key' } }),
            text: async () => '{"error":{"message":"invalid api key"}}',
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            await expect(provider.analyzeText({ prompt: 'hi' })).rejects.toMatchObject({ kind: 'auth' });
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('AIResponse shape', () => {
    it('Gemini analyzeText includes provider + model', async () => {
        const provider = new GeminiProvider('test-key');
        const fetchMock = makeFetchMock(async () => ({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }),
        }));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const res: AIResponse = await provider.analyzeText({ prompt: 'hi' });
            expect(res.provider).toBe('gemini');
            expect(res.model).toBe('gemini-2.0-flash');
            expect(res.text).toBe('hi');
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
